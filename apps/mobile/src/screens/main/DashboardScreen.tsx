import React from 'react';
import { View, Text, StyleSheet, ScrollView, AppState, AppStateStatus, TouchableOpacity, Alert, Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../lib/store';
import { useOfflineStore } from '../../lib/offlineStore';
import { registerBackgroundSync } from '../../lib/backgroundSync';
import { usePedometer } from '../../lib/usePedometer';
import { requestNotificationPermissions, scheduleHourlyReminder } from '../../lib/notifications';

// Import modular dashboard widgets
import StepRing from './dashboard/StepRing';
import RoutineChecklist from './dashboard/RoutineChecklist';
import EnergySummary from './dashboard/EnergySummary';
import WorkoutCard from './dashboard/WorkoutCard';

export default function DashboardScreen({ navigation }: any) {
  const { profile, session } = useAuthStore();
  const { 
    dailySteps, 
    devicePickups, 
    routineItems, 
    routineLogs, 
    foodEntries,
    latestWeightKg,
    incrementPickups, 
    syncQueueToServer, 
    fetchLatestFromServer,
    toggleRoutineLog
  } = useOfflineStore();

  const [isOnline, setIsOnline] = React.useState(true);
  const [todayWater, setTodayWater] = React.useState(0);
  const [waterGoal, setWaterGoal] = React.useState(2500); // Default 2.5L

  const userId = session?.user?.id;
  const { isSimulated, simulateSteps } = usePedometer(userId);

  // Load water logged today to display on Dashboard card
  const loadTodayWater = async () => {
    try {
      // 1. Load Goal
      const storedGoal = await AsyncStorage.getItem('fitpulse_water_goal');
      if (storedGoal) {
        setWaterGoal(parseInt(storedGoal));
      } else {
        setWaterGoal(2500);
      }

      // 2. Load Logs
      const data = await AsyncStorage.getItem('fitpulse_water_logs');
      if (data) {
        const parsed = JSON.parse(data);
        const todayStr = new Date().toDateString();
        const todayLogs = parsed.filter((item: any) => new Date(item.timestamp).toDateString() === todayStr);
        const sum = todayLogs.reduce((acc: number, log: any) => acc + log.volume, 0);
        setTodayWater(sum);
      } else {
        setTodayWater(0);
      }
    } catch (err) {
      console.error('Failed to load today\'s water:', err);
    }
  };

  // Reload water whenever Dashboard screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadTodayWater();
    }, [])
  );

  React.useEffect(() => {
    // Initialize local notifications
    const setupNotifications = async () => {
      const isGranted = await requestNotificationPermissions();
      if (isGranted) {
        await scheduleHourlyReminder();
      }
    };
    setupNotifications();

    // 1. Register background fetch task on app startup
    registerBackgroundSync();

    // Helper to log device pickups with timestamps
    const logPickupEvent = async () => {
      try {
        const nowStr = new Date().toISOString();
        const stored = await AsyncStorage.getItem('fitpulse_pickups_log');
        const logs = stored ? JSON.parse(stored) : [];
        
        // Filter to keep only today's logs
        const todayStr = new Date().toDateString();
        const todayLogs = logs.filter((logTime: string) => new Date(logTime).toDateString() === todayStr);
        
        todayLogs.push(nowStr);
        await AsyncStorage.setItem('fitpulse_pickups_log', JSON.stringify(todayLogs));
      } catch (err) {
        console.error('Failed to log pickup event:', err);
      }
    };

    // 2. Track screen pickups via foreground transitions
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        incrementPickups();
        logPickupEvent();
        if (userId) {
          syncQueueToServer();
          fetchLatestFromServer(userId);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Record initial pickup on component load
    incrementPickups();
    logPickupEvent();

    // 3. Monitor internet connectivity
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected;
      setIsOnline(online);
      if (online && userId) {
        syncQueueToServer();
        fetchLatestFromServer(userId);
      }
    });

    // 4. Initial fetch from database
    if (userId) {
      syncQueueToServer();
      fetchLatestFromServer(userId);
    }

    return () => {
      subscription.remove();
      unsubscribeNetInfo();
    };
  }, [userId]);

  // Synchronize step goal to background service when profile loads/updates
  React.useEffect(() => {
    if (profile?.daily_step_goal && Platform.OS === 'android') {
      if (NativeModules.StepTrackerModule && typeof NativeModules.StepTrackerModule.setStepGoal === 'function') {
        NativeModules.StepTrackerModule.setStepGoal(profile.daily_step_goal);
      }
    }
  }, [profile?.daily_step_goal]);

  const handleStartWorkout = () => {
    navigation.navigate('Workouts');
  };

  const handleQuickAddWater = async () => {
    try {
      const volume = 250; // Glass preset size
      const newLog = {
        id: Math.random().toString(),
        volume,
        timestamp: new Date().toISOString(),
      };
      
      const stored = await AsyncStorage.getItem('fitpulse_water_logs');
      const parsed = stored ? JSON.parse(stored) : [];
      
      const todayStr = new Date().toDateString();
      const updated = [
        newLog,
        ...parsed.filter((item: any) => new Date(item.timestamp).toDateString() === todayStr)
      ];
      
      await AsyncStorage.setItem('fitpulse_water_logs', JSON.stringify(updated));
      const newTotal = todayWater + volume;
      setTodayWater(newTotal);

      // Auto check-off water intake routine habit on home screen if goal reached!
      if (newTotal >= waterGoal && userId) {
        const waterItem = routineItems.find(item => 
          item.title.toLowerCase().includes('water') || 
          item.title.toLowerCase().includes('drink') || 
          item.title.toLowerCase().includes('hydration')
        );
        if (waterItem) {
          const dateStr = new Date().toISOString().split('T')[0];
          toggleRoutineLog(userId, waterItem.id, dateStr, true);
        }
      }
    } catch (err) {
      console.error('Failed to quick add water:', err);
    }
  };

  return (
    <LinearGradient colors={['#051424', '#0d1c2d', '#010f1f']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Offline Mode Banner */}
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={14} color="#051424" />
            <Text style={styles.offlineBannerText}>OFFLINE MODE — ACTIONS CACHED</Text>
          </View>
        )}

        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          showsVerticalScrollIndicator={false}
        >
          {/* Header Row */}
          <View style={styles.header}>
            <View>
              <Text style={styles.welcomeText}>Hello, {profile?.name || 'Athlete'}</Text>
              <Text style={styles.dateText}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </View>

          {/* 1. Daily Pedometer Step Ring (Tap to navigate to Steps Details Screen) */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('StepsDetail')}
            activeOpacity={0.95}
          >
            <StepRing 
              steps={dailySteps} 
              goal={profile?.daily_step_goal || 10000} 
              isSimulated={isSimulated}
              onSimulatePress={() => simulateSteps(1000)}
              units={profile?.units || 'metric'}
            />
          </TouchableOpacity>

          {/* 2. Today's Planned Training Session */}
          <WorkoutCard 
            hasScheduledToday={true} 
            workoutName="Upper Body Power" 
            onPressStart={handleStartWorkout}
          />

          {/* 3. Hydration & Digital Wellbeing Quick-Log Grid */}
          <View style={styles.gridRow}>
            <TouchableOpacity 
              style={styles.gridCard} 
              onPress={() => navigation.navigate('WaterTracker')}
              activeOpacity={0.8}
            >
              <View style={styles.gridHeaderRow}>
                <View style={styles.gridIconCircleBlue}>
                  <Ionicons name="water" size={20} color="#38bdf8" />
                </View>
                {/* Quick Add Button */}
                <TouchableOpacity 
                  style={styles.quickAddBtn} 
                  onPress={handleQuickAddWater}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle" size={22} color="#38bdf8" />
                </TouchableOpacity>
              </View>
              <Text style={styles.gridTitle}>Hydration</Text>
              <Text style={styles.gridValue}>{(todayWater / 1000).toFixed(2)} L</Text>
              <Text style={styles.gridSubtext}>Goal: {(waterGoal / 1000).toFixed(1)} L ({todayWater} ml)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.gridCard} 
              onPress={() => navigation.navigate('DigitalWellbeing')}
              activeOpacity={0.8}
            >
              <View style={styles.gridIconCircleGreen}>
                <Ionicons name="phone-portrait" size={20} color="#c3f400" />
              </View>
              <Text style={styles.gridTitle}>Wellbeing</Text>
              <Text style={styles.gridValue}>Digital Detox</Text>
              <Text style={styles.gridSubtext}>{devicePickups} Pickups Today</Text>
            </TouchableOpacity>
          </View>

          {/* 4. Daily Habits Checklist */}
          {userId && (
            <RoutineChecklist 
              userId={userId} 
              items={routineItems} 
              logs={routineLogs} 
            />
          )}

          {/* 5. Calories Energy Balance Summary */}
          <EnergySummary 
            profile={profile} 
            steps={dailySteps} 
            weightKg={latestWeightKg}
            caloriesGained={foodEntries.reduce((sum, item) => sum + item.calories, 0)}
          />

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#c3f400',
    paddingVertical: 6,
    width: '100%',
  },
  offlineBannerText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#051424',
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeText: {
    fontFamily: 'Oswald',
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  dateText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  gridCard: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    alignItems: 'flex-start',
  },
  gridHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  gridIconCircleBlue: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  gridIconCircleGreen: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(195, 244, 0, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickAddBtn: {
    padding: 4,
    marginTop: -8,
  },
  gridTitle: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#64748B',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridValue: {
    fontFamily: 'Oswald',
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 4,
  },
  gridSubtext: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
});
