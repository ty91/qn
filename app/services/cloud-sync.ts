import * as FileSystem from "expo-file-system";
import { CloudStorage, CloudStorageScope } from "react-native-cloud-storage";
import { database } from "./database";
import { databaseEvents, DATABASE_EVENTS } from "./event-emitter";

export interface SyncStatus {
  isAvailable: boolean;
  lastSyncTime?: Date;
  hasLocalChanges: boolean;
  hasRemoteChanges: boolean;
  error?: string;
}

export class CloudSyncService {
  private static readonly DB_BACKUP_FILENAME = "Documents/database.db";
  private static readonly SYNC_METADATA_KEY = "Documents/sync-metadata.json";
  private static readonly SYNC_INTERVAL = 1 * 60 * 1000; // 1분

  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;

  /**
   * Documents 디렉토리 생성 확인
   */
  private async ensureDocumentsDirectory(): Promise<void> {
    try {
      const exists = await CloudStorage.exists("Documents");
      if (!exists) {
        await CloudStorage.mkdir("Documents");
        console.log("Documents 디렉토리를 생성했습니다.");
      }
    } catch (error) {
      console.error("Documents 디렉토리 생성 실패:", error);
    }
  }

  /**
   * iCloud 사용 가능 여부 확인
   */
  async isCloudAvailable(): Promise<boolean> {
    try {
      // CloudStorage의 isCloudAvailable 메서드를 사용하여 확인
      const available = await CloudStorage.isCloudAvailable();
      return available;
    } catch (error) {
      console.error("iCloud 사용 가능 여부 확인 실패:", error);
      return false;
    }
  }

  /**
   * 현재 동기화 상태 확인
   */
  async getSyncStatus(): Promise<SyncStatus> {
    const status: SyncStatus = {
      isAvailable: false,
      hasLocalChanges: false,
      hasRemoteChanges: false,
    };

    try {
      status.isAvailable = await this.isCloudAvailable();

      if (!status.isAvailable) {
        return status;
      }

      const remoteExists = await this.fileExists(
        CloudSyncService.DB_BACKUP_FILENAME
      );
      const localDbPath = this.getLocalDbPath();
      const localStat = await FileSystem.getInfoAsync(localDbPath);

      if (remoteExists && localStat.exists) {
        // 파일 비교를 위해 메타데이터 확인
        const metadata = await this.readMetadata();
        if (metadata?.lastUpload) {
          const remoteModified = new Date(metadata.lastUpload);
          const localModified = new Date(localStat.modificationTime || 0);

          status.hasRemoteChanges = remoteModified > localModified;
          status.hasLocalChanges = localModified > remoteModified;
          status.lastSyncTime = remoteModified;
        } else {
          status.hasRemoteChanges = true;
        }
      } else if (remoteExists) {
        status.hasRemoteChanges = true;
      } else if (localStat.exists) {
        status.hasLocalChanges = true;
      }
    } catch (error) {
      status.error = `동기화 상태 확인 실패: ${error}`;
      console.error(status.error);
    }

    return status;
  }

