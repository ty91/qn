import { useAuth } from "@/contexts/auth-context";
import { exchangeCodeForToken, useGitHubAuth } from "@/services/github-oauth";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { request, response, promptAsync, redirectUri } = useGitHubAuth();
  const [isLoading, setIsLoading] = useState(false);
  const processedCodeRef = useRef<string | null>(null);

  const handleAuthCode = useCallback(
    async (code: string) => {
      if (processedCodeRef.current === code) {
        return;
      }

      try {
        setIsLoading(true);
        processedCodeRef.current = code;

        const token = await exchangeCodeForToken(code);

        await signIn(token);

        router.replace("/");
      } catch (error) {
        console.error("Authentication error:", error);
        processedCodeRef.current = null;
        Alert.alert(
          "인증 오류",
          "로그인 처리 중 문제가 발생했습니다. 다시 시도해주세요."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [signIn, router]
  );

  const handleGitHubLogin = () => {
    promptAsync();
  };

  useEffect(() => {
    if (response?.type === "success") {
      const { code } = response.params;
      handleAuthCode(code);
    } else if (response?.type === "error") {
      Alert.alert(
        "인증 실패",
        "GitHub 로그인 중 오류가 발생했습니다. 다시 시도해주세요."
      );
    }
  }, [handleAuthCode, response]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>qn</Text>
          <Text style={styles.subtitle}>빠르고 간단한 노트</Text>
        </View>

        <View style={styles.loginSection}>
          <TouchableOpacity
            style={styles.githubButton}
            onPress={handleGitHubLogin}
            disabled={!request || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="logo-github" size={24} color="#fff" />
                <Text style={styles.githubButtonText}>GitHub로 로그인</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.description}>
            GitHub 계정으로 로그인하여 {"\n"} 모든 기기에서 노트를 동기화하세요
          </Text>

          {__DEV__ && (
            <Text style={[styles.description, { fontSize: 12, marginTop: 20 }]}>
              Redirect URI: {redirectUri}
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 60,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: "#666",
  },
  loginSection: {
    width: "100%",
    alignItems: "center",
  },
  githubButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#24292e",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 12,
    width: "100%",
    justifyContent: "center",
  },
  githubButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  description: {
    marginTop: 24,
    textAlign: "center",
    color: "#666",
    fontSize: 14,
    lineHeight: 20,
  },
});
