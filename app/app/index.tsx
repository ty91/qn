import { FloatingButton } from "@/components/floating-button";
import { NoteEditor } from "@/components/note-editor";
import { NoteItem } from "@/components/note-item";
import { useAuth } from "@/contexts/auth-context";
import {
  NoteEditorProvider,
  useNoteEditorContext,
} from "@/contexts/note-editor-context";
import { useNoteEditor } from "@/hooks/use-note-editor";
import {
  deleteNote as deleteNoteFromDb,
  getAllNotes,
  saveNote as saveNoteToDb,
} from "@/services/database";
import { Note } from "@/types/note";
import {
  dbNoteToNote,
  generateNoteId,
  noteToDbNote,
  toDate,
} from "@/utils/note-utils";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  Menu,
  MenuOption,
  MenuOptions,
  MenuProvider,
  MenuTrigger,
} from "react-native-popup-menu";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function HomeScreenContent() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const { isVisible, openEditor } = useNoteEditorContext();

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
      note.createdAt = toDate(note.createdAt);
      note.updatedAt = toDate(note.updatedAt);

      const dbNote = noteToDbNote(note);
      dbNote.is_dirty = 1;
      await saveNoteToDb(dbNote);

      setNotes((prev) => {
        const exists = prev.some((n) => n.id === note.id);
        if (exists) {
          return prev.map((n) => (n.id === note.id ? note : n));
        }
        return [note, ...prev];
      });
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  }, []);

  const handleUpdateNote = useCallback(async (note: Note) => {
    try {
      note.createdAt = toDate(note.createdAt);
      note.updatedAt = toDate(note.updatedAt);

      const dbNote = noteToDbNote(note);
      dbNote.is_dirty = 1;
      await saveNoteToDb(dbNote);

      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
    } catch (error) {
      console.error("Failed to update note:", error);
    }
  }, []);

  const handleDeleteNote = async (id: string) => {
    try {
      await deleteNoteFromDb(id);
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
      isDirty: true,
    };
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Menu>
          <MenuTrigger>
            <Ionicons name="ellipsis-vertical" size={24} color="#000" />
          </MenuTrigger>
          <MenuOptions>
            <MenuOption onSelect={signOut}>
              <Text style={styles.menuOptionText}>로그아웃</Text>
            </MenuOption>
          </MenuOptions>
        </Menu>
      </View>
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
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  menuOptionText: {
    fontSize: 16,
    padding: 10,
  },
  listContent: {
    paddingTop: 10,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
});

export default function HomeScreen() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <MenuProvider>
        <NoteEditorProvider>
          <HomeScreenContent />
        </NoteEditorProvider>
      </MenuProvider>
    </GestureHandlerRootView>
  );
}
