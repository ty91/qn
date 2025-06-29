import { Note } from "@/types/note";
import React, { createContext, useCallback, useContext, useState } from "react";

interface NoteEditorContextType {
  isVisible: boolean;
  editingNote: Note | null;
  openEditor: (note?: Note) => void;
  closeEditor: () => void;
}

const NoteEditorContext = createContext<NoteEditorContextType | undefined>(
  undefined
);

export function NoteEditorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const openEditor = useCallback((note?: Note) => {
    setEditingNote(note || null);
    setIsVisible(true);
  }, []);

  const closeEditor = useCallback(() => {
    setIsVisible(false);
    // Don't clear editingNote immediately to prevent UI flash
    setTimeout(() => {
      setEditingNote(null);
    }, 300);
  }, []);

  return (
    <NoteEditorContext.Provider
      value={{
        isVisible,
        editingNote,
        openEditor,
        closeEditor,
      }}
    >
      {children}
    </NoteEditorContext.Provider>
  );
}

export function useNoteEditorContext() {
  const context = useContext(NoteEditorContext);
  if (!context) {
    throw new Error(
      "useNoteEditorContext must be used within a NoteEditorProvider"
    );
  }
  return context;
}
