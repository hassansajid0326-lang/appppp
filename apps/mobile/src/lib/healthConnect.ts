import { Platform } from 'react-native';
import { 
  initialize, 
  requestPermission, 
  readRecords 
} from 'react-native-health-connect';

/**
 * Attempts to initialize Health Connect and read today's steps.
 * Handles failures gracefully if Health Connect is unavailable or permission is denied.
 */
export async function syncAndroidHealthConnectSteps(): Promise<number | null> {
  if (Platform.OS !== 'android') return null;

  try {
    const isInitialized = await initialize();
    if (!isInitialized) {
      console.log('Health Connect initialization returned false.');
      return null;
    }

    // Request READ permissions for Steps
    const granted = await requestPermission([
      { accessType: 'read', recordType: 'Steps' }
    ]);
    
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();

    // Query step records for today
    const records = await readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: end.toISOString()
      }
    });

    if (records && Array.isArray(records)) {
      const totalSteps = records.reduce((sum: number, record: any) => {
        return sum + (record.count || 0);
      }, 0);
      return totalSteps;
    }
    return 0;
  } catch (error) {
    console.log('Health Connect sync bypassed:', error);
    return null;
  }
}

/**
 * Reads historical steps for the past 7 days from Health Connect.
 * Returns a map of day labels to steps.
 */
export async function fetchAndroidWeeklySteps(): Promise<Record<string, number> | null> {
  if (Platform.OS !== 'android') return null;

  try {
    const isInitialized = await initialize();
    if (!isInitialized) return null;

    const history: Record<string, number> = {};
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 7; i++) {
      const start = new Date();
      start.setDate(start.getDate() - i);
      start.setHours(0, 0, 0, 0);

      const end = new Date();
      end.setDate(end.getDate() - i);
      end.setHours(23, 59, 59, 999);

      const records = await readRecords('Steps', {
        timeRangeFilter: {
          operator: 'between',
          startTime: start.toISOString(),
          endTime: end.toISOString()
        }
      });

      const dayLabel = days[start.getDay()];
      const total = records.reduce((sum: number, record: any) => {
        return sum + (record.count || 0);
      }, 0);

      history[dayLabel] = total;
    }

    return history;
  } catch (error) {
    console.log('Health Connect history sync bypassed:', error);
    return null;
  }
}
