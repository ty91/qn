import * as SQLite from 'expo-sqlite';
import { Note } from '@/types/note';

const DB_NAME = 'notes.db';

export class DatabaseService {
  private db: SQLite.SQLiteDatabase;

  constructor() {
    this.db = SQLite.openDatabaseSync(DB_NAME);
    this.initDatabase();
  }

  private initDatabase() {
    this.db.execSync(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY NOT NULL,
        text TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );
    `);
  }

  async getAllNotes(): Promise<Note[]> {
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

  async updateNote(id: string, text: string): Promise<void> {
    const now = Date.now();

    this.db.runSync(
      "UPDATE notes SET text = ?, updatedAt = ? WHERE id = ?",
      text,
      now,
      id
    );
  }

  async deleteNote(id: string): Promise<void> {
    this.db.runSync("DELETE FROM notes WHERE id = ?", id);
  }
}

export const database = new DatabaseService();
