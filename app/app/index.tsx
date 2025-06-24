import { FloatingButton } from "@/components/floating-button";
import { NoteEditor } from "@/components/note-editor";
import { NoteItem } from "@/components/note-item";
import { database } from "@/services/database";
import { Note } from "@/types/note";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NoteEditorProvider, useNoteEditorContext } from "@/contexts/note-editor-context";
import { useNoteEditor } from "@/hooks/use-note-editor";

function HomeScreenContent() {
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const { isVisible, mode, openEditor } = useNoteEditorContext();

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
    setNotes(prev => [note, ...prev]);
  }, []);

  const handleUpdateNote = useCallback((note: Note) => {
    setNotes(prev => prev.map(n => n.id === note.id ? note : n));
  }, []);

  const { handleSave, handleAutoSave, handleClose, initialText } = useNoteEditor({
    onCreateNote: handleCreateNote,
    onUpdateNote: handleUpdateNote,
  });

  const handleAddNote = () => {
    openEditor();
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await database.deleteNote(id);
      setNotes(notes.filter((note) => note.id !== id));
    } catch (error) {
      console.error("Failed to delete note:", error);
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
          keyboardShouldPersistTaps="handled"
        />
        <FloatingButton onPress={handleAddNote} />
        <NoteEditor
          visible={isVisible}
          onClose={handleClose}
          onSave={handleSave}
          onAutoSave={handleAutoSave}
          initialText={initialText}
          mode={mode}
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
