import * as SQLite from "expo-sqlite";

const DATABASE_NAME = "qn.db";

// Database instance
let db: SQLite.SQLiteDatabase | null = null;

// Initialize database
export async function initializeDatabase(): Promise<void> {
  try {
    db = await SQLite.openDatabaseAsync(DATABASE_NAME);

    // Create tables
    await db.execAsync(`
      -- Main notes table
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        first_line TEXT,
        content TEXT,
        created_at TEXT,
        updated_at TEXT,
        sha TEXT,
        is_dirty INTEGER DEFAULT 0
      );

      -- Sync queue for offline operations
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation TEXT,
        note_id TEXT,
        content TEXT,
        created_at TEXT,
        retry_count INTEGER DEFAULT 0
      );

      -- Metadata table
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}

// Get database instance
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error(
      "Database not initialized. Call initializeDatabase() first."
    );
  }
  return db;
}

// Note CRUD operations
export interface DbNote {
  id: string;
  first_line: string;
  content: string;
  created_at: string;
  updated_at: string;
  sha?: string;
  is_dirty: number;
}

// Create or update a note
export async function saveNote(note: DbNote): Promise<void> {
  const db = getDatabase();

  await db.runAsync(
    `INSERT OR REPLACE INTO notes 
     (id, first_line, content, created_at, updated_at, sha, is_dirty)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      note.id,
      note.first_line,
      note.content,
      note.created_at,
      note.updated_at,
      note.sha || null,
      note.is_dirty,
    ]
  );
}

// Get all notes (for list view)
export async function getAllNotes(): Promise<DbNote[]> {
  const db = getDatabase();

  const result = await db.getAllAsync<DbNote>(
    `SELECT * FROM notes ORDER BY created_at DESC`
  );

  return result;
}

// Get a single note by id
export async function getNoteById(id: string): Promise<DbNote | null> {
  const db = getDatabase();

  const result = await db.getFirstAsync<DbNote>(
    `SELECT * FROM notes WHERE id = ?`,
    [id]
  );

  return result;
}

// Delete a note
export async function deleteNote(id: string): Promise<void> {
  const db = getDatabase();

  await db.runAsync(`DELETE FROM notes WHERE id = ?`, [id]);
}

// Mark note as dirty (needs sync)
export async function markNoteAsDirty(id: string): Promise<void> {
  const db = getDatabase();

  await db.runAsync(`UPDATE notes SET is_dirty = 1 WHERE id = ?`, [id]);
}

// Get all dirty notes
export async function getDirtyNotes(): Promise<DbNote[]> {
  const db = getDatabase();

  const result = await db.getAllAsync<DbNote>(
    `SELECT * FROM notes WHERE is_dirty = 1`
  );

  return result;
}

// Sync queue operations
export interface SyncQueueItem {
  id?: number;
  operation: "create" | "update" | "delete";
  note_id: string;
  content?: string;
  created_at: string;
  retry_count: number;
}

// Add to sync queue
export async function addToSyncQueue(
  item: Omit<SyncQueueItem, "id">
): Promise<void> {
  const db = getDatabase();

  await db.runAsync(
    `INSERT INTO sync_queue (operation, note_id, content, created_at, retry_count)
     VALUES (?, ?, ?, ?, ?)`,
    [
      item.operation,
      item.note_id,
      item.content || null,
      item.created_at,
      item.retry_count,
    ]
  );
}

// Get sync queue items
export async function getSyncQueueItems(): Promise<SyncQueueItem[]> {
  const db = getDatabase();

  const result = await db.getAllAsync<SyncQueueItem>(
    `SELECT * FROM sync_queue ORDER BY created_at ASC`
  );

  return result;
}

// Remove from sync queue
export async function removeFromSyncQueue(id: number): Promise<void> {
  const db = getDatabase();

  await db.runAsync(`DELETE FROM sync_queue WHERE id = ?`, [id]);
}

// Update sync queue retry count
export async function updateSyncQueueRetry(
  id: number,
  retryCount: number
): Promise<void> {
  const db = getDatabase();

  await db.runAsync(`UPDATE sync_queue SET retry_count = ? WHERE id = ?`, [
    retryCount,
    id,
  ]);
}

// Metadata operations
export async function getMetadata(key: string): Promise<string | null> {
  const db = getDatabase();

  const result = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM metadata WHERE key = ?`,
    [key]
  );

  return result?.value || null;
}

export async function setMetadata(key: string, value: string): Promise<void> {
  const db = getDatabase();

  await db.runAsync(
    `INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)`,
    [key, value]
  );
}
