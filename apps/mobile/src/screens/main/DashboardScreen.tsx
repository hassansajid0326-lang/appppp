import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  AppState,
  AppStateStatus,
  TouchableOpacity,
  Alert,
  Platform,
  NativeModules,
  Modal,
  ActivityIndicator,
  Animated,
  Easing
} from 'react-native';
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
import {
  syncAndroidHealthConnectSteps,
  syncAndroidHealthConnectHeartRate,
  syncAndroidHealthConnectSleep
} from '../../lib/healthConnect';

import StepRing from './dashboard/StepRing';
import RoutineChecklist from './dashboard/RoutineChecklist';
import EnergySummary from './dashboard/EnergySummary';
import WorkoutCard from './dashboard/WorkoutCard';
import { useAppTheme } from '../../lib/theme';

const BodybuilderBoy = ({ animatedValue, isActive }: { animatedValue: Animated.Value; isActive: boolean }) => {
  const translateY = isActive ? animatedValue : 0;

  return (
    <View style={bbStyles.bbContainer}>
      {/* Head */}
      <View style={bbStyles.bbHead} />

      {/* Torso / Chest */}
      <View style={bbStyles.bbTorso}>
        {/* Left Arm Bicep */}
        <Animated.View style={[bbStyles.bbLeftArm, { transform: [{ translateY }] }]} />
        {/* Right Arm Bicep */}
        <Animated.View style={[bbStyles.bbRightArm, { transform: [{ translateY }] }]} />
      </View>

      {/* Barbell weights */}
      <Animated.View style={[bbStyles.bbBarbell, { transform: [{ translateY }] }]}>
        <View style={bbStyles.bbPlateLeft} />
        <View style={bbStyles.bbBar} />
        <View style={bbStyles.bbPlateRight} />
      </Animated.View>
    </View>
  );
};

const bbStyles = StyleSheet.create({
  bbContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  bbHead: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#cbd5e1',
    marginBottom: 4,
  },
  bbTorso: {
    width: 32,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1.5,
    borderColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    position: 'relative',
  },
  bbLeftArm: {
    width: 10,
    height: 18,
    borderRadius: 5,
    backgroundColor: '#c3f400',
    marginTop: 6,
    marginLeft: -9,
  },
  bbRightArm: {
    width: 10,
    height: 18,
    borderRadius: 5,
    backgroundColor: '#c3f400',
    marginTop: 6,
    marginRight: -9,
  },
  bbBarbell: {
    position: 'absolute',
    top: 36,
    width: 90,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    zIndex: 5,
  },
  bbBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#64748B',
  },
  bbPlateLeft: {
    width: 14,
    height: 24,
    borderRadius: 3,
    backgroundColor: '#ff4a4a',
  },
  bbPlateRight: {
    width: 14,
    height: 24,
    borderRadius: 3,
    backgroundColor: '#ff4a4a',
  },
});

