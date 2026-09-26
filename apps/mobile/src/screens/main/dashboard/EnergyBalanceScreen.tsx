import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  ActivityIndicator,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOfflineStore } from '../../../lib/offlineStore';
import { useAuthStore } from '../../../lib/store';
import { supabase } from '../../../lib/supabase';
import { useAppTheme } from '../../../lib/theme';

interface CustomExerciseLog {
  id: string;
  name: string;
  caloriesBurned: number;
  loggedAt: string;
}

export default function EnergyBalanceScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useAppTheme();
  const { profile, setProfile } = useAuthStore();
  const { dailySteps, latestWeightKg, foodEntries, addWeightEntry } = useOfflineStore();
  
  const userId = profile?.id;
  const todayStr = new Date().toISOString().split('T')[0];

  // Editable Profile States (for BMR/TDEE calculation and saving) - Numeric for Steppers
  const [weightInput, setWeightInput] = useState<number>(latestWeightKg || 70);
  const [heightInput, setHeightInput] = useState<number>(profile?.height_cm || 170);
  const [ageInput, setAgeInput] = useState<number>(profile?.age || 25);
  const [sexInput, setSexInput] = useState(profile?.sex || 'male');
  const [activityInput, setActivityInput] = useState(profile?.activity_level || 'moderate');
  const [goalInput, setGoalInput] = useState(profile?.goal_type || 'maintain');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Custom Exercises Burn Logs
  const [exerciseLogs, setExerciseLogs] = useState<CustomExerciseLog[]>([]);
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseCalories, setExerciseCalories] = useState('');
  const [savingExercise, setSavingExercise] = useState(false);

  // Sync edits from profile changes elsewhere
  useEffect(() => {
    if (profile) {
      setHeightInput(profile.height_cm || 170);
      setAgeInput(profile.age || 25);
      setSexInput(profile.sex || 'male');
      setActivityInput(profile.activity_level || 'moderate');
      setGoalInput(profile.goal_type || 'maintain');
    }
  }, [profile]);

  useEffect(() => {
    setWeightInput(latestWeightKg || 70);
  }, [latestWeightKg]);

  // Load exercises logged today
  const loadTodayExercises = async () => {
    try {
      const data = await AsyncStorage.getItem('fitpulse_exercise_burn_logs');
      if (data) {
        const parsed = JSON.parse(data) as CustomExerciseLog[];
        const todayLabel = new Date().toDateString();
        const todayLogs = parsed.filter(item => new Date(item.loggedAt).toDateString() === todayLabel);
        setExerciseLogs(todayLogs);
      } else {
        setExerciseLogs([]);
      }
    } catch (err) {
      console.error('Failed to load exercise logs:', err);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadTodayExercises();
    }, [])
  );

  // Mifflin-St Jeor Calculations
  const calculatedWeight = weightInput;
  const calculatedHeight = heightInput;
  const calculatedAge = ageInput;
  
  let bmr = 1600;
  if (sexInput === 'male') {
    bmr = 10 * calculatedWeight + 6.25 * calculatedHeight - 5 * calculatedAge + 5;
  } else if (sexInput === 'female') {
    bmr = 10 * calculatedWeight + 6.25 * calculatedHeight - 5 * calculatedAge - 161;
  } else {
    bmr = 10 * calculatedWeight + 6.25 * calculatedHeight - 5 * calculatedAge - 78;
  }

  // BMR burned so far today
  const now = new Date();
  const hoursPassed = now.getHours() + now.getMinutes() / 60;
  const bmrBurnedSoFar = Math.round(bmr * (hoursPassed / 24));

  // Activity Multiplier
  let activityMultiplier = 1.55;
  if (activityInput === 'sedentary') activityMultiplier = 1.2;
  else if (activityInput === 'light') activityMultiplier = 1.375;
  else if (activityInput === 'moderate') activityMultiplier = 1.55;
  else if (activityInput === 'active') activityMultiplier = 1.725;

  // Active steps burn
  const stepsBurn = Math.round(0.000525 * calculatedWeight * dailySteps);

  // Custom exercises burn sum
  const customExerciseBurn = exerciseLogs.reduce((sum, item) => sum + item.caloriesBurned, 0);

  // Total active burn
  const activeCalories = stepsBurn + customExerciseBurn;

  // Total Burned so far today
  const totalBurnedSoFar = Math.round(bmrBurnedSoFar + activeCalories);

  // TDEE estimate (Full daily forecast)
  const fullDailyTdee = Math.round(bmr * activityMultiplier + stepsBurn);

  // Gained Calories (Nutrition)
  const caloriesGained = foodEntries.reduce((sum, item) => sum + item.calories, 0);

  // Net Balance
  const netBalance = Math.round(caloriesGained - totalBurnedSoFar);
  const isSurplus = netBalance >= 0;

  // Budget targets based on goals
  let budgetGoal = fullDailyTdee;
  if (goalInput === 'lose') {
    budgetGoal = Math.max(1200, fullDailyTdee - 500); // 500 kcal deficit
  } else if (goalInput === 'gain') {
    budgetGoal = fullDailyTdee + 300; // 300 kcal surplus
  }

  // Update Profile metrics on server & Zustand store
  const handleSaveChanges = async () => {
    if (!userId) return;
    
    const weightNum = weightInput;
    const heightNum = heightInput;
    const ageNum = ageInput;

    if (weightNum <= 0 || heightNum <= 0 || ageNum <= 0) {
      Alert.alert('Invalid Input', 'Values must be greater than zero.');
      return;
    }

    setUpdatingProfile(true);
    try {
      // 1. If weight changed, update the weight entries table as well
      if (Math.abs(weightNum - latestWeightKg) > 0.01) {
        await addWeightEntry(userId, weightNum);
      }

      // 2. Update profiles table
      const { data, error } = await supabase
        .from('profiles')
        .update({
          age: ageNum,
          height_cm: heightNum,
          sex: sexInput,
          activity_level: activityInput,
          goal_type: goalInput
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      Alert.alert('Metrics Updated', 'Your metabolic details have been recalculated and saved!');
    } catch (err: any) {
      Alert.alert('Error Updating', err.message || 'Failed to update metabolic metrics.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Add Custom Exercise log
  const handleAddCustomExercise = async () => {
    if (!exerciseName.trim() || !exerciseCalories) {
      Alert.alert('Required Fields', 'Please enter exercise name and calories burned.');
      return;
    }

    const burned = parseInt(exerciseCalories);
    if (isNaN(burned) || burned <= 0) {
      Alert.alert('Invalid Input', 'Calories burned must be a positive number.');
      return;
    }

    setSavingExercise(true);
    try {
      const newLog: CustomExerciseLog = {
        id: Math.random().toString(),
        name: exerciseName.trim(),
        caloriesBurned: burned,
        loggedAt: new Date().toISOString()
      };

      const stored = await AsyncStorage.getItem('fitpulse_exercise_burn_logs');
      const parsed = stored ? JSON.parse(stored) : [];
      const updated = [newLog, ...parsed];
      
      await AsyncStorage.setItem('fitpulse_exercise_burn_logs', JSON.stringify(updated));
      setExerciseLogs([newLog, ...exerciseLogs]);
      setExerciseModalVisible(false);
      setExerciseName('');
      setExerciseCalories('');
      Alert.alert('Burn Logged', 'Workout calories added to your daily expenditure!');
    } catch (err) {
      Alert.alert('Error', 'Failed to log workout burn.');
    } finally {
      setSavingExercise(false);
    }
  };

  // Delete logged exercise
  const handleDeleteExercise = async (id: string, name: string) => {
    Alert.alert(
      'Delete Workout Burn',
      `Delete "${name}" log?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const stored = await AsyncStorage.getItem('fitpulse_exercise_burn_logs');
              if (stored) {
                const parsed = JSON.parse(stored) as CustomExerciseLog[];
                const filtered = parsed.filter(item => item.id !== id);
                await AsyncStorage.setItem('fitpulse_exercise_burn_logs', JSON.stringify(filtered));
                setExerciseLogs(exerciseLogs.filter(item => item.id !== id));
              }
            } catch (err) {
              console.error(err);
            }
          }
        }
      ]
    );
  };

  return (
    <LinearGradient colors={colors.backgroundGradient} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Energy Balance</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* Visual Calorie Balance Gauge */}
          <View style={[styles.gaugeCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Real-time Calorie Balance</Text>
            
            <View style={styles.balanceSummaryRow}>
              <View style={styles.balanceCol}>
                <Text style={[styles.balanceVal, { color: isDark ? '#c3f400' : '#65a30d' }]}>{caloriesGained.toLocaleString()}</Text>
                <Text style={[styles.balanceLbl, { color: colors.textSecondary }]}>Kcal Gained</Text>
                <Text style={[styles.balanceSub, { color: colors.textMuted }]}>From food log</Text>
              </View>

              <View style={[styles.vsCircle, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.vsText, { color: colors.textMuted }]}>VS</Text>
              </View>

              <View style={styles.balanceCol}>
                <Text style={[styles.balanceVal, { color: '#ff4a4a' }]}>{totalBurnedSoFar.toLocaleString()}</Text>
                <Text style={[styles.balanceLbl, { color: colors.textSecondary }]}>Kcal Burned</Text>
                <Text style={[styles.balanceSub, { color: colors.textMuted }]}>Active + Resting</Text>
              </View>
            </View>

            {/* Net Status Indicator */}
            <View style={[
              styles.netStatusPill, 
              isSurplus 
                ? { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.15)' : 'rgba(101, 163, 13, 0.15)', borderColor: isDark ? '#c3f400' : '#65a30d' }
                : { backgroundColor: 'rgba(255, 74, 74, 0.15)', borderColor: '#ff4a4a' }
            ]}>
              <Text style={[styles.netStatusText, { color: isSurplus ? (isDark ? '#c3f400' : '#65a30d') : '#ff4a4a' }]}>
                {isSurplus ? 'NET SURPLUS' : 'NET DEFICIT'}: {isSurplus ? '+' : ''}{netBalance} kcal so far
              </Text>
            </View>

            <View style={[styles.targetStatusBox, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.targetStatusText, { color: colors.textSecondary }]}>
                TDEE Daily Forecast: <Text style={{ color: colors.text, fontWeight: 'bold' }}>{fullDailyTdee} kcal</Text>
              </Text>
              <Text style={[styles.targetStatusSub, { color: colors.textMuted }]}>
                Goal Target Budget ({goalInput}): <Text style={{ color: isDark ? '#c3f400' : '#65a30d', fontWeight: 'bold' }}>{budgetGoal} kcal</Text>
              </Text>
            </View>
          </View>

          {/* Energy Burn breakdown list */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Expenditure Breakdown</Text>
              <TouchableOpacity 
                style={[styles.btnLogWorkout, { backgroundColor: isDark ? '#c3f400' : '#65a30d' }]}
                onPress={() => setExerciseModalVisible(true)}
              >
                <Ionicons name="flame-outline" size={14} color={isDark ? "#051424" : "#ffffff"} />
                <Text style={[styles.btnLogWorkoutText, { color: isDark ? "#051424" : "#ffffff" }]}>LOG WORKOUT BURN</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.breakdownList}>
              <View style={[styles.breakdownItem, { borderBottomColor: colors.borderSubtle }]}>
                <View style={styles.itemTitleRow}>
                  <Ionicons name="time-outline" size={18} color={colors.textMuted} />
                  <Text style={[styles.breakdownName, { color: colors.text }]}>Resting Metabolic Rate (BMR)</Text>
                </View>
                <Text style={[styles.breakdownVal, { color: colors.text }]}>{bmrBurnedSoFar} kcal <Text style={[styles.breakdownSub, { color: colors.textMuted }]}>/{Math.round(bmr)} kcal base</Text></Text>
              </View>

              <View style={[styles.breakdownItem, { borderBottomColor: colors.borderSubtle }]}>
                <View style={styles.itemTitleRow}>
                  <Ionicons name="walk-outline" size={18} color={isDark ? "#c3f400" : "#65a30d"} />
                  <Text style={[styles.breakdownName, { color: colors.text }]}>Active Steps Burn</Text>
                </View>
                <Text style={[styles.breakdownVal, { color: colors.text }]}>{stepsBurn} kcal <Text style={[styles.breakdownSub, { color: colors.textMuted }]}>({dailySteps.toLocaleString()} steps)</Text></Text>
              </View>

              {exerciseLogs.map((item) => (
                <View key={item.id} style={[styles.breakdownItem, { borderBottomColor: colors.borderSubtle }]}>
                  <View style={styles.itemTitleRow}>
                    <Ionicons name="barbell-outline" size={18} color="#ff4a4a" />
                    <Text style={[styles.breakdownName, { color: colors.text }]}>{item.name}</Text>
                    <TouchableOpacity onPress={() => handleDeleteExercise(item.id, item.name)} style={styles.btnDeleteWorkout}>
                      <Ionicons name="trash-outline" size={12} color="#ff4a4a" />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.breakdownVal, { color: '#ff4a4a' }]}>+{item.caloriesBurned} kcal</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Interactive BMR/TDEE Calibration Form */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="calculator-outline" size={18} color={isDark ? "#c3f400" : "#65a30d"} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Interactive TDEE Calculator</Text>
            </View>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Adjust your physical attributes and active habits to immediately calibrate BMR & energy targets. These updates save directly to your profile.
            </Text>

            <View style={styles.stepperContainerRow}>
              <View style={styles.stepperHalf}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>WEIGHT (kg)</Text>
                <View style={[styles.miniStepper, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                  <TouchableOpacity onPress={() => setWeightInput(prev => Math.max(30, prev - 1))} style={styles.miniStepperBtn}>
                    <Ionicons name="remove" size={16} color={isDark ? "#c3f400" : "#65a30d"} />
                  </TouchableOpacity>
                  <Text style={[styles.miniStepperVal, { color: colors.text }]}>{weightInput} kg</Text>
                  <TouchableOpacity onPress={() => setWeightInput(prev => Math.min(250, prev + 1))} style={styles.miniStepperBtn}>
                    <Ionicons name="add" size={16} color={isDark ? "#c3f400" : "#65a30d"} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.stepperHalf}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>HEIGHT (cm)</Text>
                <View style={[styles.miniStepper, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                  <TouchableOpacity onPress={() => setHeightInput(prev => Math.max(100, prev - 1))} style={styles.miniStepperBtn}>
                    <Ionicons name="remove" size={16} color={isDark ? "#c3f400" : "#65a30d"} />
                  </TouchableOpacity>
                  <Text style={[styles.miniStepperVal, { color: colors.text }]}>{heightInput} cm</Text>
                  <TouchableOpacity onPress={() => setHeightInput(prev => Math.min(250, prev + 1))} style={styles.miniStepperBtn}>
                    <Ionicons name="add" size={16} color={isDark ? "#c3f400" : "#65a30d"} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.stepperContainerRow}>
              <View style={styles.stepperHalf}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>AGE (Years)</Text>
                <View style={[styles.miniStepper, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                  <TouchableOpacity onPress={() => setAgeInput(prev => Math.max(10, prev - 1))} style={styles.miniStepperBtn}>
                    <Ionicons name="remove" size={16} color={isDark ? "#c3f400" : "#65a30d"} />
                  </TouchableOpacity>
                  <Text style={[styles.miniStepperVal, { color: colors.text }]}>{ageInput} yrs</Text>
                  <TouchableOpacity onPress={() => setAgeInput(prev => Math.min(100, prev + 1))} style={styles.miniStepperBtn}>
                    <Ionicons name="add" size={16} color={isDark ? "#c3f400" : "#65a30d"} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.fieldHalf}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>SEX</Text>
                <View style={[styles.toggleRow, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                  {['male', 'female'].map((gender) => (
                    <TouchableOpacity
                      key={gender}
                      style={[
                        styles.toggleBtn, 
                        sexInput === gender && [styles.toggleBtnActive, { backgroundColor: isDark ? '#c3f400' : '#65a30d' }]
                      ]}
                      onPress={() => setSexInput(gender as any)}
                    >
                      <Text style={[
                        styles.toggleBtnText, 
                        { color: colors.textMuted },
                        sexInput === gender && { color: isDark ? '#051424' : '#ffffff' }
                      ]}>
                        {gender.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>ACTIVITY LEVEL</Text>
              <View style={[styles.tabSelector, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                {['sedentary', 'light', 'moderate', 'active'].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.tabBtn, 
                      activityInput === level && [styles.tabBtnActive, { backgroundColor: isDark ? '#c3f400' : '#65a30d' }]
                    ]}
                    onPress={() => setActivityInput(level as any)}
                  >
                    <Text style={[
                      styles.tabBtnText, 
                      { color: colors.textMuted },
                      activityInput === level && { color: isDark ? '#051424' : '#ffffff' }
                    ]}>
                      {level.substring(0, 3).toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.activityDescription, { color: colors.textMuted }]}>
                {activityInput === 'sedentary' && 'Sedentary: Desk job, little to no daily exercise (Multiplier: 1.2)'}
                {activityInput === 'light' && 'Lightly Active: Light exercises 1-3 days/week (Multiplier: 1.375)'}
                {activityInput === 'moderate' && 'Moderately Active: Moderate training 3-5 days/week (Multiplier: 1.55)'}
                {activityInput === 'active' && 'Very Active: Hard workouts/sports 6-7 days/week (Multiplier: 1.725)'}
              </Text>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>GOAL OBJECTIVE</Text>
              <View style={[styles.tabSelector, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                {['lose', 'maintain', 'gain'].map((goal) => (
                  <TouchableOpacity
                    key={goal}
                    style={[
                      styles.tabBtn, 
                      goalInput === goal && [styles.tabBtnActive, { backgroundColor: isDark ? '#c3f400' : '#65a30d' }]
                    ]}
                    onPress={() => setGoalInput(goal as any)}
                  >
                    <Text style={[
                      styles.tabBtnText, 
                      { color: colors.textMuted },
                      goalInput === goal && { color: isDark ? '#051424' : '#ffffff' }
                    ]}>
                      {goal.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.btnSave, { backgroundColor: isDark ? '#c3f400' : '#65a30d' }, updatingProfile && { opacity: 0.7 }]}
              onPress={handleSaveChanges}
              disabled={updatingProfile}
            >
              {updatingProfile ? (
                <ActivityIndicator size="small" color={isDark ? "#051424" : "#ffffff"} />
              ) : (
                <Text style={[styles.btnSaveText, { color: isDark ? "#051424" : "#ffffff" }]}>RECALIBRATE & SAVE METRICS</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Equation Visual Card */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Mifflin-St Jeor Formula</Text>
            <Text style={[styles.equationText, { color: isDark ? '#c3f400' : '#65a30d' }]}>
              BMR (Male) = 10 × Weight (kg) + 6.25 × Height (cm) - 5 × Age (y) + 5{'\n'}
              BMR (Female) = 10 × Weight (kg) + 6.25 × Height (cm) - 5 × Age (y) - 161
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Basal Metabolic Rate (BMR) represents the energy expended by your body at rest to maintain vital physiological processes. Daily expenditure (TDEE) factors in this baseline pro-rated by hour, plus physical movement.
            </Text>
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* Log Workout Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={exerciseModalVisible}
        onRequestClose={() => setExerciseModalVisible(false)}
      >
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>LOG WORKOUT BURN</Text>
              <TouchableOpacity onPress={() => setExerciseModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <Text style={[styles.modalFieldLabel, { color: colors.textMuted }]}>WORKOUT TYPE / NAME</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle, color: colors.text }]}
                placeholder="E.g., High-Intensity Interval Training, Gym Session"
                placeholderTextColor={colors.textMuted}
                value={exerciseName}
                onChangeText={setExerciseName}
              />

              <Text style={[styles.modalFieldLabel, { color: colors.textMuted }]}>CALORIES BURNED (kcal)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle, color: colors.text }]}
                placeholder="E.g., 350"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={exerciseCalories}
                onChangeText={setExerciseCalories}
              />

              <TouchableOpacity 
                style={[styles.modalSubmitBtn, { backgroundColor: isDark ? '#c3f400' : '#65a30d' }]}
                onPress={handleAddCustomExercise}
                disabled={savingExercise}
              >
                {savingExercise ? (
                  <ActivityIndicator size="small" color={isDark ? "#051424" : "#ffffff"} />
                ) : (
                  <Text style={[styles.modalSubmitBtnText, { color: isDark ? "#051424" : "#ffffff" }]}>LOG WORKOUT ENERGY</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  gaugeCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontFamily: 'Oswald',
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  balanceSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  balanceCol: {
    flex: 1,
    alignItems: 'center',
  },
  balanceVal: {
    fontFamily: 'Oswald',
    fontSize: 26,
    fontWeight: '700',
  },
  balanceLbl: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  balanceSub: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  vsCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  vsText: {
    fontFamily: 'Oswald',
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  netStatusPill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  netStatusText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  targetStatusBox: {
    backgroundColor: 'rgba(5, 20, 36, 0.4)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  targetStatusText: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#64748B',
  },
  targetStatusSub: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#64748B',
  },
  sectionCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 20,
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Oswald',
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
    marginBottom: 0,
  },
  btnLogWorkout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#c3f400',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  btnLogWorkoutText: {
    fontFamily: 'Oswald',
    fontSize: 9,
    fontWeight: '700',
    color: '#051424',
  },
  breakdownList: {
    gap: 12,
  },
  breakdownItem: {
    backgroundColor: 'rgba(5, 20, 36, 0.4)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  breakdownName: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '500',
    flexShrink: 1,
  },
  btnDeleteWorkout: {
    padding: 2,
    marginLeft: 4,
  },
  breakdownVal: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'right',
  },
  breakdownSub: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: '#64748B',
    fontWeight: 'normal',
  },
  description: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
    marginBottom: 16,
    marginTop: 4,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  fieldHalf: {
    flex: 1,
  },
  fieldLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: '#64748B',
    fontWeight: 'bold',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#ffffff',
    fontFamily: 'JetBrains Mono',
    fontSize: 13,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 2,
    height: 38,
  },
  toggleBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#334155',
  },
  toggleBtnText: {
    fontFamily: 'Oswald',
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  toggleBtnTextActive: {
    color: '#c3f400',
  },
  formSection: {
    marginBottom: 16,
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 2,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: '#334155',
  },
  tabBtnText: {
    fontFamily: 'Oswald',
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#c3f400',
  },
  activityDescription: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 14,
  },
  btnSave: {
    backgroundColor: '#c3f400',
    borderRadius: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  btnSaveText: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
    color: '#051424',
    letterSpacing: 0.5,
  },
  equationText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: '#c3f400',
    backgroundColor: 'rgba(5, 20, 36, 0.4)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 8,
    padding: 10,
    lineHeight: 14,
    marginBottom: 8,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(5, 20, 36, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0d1c2d',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#1c2b3c',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1c2b3c',
  },
  modalTitle: {
    fontFamily: 'Oswald',
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
  },
  modalForm: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  modalFieldLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: '#64748B',
    fontWeight: 'bold',
    marginBottom: 6,
    letterSpacing: 1,
  },
  modalInput: {
    backgroundColor: 'rgba(5, 20, 36, 0.4)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    color: '#ffffff',
    fontFamily: 'Inter',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  modalSubmitBtn: {
    backgroundColor: '#c3f400',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalSubmitBtnText: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '700',
    color: '#051424',
    letterSpacing: 1,
  },
  stepperContainerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  stepperHalf: {
    flex: 1,
  },
  miniStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 6,
    height: 40,
  },
  miniStepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniStepperVal: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
