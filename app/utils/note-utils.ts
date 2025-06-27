import { Note } from "@/types/note";
import { DbNote } from "@/services/database";

// Generate note ID from timestamp and uuid
export function generateNoteId(): string {
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  const uuid = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${uuid}`;
}

// Extract first line from text
export function extractFirstLine(text: string): string {
  const firstLine = text.split('\n')[0] || '';
  return firstLine.substring(0, 100); // Max 100 characters
}

// Convert Note to DbNote
export function noteToDbNote(note: Note): DbNote {
  return {
    id: note.id,
    first_line: extractFirstLine(note.text),
    content: note.text,
    created_at: note.createdAt.toISOString(),
    updated_at: note.updatedAt.toISOString(),
    sha: note.sha,
    is_dirty: note.isDirty ? 1 : 0
  };
}

// Convert DbNote to Note
export function dbNoteToNote(dbNote: DbNote): Note {
  return {
    id: dbNote.id,
    text: dbNote.content,
    createdAt: dbNote.created_at ? new Date(dbNote.created_at) : new Date(),
    updatedAt: dbNote.updated_at ? new Date(dbNote.updated_at) : new Date(),
    sha: dbNote.sha || undefined,
    isDirty: dbNote.is_dirty === 1
  };
}

// Safely convert to Date
export function toDate(value: any): Date {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return new Date(); // fallback to current date
}

// Format note content with frontmatter for GitHub
export function formatNote(note: Note): string {
  const frontmatter = `---
id: ${note.id}
created: ${note.createdAt.toISOString()}
updated: ${note.updatedAt.toISOString()}
---`;

  return `${frontmatter}\n\n${note.text}`;
}

// Get filename for GitHub storage
export function getNoteFilename(noteId: string): string {
  return `${noteId}.md`;
}

// Parse note content with frontmatter from GitHub
export function parseNote(content: string): { meta: any; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  
  if (match) {
    const yamlContent = match[1];
    const body = match[2];
    
    // Simple YAML parsing
    const meta: any = {};
    yamlContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split(': ');
      if (key && valueParts.length > 0) {
        meta[key] = valueParts.join(': ');
      }
    });
    
    return { meta, body };
  }
  
  // No frontmatter found
  return { meta: null, body: content };
}