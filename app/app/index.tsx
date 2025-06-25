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
import { databaseEvents, DATABASE_EVENTS } from "@/services/event-emitter";
import { Note } from "@/types/note";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View, Alert } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function HomeScreenContent() {
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isVisible, openEditor, closeEditor } = useNoteEditorContext();

  useEffect(() => {
    loadNotes();

    // 데이터베이스 업데이트 이벤트 리스너 등록
    const handleDatabaseUpdate = () => {
      console.log('데이터베이스가 업데이트되었습니다. 노트 목록을 새로고침합니다.');
      
      // 편집 중인 노트가 있다면 경고
      if (isVisible) {
        Alert.alert(
          '동기화 완료',
          '데이터베이스가 동기화되었습니다. 편집 중인 내용이 손실될 수 있습니다.',
          [
            { text: '계속 편집', style: 'cancel' },
            { 
              text: '확인', 
              onPress: () => {
                closeEditor();
                loadNotes();
              }
            }
          ]
        );
      } else {
        // 편집 중이 아니면 바로 새로고침
        loadNotes();
      }
    };

    const handleSyncStarted = () => {
      setIsRefreshing(true);
    };

    const handleSyncCompleted = () => {
      setIsRefreshing(false);
    };

    const handleSyncFailed = () => {
      setIsRefreshing(false);
    };

    // 이벤트 리스너 등록
    databaseEvents.on(DATABASE_EVENTS.UPDATED, handleDatabaseUpdate);
    databaseEvents.on(DATABASE_EVENTS.SYNC_STARTED, handleSyncStarted);
    databaseEvents.on(DATABASE_EVENTS.SYNC_COMPLETED, handleSyncCompleted);
    databaseEvents.on(DATABASE_EVENTS.SYNC_FAILED, handleSyncFailed);

    // 클린업
    return () => {
      databaseEvents.off(DATABASE_EVENTS.UPDATED, handleDatabaseUpdate);
      databaseEvents.off(DATABASE_EVENTS.SYNC_STARTED, handleSyncStarted);
      databaseEvents.off(DATABASE_EVENTS.SYNC_COMPLETED, handleSyncCompleted);
      databaseEvents.off(DATABASE_EVENTS.SYNC_FAILED, handleSyncFailed);
    };
  }, [isVisible, closeEditor]);

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
          pointerEvents={isVisible || isRefreshing ? "none" : "auto"}
          refreshing={isRefreshing}
          onRefresh={loadNotes}
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
