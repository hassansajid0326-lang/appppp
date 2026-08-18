import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Pedometer, Accelerometer } from 'expo-sensors';
import { Platform, NativeModules } from 'react-native';
import { useOfflineStore } from './offlineStore';
import { sendInstantSummaryNotification } from './notifications';
import { syncAndroidHealthConnectSteps } from './healthConnect';

const { StepTrackerModule } = NativeModules;

const TASK_NAME = 'BACKGROUND_ACTIVITY_TRACKER';

const getAccelerometerVariance = (): Promise<number> => {
  return new Promise((resolve) => {
    let readings: number[] = [];
    const subscription = Accelerometer.addListener((data) => {
      // Calculate acceleration magnitude: sqrt(x^2 + y^2 + z^2)
      const magnitude = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
      readings.push(magnitude);
    });
    
    // Sample for 2 seconds
    setTimeout(() => {
      subscription.remove();
      if (readings.length === 0) {
        resolve(0);
        return;
      }
      // Calculate variance
      const mean = readings.reduce((sum, val) => sum + val, 0) / readings.length;
      const variance = readings.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / readings.length;
      resolve(variance);
    }, 2000);
  });
};

// Define Background Task
TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const store = useOfflineStore.getState();
    
    // 1. Fetch steps from Pedometer
    let newSteps = 0;
    const isPedometerAvailable = await Pedometer.isAvailableAsync();
    if (isPedometerAvailable && Platform.OS === 'ios') {
      const end = new Date();
      const start = new Date();
      start.setMinutes(end.getMinutes() - 15); // Look back last 15 minutes
      
      const result = await Pedometer.getStepCountAsync(start, end);
      if (result && result.steps) {
        newSteps = result.steps;
      }
    }
    
    // Update active daily steps in local store
    let currentSteps = store.dailySteps;
    if (Platform.OS === 'android') {
      try {
        if (StepTrackerModule) {
          const nativeSteps = await StepTrackerModule.getTodaySteps();
          if (typeof nativeSteps === 'number') {
            currentSteps = nativeSteps;
            store.setDailySteps(currentSteps);
          }
        } else {
          const hcSteps = await syncAndroidHealthConnectSteps();
          if (hcSteps !== null) {
            currentSteps = hcSteps;
            store.setDailySteps(currentSteps);
          }
        }
      } catch (err) {
        console.error('Failed to get steps from native module in background:', err);
      }
    } else if (isPedometerAvailable && Platform.OS === 'ios') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayResult = await Pedometer.getStepCountAsync(todayStart, new Date());
      if (todayResult && typeof todayResult.steps === 'number') {
        currentSteps = todayResult.steps;
        store.setDailySteps(currentSteps);
      }
    }
    
    // Trigger hourly summary notification with live data
    try {
      const weight = store.latestWeightKg || 70;
      const caloriesBurned = Math.round(0.000525 * weight * currentSteps);
      await sendInstantSummaryNotification(currentSteps, caloriesBurned);
    } catch (notificationError) {
      console.error('Error triggering background notification:', notificationError);
    }
    
    // 2. Classify activity using Accelerometer Heuristics
    let activity: 'walking' | 'driving_or_riding' | 'still' = 'still';
    
    if (newSteps > 15) {
      activity = 'walking';
    } else {
      const variance = await getAccelerometerVariance();
      if (variance > 0.03 && variance < 0.25) {
        activity = 'driving_or_riding';
      } else if (variance >= 0.25) {
        activity = 'walking';
      } else {
        activity = 'still';
      }
    }
    
    // Log interval activity locally (15 minutes = 900 seconds)
    store.logActivity(activity, 900);
    
    // Try to sync pending offline actions to Supabase server
    await store.syncQueueToServer();
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background activity task failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Helper to register task dynamically on app startup
export async function registerBackgroundSync() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(TASK_NAME, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false,   // continue tracking when app is closed
        startOnBoot: true,        // run on system reboot
      });
      console.log('Background Sync task registered successfully.');
    }
  } catch (err) {
    console.error('Failed to register Background Sync task:', err);
  }
}
