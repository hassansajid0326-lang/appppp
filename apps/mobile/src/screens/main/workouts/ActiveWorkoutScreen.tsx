import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Vibration,
  Platform,
  FlatList,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useOfflineStore, CompletedWorkoutSession } from '../../../lib/offlineStore';
import { useAuthStore } from '../../../lib/store';
import { useAppTheme } from '../../../lib/theme';
import { UNIVERSAL_EXERCISES, ExerciseItem, getExerciseVideoUrl } from '../../../lib/exerciseDatabase';
import ExerciseVisualCard from '../../../components/ExerciseVisualCard';

export default function ActiveWorkoutScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useAppTheme();
  const { session, profile } = useAuthStore();
  const userId = session?.user?.id || 'guest';
  const isImperial = profile?.units === 'imperial';
  const weightUnit = isImperial ? 'lbs' : 'kg';

  const {
    activeWorkout,
    updateActiveWorkoutSet,
    addActiveWorkoutSet,
    removeActiveWorkoutSet,
    removeActiveWorkoutExercise,
    addActiveWorkoutExercise,
    finishActiveWorkout,
    cancelActiveWorkout,
    updateActiveWorkoutTime,
  } = useOfflineStore();

  // Elapsed Timer state
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Rest Timer state
  const [restTimerSeconds, setRestTimerSeconds] = useState(0);
  const [restTimerTotal, setRestTimerTotal] = useState(60);
  const [restTimerActive, setRestTimerActive] = useState(false);

  // Exercise Picker Modal
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  // Form Guide Modal
  const [guideExercise, setGuideExercise] = useState<ExerciseItem | null>(null);

  // Finish Summary Modal
  const [finishModalVisible, setFinishModalVisible] = useState(false);
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [savedSummary, setSavedSummary] = useState<CompletedWorkoutSession | null>(null);

  // Initialize elapsed time from active workout
  useEffect(() => {
    if (activeWorkout) {
      const started = new Date(activeWorkout.started_at).getTime();
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - started) / 1000));
      setSecondsElapsed(activeWorkout.duration_sec || diffSec);
    }
  }, []);

  // Live Workout Clock Interval
  useEffect(() => {
    let interval: any = null;
    if (activeWorkout && !isPaused) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => {
          const next = prev + 1;
          if (next % 10 === 0) {
            updateActiveWorkoutTime(next);
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeWorkout, isPaused]);

  // Rest Timer Countdown Interval
  useEffect(() => {
    let restInterval: any = null;
    if (restTimerActive && restTimerSeconds > 0) {
      restInterval = setInterval(() => {
        setRestTimerSeconds((prev) => {
          if (prev <= 1) {
            setRestTimerActive(false);
            try {
              Vibration.vibrate([0, 400, 200, 400]);
            } catch (e) {}
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (restInterval) clearInterval(restInterval);
    };
  }, [restTimerActive, restTimerSeconds]);

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleSet = (exerciseIndex: number, setIndex: number, currentCompleted: boolean) => {
    const willComplete = !currentCompleted;
    updateActiveWorkoutSet(exerciseIndex, setIndex, { completed: willComplete });

    if (willComplete) {
      // Trigger rest timer
      setRestTimerTotal(60);
      setRestTimerSeconds(60);
      setRestTimerActive(true);
      try {
        Vibration.vibrate(80);
      } catch (e) {}
    }
  };

  const handleAdjustRestTimer = (amountSec: number) => {
    setRestTimerSeconds((prev) => Math.max(0, prev + amountSec));
    setRestTimerActive(true);
  };

  const handleFinishPrompt = () => {
    if (!activeWorkout || activeWorkout.exercises.length === 0) {
      Alert.alert('Empty Workout', 'Please add at least one exercise before finishing.');
      return;
    }

    Alert.alert(
      'Finish Workout',
      'Are you ready to complete and log this training session?',
      [
        { text: 'Resume', style: 'cancel' },
        {
          text: 'Finish & Save',
          style: 'default',
          onPress: async () => {
            const summary = await finishActiveWorkout(userId, workoutNotes);
            if (summary) {
              setSavedSummary(summary);
              setFinishModalVisible(true);
            }
          },
        },
      ]
    );
  };

  const handleCancelPrompt = () => {
    Alert.alert(
      'Discard Workout',
      'Are you sure you want to cancel and discard this session? All logged sets will be lost.',
      [
        { text: 'Keep Training', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            cancelActiveWorkout();
            navigation.goBack();
          },
        },
      ]
    );
  };

  // Compute live session stats
  const liveStats = React.useMemo(() => {
    if (!activeWorkout) return { volume: 0, completedSets: 0, totalSets: 0, est1RM: 0 };
    let vol = 0;
    let completed = 0;
    let total = 0;
    let max1RM = 0;

    activeWorkout.exercises.forEach((ex) => {
      ex.sets.forEach((st) => {
        total += 1;
        if (st.completed) {
          completed += 1;
          const w = Number(st.weight_kg) || 0;
          const r = Number(st.reps) || 0;
          vol += w * r;

          const est = Math.round(w * (1 + r / 30));
          if (est > max1RM) max1RM = est;
        }
      });
    });

    return { volume: vol, completedSets: completed, totalSets: total, est1RM: max1RM };
  }, [activeWorkout]);

  if (!activeWorkout) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        <LinearGradient colors={colors.backgroundGradient} style={styles.container}>
          <View style={styles.emptySessionWrap}>
            <Feather name="shield" size={60} color={colors.textMuted} />
            <Text style={[styles.emptySessionTitle, { color: colors.text }]}>No Active Workout</Text>
            <Text style={[styles.emptySessionSub, { color: colors.textSecondary }]}>
              Start an empty workout or launch one of our curated programs.
            </Text>
            <TouchableOpacity
              style={[styles.startNewBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                navigation.navigate('WorkoutsHome');
              }}
            >
              <Text style={[styles.startNewBtnText, { color: colors.onPrimary }]}>GO TO WORKOUTS</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <LinearGradient colors={colors.backgroundGradient} style={styles.container}>
        {/* Top Floating Cockpit Header */}
        <View style={[styles.cockpitHeader, { borderColor: colors.borderSubtle }]}>
          <TouchableOpacity onPress={handleCancelPrompt} style={[styles.discardBtn, { backgroundColor: colors.cardSubtle }]}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.sessionTitleWrap}>
            <Text style={[styles.sessionNameText, { color: colors.text }]} numberOfLines={1}>
              {activeWorkout.name.toUpperCase()}
            </Text>
            <View style={styles.clockRow}>
              <View style={[styles.statusDot, { backgroundColor: colors.primary }, isPaused && styles.statusDotPaused]} />
              <Text style={[styles.clockText, { color: colors.textSecondary }]}>{formatTimer(secondsElapsed)}</Text>
              <TouchableOpacity
                onPress={() => setIsPaused(!isPaused)}
                style={styles.pauseBtn}
              >
                <Ionicons
                  name={isPaused ? 'play' : 'pause'}
                  size={14}
                  color={isPaused ? colors.primary : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={[styles.finishBtn, { backgroundColor: colors.primary }]} onPress={handleFinishPrompt}>
            <Text style={[styles.finishBtnText, { color: colors.onPrimary }]}>FINISH</Text>
          </TouchableOpacity>
        </View>

        {/* Live Metrics Bar */}
        <View style={[styles.metricsBar, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>VOLUME</Text>
            <Text style={[styles.metricVal, { color: colors.text }]}>
              {liveStats.volume.toLocaleString()} <Text style={[styles.metricUnit, { color: colors.textSecondary }]}>{weightUnit}</Text>
            </Text>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: colors.borderSubtle }]} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>SETS</Text>
            <Text style={[styles.metricVal, { color: colors.text }]}>
              {liveStats.completedSets}
              <Text style={[styles.metricUnit, { color: colors.textSecondary }]}> / {liveStats.totalSets}</Text>
            </Text>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: colors.borderSubtle }]} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>PEAK 1RM</Text>
            <Text style={[styles.metricVal, { color: colors.text }]}>
              {liveStats.est1RM} <Text style={[styles.metricUnit, { color: colors.textSecondary }]}>{weightUnit}</Text>
            </Text>
          </View>
        </View>

        {/* Rest Timer Countdown Sticky Card */}
        {restTimerActive && (
          <View style={[styles.restTimerCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
            <View style={styles.restTimerInfo}>
              <MaterialCommunityIcons name="timer-sand" size={22} color={colors.primary} />
              <View style={{ marginLeft: 8 }}>
                <Text style={[styles.restTimerLabel, { color: colors.primary }]}>REST TIMER</Text>
                <Text style={[styles.restTimerClock, { color: colors.text }]}>{formatTimer(restTimerSeconds)}</Text>
              </View>
            </View>

            <View style={styles.restTimerControls}>
              <TouchableOpacity
                style={[styles.restTimerBtn, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}
                onPress={() => handleAdjustRestTimer(-15)}
              >
                <Text style={[styles.restTimerBtnText, { color: colors.text }]}>-15s</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.restTimerBtn, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}
                onPress={() => handleAdjustRestTimer(30)}
              >
                <Text style={[styles.restTimerBtnText, { color: colors.text }]}>+30s</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.restTimerSkipBtn, { backgroundColor: colors.borderSubtle }]}
                onPress={() => setRestTimerActive(false)}
              >
                <Ionicons name="close" size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Exercises Scroll Container */}
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {activeWorkout.exercises.map((exercise, exIdx) => {
            const matchedEx = UNIVERSAL_EXERCISES.find((u) => u.id === exercise.exercise_id);
            return (
              <View key={`${exercise.exercise_id}_${exIdx}`} style={[styles.exerciseCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                {/* Exercise Header */}
                <View style={styles.exerciseHeader}>
                  {/* Thumbnail */}
                  <TouchableOpacity
                    style={[styles.exThumbWrap, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}
                    onPress={() => matchedEx && setGuideExercise(matchedEx)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{
                        uri:
                          matchedEx?.image_url ||
                          'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&auto=format&fit=crop&q=80',
                      }}
                      style={styles.exThumbImage}
                      contentFit="cover"
                      transition={200}
                    />
                    <View style={[styles.exThumbZoomBadge, { backgroundColor: colors.primary }]}>
                      <Ionicons name="eye" size={10} color={colors.onPrimary} />
                    </View>
                  </TouchableOpacity>

                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.exCardName, { color: colors.text }]}>{exercise.exercise_name}</Text>
                    <View style={styles.exSubRow}>
                      <Text style={[styles.exCardSub, { color: colors.primary }]}>
                        {exercise.muscle_group.toUpperCase()} • {exercise.equipment}
                      </Text>
                      {matchedEx && (
                        <TouchableOpacity
                          style={[styles.formGuidePill, { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.1)' : 'rgba(22, 163, 74, 0.1)', borderColor: isDark ? 'rgba(195, 244, 0, 0.3)' : 'rgba(22, 163, 74, 0.3)' }]}
                          onPress={() => setGuideExercise(matchedEx)}
                        >
                          <Ionicons name="sparkles" size={11} color={colors.primary} />
                          <Text style={[styles.formGuidePillText, { color: colors.primary }]}>HOW TO DO</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        'Remove Exercise',
                        `Remove ${exercise.exercise_name} from this session?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Remove',
                            style: 'destructive',
                            onPress: () => removeActiveWorkoutExercise(exIdx),
                          },
                        ]
                      );
                    }}
                    style={styles.exMenuBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Sets Table Header */}
                <View style={[styles.tableHeader, { borderColor: colors.borderSubtle }]}>
                  <Text style={[styles.thText, { color: colors.textMuted, width: 36 }]}>SET</Text>
                  <Text style={[styles.thText, { color: colors.textMuted, flex: 1.2 }]}>PREV</Text>
                  <Text style={[styles.thText, { color: colors.textMuted, flex: 1.2 }]}>{weightUnit.toUpperCase()}</Text>
                  <Text style={[styles.thText, { color: colors.textMuted, flex: 1 }]}>REPS</Text>
                  <Text style={[styles.thText, { color: colors.textMuted, width: 44, textAlign: 'center' }]}>DONE</Text>
                </View>

                {/* Set Rows */}
                {exercise.sets.map((setObj, sIdx) => {
                  const isCompleted = setObj.completed;
                  return (
                    <View
                      key={sIdx}
                      style={[
                        styles.setRow,
                        isCompleted && { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.08)' : 'rgba(22, 163, 74, 0.1)' }
                      ]}
                    >
                      {/* Set Number */}
                      <View style={styles.setNumBox}>
                        <Text style={[styles.setNumText, { color: isCompleted ? colors.primary : colors.textSecondary }]}>
                          {setObj.set_number}
                        </Text>
                      </View>

                      {/* Previous Performance */}
                      <View style={{ flex: 1.2, justifyContent: 'center' }}>
                        <Text style={[styles.prevText, { color: colors.textMuted }]}>{setObj.previous || '-'}</Text>
                      </View>

                      {/* Weight Input */}
                      <View style={{ flex: 1.2 }}>
                        <TextInput
                          style={[
                            styles.setInput,
                            { backgroundColor: colors.cardSubtle, borderColor: isCompleted ? colors.primary : colors.borderSubtle, color: colors.text }
                          ]}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor={colors.textMuted}
                          value={setObj.weight_kg ? String(setObj.weight_kg) : ''}
                          onChangeText={(txt) => {
                            const num = parseFloat(txt) || 0;
                            updateActiveWorkoutSet(exIdx, sIdx, { weight_kg: num });
                          }}
                        />
                      </View>

                      {/* Reps Input */}
                      <View style={{ flex: 1 }}>
                        <TextInput
                          style={[
                            styles.setInput,
                            { backgroundColor: colors.cardSubtle, borderColor: isCompleted ? colors.primary : colors.borderSubtle, color: colors.text }
                          ]}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor={colors.textMuted}
                          value={setObj.reps ? String(setObj.reps) : ''}
                          onChangeText={(txt) => {
                            const num = parseInt(txt, 10) || 0;
                            updateActiveWorkoutSet(exIdx, sIdx, { reps: num });
                          }}
                        />
                      </View>

                      {/* Checkbox Complete */}
                      <TouchableOpacity
                        style={[
                          styles.checkBtn,
                          {
                            backgroundColor: isCompleted ? colors.primary : colors.cardSubtle,
                            borderColor: isCompleted ? colors.primary : colors.borderSubtle
                          }
                        ]}
                        onPress={() => handleToggleSet(exIdx, sIdx, isCompleted)}
                      >
                        <Ionicons
                          name={isCompleted ? 'checkmark' : 'checkmark-outline'}
                          size={20}
                          color={isCompleted ? colors.onPrimary : colors.textMuted}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}

                {/* Add Set Button */}
                <TouchableOpacity
                  style={[styles.addSetBtn, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}
                  onPress={() => addActiveWorkoutSet(exIdx)}
                >
                  <Ionicons name="add" size={16} color={colors.primary} />
                  <Text style={[styles.addSetBtnText, { color: colors.primary }]}>ADD SET</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          {/* Add Exercise Floating Button */}
          <TouchableOpacity
            style={[styles.addExerciseCardBtn, { backgroundColor: colors.primary }]}
            onPress={() => setPickerVisible(true)}
          >
            <Ionicons name="add-circle" size={22} color={colors.onPrimary} />
            <Text style={[styles.addExerciseCardBtnText, { color: colors.onPrimary }]}>ADD EXERCISE</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Form Guide Quick Modal (Mid Workout) */}
        <Modal
          visible={!!guideExercise}
          animationType="slide"
          transparent
          onRequestClose={() => setGuideExercise(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.guideCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {guideExercise && (
                <>
                  <View style={[styles.guideHeader, { borderColor: colors.borderSubtle }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.guideTitle, { color: colors.text }]}>{guideExercise.name}</Text>
                      <Text style={[styles.guideSub, { color: colors.primary }]}>
                        {guideExercise.muscle_group.toUpperCase()} • {guideExercise.equipment}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setGuideExercise(null)}>
                      <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    style={{ maxHeight: 460 }}
                    contentContainerStyle={{ paddingBottom: 16 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {/* YouTube Video Masterclass Banner */}
                    <TouchableOpacity
                      style={[styles.youtubeGuideBanner, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}
                      onPress={() => {
                        const url = getExerciseVideoUrl(guideExercise);
                        Linking.openURL(url).catch(console.warn);
                      }}
                      activeOpacity={0.85}
                    >
                      <View style={styles.youtubeRedIconWrap}>
                        <Ionicons name="logo-youtube" size={18} color="#ffffff" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.youtubeGuideTitle, { color: colors.text }]}>WATCH PRO YOUTUBE TUTORIAL</Text>
                        <Text style={[styles.youtubeGuideSub, { color: colors.textSecondary }]}>Video execution & coach cues</Text>
                      </View>
                      <View style={[styles.youtubePlayPill, { backgroundColor: colors.primary }]}>
                        <Ionicons name="open-outline" size={13} color={colors.onPrimary} />
                      </View>
                    </TouchableOpacity>

                    <ExerciseVisualCard exercise={guideExercise} />

                    <Text style={[styles.guideSectionTitle, { color: colors.primary }]}>FORM INSTRUCTIONS</Text>
                    {guideExercise.instructions.map((step, idx) => (
                      <View key={idx} style={styles.stepRow}>
                        <View style={[styles.stepNumBadge, { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.15)' : 'rgba(22, 163, 74, 0.15)', borderColor: colors.primary }]}>
                          <Text style={[styles.stepNumText, { color: colors.primary }]}>{idx + 1}</Text>
                        </View>
                        <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>{step}</Text>
                      </View>
                    ))}
                  </ScrollView>

                  <TouchableOpacity
                    style={[styles.closeGuideBtn, { backgroundColor: colors.primary }]}
                    onPress={() => setGuideExercise(null)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.closeGuideBtnText, { color: colors.onPrimary }]}>GOT IT, BACK TO WORKOUT</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Exercise Quick Picker Modal */}
        <Modal
          visible={pickerVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setPickerVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.pickerCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.pickerHeader}>
                <Text style={[styles.pickerTitle, { color: colors.text }]}>ADD EXERCISE</Text>
                <TouchableOpacity onPress={() => setPickerVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Search */}
              <View style={[styles.pickerSearch, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}>
                <Ionicons name="search" size={16} color={colors.textMuted} />
                <TextInput
                  style={[styles.pickerSearchInput, { color: colors.text }]}
                  placeholder="Search movement..."
                  placeholderTextColor={colors.textMuted}
                  value={pickerSearch}
                  onChangeText={setPickerSearch}
                />
              </View>

              <FlatList
                data={UNIVERSAL_EXERCISES.filter((e) => {
                  const q = pickerSearch.trim().toLowerCase();
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
                style={{ maxHeight: 380 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                getItemLayout={(_: any, index: number) => ({
                  length: 64,
                  offset: 64 * index,
                  index,
                })}
                renderItem={({ item: ex }) => (
                  <TouchableOpacity
                    style={[styles.pickerItem, { borderColor: colors.borderSubtle }]}
                    onPress={() => {
                      addActiveWorkoutExercise(ex);
                      setPickerVisible(false);
                      setPickerSearch('');
                    }}
                  >
                    <Image
                      source={{
                        uri:
                          ex.image_url ||
                          'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=160&auto=format&fit=crop&q=80',
                      }}
                      style={[styles.pickerItemThumb, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.pickerItemName, { color: colors.text }]}>{ex.name}</Text>
                      <Text style={[styles.pickerItemSub, { color: colors.textMuted }]}>
                        {ex.category.toUpperCase()} • {ex.muscle_group.toUpperCase()} • {ex.equipment}
                      </Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* Workout Complete Celebration Modal */}
        <Modal
          visible={finishModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => {
            setFinishModalVisible(false);
            navigation.navigate('WorkoutsHome');
          }}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.celebrationCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
              <View style={[styles.trophyIconWrap, { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.1)' : 'rgba(22, 163, 74, 0.1)', borderColor: colors.primary }]}>
                <Ionicons name="trophy" size={48} color={colors.primary} />
              </View>

              <Text style={[styles.celebrateTitle, { color: colors.text }]}>PROTOCOL EXECUTED</Text>
              <Text style={[styles.celebrateSub, { color: colors.textSecondary }]}>Training session logged & verified.</Text>

              {savedSummary && (
                <View style={styles.summaryStatsGrid}>
                  <View style={[styles.summaryStatBox, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}>
                    <Text style={[styles.summaryStatLabel, { color: colors.textMuted }]}>DURATION</Text>
                    <Text style={[styles.summaryStatVal, { color: colors.text }]}>
                      {Math.round(savedSummary.duration_sec / 60)} min
                    </Text>
                  </View>
                  <View style={[styles.summaryStatBox, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}>
                    <Text style={[styles.summaryStatLabel, { color: colors.textMuted }]}>TOTAL VOLUME</Text>
                    <Text style={[styles.summaryStatVal, { color: colors.text }]}>
                      {savedSummary.total_volume_kg.toLocaleString()} {weightUnit}
                    </Text>
                  </View>
                  <View style={[styles.summaryStatBox, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}>
                    <Text style={[styles.summaryStatLabel, { color: colors.textMuted }]}>SETS LOGGED</Text>
                    <Text style={[styles.summaryStatVal, { color: colors.text }]}>{savedSummary.total_sets}</Text>
                  </View>
                  <View style={[styles.summaryStatBox, { backgroundColor: colors.cardSubtle, borderColor: colors.cardBorder }]}>
                    <Text style={[styles.summaryStatLabel, { color: colors.textMuted }]}>NEW PRs</Text>
                    <Text style={[styles.summaryStatVal, { color: colors.primary }]}>
                      {savedSummary.pr_count || 0} 🏆
                    </Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[styles.doneBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setFinishModalVisible(false);
                  navigation.navigate('WorkoutsHome');
                }}
              >
                <Text style={[styles.doneBtnText, { color: colors.onPrimary }]}>RETURN TO DASHBOARD</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#051424' },
  container: { flex: 1 },
  cockpitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#1e293b',
  },
  discardBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTitleWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  sessionNameText: {
    fontFamily: 'Oswald',
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
  },
  clockRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#c3f400',
  },
  statusDotPaused: {
    backgroundColor: '#f59e0b',
  },
  clockText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 13,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  pauseBtn: { padding: 4 },
  finishBtn: {
    backgroundColor: '#c3f400',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  finishBtnText: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
    color: '#051424',
    letterSpacing: 1,
  },
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  metricItem: { alignItems: 'center', flex: 1 },
  metricLabel: {
    fontFamily: 'Inter',
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  metricVal: {
    fontFamily: 'JetBrains Mono',
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
  },
  metricUnit: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '400',
  },
  metricDivider: { width: 1, height: 24, backgroundColor: '#334155' },
  restTimerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0d1c2d',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#c3f400',
  },
  restTimerInfo: { flexDirection: 'row', alignItems: 'center' },
  restTimerLabel: {
    fontFamily: 'Oswald',
    fontSize: 11,
    color: '#c3f400',
    letterSpacing: 1,
  },
  restTimerClock: {
    fontFamily: 'JetBrains Mono',
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  restTimerControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  restTimerBtn: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#475569',
  },
  restTimerBtnText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  restTimerSkipBtn: {
    backgroundColor: '#334155',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContainer: { flex: 1, marginTop: 10 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 60 },
  exerciseCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    marginBottom: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  exThumbWrap: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#051424',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#334155',
  },
  exThumbImage: {
    width: '100%',
    height: '100%',
  },
  exThumbZoomBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#c3f400',
    borderRadius: 4,
    padding: 1,
  },
  exCardName: {
    fontFamily: 'Oswald',
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  exSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  exCardSub: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    color: '#38bdf8',
  },
  formGuidePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(195, 244, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(195, 244, 0, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  formGuidePillText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    fontWeight: '700',
    color: '#c3f400',
  },
  exMenuBtn: { padding: 4 },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#334155',
    paddingBottom: 6,
    marginBottom: 8,
    gap: 8,
  },
  thText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
    borderRadius: 8,
  },
  setRowCompleted: {
    backgroundColor: 'rgba(195, 244, 0, 0.05)',
  },
  setNumBox: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '700',
  },
  setNumTextCompleted: {
    color: '#c3f400',
  },
  prevText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11,
    color: '#64748B',
  },
  setInput: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    height: 36,
    textAlign: 'center',
    fontFamily: 'JetBrains Mono',
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  setInputCompleted: {
    borderColor: 'rgba(195, 244, 0, 0.4)',
    color: '#c3f400',
  },
  checkBtn: {
    width: 44,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtnCompleted: {
    backgroundColor: '#c3f400',
    borderColor: '#c3f400',
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 8,
    marginTop: 10,
  },
  addSetBtnText: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
    color: '#c3f400',
    letterSpacing: 1,
  },
  addExerciseCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#c3f400',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
  },
  addExerciseCardBtnText: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '700',
    color: '#051424',
    letterSpacing: 1,
  },
  emptySessionWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptySessionTitle: {
    fontFamily: 'Oswald',
    fontSize: 22,
    color: '#ffffff',
    marginTop: 16,
    letterSpacing: 1,
  },
  emptySessionSub: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  startNewBtn: {
    marginTop: 24,
    backgroundColor: '#c3f400',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  startNewBtnText: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '700',
    color: '#051424',
    letterSpacing: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  guideCard: {
    backgroundColor: '#0d1c2d',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: '#334155',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '88%',
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#1e293b',
    paddingBottom: 10,
  },
  guideTitle: {
    fontFamily: 'Oswald',
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  guideSub: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10.5,
    color: '#38bdf8',
    marginTop: 2,
    fontWeight: '600',
  },
  youtubeGuideBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#071526',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.4)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  youtubeRedIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  youtubeGuideTitle: {
    fontFamily: 'Oswald',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  youtubeGuideSub: {
    fontFamily: 'Inter',
    fontSize: 9.5,
    color: '#94a3b8',
    marginTop: 1,
  },
  youtubePlayPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#c3f400',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideSectionTitle: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
    color: '#c3f400',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 10,
  },
  stepNumBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(195, 244, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#c3f400',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    fontWeight: '700',
    color: '#c3f400',
  },
  stepDesc: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  closeGuideBtn: {
    backgroundColor: '#c3f400',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  closeGuideBtnText: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
    color: '#051424',
    letterSpacing: 1,
  },
  pickerCard: {
    backgroundColor: '#0d1c2d',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: '#334155',
    padding: 20,
    paddingBottom: 40,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pickerTitle: {
    fontFamily: 'Oswald',
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
  },
  pickerSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
    gap: 8,
  },
  pickerSearchInput: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#ffffff',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#1e293b',
  },
  pickerItemThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#051424',
    borderWidth: 1,
    borderColor: '#334155',
  },
  pickerItemName: {
    fontFamily: 'Oswald',
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  pickerItemSub: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  celebrationCard: {
    backgroundColor: '#0d1c2d',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: '#c3f400',
    padding: 24,
    alignItems: 'center',
    paddingBottom: 40,
  },
  trophyIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(195, 244, 0, 0.1)',
    borderWidth: 2,
    borderColor: '#c3f400',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  celebrateTitle: {
    fontFamily: 'Oswald',
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  celebrateSub: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 20,
  },
  summaryStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
    marginBottom: 24,
  },
  summaryStatBox: {
    width: '48%',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  summaryStatLabel: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryStatVal: {
    fontFamily: 'JetBrains Mono',
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 4,
  },
  doneBtn: {
    width: '100%',
    backgroundColor: '#c3f400',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  doneBtnText: {
    fontFamily: 'Oswald',
    fontSize: 15,
    fontWeight: '700',
    color: '#051424',
    letterSpacing: 1,
  },
});
