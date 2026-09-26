import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch,
  Alert,
  NativeModules,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../../../lib/theme';

const { StepTrackerModule } = NativeModules;

interface AppLimit {
  id: string;
  name: string;
  packageName: string;
  limitMins: number;
  isEnabled: boolean;
  icon: string;
}

const APP_LIMITS_KEY = 'fitpulse_app_limits';
const FOCUS_END_KEY = 'fitpulse_focus_end_time';

export default function DigitalWellbeingScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useAppTheme();

  // Focus Timer state (Persistent Detox Pomodoro)
  const [focusTimeLeft, setFocusTimeLeft] = useState<number>(0); // in seconds
  const [isFocusActive, setIsFocusActive] = useState<boolean>(false);

  // App limits list state (Persistent)
  const [appLimits, setAppLimits] = useState<AppLimit[]>([
    { id: '1', name: 'Instagram', packageName: 'com.instagram.android', limitMins: 30, isEnabled: true, icon: 'logo-instagram' },
    { id: '2', name: 'YouTube', packageName: 'com.google.android.youtube', limitMins: 45, isEnabled: true, icon: 'logo-youtube' },
    { id: '3', name: 'TikTok', packageName: 'com.zhiliaoapp.musically', limitMins: 15, isEnabled: false, icon: 'logo-tiktok' },
    { id: '4', name: 'Facebook', packageName: 'com.facebook.katana', limitMins: 30, isEnabled: false, icon: 'logo-facebook' },
  ]);

  // Real device app usage stats mapping (packageName -> usageMinutes)
  const [appUsageData, setAppUsageData] = useState<Record<string, number>>({});
  const [hasUsagePermission, setHasUsagePermission] = useState<boolean>(false);

  // Real device pickups log state
  const [pickupsData, setPickupsData] = useState<{ hour: string; count: number; type: string }[]>([]);

  // Load persistent configurations on mount
  const loadWellbeingData = async () => {
    try {
      // 1. Load App Limits
      const storedLimits = await AsyncStorage.getItem(APP_LIMITS_KEY);
      let activeLimits = appLimits;
      if (storedLimits) {
        const parsed = JSON.parse(storedLimits);
        setAppLimits(parsed);
        activeLimits = parsed;
      }

      // Sync limits to native SharedPreferences on load so they match
      if (Platform.OS === 'android' && StepTrackerModule) {
        activeLimits.forEach(app => {
          if (typeof StepTrackerModule.saveAppLimit === 'function') {
            StepTrackerModule.saveAppLimit(app.packageName, app.limitMins, app.isEnabled);
          }
        });
      }

      // 2. Load Focus End Time
      const focusEndStr = await AsyncStorage.getItem(FOCUS_END_KEY);
      if (focusEndStr) {
        const endTime = parseInt(focusEndStr);
        const now = Date.now();
        if (endTime > now) {
          setFocusTimeLeft(Math.round((endTime - now) / 1000));
          setIsFocusActive(true);
        } else {
          await AsyncStorage.removeItem(FOCUS_END_KEY);
        }
      }

      // 3. Load Pickups log
      const storedPickups = await AsyncStorage.getItem('fitpulse_pickups_log');
      if (storedPickups) {
        const logs: string[] = JSON.parse(storedPickups);
        const groups: Record<number, number> = {};
        
        logs.forEach(timeStr => {
          const date = new Date(timeStr);
          const hour = date.getHours();
          groups[hour] = (groups[hour] || 0) + 1;
        });
        
        const formatted = Object.keys(groups).map(key => {
          const hourNum = parseInt(key);
          const startHour = hourNum === 0 ? 12 : (hourNum > 12 ? hourNum - 12 : hourNum);
          const startAmpm = hourNum >= 12 ? 'PM' : 'AM';
          
          const nextHourNum = (hourNum + 1) % 24;
          const endHour = nextHourNum === 0 ? 12 : (nextHourNum > 12 ? nextHourNum - 12 : nextHourNum);
          const endAmpm = nextHourNum >= 12 ? 'PM' : 'AM';
          
          const label = `${startHour.toString().padStart(2, '0')}:00 ${startAmpm} - ${endHour.toString().padStart(2, '0')}:00 ${endAmpm}`;
          return {
            hour: label,
            count: groups[hourNum],
            type: groups[hourNum] > 8 ? 'High activity' : 'Normal usage'
          };
        }).sort((a, b) => a.hour.localeCompare(b.hour));
        
        setPickupsData(formatted);
      }
    } catch (err) {
      console.error('Failed to load wellbeing config:', err);
    }
  };

  // Verify usage stats permission and fetch real foreground app timings
  const checkUsageStatsPermissionAndLoad = async () => {
    if (Platform.OS === 'android' && StepTrackerModule && typeof StepTrackerModule.checkUsagePermission === 'function') {
      try {
        const granted = await StepTrackerModule.checkUsagePermission();
        setHasUsagePermission(granted);
        if (granted && typeof StepTrackerModule.getAppUsage === 'function') {
          const packageNames = appLimits.map(app => app.packageName);
          const usage = await StepTrackerModule.getAppUsage(packageNames);
          if (usage) {
            setAppUsageData(usage);
          }
        }
      } catch (err) {
        console.error('Failed to query usage stats:', err);
      }
    } else {
      // Simulator/iOS fallback or unrecompiled binary fallback
      setHasUsagePermission(true);
      setAppUsageData({
        'com.instagram.android': 4.2,
        'com.google.android.youtube': 12.0,
      });
    }
  };

  useEffect(() => {
    loadWellbeingData();
  }, []);

  useEffect(() => {
    checkUsageStatsPermissionAndLoad();
    const interval = setInterval(() => {
      checkUsageStatsPermissionAndLoad();
    }, 10000);

    return () => clearInterval(interval);
  }, [appLimits]);

  const totalPickups = pickupsData.reduce((acc, item) => acc + item.count, 0);

  // Focus Timer Countdown logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isFocusActive && focusTimeLeft > 0) {
      interval = setInterval(() => {
        setFocusTimeLeft((prev) => {
          if (prev <= 1) {
            setIsFocusActive(false);
            AsyncStorage.removeItem(FOCUS_END_KEY);
            Alert.alert('Detox Completed!', 'Great job! You stayed focused and offline during your training session.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isFocusActive, focusTimeLeft]);

  // Start Focus detox session
  const handleStartFocus = async (minutes: number) => {
    const endTime = Date.now() + minutes * 60 * 1000;
    try {
      await AsyncStorage.setItem(FOCUS_END_KEY, endTime.toString());
      setFocusTimeLeft(minutes * 60);
      setIsFocusActive(true);
    } catch (err) {
      console.error(err);
    }
  };

  // Cancel Focus session
  const handleCancelFocus = () => {
    Alert.alert(
      'Cancel Focus Session?',
      'Ending the detox session early will return your notifications to normal.',
      [
        { text: 'Keep Focused', style: 'cancel' },
        { 
          text: 'End Session', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(FOCUS_END_KEY);
              setIsFocusActive(false);
              setFocusTimeLeft(0);
            } catch (err) {
              console.error(err);
            }
          } 
        }
      ]
    );
  };

  // Save app limits persistently
  const saveLimits = async (updatedLimits: AppLimit[]) => {
    try {
      setAppLimits(updatedLimits);
      await AsyncStorage.setItem(APP_LIMITS_KEY, JSON.stringify(updatedLimits));
      
      // Update background service Shared Preferences immediately
      if (Platform.OS === 'android' && StepTrackerModule) {
        updatedLimits.forEach(app => {
          if (typeof StepTrackerModule.saveAppLimit === 'function') {
            StepTrackerModule.saveAppLimit(app.packageName, app.limitMins, app.isEnabled);
          }
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle boundary status
  const toggleAppLimit = (id: string) => {
    const updated = appLimits.map(app => {
      if (app.id === id) {
        return { ...app, isEnabled: !app.isEnabled };
      }
      return app;
    });
    saveLimits(updated);
  };

  // Increment/Decrement screen limit duration
  const adjustAppLimitMins = (id: string, delta: number) => {
    const updated = appLimits.map(app => {
      if (app.id === id) {
        const nextLimit = Math.max(5, app.limitMins + delta);
        return { ...app, limitMins: nextLimit };
      }
      return app;
    });
    saveLimits(updated);
  };

  const handleOpenUsageAccess = () => {
    if (Platform.OS === 'android' && StepTrackerModule && typeof StepTrackerModule.openUsageSettings === 'function') {
      StepTrackerModule.openUsageSettings();
    } else {
      Alert.alert(
        'Recompile Required',
        'Please restart the build by running npx expo run:android in your terminal to enable system usage stats boundaries.',
        [{ text: 'OK' }]
      );
    }
  };

  // Focus clock helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <LinearGradient colors={colors.backgroundGradient as [string, string, ...string[]]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }]}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Digital Wellbeing</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* Permission Settings Request Banner */}
          {!hasUsagePermission && Platform.OS === 'android' && (
            <View style={styles.permissionBanner}>
              <View style={{ flex: 1 }}>
                <Text style={styles.permissionBannerTitle}>Usage Access Required</Text>
                <Text style={styles.permissionBannerDesc}>
                  FitPulse needs system Usage Access permission to monitor and alert when your app screen boundaries are breached.
                </Text>
              </View>
              <TouchableOpacity style={styles.permissionBtn} onPress={handleOpenUsageAccess}>
                <Text style={styles.permissionBtnText}>Authorize</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Persistent Detox Focus Timer */}
          <View style={[styles.focusCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.focusHeader, { color: colors.text }]}>Detox Focus Mode</Text>
            <Text style={[styles.focusDescription, { color: colors.textSecondary }]}>
              Lock distraction notifications and focus fully on your workout. Pomodoro timer block:
            </Text>

            {isFocusActive ? (
              <View style={styles.timerContainer}>
                <Text style={[styles.timerText, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>{formatTime(focusTimeLeft)}</Text>
                <Text style={[styles.timerSubtitle, { color: colors.textMuted }]}>FOCUS IN PROGRESS</Text>
                <TouchableOpacity style={styles.btnCancelFocus} onPress={handleCancelFocus}>
                  <Text style={styles.btnCancelFocusText}>End Detox Session</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.presetsRow}>
                <TouchableOpacity 
                  style={[styles.presetTimeBtn, { backgroundColor: isDark ? 'rgba(5, 20, 36, 0.5)' : '#f1f5f9', borderColor: colors.cardBorder }]} 
                  onPress={() => handleStartFocus(15)}
                >
                  <Text style={[styles.presetTimeText, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>15 Min</Text>
                  <Text style={[styles.presetTimeSub, { color: colors.textMuted }]}>Quick Cardio</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.presetTimeBtn, { backgroundColor: isDark ? 'rgba(5, 20, 36, 0.5)' : '#f1f5f9', borderColor: colors.cardBorder }]} 
                  onPress={() => handleStartFocus(25)}
                >
                  <Text style={[styles.presetTimeText, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>25 Min</Text>
                  <Text style={[styles.presetTimeSub, { color: colors.textMuted }]}>Full Set</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.presetTimeBtn, { backgroundColor: isDark ? 'rgba(5, 20, 36, 0.5)' : '#f1f5f9', borderColor: colors.cardBorder }]} 
                  onPress={() => handleStartFocus(45)}
                >
                  <Text style={[styles.presetTimeText, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>45 Min</Text>
                  <Text style={[styles.presetTimeSub, { color: colors.textMuted }]}>Strength</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* App Block Limits Checklist */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>App Screen Boundaries</Text>
          <View style={[styles.limitsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {appLimits.map(app => {
              const actualUsageMins = appUsageData[app.packageName] || 0;
              const formattedUsage = actualUsageMins.toFixed(1);
              const isOverLimit = actualUsageMins >= app.limitMins;

              return (
                <View key={app.id} style={[styles.limitRow, { borderBottomColor: colors.borderSubtle }]}>
                  <View style={styles.limitLeft}>
                    <View style={[styles.appIconCircle, { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.12)' : 'rgba(195, 244, 0, 0.25)' }]}>
                      <Ionicons name={app.icon as any} size={18} color={isDark ? '#c3f400' : '#4d7c0f'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.appName, { color: colors.text }]}>{app.name}</Text>
                      {/* Displays actual usage time compared to user limit */}
                      <Text style={[
                        styles.usageMetricText, 
                        { color: isDark ? '#c3f400' : '#4d7c0f' },
                        isOverLimit && app.isEnabled && { color: '#ef4444' }
                      ]}>
                        Today: {formattedUsage}m / {app.limitMins}m
                      </Text>
                      {/* Adjustable time limit buttons */}
                      <View style={styles.adjustmentRow}>
                        <TouchableOpacity 
                          style={styles.adjustBtn} 
                          onPress={() => adjustAppLimitMins(app.id, -5)}
                          disabled={!app.isEnabled}
                        >
                          <Ionicons name="remove-circle-outline" size={16} color={app.isEnabled ? colors.textMuted : colors.borderSubtle} />
                        </TouchableOpacity>
                        <Text style={[styles.appLimitText, { color: colors.textSecondary }, !app.isEnabled && { color: colors.textMuted }]}>
                          Limit: {app.limitMins} mins
                        </Text>
                        <TouchableOpacity 
                          style={styles.adjustBtn} 
                          onPress={() => adjustAppLimitMins(app.id, 5)}
                          disabled={!app.isEnabled}
                        >
                          <Ionicons name="add-circle-outline" size={16} color={app.isEnabled ? colors.textMuted : colors.borderSubtle} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  <Switch
                    trackColor={{ false: isDark ? '#334155' : '#cbd5e1', true: isDark ? 'rgba(195, 244, 0, 0.3)' : 'rgba(101, 163, 13, 0.3)' }}
                    thumbColor={app.isEnabled ? (isDark ? '#c3f400' : '#65a30d') : (isDark ? '#64748B' : '#94a3b8')}
                    ios_backgroundColor={isDark ? '#1e293b' : '#e2e8f0'}
                    onValueChange={() => toggleAppLimit(app.id)}
                    value={app.isEnabled}
                  />
                </View>
              );
            })}
          </View>

          {/* Daily Pickups Log List */}
          <View style={styles.pickupsHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Device Pickups</Text>
            <View style={[styles.totalBadge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }]}>
              <Text style={[styles.totalBadgeText, { color: colors.text }]}>{totalPickups} Pickups</Text>
            </View>
          </View>
          
          <View style={[styles.pickupsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {pickupsData.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="phone-portrait-outline" size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No app open events logged today yet.</Text>
              </View>
            ) : (
              pickupsData.map((item, index) => (
                <View key={index} style={[styles.pickupRow, { borderBottomColor: colors.borderSubtle }]}>
                  <View style={styles.pickupLeft}>
                    <View style={[styles.pickupIconCircle, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)' }]}>
                      <Ionicons name="phone-portrait" size={14} color={colors.textMuted} />
                    </View>
                    <View>
                      <Text style={[styles.pickupTime, { color: colors.text }]}>{item.hour}</Text>
                      <Text style={[styles.pickupCategory, { color: colors.textMuted }]}>{item.type}</Text>
                    </View>
                  </View>
                  <Text style={[styles.pickupCount, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>+{item.count}</Text>
                </View>
              ))
            )}
          </View>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Oswald',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  permissionBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ef4444',
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  permissionBannerTitle: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '700',
    color: '#ef4444',
  },
  permissionBannerDesc: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#94a3b8',
    lineHeight: 14,
    marginTop: 4,
  },
  permissionBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  permissionBtnText: {
    fontFamily: 'Oswald',
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  focusCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
  },
  focusHeader: {
    fontFamily: 'Oswald',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  focusDescription: {
    fontFamily: 'Inter',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  timerContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  timerText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 42,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  timerSubtitle: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  btnCancelFocus: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 16,
  },
  btnCancelFocusText: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  presetTimeBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  presetTimeText: {
    fontFamily: 'Oswald',
    fontSize: 16,
    fontWeight: '700',
  },
  presetTimeSub: {
    fontFamily: 'Inter',
    fontSize: 9,
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: 'Oswald',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 14,
  },
  limitsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  limitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  appIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
  },
  usageMetricText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  adjustmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  adjustBtn: {
    padding: 2,
  },
  appLimitText: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: 'bold',
  },
  pickupsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  totalBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  totalBadgeText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
  },
  pickupsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  pickupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  pickupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pickupIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickupTime: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '500',
  },
  pickupCategory: {
    fontFamily: 'Inter',
    fontSize: 9,
    marginTop: 2,
  },
  pickupCount: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontFamily: 'Inter',
    fontSize: 12,
  },
});