export default function DashboardScreen({ navigation }: any) {
  const { profile, session } = useAuthStore();
  const { colors, isDark, toggleTheme } = useAppTheme();
  const {
    dailySteps,
    devicePickups,
    routineItems,
    routineLogs,
    foodEntries,
    latestWeightKg,
    weightHistory,
    incrementPickups,
    syncQueueToServer,
    fetchLatestFromServer,
    toggleRoutineLog,
    addFoodEntry
  } = useOfflineStore();

  const userId = session?.user?.id;
  const { isSimulated, simulateSteps } = usePedometer(userId);

  const [isOnline, setIsOnline] = useState(true);
  const [todayWater, setTodayWater] = useState(0);
  const [waterGoal, setWaterGoal] = useState(2500); // Default 2.5L

  // Vitals State
  const [readinessScore, setReadinessScore] = useState(85);
  const [restingHr, setRestingHr] = useState(68);
  const [sleepHours, setSleepHours] = useState(8);
  const [sleepQuality, setSleepQuality] = useState('good');
  const [customWorkoutBurn, setCustomWorkoutBurn] = useState(0);
  const [completedSessions, setCompletedSessions] = useState<any[]>([]);

  // Heartbeat animation
  const heartBeatAnim = useRef(new Animated.Value(1)).current;

  // Workout Timer Modal State
  const [timerModalVisible, setTimerModalVisible] = useState(false);
  const [activeWorkoutType, setActiveWorkoutType] = useState('Running');
  const [workoutSeconds, setWorkoutSeconds] = useState(0);
  const [workoutActive, setWorkoutActive] = useState(false);
  const [timerIntervalId, setTimerIntervalId] = useState<any>(null);

  // Loop animations for workout shortcuts
  const runAnim = useRef(new Animated.Value(0)).current;
  const gymAnim = useRef(new Animated.Value(0)).current;
  const yogaAnim = useRef(new Animated.Value(1)).current;
  const cycleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Running (Bounce back and forth)
    Animated.loop(
      Animated.sequence([
        Animated.timing(runAnim, { toValue: 4, duration: 500, useNativeDriver: true }),
        Animated.timing(runAnim, { toValue: -4, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    // 2. Gym (Weight lifting translation)
    Animated.loop(
      Animated.sequence([
        Animated.timing(gymAnim, { toValue: -3, duration: 700, useNativeDriver: true }),
        Animated.timing(gymAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    ).start();

    // 3. Yoga (Breathing scale)
    Animated.loop(
      Animated.sequence([
        Animated.timing(yogaAnim, { toValue: 1.12, duration: 1200, useNativeDriver: true }),
        Animated.timing(yogaAnim, { toValue: 1.0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    // 4. Cycling (Rotation)
    Animated.loop(
      Animated.timing(cycleAnim, {
        toValue: 1,
        duration: 2500,
        easing: Easing.linear,
        useNativeDriver: true
      })
    ).start();
  }, []);

  // Load Vitals, Sleep and Workout Logs from AsyncStorage
  const loadVitalsAndWorkouts = async () => {
    try {
      // Sync real biometrics from Google Health Connect if running on Android
      if (Platform.OS === 'android') {
        try {
          const hcSteps = await syncAndroidHealthConnectSteps();
          if (hcSteps !== null) {
            useOfflineStore.getState().setDailySteps(hcSteps);
          }
          const hcBpm = await syncAndroidHealthConnectHeartRate();
          if (hcBpm !== null) {
            const hrData = await AsyncStorage.getItem('fitpulse_hr_logs');
            const parsed = hrData ? JSON.parse(hrData) : [];
            const loggedToday = parsed.some((x: any) => x.bpm === hcBpm && new Date(x.loggedAt).toDateString() === new Date().toDateString());
            if (!loggedToday) {
              const newLog = {
                id: Math.random().toString(),
                bpm: hcBpm,
                type: 'resting',
                loggedAt: new Date().toISOString()
              };
              await AsyncStorage.setItem('fitpulse_hr_logs', JSON.stringify([newLog, ...parsed]));
            }
          }
          const hcSleep = await syncAndroidHealthConnectSleep();
          if (hcSleep !== null) {
            const sleepData = await AsyncStorage.getItem('fitpulse_sleep_logs');
            const parsed = sleepData ? JSON.parse(sleepData) : [];
            const loggedToday = parsed.some((x: any) => x.hours === hcSleep && new Date(x.loggedAt).toDateString() === new Date().toDateString());
            if (!loggedToday) {
              const newLog = {
                id: Math.random().toString(),
                hours: hcSleep,
                quality: hcSleep >= 7.5 ? 'good' : 'fair',
                loggedAt: new Date().toISOString()
              };
              await AsyncStorage.setItem('fitpulse_sleep_logs', JSON.stringify([newLog, ...parsed]));
            }
          }
        } catch (syncErr) {
          console.log('Health Connect on-focus sync bypassed:', syncErr);
        }
      }

      // 1. Load Sleep Logs
      const sleepData = await AsyncStorage.getItem('fitpulse_sleep_logs');
      let sleepLogs = [];
      if (sleepData) {
        sleepLogs = JSON.parse(sleepData);
      }

      // 2. Load Heart Rate Logs
      const hrData = await AsyncStorage.getItem('fitpulse_hr_logs');
      let hrLogs = [];
      if (hrData) {
        hrLogs = JSON.parse(hrData);
        const restingOnly = hrLogs.filter((item: any) => item.type === 'resting');
        if (restingOnly.length > 0) {
          setRestingHr(restingOnly[0].bpm);
        }
      }

      // 3. Load Active Workouts Today
      const workoutData = await AsyncStorage.getItem('fitpulse_custom_workouts');
      if (workoutData) {
        const parsed = JSON.parse(workoutData);
        const todayStr = new Date().toDateString();
        const todaySessions = parsed.filter((w: any) => new Date(w.loggedAt).toDateString() === todayStr);
        setCompletedSessions(todaySessions);
        const burnSum = todaySessions.reduce((sum: number, item: any) => sum + item.caloriesBurned, 0);
        setCustomWorkoutBurn(burnSum);
      } else {
        setCompletedSessions([]);
        setCustomWorkoutBurn(0);
      }

      // 4. Calculate Readiness Score (Sleep points + step load modifier)
      let durationPoints = 40;
      let qualityPoints = 40;
      if (sleepLogs.length > 0) {
        const latestSleep = sleepLogs[0];
        setSleepHours(latestSleep.hours);
        setSleepQuality(latestSleep.quality);

        const diff = Math.abs(latestSleep.hours - 8);
        durationPoints = Math.max(0, 50 - diff * 12); // up to 50 pts

        const qualityMap = { poor: 10, fair: 25, good: 40, excellent: 50 };
        qualityPoints = qualityMap[latestSleep.quality as keyof typeof qualityMap] || 40;
      } else {
        setSleepHours(8);
        setSleepQuality('good');
      }

      // High steps yesterday causes strain penalty
      const stepsStrain = Math.max(0, (dailySteps - 10000) / 1000) * 1.5;
      const totalReadiness = Math.min(100, Math.max(15, Math.round(durationPoints + qualityPoints - stepsStrain)));
      setReadinessScore(totalReadiness);

    } catch (e) {
      console.error('Error loading vitals logs:', e);
    }
  };

  // Load water logged today to display on Dashboard card
  const loadTodayWater = async () => {
    try {
      const storedGoal = await AsyncStorage.getItem('fitpulse_water_goal');
      if (storedGoal) {
        setWaterGoal(parseInt(storedGoal));
      } else {
        setWaterGoal(2500);
      }

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

  // Pulse animation for HR card
  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(heartBeatAnim, {
          toValue: 1.25,
          duration: 350,
          useNativeDriver: true
        }),
        Animated.timing(heartBeatAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true
        })
      ]).start(() => {
        pulse();
      });
    };
    pulse();
  }, []);

  // Reload everything on screen focus
  useFocusEffect(
    React.useCallback(() => {
      loadTodayWater();
      loadVitalsAndWorkouts();
    }, [dailySteps])
  );

  useEffect(() => {
    // Initialize notifications
    const setupNotifications = async () => {
      const isGranted = await requestNotificationPermissions();
      if (isGranted) {
        await scheduleHourlyReminder();
      }
    };
    setupNotifications();

    registerBackgroundSync();

    const logPickupEvent = async () => {
      try {
        const nowStr = new Date().toISOString();
        const stored = await AsyncStorage.getItem('fitpulse_pickups_log');
        const logs = stored ? JSON.parse(stored) : [];

        const todayStr = new Date().toDateString();
        const todayLogs = logs.filter((logTime: string) => new Date(logTime).toDateString() === todayStr);

        todayLogs.push(nowStr);
        await AsyncStorage.setItem('fitpulse_pickups_log', JSON.stringify(todayLogs));
      } catch (err) {
        console.error('Failed to log pickup event:', err);
      }
    };

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

    incrementPickups();
    logPickupEvent();

    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected;
      setIsOnline(online);
      if (online && userId) {
        syncQueueToServer();
        fetchLatestFromServer(userId);
      }
    });

    if (userId) {
      syncQueueToServer();
      fetchLatestFromServer(userId);
    }

    return () => {
      subscription.remove();
      unsubscribeNetInfo();
    };
  }, [userId]);

  // Synchronize step goal to background service
  useEffect(() => {
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
      const volume = 250;
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

      // Auto check water habit
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

  // Log food preset shortcut
  const handleLogFoodPreset = async (name: string, cal: number, protein: number, carbs: number, fat: number) => {
    if (!userId) return;
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      await addFoodEntry(userId, dateStr, name, cal, protein, carbs, fat);
      Alert.alert('Preset Logged', `Logged: "${name}" (${cal} kcal)`);
    } catch (e) {
      Alert.alert('Error', 'Failed to log food preset.');
    }
  };

  // Workout Timer Helpers
  const startWorkoutTimer = (type: string) => {
    setActiveWorkoutType(type);
    setWorkoutSeconds(0);
    setWorkoutActive(false); // Paused by default!
    setTimerModalVisible(true);
  };

  const handleStartOrResumeWorkout = () => {
    if (timerIntervalId) clearInterval(timerIntervalId);
    setWorkoutActive(true);
    const interval = setInterval(() => {
      setWorkoutSeconds((prev) => prev + 1);
    }, 1000);
    setTimerIntervalId(interval);
  };

  const handlePauseWorkout = () => {
    if (timerIntervalId) {
      clearInterval(timerIntervalId);
    }
    setWorkoutActive(false);
  };

  const handleStopWorkout = async () => {
    if (timerIntervalId) {
      clearInterval(timerIntervalId);
    }
    setWorkoutActive(false);

    // Calculate burn based on type
    const durationMin = workoutSeconds / 60;
    let kcalPerMin = 7; // Gym default
    if (activeWorkoutType === 'Running') kcalPerMin = 11;
    else if (activeWorkoutType === 'Yoga') kcalPerMin = 4;
    else if (activeWorkoutType === 'Cycling') kcalPerMin = 8.5;

    const caloriesBurned = Math.round(durationMin * kcalPerMin);

    Alert.alert(
      'Workout Finished',
      `You completed a ${Math.round(durationMin)} min ${activeWorkoutType} session! Burned: ${caloriesBurned} kcal.`,
      [
        {
          text: 'Cancel Log',
          style: 'cancel',
          onPress: () => {
            setTimerModalVisible(false);
          }
        },
        {
          text: 'Save Session',
          onPress: async () => {
            try {
              const newSession = {
                id: Math.random().toString(),
                type: activeWorkoutType,
                durationMin: Math.round(durationMin),
                caloriesBurned,
                loggedAt: new Date().toISOString()
              };

              const stored = await AsyncStorage.getItem('fitpulse_custom_workouts');
              const parsed = stored ? JSON.parse(stored) : [];
              const updated = [newSession, ...parsed];

              await AsyncStorage.setItem('fitpulse_custom_workouts', JSON.stringify(updated));
              setTimerModalVisible(false);
              loadVitalsAndWorkouts();
            } catch (e) {
              console.error(e);
            }
          }
        }
      ]
    );
  };

  // Render Workout Stopwatch Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Get dynamic AI Advice based on logs
  const getAIAdvice = () => {
    if (readinessScore < 50) {
      return "Your sleep score is low and step load is rising. Prioritize hydration and take a light recovery session today.";
    }
    if (dailySteps > 12000) {
      return "Excellent cardiovascular strain! High steps logged. Make sure to log a high-protein meal to rebuild muscle.";
    }
    return "Body recovery battery is at prime state. Today is optimal for a heavy workout session or cardio stretch.";
  };

  return (
    <LinearGradient colors={colors.backgroundGradient} style={styles.container}>
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
          {/* Header Row with Theme Switcher */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.welcomeText, { color: colors.text }]}>Hello, {profile?.name || 'Athlete'}</Text>
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.themeQuickToggle, { 
                backgroundColor: isDark ? 'rgba(195, 244, 0, 0.12)' : 'rgba(85, 109, 0, 0.12)', 
                borderColor: isDark ? 'rgba(195, 244, 0, 0.3)' : 'rgba(85, 109, 0, 0.3)' 
              }]}
              onPress={toggleTheme}
              activeOpacity={0.8}
            >
              <Ionicons 
                name={isDark ? "sunny" : "moon"} 
                size={18} 
                color={isDark ? "#c3f400" : "#556d00"} 
              />
            </TouchableOpacity>
          </View>

          {/* AI Coach Suggestion Card */}
          <View style={[styles.aiCoachCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.aiCoachHeader}>
              <Ionicons name="sparkles" size={16} color={isDark ? "#c3f400" : "#556d00"} />
              <Text style={[styles.aiCoachTitle, { color: isDark ? "#c3f400" : "#556d00" }]}>AI COACH ADVOCATE</Text>
            </View>
            <Text style={[styles.aiCoachText, { color: colors.text }]}>"{getAIAdvice()}"</Text>
          </View>

          {/* Garmin Vitals Grid: Readiness Score + resting Heart Rate */}
          <View style={styles.vitalsRow}>
            <TouchableOpacity
              style={[styles.vitalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => navigation.navigate('SleepTracker')}
              activeOpacity={0.8}
            >
              <View style={styles.vitalHeaderRow}>
                <Ionicons name="flash-outline" size={16} color={isDark ? "#c3f400" : "#556d00"} />
                <Text style={[styles.vitalTitle, { color: colors.textMuted }]}>READINESS</Text>
              </View>
              <View style={styles.readinessCircleRow}>
                <View style={[styles.miniCircleGauge, { backgroundColor: colors.cardSubtle, borderColor: readinessScore > 75 ? (isDark ? '#c3f400' : '#65a30d') : '#eab308' }]}>
                  <Text style={[styles.readinessValue, { color: colors.text }]}>{readinessScore}%</Text>
                </View>
                <View style={styles.readinessDetails}>
                  <Text style={[styles.readinessLabel, { color: colors.text }]}>Body Battery</Text>
                  <Text style={[styles.readinessSub, { color: colors.textSecondary }]}>Sleep: {sleepHours} hrs ({sleepQuality})</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.vitalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => navigation.navigate('HeartRate')}
              activeOpacity={0.8}
            >
              <View style={styles.vitalHeaderRow}>
                <Ionicons name="pulse" size={16} color="#ff4a4a" />
                <Text style={[styles.vitalTitle, { color: colors.textMuted }]}>HEART RATE</Text>
              </View>
              <View style={styles.hrRow}>
                <Animated.View style={{ transform: [{ scale: heartBeatAnim }] }}>
                  <Ionicons name="heart" size={32} color="#ff4a4a" />
                </Animated.View>
                <View style={styles.hrDetails}>
                  <Text style={[styles.hrValue, { color: colors.text }]}>{restingHr} BPM</Text>
                  <Text style={[styles.hrLabel, { color: colors.textSecondary }]}>Resting Pulse</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Steps Progress Counter */}
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

          {/* Quick Start Workout Session Row */}
          <View style={[styles.quickWorkoutCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.widgetTitle, { color: colors.text }]}>Quick Start Active Timer</Text>
            <View style={styles.quickStartRow}>
              {/* Running */}
              <TouchableOpacity style={styles.quickStartBtn} onPress={() => startWorkoutTimer('Running')}>
                <View style={[styles.quickStartIconCircle, { backgroundColor: isDark ? '#c3f40015' : 'rgba(101, 163, 13, 0.12)' }]}>
                  <Animated.View style={{ transform: [{ translateX: runAnim }] }}>
                    <Ionicons name="walk-outline" size={22} color={isDark ? "#c3f400" : "#556d00"} />
                  </Animated.View>
                </View>
                <Text style={[styles.quickStartLbl, { color: colors.textSecondary }]}>Running</Text>
              </TouchableOpacity>

              {/* Gym */}
              <TouchableOpacity style={styles.quickStartBtn} onPress={() => startWorkoutTimer('Gym')}>
                <View style={[styles.quickStartIconCircle, { backgroundColor: '#ff4a4a15' }]}>
                  <Animated.View style={{ transform: [{ translateY: gymAnim }] }}>
                    <Ionicons name="barbell-outline" size={22} color="#ff4a4a" />
                  </Animated.View>
                </View>
                <Text style={[styles.quickStartLbl, { color: colors.textSecondary }]}>Gym</Text>
              </TouchableOpacity>

              {/* Yoga */}
              <TouchableOpacity style={styles.quickStartBtn} onPress={() => startWorkoutTimer('Yoga')}>
                <View style={[styles.quickStartIconCircle, { backgroundColor: '#38bdf815' }]}>
                  <Animated.View style={{ transform: [{ scale: yogaAnim }] }}>
                    <Ionicons name="body-outline" size={22} color="#38bdf8" />
                  </Animated.View>
                </View>
                <Text style={[styles.quickStartLbl, { color: colors.textSecondary }]}>Yoga</Text>
              </TouchableOpacity>

              {/* Cycling */}
              <TouchableOpacity style={styles.quickStartBtn} onPress={() => startWorkoutTimer('Cycling')}>
                <View style={[styles.quickStartIconCircle, { backgroundColor: '#eab30815' }]}>
                  <Animated.View style={{
                    transform: [{
                      rotate: cycleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg']
                      })
                    }]
                  }}>
                    <Ionicons name="bicycle-outline" size={22} color="#eab308" />
                  </Animated.View>
                </View>
                <Text style={[styles.quickStartLbl, { color: colors.textSecondary }]}>Cycling</Text>
              </TouchableOpacity>
            </View>

            {/* List custom completed workouts today */}
            {completedSessions.length > 0 && (
              <View style={[styles.recentWorkoutsContainer, { borderTopColor: colors.borderSubtle }]}>
                <Text style={[styles.recentWorkoutsTitle, { color: colors.textMuted }]}>Completed Today:</Text>
                {completedSessions.map((w, idx) => (
                  <View key={idx} style={styles.completedWorkoutRow}>
                    <Ionicons name="checkmark-circle" size={14} color={isDark ? "#c3f400" : "#556d00"} />
                    <Text style={[styles.completedWorkoutText, { color: colors.text }]}>
                      {w.type} session ({w.durationMin}m) — burned {w.caloriesBurned} kcal
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Today's Planned Training Session */}
          <WorkoutCard
            hasScheduledToday={true}
            workoutName="Upper Body Power"
            onPressStart={handleStartWorkout}
          />

          {/* Hydration & Digital Wellbeing Quick-Log Grid */}
          <View style={styles.gridRow}>
            <TouchableOpacity
              style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
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
              <Text style={[styles.gridTitle, { color: colors.textMuted }]}>Hydration</Text>
              <Text style={[styles.gridValue, { color: colors.text }]}>{(todayWater / 1000).toFixed(2)} L</Text>
              <Text style={[styles.gridSubtext, { color: colors.textSecondary }]}>Goal: {(waterGoal / 1000).toFixed(1)} L</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => navigation.navigate('DigitalWellbeing')}
              activeOpacity={0.8}
            >
              <View style={styles.gridIconCircleGreen}>
                <Ionicons name="phone-portrait" size={20} color={isDark ? "#c3f400" : "#556d00"} />
              </View>
              <Text style={[styles.gridTitle, { color: colors.textMuted }]}>Wellbeing</Text>
              <Text style={[styles.gridValue, { color: colors.text }]}>Digital Detox</Text>
              <Text style={[styles.gridSubtext, { color: colors.textSecondary }]}>{devicePickups} Pickups Today</Text>
            </TouchableOpacity>
          </View>

          {/* Weight Card with Weekly progress bars */}
          <TouchableOpacity
            style={[styles.weightProgressCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => navigation.navigate('WeightTracker')}
            activeOpacity={0.8}
          >
            <View style={styles.weightHeader}>
              <View>
                <Text style={[styles.weightMetricTitle, { color: colors.textMuted }]}>Weight Tracker</Text>
                <Text style={[styles.weightMetricValue, { color: colors.text }]}>{latestWeightKg || '--'} kg</Text>
              </View>
              <Ionicons name="scale-outline" size={24} color="#eab308" />
            </View>

            {/* Sparkline Weight chart bars */}
            <View style={styles.sparklineChartContainer}>
              {weightHistory.length === 0 ? (
                <Text style={[styles.noWeightChartText, { color: colors.textMuted }]}>Log weight in Profile to see trend bar line</Text>
              ) : (
                <View style={styles.barsContainer}>
                  {weightHistory.slice(0, 7).reverse().map((entry, index) => (
                    <View key={entry.id} style={styles.barItemCol}>
                      <View style={[styles.barChartFill, { height: Math.min(60, entry.weight_kg - 40) }]} />
                      <Text style={[styles.barLbl, { color: colors.textMuted }]}>
                        {new Date(entry.logged_at).getDate()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Quick Presets Food Logger Shortcuts */}
          <TouchableOpacity
            style={[styles.presetsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => navigation.navigate('MealShortcuts')}
            activeOpacity={0.8}
          >
            <Text style={[styles.widgetTitle, { color: colors.text }]}>Quick Meal Shortcuts</Text>
            <View style={styles.presetsRow}>
              <TouchableOpacity
                style={[styles.presetBtn, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}
                onPress={() => handleLogFoodPreset('Protein Shake', 200, 30, 5, 2)}
              >
                <Ionicons name="nutrition-outline" size={16} color="#38bdf8" />
                <Text style={[styles.presetBtnLbl, { color: colors.text }]}>+30g Protein</Text>
                <Text style={[styles.presetKcal, { color: colors.textMuted }]}>200 kcal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetBtn, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}
                onPress={() => handleLogFoodPreset('Fruits Bowl', 120, 1, 28, 0.5)}
              >
                <Ionicons name="leaf-outline" size={16} color={isDark ? "#c3f400" : "#556d00"} />
                <Text style={[styles.presetBtnLbl, { color: colors.text }]}>+Carbs pres</Text>
                <Text style={[styles.presetKcal, { color: colors.textMuted }]}>120 kcal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetBtn, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}
                onPress={() => handleLogFoodPreset('Healthy Lunch', 520, 38, 48, 14)}
              >
                <Ionicons name="restaurant-outline" size={16} color="#ff4a4a" />
                <Text style={[styles.presetBtnLbl, { color: colors.text }]}>+Full Meal</Text>
                <Text style={[styles.presetKcal, { color: colors.textMuted }]}>520 kcal</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          {/* Daily Habits Checklist */}
          {userId && (
            <RoutineChecklist
              userId={userId}
              items={routineItems}
              logs={routineLogs}
            />
          )}

          {/* Calories Energy Balance Summary */}
          <TouchableOpacity
            onPress={() => navigation.navigate('EnergyBalance')}
            activeOpacity={0.95}
          >
            <EnergySummary
              profile={profile}
              steps={dailySteps}
              weightKg={latestWeightKg}
              caloriesGained={foodEntries.reduce((sum, item) => sum + item.calories, 0)}
              workoutCalories={customWorkoutBurn}
            />
          </TouchableOpacity>

        </ScrollView>

        {/* Live Active Workout Stopwatch Modal */}
        <Modal
          visible={timerModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => { }}
        >
          <View style={styles.modalBg}>
            <View style={[styles.modalContent, { backgroundColor: isDark ? '#0d1c2d' : '#ffffff', borderColor: colors.cardBorder }]}>
              {/* Animated Icons inside active modal */}
              {activeWorkoutType === 'Gym' ? (
                <BodybuilderBoy animatedValue={gymAnim} isActive={workoutActive} />
              ) : activeWorkoutType === 'Running' ? (
                <Animated.View style={{ transform: [{ translateX: workoutActive ? runAnim : 0 }] }}>
                  <Ionicons name="walk-outline" size={48} color={isDark ? "#c3f400" : "#556d00"} />
                </Animated.View>
              ) : activeWorkoutType === 'Yoga' ? (
                <Animated.View style={{ transform: [{ scale: workoutActive ? yogaAnim : 1 }] }}>
                  <Ionicons name="body-outline" size={48} color="#38bdf8" />
                </Animated.View>
              ) : (
                <Animated.View style={{
                  transform: [{
                    rotate: workoutActive
                      ? cycleAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
                      : '0deg'
                  }]
                }}>
                  <Ionicons name="bicycle-outline" size={48} color="#eab308" />
                </Animated.View>
              )}
              <Text style={[styles.modalWorkoutType, { color: colors.textMuted }]}>{activeWorkoutType.toUpperCase()} SESSION</Text>

              <Text style={[styles.modalTimer, { color: colors.text }]}>{formatTime(workoutSeconds)}</Text>

              <View style={[styles.modalStatsRow, { backgroundColor: colors.cardSubtle }]}>
                <View style={styles.modalStatCol}>
                  <Text style={[styles.modalStatLbl, { color: colors.textMuted }]}>Duration</Text>
                  <Text style={[styles.modalStatVal, { color: colors.text }]}>{Math.round(workoutSeconds / 60)} min</Text>
                </View>
                <View style={styles.modalStatCol}>
                  <Text style={[styles.modalStatLbl, { color: colors.textMuted }]}>Estimated Burn</Text>
                  <Text style={[styles.modalStatVal, { color: colors.text }]}>
                    {Math.round(
                      (workoutSeconds / 60) *
                      (activeWorkoutType === 'Running' ? 11 : activeWorkoutType === 'Yoga' ? 4 : activeWorkoutType === 'Cycling' ? 8.5 : 7)
                    )} kcal
                  </Text>
                </View>
              </View>

              {/* Start / Pause / Save Action Triggers */}
              {!workoutActive ? (
                <TouchableOpacity
                  style={styles.btnStartWorkout}
                  onPress={handleStartOrResumeWorkout}
                >
                  <Ionicons name="play" size={16} color="#051424" style={{ marginRight: 6 }} />
                  <Text style={styles.btnStartWorkoutText}>START WORKOUT</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.modalControlsRow}>
                  <TouchableOpacity
                    style={[styles.btnPauseWorkout, { backgroundColor: isDark ? '#334155' : '#e2e8f0', borderColor: colors.border }]}
                    onPress={handlePauseWorkout}
                  >
                    <Ionicons name="pause" size={16} color={colors.text} style={{ marginRight: 6 }} />
                    <Text style={[styles.btnPauseWorkoutText, { color: colors.text }]}>PAUSE</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnStopWorkout}
                    onPress={handleStopWorkout}
                  >
                    <Ionicons name="stop" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.btnStopWorkoutText}>FINISH & SAVE</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Discard Session */}
              <TouchableOpacity
                style={styles.btnCancelWorkout}
                onPress={() => {
                  if (timerIntervalId) clearInterval(timerIntervalId);
                  setWorkoutActive(false);
                  setTimerModalVisible(false);
                }}
              >
                <Text style={[styles.btnCancelWorkoutText, { color: colors.textMuted }]}>DISCARD SESSION</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  deviceStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(5, 20, 36, 0.6)',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  deviceStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deviceStatusText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748B',
  },
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
    marginBottom: 16,
  },
  themeQuickToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  aiCoachCard: {
    backgroundColor: 'rgba(195, 244, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(195, 244, 0, 0.2)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  aiCoachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  aiCoachTitle: {
    fontFamily: 'Oswald',
    fontSize: 11,
    fontWeight: '700',
    color: '#c3f400',
    letterSpacing: 1,
  },
  aiCoachText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  vitalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  vitalCard: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
  },
  vitalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  vitalTitle: {
    fontFamily: 'Oswald',
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  readinessCircleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniCircleGauge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 20, 36, 0.2)',
  },
  readinessValue: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  readinessDetails: {
    flex: 1,
  },
  readinessLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  readinessSub: {
    fontFamily: 'Inter',
    fontSize: 8,
    color: '#64748B',
    marginTop: 1,
  },
  hrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hrDetails: {
    flex: 1,
  },
  hrValue: {
    fontFamily: 'Oswald',
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  hrLabel: {
    fontFamily: 'Inter',
    fontSize: 9,
    color: '#64748B',
  },
  quickWorkoutCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    marginBottom: 16,
  },
  widgetTitle: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  quickStartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  quickStartBtn: {
    flex: 1,
    alignItems: 'center',
  },
  quickStartIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickStartLbl: {
    fontFamily: 'Inter',
    fontSize: 9,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  recentWorkoutsContainer: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 10,
  },
  recentWorkoutsTitle: {
    fontFamily: 'JetBrains Mono',
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 6,
  },
  completedWorkoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  completedWorkoutText: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#cbd5e1',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
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
  weightProgressCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    marginBottom: 16,
  },
  weightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  weightMetricTitle: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#64748B',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  weightMetricValue: {
    fontFamily: 'Oswald',
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 4,
  },
  sparklineChartContainer: {
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noWeightChartText: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#475569',
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    height: '100%',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
  },
  barItemCol: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  barChartFill: {
    width: 12,
    backgroundColor: '#eab308',
    borderRadius: 4,
    opacity: 0.8,
  },
  barLbl: {
    fontFamily: 'JetBrains Mono',
    fontSize: 8,
    color: '#64748B',
  },
  presetsCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    marginBottom: 16,
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: 'rgba(5, 20, 36, 0.3)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  presetBtnLbl: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
    marginTop: 4,
  },
  presetKcal: {
    fontFamily: 'JetBrains Mono',
    fontSize: 8,
    color: '#64748B',
    marginTop: 2,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(5, 20, 36, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#0d1c2d',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 24,
    alignItems: 'center',
  },
  modalWorkoutType: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1,
    marginTop: 10,
  },
  modalTimer: {
    fontFamily: 'Oswald',
    fontSize: 64,
    fontWeight: '700',
    color: '#ffffff',
    marginVertical: 20,
  },
  modalStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: 'rgba(5, 20, 36, 0.4)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  modalStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  modalStatLbl: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#64748B',
  },
  modalStatVal: {
    fontFamily: 'Oswald',
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 4,
  },
  btnStopWorkout: {
    flex: 1.2,
    flexDirection: 'row',
    backgroundColor: '#ff4a4a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnStopWorkoutText: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  btnStartWorkout: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#c3f400',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnStartWorkoutText: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '700',
    color: '#051424',
    letterSpacing: 0.5,
  },
  modalControlsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  btnPauseWorkout: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#334155',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  btnPauseWorkoutText: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  btnCancelWorkout: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  btnCancelWorkoutText: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
});
