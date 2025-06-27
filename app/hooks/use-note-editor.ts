import { useNoteEditorContext } from "@/contexts/note-editor-context";
import { Note } from "@/types/note";
import { toDate } from "@/utils/note-utils";
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
  const pendingTextRef = useRef<string | null>(null);

  const handleSave = useCallback(
    async (text: string) => {
      if (editingNote) {
        const isNewNote = !editingNote.text && editingNote.id;
        const updatedNote: Note = {
          ...editingNote,
          text,
          createdAt: toDate(editingNote.createdAt),
          updatedAt: new Date(),
        };
        
        if (isNewNote) {
          onCreateNote(updatedNote);
        } else {
          onUpdateNote(updatedNote);
        }
        closeEditor();
      }
    },
    [editingNote, onCreateNote, onUpdateNote, closeEditor]
  );

  const handleAutoSave = useCallback(
    (text: string) => {
      pendingTextRef.current = text;

      if (editingNote) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
          const isNewNote = !editingNote.text && editingNote.id;
          const updatedNote: Note = {
            ...editingNote,
            text,
            createdAt: toDate(editingNote.createdAt),
            updatedAt: new Date(),
          };
          
          if (isNewNote) {
            onCreateNote(updatedNote);
          } else {
            onUpdateNote(updatedNote);
          }
          pendingTextRef.current = null;
        }, 500);
      }
    },
    [editingNote, onCreateNote, onUpdateNote]
  );

  const handleClose = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (editingNote && pendingTextRef.current !== null) {
      const updatedNote: Note = {
        ...editingNote,
        text: pendingTextRef.current,
        createdAt: toDate(editingNote.createdAt),
        updatedAt: new Date(),
      };
      onUpdateNote(updatedNote);
    }

    pendingTextRef.current = null;
    closeEditor();
  }, [editingNote, onUpdateNote, closeEditor]);

  return {
    handleSave,
    handleAutoSave,
    handleClose,
    initialText: editingNote?.text || "",
  };
}
