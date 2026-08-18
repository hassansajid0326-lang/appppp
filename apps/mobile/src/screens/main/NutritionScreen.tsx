import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../lib/store';
import { useOfflineStore } from '../../lib/offlineStore';

export default function NutritionScreen() {
  const { profile, session } = useAuthStore();
  const { 
    foodEntries, 
    latestWeightKg, 
    dailySteps,
    addFoodEntry, 
    deleteFoodEntry, 
    fetchFoodEntries 
  } = useOfflineStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const userId = session?.user?.id;
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (userId) {
      fetchFoodEntries(userId, todayStr);
    }
  }, [userId]);

  // 1. Calculate Mifflin-St Jeor BMR
  const heightVal = profile?.height_cm || 170;
  const ageVal = profile?.age || 25;
  const sexVal = profile?.sex || 'other';

  let bmr = 1600;
  if (sexVal === 'male') {
    bmr = 10 * latestWeightKg + 6.25 * heightVal - 5 * ageVal + 5;
  } else if (sexVal === 'female') {
    bmr = 10 * latestWeightKg + 6.25 * heightVal - 5 * ageVal - 161;
  } else {
    bmr = 10 * latestWeightKg + 6.25 * heightVal - 5 * ageVal - 78;
  }

  // 2. Activity Multiplier
  const activityLevel = profile?.activity_level || 'moderate';
  let activityMultiplier = 1.55;
  if (activityLevel === 'sedentary') activityMultiplier = 1.2;
  else if (activityLevel === 'light') activityMultiplier = 1.375;
  else if (activityLevel === 'moderate') activityMultiplier = 1.55;
  else if (activityLevel === 'active') activityMultiplier = 1.725;

  // TDEE = BMR * ActivityMultiplier + Active Calories (MET walking)
  const activeStepsCalories = 0.000525 * latestWeightKg * dailySteps;
  const tdee = Math.round(bmr * activityMultiplier + activeStepsCalories);

  // 3. Goal Adjustment
  const goalType = profile?.goal_type || 'maintain';
  let targetCalories = tdee;
  if (goalType === 'lose') {
    targetCalories = Math.max(1200, tdee - 500); // 500 kcal deficit (capped at healthy min of 1200)
  } else if (goalType === 'gain') {
    targetCalories = tdee + 500; // 500 kcal surplus
  }

  // Calculate Consumed Nutrients
  const consumedCalories = foodEntries.reduce((sum, entry) => sum + entry.calories, 0);
  const consumedProtein = foodEntries.reduce((sum, entry) => sum + (entry.protein_g || 0), 0);
  const consumedCarbs = foodEntries.reduce((sum, entry) => sum + (entry.carbs_g || 0), 0);
  const consumedFat = foodEntries.reduce((sum, entry) => sum + (entry.fat_g || 0), 0);

  // Calorie Target breakdown (Protein 30%, Carbs 40%, Fat 30%)
  const targetProtein = Math.round((targetCalories * 0.3) / 4);
  const targetCarbs = Math.round((targetCalories * 0.4) / 4);
  const targetFat = Math.round((targetCalories * 0.3) / 9);

  // Remaining Calories
  const remainingCalories = Math.max(0, targetCalories - consumedCalories);
  const progressPercent = Math.min(100, Math.round((consumedCalories / targetCalories) * 100));

  const handleAddFood = async () => {
    if (!foodName.trim() || !calories) {
      Alert.alert('Required Fields', 'Please enter a food name and calories.');
      return;
    }

    const calsVal = parseFloat(calories);
    const protVal = parseFloat(protein) || 0;
    const carbVal = parseFloat(carbs) || 0;
    const fatVal = parseFloat(fat) || 0;

    if (isNaN(calsVal) || calsVal < 0) {
      Alert.alert('Invalid Input', 'Calories must be a positive number.');
      return;
    }

    setSubmitting(true);
    try {
      if (userId) {
        await addFoodEntry(userId, todayStr, foodName.trim(), calsVal, protVal, carbVal, fatVal);
        setModalVisible(false);
        // Clear input fields
        setFoodName('');
        setCalories('');
        setProtein('');
        setCarbs('');
        setFat('');
      }
    } catch (e: any) {
      Alert.alert('Logging Error', e.message || 'Failed to save food entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEntry = (id: string, name: string) => {
    Alert.alert(
      'Delete Entry',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteFoodEntry(id)
        }
      ]
    );
  };

  return (
    <LinearGradient colors={['#051424', '#0d1c2d', '#010f1f']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>NUTRITION PROTOCOL</Text>
              <Text style={styles.subtitle}>FUEL LOG & ENERGY BALANCE</Text>
            </View>
            <TouchableOpacity style={styles.logButton} onPress={() => setModalVisible(true)}>
              <Ionicons name="add" size={20} color="#051424" />
              <Text style={styles.logButtonText}>LOG FOOD</Text>
            </TouchableOpacity>
          </View>

          {/* Calorie Ring summary card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Daily Calorie Budget</Text>
            <View style={styles.calorieBudgetRow}>
              
              <View style={styles.calorieSection}>
                <Text style={styles.calorieValue}>{targetCalories}</Text>
                <Text style={styles.calorieLabel}>Budget Goal</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.calorieSection}>
                <Text style={[styles.calorieValue, { color: '#c3f400' }]}>{consumedCalories}</Text>
                <Text style={styles.calorieLabel}>Consumed</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.calorieSection}>
                <Text style={[styles.calorieValue, { color: '#64748B' }]}>{remainingCalories}</Text>
                <Text style={styles.calorieLabel}>Remaining</Text>
              </View>

            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.progressText}>{progressPercent}% of daily budget used</Text>
            </View>
          </View>

          {/* Macronutrients */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Macronutrients Breakdown</Text>

            {/* Protein */}
            <View style={styles.macroRow}>
              <View style={styles.macroTextRow}>
                <Text style={styles.macroName}>Protein</Text>
                <Text style={styles.macroStats}>{consumedProtein}g / {targetProtein}g</Text>
              </View>
              <View style={styles.macroBarBg}>
                <View style={[styles.macroBarFill, { width: `${Math.min(100, (consumedProtein / targetProtein) * 100)}%`, backgroundColor: '#ff4a4a' }]} />
              </View>
            </View>

            {/* Carbs */}
            <View style={styles.macroRow}>
              <View style={styles.macroTextRow}>
                <Text style={styles.macroName}>Carbs</Text>
                <Text style={styles.macroStats}>{consumedCarbs}g / {targetCarbs}g</Text>
              </View>
              <View style={styles.macroBarBg}>
                <View style={[styles.macroBarFill, { width: `${Math.min(100, (consumedCarbs / targetCarbs) * 100)}%`, backgroundColor: '#38bdf8' }]} />
              </View>
            </View>

            {/* Fat */}
            <View style={styles.macroRow}>
              <View style={styles.macroTextRow}>
                <Text style={styles.macroName}>Fat</Text>
                <Text style={styles.macroStats}>{consumedFat}g / {targetFat}g</Text>
              </View>
              <View style={styles.macroBarBg}>
                <View style={[styles.macroBarFill, { width: `${Math.min(100, (consumedFat / targetFat) * 100)}%`, backgroundColor: '#eab308' }]} />
              </View>
            </View>
          </View>

          {/* Food list entries */}
          <Text style={styles.sectionTitle}>TODAY'S LOG</Text>
          {foodEntries.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="fast-food-outline" size={32} color="#334155" />
              <Text style={styles.emptyText}>No food entries logged for today.</Text>
            </View>
          ) : (
            foodEntries.map((entry) => (
              <View key={entry.id} style={styles.foodItem}>
                <View style={styles.foodInfo}>
                  <Text style={styles.foodName}>{entry.name}</Text>
                  <Text style={styles.foodMacros}>
                    P: {entry.protein_g}g  •  C: {entry.carbs_g}g  •  F: {entry.fat_g}g
                  </Text>
                </View>
                <View style={styles.foodActionRow}>
                  <Text style={styles.foodCalories}>{entry.calories} kcal</Text>
                  <TouchableOpacity 
                    style={styles.deleteButton} 
                    onPress={() => handleDeleteEntry(entry.id, entry.name)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ff4a4a" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

        </ScrollView>
      </SafeAreaView>

      {/* Log Food Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>LOG FUEL ENTRY</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm} showsVerticalScrollIndicator={false}>
              
              <Text style={styles.inputLabel}>FOOD NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Grilled Chicken Salad"
                placeholderTextColor="#334155"
                value={foodName}
                onChangeText={setFoodName}
              />

              <Text style={styles.inputLabel}>CALORIES (kcal)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 350"
                placeholderTextColor="#334155"
                keyboardType="numeric"
                value={calories}
                onChangeText={setCalories}
              />

              <View style={styles.macroFormRow}>
                <View style={styles.macroField}>
                  <Text style={styles.inputLabel}>PROTEIN (g)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 30"
                    placeholderTextColor="#334155"
                    keyboardType="numeric"
                    value={protein}
                    onChangeText={setProtein}
                  />
                </View>

                <View style={styles.macroField}>
                  <Text style={styles.inputLabel}>CARBS (g)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 15"
                    placeholderTextColor="#334155"
                    keyboardType="numeric"
                    value={carbs}
                    onChangeText={setCarbs}
                  />
                </View>

                <View style={styles.macroField}>
                  <Text style={styles.inputLabel}>FAT (g)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 10"
                    placeholderTextColor="#334155"
                    keyboardType="numeric"
                    value={fat}
                    onChangeText={setFat}
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={styles.submitButton} 
                onPress={handleAddFood}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#051424" />
                ) : (
                  <Text style={styles.submitButtonText}>ADD FOOD ENTRY</Text>
                )}
              </TouchableOpacity>

            </ScrollView>

          </View>
        </View>
      </Modal>

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Oswald',
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  subtitle: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    letterSpacing: 1,
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#c3f400',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  logButtonText: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
    color: '#051424',
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 20,
    alignSelf: 'stretch',
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: 'Oswald',
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
    marginBottom: 16,
  },
  calorieBudgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calorieSection: {
    flex: 1,
    alignItems: 'center',
  },
  calorieValue: {
    fontFamily: 'Oswald',
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  calorieLabel: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: '#1e293b',
  },
  progressContainer: {
    marginTop: 4,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#c3f400',
    borderRadius: 4,
  },
  progressText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
  },
  macroRow: {
    marginBottom: 12,
  },
  macroTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  macroName: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  macroStats: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    color: '#64748B',
  },
  macroBarBg: {
    height: 6,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionTitle: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: 'rgba(30, 41, 59, 0.2)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
  },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  foodMacros: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  foodActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  foodCalories: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '700',
    color: '#c3f400',
  },
  deleteButton: {
    padding: 4,
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
    maxHeight: '85%',
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
    paddingTop: 16,
  },
  inputLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: '#64748B',
    fontWeight: 'bold',
    marginBottom: 6,
    letterSpacing: 1,
  },
  input: {
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
  macroFormRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  macroField: {
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#c3f400',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '700',
    color: '#051424',
    letterSpacing: 1,
  },
});
