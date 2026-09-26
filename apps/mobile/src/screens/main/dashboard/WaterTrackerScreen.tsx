import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useOfflineStore } from '../../../lib/offlineStore';
import { useAuthStore } from '../../../lib/store';
import { useAppTheme } from '../../../lib/theme';

interface WaterLog {
  id: string;
  volume: number; // in ml
  timestamp: string;
}

const WATER_STORAGE_KEY = 'fitpulse_water_logs';
const WATER_GOAL_KEY = 'fitpulse_water_goal';
const WATER_NOTIFIED_KEY = 'fitpulse_water_notified';

export default function WaterTrackerScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useAppTheme();
  const { toggleRoutineLog, routineItems } = useOfflineStore();
  const { session } = useAuthStore();
  const userId = session?.user?.id;

  const [logs, setLogs] = useState<WaterLog[]>([]);
  const [totalWater, setTotalWater] = useState<number>(0);
  const [waterGoal, setWaterGoal] = useState<number>(2500); // Default 2.5L

  // Manual goal editing state
  const [isEditingGoal, setIsEditingGoal] = useState<boolean>(false);
  const [goalInput, setGoalInput] = useState<string>('2500');

  // Custom intake logger states
  const [customVolume, setCustomVolume] = useState<number>(250);
  const [waterUnit, setWaterUnit] = useState<'ml' | 'oz' | 'cups'>('ml');
  const [isManualInput, setIsManualInput] = useState(false);
  const [manualText, setManualText] = useState('');

  // Load persistent logs and target goal
  const loadWaterData = async () => {
    try {
      // 1. Load Goal
      const storedGoal = await AsyncStorage.getItem(WATER_GOAL_KEY);
      if (storedGoal) {
        setWaterGoal(parseInt(storedGoal));
        setGoalInput(storedGoal);
      }

      // 2. Load Logs
      const data = await AsyncStorage.getItem(WATER_STORAGE_KEY);
      if (data) {
        const parsed: WaterLog[] = JSON.parse(data);
        const todayStr = new Date().toDateString();
        const todayLogs = parsed.filter(item => {
          return new Date(item.timestamp).toDateString() === todayStr;
        });

        setLogs(todayLogs);
        calculateTotal(todayLogs);
      }
    } catch (err) {
      console.error('Failed to load water data:', err);
    }
  };

  const saveWaterLogs = async (newLogs: WaterLog[]) => {
    try {
      await AsyncStorage.setItem(WATER_STORAGE_KEY, JSON.stringify(newLogs));
    } catch (err) {
      console.error('Failed to save water logs:', err);
    }
  };

  const calculateTotal = (waterLogs: WaterLog[]) => {
    const sum = waterLogs.reduce((acc, log) => acc + log.volume, 0);
    setTotalWater(sum);
  };

  // Conversion helpers
  const convertMlToUnit = (ml: number, targetUnit: 'ml' | 'oz' | 'cups'): number => {
    switch (targetUnit) {
      case 'oz': return ml / 29.5735;
      case 'cups': return ml / 250;
      case 'ml':
      default:
        return ml;
    }
  };

  const convertUnitToMl = (value: number, sourceUnit: 'ml' | 'oz' | 'cups'): number => {
    switch (sourceUnit) {
      case 'oz': return value * 29.5735;
      case 'cups': return value * 250;
      case 'ml':
      default:
        return value;
    }
  };

  useEffect(() => {
    loadWaterData();
  }, []);

  const adjustWaterGoal = async (delta: number) => {
    const nextGoal = Math.max(1000, waterGoal + delta);
    setWaterGoal(nextGoal);
    setGoalInput(nextGoal.toString());
    try {
      await AsyncStorage.setItem(WATER_GOAL_KEY, nextGoal.toString());
      
      const todayStr = new Date().toDateString();
      if (totalWater < nextGoal) {
        await AsyncStorage.removeItem(`${WATER_NOTIFIED_KEY}_${todayStr}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveManualGoal = async () => {
    const parsed = parseInt(goalInput);
    if (isNaN(parsed) || parsed < 500 || parsed > 10000) {
      Alert.alert('Invalid Goal', 'Please enter a goal between 500 ml and 10,000 ml.');
      return;
    }
    setWaterGoal(parsed);
    setIsEditingGoal(false);
    try {
      await AsyncStorage.setItem(WATER_GOAL_KEY, parsed.toString());
      const todayStr = new Date().toDateString();
      if (totalWater < parsed) {
        await AsyncStorage.removeItem(`${WATER_NOTIFIED_KEY}_${todayStr}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const triggerGoalNotification = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Goal Achieved! 💧🏆",
          body: "Fantastic work! You completed your daily hydration target.",
          sound: true, // plays system notification ringtone
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
      });
    } catch (err) {
      console.error('Failed to send local notification:', err);
    }
  };

  const handleAddWater = async (volume: number) => {
    const newLog: WaterLog = {
      id: Math.random().toString(),
      volume,
      timestamp: new Date().toISOString(),
    };
    const updated = [newLog, ...logs];
    setLogs(updated);
    
    const newTotal = totalWater + volume;
    setTotalWater(newTotal);
    saveWaterLogs(updated);

    const todayStr = new Date().toDateString();

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

      // Check if already notified today
      const alreadyNotified = await AsyncStorage.getItem(`${WATER_NOTIFIED_KEY}_${todayStr}`);
      if (!alreadyNotified) {
        await AsyncStorage.setItem(`${WATER_NOTIFIED_KEY}_${todayStr}`, 'true');
        // Play automatic ringtone & push notification
        triggerGoalNotification();
      }
    }
  };

  const handleDeleteLog = (id: string) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this water entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            const updated = logs.filter(log => log.id !== id);
            setLogs(updated);
            calculateTotal(updated);
            saveWaterLogs(updated);

            const newTotal = updated.reduce((acc, log) => acc + log.volume, 0);
            const todayStr = new Date().toDateString();

            // Remove notification flag and toggle habit if falls below goal
            if (newTotal < waterGoal) {
              await AsyncStorage.removeItem(`${WATER_NOTIFIED_KEY}_${todayStr}`);
              if (userId) {
                const waterItem = routineItems.find(item => 
                  item.title.toLowerCase().includes('water') || 
                  item.title.toLowerCase().includes('drink') || 
                  item.title.toLowerCase().includes('hydration')
                );
                if (waterItem) {
                  const dateStr = new Date().toISOString().split('T')[0];
                  toggleRoutineLog(userId, waterItem.id, dateStr, false);
                }
              }
            }
          }
        }
      ]
    );
  };

  const targetPct = Math.min(100, Math.round((totalWater / waterGoal) * 100));

  // Quick Preset Options
  const presets = [
    { label: 'Glass', volume: 250, icon: 'beer-outline' },
    { label: 'Cup', volume: 350, icon: 'cafe-outline' },
    { label: 'Bottle', volume: 500, icon: 'water-outline' },
    { label: 'Shaker', volume: 750, icon: 'wine-outline' },
  ];

  return (
    <LinearGradient colors={colors.backgroundGradient} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Hydration Tracker</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* Hydration Animation Bubble Card */}
          <View style={[styles.liquidCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.bubbleOutline, { borderColor: isDark ? 'rgba(56, 189, 248, 0.4)' : '#38bdf8', backgroundColor: colors.cardSubtle }]}>
              {/* Animated Inner Fluid Ring */}
              <View 
                style={[
                  styles.fluidFill, 
                  { height: `${targetPct}%` }
                ]} 
              />
              <View style={styles.bubbleTextContainer}>
                <Ionicons name="water" size={32} color={isDark ? "#ffffff" : "#0284c7"} style={{ marginBottom: 4 }} />
                <Text style={[styles.currentWater, { color: colors.text }]}>{(totalWater / 1000).toFixed(2)} Liters</Text>
                <Text style={[styles.targetWater, { color: colors.textSecondary }]}>Goal: {(waterGoal / 1000).toFixed(2)} L ({totalWater} ml)</Text>
                <Text style={[styles.pctText, { color: isDark ? '#38bdf8' : '#0284c7' }]}>{targetPct}% completed</Text>
              </View>
            </View>

            {/* Goal Adjustment Controls */}
            {isEditingGoal ? (
              <View style={styles.goalControlRow}>
                <TextInput
                  style={[styles.goalInput, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle, color: colors.text }]}
                  value={goalInput}
                  onChangeText={setGoalInput}
                  keyboardType="number-pad"
                  maxLength={5}
                  placeholder="2500"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={[styles.mlText, { color: colors.textMuted }]}>ml</Text>
                <TouchableOpacity style={styles.saveGoalBtn} onPress={handleSaveManualGoal}>
                  <Ionicons name="checkmark-circle" size={22} color={isDark ? "#c3f400" : "#65a30d"} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveGoalBtn} onPress={() => { setIsEditingGoal(false); setGoalInput(waterGoal.toString()); }}>
                  <Ionicons name="close-circle" size={22} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.goalControlRow}>
                <TouchableOpacity style={styles.goalAdjustBtn} onPress={() => adjustWaterGoal(-250)}>
                  <Ionicons name="remove-circle-outline" size={20} color="#38bdf8" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.goalEditClickable} 
                  onPress={() => setIsEditingGoal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.goalControlText, { color: colors.textSecondary }]}>Adjust Goal (Tap to Type)</Text>
                  <Ionicons name="create-outline" size={12} color="#38bdf8" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.goalAdjustBtn} onPress={() => adjustWaterGoal(250)}>
                  <Ionicons name="add-circle-outline" size={20} color="#38bdf8" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Preset Logs Lists */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Add Water presets</Text>
          <View style={styles.presetsGrid}>
            {presets.map((preset, index) => {
              const displayVol = convertMlToUnit(preset.volume, waterUnit);
              return (
                <TouchableOpacity 
                  key={index} 
                  style={[styles.presetButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} 
                  onPress={() => handleAddWater(preset.volume)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={preset.icon as any} size={24} color="#38bdf8" />
                  <Text style={[presetLabelStyles.presetLabel, { color: colors.text }]}>{preset.label}</Text>
                  <Text style={presetLabelStyles.presetVol}>+{displayVol.toFixed(1)}{waterUnit}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom Intake Logger */}
          <View style={[styles.customLogCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="create-outline" size={16} color="#38bdf8" style={{ marginRight: 6 }} />
                <Text style={[styles.customLogTitle, { color: colors.text }]}>Log Custom Intake</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setIsManualInput(!isManualInput)} 
                style={styles.keyboardToggle}
              >
                <Ionicons 
                  name={isManualInput ? "create-outline" : "keypad-outline"} 
                  size={16} 
                  color="#38bdf8" 
                />
                <Text style={[styles.keyboardToggleText, { color: colors.textSecondary }]}>
                  {isManualInput ? 'Steppers' : 'Manual'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Unit Selector */}
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>CHOOSE VOLUME UNIT</Text>
            <View style={[styles.unitSelector, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
              {(['ml', 'oz', 'cups'] as const).map((u) => (
                <TouchableOpacity 
                  key={u}
                  style={[
                    styles.unitBtn, 
                    waterUnit === u && [styles.unitBtnActive, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]
                  ]}
                  onPress={() => {
                    const currentInMlReal = convertUnitToMl(customVolume, waterUnit);
                    const convertedVal = convertMlToUnit(currentInMlReal, u);
                    setCustomVolume(Number(convertedVal.toFixed(1)));
                    setWaterUnit(u);
                  }}
                >
                  <Text style={[
                    styles.unitBtnText, 
                    { color: colors.textMuted },
                    waterUnit === u && { color: '#38bdf8' }
                  ]}>
                    {u.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>WATER VOLUME</Text>
            {isManualInput ? (
              <View style={styles.manualWrapper}>
                <TextInput
                  style={[styles.manualInput, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle, color: colors.text }]}
                  keyboardType="numeric"
                  placeholder={`Enter volume in ${waterUnit}`}
                  placeholderTextColor={colors.textMuted}
                  value={manualText}
                  onChangeText={setManualText}
                />
              </View>
            ) : (
              <View style={[styles.stepperContainer, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                <TouchableOpacity 
                  onPress={() => setCustomVolume(prev => Math.max(1, prev - (waterUnit === 'ml' ? 50 : 1.0)))} 
                  style={styles.stepperBtn}
                >
                  <Ionicons name="remove" size={24} color="#051424" />
                </TouchableOpacity>
                <View style={styles.stepperValContainer}>
                  <Text style={[styles.stepperValText, { color: colors.text }]}>{customVolume}</Text>
                  <Text style={[styles.stepperUnitText, { color: colors.textMuted }]}>{waterUnit}</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setCustomVolume(prev => prev + (waterUnit === 'ml' ? 50 : 1.0))} 
                  style={styles.stepperBtn}
                >
                  <Ionicons name="add" size={24} color="#051424" />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity 
              style={styles.btnSaveIntake}
              onPress={async () => {
                let volumeMl = 250;
                if (isManualInput) {
                  const val = parseFloat(manualText);
                  if (isNaN(val) || val <= 0) {
                    Alert.alert('Invalid Input', 'Please enter a valid amount.');
                    return;
                  }
                  volumeMl = convertUnitToMl(val, waterUnit);
                } else {
                  volumeMl = convertUnitToMl(customVolume, waterUnit);
                }
                await handleAddWater(Math.round(volumeMl));
                setIsManualInput(false);
                setManualText('');
              }}
            >
              <Text style={styles.btnSaveIntakeText}>LOG WATER INTAKE</Text>
            </TouchableOpacity>
          </View>

          {/* Consumption logs List */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Hydration Log</Text>
          <View style={[styles.logListCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {logs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="water-outline" size={36} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No water logged today yet.</Text>
                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Drink water regularly to stay active!</Text>
              </View>
            ) : (
              logs.map((item, index) => {
                const timeStr = new Date(item.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <View key={item.id} style={[styles.logRow, { borderBottomColor: colors.borderSubtle }]}>
                    <View style={styles.logLeft}>
                      <View style={styles.waterIconCircle}>
                        <Ionicons name="water" size={16} color="#38bdf8" />
                      </View>
                      <View>
                        <Text style={[styles.logVolume, { color: colors.text }]}>
                          {convertMlToUnit(item.volume, waterUnit).toFixed(1)} {waterUnit}
                        </Text>
                        <Text style={[styles.logTime, { color: colors.textMuted }]}>{timeStr}</Text>
                      </View>
                    </View>

                    <TouchableOpacity 
                      style={styles.btnDelete} 
                      onPress={() => handleDeleteLog(item.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const presetLabelStyles = StyleSheet.create({
  presetLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
  },
  presetVol: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 4,
  },
});

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
    borderBottomColor: '#1e293b',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Oswald',
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  liquidCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  bubbleOutline: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 4,
    borderColor: '#38bdf8',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 20, 36, 0.6)',
    position: 'relative',
  },
  fluidFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(56, 189, 248, 0.35)',
    borderTopWidth: 2,
    borderTopColor: '#38bdf8',
  },
  bubbleTextContainer: {
    alignItems: 'center',
    zIndex: 2,
  },
  currentWater: {
    fontFamily: 'Oswald',
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
  },
  targetWater: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  pctText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    color: '#38bdf8',
    fontWeight: 'bold',
    marginTop: 8,
    backgroundColor: 'rgba(5, 20, 36, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  goalControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 18,
    backgroundColor: 'rgba(5, 20, 36, 0.4)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    minHeight: 44,
  },
  goalAdjustBtn: {
    padding: 2,
  },
  goalEditClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalControlText: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  goalInput: {
    fontFamily: 'JetBrains Mono',
    fontSize: 14,
    color: '#ffffff',
    backgroundColor: 'rgba(5, 20, 36, 0.8)',
    borderWidth: 1,
    borderColor: '#38bdf8',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    width: 70,
    textAlign: 'center',
  },
  mlText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#94a3b8',
    marginRight: 4,
  },
  saveGoalBtn: {
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: 'Oswald',
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
    marginBottom: 14,
    marginTop: 6,
  },
  presetsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 24,
    rowGap: 12,
  },
  presetButton: {
    width: '48%',
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logListCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
  },
  emptyContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 10,
    fontWeight: '600',
  },
  emptySubtext: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30, 41, 59, 0.4)',
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  waterIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logVolume: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  logTime: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  btnDelete: {
    padding: 6,
  },
  customLogCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customLogTitle: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  keyboardToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  keyboardToggleText: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#cbd5e1',
  },
  fieldLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: '#64748B',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  unitSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 2,
    gap: 2,
  },
  unitBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  unitBtnActive: {
    backgroundColor: '#334155',
  },
  unitBtnText: {
    fontFamily: 'Oswald',
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  unitBtnTextActive: {
    color: '#38bdf8',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 8,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#38bdf8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValContainer: {
    alignItems: 'center',
  },
  stepperValText: {
    fontFamily: 'Oswald',
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  stepperUnitText: {
    fontFamily: 'Inter',
    fontSize: 9,
    color: '#64748B',
    marginTop: -2,
  },
  manualWrapper: {
    gap: 6,
  },
  manualInput: {
    backgroundColor: '#051424',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontFamily: 'Oswald',
    fontSize: 16,
  },
  btnSaveIntake: {
    backgroundColor: '#38bdf8',
    borderRadius: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  btnSaveIntakeText: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
    color: '#051424',
    letterSpacing: 0.5,
  },
});
