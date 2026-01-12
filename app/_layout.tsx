import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useKidsStore } from '../src/stores/kidsStore';
import { useStoriesStore } from '../src/stores/storiesStore';
import { scheduleDailyReminder, cancelDailyReminder } from '../src/services/notifications';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? MD3DarkTheme : MD3LightTheme;

  const checkApiKey = useSettingsStore((state) => state.checkApiKey);
  const loadNotificationSettings = useSettingsStore((state) => state.loadNotificationSettings);
  const loadCountry = useSettingsStore((state) => state.loadCountry);
  const loadModel = useSettingsStore((state) => state.loadModel);
  const notificationSettings = useSettingsStore((state) => state.notificationSettings);
  const loadKids = useKidsStore((state) => state.loadKids);
  const loadStories = useStoriesStore((state) => state.loadStories);

  useEffect(() => {
    // Load all stored data on app start
    checkApiKey();
    loadKids();
    loadStories();
    loadNotificationSettings();
    loadCountry();
    loadModel();
  }, []);

  // Handle notification scheduling when settings change
  useEffect(() => {
    if (notificationSettings.enabled) {
      scheduleDailyReminder(notificationSettings.time);
    } else {
      cancelDailyReminder();
    }
  }, [notificationSettings.enabled, notificationSettings.time]);

  return (
    <PaperProvider theme={theme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
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
