import { GITHUB_REPO_NAME, GITHUB_TOKEN_KEY } from "@/constants/github";
import {
  dbNoteToNote,
  formatNote,
  parseNote,
  toDate,
} from "@/utils/note-utils";
import * as SecureStore from "expo-secure-store";
import * as db from "./database";
import * as github from "./github";

async function getGitHubToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(GITHUB_TOKEN_KEY);
}

/**
 * Uploads all locally modified (dirty) notes to GitHub.
 */
async function uploadDirtyNotes(token: string, repo: string) {
  const dirtyNotes = await db.getDirtyNotes();
  if (dirtyNotes.length === 0) {
    console.log("No dirty notes to upload.");
    return;
  }

  console.log(`Found ${dirtyNotes.length} dirty notes to upload.`);

  for (const dbNote of dirtyNotes) {
    try {
      const note = dbNoteToNote(dbNote);
      const noteContent = formatNote(note);
      const { sha: newSha } = await github.upsertNote(
        token,
        repo,
        note.id,
        noteContent,
        note.sha
      );

      await db.saveNote({
        ...dbNote,
        sha: newSha,
        is_dirty: 0,
      });

      console.log(`Successfully uploaded note ${note.id}`);
    } catch (error) {
      console.error(`Failed to upload note ${dbNote.id}:`, error);
    }
  }
}

/**
 * Downloads notes from GitHub and merges them with the local database.
 */
async function downloadRemoteNotes(token: string, repo: string) {
  const remoteNotes = await github.getAllNotes(token, repo);
  console.log(`Found ${remoteNotes.length} remote notes to download.`);

  for (const remoteNote of remoteNotes) {
    const noteId = remoteNote.name.replace(".md", "");
    const localNote = await db.getNoteById(noteId);

    if (localNote?.is_dirty) {
      console.log(`Skipping download for dirty note ${noteId}`);
      continue;
    }

    if (!localNote || localNote.sha !== remoteNote.sha) {
      try {
        const noteDetails = await github.getNote(token, repo, noteId);
        if (!noteDetails) continue;

        const { content, sha } = noteDetails;
        const { meta, body } = parseNote(content);

        const noteToSave: db.DbNote = {
          id: noteId,
          first_line: body.split("\n")[0] || "",
          content: body,
          created_at: toDate(meta.created).toISOString(),
          updated_at: toDate(meta.updated).toISOString(),
          sha: sha,
          is_dirty: 0,
        };

        await db.saveNote(noteToSave);
        console.log(`Successfully downloaded and saved note ${noteId}`);
      } catch (error) {
        console.error(`Failed to download note ${noteId}:`, error);
      }
    }
  }
}

/**
 * Deletes local notes that have been removed from the remote repository.
 */
async function syncRemoteDeletes(token: string, repo: string) {
  const remoteNotes = await github.getAllNotes(token, repo);
  const remoteNoteIds = new Set(
    remoteNotes.map((n) => n.name.replace(".md", ""))
  );
  const localNotes = await db.getAllNotes();

  for (const localNote of localNotes) {
    if (!remoteNoteIds.has(localNote.id)) {
      if (localNote.is_dirty && !localNote.sha) {
        console.log(`Skipping deletion for new local note ${localNote.id}`);
        continue;
      }

      try {
        await db.deleteNote(localNote.id);
        console.log(
          `Deleted local note ${localNote.id} as it was removed from remote.`
        );
      } catch (error) {
        console.error(`Failed to delete local note ${localNote.id}:`, error);
      }
    }
  }
}

/**
 * Processes the queue of notes deleted locally to delete them from GitHub.
 */
async function processDeleteQueue(token: string, repo: string) {
  const queueItems = await db.getSyncQueueItems();
  const deleteQueue = queueItems.filter((item) => item.operation === "delete");

  if (deleteQueue.length === 0) {
    console.log("No items in the delete queue.");
    return;
  }

  console.log(`Found ${deleteQueue.length} items in the delete queue.`);

  for (const item of deleteQueue) {
    try {
      const sha = item.content;
      if (!sha) {
        throw new Error("SHA not found for delete operation in sync queue.");
      }
      await github.deleteNote(token, repo, item.note_id, sha);
      await db.removeFromSyncQueue(item.id!);
      console.log(`Successfully deleted note ${item.note_id} from GitHub.`);
    } catch (error) {
      console.error(
        `Failed to delete note ${item.note_id} from GitHub:`,
        error
      );
    }
  }
}

/**
 * Performs a full synchronization cycle.
 */
export async function synchronize() {
  console.log("Starting synchronization...");
  try {
    const token = await getGitHubToken();
    const repo = GITHUB_REPO_NAME;
    if (!token || !repo) {
      console.log("Not authenticated, skipping sync.");
      return;
    }

    // 1. Process local deletions first
    await processDeleteQueue(token, repo);

    // 2. Upload dirty notes
    await uploadDirtyNotes(token, repo);

    // 3. Download and merge remote notes
    await downloadRemoteNotes(token, repo);

    // 4. Sync remote deletes
    await syncRemoteDeletes(token, repo);

    console.log("Synchronization finished.");
  } catch (error) {
    console.error("Synchronization failed:", error);
  }
}
