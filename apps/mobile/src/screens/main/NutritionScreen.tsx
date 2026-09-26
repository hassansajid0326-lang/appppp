import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  Alert,
  ActivityIndicator,
  FlatList,
  Platform,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../lib/store';
import { useOfflineStore, OfflineFoodEntry } from '../../lib/offlineStore';
import { useAppTheme } from '../../lib/theme';
import {
  UNIVERSAL_FOOD_DATABASE,
  DIET_CATEGORIES,
  MEAL_CATEGORIES,
  FoodItem,
  DietType,
  MealCategory,
  ServingOption,
  getFoodRecipeVideoUrl
} from '../../lib/foodDatabase';
import FoodVisualCard from '../../components/FoodVisualCard';

// Memoized Food List Item for 60fps scrolling
interface FoodListItemProps {
  item: FoodItem;
  onPreview: (food: FoodItem) => void;
  onQuickLog: (food: FoodItem) => void;
}

const FoodListItem = React.memo(({ item, onPreview, onQuickLog }: FoodListItemProps) => {
  const { colors, isDark } = useAppTheme();

  const getDietTagStyle = (diet: string) => {
    switch (diet) {
      case 'veg':
        return { color: '#10b981', label: 'VEG' };
      case 'vegan':
        return { color: '#06b6d4', label: 'VEGAN' };
      case 'keto':
        return { color: '#f59e0b', label: 'KETO' };
      case 'high_protein':
        return { color: isDark ? '#c3f400' : '#65a30d', label: 'HIGH PROTEIN' };
      case 'desi':
        return { color: '#ec4899', label: 'DESI' };
      case 'mediterranean':
        return { color: '#38bdf8', label: 'MEDITERRANEAN' };
      default:
        return { color: '#ef4444', label: 'NON-VEG' };
    }
  };

  const tag = getDietTagStyle(item.diet_type);

  return (
    <TouchableOpacity
      style={[styles.foodItemCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      onPress={() => onPreview(item)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.image_url }}
        style={[styles.foodItemThumb, { backgroundColor: colors.cardSubtle }]}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={200}
      />

      <View style={styles.foodItemInfo}>
        <View style={styles.foodItemTopRow}>
          <View style={[styles.dietBadgeMini, { borderColor: tag.color }]}>
            <Text style={[styles.dietBadgeMiniText, { color: tag.color }]}>{tag.label}</Text>
          </View>
          {item.is_halal && (
            <View style={styles.halalBadgeMini}>
              <Text style={styles.halalBadgeMiniText}>HALAL</Text>
            </View>
          )}
          <Text style={[styles.prepTimeMini, { color: colors.textMuted }]}>⏱ {item.prep_time_min}m</Text>
        </View>

        <Text style={[styles.foodItemName, { color: colors.text }]} numberOfLines={2}>
          {item.name}
        </Text>

        <View style={styles.foodItemMacroRow}>
          <Text style={[styles.foodItemCal, { color: colors.text }]}>
            {item.calories_per_100g} <Text style={[styles.foodItemUnit, { color: colors.textMuted }]}>kcal</Text>
          </Text>
          <View style={[styles.macroPillMini, { backgroundColor: colors.cardSubtle }]}>
            <Text style={[styles.macroPillText, { color: isDark ? '#c3f400' : '#65a30d' }]}>P:{item.protein_g}g</Text>
          </View>
          <View style={[styles.macroPillMini, { backgroundColor: colors.cardSubtle }]}>
            <Text style={[styles.macroPillText, { color: '#38bdf8' }]}>C:{item.carbs_g}g</Text>
          </View>
          <View style={[styles.macroPillMini, { backgroundColor: colors.cardSubtle }]}>
            <Text style={[styles.macroPillText, { color: '#f59e0b' }]}>F:{item.fat_g}g</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.foodItemAddBtn}
        onPress={() => onQuickLog(item)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={18} color="#051424" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

export default function NutritionScreen() {
  const { profile, session } = useAuthStore();
  const { colors, isDark } = useAppTheme();
  const { 
    foodEntries, 
    latestWeightKg, 
    dailySteps,
    addFoodEntry, 
    deleteFoodEntry, 
    fetchFoodEntries,
    waterIntakeMl,
    waterGoalMl,
    addWaterIntake,
    resetWaterIntake,
    isFasting,
    fastingStartTime,
    fastingDurationHours,
    startFasting,
    stopFasting,
  } = useOfflineStore();

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDiet, setSelectedDiet] = useState<DietType>('all');
  const [selectedMealCategory, setSelectedMealCategory] = useState<MealCategory>('all');

  // Preview Food Item Modal
  const [previewFood, setPreviewFood] = useState<FoodItem | null>(null);

  // Manual Custom Food Log Modal
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');
  const [manualMealType, setManualMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [submitting, setSubmitting] = useState(false);

  // Fasting Elapsed Time live state
  const [fastingElapsedSec, setFastingElapsedSec] = useState(0);

  const userId = session?.user?.id || 'guest';
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (userId) {
      fetchFoodEntries(userId, todayStr);
    }
  }, [userId]);

  // Fasting timer interval
  useEffect(() => {
    let interval: any = null;
    if (isFasting && fastingStartTime) {
      const calculateElapsed = () => {
        const started = new Date(fastingStartTime).getTime();
        const diff = Math.max(0, Math.floor((Date.now() - started) / 1000));
        setFastingElapsedSec(diff);
      };
      calculateElapsed();
      interval = setInterval(calculateElapsed, 1000);
    } else {
      setFastingElapsedSec(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isFasting, fastingStartTime]);

  // 1. Calculate Target Energy & Macros based on profile goals
  const weightVal = latestWeightKg || (profile as any)?.target_weight_kg || 75;
  const heightVal = profile?.height_cm || 175;
  const ageVal = profile?.age || 26;
  const sexVal = profile?.sex || 'male';
  const goalType = (profile as any)?.goal_type || 'maintain';

  // Resting BMR (Mifflin-St Jeor formula)
  let baseBMR = 10 * weightVal + 6.25 * heightVal - 5 * ageVal;
  if (sexVal === 'male') baseBMR += 5;
  else if (sexVal === 'female') baseBMR -= 161;
  else baseBMR -= 78;

  // Active steps burn bonus
  const activeStepsCalories = Math.round(0.000525 * weightVal * dailySteps);

  // Target TDEE calculation
  let targetCalories = Math.round(baseBMR * 1.35 + activeStepsCalories);
  if (goalType === 'lose') targetCalories -= 500;
  else if (goalType === 'gain') targetCalories += 500;
  targetCalories = Math.max(1200, targetCalories);

  // Macro Targets: Protein: 2.2g/kg, Fat: 25% of cals, Carbs: remainder
  const targetProtein = Math.round(weightVal * 2.2);
  const targetFat = Math.round((targetCalories * 0.25) / 9);
  const targetCarbs = Math.max(50, Math.round((targetCalories - targetProtein * 4 - targetFat * 9) / 4));

  // Consumed Calculations
  const consumedCalories = foodEntries.reduce((sum, item) => sum + item.calories, 0);
  const consumedProtein = Math.round(foodEntries.reduce((sum, item) => sum + (item.protein_g || 0), 0) * 10) / 10;
  const consumedCarbs = Math.round(foodEntries.reduce((sum, item) => sum + (item.carbs_g || 0), 0) * 10) / 10;
  const consumedFat = Math.round(foodEntries.reduce((sum, item) => sum + (item.fat_g || 0), 0) * 10) / 10;

  const remainingCalories = Math.max(0, targetCalories - consumedCalories);
  const caloriePercent = Math.min(100, Math.round((consumedCalories / targetCalories) * 100));

  // Group food entries into Meal Buckets
  const mealBuckets = useMemo(() => {
    const buckets: Record<'breakfast' | 'lunch' | 'dinner' | 'snack', OfflineFoodEntry[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    foodEntries.forEach((entry) => {
      const type = (entry.meal_type || 'lunch').toLowerCase() as keyof typeof buckets;
      if (buckets[type]) {
        buckets[type].push(entry);
      } else {
        buckets.lunch.push(entry);
      }
    });
    return buckets;
  }, [foodEntries]);

  // Filtered Food Library
  const filteredFoods = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return UNIVERSAL_FOOD_DATABASE.filter((food) => {
      if (query) {
        const matchesName = food.name.toLowerCase().includes(query);
        const matchesDiet = food.diet_type.toLowerCase().includes(query);
        const matchesIng = food.ingredients.some((i) => i.toLowerCase().includes(query));
        if (!matchesName && !matchesDiet && !matchesIng) return false;
      }

      if (selectedDiet !== 'all') {
        if (selectedDiet === 'halal' && !food.is_halal) return false;
        if (selectedDiet !== 'halal' && food.diet_type !== selectedDiet) return false;
      }

      if (selectedMealCategory !== 'all' && food.category !== selectedMealCategory) {
        return false;
      }

      return true;
    });
  }, [searchQuery, selectedDiet, selectedMealCategory]);

  const handlePreviewFood = useCallback((food: FoodItem) => {
    setPreviewFood(food);
  }, []);

  const handleLogFoodFromModal = useCallback(
    async (food: FoodItem, serving: ServingOption, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
      const multiplier = serving.multiplier;
      const cals = Math.round(food.calories_per_100g * multiplier);
      const prot = Math.round(food.protein_g * multiplier * 10) / 10;
      const carb = Math.round(food.carbs_g * multiplier * 10) / 10;
      const fat = Math.round(food.fat_g * multiplier * 10) / 10;

      await addFoodEntry(
        userId,
        todayStr,
        `${food.name} (${serving.label})`,
        cals,
        prot,
        carb,
        fat,
        mealType,
        food.image_url
      );

      setPreviewFood(null);
      Alert.alert('Meal Logged', `Added ${food.name} (${cals} kcal) to ${mealType.toUpperCase()}.`);
    },
    [userId, todayStr, addFoodEntry]
  );

  const handleQuickLog = useCallback(
    async (food: FoodItem) => {
      const cals = food.calories_per_100g;
      await addFoodEntry(
        userId,
        todayStr,
        `${food.name} (100g)`,
        cals,
        food.protein_g,
        food.carbs_g,
        food.fat_g,
        'lunch',
        food.image_url
      );
      Alert.alert('Quick Logged', `Logged 100g of ${food.name} (${cals} kcal).`);
    },
    [userId, todayStr, addFoodEntry]
  );

  const handleAddManualFood = async () => {
    if (!manualName.trim() || !manualCalories) {
      Alert.alert('Required Fields', 'Please enter food name and calories.');
      return;
    }

    setSubmitting(true);
    try {
      await addFoodEntry(
        userId,
        todayStr,
        manualName.trim(),
        Number(manualCalories) || 0,
        Number(manualProtein) || 0,
        Number(manualCarbs) || 0,
        Number(manualFat) || 0,
        manualMealType
      );

      setManualName('');
      setManualCalories('');
      setManualProtein('');
      setManualCarbs('');
      setManualFat('');
      setManualModalVisible(false);
      Alert.alert('Logged Successfully', 'Custom food entry saved to your daily nutrition log.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save food entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatFastingTime = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient colors={colors.backgroundGradient} style={styles.container}>
        {/* Top Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>KINETIC NUTRITION VAULT</Text>
            <Text style={[styles.headerSubtitle, { color: isDark ? '#c3f400' : '#65a30d' }]}>UNIVERSAL DIET & RECIPE SYSTEM</Text>
          </View>
          <TouchableOpacity
            style={styles.customLogBtn}
            onPress={() => setManualModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={15} color="#051424" />
            <Text style={styles.customLogBtnText}>CUSTOM</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* 1. Dynamic Calorie & Kinetic Macro Cockpit */}
          <View style={[styles.cockpitCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.cockpitHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.cockpitTag, { color: colors.textMuted }]}>DAILY ENERGY EQUILIBRIUM</Text>
                <Text style={[styles.cockpitGoal, { color: '#38bdf8' }]} numberOfLines={1}>
                  GOAL: {goalType === 'lose' ? 'FAT LOSS DEFICIT (-500 kcal)' : goalType === 'gain' ? 'CLEAN BULK (+500 kcal)' : 'METABOLIC MAINTENANCE'}
                </Text>
              </View>
              <View style={[styles.stepsBurnBadge, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(217, 119, 6, 0.12)' }]}>
                <Ionicons name="flame" size={12} color="#f59e0b" />
                <Text style={styles.stepsBurnText}>+{activeStepsCalories} kcal</Text>
              </View>
            </View>

            {/* Calorie Arc / Progress Stats */}
            <View style={styles.calorieRow}>
              <View style={[styles.calorieCircleBox, { backgroundColor: colors.cardSubtle }]}>
                <Text style={[styles.calorieBigVal, { color: colors.text }]}>{consumedCalories}</Text>
                <Text style={[styles.calorieBigLabel, { color: colors.textMuted }]}>CONSUMED</Text>
                <View style={[styles.calorieBarTrack, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
                  <View style={[styles.calorieBarFill, { backgroundColor: isDark ? '#c3f400' : '#65a30d', width: `${caloriePercent}%` }]} />
                </View>
              </View>

              <View style={[styles.calorieDivider, { backgroundColor: colors.borderSubtle }]} />

              <View style={styles.calorieRightCols}>
                <View style={[styles.calorieStatCard, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                  <Text style={[styles.calorieStatLabel, { color: colors.textMuted }]}>TARGET (TDEE)</Text>
                  <Text style={[styles.calorieStatVal, { color: colors.text }]}>{targetCalories} <Text style={[styles.calorieUnit, { color: colors.textMuted }]}>kcal</Text></Text>
                </View>
                <View style={[styles.calorieStatCard, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                  <Text style={[styles.calorieStatLabel, { color: colors.textMuted }]}>REMAINING</Text>
                  <Text style={[styles.calorieStatVal, { color: isDark ? '#c3f400' : '#65a30d' }]}>{remainingCalories} <Text style={[styles.calorieUnit, { color: isDark ? '#c3f400' : '#65a30d' }]}>kcal</Text></Text>
                </View>
              </View>
            </View>

            {/* Trio Macro Progress Bars */}
            <View style={styles.macroProgressGrid}>
              {/* Protein */}
              <View style={[styles.macroProgBox, { backgroundColor: colors.cardSubtle }]}>
                <View style={styles.macroProgHeader}>
                  <Text style={[styles.macroProgName, { color: colors.textMuted }]}>PROTEIN</Text>
                  <Text style={[styles.macroProgVal, { color: isDark ? '#c3f400' : '#65a30d' }]}>{consumedProtein} / {targetProtein}g</Text>
                </View>
                <View style={[styles.macroProgTrack, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
                  <View style={[styles.macroProgFill, { backgroundColor: isDark ? '#c3f400' : '#65a30d', width: `${Math.min(100, Math.round((consumedProtein / targetProtein) * 100))}%` }]} />
                </View>
              </View>

              {/* Carbs */}
              <View style={[styles.macroProgBox, { backgroundColor: colors.cardSubtle }]}>
                <View style={styles.macroProgHeader}>
                  <Text style={[styles.macroProgName, { color: colors.textMuted }]}>CARBS</Text>
                  <Text style={[styles.macroProgVal, { color: '#38bdf8' }]}>{consumedCarbs} / {targetCarbs}g</Text>
                </View>
                <View style={[styles.macroProgTrack, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
                  <View style={[styles.macroProgFill, { backgroundColor: '#38bdf8', width: `${Math.min(100, Math.round((consumedCarbs / targetCarbs) * 100))}%` }]} />
                </View>
              </View>

              {/* Fats */}
              <View style={[styles.macroProgBox, { backgroundColor: colors.cardSubtle }]}>
                <View style={styles.macroProgHeader}>
                  <Text style={[styles.macroProgName, { color: colors.textMuted }]}>FATS</Text>
                  <Text style={[styles.macroProgVal, { color: '#f59e0b' }]}>{consumedFat} / {targetFat}g</Text>
                </View>
                <View style={[styles.macroProgTrack, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
                  <View style={[styles.macroProgFill, { backgroundColor: '#f59e0b', width: `${Math.min(100, Math.round((consumedFat / targetFat) * 100))}%` }]} />
                </View>
              </View>
            </View>
          </View>

          {/* 2. Hydration & Fasting Widgets Dual Row */}
          <View style={styles.dualWidgetsRow}>
            {/* Water Hydration Card */}
            <View style={[styles.widgetCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.widgetHeader}>
                <Ionicons name="water" size={16} color="#38bdf8" />
                <Text style={[styles.widgetTitle, { color: colors.textMuted }]}>HYDRATION</Text>
              </View>
              <Text style={[styles.waterVal, { color: colors.text }]}>
                {(waterIntakeMl / 1000).toFixed(2)} <Text style={{ fontSize: 11, color: colors.textMuted }}>/ {(waterGoalMl / 1000).toFixed(1)}L</Text>
              </Text>
              <View style={[styles.waterTrack, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
                <View style={[styles.waterFill, { width: `${Math.min(100, (waterIntakeMl / waterGoalMl) * 100)}%` }]} />
              </View>
              <View style={styles.waterBtnsRow}>
                <TouchableOpacity style={[styles.waterQuickBtn, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle, borderWidth: 1 }]} onPress={() => addWaterIntake(-250)}>
                  <Text style={[styles.waterQuickBtnText, { color: colors.text }]}>-250</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.waterQuickBtn, { backgroundColor: '#0284c7' }]} onPress={() => addWaterIntake(250)}>
                  <Text style={[styles.waterQuickBtnText, { color: '#ffffff' }]}>+250ml</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.waterQuickBtn, { backgroundColor: '#0284c7' }]} onPress={() => addWaterIntake(500)}>
                  <Text style={[styles.waterQuickBtnText, { color: '#ffffff' }]}>+500ml</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Intermittent Fasting Card */}
            <View style={[styles.widgetCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.widgetHeader}>
                <Ionicons name="timer-outline" size={16} color="#f59e0b" />
                <Text style={[styles.widgetTitle, { color: colors.textMuted }]}>FASTING (16:8)</Text>
              </View>
              <Text style={[styles.fastingClock, { color: colors.text }]}>
                {isFasting ? formatFastingTime(fastingElapsedSec) : 'Not Active'}
              </Text>
              <Text style={[styles.fastingSub, { color: colors.textSecondary }]}>
                {isFasting ? '🔥 In Fat-Burning Window' : 'Tap to start 16h fast'}
              </Text>
              <TouchableOpacity
                style={[
                  styles.fastingToggleBtn, 
                  { borderColor: '#f59e0b' },
                  isFasting && styles.fastingToggleBtnActive
                ]}
                onPress={() => {
                  if (isFasting) stopFasting();
                  else startFasting(16);
                }}
              >
                <Text style={[styles.fastingToggleBtnText, isFasting && styles.fastingToggleBtnTextActive]}>
                  {isFasting ? 'END FAST' : 'START 16:8 FAST'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. Meal Time Buckets (Breakfast, Lunch, Dinner, Snack) */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>TODAY'S LOGGED MEALS</Text>
          {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((mealType) => {
            const list = mealBuckets[mealType];
            const bucketCals = list.reduce((sum, item) => sum + item.calories, 0);
            const bucketProtein = list.reduce((sum, item) => sum + (item.protein_g || 0), 0);

            const iconMap = {
              breakfast: 'sunny-outline',
              lunch: 'restaurant-outline',
              dinner: 'moon-outline',
              snack: 'cafe-outline',
            };

            return (
              <View key={mealType} style={[styles.bucketCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.bucketHeader}>
                  <View style={styles.bucketTitleRow}>
                    <Ionicons name={iconMap[mealType] as any} size={15} color={isDark ? "#c3f400" : "#556d00"} />
                    <Text style={[styles.bucketName, { color: colors.text }]}>{mealType.toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.bucketCals, { color: colors.textMuted }]}>
                    {bucketCals} kcal • <Text style={{ color: isDark ? '#c3f400' : '#65a30d' }}>{bucketProtein}g protein</Text>
                  </Text>
                </View>

                {list.length === 0 ? (
                  <Text style={[styles.bucketEmptyText, { color: colors.textMuted }]}>No food logged in {mealType} yet.</Text>
                ) : (
                  list.map((entry) => (
                    <View key={entry.id} style={[styles.bucketItemRow, { borderColor: colors.borderSubtle }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.bucketItemName, { color: colors.text }]}>{entry.name}</Text>
                        <Text style={[styles.bucketItemSub, { color: colors.textSecondary }]}>
                          {entry.calories} kcal • P: {entry.protein_g}g • C: {entry.carbs_g}g • F: {entry.fat_g}g
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.deleteFoodBtn}
                        onPress={() => deleteFoodEntry(entry.id)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            );
          })}

          {/* 4. Global Universal Food & Recipe Vault */}
          <View style={styles.vaultSectionHeader}>
            <View>
              <Text style={[styles.vaultTitle, { color: colors.text }]}>GLOBAL FOOD & RECIPE VAULT</Text>
              <Text style={[styles.vaultSub, { color: isDark ? '#c3f400' : '#65a30d' }]}>
                {filteredFoods.length} RECIPES • VEG, NON-VEG, KETO, DESI & MORE
              </Text>
            </View>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search chicken, paneer, oats, keto, dal..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* 1. Diet Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {DIET_CATEGORIES.map((diet) => {
              const isSelected = selectedDiet === diet.id;
              return (
                <TouchableOpacity
                  key={diet.id}
                  style={[
                    styles.filterPill, 
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    isSelected && { backgroundColor: `${diet.color}25`, borderColor: diet.color }
                  ]}
                  onPress={() => setSelectedDiet(diet.id)}
                >
                  <Ionicons name={diet.icon as any} size={12} color={isSelected ? diet.color : colors.textMuted} />
                  <Text style={[styles.filterPillText, { color: colors.textSecondary }, isSelected && { color: diet.color, fontWeight: '700' }]}>
                    {diet.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 2. Meal Category Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterScroll, { marginTop: 6, marginBottom: 14 }]}>
            {MEAL_CATEGORIES.map((meal) => {
              const isSelected = selectedMealCategory === meal.id;
              return (
                <TouchableOpacity
                  key={meal.id}
                  style={[
                    styles.subFilterPill, 
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    isSelected && styles.subFilterPillActive
                  ]}
                  onPress={() => setSelectedMealCategory(meal.id)}
                >
                  <Text style={[
                    styles.subFilterPillText, 
                    { color: colors.textSecondary },
                    isSelected && styles.subFilterPillTextActive
                  ]}>
                    {meal.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Foods List */}
          {filteredFoods.map((item) => (
            <FoodListItem
              key={item.id}
              item={item}
              onPreview={handlePreviewFood}
              onQuickLog={handleQuickLog}
            />
          ))}
        </ScrollView>

        {/* Food Visual Detail & Recipe Modal */}
        <Modal
          visible={!!previewFood}
          animationType="slide"
          transparent
          onRequestClose={() => setPreviewFood(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.foodModalCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              {previewFood && (
                <>
                  <View style={[styles.foodModalHeader, { borderColor: colors.borderSubtle }]}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={[styles.foodModalTitle, { color: colors.text }]}>{previewFood.name}</Text>
                      <Text style={[styles.foodModalSub, { color: isDark ? '#c3f400' : '#65a30d' }]}>
                        {previewFood.diet_type.toUpperCase()} • {previewFood.category.toUpperCase()} • {previewFood.prep_time_min} MINS
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.closeModalBtn, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}
                      onPress={() => setPreviewFood(null)}
                    >
                      <Ionicons name="close" size={22} color={colors.text} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    style={{ maxHeight: '82%' }}
                    contentContainerStyle={{ paddingBottom: 28 }}
                    showsVerticalScrollIndicator={false}
                  >
                    <FoodVisualCard
                      food={previewFood}
                      onLogMeal={handleLogFoodFromModal}
                      showLogActions={true}
                    />
                  </ScrollView>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Manual Custom Food Log Modal */}
        <Modal
          visible={manualModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setManualModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.manualCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <View style={[styles.manualHeader, { borderColor: colors.borderSubtle }]}>
                <Text style={[styles.manualTitle, { color: colors.text }]}>LOG CUSTOM FOOD ENTRY</Text>
                <TouchableOpacity onPress={() => setManualModalVisible(false)}>
                  <Ionicons name="close-circle" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>FOOD ITEM NAME</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle, color: colors.text }]}
                  placeholder="e.g. Grilled Chicken Breast with Rice"
                  placeholderTextColor={colors.textMuted}
                  value={manualName}
                  onChangeText={setManualName}
                />

                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>MEAL TIME</Text>
                <View style={styles.mealTimeSelectRow}>
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((mType) => {
                    const isSelected = manualMealType === mType;
                    return (
                      <TouchableOpacity
                        key={mType}
                        style={[
                          styles.manualMealBtn,
                          { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle },
                          isSelected && (isDark 
                            ? { backgroundColor: 'rgba(195, 244, 0, 0.15)', borderColor: '#c3f400' }
                            : { backgroundColor: 'rgba(101, 163, 13, 0.15)', borderColor: '#65a30d' }
                          )
                        ]}
                        onPress={() => setManualMealType(mType)}
                      >
                        <Text style={[
                          styles.manualMealBtnText,
                          { color: colors.textMuted },
                          isSelected && { color: isDark ? '#c3f400' : '#65a30d', fontWeight: '700' }
                        ]}>
                          {mType.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.macroInputsRow}>
                  <View style={{ flex: 1, marginRight: 6 }}>
                    <Text style={[styles.inputLabel, { color: colors.textMuted }]}>CALORIES (kcal)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle, color: colors.text }]}
                      placeholder="e.g. 450"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={manualCalories}
                      onChangeText={setManualCalories}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 6 }}>
                    <Text style={[styles.inputLabel, { color: colors.textMuted }]}>PROTEIN (g)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle, color: colors.text }]}
                      placeholder="e.g. 35"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={manualProtein}
                      onChangeText={setManualProtein}
                    />
                  </View>
                </View>

                <View style={styles.macroInputsRow}>
                  <View style={{ flex: 1, marginRight: 6 }}>
                    <Text style={[styles.inputLabel, { color: colors.textMuted }]}>CARBS (g)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle, color: colors.text }]}
                      placeholder="e.g. 45"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={manualCarbs}
                      onChangeText={setManualCarbs}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 6 }}>
                    <Text style={[styles.inputLabel, { color: colors.textMuted }]}>FATS (g)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle, color: colors.text }]}
                      placeholder="e.g. 12"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={manualFat}
                      onChangeText={setManualFat}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.saveManualBtn}
                  onPress={handleAddManualFood}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#051424" />
                  ) : (
                    <Text style={styles.saveManualBtnText}>SAVE FOOD ENTRY</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Oswald',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  customLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#c3f400',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  customLogBtnText: {
    fontFamily: 'Oswald',
    fontSize: 11,
    fontWeight: '700',
    color: '#051424',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  cockpitCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cockpitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cockpitTag: {
    fontFamily: 'Oswald',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  cockpitGoal: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 2,
  },
  stepsBurnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },
  stepsBurnText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
    fontWeight: '700',
    color: '#f59e0b',
  },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  calorieCircleBox: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calorieBigVal: {
    fontFamily: 'Oswald',
    fontSize: 28,
    fontWeight: '700',
  },
  calorieBigLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  calorieBarTrack: {
    height: 4,
    borderRadius: 2,
    width: '85%',
    marginTop: 8,
    overflow: 'hidden',
  },
  calorieBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  calorieDivider: {
    width: 1,
    height: 50,
    marginHorizontal: 12,
  },
  calorieRightCols: {
    flex: 1.2,
    gap: 6,
  },
  calorieStatCard: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  calorieStatLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  calorieStatVal: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 1,
  },
  calorieUnit: {
    fontSize: 9.5,
    fontFamily: 'Inter',
    fontWeight: '400',
  },
  macroProgressGrid: {
    gap: 8,
  },
  macroProgBox: {
    borderRadius: 10,
    padding: 8,
  },
  macroProgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  macroProgName: {
    fontFamily: 'Oswald',
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  macroProgVal: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
    fontWeight: '700',
  },
  macroProgTrack: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  macroProgFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  dualWidgetsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  widgetCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  widgetTitle: {
    fontFamily: 'Oswald',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  waterVal: {
    fontFamily: 'Oswald',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  waterTrack: {
    height: 4,
    borderRadius: 2,
    marginBottom: 10,
    overflow: 'hidden',
  },
  waterFill: {
    height: '100%',
    backgroundColor: '#38bdf8',
    borderRadius: 2,
  },
  waterBtnsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  waterQuickBtn: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterQuickBtnText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    fontWeight: '700',
  },
  fastingClock: {
    fontFamily: 'Oswald',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  fastingSub: {
    fontFamily: 'Inter',
    fontSize: 9,
    marginBottom: 8,
  },
  fastingToggleBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 5,
    alignItems: 'center',
  },
  fastingToggleBtnActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  fastingToggleBtnText: {
    fontFamily: 'Oswald',
    fontSize: 10,
    fontWeight: '700',
    color: '#f59e0b',
    letterSpacing: 0.5,
  },
  fastingToggleBtnTextActive: {
    color: '#051424',
  },
  sectionTitle: {
    fontFamily: 'Oswald',
    fontSize: 13,
    letterSpacing: 1,
    marginTop: 6,
    marginBottom: 8,
  },
  bucketCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  bucketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  bucketTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bucketName: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bucketCals: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10.5,
  },
  bucketEmptyText: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    fontStyle: 'italic',
    paddingVertical: 2,
  },
  bucketItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
  },
  bucketItemName: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '600',
  },
  bucketItemSub: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
    marginTop: 1,
  },
  deleteFoodBtn: {
    padding: 4,
  },
  vaultSectionHeader: {
    marginTop: 16,
    marginBottom: 8,
  },
  vaultTitle: {
    fontFamily: 'Oswald',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  vaultSub: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 12.5,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
    gap: 4,
  },
  filterPillText: {
    fontFamily: 'Oswald',
    fontSize: 10.5,
    letterSpacing: 0.5,
  },
  subFilterPill: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 6,
  },
  subFilterPillActive: {
    backgroundColor: '#c3f400',
    borderColor: '#c3f400',
  },
  subFilterPillText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
    fontWeight: '600',
  },
  subFilterPillTextActive: {
    color: '#051424',
    fontWeight: '700',
  },
  foodItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
  foodItemThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  foodItemInfo: {
    flex: 1,
    marginLeft: 10,
  },
  foodItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  dietBadgeMini: {
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  dietBadgeMiniText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 8,
    fontWeight: '700',
  },
  halalBadgeMini: {
    backgroundColor: '#10b981',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  halalBadgeMiniText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 8,
    fontWeight: '700',
    color: '#051424',
  },
  prepTimeMini: {
    fontFamily: 'Inter',
    fontSize: 9,
  },
  foodItemName: {
    fontFamily: 'Oswald',
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  foodItemMacroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  foodItemCal: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11,
    fontWeight: '700',
  },
  foodItemUnit: {
    fontSize: 8.5,
    fontWeight: '400',
  },
  macroPillMini: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  macroPillText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 8.5,
    fontWeight: '700',
  },
  foodItemAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#c3f400',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  foodModalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    maxHeight: '92%',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  foodModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  foodModalTitle: {
    fontFamily: 'Oswald',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  foodModalSub: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
    marginTop: 2,
    fontWeight: '600',
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  manualCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  manualHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  manualTitle: {
    fontFamily: 'Oswald',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  inputLabel: {
    fontFamily: 'Oswald',
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Inter',
    fontSize: 13,
  },
  mealTimeSelectRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  manualMealBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  manualMealBtnText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
    fontWeight: '600',
  },
  macroInputsRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  saveManualBtn: {
    backgroundColor: '#c3f400',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  saveManualBtnText: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '700',
    color: '#051424',
    letterSpacing: 1,
  },
});
