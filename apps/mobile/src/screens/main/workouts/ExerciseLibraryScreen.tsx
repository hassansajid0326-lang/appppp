import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  UNIVERSAL_EXERCISES,
  EXERCISE_CATEGORIES,
  MUSCLE_GROUPS,
  EQUIPMENT_TYPES,
  ExerciseItem,
  getExerciseVideoUrl,
} from '../../../lib/exerciseDatabase';
import { useOfflineStore } from '../../../lib/offlineStore';
import ExerciseVisualCard from '../../../components/ExerciseVisualCard';
import { useAppTheme } from '../../../lib/theme';

type ParamList = {
  ExerciseLibrary: {
    initialCategory?: string;
    initialMuscle?: string;
    initialEquipment?: string;
  };
};

const getDifficultyColor = (diff: string) => {
  switch (diff) {
    case 'beginner':
      return '#10b981';
    case 'intermediate':
      return '#f59e0b';
    case 'advanced':
      return '#ef4444';
    default:
      return '#64748B';
  }
};

const getCategoryColor = (catId: string) => {
  const found = EXERCISE_CATEGORIES.find((c) => c.id === catId);
  return found ? found.color : '#c3f400';
};

// Memoized Exercise List Item for zero jank & 60/120fps scrolling
interface ExerciseListItemProps {
  item: ExerciseItem;
  colors: any;
  isDark: boolean;
  onPreview: (exercise: ExerciseItem) => void;
  onAdd: (exercise: ExerciseItem) => void;
}

