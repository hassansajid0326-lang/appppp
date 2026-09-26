import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useOfflineStore } from '../../../lib/offlineStore';
import {
  UNIVERSAL_EXERCISES,
  ExerciseItem,
  WorkoutTemplate,
} from '../../../lib/exerciseDatabase';
import { useAppTheme } from '../../../lib/theme';

export default function RoutineBuilderScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useAppTheme();
  const { saveCustomTemplate, startActiveWorkout } = useOfflineStore();

  const [routineName, setRoutineName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Strength');
  const [estimatedDuration, setEstimatedDuration] = useState('45');
  const [selectedLevel, setSelectedLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');

  // Selected exercises for this custom routine
  const [exercisesList, setExercisesList] = useState<
    {
      exercise_id: string;
      exercise_name: string;
      muscle_group: string;
      target_sets: number;
      target_reps: string;
    }[]
  >([]);

  // Exercise Vault Picker Modal
  const [pickerVisible, setPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAddExerciseFromVault = (exercise: ExerciseItem) => {
    // Check if already in list
    const exists = exercisesList.some((e) => e.exercise_id === exercise.id);
    if (exists) {
      Alert.alert('Already Added', `${exercise.name} is already in this routine.`);
      return;
    }

    setExercisesList((prev) => [
      ...prev,
      {
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        muscle_group: exercise.muscle_group,
        target_sets: 3,
        target_reps: '8-10',
      },
    ]);
  };

  const handleRemoveExercise = (idx: number) => {
    setExercisesList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateSets = (idx: number, delta: number) => {
    setExercisesList((prev) => {
      const updated = [...prev];
      const newSets = Math.max(1, Math.min(10, updated[idx].target_sets + delta));
      updated[idx] = { ...updated[idx], target_sets: newSets };
      return updated;
    });
  };

  const handleUpdateReps = (idx: number, repsStr: string) => {
    setExercisesList((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], target_reps: repsStr };
      return updated;
    });
  };

  const handleSaveRoutine = (startImmediately: boolean = false) => {
    if (!routineName.trim()) {
      Alert.alert('Routine Name Required', 'Please enter a name for your custom routine.');
      return;
    }

    if (exercisesList.length === 0) {
      Alert.alert('Add Exercises', 'Please add at least one exercise from the vault.');
      return;
    }

    const template: WorkoutTemplate = {
      id: `custom_${Date.now()}`,
      title: routineName.trim(),
      category: selectedCategory,
      duration_min: parseInt(estimatedDuration, 10) || 45,
      level: selectedLevel,
      description: `Custom routine with ${exercisesList.length} movements.`,
      icon: 'activity',
      exercises: exercisesList,
    };

    saveCustomTemplate(template);

    if (startImmediately) {
      const initialExercises = exercisesList.map((e) => {
        const matched = UNIVERSAL_EXERCISES.find((u) => u.id === e.exercise_id);
        return (
          matched || {
            id: e.exercise_id,
            name: e.exercise_name,
            category: 'strength' as any,
            muscle_group: e.muscle_group as any,
            equipment: 'other' as any,
            difficulty: 'intermediate' as any,
            instructions: [],
          }
        );
      });

      startActiveWorkout(template.title, initialExercises);
      navigation.navigate('ActiveWorkout');
    } else {
      Alert.alert('Routine Saved', `"${routineName}" is now available in your custom workouts.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <LinearGradient colors={colors.backgroundGradient as [string, string, ...string[]]} style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={[styles.backButton, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(0, 0, 0, 0.05)' }]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>ROUTINE ARCHITECT</Text>
            <Text style={[styles.headerSubtitle, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>CUSTOM WORKOUT BUILDER</Text>
          </View>
          <TouchableOpacity
            style={[styles.saveHeaderBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleSaveRoutine(false)}
          >
            <Text style={[styles.saveHeaderBtnText, { color: colors.onPrimary }]}>SAVE</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Routine Details Card */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.cardSectionTitle, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>PROTOCOL PARAMETERS</Text>

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>ROUTINE NAME</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#f8fafc', borderColor: colors.cardBorder, color: colors.text }]}
              placeholder="e.g. Chest & Triceps Shred"
              placeholderTextColor={colors.textMuted}
              value={routineName}
              onChangeText={setRoutineName}
            />

            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>EST. DURATION (MIN)</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#f8fafc', borderColor: colors.cardBorder, color: colors.text }]}
                  keyboardType="numeric"
                  placeholder="45"
                  placeholderTextColor={colors.textMuted}
                  value={estimatedDuration}
                  onChangeText={setEstimatedDuration}
                />
              </View>
              <View style={{ flex: 1.2 }}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>DIFFICULTY LEVEL</Text>
                <View style={[styles.levelSelector, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#f1f5f9', borderColor: colors.cardBorder }]}>
                  {(['Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (
                    <TouchableOpacity
                      key={lvl}
                      style={[
                        styles.levelBtn,
                        selectedLevel === lvl && [styles.levelBtnActive, { backgroundColor: colors.primary }],
                      ]}
                      onPress={() => setSelectedLevel(lvl)}
                    >
                      <Text
                        style={[
                          styles.levelBtnText,
                          { color: colors.textMuted },
                          selectedLevel === lvl && [styles.levelBtnTextActive, { color: colors.onPrimary }],
                        ]}
                      >
                        {lvl.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* Exercises Section */}
          <View style={styles.exercisesHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              MOVEMENTS ({exercisesList.length})
            </Text>
            <TouchableOpacity
              style={[styles.addVaultBtn, { backgroundColor: colors.primary }]}
              onPress={() => setPickerVisible(true)}
            >
              <Ionicons name="add" size={16} color={colors.onPrimary} />
              <Text style={[styles.addVaultBtnText, { color: colors.onPrimary }]}>ADD FROM VAULT</Text>
            </TouchableOpacity>
          </View>

          {exercisesList.length > 0 ? (
            exercisesList.map((item, idx) => (
              <View key={idx} style={[styles.exerciseItemCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.exerciseTopRow}>
                  <View style={[styles.orderBadge, { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.15)' : 'rgba(195, 244, 0, 0.25)', borderColor: isDark ? '#c3f400' : '#4d7c0f' }]}>
                    <Text style={[styles.orderBadgeText, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.exItemName, { color: colors.text }]}>{item.exercise_name}</Text>
                    <Text style={styles.exItemMuscle}>
                      {item.muscle_group.toUpperCase()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveExercise(idx)}
                    style={styles.removeBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                {/* Targets Adjuster */}
                <View style={[styles.targetsRow, { borderColor: colors.borderSubtle }]}>
                  {/* Sets Adjuster */}
                  <View style={styles.targetCol}>
                    <Text style={[styles.targetLabel, { color: colors.textMuted }]}>TARGET SETS</Text>
                    <View style={[styles.stepperWrap, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : '#f8fafc', borderColor: colors.cardBorder }]}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => handleUpdateSets(idx, -1)}
                      >
                        <Ionicons name="remove" size={14} color={colors.text} />
                      </TouchableOpacity>
                      <Text style={[styles.stepperVal, { color: colors.text }]}>{item.target_sets}</Text>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => handleUpdateSets(idx, 1)}
                      >
                        <Ionicons name="add" size={14} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Reps Target */}
                  <View style={styles.targetCol}>
                    <Text style={[styles.targetLabel, { color: colors.textMuted }]}>TARGET REPS</Text>
                    <TextInput
                      style={[styles.repInput, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : '#f8fafc', borderColor: colors.cardBorder, color: colors.text }]}
                      value={item.target_reps}
                      onChangeText={(txt) => handleUpdateReps(idx, txt)}
                      placeholder="8-10"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>
              </View>
            ))
          ) : (
            <TouchableOpacity
              style={[styles.emptyExercisesCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => setPickerVisible(true)}
            >
              <Feather name="plus-circle" size={32} color={isDark ? '#c3f400' : '#4d7c0f'} />
              <Text style={[styles.emptyExercisesTitle, { color: colors.text }]}>No Exercises Added</Text>
              <Text style={[styles.emptyExercisesSub, { color: colors.textMuted }]}>
                Tap here to browse 150+ universal exercises and add them to your protocol.
              </Text>
            </TouchableOpacity>
          )}

          {/* Action Launch Buttons */}
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={[styles.startNowBtn, { backgroundColor: colors.primary }]}
              onPress={() => handleSaveRoutine(true)}
            >
              <Ionicons name="play" size={18} color={colors.onPrimary} />
              <Text style={[styles.startNowBtnText, { color: colors.onPrimary }]}>SAVE & START WORKOUT NOW</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Vault Picker Modal */}
        <Modal
          visible={pickerVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setPickerVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.vaultModalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.vaultHeader}>
                <Text style={[styles.vaultTitle, { color: colors.text }]}>SELECT EXERCISE</Text>
                <TouchableOpacity onPress={() => setPickerVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={[styles.vaultSearchBox, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f1f5f9' }]}>
                <Ionicons name="search" size={16} color={colors.textMuted} />
                <TextInput
                  style={[styles.vaultSearchInput, { color: colors.text }]}
                  placeholder="Search movement or muscle..."
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <FlatList
                data={UNIVERSAL_EXERCISES.filter((e) => {
                  const q = searchQuery.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    e.name.toLowerCase().includes(q) ||
                    e.muscle_group.toLowerCase().includes(q) ||
                    e.category.toLowerCase().includes(q)
                  );
                })}
                keyExtractor={(item) => item.id}
                initialNumToRender={8}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
                style={{ maxHeight: 400 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                getItemLayout={(_: any, index: number) => ({
                  length: 64,
                  offset: 64 * index,
                  index,
                })}
                renderItem={({ item: ex }) => {
                  const isSelected = exercisesList.some((e) => e.exercise_id === ex.id);
                  return (
                    <TouchableOpacity
                      key={ex.id}
                      style={[styles.vaultItem, { borderColor: colors.borderSubtle }, isSelected && styles.vaultItemAdded]}
                      onPress={() => handleAddExerciseFromVault(ex)}
                    >
                      <Image
                        source={{
                          uri:
                            ex.image_url ||
                            'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&auto=format&fit=crop&q=80',
                        }}
                        style={[styles.vaultItemThumb, { borderColor: colors.cardBorder, backgroundColor: isDark ? '#051424' : '#f1f5f9' }]}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={150}
                      />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.vaultItemName, { color: colors.text }]}>{ex.name}</Text>
                        <Text style={[styles.vaultItemSub, { color: colors.textMuted }]}>
                          {ex.category.toUpperCase()} • {ex.muscle_group.toUpperCase()} • {ex.equipment}
                        </Text>
                      </View>
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                        size={24}
                        color={isSelected ? '#10b981' : (isDark ? '#c3f400' : '#4d7c0f')}
                      />
                    </TouchableOpacity>
                  );
                }}
              />

              <TouchableOpacity
                style={[styles.closeVaultBtn, { backgroundColor: colors.primary }]}
                onPress={() => setPickerVisible(false)}
              >
                <Text style={[styles.closeVaultBtnText, { color: colors.onPrimary }]}>DONE SELECTING</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: { flex: 1, marginLeft: 12 },
  headerTitle: {
    fontFamily: 'Oswald',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 2,
  },
  saveHeaderBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveHeaderBtnText: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 50, paddingTop: 6 },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  cardSectionTitle: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  fieldLabel: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    fontFamily: 'Inter',
    fontSize: 14,
    marginBottom: 14,
  },
  rowInputs: { flexDirection: 'row', gap: 12 },
  levelSelector: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    height: 44,
  },
  levelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  levelBtnActive: {},
  levelBtnText: {
    fontFamily: 'Oswald',
    fontSize: 11,
    fontWeight: '600',
  },
  levelBtnTextActive: {
    fontWeight: '700',
  },
  exercisesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Oswald',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  addVaultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addVaultBtnText: {
    fontFamily: 'Oswald',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  exerciseItemCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  exerciseTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  orderBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBadgeText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11,
    fontWeight: '700',
  },
  exItemName: {
    fontFamily: 'Oswald',
    fontSize: 15,
    fontWeight: '600',
  },
  exItemMuscle: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    color: '#38bdf8',
    marginTop: 1,
  },
  removeBtn: { padding: 4 },
  targetsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  targetCol: { flex: 1 },
  targetLabel: {
    fontFamily: 'Inter',
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 36,
  },
  stepperBtn: {
    width: 32,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperVal: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'JetBrains Mono',
    fontSize: 14,
    fontWeight: '700',
  },
  repInput: {
    borderRadius: 8,
    borderWidth: 1,
    height: 36,
    textAlign: 'center',
    fontFamily: 'JetBrains Mono',
    fontSize: 13,
  },
  emptyExercisesCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyExercisesTitle: {
    fontFamily: 'Oswald',
    fontSize: 16,
    marginTop: 10,
    letterSpacing: 0.5,
  },
  emptyExercisesSub: {
    fontFamily: 'Inter',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  bottomActions: { marginTop: 20 },
  startNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  startNowBtnText: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  vaultModalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: 40,
  },
  vaultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  vaultTitle: {
    fontFamily: 'Oswald',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  vaultSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
    gap: 8,
  },
  vaultSearchInput: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 13,
  },
  vaultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  vaultItemThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
  },
  vaultItemAdded: {
    opacity: 0.6,
  },
  vaultItemName: {
    fontFamily: 'Oswald',
    fontSize: 15,
    fontWeight: '600',
  },
  vaultItemSub: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    marginTop: 2,
  },
  closeVaultBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  closeVaultBtnText: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
