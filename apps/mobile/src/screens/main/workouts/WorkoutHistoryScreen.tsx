import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useOfflineStore, CompletedWorkoutSession } from '../../../lib/offlineStore';
import { useAuthStore } from '../../../lib/store';
import { UNIVERSAL_EXERCISES } from '../../../lib/exerciseDatabase';
import { useAppTheme } from '../../../lib/theme';

export default function WorkoutHistoryScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useAppTheme();
  const { session, profile } = useAuthStore();
  const userId = session?.user?.id || 'guest';
  const isImperial = profile?.units === 'imperial';
  const weightUnit = isImperial ? 'lbs' : 'kg';

  const {
    workoutSessions,
    deleteWorkoutSession,
    startActiveWorkout,
  } = useOfflineStore();

  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedSessionId((prev) => (prev === id ? null : id));
  };

  const handleRepeatWorkout = (sessionItem: CompletedWorkoutSession) => {
    // Find matched exercises from database
    const initialExercises = sessionItem.exercises.map((e) => {
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

    startActiveWorkout(`Repeat: ${sessionItem.name}`, initialExercises);
    navigation.navigate('ActiveWorkout');
  };

  const handleDeleteSession = (sessionItem: CompletedWorkoutSession) => {
    Alert.alert(
      'Delete Log',
      `Delete ${sessionItem.name} from your history? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteWorkoutSession(userId, sessionItem.id),
        },
      ]
    );
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (e) {
      return isoString;
    }
  };

  // Compute lifetime stats
  const lifetimeVolume = workoutSessions.reduce((acc, s) => acc + (s.total_volume_kg || 0), 0);
  const totalSetsCount = workoutSessions.reduce((acc, s) => acc + (s.total_sets || 0), 0);

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
            <Text style={[styles.headerTitle, { color: colors.text }]}>WORKOUT HISTORY</Text>
            <Text style={[styles.headerSubtitle, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>
              {workoutSessions.length} SESSIONS RECORDED
            </Text>
          </View>
        </View>

        {/* Stats Summary Strip */}
        <View style={[styles.statsStrip, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>LIFETIME VOLUME</Text>
            <Text style={[styles.statVal, { color: colors.text }]}>
              {lifetimeVolume.toLocaleString()}{' '}
              <Text style={{ fontSize: 11, color: colors.textMuted }}>{weightUnit}</Text>
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.borderSubtle }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>TOTAL SETS</Text>
            <Text style={[styles.statVal, { color: colors.text }]}>{totalSetsCount}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.borderSubtle }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>SESSIONS</Text>
            <Text style={[styles.statVal, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>
              {workoutSessions.length}
            </Text>
          </View>
        </View>

        {/* Sessions List */}
        <FlatList
          data={workoutSessions}
          keyExtractor={(item) => item.id}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isExpanded = expandedSessionId === item.id;
            return (
              <View style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <TouchableOpacity
                  style={styles.cardHeader}
                  activeOpacity={0.8}
                  onPress={() => toggleExpand(item.id)}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.sessionNameRow}>
                      <Text style={[styles.sessionName, { color: colors.text }]}>{item.name}</Text>
                      {item.pr_count && item.pr_count > 0 ? (
                        <View style={[styles.prBadge, { backgroundColor: colors.primary }]}>
                          <Ionicons name="trophy" size={10} color={colors.onPrimary} />
                          <Text style={[styles.prBadgeText, { color: colors.onPrimary }]}>{item.pr_count} PRs</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.sessionDate, { color: colors.textMuted }]}>{formatDate(item.started_at)}</Text>
                  </View>

                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>

                {/* Metric Badges */}
                <View style={styles.badgesRow}>
                  <View style={[styles.badgeItem, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f1f5f9' }]}>
                    <Ionicons name="time-outline" size={13} color="#38bdf8" />
                    <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                      {Math.max(1, Math.round(item.duration_sec / 60))} min
                    </Text>
                  </View>
                  <View style={[styles.badgeItem, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f1f5f9' }]}>
                    <Ionicons name="barbell-outline" size={13} color={isDark ? '#c3f400' : '#4d7c0f'} />
                    <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                      {item.total_volume_kg.toLocaleString()} {weightUnit}
                    </Text>
                  </View>
                  <View style={[styles.badgeItem, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f1f5f9' }]}>
                    <Ionicons name="layers-outline" size={13} color={colors.textSecondary} />
                    <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{item.total_sets} sets</Text>
                  </View>
                </View>

                {/* Expanded Exercises Breakdown */}
                {isExpanded && (
                  <View style={styles.expandedContent}>
                    <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
                    <Text style={[styles.exerciseSummaryHeading, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>EXERCISES EXECUTED:</Text>

                    {item.exercises.map((ex, exIdx) => (
                      <View key={exIdx} style={styles.exerciseDetailBlock}>
                        <Text style={[styles.exDetailName, { color: colors.text }]}>
                          {ex.exercise_name}{' '}
                          <Text style={styles.exDetailMuscle}>({ex.muscle_group})</Text>
                        </Text>

                        <View style={styles.setsChipsWrap}>
                          {ex.sets.map((st, sIdx) => (
                            <View key={sIdx} style={[styles.setChip, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc', borderColor: colors.cardBorder }]}>
                              <Text style={[styles.setChipText, { color: colors.textSecondary }]}>
                                Set {st.set_number}: {st.weight_kg}
                                {weightUnit} × {st.reps}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ))}

                    {item.notes ? (
                      <View style={[styles.notesBox, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#f8fafc' }]}>
                        <Text style={[styles.notesLabel, { color: colors.textMuted }]}>Notes:</Text>
                        <Text style={[styles.notesText, { color: colors.textSecondary }]}>{item.notes}</Text>
                      </View>
                    ) : null}

                    {/* Actions Row */}
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        style={[styles.repeatBtn, { backgroundColor: colors.primary }]}
                        onPress={() => handleRepeatWorkout(item)}
                      >
                        <Ionicons name="refresh" size={14} color={colors.onPrimary} />
                        <Text style={[styles.repeatBtnText, { color: colors.onPrimary }]}>REPEAT WORKOUT</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteSession(item)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Feather name="calendar" size={54} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Workouts Logged Yet</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Your completed workout sessions, total weight volume, and PR trophies will appear here.
              </Text>
              <TouchableOpacity
                style={[styles.startFirstBtn, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('ActiveWorkout')}
              >
                <Text style={[styles.startFirstBtnText, { color: colors.onPrimary }]}>START FIRST WORKOUT</Text>
              </TouchableOpacity>
            </View>
          }
        />
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
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 12,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  statBox: { alignItems: 'center', flex: 1 },
  statLabel: {
    fontFamily: 'Inter',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statVal: {
    fontFamily: 'JetBrains Mono',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  statDivider: { width: 1, height: 24 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sessionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sessionName: {
    fontFamily: 'Oswald',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  prBadgeText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    fontWeight: '700',
  },
  sessionDate: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11,
    marginTop: 3,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11,
  },
  expandedContent: { marginTop: 12 },
  divider: { height: 1, marginBottom: 12 },
  exerciseSummaryHeading: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  exerciseDetailBlock: { marginBottom: 10 },
  exDetailName: {
    fontFamily: 'Oswald',
    fontSize: 14,
  },
  exDetailMuscle: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    color: '#38bdf8',
    textTransform: 'uppercase',
  },
  setsChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  setChip: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  setChipText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
  },
  notesBox: {
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  notesLabel: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '600',
  },
  notesText: {
    fontFamily: 'Inter',
    fontSize: 12,
    marginTop: 2,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    gap: 10,
  },
  repeatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
    paddingVertical: 10,
  },
  repeatBtnText: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  deleteBtn: {
    width: 40,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontFamily: 'Oswald',
    fontSize: 20,
    marginTop: 16,
    letterSpacing: 1,
  },
  emptySub: {
    fontFamily: 'Inter',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  startFirstBtn: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  startFirstBtnText: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
