import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { cloudSync } from '@/services/cloud-sync';
import { useIsCloudAvailable } from 'react-native-cloud-storage';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const cloudAvailable = useIsCloudAvailable();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // iCloud 동기화 초기화
  useEffect(() => {
    if (cloudAvailable) {
      // 자동 동기화 시작
      cloudSync.startAutoSync();
      console.log('iCloud 자동 동기화가 시작되었습니다.');

      // 앱 종료 시 자동 동기화 중지
      return () => {
        cloudSync.stopAutoSync();
      };
    }
  }, [cloudAvailable]);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
