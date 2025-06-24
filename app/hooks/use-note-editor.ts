import { useNoteEditorContext } from "@/contexts/note-editor-context";
import { database } from "@/services/database";
import { Note } from "@/types/note";
import { useCallback, useRef } from "react";

interface UseNoteEditorProps {
  onCreateNote: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
}

export function useNoteEditor({
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
}: UseNoteEditorProps) {
  const { editingNote, closeEditor } = useNoteEditorContext();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTextRef = useRef<string>("");

  const handleSave = useCallback(
    async (text: string) => {
      try {
        if (editingNote) {
          if (text.trim()) {
            // Update the note and close editor
            const updatedNote = await database.updateNote(editingNote.id, text);
            onUpdateNote(updatedNote);
          } else {
            // Delete empty note
            await database.deleteNote(editingNote.id);
            onDeleteNote(editingNote.id);
          }
          closeEditor();
        }
      } catch (error) {
        console.error("Failed to save note:", error);
      }
    },
    [editingNote, onUpdateNote, onDeleteNote, closeEditor]
  );

  const handleAutoSave = useCallback(
    (text: string) => {
      // Always update pending text
      pendingTextRef.current = text;

      if (editingNote && text) {
        // Clear any pending save
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        // Schedule new save (only update, don't close editor)
        saveTimeoutRef.current = setTimeout(async () => {
          try {
            const updatedNote = await database.updateNote(editingNote.id, text);
            onUpdateNote(updatedNote);
            pendingTextRef.current = "";
          } catch (error) {
            console.error("Failed to auto-save:", error);
          }
        }, 500);
      }
    },
    [editingNote, onUpdateNote]
  );

  const handleClose = useCallback(async () => {
    // Clear any pending saves
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (editingNote) {
      try {
        // Save pending text or delete if empty
        const finalText = pendingTextRef.current || editingNote.text;
        if (finalText.trim()) {
          // Save if there's content
          if (pendingTextRef.current) {
            const updatedNote = await database.updateNote(
              editingNote.id,
              pendingTextRef.current
            );
            onUpdateNote(updatedNote);
          }
        } else {
          // Delete if empty
          await database.deleteNote(editingNote.id);
          onDeleteNote(editingNote.id);
        }
      } catch (error) {
        console.error("Failed to handle close:", error);
      }
    }

    pendingTextRef.current = "";
    closeEditor();
  }, [editingNote, onUpdateNote, onDeleteNote, closeEditor]);

  return {
    handleSave,
    handleAutoSave,
    handleClose,
    initialText: editingNote?.text || "",
  };
}
