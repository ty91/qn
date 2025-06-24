import React, { useState, useEffect } from 'react';
import { FlatList, StyleSheet, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NoteItem } from '@/components/note-item';
import { FloatingButton } from '@/components/floating-button';
import { NoteCreator } from '@/components/note-creator';
import { Note } from '@/types/note';
import { database } from '@/services/database';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [showCreator, setShowCreator] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadNotes();
  }, []);
  
  const loadNotes = async () => {
    try {
      setLoading(true);
      const loadedNotes = await database.getAllNotes();
      setNotes(loadedNotes);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddNote = () => {
    setShowCreator(true);
  };
  
  const handleCloseCreator = () => {
    setShowCreator(false);
  };
  
  const handleSaveNote = async (text: string) => {
    try {
      const newNote = await database.createNote(text);
      setNotes([newNote, ...notes]);
      setShowCreator(false);
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  };
  
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NoteItem note={item} />}
        contentContainerStyle={styles.listContent}
      />
      <FloatingButton onPress={handleAddNote} />
      <NoteCreator 
        visible={showCreator}
        onClose={handleCloseCreator}
        onSave={handleSaveNote}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    paddingTop: 20,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});