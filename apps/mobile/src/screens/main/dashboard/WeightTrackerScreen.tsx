import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../../lib/store';
import { useOfflineStore } from '../../../lib/offlineStore';
import { useAppTheme } from '../../../lib/theme';

export default function WeightTrackerScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useAppTheme();
  const { session } = useAuthStore();
  const userId = session?.user?.id || 'guest';
  const { addWeightEntry, weightHistory, latestWeightKg } = useOfflineStore();

  const [unit, setUnit] = useState<'kg' | 'lbs' | 'st'>('kg');
  const [loading, setLoading] = useState(false);

  // Stepper state (in selected unit)
  const [currentValue, setCurrentValue] = useState<number>(75.0);
  const [isManualInput, setIsManualInput] = useState(false);
  const [manualText, setManualText] = useState('');

  // Target Goal weight (default 70kg)
  const [goalWeight, setGoalWeight] = useState<number>(70.0);

  // Modal for setting target goal
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [goalText, setGoalText] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [unit, weightHistory])
  );

  const loadData = async () => {
    try {
      const storedGoal = await AsyncStorage.getItem('fitpulse_weight_goal');
      if (storedGoal) {
        setGoalWeight(parseFloat(storedGoal));
      }

      // Initialize currentValue with latest log weight or default 75kg
      if (weightHistory.length > 0) {
        const latestKg = weightHistory[0].weight_kg;
        setCurrentValue(Number(convertKgToUnit(latestKg, unit).toFixed(1)));
      } else {
        setCurrentValue(Number(convertKgToUnit(75.0, unit).toFixed(1)));
      }
    } catch (err) {
      console.error('Failed to load weight target:', err);
    }
  };

  // Conversion helpers
  const convertKgToUnit = (kg: number, targetUnit: 'kg' | 'lbs' | 'st'): number => {
    switch (targetUnit) {
      case 'lbs': return kg * 2.20462;
      case 'st': return kg * 0.157473;
      case 'kg':
      default:
        return kg;
    }
  };

  const convertUnitToKg = (value: number, sourceUnit: 'kg' | 'lbs' | 'st'): number => {
    switch (sourceUnit) {
      case 'lbs': return value / 2.20462;
      case 'st': return value / 0.157473;
      case 'kg':
      default:
        return value;
    }
  };

  const handleUnitChange = (newUnit: 'kg' | 'lbs' | 'st') => {
    const currentInKg = convertUnitToKg(currentValue, unit);
    const convertedVal = convertKgToUnit(currentInKg, newUnit);
    setCurrentValue(Number(convertedVal.toFixed(1)));
    setUnit(newUnit);
  };

  const handleSaveLog = async () => {
    setLoading(true);
    try {
      let finalWeightKg = 75.0;

      if (isManualInput) {
        const val = parseFloat(manualText);
        if (isNaN(val) || val <= 0) {
          Alert.alert('Invalid Weight', 'Please enter a valid positive number.');
          setLoading(false);
          return;
        }
        finalWeightKg = convertUnitToKg(val, unit);
      } else {
        finalWeightKg = convertUnitToKg(currentValue, unit);
      }

      // Save using Zustand offline store action (syncs to Supabase!)
      if (userId) {
        await addWeightEntry(userId, finalWeightKg);
      }

      setIsManualInput(false);
      setManualText('');
      
      Alert.alert('Weight Logged ⚖️', `Saved entry successfully.`);
    } catch (err) {
      Alert.alert('Error', 'Failed to save weight entry.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoal = async () => {
    const val = parseFloat(goalText);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Invalid Goal', 'Please enter a valid weight.');
      return;
    }
    const goalKg = convertUnitToKg(val, unit);
    await AsyncStorage.setItem('fitpulse_weight_goal', goalKg.toString());
    setGoalWeight(goalKg);
    setGoalModalVisible(false);
    setGoalText('');
    Alert.alert('Goal Updated 🎯', `Target goal set to ${val} ${unit.toUpperCase()}.`);
  };

  const handleDeleteLog = async (id: string) => {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this weight log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updatedHistory = weightHistory.filter(item => item.id !== id);
          useOfflineStore.setState({
            weightHistory: updatedHistory,
            latestWeightKg: updatedHistory.length > 0 ? updatedHistory[0].weight_kg : 0
          });
          Alert.alert('Deleted', 'Weight log deleted successfully.');
        }
      }
    ]);
  };

  const latestWeight = latestWeightKg || 75.0;
  const progressToGoal = goalWeight - latestWeight;
  const progressSign = progressToGoal > 0 ? '+' : '';

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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Body Weight Physiology</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* Medical weight info card */}
          <View style={[styles.scienceBanner, { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.05)' : 'rgba(195, 244, 0, 0.12)', borderColor: isDark ? 'rgba(195, 244, 0, 0.2)' : 'rgba(195, 244, 0, 0.3)' }]}>
            <Ionicons name="scale-outline" size={16} color={isDark ? '#c3f400' : '#4d7c0f'} />
            <Text style={[styles.scienceBannerText, { color: colors.textSecondary }]}>
              WHO Medical Standard: A healthy, sustainable rate of weight loss is 0.5kg - 1.0kg (1-2 lbs) per week. Rapid drops trigger muscle catabolism and metabolic slowdown.
            </Text>
          </View>

          {/* Goal tracker card */}
          <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.goalRow}>
              <View>
                <Text style={[styles.goalLabel, { color: colors.textMuted }]}>CURRENT WEIGHT</Text>
                <Text style={[styles.goalVal, { color: colors.text }]}>
                  {convertKgToUnit(latestWeight, unit).toFixed(1)} {unit.toUpperCase()}
                </Text>
              </View>
              <View style={[styles.verticalDivider, { backgroundColor: colors.borderSubtle }]} />
              <View>
                <Text style={[styles.goalLabel, { color: colors.textMuted }]}>TARGET GOAL</Text>
                <TouchableOpacity onPress={() => {
                  setGoalText(convertKgToUnit(goalWeight, unit).toFixed(1));
                  setGoalModalVisible(true);
                }} style={styles.goalEditBtn}>
                  <Text style={[styles.goalValLink, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>
                    {convertKgToUnit(goalWeight, unit).toFixed(1)} {unit.toUpperCase()}
                  </Text>
                  <Ionicons name="create-outline" size={14} color={isDark ? '#c3f400' : '#4d7c0f'} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.progressStatusBar, { borderTopColor: colors.borderSubtle }]}>
              <Text style={[styles.progressStatusText, { color: colors.textSecondary }]}>
                {progressToGoal === 0 
                  ? 'Goal reached!' 
                  : `Drift: ${progressSign}${convertKgToUnit(progressToGoal, unit).toFixed(1)} ${unit.toUpperCase()}`}
              </Text>
            </View>
          </View>

          {/* Units Selector */}
          <View style={styles.selectorWrapper}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>CHOOSE MEASUREMENT UNIT</Text>
            <View style={[styles.unitSelector, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f1f5f9', borderColor: colors.cardBorder }]}>
              {(['kg', 'lbs', 'st'] as const).map((u) => (
                <TouchableOpacity 
                  key={u}
                  style={[
                    styles.unitBtn, 
                    unit === u && [styles.unitBtnActive, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]
                  ]}
                  onPress={() => handleUnitChange(u)}
                >
                  <Text style={[
                    styles.unitBtnText, 
                    { color: colors.textMuted },
                    unit === u && [styles.unitBtnTextActive, { color: isDark ? '#c3f400' : '#051424' }]
                  ]}>
                    {u.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Input Panel */}
          <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.inputHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Log Today's Weight</Text>
              <TouchableOpacity 
                onPress={() => setIsManualInput(!isManualInput)} 
                style={styles.keyboardToggle}
              >
                <Ionicons 
                  name={isManualInput ? "create-outline" : "keypad-outline"} 
                  size={18} 
                  color={isDark ? '#c3f400' : '#4d7c0f'} 
                />
                <Text style={[styles.keyboardToggleText, { color: colors.textSecondary }]}>
                  {isManualInput ? 'Use Steppers' : 'Manual Keyboard'}
                </Text>
              </TouchableOpacity>
            </View>

            {isManualInput ? (
              <View style={styles.manualWrapper}>
                <TextInput
                  style={[styles.manualInput, { backgroundColor: isDark ? '#051424' : '#f8fafc', borderColor: colors.cardBorder, color: colors.text }]}
                  keyboardType="numeric"
                  placeholder={`Enter weight in ${unit.toUpperCase()}`}
                  placeholderTextColor={colors.textMuted}
                  value={manualText}
                  onChangeText={setManualText}
                />
                <Text style={[styles.manualHint, { color: colors.textMuted }]}>Type exactly in {unit.toUpperCase()} units</Text>
              </View>
            ) : (
              <View style={styles.stepperWrapper}>
                <TouchableOpacity 
                  style={[styles.stepperBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setCurrentValue(prev => Number(Math.max(1, prev - 1.0).toFixed(1)))}
                >
                  <Ionicons name="remove" size={24} color={colors.onPrimary} />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.stepperBtnSmall, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}
                  onPress={() => setCurrentValue(prev => Number(Math.max(1, prev - 0.1).toFixed(1)))}
                >
                  <Text style={[styles.stepperBtnSmallText, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>-0.1</Text>
                </TouchableOpacity>

                <View style={styles.valDisplay}>
                  <Text style={[styles.valDisplayText, { color: colors.text }]}>{currentValue}</Text>
                  <Text style={[styles.valDisplayUnit, { color: colors.textMuted }]}>{unit.toUpperCase()}</Text>
                </View>

                <TouchableOpacity 
                  style={[styles.stepperBtnSmall, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}
                  onPress={() => setCurrentValue(prev => Number((prev + 0.1).toFixed(1)))}
                >
                  <Text style={[styles.stepperBtnSmallText, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>+0.1</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.stepperBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setCurrentValue(prev => Number((prev + 1.0).toFixed(1)))}
                >
                  <Ionicons name="add" size={24} color={colors.onPrimary} />
                </TouchableOpacity>
              </View>
            )}

            {/* Quick Adjust Presets */}
            {!isManualInput && (
              <View style={styles.presetsRow}>
                {[-1.0, -0.5, 0, 0.5, 1.0].map((diff) => {
                  if (diff === 0) return null;
                  const label = diff > 0 ? `+${diff}` : `${diff}`;
                  return (
                    <TouchableOpacity 
                      key={diff} 
                      style={[styles.presetBtn, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}
                      onPress={() => setCurrentValue(prev => Number((prev + diff).toFixed(1)))}
                    >
                      <Text style={[styles.presetBtnText, { color: colors.textSecondary }]}>{label} {unit.toUpperCase()}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <TouchableOpacity 
              style={[styles.btnSave, { backgroundColor: colors.primary }]}
              onPress={handleSaveLog}
              disabled={loading}
            >
              <Text style={[styles.btnSaveText, { color: colors.onPrimary }]}>LOG WEIGHT ENTRY</Text>
            </TouchableOpacity>
          </View>

          {/* Weight Log History */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Weight Logs History</Text>
            
            {weightHistory.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No past logs recorded.</Text>
            ) : (
              <View style={styles.historyList}>
                {weightHistory.map((item) => {
                  const displayWeight = convertKgToUnit(item.weight_kg, unit);
                  return (
                    <View key={item.id} style={[styles.historyRow, { backgroundColor: isDark ? 'rgba(5, 20, 36, 0.4)' : '#f8fafc', borderColor: colors.cardBorder }]}>
                      <View>
                        <Text style={[styles.historyDate, { color: colors.text }]}>
                          {new Date(item.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })} • {new Date(item.logged_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        <Text style={[styles.historySubtext, { color: colors.textMuted }]}>
                          Stored Base: {item.weight_kg.toFixed(1)} KG
                        </Text>
                      </View>
                      <View style={styles.historyRight}>
                        <Text style={[styles.historyWeightVal, { color: colors.text }]}>
                          {displayWeight.toFixed(1)} {unit.toUpperCase()}
                        </Text>
                        <TouchableOpacity onPress={() => handleDeleteLog(item.id)} style={styles.btnDelete}>
                          <Ionicons name="trash-outline" size={14} color="#ff4a4a" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

        </ScrollView>

        {/* Set Goal Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={goalModalVisible}
          onRequestClose={() => setGoalModalVisible(false)}
        >
          <View style={styles.modalBg}>
            <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Set Target Goal Weight</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: isDark ? '#051424' : '#f8fafc', borderColor: colors.cardBorder, color: colors.text }]}
                keyboardType="numeric"
                placeholder={`Enter target in ${unit.toUpperCase()}`}
                placeholderTextColor={colors.textMuted}
                value={goalText}
                onChangeText={setGoalText}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalCancel, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]} onPress={() => setGoalModalVisible(false)}>
                  <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalSave, { backgroundColor: colors.primary }]} onPress={handleSaveGoal}>
                  <Text style={[styles.modalSaveText, { color: colors.onPrimary }]}>Save Goal</Text>
                </TouchableOpacity>
              </View>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Oswald',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  scrollContainer: {
    padding: 20,
    gap: 20,
  },
  scienceBanner: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'flex-start',
    gap: 8,
  },
  scienceBannerText: {
    fontFamily: 'Inter',
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  metricCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
  },
  verticalDivider: {
    width: 1,
    height: 40,
  },
  goalLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  goalVal: {
    fontFamily: 'Oswald',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  goalEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalValLink: {
    fontFamily: 'Oswald',
    fontSize: 20,
    fontWeight: '600',
  },
  progressStatusBar: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  progressStatusText: {
    fontFamily: 'Inter',
    fontSize: 11,
  },
  selectorWrapper: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  unitSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 2,
    gap: 2,
  },
  unitBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  unitBtnActive: {},
  unitBtnText: {
    fontFamily: 'Oswald',
    fontSize: 11,
    fontWeight: '700',
  },
  unitBtnTextActive: {},
  inputCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: 'Oswald',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  keyboardToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  keyboardToggleText: {
    fontFamily: 'Inter',
    fontSize: 11,
  },
  manualWrapper: {
    gap: 6,
  },
  manualInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontFamily: 'Oswald',
    fontSize: 18,
  },
  manualHint: {
    fontFamily: 'Inter',
    fontSize: 10,
  },
  stepperWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnSmall: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
  },
  stepperBtnSmallText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    fontWeight: 'bold',
  },
  valDisplay: {
    alignItems: 'center',
  },
  valDisplayText: {
    fontFamily: 'Oswald',
    fontSize: 32,
    fontWeight: '700',
  },
  valDisplayUnit: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: -4,
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  presetBtn: {
    flex: 1,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  presetBtnText: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '500',
  },
  btnSave: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnSaveText: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  emptyText: {
    fontFamily: 'Inter',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 10,
  },
  historyList: {
    gap: 8,
    marginTop: 12,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  historyDate: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '500',
  },
  historySubtext: {
    fontFamily: 'Inter',
    fontSize: 10,
    marginTop: 2,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyWeightVal: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '600',
  },
  btnDelete: {
    padding: 4,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(5, 20, 36, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  modalTitle: {
    fontFamily: 'Oswald',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontFamily: 'Oswald',
    fontSize: 18,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalCancelText: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
  },
  modalSave: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalSaveText: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
  },
});
