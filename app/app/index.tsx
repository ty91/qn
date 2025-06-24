import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NoteItem } from '@/components/note-item';
import { FloatingButton } from '@/components/floating-button';
import { NoteCreator } from '@/components/note-creator';
import { Note } from '@/types/note';

const mockNotes: Note[] = [
  {
    id: '1',
    text: '오늘 날씨가 정말 좋다. 산책하기 딱 좋은 날이다.',
    createdAt: new Date('2024-01-20'),
  },
  {
    id: '2',
    text: '새로운 커피 머신을 샀다. 아침마다 향긋한 커피 냄새가 난다.',
    createdAt: new Date('2024-01-19'),
  },
  {
    id: '3',
    text: '책을 읽다가 인상 깊은 구절을 발견했다. "삶은 우리가 다른 계획을 세우느라 바쁠 때 일어나는 일이다."',
    createdAt: new Date('2024-01-18'),
  },
  {
    id: '4',
    text: '오늘은 집중이 잘 되는 날이다. 이럴 때 많은 일을 해두어야겠다.',
    createdAt: new Date('2024-01-17'),
  },
  {
    id: '5',
    text: '친구와 오랜만에 통화했다. 목소리만 들어도 반가웠다.',
    createdAt: new Date('2024-01-16'),
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [showCreator, setShowCreator] = useState(false);
  
  const handleAddNote = () => {
    setShowCreator(true);
  };
  
  const handleCloseCreator = () => {
    setShowCreator(false);
  };
  
  const handleSaveNote = (text: string) => {
    console.log('New note:', text);
    setShowCreator(false);
  };
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={mockNotes}
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
});