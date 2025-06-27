import { FloatingButton } from "@/components/floating-button";
import { NoteEditor } from "@/components/note-editor";
import { NoteItem } from "@/components/note-item";
import {
  NoteEditorProvider,
  useNoteEditorContext,
} from "@/contexts/note-editor-context";
import { useNoteEditor } from "@/hooks/use-note-editor";
import { Note } from "@/types/note";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function HomeScreenContent() {
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const { isVisible, openEditor } = useNoteEditorContext();

  const handleCreateNote = useCallback((note: Note) => {
    setNotes((prev) => [note, ...prev]);
  }, []);

  const handleUpdateNote = useCallback((note: Note) => {
    setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
  }, []);

  const handleDeleteNote = async (id: string) => {
    setNotes(notes.filter((note) => note.id !== id));
  };

  const { handleSave, handleAutoSave, initialText } = useNoteEditor({
    onCreateNote: handleCreateNote,
    onUpdateNote: handleUpdateNote,
    onDeleteNote: handleDeleteNote,
  });

  const handleAddNote = async () => {
    const newNote: Note = {
      id: Date.now().toString(),
      text: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setNotes((prev) => [newNote, ...prev]);
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