import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AuthProvider, useAuth } from '@/lib/AuthProvider';

SplashScreen.preventAutoHideAsync();

const InitialLayout = () => {
  const { session, isLoading, role } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // Use setTimeout to ensure Root Layout is mounted before navigating
    // because Expo Router sometimes throws if navigated synchronously during render
    setTimeout(() => {
      SplashScreen.hideAsync();
      const currentSegments = segments as string[];
      const inAuthGroup = currentSegments[0] === '(auth)';
      const atRoot = currentSegments.length === 0 || currentSegments[0] === 'index';

      if (!session && !inAuthGroup) {
        router.replace('/(auth)/login');
      } else if (session && (inAuthGroup || atRoot)) {
        if (!role) return; // Wait until role is fetched!

        if (role === 'company' || role === 'hiring_manager') {
          router.replace('/(company)/dashboard');
        } else if (role === 'admin') {
          router.replace('/(admin)/dashboard');
        } else {
          router.replace('/(candidate)/dashboard');
        }
      }
    }, 100);
  }, [session, isLoading, role, segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <InitialLayout />
      </AuthProvider>
    </ThemeProvider>
  );
}
