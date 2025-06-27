import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/auth-context";
import { Button, StyleSheet, Text, View } from "react-native";

export default function RepoConflictScreen() {
  const { resolveConflictAndSignOut } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">저장소 이름 충돌</ThemedText>
      <ThemedText style={styles.message}>
        고객님의 GitHub 계정에 이미 `qn-vault` 저장소가 존재하지만, 이 앱에서
        사용하는 저장소가 아닌 것으로 보입니다.
      </ThemedText>
      <ThemedText style={styles.message}>
        데이터를 안전하게 보호하기 위해, 기존 `qn-vault` 저장소의 이름을
        변경하시거나 다른 곳으로 이동하신 후 다시 로그인해주세요.
      </ThemedText>
      <Button title="확인 및 로그아웃" onPress={resolveConflictAndSignOut} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  message: {
    marginVertical: 15,
    textAlign: "center",
  },
});
