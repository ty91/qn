import { StyleSheet, Text, View } from 'react-native';
import { Note } from '@/types/note';

interface NoteItemProps {
  note: Note;
}

export function NoteItem({ note }: NoteItemProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text} numberOfLines={2}>
        {note.text}
      </Text>
      <Text style={styles.timestamp}>
        {note.createdAt.toLocaleDateString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
});