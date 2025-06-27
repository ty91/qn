import { FloatingButton } from "@/components/floating-button";
import { NoteEditor } from "@/components/note-editor";
import { NoteItem } from "@/components/note-item";
import {
  NoteEditorProvider,
  useNoteEditorContext,
} from "@/contexts/note-editor-context";
import { useNoteEditor } from "@/hooks/use-note-editor";
import { Note } from "@/types/note";
import React, { useCallback, useState, useEffect } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { 
  getAllNotes, 
  saveNote as saveNoteToDb, 
  deleteNote as deleteNoteFromDb
} from "@/services/database";
import { 
  noteToDbNote, 
  dbNoteToNote, 
  generateNoteId,
  toDate
} from "@/utils/note-utils";

function HomeScreenContent() {
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const { isVisible, openEditor } = useNoteEditorContext();

  // Load notes from database on mount
  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const dbNotes = await getAllNotes();
      const convertedNotes = dbNotes.map(dbNoteToNote);
      setNotes(convertedNotes);
    } catch (error) {
      console.error("Failed to load notes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = useCallback(async (note: Note) => {
    try {
      // Ensure dates are Date objects
      note.createdAt = toDate(note.createdAt);
      note.updatedAt = toDate(note.updatedAt);
      
      // Save to database
      const dbNote = noteToDbNote(note);
      dbNote.is_dirty = 1; // Mark as dirty for sync
      await saveNoteToDb(dbNote);
      
      // Update local state - ensure no duplicates
      setNotes((prev) => {
        const exists = prev.some(n => n.id === note.id);
        if (exists) {
          return prev.map(n => n.id === note.id ? note : n);
        }
        return [note, ...prev];
      });
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  }, []);

  const handleUpdateNote = useCallback(async (note: Note) => {
    try {
      // Ensure dates are Date objects
      note.createdAt = toDate(note.createdAt);
      note.updatedAt = toDate(note.updatedAt);
      
      // Save to database
      const dbNote = noteToDbNote(note);
      dbNote.is_dirty = 1; // Mark as dirty for sync
      await saveNoteToDb(dbNote);
      
      // Update local state
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
    } catch (error) {
      console.error("Failed to update note:", error);
    }
  }, []);

  const handleDeleteNote = async (id: string) => {
    try {
      await deleteNoteFromDb(id);
      
      // Update local state
      setNotes(notes.filter((note) => note.id !== id));
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  const { handleSave, handleAutoSave, initialText } = useNoteEditor({
    onCreateNote: handleCreateNote,
    onUpdateNote: handleUpdateNote,
    onDeleteNote: handleDeleteNote,
  });

  const handleAddNote = async () => {
    const newNote: Note = {
      id: generateNoteId(),
      text: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      isDirty: true
    };
    // Don't add to list yet, wait for actual save
    openEditor(newNote);
  };

  const handleTapNote = (note: Note) => {
    openEditor(note);
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { paddingTop: insets.top },
        ]}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NoteItem
              note={item}
              onDelete={() => handleDeleteNote(item.id)}
              onTap={handleTapNote}
            />
          )}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="always"
          pointerEvents={isVisible ? "none" : "auto"}
        />
        <FloatingButton onPress={handleAddNote} />
        <NoteEditor
          visible={isVisible}
          onSave={handleSave}
          onAutoSave={handleAutoSave}
          initialText={initialText}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  listContent: {
    paddingTop: 20,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
});

export default function HomeScreen() {
  return (
    <NoteEditorProvider>
      <HomeScreenContent />
    </NoteEditorProvider>
  );
}