const ExerciseListItem = React.memo(
  ({ item, colors, isDark, onPreview, onAdd }: ExerciseListItemProps) => {
    const catColor = getCategoryColor(item.category);
    const diffColor = getDifficultyColor(item.difficulty);

    return (
      <TouchableOpacity
        style={[styles.exerciseCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        activeOpacity={0.8}
        onPress={() => onPreview(item)}
      >
        {/* Thumbnail Image */}
        <View style={[styles.thumbWrapper, { backgroundColor: isDark ? '#051424' : '#e2e8f0' }]}>
          <Image
            source={{
              uri:
                item.image_url ||
                'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=240&auto=format&fit=crop&q=80',
            }}
            style={styles.thumbImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
          <View style={styles.thumbOverlayIcon}>
            <Ionicons name="play-circle" size={14} color={isDark ? '#c3f400' : '#4d7c0f'} />
          </View>
        </View>

        {/* Info Column */}
        <View style={styles.exerciseInfo}>
          <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>

          {/* Discipline / Category Tag */}
          <View style={styles.categoryLine}>
            <View style={[styles.categoryMiniBadge, { borderColor: `${catColor}60`, backgroundColor: isDark ? 'rgba(5, 20, 36, 0.6)' : 'rgba(0, 0, 0, 0.04)' }]}>
              <Text style={[styles.categoryMiniBadgeText, { color: catColor }]}>
                {item.category.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Badges Row */}
          <View style={styles.tagsRow}>
            <View style={[styles.muscleBadge, { backgroundColor: isDark ? '#051424' : '#f1f5f9', borderColor: colors.cardBorder }]}>
              <Text style={styles.muscleBadgeText}>{item.muscle_group.toUpperCase()}</Text>
            </View>

            <View style={[styles.gearBadge, { backgroundColor: isDark ? '#051424' : '#f1f5f9', borderColor: colors.cardBorder }]}>
              <Ionicons name="barbell-outline" size={10} color={colors.textMuted} />
              <Text style={[styles.gearBadgeText, { color: colors.textMuted }]}>{item.equipment}</Text>
            </View>

            <View style={[styles.difficultyBadge, { borderColor: diffColor }]}>
              <Text style={[styles.difficultyBadgeText, { color: diffColor }]}>
                {item.difficulty}
              </Text>
            </View>
          </View>

          {/* How To Do Guide Link */}
          <TouchableOpacity
            style={styles.howToDoLink}
            onPress={() => onPreview(item)}
          >
            <Ionicons name="information-circle-outline" size={12} color="#38bdf8" />
            <Text style={styles.howToDoLinkText}>View Visual Form & Biomechanics</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Add To Workout Button */}
        <TouchableOpacity
          style={[styles.quickAddBtn, { backgroundColor: colors.primary }]}
          onPress={() => onAdd(item)}
        >
          <Ionicons name="add" size={20} color={colors.onPrimary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  },
  (prev, next) => prev.item.id === next.item.id && prev.isDark === next.isDark
);

export default function ExerciseLibraryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ParamList, 'ExerciseLibrary'>>();
  const { colors, isDark } = useAppTheme();
  const { activeWorkout, addActiveWorkoutExercise, startActiveWorkout } = useOfflineStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(route.params?.initialCategory || 'all');
  const [selectedMuscle, setSelectedMuscle] = useState(route.params?.initialMuscle || 'all');
  const [selectedEquipment, setSelectedEquipment] = useState(route.params?.initialEquipment || 'all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Selected exercise for full detail modal
  const [previewExercise, setPreviewExercise] = useState<ExerciseItem | null>(null);

  // Synchronize route params if updated
  useEffect(() => {
    if (route.params?.initialCategory) {
      setSelectedCategory(route.params.initialCategory);
    }
    if (route.params?.initialMuscle) {
      setSelectedMuscle(route.params.initialMuscle);
    }
    if (route.params?.initialEquipment) {
      setSelectedEquipment(route.params.initialEquipment);
    }
  }, [route.params]);

  // Precomputed category counts for zero lag
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: UNIVERSAL_EXERCISES.length };
    EXERCISE_CATEGORIES.forEach((cat) => {
      if (cat.id !== 'all') {
        counts[cat.id] = UNIVERSAL_EXERCISES.filter((e) => e.category === cat.id).length;
      }
    });
    return counts;
  }, []);

  // Filtered exercises computation
  const filteredExercises = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return UNIVERSAL_EXERCISES.filter((ex) => {
      // Search Query
      if (query) {
        const matchesName = ex.name.toLowerCase().includes(query);
        const matchesMuscle = ex.muscle_group.toLowerCase().includes(query);
        const matchesEquipment = ex.equipment.toLowerCase().includes(query);
        const matchesCat = ex.category.toLowerCase().includes(query);
        if (!matchesName && !matchesMuscle && !matchesEquipment && !matchesCat) return false;
      }

      // Category Filter
      if (selectedCategory !== 'all' && ex.category !== selectedCategory) {
        return false;
      }

      // Muscle Group Filter
      if (selectedMuscle !== 'all' && ex.muscle_group !== selectedMuscle) {
        return false;
      }

      // Equipment Filter
      if (selectedEquipment !== 'all' && ex.equipment !== selectedEquipment) {
        return false;
      }

      // Difficulty Filter
      if (selectedDifficulty !== 'all' && ex.difficulty !== selectedDifficulty) {
        return false;
      }

      return true;
    });
  }, [searchQuery, selectedCategory, selectedMuscle, selectedEquipment, selectedDifficulty]);

  const handleAddExerciseToWorkout = useCallback(
    (exercise: ExerciseItem) => {
      if (activeWorkout) {
        addActiveWorkoutExercise(exercise);
        setPreviewExercise(null);
        navigation.navigate('ActiveWorkout');
      } else {
        startActiveWorkout('Quick Session', [exercise]);
        setPreviewExercise(null);
        navigation.navigate('ActiveWorkout');
      }
    },
    [activeWorkout, addActiveWorkoutExercise, startActiveWorkout, navigation]
  );

  const handlePreviewExercise = useCallback((exercise: ExerciseItem) => {
    setPreviewExercise(exercise);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ExerciseItem }) => (
      <ExerciseListItem
        item={item}
        colors={colors}
        isDark={isDark}
        onPreview={handlePreviewExercise}
        onAdd={handleAddExerciseToWorkout}
      />
    ),
    [handlePreviewExercise, handleAddExerciseToWorkout, colors, isDark]
  );

  const keyExtractor = useCallback((item: ExerciseItem) => item.id, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: 104,
      offset: 104 * index,
      index,
    }),
    []
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <LinearGradient colors={colors.backgroundGradient as [string, string, ...string[]]} style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={[styles.backButton, { backgroundColor: isDark ? '#0d1c2d' : '#f1f5f9', borderColor: colors.cardBorder }]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>GLOBAL EXERCISE VAULT</Text>
            <Text style={[styles.headerSubtitle, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>
              {filteredExercises.length} MOVEMENTS • ALL DISCIPLINES
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.filterToggleBtn,
              { backgroundColor: isDark ? '#0d1c2d' : '#f1f5f9', borderColor: colors.cardBorder },
              (selectedCategory !== 'all' || selectedEquipment !== 'all' || selectedDifficulty !== 'all') &&
                [styles.filterToggleBtnActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
            ]}
            onPress={() => setFilterModalVisible(true)}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={
                selectedCategory !== 'all' || selectedEquipment !== 'all' || selectedDifficulty !== 'all'
                  ? colors.onPrimary
                  : (isDark ? '#c3f400' : '#4d7c0f')
              }
            />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search exercise, muscle, gear or sport..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* 1. Discipline / Category Horizontal Scroll Selector */}
        <View style={styles.categoryScrollWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContent}
          >
            {EXERCISE_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              const count = categoryCounts[cat.id] || 0;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryPill,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    isActive && { backgroundColor: `${cat.color}20`, borderColor: cat.color },
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <View
                    style={[
                      styles.categoryPillDot,
                      { backgroundColor: cat.color },
                      isActive && styles.categoryPillDotActive,
                    ]}
                  />
                  <Text
                    style={[
                      styles.categoryPillText,
                      { color: colors.textMuted },
                      isActive && { color: cat.color, fontWeight: '700' },
                    ]}
                  >
                    {cat.name} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 2. Muscle Group Horizontal Scroll Selector */}
        <View style={styles.muscleScrollWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.muscleScrollContent}
          >
            {MUSCLE_GROUPS.map((mg) => {
              const isActive = selectedMuscle === mg.id;
              return (
                <TouchableOpacity
                  key={mg.id}
                  style={[
                    styles.musclePill, 
                    { backgroundColor: isDark ? '#0a1726' : '#f1f5f9', borderColor: colors.cardBorder },
                    isActive && [styles.musclePillActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
                  ]}
                  onPress={() => setSelectedMuscle(mg.id)}
                >
                  <Text style={[
                    styles.musclePillText, 
                    { color: colors.textMuted },
                    isActive && [styles.musclePillTextActive, { color: colors.onPrimary }]
                  ]}>
                    {mg.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Active Filters Tag Bar */}
        {(selectedCategory !== 'all' || selectedEquipment !== 'all' || selectedDifficulty !== 'all' || selectedMuscle !== 'all') && (
          <View style={styles.activeFiltersBar}>
            <Text style={[styles.activeFiltersLabel, { color: colors.textMuted }]}>Filters:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
              {selectedCategory !== 'all' && (
                <TouchableOpacity
                  style={[styles.activeFilterChip, { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.1)' : 'rgba(195, 244, 0, 0.2)', borderColor: isDark ? 'rgba(195, 244, 0, 0.3)' : 'rgba(195, 244, 0, 0.5)' }]}
                  onPress={() => setSelectedCategory('all')}
                >
                  <Text style={[styles.activeFilterChipText, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>Type: {selectedCategory}</Text>
                  <Ionicons name="close" size={12} color={isDark ? '#c3f400' : '#4d7c0f'} />
                </TouchableOpacity>
              )}
              {selectedMuscle !== 'all' && (
                <TouchableOpacity
                  style={[styles.activeFilterChip, { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.1)' : 'rgba(195, 244, 0, 0.2)', borderColor: isDark ? 'rgba(195, 244, 0, 0.3)' : 'rgba(195, 244, 0, 0.5)' }]}
                  onPress={() => setSelectedMuscle('all')}
                >
                  <Text style={[styles.activeFilterChipText, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>Muscle: {selectedMuscle}</Text>
                  <Ionicons name="close" size={12} color={isDark ? '#c3f400' : '#4d7c0f'} />
                </TouchableOpacity>
              )}
              {selectedEquipment !== 'all' && (
                <TouchableOpacity
                  style={[styles.activeFilterChip, { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.1)' : 'rgba(195, 244, 0, 0.2)', borderColor: isDark ? 'rgba(195, 244, 0, 0.3)' : 'rgba(195, 244, 0, 0.5)' }]}
                  onPress={() => setSelectedEquipment('all')}
                >
                  <Text style={[styles.activeFilterChipText, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>Gear: {selectedEquipment}</Text>
                  <Ionicons name="close" size={12} color={isDark ? '#c3f400' : '#4d7c0f'} />
                </TouchableOpacity>
              )}
              {selectedDifficulty !== 'all' && (
                <TouchableOpacity
                  style={[styles.activeFilterChip, { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.1)' : 'rgba(195, 244, 0, 0.2)', borderColor: isDark ? 'rgba(195, 244, 0, 0.3)' : 'rgba(195, 244, 0, 0.5)' }]}
                  onPress={() => setSelectedDifficulty('all')}
                >
                  <Text style={[styles.activeFilterChipText, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>Level: {selectedDifficulty}</Text>
                  <Ionicons name="close" size={12} color={isDark ? '#c3f400' : '#4d7c0f'} />
                </TouchableOpacity>
              )}
            </ScrollView>
            <TouchableOpacity
              onPress={() => {
                setSelectedCategory('all');
                setSelectedMuscle('all');
                setSelectedEquipment('all');
                setSelectedDifficulty('all');
              }}
            >
              <Text style={styles.resetFiltersText}>Reset All</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* High-Performance Optimized Exercise List */}
        <FlatList
          data={filteredExercises}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={7}
          updateCellsBatchingPeriod={40}
          removeClippedSubviews={Platform.OS === 'android'}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Feather name="search" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Exercises Found</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Try adjusting your search query or removing active discipline/muscle filters.
              </Text>
              <TouchableOpacity
                style={[styles.clearSearchBtn, { backgroundColor: colors.card, borderColor: colors.primary }]}
                onPress={() => {
                  setSearchQuery('');
                  setSelectedMuscle('all');
                  setSelectedCategory('all');
                  setSelectedEquipment('all');
                  setSelectedDifficulty('all');
                }}
              >
                <Text style={[styles.clearSearchBtnText, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>RESET ALL FILTERS</Text>
              </TouchableOpacity>
            </View>
          }
        />

        {/* Filter Selection Modal */}
        <Modal
          visible={filterModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setFilterModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>FILTER MOVEMENTS</Text>
                <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {/* Discipline Category */}
                <Text style={[styles.filterSectionTitle, { color: colors.textMuted }]}>DISCIPLINE / CATEGORY</Text>
                <View style={styles.chipsWrap}>
                  {EXERCISE_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.filterChip,
                        { backgroundColor: isDark ? '#051424' : '#f1f5f9', borderColor: colors.cardBorder },
                        selectedCategory === cat.id && [styles.filterChipActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
                      ]}
                      onPress={() => setSelectedCategory(cat.id)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { color: colors.textMuted },
                          selectedCategory === cat.id && [styles.filterChipTextActive, { color: colors.onPrimary }],
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Muscle Group */}
                <Text style={[styles.filterSectionTitle, { color: colors.textMuted }]}>TARGET MUSCLE</Text>
                <View style={styles.chipsWrap}>
                  {MUSCLE_GROUPS.map((mg) => (
                    <TouchableOpacity
                      key={mg.id}
                      style={[
                        styles.filterChip,
                        { backgroundColor: isDark ? '#051424' : '#f1f5f9', borderColor: colors.cardBorder },
                        selectedMuscle === mg.id && [styles.filterChipActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
                      ]}
                      onPress={() => setSelectedMuscle(mg.id)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { color: colors.textMuted },
                          selectedMuscle === mg.id && [styles.filterChipTextActive, { color: colors.onPrimary }],
                        ]}
                      >
                        {mg.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Equipment Type */}
                <Text style={[styles.filterSectionTitle, { color: colors.textMuted }]}>REQUIRED GEAR</Text>
                <View style={styles.chipsWrap}>
                  {EQUIPMENT_TYPES.map((eq) => (
                    <TouchableOpacity
                      key={eq.id}
                      style={[
                        styles.filterChip,
                        { backgroundColor: isDark ? '#051424' : '#f1f5f9', borderColor: colors.cardBorder },
                        selectedEquipment === eq.id && [styles.filterChipActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
                      ]}
                      onPress={() => setSelectedEquipment(eq.id)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { color: colors.textMuted },
                          selectedEquipment === eq.id && [styles.filterChipTextActive, { color: colors.onPrimary }],
                        ]}
                      >
                        {eq.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Difficulty */}
                <Text style={[styles.filterSectionTitle, { color: colors.textMuted }]}>SKILL LEVEL</Text>
                <View style={styles.chipsWrap}>
                  {['all', 'beginner', 'intermediate', 'advanced'].map((lvl) => (
                    <TouchableOpacity
                      key={lvl}
                      style={[
                        styles.filterChip,
                        { backgroundColor: isDark ? '#051424' : '#f1f5f9', borderColor: colors.cardBorder },
                        selectedDifficulty === lvl && [styles.filterChipActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
                      ]}
                      onPress={() => setSelectedDifficulty(lvl as any)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { color: colors.textMuted },
                          selectedDifficulty === lvl && [styles.filterChipTextActive, { color: colors.onPrimary }],
                        ]}
                      >
                        {lvl.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <TouchableOpacity
                style={[styles.applyFilterBtn, { backgroundColor: colors.primary }]}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={[styles.applyFilterBtnText, { color: colors.onPrimary }]}>APPLY FILTERS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Exercise Full Visual Detail Preview Modal */}
        <Modal
          visible={!!previewExercise}
          animationType="slide"
          transparent
          onRequestClose={() => setPreviewExercise(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {previewExercise && (
                <>
                  <View style={[styles.detailHeader, { borderColor: colors.borderSubtle }]}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={[styles.detailTitle, { color: colors.text }]}>{previewExercise.name}</Text>
                      <Text style={[styles.detailCategory, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>
                        {previewExercise.category.toUpperCase()} • {previewExercise.muscle_group.toUpperCase()} • {previewExercise.equipment.toUpperCase()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.closeDetailBtn, { backgroundColor: isDark ? '#051424' : '#f1f5f9', borderColor: colors.cardBorder }]}
                      onPress={() => setPreviewExercise(null)}
                    >
                      <Ionicons name="close" size={22} color={colors.text} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    style={styles.detailBody}
                    contentContainerStyle={styles.detailScrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {/* YouTube Video Masterclass Banner */}
                    <TouchableOpacity
                      style={[styles.youtubeHeroBanner, { backgroundColor: isDark ? '#071526' : '#fef2f2' }]}
                      onPress={() => {
                        const url = getExerciseVideoUrl(previewExercise);
                        Linking.openURL(url).catch(console.warn);
                      }}
                      activeOpacity={0.85}
                    >
                      <View style={styles.youtubeRedIconWrap}>
                        <Ionicons name="logo-youtube" size={18} color="#ffffff" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.youtubeHeroBannerTitle, { color: colors.text }]}>WATCH PRO YOUTUBE TUTORIAL</Text>
                        <Text style={[styles.youtubeHeroBannerSub, { color: colors.textMuted }]}>Video demonstration, form cues & athlete reps</Text>
                      </View>
                      <View style={[styles.youtubePlayIconPill, { backgroundColor: colors.primary }]}>
                        <Ionicons name="open-outline" size={13} color={colors.onPrimary} />
                      </View>
                    </TouchableOpacity>

                    {/* Interactive Visual & Biomechanics Card */}
                    <ExerciseVisualCard exercise={previewExercise} />

                    {/* Step by Step Execution Instructions */}
                    <Text style={[styles.detailSectionHeading, { color: colors.text }]}>STEP-BY-STEP HOW TO DO</Text>
                    {previewExercise.instructions.map((step, idx) => (
                      <View key={idx} style={[styles.stepRow, { backgroundColor: isDark ? '#0a1726' : '#f8fafc', borderColor: colors.cardBorder }]}>
                        <View style={[styles.stepNumBadge, { backgroundColor: colors.primary }]}>
                          <Text style={[styles.stepNumText, { color: colors.onPrimary }]}>{idx + 1}</Text>
                        </View>
                        <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>{step}</Text>
                      </View>
                    ))}

                    {/* Pro Safety & Execution Tips */}
                    {previewExercise.tips && previewExercise.tips.length > 0 && (
                      <View style={[styles.tipsContainer, { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.05)' : 'rgba(195, 244, 0, 0.12)', borderColor: isDark ? 'rgba(195, 244, 0, 0.25)' : 'rgba(195, 244, 0, 0.35)' }]}>
                        <View style={styles.tipsHeaderRow}>
                          <Ionicons name="shield-checkmark" size={16} color={isDark ? '#c3f400' : '#4d7c0f'} />
                          <Text style={[styles.tipsHeading, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>COACH BIOMECHANICAL CUES</Text>
                        </View>
                        {previewExercise.tips.map((tip, idx) => (
                          <Text key={idx} style={[styles.tipText, { color: colors.textSecondary }]}>
                            • {tip}
                          </Text>
                        ))}
                      </View>
                    )}
                  </ScrollView>

                  {/* Primary Action Button with Safe-Area Inset */}
                  <View style={[styles.detailFooter, { backgroundColor: isDark ? '#0a1726' : '#f8fafc', borderColor: colors.borderSubtle }]}>
                    <TouchableOpacity
                      style={[styles.addExerciseActionBtn, { backgroundColor: colors.primary }]}
                      onPress={() => handleAddExerciseToWorkout(previewExercise)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="add-circle" size={20} color={colors.onPrimary} />
                      <Text style={[styles.addExerciseActionText, { color: colors.onPrimary }]}>
                        {activeWorkout ? 'ADD TO ACTIVE SESSION' : 'START SESSION WITH THIS MOVEMENT'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontFamily: 'Oswald',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  filterToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  filterToggleBtnActive: {},
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 13,
  },
  categoryScrollWrap: {
    marginTop: 10,
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  categoryPillDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryPillText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11,
  },
  muscleScrollWrap: {
    marginTop: 8,
    marginBottom: 6,
  },
  muscleScrollContent: {
    paddingHorizontal: 16,
    gap: 6,
  },
  musclePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  musclePillActive: {},
  musclePillText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
  },
  musclePillTextActive: {
    fontWeight: '700',
  },
  activeFiltersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
  },
  activeFiltersLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 6,
    gap: 4,
  },
  activeFilterChipText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
  },
  resetFiltersText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    color: '#ef4444',
    marginLeft: 4,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 12,
  },
  exerciseCard: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
    height: 92,
  },
  thumbWrapper: {
    width: 68,
    height: 68,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbOverlayIcon: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(5, 20, 36, 0.7)',
    borderRadius: 10,
    padding: 2,
  },
  exerciseInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  exerciseName: {
    fontFamily: 'Oswald',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  categoryLine: {
    marginTop: 2,
    marginBottom: 4,
  },
  categoryMiniBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  categoryMiniBadgeText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 8,
    fontWeight: '700',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  muscleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  muscleBadgeText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: '#38bdf8',
    fontWeight: '700',
  },
  gearBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  gearBadgeText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
  },
  difficultyBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  difficultyBadgeText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  howToDoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  howToDoLinkText: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#38bdf8',
    fontWeight: '600',
  },
  quickAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontFamily: 'Oswald',
    fontSize: 18,
    marginTop: 16,
  },
  emptySub: {
    fontFamily: 'Inter',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  clearSearchBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  clearSearchBtnText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 20, 36, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderTopWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Oswald',
    fontSize: 18,
    letterSpacing: 1,
  },
  filterSectionTitle: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11,
    marginTop: 12,
    marginBottom: 8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterChipActive: {},
  filterChipText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '500',
  },
  filterChipTextActive: {
    fontWeight: '700',
  },
  applyFilterBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 18,
  },
  applyFilterBtnText: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  detailCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  detailTitle: {
    fontFamily: 'Oswald',
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  detailCategory: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10.5,
    marginTop: 4,
    fontWeight: '600',
  },
  closeDetailBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  detailBody: {
    paddingHorizontal: 20,
  },
  detailScrollContent: {
    paddingTop: 14,
    paddingBottom: 32,
  },
  youtubeHeroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.4)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  youtubeRedIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  youtubeHeroBannerTitle: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  youtubeHeroBannerSub: {
    fontFamily: 'Inter',
    fontSize: 10,
    marginTop: 1,
  },
  youtubePlayIconPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailSectionHeading: {
    fontFamily: 'Oswald',
    fontSize: 13,
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    padding: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  stepNumBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  stepNumText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11,
    fontWeight: '700',
  },
  stepDesc: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 12,
    lineHeight: 18,
  },
  tipsContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    marginBottom: 16,
  },
  tipsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  tipsHeading: {
    fontFamily: 'Oswald',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  tipText: {
    fontFamily: 'Inter',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 4,
  },
  detailFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderTopWidth: 1,
  },
  addExerciseActionBtn: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addExerciseActionText: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
