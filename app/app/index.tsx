import { FloatingButton } from "@/components/floating-button";
import { NoteEditor } from "@/components/note-editor";
import { NoteItem } from "@/components/note-item";
import { SyncStatusIndicator } from "@/components/sync-status-indicator";
import {
  NoteEditorProvider,
  useNoteEditorContext,
} from "@/contexts/note-editor-context";
import { useNoteEditor } from "@/hooks/use-note-editor";
import { database } from "@/services/database";
import { Note } from "@/types/note";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function HomeScreenContent() {
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const { isVisible, openEditor } = useNoteEditorContext();

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const loadedNotes = await database.getAllNotes();
      setNotes(loadedNotes);
    } catch (error) {
      console.error("Failed to load notes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = useCallback((note: Note) => {
    setNotes((prev) => [note, ...prev]);
  }, []);

  const handleUpdateNote = useCallback((note: Note) => {
    setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
  }, []);

  const handleDeleteNote = async (id: string) => {
    try {
      await database.deleteNote(id);
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
    try {
      // Create an empty note first
      const newNote = await database.createNote("");
      // Add to notes list
      setNotes((prev) => [newNote, ...prev]);
      // Open editor with the new note
      openEditor(newNote);
    } catch (error) {
      console.error("Failed to create note:", error);
    }
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
        <View style={styles.header}>
          <SyncStatusIndicator />
        </View>
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NoteItem
              note={item}
              onDelete={handleDeleteNote}
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
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
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
