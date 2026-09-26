import { Platform } from 'react-native';
import { 
  initialize, 
  getSdkStatus,
  requestPermission, 
  readRecords 
} from 'react-native-health-connect';

let isHealthConnectAvailable: boolean | null = null;

/**
 * Checks if Health Connect SDK and service are available on this Android device/emulator.
 * Avoids repeated error logs when running on devices without Health Connect installed.
 */
async function ensureHealthConnect(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (isHealthConnectAvailable === false) return false;

  try {
    const status = await getSdkStatus();
    // 3 represents SDK_AVAILABLE in Health Connect Client SDK
    if (status !== 3) {
      if (isHealthConnectAvailable === null) {
        console.log(`Health Connect not available on this device (SDK Status code: ${status}). Falling back to manual/local tracking.`);
      }
      isHealthConnectAvailable = false;
      return false;
    }

    const isInitialized = await initialize();
    if (!isInitialized) {
      isHealthConnectAvailable = false;
      return false;
    }

    isHealthConnectAvailable = true;
    return true;
  } catch (error) {
    if (isHealthConnectAvailable === null) {
      console.log('Health Connect service not available. Bypassing hardware sync gracefully.');
    }
    isHealthConnectAvailable = false;
    return false;
  }
}

/**
 * Attempts to initialize Health Connect and read today's steps.
 * Handles failures gracefully if Health Connect is unavailable or permission is denied.
 */
export async function syncAndroidHealthConnectSteps(): Promise<number | null> {
  if (!(await ensureHealthConnect())) return null;

  try {
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
  if (!(await ensureHealthConnect())) return null;

  try {
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

/**
 * Attempts to initialize Health Connect and read today's Heart Rate logs.
 */
export async function syncAndroidHealthConnectHeartRate(): Promise<number | null> {
  if (!(await ensureHealthConnect())) return null;

  try {
    // Request permissions for Heart Rate
    await requestPermission([
      { accessType: 'read', recordType: 'HeartRate' }
    ]);

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();

    const records = await readRecords('HeartRate', {
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: end.toISOString()
      }
    });

    if (records && Array.isArray(records) && records.length > 0) {
      let totalBpm = 0;
      let count = 0;
      records.forEach((record: any) => {
        if (record.samples && Array.isArray(record.samples)) {
          record.samples.forEach((s: any) => {
            if (s.beatsPerMinute) {
              totalBpm += s.beatsPerMinute;
              count++;
            }
          });
        } else if (record.beatsPerMinute) {
          totalBpm += record.beatsPerMinute;
          count++;
        }
      });
      return count > 0 ? Math.round(totalBpm / count) : null;
    }
    return null;
  } catch (error) {
    console.log('Health Connect HR sync bypassed:', error);
    return null;
  }
}

/**
 * Attempts to initialize Health Connect and read last night's Sleep Session.
 * Returns total sleep hours.
 */
export async function syncAndroidHealthConnectSleep(): Promise<number | null> {
  if (!(await ensureHealthConnect())) return null;

  try {
    await requestPermission([
      { accessType: 'read', recordType: 'SleepSession' }
    ]);

    const start = new Date();
    start.setDate(start.getDate() - 1);
    const end = new Date();

    const records = await readRecords('SleepSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: end.toISOString()
      }
    });

    if (records && Array.isArray(records) && records.length > 0) {
      let totalDurationMs = 0;
      records.forEach((record: any) => {
        const sTime = new Date(record.startTime).getTime();
        const eTime = new Date(record.endTime).getTime();
        if (eTime > sTime) {
          totalDurationMs += (eTime - sTime);
        }
      });
      const hours = totalDurationMs / (1000 * 60 * 60);
      return parseFloat(hours.toFixed(1));
    }
    return null;
  } catch (error) {
    console.log('Health Connect Sleep sync bypassed:', error);
    return null;
  }
}

