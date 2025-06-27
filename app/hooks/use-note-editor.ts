import { useNoteEditorContext } from "@/contexts/note-editor-context";
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
      if (editingNote) {
        const updatedNote: Note = {
          ...editingNote,
          text,
          updatedAt: new Date(),
        };
        onUpdateNote(updatedNote);
        closeEditor();
      }
    },
    [editingNote, onUpdateNote, closeEditor]
  );

  const handleAutoSave = useCallback(
    (text: string) => {
      pendingTextRef.current = text;

      if (editingNote && text) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
          const updatedNote: Note = {
            ...editingNote,
            text,
            updatedAt: new Date(),
          };
          onUpdateNote(updatedNote);
          pendingTextRef.current = "";
        }, 500);
      }
    },
    [editingNote, onUpdateNote]
  );

  const handleClose = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (editingNote) {
      if (pendingTextRef.current) {
        const updatedNote: Note = {
          ...editingNote,
          text: pendingTextRef.current,
          updatedAt: new Date(),
        };
        onUpdateNote(updatedNote);
      }
    }

    pendingTextRef.current = "";
    closeEditor();
  }, [editingNote, onUpdateNote, closeEditor]);

  return {
    handleSave,
    handleAutoSave,
    handleClose,
    initialText: editingNote?.text || "",
  };
}
