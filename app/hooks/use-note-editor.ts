import { useNoteEditorContext } from "@/contexts/note-editor-context";
import { database } from "@/services/database";
import { Note } from "@/types/note";
import { useCallback, useRef } from "react";

interface UseNoteEditorProps {
  onCreateNote: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
}

export function useNoteEditor({
  onCreateNote,
  onUpdateNote,
}: UseNoteEditorProps) {
  const { editingNote, mode, closeEditor } = useNoteEditorContext();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTextRef = useRef<string>("");

  const handleSave = useCallback(
    async (text: string) => {
      try {
        if (mode === "edit" && editingNote) {
          // For edit mode, update the note without closing the editor
          const updatedNote = await database.updateNote(editingNote.id, text);
          onUpdateNote(updatedNote);
        } else {
          // For create mode, create new note and close editor
          const newNote = await database.createNote(text);
          onCreateNote(newNote);
          closeEditor();
        }
      } catch (error) {
        console.error("Failed to save note:", error);
      }
    },
    [mode, editingNote, onCreateNote, onUpdateNote, closeEditor]
  );

  const handleAutoSave = useCallback(
    (text: string) => {
      // Always update pending text
      pendingTextRef.current = text;

      if (mode === "edit" && text) {
        // Clear any pending save
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        // Schedule new save
        saveTimeoutRef.current = setTimeout(() => {
          handleSave(text);
          pendingTextRef.current = "";
        }, 500);
      }
    },
    [mode, handleSave]
  );

  const handleClose = useCallback(async () => {
    // Clear any pending saves
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Save pending text if in edit mode
    if (mode === "edit" && pendingTextRef.current && editingNote) {
      try {
        const updatedNote = await database.updateNote(
          editingNote.id,
          pendingTextRef.current
        );
        onUpdateNote(updatedNote);
      } catch (error) {
        console.error("Failed to save pending changes:", error);
      }
    }

    pendingTextRef.current = "";
    closeEditor();
  }, [mode, editingNote, onUpdateNote, closeEditor]);

  return {
    handleSave,
    handleAutoSave,
    handleClose,
    initialText: editingNote?.text || "",
  };
}
