import { useEffect, useState } from 'react';
import { AppState, AppStateStatus, Platform, NativeModules, PermissionsAndroid } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { useOfflineStore } from './offlineStore';

const { StepTrackerModule } = NativeModules;

export function usePedometer(userId: string | undefined) {
  const { dailySteps, setDailySteps, checkDailyReset } = useOfflineStore();
  const [isPedometerAvailable, setIsPedometerAvailable] = useState<boolean | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);

  const updateSteps = async () => {
    try {
      // Perform daily reset check
      checkDailyReset();

      // 1. Try to fetch steps from native 24/7 foreground step tracker on Android
      if (Platform.OS === 'android') {
        if (StepTrackerModule) {
          const steps = await StepTrackerModule.getTodaySteps();
          if (typeof steps === 'number') {
            setDailySteps(steps);
            setIsSimulated(false);
            setIsPedometerAvailable(true);
            setPermissionStatus('granted');
            return;
          }
        }
      }

      // 2. Fallback to Expo Pedometer (or iOS native tracker)
      const perm = await Pedometer.getPermissionsAsync();
      let status = perm.status;
      
      if (status !== 'granted') {
        const req = await Pedometer.requestPermissionsAsync();
        status = req.status;
      }
      setPermissionStatus(status);

      const available = await Pedometer.isAvailableAsync();
      setIsPedometerAvailable(available);

      if (status === 'granted') {
        if (!available) {
          setIsSimulated(true);
          return;
        }

        setIsSimulated(false);

        // ONLY call getStepCountAsync on iOS, as it is unsupported on Android for arbitrary date ranges
        if (Platform.OS === 'ios') {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const end = new Date();

          const result = await Pedometer.getStepCountAsync(start, end);
          if (result && typeof result.steps === 'number') {
            setDailySteps(result.steps);
          }
        }
      } else {
        setIsSimulated(true); // Fallback to simulation if permission denied
      }
    } catch (error) {
      console.error('Error updating step count:', error);
      setIsSimulated(true); // Fallback to simulation on error
    }
  };

  useEffect(() => {
    if (!userId) return;

    // Request permissions and start service on Android
    const initAndroidService = async () => {
      if (Platform.OS === 'android') {
        try {
          const permissions = [
            PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
          ];
          
          // Request notification permission on Android 13+ (SDK 33) for foreground service sticky notification
          if (Platform.Version >= 33) {
            permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
          }

          const granted = await PermissionsAndroid.requestMultiple(permissions);
          const recognitionGranted = granted[PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION] === PermissionsAndroid.RESULTS.GRANTED;
          
          if (recognitionGranted && StepTrackerModule) {
            StepTrackerModule.startStepService();
          } else {
            console.log('Android activity recognition permission denied.');
            setIsSimulated(true);
          }
        } catch (err) {
          console.error('Failed to initialize Android native steps service:', err);
        }
      }
    };

    initAndroidService().then(() => {
      updateSteps();
    });

    // Check when AppState returns to foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        updateSteps();
      }
    };
    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    // Watch live steps in active session
    let watcherSubscription: { remove: () => void } | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    if (Platform.OS === 'ios') {
      Pedometer.isAvailableAsync().then((available) => {
        if (available) {
          watcherSubscription = Pedometer.watchStepCount((result) => {
            updateSteps();
          });
        }
      });
    } else {
      // Android: poll native SharedPreferences via the module every 1.5 seconds for instant real-time UI updates
      pollInterval = setInterval(() => {
        updateSteps();
      }, 1500);
    }

    return () => {
      appStateSub.remove();
      if (watcherSubscription) {
        watcherSubscription.remove();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [userId]);

  const simulateSteps = (amount: number) => {
    checkDailyReset();
    if (Platform.OS === 'android' && StepTrackerModule) {
      StepTrackerModule.simulateSteps(amount);
      updateSteps();
    } else {
      setDailySteps(dailySteps + amount);
    }
  };

  return {
    isPedometerAvailable,
    permissionStatus,
    isSimulated,
    simulateSteps,
    refreshSteps: updateSteps,
  };
}
