import React, { useEffect, useRef } from "react";
import {
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useDerivedValue,
} from "react-native-reanimated";

interface NoteCreatorProps {
  visible: boolean;
  onClose: () => void;
  onSave: (text: string) => void;
}

export function NoteCreator({ visible, onClose, onSave }: NoteCreatorProps) {
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = React.useState("");
  const keyboard = useAnimatedKeyboard();

  useEffect(() => {
    if (visible) {
      setText("");

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [visible]);

  const handleSave = () => {
    if (text.trim()) {
      onSave(text.trim());
      setText("");
      Keyboard.dismiss();
    }
  };

  const handleClose = () => {
    setText("");
    Keyboard.dismiss();
    onClose();
  };

  // 키보드 높이에 따른 opacity를 derived value로 계산
  const opacity = useDerivedValue(() => {
    return interpolate(keyboard.height.value, [0, 300], [0, 1]);
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      marginBottom: keyboard.height.value,
      opacity: opacity.value,
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value * 0.3, // backdrop은 30% opacity
    };
  });

  if (!visible) return null;

  return (
    <>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={handleClose}
        />
      </Animated.View>
      <Animated.View style={[styles.container, animatedStyle]}>
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
              <Text
                style={[styles.saveText, !text.trim() && styles.disabledText]}
              >
                저장
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  editor: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    minHeight: 150,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: "top",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 16,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  saveButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  cancelText: {
    fontSize: 16,
    color: "#666",
  },
  saveText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  disabledText: {
    opacity: 0.5,
  },
});
