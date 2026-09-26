import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  ScrollView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { FoodItem, getFoodRecipeVideoUrl, ServingOption } from '../lib/foodDatabase';
import { useAppTheme } from '../lib/theme';

interface FoodVisualCardProps {
  food: FoodItem;
  onLogMeal?: (food: FoodItem, serving: ServingOption, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => void;
  showLogActions?: boolean;
}

export function FoodVisualCardComponent({ food, onLogMeal, showLogActions = true }: FoodVisualCardProps) {
  const { colors, isDark } = useAppTheme();
  const [activeTab, setActiveTab] = useState<'overview' | 'macros' | 'recipe'>('overview');
  const [imageLoading, setImageLoading] = useState(true);
  const [selectedServingIdx, setSelectedServingIdx] = useState(0);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');

  const currentServing = food.serving_options[selectedServingIdx] || {
    label: 'Standard (100g)',
    weightGrams: 100,
    multiplier: 1,
  };

  const multiplier = currentServing.multiplier;
  const currentCalories = Math.round(food.calories_per_100g * multiplier);
  const currentProtein = Math.round(food.protein_g * multiplier * 10) / 10;
  const currentCarbs = Math.round(food.carbs_g * multiplier * 10) / 10;
  const currentFat = Math.round(food.fat_g * multiplier * 10) / 10;
  const currentFiber = food.fiber_g ? Math.round(food.fiber_g * multiplier * 10) / 10 : 0;

  const handleOpenRecipeVideo = () => {
    const url = getFoodRecipeVideoUrl(food);
    Linking.openURL(url).catch((err) => {
      console.warn('Could not open video recipe URL:', err);
    });
  };

  const getDietBadgeColor = (dietType: string) => {
    switch (dietType) {
      case 'veg':
        return { bg: '#10b981', label: '100% VEGETARIAN', icon: 'leaf' };
      case 'vegan':
        return { bg: '#06b6d4', label: '100% VEGAN', icon: 'nutrition' };
      case 'keto':
        return { bg: '#f59e0b', label: 'KETO / LOW-CARB', icon: 'flame' };
      case 'high_protein':
        return { bg: '#c3f400', label: 'HIGH PROTEIN', icon: 'barbell' };
      case 'desi':
        return { bg: '#ec4899', label: 'DESI HEALTHY', icon: 'sparkles' };
      case 'mediterranean':
        return { bg: '#38bdf8', label: 'MEDITERRANEAN', icon: 'heart' };
      default:
        return { bg: '#ef4444', label: 'NON-VEGETARIAN', icon: 'restaurant' };
    }
  };

  const badgeInfo = getDietBadgeColor(food.diet_type);

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {/* 1. HD Food Photo Hero Frame */}
      <View style={[styles.imageFrame, { backgroundColor: colors.cardSubtle }]}>
        <Image
          source={{ uri: food.image_url }}
          style={styles.foodImage}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={200}
          onLoadStart={() => setImageLoading(true)}
          onLoadEnd={() => setImageLoading(false)}
        />

        {imageLoading && (
          <View style={[styles.imageLoader, { backgroundColor: isDark ? 'rgba(5, 20, 36, 0.7)' : 'rgba(255, 255, 255, 0.7)' }]}>
            <ActivityIndicator size="small" color={isDark ? "#c3f400" : "#556d00"} />
          </View>
        )}

        {/* Top Diet Tag Overlays */}
        <View style={styles.topBadgeRow}>
          <View style={[styles.dietBadge, { backgroundColor: badgeInfo.bg }]}>
            <Ionicons name={badgeInfo.icon as any} size={11} color="#051424" />
            <Text style={styles.dietBadgeText}>{badgeInfo.label}</Text>
          </View>

          {food.is_halal && (
            <View style={[styles.halalBadge, { backgroundColor: isDark ? 'rgba(5, 20, 36, 0.9)' : 'rgba(255, 255, 255, 0.9)' }]}>
              <Ionicons name="shield-checkmark" size={10} color="#10b981" />
              <Text style={styles.halalBadgeText}>HALAL</Text>
            </View>
          )}
        </View>

        {/* Bottom Image Bar with Prep Time & Direct YouTube Guide */}
        <View style={[styles.imageBottomBar, { backgroundColor: isDark ? 'rgba(5, 20, 36, 0.92)' : 'rgba(255, 255, 255, 0.92)', borderColor: colors.borderSubtle }]}>
          <View style={styles.prepTimeWrap}>
            <Ionicons name="time-outline" size={13} color={isDark ? "#c3f400" : "#556d00"} />
            <Text style={[styles.prepTimeText, { color: colors.text }]}>Prep: {food.prep_time_min} mins</Text>
          </View>

          <TouchableOpacity
            style={styles.youtubeWatchBtn}
            onPress={handleOpenRecipeVideo}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-youtube" size={13} color="#ffffff" />
            <Text style={styles.youtubeWatchBtnText}>WATCH RECIPE</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Real-Time Interactive Portion / Serving Size Selector */}
      <View style={styles.portionBox}>
        <Text style={[styles.portionTitle, { color: colors.textMuted }]}>SELECT SERVING QUANTITY:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.servingScroll}>
          {food.serving_options.map((opt, idx) => {
            const isSelected = selectedServingIdx === idx;
            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.servingPill, 
                  { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle },
                  isSelected && { backgroundColor: isDark ? '#c3f400' : '#c3f400', borderColor: '#c3f400' }
                ]}
                onPress={() => setSelectedServingIdx(idx)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.servingPillText, 
                  { color: colors.textSecondary },
                  isSelected && { color: '#051424', fontWeight: '700' }
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Real-Time Macro Quick Dashboard (Dynamically Scaled to Portion) */}
      <View style={styles.macrosDashboard}>
        <View style={[styles.macroCardCal, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.macroValCal, { color: colors.text }]}>{currentCalories}</Text>
          <Text style={[styles.macroLabelCal, { color: colors.textMuted }]}>CALORIES (kcal)</Text>
        </View>

        <View style={[styles.macroCardP, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.macroVal, { color: isDark ? '#c3f400' : '#65a30d' }]}>{currentProtein}g</Text>
          <Text style={[styles.macroLabel, { color: colors.textMuted }]}>PROTEIN</Text>
          <View style={[styles.macroMiniBar, { backgroundColor: isDark ? '#c3f400' : '#65a30d', width: `${Math.min(100, currentProtein * 2)}%` }]} />
        </View>

        <View style={[styles.macroCardC, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.macroVal, { color: '#38bdf8' }]}>{currentCarbs}g</Text>
          <Text style={[styles.macroLabel, { color: colors.textMuted }]}>CARBS</Text>
          <View style={[styles.macroMiniBar, { backgroundColor: '#38bdf8', width: `${Math.min(100, currentCarbs * 1.5)}%` }]} />
        </View>

        <View style={[styles.macroCardF, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.macroVal, { color: '#f59e0b' }]}>{currentFat}g</Text>
          <Text style={[styles.macroLabel, { color: colors.textMuted }]}>FATS</Text>
          <View style={[styles.macroMiniBar, { backgroundColor: '#f59e0b', width: `${Math.min(100, currentFat * 3)}%` }]} />
        </View>
      </View>

      {/* 4. Segmented Tabs for Deep Info (Overview, Recipe Steps, Macros) */}
      <View style={[styles.tabsRow, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'overview' && styles.tabBtnActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Ionicons name="information-circle-outline" size={13} color={activeTab === 'overview' ? '#051424' : colors.textMuted} />
          <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'overview' && styles.tabTextActive]}>OVERVIEW</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'recipe' && styles.tabBtnActive]}
          onPress={() => setActiveTab('recipe')}
        >
          <Ionicons name="restaurant-outline" size={13} color={activeTab === 'recipe' ? '#051424' : colors.textMuted} />
          <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'recipe' && styles.tabTextActive]}>COOKING RECIPE</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'macros' && styles.tabBtnActive]}
          onPress={() => setActiveTab('macros')}
        >
          <Ionicons name="pie-chart-outline" size={13} color={activeTab === 'macros' ? '#051424' : colors.textMuted} />
          <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'macros' && styles.tabTextActive]}>NUTRITION</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content 1: Overview */}
      {activeTab === 'overview' && (
        <View style={styles.tabContentBox}>
          {/* YouTube Video Banner */}
          <TouchableOpacity
            style={[styles.youtubeBanner, { backgroundColor: colors.cardSubtle, borderColor: 'rgba(220, 38, 38, 0.4)' }]}
            onPress={handleOpenRecipeVideo}
            activeOpacity={0.85}
          >
            <View style={styles.youtubeIconWrap}>
              <Ionicons name="logo-youtube" size={18} color="#ffffff" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.youtubeBannerTitle, { color: colors.text }]}>WATCH RECIPE TUTORIAL ON YOUTUBE</Text>
              <Text style={[styles.youtubeBannerSub, { color: colors.textSecondary }]}>Step-by-step masterclass, cooking tips & portions</Text>
            </View>
            <Ionicons name="open-outline" size={15} color={isDark ? "#c3f400" : "#556d00"} />
          </TouchableOpacity>

          <Text style={[styles.sectionHeader, { color: isDark ? "#c3f400" : "#556d00" }]}>KEY HEALTH & ATHLETE BENEFITS</Text>
          {food.health_benefits.map((b, idx) => (
            <View key={idx} style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={[styles.benefitText, { color: colors.text }]}>{b}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Tab Content 2: Recipe & Cooking */}
      {activeTab === 'recipe' && (
        <View style={styles.tabContentBox}>
          <Text style={[styles.sectionHeader, { color: isDark ? "#c3f400" : "#556d00" }]}>REQUIRED INGREDIENTS</Text>
          <View style={styles.ingredientsPillsWrap}>
            {food.ingredients.map((ing, idx) => (
              <View key={idx} style={[styles.ingredientPill, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                <Ionicons name="checkmark" size={12} color={isDark ? "#c3f400" : "#556d00"} />
                <Text style={[styles.ingredientText, { color: colors.text }]}>{ing}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.sectionHeader, { marginTop: 14, color: isDark ? "#c3f400" : "#556d00" }]}>PREPARATION & COOKING STEPS</Text>
          {food.cooking_steps.map((step, idx) => (
            <View key={idx} style={[styles.stepRow, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
              <View style={styles.stepNumBadge}>
                <Text style={styles.stepNumText}>{idx + 1}</Text>
              </View>
              <Text style={[styles.stepDesc, { color: colors.text }]}>{step}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Tab Content 3: Nutrition & Micronutrients */}
      {activeTab === 'macros' && (
        <View style={styles.tabContentBox}>
          <Text style={[styles.sectionHeader, { color: isDark ? "#c3f400" : "#556d00" }]}>DETAILED NUTRIENT BREAKDOWN ({currentServing.label})</Text>
          <View style={[styles.nutrientTable, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
            <View style={[styles.nutrientRow, { borderColor: colors.borderSubtle }]}>
              <Text style={[styles.nutrientName, { color: colors.textSecondary }]}>Calories</Text>
              <Text style={[styles.nutrientVal, { color: colors.text }]}>{currentCalories} kcal</Text>
            </View>
            <View style={[styles.nutrientRow, { borderColor: colors.borderSubtle }]}>
              <Text style={[styles.nutrientName, { color: colors.textSecondary }]}>Protein</Text>
              <Text style={[styles.nutrientVal, { color: isDark ? '#c3f400' : '#65a30d' }]}>{currentProtein} g</Text>
            </View>
            <View style={[styles.nutrientRow, { borderColor: colors.borderSubtle }]}>
              <Text style={[styles.nutrientName, { color: colors.textSecondary }]}>Carbohydrates</Text>
              <Text style={[styles.nutrientVal, { color: '#38bdf8' }]}>{currentCarbs} g</Text>
            </View>
            {currentFiber > 0 && (
              <View style={[styles.nutrientRow, { paddingLeft: 12, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.nutrientSubName, { color: colors.textMuted }]}>↳ Dietary Fiber</Text>
                <Text style={[styles.nutrientVal, { color: colors.text }]}>{currentFiber} g</Text>
              </View>
            )}
            <View style={[styles.nutrientRow, { borderColor: colors.borderSubtle, borderBottomWidth: 0 }]}>
              <Text style={[styles.nutrientName, { color: colors.textSecondary }]}>Total Fat</Text>
              <Text style={[styles.nutrientVal, { color: '#f59e0b' }]}>{currentFat} g</Text>
            </View>
          </View>
        </View>
      )}

      {/* 5. One-Tap Quick Log Meal Action */}
      {showLogActions && onLogMeal && (
        <View style={[styles.logActionBox, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.logActionTitle, { color: colors.textMuted }]}>SELECT MEAL TIME TO LOG:</Text>
          <View style={styles.mealTimeSelectRow}>
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((mType) => {
              const isSelected = selectedMealType === mType;
              return (
                <TouchableOpacity
                  key={mType}
                  style={[
                    styles.mealTypeBtn, 
                    { backgroundColor: colors.card, borderColor: colors.borderSubtle },
                    isSelected && { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.15)' : 'rgba(101, 163, 13, 0.15)', borderColor: isDark ? '#c3f400' : '#65a30d' }
                  ]}
                  onPress={() => setSelectedMealType(mType)}
                >
                  <Text style={[
                    styles.mealTypeBtnText, 
                    { color: colors.textMuted },
                    isSelected && { color: isDark ? '#c3f400' : '#65a30d', fontWeight: '700' }
                  ]}>
                    {mType.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.logPrimaryBtn}
            onPress={() => onLogMeal(food, currentServing, selectedMealType)}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={18} color="#051424" />
            <Text style={styles.logPrimaryBtnText}>
              LOG {currentCalories} KCAL TO {selectedMealType.toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const FoodVisualCard = React.memo(FoodVisualCardComponent);
export default FoodVisualCard;

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  imageFrame: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  foodImage: {
    width: '100%',
    height: '100%',
  },
  imageLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBadgeRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dietBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  dietBadgeText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
    fontWeight: '700',
    color: '#051424',
    letterSpacing: 0.5,
  },
  halalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10b981',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  halalBadgeText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    fontWeight: '700',
    color: '#10b981',
  },
  imageBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderTopWidth: 1,
  },
  prepTimeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  prepTimeText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10.5,
    fontWeight: '600',
  },
  youtubeWatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  youtubeWatchBtnText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  portionBox: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  portionTitle: {
    fontFamily: 'Oswald',
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  servingScroll: {
    flexDirection: 'row',
  },
  servingPill: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  servingPillText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
  },
  macrosDashboard: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  macroCardCal: {
    flex: 1.3,
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroValCal: {
    fontFamily: 'JetBrains Mono',
    fontSize: 16,
    fontWeight: '800',
  },
  macroLabelCal: {
    fontFamily: 'Oswald',
    fontSize: 8.5,
    marginTop: 2,
  },
  macroCardP: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    alignItems: 'center',
  },
  macroCardC: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    alignItems: 'center',
  },
  macroCardF: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    alignItems: 'center',
  },
  macroVal: {
    fontFamily: 'JetBrains Mono',
    fontSize: 13,
    fontWeight: '700',
  },
  macroLabel: {
    fontFamily: 'Oswald',
    fontSize: 8.5,
    marginTop: 1,
  },
  macroMiniBar: {
    height: 3,
    borderRadius: 1.5,
    marginTop: 4,
    alignSelf: 'stretch',
  },
  tabsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    padding: 3,
    gap: 4,
    marginHorizontal: 14,
    marginTop: 6,
    borderRadius: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 6,
    gap: 3,
  },
  tabBtnActive: {
    backgroundColor: '#c3f400',
  },
  tabText: {
    fontFamily: 'Oswald',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tabTextActive: {
    color: '#051424',
  },
  tabContentBox: {
    padding: 14,
  },
  youtubeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  youtubeIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  youtubeBannerTitle: {
    fontFamily: 'Oswald',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  youtubeBannerSub: {
    fontFamily: 'Inter',
    fontSize: 9.5,
    marginTop: 1,
  },
  sectionHeader: {
    fontFamily: 'Oswald',
    fontSize: 12,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  benefitText: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 11,
    lineHeight: 16,
  },
  ingredientsPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  ingredientPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  ingredientText: {
    fontFamily: 'Inter',
    fontSize: 10.5,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    padding: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  stepNumBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#c3f400',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 1,
  },
  stepNumText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    fontWeight: '700',
    color: '#051424',
  },
  stepDesc: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 11,
    lineHeight: 16,
  },
  nutrientTable: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  nutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  nutrientName: {
    fontFamily: 'Inter',
    fontSize: 11.5,
  },
  nutrientSubName: {
    fontFamily: 'Inter',
    fontSize: 10.5,
  },
  nutrientVal: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11.5,
    fontWeight: '700',
  },
  logActionBox: {
    borderTopWidth: 1,
    padding: 14,
  },
  logActionTitle: {
    fontFamily: 'Oswald',
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  mealTimeSelectRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  mealTypeBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  mealTypeBtnText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
    fontWeight: '700',
  },
  logPrimaryBtn: {
    flexDirection: 'row',
    backgroundColor: '#c3f400',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  logPrimaryBtnText: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
    color: '#051424',
    letterSpacing: 0.5,
  },
});
