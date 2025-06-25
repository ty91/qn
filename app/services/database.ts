import * as SQLite from 'expo-sqlite';
import { Note } from '@/types/note';
import { databaseEvents, DATABASE_EVENTS } from './event-emitter';

const DB_NAME = 'notes.db';

export class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  constructor() {
    this.openDatabase();
  }

  private openDatabase() {
    try {
      this.db = SQLite.openDatabaseSync(DB_NAME);
      this.initDatabase();
    } catch (error) {
      console.error('Failed to open database:', error);
      throw error;
    }
  }

  private initDatabase() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    this.db.execSync(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY NOT NULL,
        text TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );
    `);
  }

  /**
   * 데이터베이스 연결을 다시 엽니다 (동기화 후 사용)
   */
  async reconnect(): Promise<void> {
    try {
      // 기존 연결 닫기
      if (this.db) {
        this.db.closeSync();
        this.db = null;
      }
      
      // 새로운 연결 열기
      this.openDatabase();
      
      // 데이터베이스 업데이트 이벤트 발생
      databaseEvents.emit(DATABASE_EVENTS.UPDATED);
      console.log('Database reconnected successfully');
    } catch (error) {
      console.error('Failed to reconnect database:', error);
      throw error;
    }
  }

  async getAllNotes(): Promise<Note[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const result = this.db.getAllSync<{
      id: string;
      text: string;
      createdAt: number;
      updatedAt: number;
    }>("SELECT * FROM notes ORDER BY createdAt DESC");

    return result.map((row) => ({
      id: row.id,
      text: row.text,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  async createNote(text: string): Promise<Note> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const id = Date.now().toString();
    const now = Date.now();

    this.db.runSync(
      "INSERT INTO notes (id, text, createdAt, updatedAt) VALUES (?, ?, ?, ?)",
      id,
      text,
      now,
      now
    );

    return {
      id,
      text,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  async updateNote(id: string, text: string): Promise<Note> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const now = Date.now();

    this.db.runSync(
      "UPDATE notes SET text = ?, updatedAt = ? WHERE id = ?",
      text,
      now,
      id
    );

    const result = this.db!.getFirstSync<{
      id: string;
      text: string;
      createdAt: number;
      updatedAt: number;
    }>("SELECT * FROM notes WHERE id = ?", id);

    if (!result) {
      throw new Error(`Note with id ${id} not found`);
    }

    return {
      id: result.id,
      text: result.text,
      createdAt: new Date(result.createdAt),
      updatedAt: new Date(result.updatedAt),
    };
  }

  async deleteNote(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    this.db.runSync("DELETE FROM notes WHERE id = ?", id);
  }
}

export const database = new DatabaseService();
