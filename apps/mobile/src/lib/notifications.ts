import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions() {
  if (Platform.OS === 'web') return false;
  
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for notification!');
      return false;
    }
    
    // Setup Android-specific channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#c3f400',
      });
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Sends an instant local notification with real-time steps and calorie progress
 */
export async function sendInstantSummaryNotification(steps: number, caloriesBurned: number) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'FitPulse Hourly Summary 🏃‍♂️',
        body: `Current Steps: ${steps.toLocaleString()} | Burned: ${caloriesBurned} kcal. Keep pushing!`,
        sound: true,
      },
      trigger: null, // trigger immediately
    });
  } catch (error) {
    console.error('Error sending instant summary notification:', error);
  }
}

/**
 * Schedules a recurring hourly check-in notification
 */
export async function scheduleHourlyReminder() {
  try {
    // Clear previously scheduled notifications to prevent stacking
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'FitPulse Active Check-In ⚡',
        body: "Time for a quick stretch! Keep taking steps toward your daily goal.",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 3600, // 1 hour
        repeats: true,
      },
    });
    console.log('Hourly reminder scheduled successfully.');
  } catch (error) {
    console.error('Error scheduling hourly reminder:', error);
  }
}