  /**
   * 로컬 데이터베이스를 iCloud에 업로드
   */
  async uploadDatabase(): Promise<boolean> {
    if (this.isSyncing) {
      console.warn("이미 동기화가 진행 중입니다.");
      return false;
    }

    this.isSyncing = true;

    try {
      const isAvailable = await this.isCloudAvailable();
      if (!isAvailable) {
        throw new Error("iCloud를 사용할 수 없습니다");
      }

      // Documents 디렉토리 확인
      await this.ensureDocumentsDirectory();

      const localDbPath = this.getLocalDbPath();
      const localDbExists = await FileSystem.getInfoAsync(localDbPath);

      if (!localDbExists.exists) {
        throw new Error("로컬 데이터베이스 파일이 존재하지 않습니다");
      }

      const uploadPath = localDbPath.replace("file://", "");
      await CloudStorage.uploadFile(
        CloudSyncService.DB_BACKUP_FILENAME,
        uploadPath,
        { mimeType: "application/x-sqlite3" }
      );

      // 메타데이터 저장
      await this.saveMetadata({
        lastUpload: new Date().toISOString(),
        dbSize: localDbExists.size || 0,
      });

      console.log("데이터베이스를 iCloud에 성공적으로 업로드했습니다.");
      databaseEvents.emit(DATABASE_EVENTS.SYNC_COMPLETED, { type: 'upload' });
      return true;
    } catch (error) {
      console.error("데이터베이스 업로드 실패:", error);
      databaseEvents.emit(DATABASE_EVENTS.SYNC_FAILED, { type: 'upload', error });
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * iCloud에서 데이터베이스 다운로드
   */
  async downloadDatabase(): Promise<boolean> {
    if (this.isSyncing) {
      console.warn("이미 동기화가 진행 중입니다.");
      return false;
    }

    this.isSyncing = true;

    try {
      const isAvailable = await this.isCloudAvailable();
      if (!isAvailable) {
        throw new Error("iCloud를 사용할 수 없습니다");
      }

      const remoteExists = await this.fileExists(
        CloudSyncService.DB_BACKUP_FILENAME
      );

      if (!remoteExists) {
        console.log("iCloud에 백업 파일이 없습니다.");
        return false;
      }

      // 로컬 데이터베이스 백업 생성
      const localDbPath = this.getLocalDbPath();
      const backupLocalPath = `${localDbPath}.backup`;
      const tempDownloadPath = `${FileSystem.cacheDirectory}temp_download.db`;

      const localExists = await FileSystem.getInfoAsync(localDbPath);
      if (localExists.exists) {
        await FileSystem.copyAsync({
          from: localDbPath,
          to: backupLocalPath,
        });
      }

      // iCloud에서 바이너리 파일 다운로드
      const downloadPath = tempDownloadPath.replace("file://", "");
      await CloudStorage.downloadFile(
        CloudSyncService.DB_BACKUP_FILENAME,
        downloadPath,
        CloudStorageScope.AppData
      );

      // 다운로드한 파일을 실제 데이터베이스 위치로 이동
      await FileSystem.moveAsync({
        from: tempDownloadPath,
        to: localDbPath,
      });

      // 데이터베이스 연결 다시 열기
      await database.reconnect();

      console.log("iCloud에서 데이터베이스를 성공적으로 다운로드했습니다.");
      databaseEvents.emit(DATABASE_EVENTS.SYNC_COMPLETED, { type: 'download' });
      return true;
    } catch (error) {
      console.error("데이터베이스 다운로드 실패:", error);
      databaseEvents.emit(DATABASE_EVENTS.SYNC_FAILED, { type: 'download', error });
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * 자동 동기화 시작
   */
  startAutoSync(): void {
    if (this.syncInterval) {
      console.warn("자동 동기화가 이미 실행 중입니다.");
      return;
    }

    this.syncInterval = setInterval(async () => {
      try {
        const status = await this.getSyncStatus();

        if (!status.isAvailable) {
          return;
        }

        if (status.hasLocalChanges && !status.hasRemoteChanges) {
          console.log("로컬 변경사항이 있습니다. 업로드합니다.");
          await this.uploadDatabase();
        } else if (status.hasRemoteChanges && !status.hasLocalChanges) {
          console.log("원격 변경사항이 있습니다. 다운로드합니다.");
          await this.downloadDatabase();
        } else if (status.hasLocalChanges && status.hasRemoteChanges) {
          // 충돌 상황 - 로컬 우선
          console.warn("동기화 충돌 감지됨. 로컬 변경사항을 우선합니다.");
          await this.uploadDatabase();
        }
      } catch (error) {
        console.error("자동 동기화 실패:", error);
      }
    }, CloudSyncService.SYNC_INTERVAL);

    console.log("자동 동기화가 시작되었습니다.");
  }

  /**
   * 자동 동기화 중지
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log("자동 동기화가 중지되었습니다.");
    }
  }

  /**
   * 수동 동기화 실행
   */
  async manualSync(): Promise<boolean> {
    try {
      databaseEvents.emit(DATABASE_EVENTS.SYNC_STARTED);
      const status = await this.getSyncStatus();

      if (!status.isAvailable) {
        console.warn("iCloud를 사용할 수 없습니다.");
        return false;
      }

      if (status.hasLocalChanges) {
        return await this.uploadDatabase();
      } else if (status.hasRemoteChanges) {
        return await this.downloadDatabase();
      } else {
        console.log("동기화할 변경사항이 없습니다.");
        return true;
      }
    } catch (error) {
      console.error("수동 동기화 실패:", error);
      return false;
    }
  }

  /**
   * 파일 존재 여부 확인
   */
  private async fileExists(filename: string): Promise<boolean> {
    try {
      return await CloudStorage.exists(filename);
    } catch {
      return false;
    }
  }

  /**
   * 로컬 데이터베이스 파일 경로 가져오기
   */
  private getLocalDbPath(): string {
    return `${FileSystem.documentDirectory}SQLite/notes.db`;
  }

  /**
   * 메타데이터 저장
   */
  private async saveMetadata(metadata: Record<string, any>): Promise<void> {
    try {
      await CloudStorage.writeFile(
        CloudSyncService.SYNC_METADATA_KEY,
        JSON.stringify(metadata, null, 2)
      );
    } catch (error) {
      console.error("메타데이터 저장 실패:", error);
    }
  }

  /**
   * 메타데이터 읽기
   */
  private async readMetadata(): Promise<Record<string, any> | null> {
    try {
      const exists = await this.fileExists(CloudSyncService.SYNC_METADATA_KEY);

      if (exists) {
        const content = await CloudStorage.readFile(
          CloudSyncService.SYNC_METADATA_KEY
        );
        return JSON.parse(content);
      }
    } catch (error) {
      console.error("메타데이터 읽기 실패:", error);
    }

    return null;
  }
}

// 싱글톤 인스턴스 내보내기
export const cloudSync = new CloudSyncService();
