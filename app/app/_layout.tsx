import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import "react-native-reanimated";

import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { useColorScheme } from "@/hooks/useColorScheme";
import { initializeDatabase } from "@/services/database";
import { synchronize } from "@/services/sync";
import { ActivityIndicator, AppState, View } from "react-native";

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { authState } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (authState === "LOADING") return;

    const inAuthGroup = segments[0] === "(auth)";

    if (authState === "UNAUTHENTICATED" && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (authState === "AUTHENTICATED") {
      if (inAuthGroup) {
        router.replace("/");
      }
      // Run initial sync when authenticated
      synchronize();
    } else if (authState === "REPO_CONFLICT") {
      router.replace("/repo-conflict");
    }
  }, [authState, segments, router]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextAppState) => {
        if (nextAppState === "active" && authState === "AUTHENTICATED") {
          console.log("App has come to the foreground, running sync.");
          await synchronize();
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [authState]);

  if (authState === "LOADING") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="repo-conflict" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [dbInitialized, setDbInitialized] = useState(false);

  useEffect(() => {
    initializeDatabase()
      .then(() => setDbInitialized(true))
      .catch((error) => {
        console.error("Failed to initialize database:", error);
        // Continue anyway, will handle errors in components
        setDbInitialized(true);
      });
  }, []);

  if (!loaded || !dbInitialized) {
    return null;
  }

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
