import React, { useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  TextInput, 
  View, 
  TouchableOpacity, 
  Text,
  KeyboardAvoidingView,
  Platform,
  Keyboard
} from 'react-native';

interface NoteCreatorProps {
  visible: boolean;
  onClose: () => void;
  onSave: (text: string) => void;
}

export function NoteCreator({ visible, onClose, onSave }: NoteCreatorProps) {
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = React.useState('');

  useEffect(() => {
    if (visible) {
      setText('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [visible]);

  const handleSave = () => {
    if (text.trim()) {
      onSave(text.trim());
      setText('');
      Keyboard.dismiss();
    }
  };

  const handleClose = () => {
    setText('');
    Keyboard.dismiss();
    onClose();
  };

  if (!visible) return null;

  return (
    <>
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={1} 
        onPress={handleClose}
      />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.editor}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="무슨 생각을 하고 계신가요?"
            placeholderTextColor="#999"
            multiline
            value={text}
            onChangeText={setText}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.actions}>
            <TouchableOpacity onPress={handleClose} style={styles.button}>
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleSave} 
              style={[styles.button, styles.saveButton]}
              disabled={!text.trim()}
            >
              <Text style={[styles.saveText, !text.trim() && styles.disabledText]}>
                저장
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '33%',
  },
  editor: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 60,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  saveText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  disabledText: {
    opacity: 0.5,
  },
});