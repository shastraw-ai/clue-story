import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { PaperProvider, MD3DarkTheme, MD3LightTheme, ActivityIndicator } from 'react-native-paper';
import { useAuthStore } from '../src/stores/authStore';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useKidsStore } from '../src/stores/kidsStore';
import { useStoriesStore } from '../src/stores/storiesStore';
import { scheduleDailyReminder, cancelDailyReminder } from '../src/services/notifications';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? MD3DarkTheme : MD3LightTheme;
  const router = useRouter();
  const segments = useSegments();

  // Auth state
  const { isAuthenticated, isLoading: authLoading, loadStoredAuth } = useAuthStore();

  // Settings state
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const loadNotificationSettings = useSettingsStore((state) => state.loadNotificationSettings);
  const notificationSettings = useSettingsStore((state) => state.notificationSettings);

  // Data stores
  const loadKids = useKidsStore((state) => state.loadKids);
  const loadStories = useStoriesStore((state) => state.loadStories);

  // Load stored auth on app start
  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Handle auth-based navigation
  useEffect(() => {
    if (authLoading) return;

    const inLoginScreen = segments[0] === 'login';

    if (!isAuthenticated && !inLoginScreen) {
      // Redirect to login if not authenticated
      router.replace('/login');
    } else if (isAuthenticated && inLoginScreen) {
      // Redirect to main app if authenticated
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, authLoading, segments]);

  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadSettings();
      loadKids();
      loadStories();
      loadNotificationSettings();
    }
  }, [isAuthenticated]);

  // Handle notification scheduling when settings change
  useEffect(() => {
    if (notificationSettings.enabled) {
      scheduleDailyReminder(notificationSettings.time);
    } else {
      cancelDailyReminder();
    }
  }, [notificationSettings.enabled, notificationSettings.time]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <PaperProvider theme={theme}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="story/[id]"
          options={{
            headerShown: true,
            title: 'Story',
            presentation: 'card',
          }}
        />
      </Stack>
    </PaperProvider>
  );
}
