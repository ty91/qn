import { Note } from "@/types/note";
import * as FileSystem from "expo-file-system";
import * as SQLite from "expo-sqlite";
import { CloudStorage, CloudStorageScope } from "react-native-cloud-storage";
import { database } from "./database";
import { DATABASE_EVENTS, databaseEvents } from "./event-emitter";

interface SyncChanges {
  modified: Note[];
  deleted: { id: string; deletedAt: Date }[];
}

interface MergedChanges {
  toLocal: Note[];
  toLocalDeletes: string[];
  toRemote: Note[];
  toRemoteDeletes: string[];
}

export interface SyncResult {
  success: boolean;
  localUpdates: number;
  remoteUpdates: number;
  conflicts: number;
  error?: string;
}

export class NotesSyncService {
  private static readonly REMOTE_DB_FILENAME = "Documents/notes-sync.db";
  private remoteDb: SQLite.SQLiteDatabase | null = null;

  /**
   * 노트 단위 동기화 실행
   */
  async syncNotes(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      localUpdates: 0,
      remoteUpdates: 0,
      conflicts: 0,
    };

    try {
      console.log("노트 동기화 시작...");
      databaseEvents.emit(DATABASE_EVENTS.SYNC_STARTED);

      // 1. 원격 DB 다운로드
      const remoteDbPath = await this.downloadRemoteDatabase();
      if (!remoteDbPath) {
        // 원격 DB가 없으면 로컬 DB를 업로드
        await this.uploadLocalDatabase();
        result.success = true;
        return result;
      }

      // 2. 원격 DB 연결
      // 다운로드한 파일을 직접 열기
      this.remoteDb = SQLite.openDatabaseSync(
        remoteDbPath.replace("file://", "")
      );

      // 원격 DB 테이블 초기화 (필요한 경우)
      this.initRemoteDatabase();

      // 3. 마지막 동기화 시간 확인
      const lastSyncTime = (await database.getLastSyncTime()) || 0;
      console.log(
        `마지막 동기화 시간: ${new Date(lastSyncTime).toISOString()}`
      );

      // 4. 변경사항 수집
      const localChanges = await this.getLocalChanges(lastSyncTime);
      const remoteChanges = await this.getRemoteChanges(lastSyncTime);

      console.log(
        `로컬 변경: ${localChanges.modified.length}개 수정, ${localChanges.deleted.length}개 삭제`
      );
      console.log(
        `원격 변경: ${remoteChanges.modified.length}개 수정, ${remoteChanges.deleted.length}개 삭제`
      );

      // 5. 충돌 해결 및 병합
      const mergedChanges = this.resolveConflicts(localChanges, remoteChanges);
      result.conflicts = this.countConflicts(localChanges, remoteChanges);

      // 6. 변경사항 적용
      await this.applyChanges(mergedChanges);
      result.localUpdates =
        mergedChanges.toLocal.length + mergedChanges.toLocalDeletes.length;
      result.remoteUpdates =
        mergedChanges.toRemote.length + mergedChanges.toRemoteDeletes.length;

      // 7. 동기화 시간 업데이트
      const syncTime = Date.now();
      await database.setLastSyncTime(syncTime);
      await this.setRemoteSyncTime(syncTime);

      // 8. 업데이트된 원격 DB 업로드
      await this.uploadRemoteDatabase(remoteDbPath);

      // 9. 데이터베이스 재연결
      await database.reconnect();

      result.success = true;
      console.log("노트 동기화 완료");
      databaseEvents.emit(DATABASE_EVENTS.SYNC_COMPLETED, {
        type: "notes",
        result,
      });
    } catch (error) {
      console.error("노트 동기화 실패:", error);
      result.error = error instanceof Error ? error.message : "알 수 없는 오류";
      databaseEvents.emit(DATABASE_EVENTS.SYNC_FAILED, {
        type: "notes",
        error,
      });
    } finally {
      // 정리 작업
      if (this.remoteDb) {
        this.remoteDb.closeSync();
        this.remoteDb = null;
      }
      
      // 임시 파일 삭제
      try {
        const tempPath = `${FileSystem.cacheDirectory}remote-sync.db`;
        const tempFileInfo = await FileSystem.getInfoAsync(tempPath);
        if (tempFileInfo.exists) {
          await FileSystem.deleteAsync(tempPath);
        }
      } catch (error) {
        console.warn("임시 파일 삭제 실패:", error);
      }
    }

