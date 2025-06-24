import React, { createContext, useContext, useState, useCallback } from 'react';
import { Note } from '@/types/note';

interface NoteEditorContextType {
  isVisible: boolean;
  editingNote: Note | null;
  mode: 'create' | 'edit';
  openEditor: (note?: Note) => void;
  closeEditor: () => void;
}

const NoteEditorContext = createContext<NoteEditorContextType | undefined>(undefined);

export function NoteEditorProvider({ children }: { children: React.ReactNode }) {
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

  const mode = editingNote ? 'edit' : 'create';

  return (
    <NoteEditorContext.Provider 
      value={{ 
        isVisible, 
        editingNote, 
        mode, 
        openEditor, 
        closeEditor 
      }}
    >
      {children}
    </NoteEditorContext.Provider>
  );
}

export function useNoteEditorContext() {
  const context = useContext(NoteEditorContext);
  if (!context) {
    throw new Error('useNoteEditorContext must be used within a NoteEditorProvider');
  }
  return context;
}