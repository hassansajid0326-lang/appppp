import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../../lib/store';
import { useOfflineStore } from '../../../lib/offlineStore';
import { useAppTheme } from '../../../lib/theme';

export default function MealShortcutsScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useAppTheme();
  const { session } = useAuthStore();
  const userId = session?.user?.id || 'guest';
  
  // Use global Zustand offline store
  const { addFoodEntry, deleteFoodEntry, foodEntries, fetchFoodEntries } = useOfflineStore();

  const [loading, setLoading] = useState(false);

  // Stepper/Input States
  const [calories, setCalories] = useState<number>(450);
  const [protein, setProtein] = useState<number>(30);
  const [carbs, setCarbs] = useState<number>(50);
  const [fats, setFats] = useState<number>(15);

  const [mealName, setMealName] = useState('Breakfast Preset');
  const [isManualInput, setIsManualInput] = useState(false);
  
  // Custom unit state (e.g. calories: kcal; macros: grams/oz)
  const [macroUnit, setMacroUnit] = useState<'g' | 'oz'>('g');

  // Load logs on focus
  useFocusEffect(
    React.useCallback(() => {
      const todayStr = new Date().toISOString().split('T')[0];
      if (userId) {
        fetchFoodEntries(userId, todayStr);
      }
    }, [userId])
  );

  const handleLogMeal = async (name: string, cal: number, prot: number, carb: number, fat: number) => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      
      // Save using Zustand offline store action (syncs to Supabase!)
      if (userId) {
        await addFoodEntry(userId, todayStr, name, cal, prot, carb, fat);
      }

      Alert.alert('Meal Logged 🍽️', `${name} (${cal} kcal) added successfully.`);
    } catch (err) {
      Alert.alert('Error', 'Failed to log meal.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomLog = () => {
    if (!mealName.trim()) {
      Alert.alert('Validation Error', 'Please enter a meal name.');
      return;
    }
    // Convert oz to grams if necessary
    const factor = macroUnit === 'oz' ? 28.3495 : 1.0;
    const finalP = Math.round(protein * factor);
    const finalC = Math.round(carbs * factor);
    const finalF = Math.round(fats * factor);

    handleLogMeal(mealName, calories, finalP, finalC, finalF);
    setIsManualInput(false);
  };

  const handleDeleteLog = async (id: string) => {
    Alert.alert('Delete Log', 'Remove this meal log entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteFoodEntry(id);
        }
      }
    ]);
  };

  // Preset templates backed by medical dietetics
  const mealPresets = [
    {
      title: 'High Protein Breakfast',
      description: 'Oats, Egg Whites, Whey Protein. Optimal for muscle retention and early satiety.',
      calories: 420,
      protein: 35,
      carbs: 45,
      fats: 10,
      icon: 'egg-outline'
    },
    {
      title: 'Lean Athletic Lunch',
      description: 'Grilled Chicken Breast, Brown Rice, Broccoli. Clinical clean carbohydrate replenishment.',
      calories: 550,
      protein: 42,
      carbs: 60,
      fats: 12,
      icon: 'restaurant-outline'
    },
    {
      title: 'Keto Mediterranean Dinner',
      description: 'Baked Salmon, Olive Oil Greens, Avocado. High Omega-3 fatty acids for joint and heart protection.',
      calories: 610,
      protein: 38,
      carbs: 8,
      fats: 45,
      icon: 'fish-outline'
    },
    {
      title: 'Pre-Workout Energizer',
      description: 'Banana, Almond Butter, Whole Wheat Toast. Fast-acting glycogen replenishment.',
      calories: 280,
      protein: 8,
      carbs: 40,
      fats: 10,
      icon: 'flash-outline'
    }
  ];

  // Filter food entries to display only today's logged items
  const todayStr = new Date().toISOString().split('T')[0];
  const todayMeals = foodEntries.filter(item => item.date === todayStr);

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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Dietary Science Log</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* Clinical Nutrition Info Banner */}
          <View style={[styles.scienceBanner, { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.05)' : 'rgba(195, 244, 0, 0.12)', borderColor: isDark ? 'rgba(195, 244, 0, 0.2)' : 'rgba(195, 244, 0, 0.3)' }]}>
            <Ionicons name="medical-outline" size={16} color={isDark ? '#c3f400' : '#4d7c0f'} />
            <Text style={[styles.scienceBannerText, { color: colors.textSecondary }]}>
              Dietetic Standard: Distribute daily protein intake across 3-4 meals (0.4g/kg per meal) to maximize muscle protein synthesis (MPS) spikes.
            </Text>
          </View>

          {/* Preset Shortcuts */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Medical Dietetic Presets</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>Tap to log instantly with precise macronutrients</Text>
          </View>

          {mealPresets.map((preset, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={[styles.presetCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => handleLogMeal(preset.title, preset.calories, preset.protein, preset.carbs, preset.fats)}
            >
              <View style={styles.presetLeft}>
                <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.1)' : 'rgba(195, 244, 0, 0.2)' }]}>
                  <Ionicons name={preset.icon as any} size={22} color={isDark ? '#c3f400' : '#4d7c0f'} />
                </View>
                <View style={styles.presetInfo}>
                  <Text style={[styles.presetTitle, { color: colors.text }]}>{preset.title}</Text>
                  <Text style={[styles.presetDesc, { color: colors.textMuted }]}>{preset.description}</Text>
                  
                  <View style={styles.macroPillRow}>
                    <Text style={[styles.macroLabel, { color: '#ef4444' }]}>P: {preset.protein}g</Text>
                    <Text style={[styles.macroLabel, { color: '#3b82f6' }]}>C: {preset.carbs}g</Text>
                    <Text style={[styles.macroLabel, { color: '#eab308' }]}>F: {preset.fats}g</Text>
                  </View>
                </View>
              </View>
              <View style={styles.presetRight}>
                <Text style={[styles.kcalVal, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>{preset.calories}</Text>
                <Text style={[styles.kcalUnit, { color: colors.textMuted }]}>KCAL</Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Custom Logger Panel */}
          <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.inputHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Log Custom Nutrition</Text>
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
                  {isManualInput ? 'Quick Steppers' : 'Custom Manual'}
                </Text>
              </TouchableOpacity>
            </View>

            {isManualInput ? (
              <View style={styles.manualWrapper}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>MEAL NAME</Text>
                <TextInput
                  style={[styles.manualInput, { backgroundColor: isDark ? '#051424' : '#f8fafc', borderColor: colors.cardBorder, color: colors.text }]}
                  placeholder="e.g. Chicken Salad Bowl"
                  placeholderTextColor={colors.textMuted}
                  value={mealName}
                  onChangeText={setMealName}
                />

                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>MACRO UNIT</Text>
                <View style={[styles.unitSelector, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f1f5f9', borderColor: colors.cardBorder }]}>
                  {(['g', 'oz'] as const).map((u) => (
                    <TouchableOpacity 
                      key={u}
                      style={[
                        styles.unitBtn, 
                        macroUnit === u && [styles.unitBtnActive, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]
                      ]}
                      onPress={() => setMacroUnit(u)}
                    >
                      <Text style={[
                        styles.unitBtnText, 
                        { color: colors.textMuted },
                        macroUnit === u && [styles.unitBtnTextActive, { color: isDark ? '#c3f400' : '#051424' }]
                      ]}>
                        {u === 'g' ? 'GRAMS (G)' : 'OUNCES (OZ)'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.manualMacrosGrid}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>CALORIES (KCAL)</Text>
                    <TextInput
                      style={[styles.macroManualInput, { backgroundColor: isDark ? '#051424' : '#f8fafc', borderColor: colors.cardBorder, color: colors.text }]}
                      keyboardType="numeric"
                      value={calories.toString()}
                      onChangeText={(val) => setCalories(parseInt(val) || 0)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>PROTEIN ({macroUnit.toUpperCase()})</Text>
                    <TextInput
                      style={[styles.macroManualInput, { backgroundColor: isDark ? '#051424' : '#f8fafc', borderColor: colors.cardBorder, color: colors.text }]}
                      keyboardType="numeric"
                      value={protein.toString()}
                      onChangeText={(val) => setProtein(parseInt(val) || 0)}
                    />
                  </View>
                </View>

                <View style={styles.manualMacrosGrid}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>CARBS ({macroUnit.toUpperCase()})</Text>
                    <TextInput
                      style={[styles.macroManualInput, { backgroundColor: isDark ? '#051424' : '#f8fafc', borderColor: colors.cardBorder, color: colors.text }]}
                      keyboardType="numeric"
                      value={carbs.toString()}
                      onChangeText={(val) => setCarbs(parseInt(val) || 0)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>FATS ({macroUnit.toUpperCase()})</Text>
                    <TextInput
                      style={[styles.macroManualInput, { backgroundColor: isDark ? '#051424' : '#f8fafc', borderColor: colors.cardBorder, color: colors.text }]}
                      keyboardType="numeric"
                      value={fats.toString()}
                      onChangeText={(val) => setFats(parseInt(val) || 0)}
                    />
                  </View>
                </View>

                <TouchableOpacity style={[styles.btnSave, { backgroundColor: colors.primary }]} onPress={handleCustomLog}>
                  <Text style={[styles.btnSaveText, { color: colors.onPrimary }]}>ADD CUSTOM MEAL</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.steppersWrapper}>
                
                {/* Calories Stepper */}
                <View style={styles.stepperRow}>
                  <Text style={[styles.stepperLabel, { color: colors.textSecondary }]}>CALORIES BUDGET</Text>
                  <View style={[styles.stepperControls, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : '#f1f5f9', borderColor: colors.cardBorder }]}>
                    <TouchableOpacity style={[styles.controlBtn, { backgroundColor: colors.primary }]} onPress={() => setCalories(prev => Math.max(0, prev - 50))}>
                      <Ionicons name="remove" size={16} color={colors.onPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.stepperVal, { color: colors.text }]}>{calories} kcal</Text>
                    <TouchableOpacity style={[styles.controlBtn, { backgroundColor: colors.primary }]} onPress={() => setCalories(prev => prev + 50)}>
                      <Ionicons name="add" size={16} color={colors.onPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Protein Stepper */}
                <View style={styles.stepperRow}>
                  <Text style={[styles.stepperLabel, { color: colors.textSecondary }]}>PROTEIN INTAKE</Text>
                  <View style={[styles.stepperControls, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : '#f1f5f9', borderColor: colors.cardBorder }]}>
                    <TouchableOpacity style={[styles.controlBtn, { backgroundColor: colors.primary }]} onPress={() => setProtein(prev => Math.max(0, prev - 5))}>
                      <Ionicons name="remove" size={16} color={colors.onPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.stepperVal, { color: colors.text }]}>{protein}g</Text>
                    <TouchableOpacity style={[styles.controlBtn, { backgroundColor: colors.primary }]} onPress={() => setProtein(prev => prev + 5)}>
                      <Ionicons name="add" size={16} color={colors.onPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Carbs Stepper */}
                <View style={styles.stepperRow}>
                  <Text style={[styles.stepperLabel, { color: colors.textSecondary }]}>CARBOHYDRATES</Text>
                  <View style={[styles.stepperControls, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : '#f1f5f9', borderColor: colors.cardBorder }]}>
                    <TouchableOpacity style={[styles.controlBtn, { backgroundColor: colors.primary }]} onPress={() => setCarbs(prev => Math.max(0, prev - 5))}>
                      <Ionicons name="remove" size={16} color={colors.onPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.stepperVal, { color: colors.text }]}>{carbs}g</Text>
                    <TouchableOpacity style={[styles.controlBtn, { backgroundColor: colors.primary }]} onPress={() => setCarbs(prev => prev + 5)}>
                      <Ionicons name="add" size={16} color={colors.onPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Fats Stepper */}
                <View style={styles.stepperRow}>
                  <Text style={[styles.stepperLabel, { color: colors.textSecondary }]}>DIETARY FATS</Text>
                  <View style={[styles.stepperControls, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : '#f1f5f9', borderColor: colors.cardBorder }]}>
                    <TouchableOpacity style={[styles.controlBtn, { backgroundColor: colors.primary }]} onPress={() => setFats(prev => Math.max(0, prev - 5))}>
                      <Ionicons name="remove" size={16} color={colors.onPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.stepperVal, { color: colors.text }]}>{fats}g</Text>
                    <TouchableOpacity style={[styles.controlBtn, { backgroundColor: colors.primary }]} onPress={() => setFats(prev => prev + 5)}>
                      <Ionicons name="add" size={16} color={colors.onPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.btnSave, { backgroundColor: colors.primary }]} 
                  onPress={() => handleLogMeal('Quick Custom Log', calories, protein, carbs, fats)}
                >
                  <Text style={[styles.btnSaveText, { color: colors.onPrimary }]}>ADD QUICK LOG</Text>
                </TouchableOpacity>

              </View>
            )}
          </View>

          {/* Meals History */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Logged Meals History</Text>
            
            {todayMeals.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No meal entries logged today.</Text>
            ) : (
              <View style={styles.historyList}>
                {todayMeals.map((item) => (
                  <View key={item.id} style={[styles.historyRow, { backgroundColor: isDark ? 'rgba(5, 20, 36, 0.4)' : '#f8fafc', borderColor: colors.cardBorder }]}>
                    <View>
                      <Text style={[styles.historyName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                        {new Date(item.logged_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} • P:{item.protein_g}g C:{item.carbs_g}g F:{item.fat_g}g
                      </Text>
                    </View>
                    <View style={styles.historyRight}>
                      <Text style={[styles.historyCal, { color: colors.text }]}>{item.calories} kcal</Text>
                      <TouchableOpacity onPress={() => handleDeleteLog(item.id)} style={styles.btnDelete}>
                        <Ionicons name="trash-outline" size={14} color="#ff4a4a" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
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
  sectionHeader: {
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: 'Oswald',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sectionSubtitle: {
    fontFamily: 'Inter',
    fontSize: 11,
    marginTop: 2,
  },
  presetCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  presetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetInfo: {
    flex: 1,
    gap: 2,
  },
  presetTitle: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '600',
  },
  presetDesc: {
    fontFamily: 'Inter',
    fontSize: 10,
    lineHeight: 14,
  },
  macroPillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  macroLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    fontWeight: 'bold',
  },
  presetRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  kcalVal: {
    fontFamily: 'Oswald',
    fontSize: 18,
    fontWeight: '700',
  },
  kcalUnit: {
    fontFamily: 'Inter',
    fontSize: 8,
    fontWeight: 'bold',
  },
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
    gap: 12,
  },
  fieldLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  manualInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontFamily: 'Oswald',
    fontSize: 14,
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
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  unitBtnActive: {},
  unitBtnText: {
    fontFamily: 'Oswald',
    fontSize: 10,
    fontWeight: '700',
  },
  unitBtnTextActive: {},
  manualMacrosGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  macroManualInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontFamily: 'Oswald',
    fontSize: 16,
    textAlign: 'center',
  },
  steppersWrapper: {
    gap: 14,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepperLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    fontWeight: 'bold',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    padding: 2,
  },
  controlBtn: {
    width: 28,
    height: 28,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperVal: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 12,
    textAlign: 'center',
    minWidth: 70,
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
  historyName: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '600',
  },
  historyDate: {
    fontFamily: 'Inter',
    fontSize: 10,
    marginTop: 2,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyCal: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '600',
  },
  btnDelete: {
    padding: 4,
  },
});
