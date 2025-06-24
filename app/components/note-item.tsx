import { Note } from "@/types/note";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface NoteItemProps {
  note: Note;
  onDelete?: (id: string) => void;
  onTap?: (note: Note) => void;
}

export function NoteItem({ note, onDelete, onTap }: NoteItemProps) {
  const translateX = useSharedValue(0);
  const containerHeight = useSharedValue(80);
  const wrapperHeight = useSharedValue(80);
  const wrapperOpacity = useSharedValue(1);
  const deleteContainerHeight = useSharedValue(80);

  const handleDelete = () => {
    if (onDelete) {
      onDelete(note.id);
    }
  };

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      if (onTap) {
        runOnJS(onTap)(note);
      }
    });

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      translateX.value = Math.min(0, event.translationX);
    })
    .onEnd(() => {
      if (translateX.value < -100) {
        translateX.value = withTiming(-1000, { duration: 200 }, () => {
          containerHeight.value = withTiming(0, { duration: 200 });
          deleteContainerHeight.value = withTiming(0, { duration: 200 });
          wrapperHeight.value = withTiming(0, { duration: 200 }, () => {
            runOnJS(handleDelete)();
          });
        });
      } else {
        translateX.value = withSpring(0, {
          overshootClamping: true,
        });
      }
    });

  const gesture = Gesture.Exclusive(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      height: containerHeight.value,
      overflow: "hidden",
    };
  });

  const wrapperAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: wrapperHeight.value,
      opacity: wrapperOpacity.value,
      overflow: "hidden",
    };
  });

  const deleteContainerAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: wrapperHeight.value,
      opacity: wrapperOpacity.value,
      overflow: "hidden",
    };
  });

  const deleteIconStyle = useAnimatedStyle(() => {
    const opacity = translateX.value < -20 ? 1 : 0;
    const scale = translateX.value < -100 ? withSpring(1.2) : withSpring(0.9);

    return {
      opacity: withTiming(opacity),
      transform: [{ scale }],
    };
  });

  return (
    <Animated.View style={[styles.wrapper, wrapperAnimatedStyle]}>
      <View style={[styles.deleteContainer, deleteContainerAnimatedStyle]}>
        <Animated.View style={deleteIconStyle}>
          <Text style={styles.deleteText}>삭제</Text>
        </Animated.View>
      </View>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.container, animatedStyle]}>
          <Text style={styles.text} numberOfLines={2}>
            {note.text}
          </Text>
          <Text style={styles.timestamp}>
            {note.createdAt.toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  container: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  deleteContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "flex-end",
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 20,
    backgroundColor: "#ff3b30",
  },
  deleteText: {
    color: "#fff",
    fontWeight: "600",
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: "#666",
  },
});
