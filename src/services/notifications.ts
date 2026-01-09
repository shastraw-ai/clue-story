import * as Notifications from 'expo-notifications';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationTime {
  hour: number;   // 0-23
  minute: number; // 0-59
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

/**
 * Schedule daily story reminder notification
 */
export async function scheduleDailyReminder(time: NotificationTime): Promise<string | null> {
  // Cancel any existing reminder first
  await cancelDailyReminder();

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return null;
  }

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Bedtime Story Time!',
      body: 'Ready for a magical adventure? Create a story for your kids!',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: time.hour,
      minute: time.minute,
    },
  });

  return identifier;
}

/**
 * Cancel the daily reminder
 */
export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Check if notifications are enabled at system level
 */
export async function getNotificationPermissionStatus(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}