    return result;
  }

  /**
   * 원격 데이터베이스 다운로드
   */
  private async downloadRemoteDatabase(): Promise<string | null> {
    try {
      const exists = await CloudStorage.exists(
        NotesSyncService.REMOTE_DB_FILENAME
      );
      if (!exists) {
        console.log("원격 데이터베이스가 존재하지 않습니다.");
        return null;
      }

      const tempPath = `${FileSystem.cacheDirectory}remote-sync.db`;
      
      // 기존 임시 파일이 있으면 삭제
      const tempFileInfo = await FileSystem.getInfoAsync(tempPath);
      if (tempFileInfo.exists) {
        await FileSystem.deleteAsync(tempPath);
      }
      
      const downloadPath = tempPath.replace("file://", "");

      await CloudStorage.downloadFile(
        NotesSyncService.REMOTE_DB_FILENAME,
        downloadPath,
        CloudStorageScope.AppData
      );

      return tempPath;
    } catch (error) {
      console.error("원격 DB 다운로드 실패:", error);
      throw error;
    }
  }

  /**
   * 로컬 데이터베이스를 원격으로 업로드 (초기 동기화)
   */
  private async uploadLocalDatabase(): Promise<void> {
    const localDbPath = `${FileSystem.documentDirectory}SQLite/notes.db`;
    const uploadPath = localDbPath.replace("file://", "");

    // 현재 시간을 동기화 시간으로 설정
    const syncTime = Date.now();
    await database.setLastSyncTime(syncTime);

    await CloudStorage.uploadFile(
      NotesSyncService.REMOTE_DB_FILENAME,
      uploadPath,
      { mimeType: "application/x-sqlite3" }
    );

    console.log("초기 원격 데이터베이스 생성 완료");
  }

  /**
   * 업데이트된 원격 데이터베이스 업로드
   */
  private async uploadRemoteDatabase(remotePath: string): Promise<void> {
    const uploadPath = remotePath.replace("file://", "");

    await CloudStorage.uploadFile(
      NotesSyncService.REMOTE_DB_FILENAME,
      uploadPath,
      { mimeType: "application/x-sqlite3" }
    );
  }

  /**
   * 로컬 변경사항 조회
   */
  private async getLocalChanges(since: number): Promise<SyncChanges> {
    return {
      modified: await database.getModifiedNotesSince(since),
      deleted: await database.getDeletedNotesSince(since),
    };
  }

  /**
   * 원격 변경사항 조회
   */
  private async getRemoteChanges(since: number): Promise<SyncChanges> {
    if (!this.remoteDb) {
      throw new Error("Remote database not connected");
    }

    const modifiedResult = this.remoteDb.getAllSync<{
      id: string;
      text: string;
      createdAt: number;
      updatedAt: number;
    }>("SELECT * FROM notes WHERE updatedAt > ? ORDER BY updatedAt ASC", since);

    const deletedResult = this.remoteDb.getAllSync<{
      id: string;
      deletedAt: number;
    }>(
      "SELECT * FROM deleted_notes WHERE deletedAt > ? ORDER BY deletedAt ASC",
      since
    );

    return {
      modified: modifiedResult.map((row) => ({
        id: row.id,
        text: row.text,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      })),
      deleted: deletedResult.map((row) => ({
        id: row.id,
        deletedAt: new Date(row.deletedAt),
      })),
    };
  }

  /**
   * 충돌 해결
   */
  private resolveConflicts(
    local: SyncChanges,
    remote: SyncChanges
  ): MergedChanges {
    const result: MergedChanges = {
      toLocal: [],
      toLocalDeletes: [],
      toRemote: [],
      toRemoteDeletes: [],
    };

    // 수정된 노트 처리
    const localModifiedMap = new Map(local.modified.map((n) => [n.id, n]));
    const remoteModifiedMap = new Map(remote.modified.map((n) => [n.id, n]));
    const localDeletedSet = new Set(local.deleted.map((d) => d.id));
    const remoteDeletedSet = new Set(remote.deleted.map((d) => d.id));

    // 원격에서 수정된 노트
    for (const remoteNote of remote.modified) {
      const localNote = localModifiedMap.get(remoteNote.id);

      if (localDeletedSet.has(remoteNote.id)) {
        // 로컬에서 삭제, 원격에서 수정 -> 수정 우선 (row 있는 것 우선)
        result.toLocal.push(remoteNote);
      } else if (localNote) {
        // 양쪽에서 수정 -> updatedAt 비교
        if (remoteNote.updatedAt > localNote.updatedAt) {
          result.toLocal.push(remoteNote);
        } else {
          result.toRemote.push(localNote);
        }
      } else {
        // 원격에서만 수정
        result.toLocal.push(remoteNote);
      }
    }

    // 로컬에서 수정된 노트
    for (const localNote of local.modified) {
      if (!remoteModifiedMap.has(localNote.id)) {
        if (remoteDeletedSet.has(localNote.id)) {
          // 원격에서 삭제, 로컬에서 수정 -> 수정 우선
          result.toRemote.push(localNote);
        } else {
          // 로컬에서만 수정
          result.toRemote.push(localNote);
        }
      }
    }

    // 삭제된 노트 처리
    for (const remoteDeleted of remote.deleted) {
      if (
        !localModifiedMap.has(remoteDeleted.id) &&
        !localDeletedSet.has(remoteDeleted.id)
      ) {
        result.toLocalDeletes.push(remoteDeleted.id);
      }
    }

    for (const localDeleted of local.deleted) {
      if (
        !remoteModifiedMap.has(localDeleted.id) &&
        !remoteDeletedSet.has(localDeleted.id)
      ) {
        result.toRemoteDeletes.push(localDeleted.id);
      }
    }

    return result;
  }

  /**
   * 충돌 수 계산
   */
  private countConflicts(local: SyncChanges, remote: SyncChanges): number {
    let conflicts = 0;
    const localModifiedIds = new Set(local.modified.map((n) => n.id));
    const localDeletedIds = new Set(local.deleted.map((d) => d.id));

    for (const remoteNote of remote.modified) {
      if (
        localModifiedIds.has(remoteNote.id) ||
        localDeletedIds.has(remoteNote.id)
      ) {
        conflicts++;
      }
    }

    for (const remoteDeleted of remote.deleted) {
      if (localModifiedIds.has(remoteDeleted.id)) {
        conflicts++;
      }
    }

    return conflicts;
  }

  /**
   * 변경사항 적용
   */
  private async applyChanges(changes: MergedChanges): Promise<void> {
    // 로컬 변경사항 적용
    for (const note of changes.toLocal) {
      await database.upsertNote(note);
    }
    for (const id of changes.toLocalDeletes) {
      await database.deleteNote(id);
    }

    // 원격 변경사항 적용
    if (this.remoteDb) {
      for (const note of changes.toRemote) {
        this.remoteDb.runSync(
          `INSERT OR REPLACE INTO notes (id, text, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?)`,
          note.id,
          note.text,
          note.createdAt.getTime(),
          note.updatedAt.getTime()
        );
        this.remoteDb.runSync(
          "DELETE FROM deleted_notes WHERE id = ?",
          note.id
        );
      }

      for (const id of changes.toRemoteDeletes) {
        const now = Date.now();
        this.remoteDb.runSync(
          "INSERT OR REPLACE INTO deleted_notes (id, deletedAt) VALUES (?, ?)",
          id,
          now
        );
        this.remoteDb.runSync("DELETE FROM notes WHERE id = ?", id);
      }
    }
  }

  /**
   * 원격 DB에 동기화 시간 설정
   */
  private async setRemoteSyncTime(timestamp: number): Promise<void> {
    if (!this.remoteDb) {
      throw new Error("Remote database not connected");
    }

    this.remoteDb.runSync(
      "INSERT OR REPLACE INTO sync_metadata (key, value) VALUES ('last_sync_time', ?)",
      timestamp.toString()
    );
  }

  /**
   * 원격 데이터베이스 초기화
   */
  private initRemoteDatabase(): void {
    if (!this.remoteDb) {
      throw new Error("Remote database not connected");
    }

    // 노트 테이블
    this.remoteDb.execSync(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY NOT NULL,
        text TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );
    `);

    // 삭제된 노트 추적 테이블
    this.remoteDb.execSync(`
      CREATE TABLE IF NOT EXISTS deleted_notes (
        id TEXT PRIMARY KEY NOT NULL,
        deletedAt INTEGER NOT NULL
      );
    `);

    // 동기화 메타데이터 테이블
    this.remoteDb.execSync(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
  }
}

export const notesSync = new NotesSyncService();
