import React, { useCallback, useEffect, useRef } from "react";
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useDerivedValue,
} from "react-native-reanimated";

interface NoteEditorProps {
  visible: boolean;
  onClose: () => void;
  onSave: (text: string) => void;
  onAutoSave: (text: string) => void;
  initialText?: string;
  mode?: "create" | "edit";
}

export function NoteEditor({
  visible,
  onClose,
  onSave,
  onAutoSave,
  initialText = "",
  mode = "create",
}: NoteEditorProps) {
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = React.useState("");
  const keyboard = useAnimatedKeyboard();

  useEffect(() => {
    if (visible) {
      setText(initialText);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [visible, initialText]);

  const handleSave = () => {
    if (text.trim()) {
      onSave(text.trim());
      setText("");
      Keyboard.dismiss();
    }
  };

  // Handle text changes
  const handleTextChange = useCallback((newText: string) => {
    setText(newText);
    if (mode === "edit") {
      onAutoSave(newText);
    }
  }, [mode, onAutoSave]);

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
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={StyleSheet.absoluteFillObject} />
        </TouchableWithoutFeedback>
      </Animated.View>
      <Animated.View style={[styles.container, animatedStyle]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={false}
        >
          <View style={styles.editor}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={
                mode === "create" ? "무슨 생각을 하고 계신가요?" : ""
              }
              placeholderTextColor="#999"
              multiline
              value={text}
              onChangeText={handleTextChange}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {mode === "create" && (
              <View style={styles.actions}>
                <TouchableWithoutFeedback onPress={handleClose}>
                  <View style={styles.button}>
                    <Text style={styles.cancelText}>취소</Text>
                  </View>
                </TouchableWithoutFeedback>
                <TouchableWithoutFeedback
                  onPress={handleSave}
                  disabled={!text.trim()}
                >
                  <View
                    style={[
                      styles.button,
                      styles.saveButton,
                      !text.trim() && styles.disabledButton,
                    ]}
                  >
                    <Text
                      style={[
                        styles.saveText,
                        !text.trim() && styles.disabledText,
                      ]}
                    >
                      저장
                    </Text>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            )}
          </View>
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  editor: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
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
  disabledButton: {
    opacity: 0.6,
  },
});
