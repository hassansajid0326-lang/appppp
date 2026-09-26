import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useOfflineStore } from '../../lib/offlineStore';
import { useAuthStore } from '../../lib/store';
import { useAppTheme } from '../../lib/theme';
import {
  CURATED_WORKOUT_PROGRAMS,
  EXERCISE_CATEGORIES,
  WorkoutTemplate,
  UNIVERSAL_EXERCISES,
} from '../../lib/exerciseDatabase';

export default function WorkoutsScreen() {
  const navigation = useNavigation<any>();
  const { profile } = useAuthStore();
  const { colors, isDark } = useAppTheme();
  const {
    activeWorkout,
    workoutSessions,
    personalRecords,
    customTemplates,
    startActiveWorkout,
    loadTemplateIntoActive,
  } = useOfflineStore();

  const isImperial = profile?.units === 'imperial';
  const weightUnit = isImperial ? 'lbs' : 'kg';

  // Compute Weekly Consistency Stats
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisWeekSessions = workoutSessions.filter(
    (s) => new Date(s.completed_at) >= oneWeekAgo
  );
  const thisWeekVolume = thisWeekSessions.reduce(
    (acc, s) => acc + (s.total_volume_kg || 0),
    0
  );
  const prCount = Object.keys(personalRecords).length;

  const handleStartEmptyWorkout = () => {
    if (activeWorkout) {
      Alert.alert(
        'Active Session In Progress',
        `You have "${activeWorkout.name}" in progress. Would you like to resume it?`,
        [
          { text: 'Start New', style: 'destructive', onPress: () => {
            startActiveWorkout('Custom Workout Session');
            navigation.navigate('ActiveWorkout');
          }},
          { text: 'Resume Active', style: 'default', onPress: () => navigation.navigate('ActiveWorkout') },
        ]
      );
    } else {
      startActiveWorkout('Custom Workout Session');
      navigation.navigate('ActiveWorkout');
    }
  };

  const handleLaunchProgram = (program: WorkoutTemplate) => {
    if (activeWorkout) {
      Alert.alert(
        'Active Session In Progress',
        `You currently have a live workout in progress. Replace it with "${program.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Launch Protocol',
            style: 'destructive',
            onPress: () => {
              loadTemplateIntoActive(program);
              navigation.navigate('ActiveWorkout');
            },
          },
        ]
      );
    } else {
      loadTemplateIntoActive(program);
      navigation.navigate('ActiveWorkout');
    }
  };

  const allTemplates = [...customTemplates, ...CURATED_WORKOUT_PROGRAMS];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <LinearGradient colors={colors.backgroundGradient} style={styles.container}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View>
            <Text style={[styles.appTitle, { color: colors.text }]}>FITPULSE TRAINING</Text>
            <Text style={[styles.appSubtitle, { color: isDark ? '#c3f400' : '#65a30d' }]}>ATHLETE PROTOCOL COCKPIT</Text>
          </View>
          <TouchableOpacity
            style={[styles.historyBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => navigation.navigate('WorkoutHistory')}
          >
            <Ionicons name="time-outline" size={20} color={isDark ? "#c3f400" : "#65a30d"} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Active Workout Resume Sticky Banner */}
          {activeWorkout && (
            <TouchableOpacity
              style={[styles.activeWorkoutBanner, { backgroundColor: colors.card, borderColor: isDark ? '#c3f400' : '#65a30d' }]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('ActiveWorkout')}
            >
              <View style={styles.activeBannerLeft}>
                <View style={[styles.pulseDot, { backgroundColor: isDark ? '#c3f400' : '#65a30d' }]} />
                <View style={{ marginLeft: 10 }}>
                  <Text style={[styles.activeBannerTitle, { color: isDark ? '#c3f400' : '#65a30d' }]}>WORKOUT IN PROGRESS</Text>
                  <Text style={[styles.activeBannerSub, { color: colors.text }]} numberOfLines={1}>
                    {activeWorkout.name} • {activeWorkout.exercises.length} Movements
                  </Text>
                </View>
              </View>

              <View style={styles.resumeBtn}>
                <Text style={styles.resumeBtnText}>RESUME</Text>
                <Ionicons name="play" size={12} color="#051424" />
              </View>
            </TouchableOpacity>
          )}

          {/* Quick Action Cockpit Cards */}
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={[
                styles.actionCard,
                { backgroundColor: colors.card, borderColor: isDark ? '#c3f400' : '#65a30d' },
                isDark ? { backgroundColor: 'rgba(195, 244, 0, 0.08)' } : { backgroundColor: 'rgba(101, 163, 13, 0.08)' }
              ]}
              activeOpacity={0.8}
              onPress={handleStartEmptyWorkout}
            >
              <View style={styles.actionIconWrapPrimary}>
                <Ionicons name="add" size={26} color="#051424" />
              </View>
              <Text style={[styles.actionCardTitlePrimary, { color: isDark ? '#c3f400' : '#65a30d' }]}>QUICK START</Text>
              <Text style={[styles.actionCardSubPrimary, { color: colors.textSecondary }]}>Empty Workout Session</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('ExerciseLibrary')}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                <Ionicons name="library-outline" size={22} color={isDark ? "#c3f400" : "#65a30d"} />
              </View>
              <Text style={[styles.actionCardTitle, { color: colors.text }]}>EXERCISE VAULT</Text>
              <Text style={[styles.actionCardSub, { color: colors.textSecondary }]}>150+ Movements</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Hub Navigator Strip */}
          <View style={[styles.hubStrip, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <TouchableOpacity
              style={styles.hubItem}
              onPress={() => navigation.navigate('RoutineBuilder')}
            >
              <Ionicons name="create-outline" size={20} color="#38bdf8" />
              <Text style={[styles.hubItemText, { color: colors.text }]}>Architect</Text>
            </TouchableOpacity>
            <View style={[styles.hubDivider, { backgroundColor: colors.borderSubtle }]} />
            <TouchableOpacity
              style={styles.hubItem}
              onPress={() => navigation.navigate('WorkoutHistory')}
            >
              <Ionicons name="calendar-outline" size={20} color={isDark ? "#c3f400" : "#65a30d"} />
              <Text style={[styles.hubItemText, { color: colors.text }]}>Past Logs</Text>
            </TouchableOpacity>
            <View style={[styles.hubDivider, { backgroundColor: colors.borderSubtle }]} />
            <TouchableOpacity
              style={styles.hubItem}
              onPress={() => navigation.navigate('PersonalRecords')}
            >
              <Ionicons name="trophy-outline" size={20} color="#f59e0b" />
              <Text style={[styles.hubItemText, { color: colors.text }]}>PR Trophies</Text>
            </TouchableOpacity>
          </View>

          {/* Consistency & Weekly Metrics */}
          <View style={[styles.consistencyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.consistencyHeader}>
              <Text style={[styles.consistencyTitle, { color: colors.text }]}>WEEKLY TRAINING METRICS</Text>
              <Text style={[styles.consistencySub, { color: isDark ? '#c3f400' : '#65a30d' }]}>PAST 7 DAYS</Text>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricCol}>
                <Text style={[styles.metricNumber, { color: colors.text }]}>{thisWeekSessions.length}</Text>
                <Text style={[styles.metricLabelText, { color: colors.textMuted }]}>SESSIONS</Text>
              </View>
              <View style={[styles.metricLine, { backgroundColor: colors.borderSubtle }]} />
              <View style={styles.metricCol}>
                <Text style={[styles.metricNumber, { color: colors.text }]}>
                  {thisWeekVolume.toLocaleString()}
                </Text>
                <Text style={[styles.metricLabelText, { color: colors.textMuted }]}>VOLUME ({weightUnit.toUpperCase()})</Text>
              </View>
              <View style={[styles.metricLine, { backgroundColor: colors.borderSubtle }]} />
              <View style={styles.metricCol}>
                <Text style={[styles.metricNumber, { color: isDark ? '#c3f400' : '#65a30d' }]}>
                  {prCount}
                </Text>
                <Text style={[styles.metricLabelText, { color: colors.textMuted }]}>TOTAL PRs</Text>
              </View>
            </View>
          </View>

          {/* Curated Workout Programs Carousel */}
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>CURATED PROTOCOLS</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>READY-TO-LAUNCH WORKOUTS</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('RoutineBuilder')}>
              <Text style={[styles.createRoutineLink, { color: isDark ? '#c3f400' : '#65a30d' }]}>+ NEW ROUTINE</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.programsCarousel}
          >
            {allTemplates.map((program) => (
              <View key={program.id} style={[styles.programCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.programTopRow}>
                  <View style={[styles.programLevelBadge, { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.12)' : 'rgba(101, 163, 13, 0.12)' }]}>
                    <Text style={[styles.programLevelText, { color: isDark ? '#c3f400' : '#65a30d' }]}>{program.level.toUpperCase()}</Text>
                  </View>
                  <View style={styles.programDurationBadge}>
                    <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                    <Text style={[styles.programDurationText, { color: colors.textSecondary }]}>{program.duration_min}m</Text>
                  </View>
                </View>

                <Text style={[styles.programTitle, { color: colors.text }]} numberOfLines={2}>
                  {program.title}
                </Text>
                <Text style={styles.programCategory}>{program.category.toUpperCase()}</Text>
                <Text style={[styles.programDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                  {program.description}
                </Text>

                <View style={styles.programExCountRow}>
                  <Ionicons name="layers-outline" size={13} color={colors.textMuted} />
                  <Text style={[styles.programExCountText, { color: colors.textSecondary }]}>
                    {program.exercises.length} Movements included
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.launchProgramBtn}
                  onPress={() => handleLaunchProgram(program)}
                >
                  <Ionicons name="play" size={14} color="#051424" />
                  <Text style={styles.launchProgramBtnText}>START PROTOCOL</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Discipline Categories Grid */}
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>GLOBAL DISCIPLINES</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>EXPLORE BY WORKOUT TYPE</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('ExerciseLibrary', { initialCategory: 'all' })}>
              <Text style={styles.viewAllLink}>VIEW ALL (150+)</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.categoriesGrid}>
            {EXERCISE_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => {
              const count = UNIVERSAL_EXERCISES.filter((e) => e.category === cat.id).length;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                  activeOpacity={0.75}
                  onPress={() => navigation.navigate('ExerciseLibrary', { initialCategory: cat.id })}
                >
                  <View style={[styles.catIconWrap, { backgroundColor: `${cat.color}15`, borderColor: `${cat.color}40` }]}>
                    <Feather name={cat.icon as any} size={18} color={cat.color} />
                  </View>
                  <Text style={[styles.catName, { color: colors.text }]} numberOfLines={1}>{cat.name}</Text>
                  <Text style={[styles.catCount, { color: colors.textMuted }]}>{count} Exercises</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Recent Workout Logs Section */}
          {workoutSessions.length > 0 && (
            <View style={styles.recentLogsSection}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>RECENT LOGS</Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>LATEST EXECUTIONS</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('WorkoutHistory')}>
                  <Text style={styles.viewAllLink}>VIEW ALL</Text>
                </TouchableOpacity>
              </View>

              {workoutSessions.slice(0, 3).map((sessionItem) => (
                <View key={sessionItem.id} style={[styles.recentSessionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.recentSessionName, { color: colors.text }]}>{sessionItem.name}</Text>
                    <Text style={[styles.recentSessionDate, { color: colors.textMuted }]}>
                      {new Date(sessionItem.started_at).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      • {Math.round(sessionItem.duration_sec / 60)} min
                    </Text>
                  </View>
                  <View style={[styles.recentSessionVolumeBadge, { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.1)' : 'rgba(101, 163, 13, 0.12)', borderColor: isDark ? 'rgba(195, 244, 0, 0.2)' : 'rgba(101, 163, 13, 0.25)' }]}>
                    <Text style={[styles.recentSessionVolumeVal, { color: isDark ? '#c3f400' : '#65a30d' }]}>
                      {sessionItem.total_volume_kg.toLocaleString()} {weightUnit}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  appTitle: {
    fontFamily: 'Oswald',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  appSubtitle: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
  historyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 50 },
  activeWorkoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  activeBannerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  activeBannerTitle: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  activeBannerSub: {
    fontFamily: 'Inter',
    fontSize: 12,
    marginTop: 2,
  },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#c3f400',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  resumeBtnText: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
    color: '#051424',
    letterSpacing: 0.5,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  actionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionIconWrapPrimary: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#c3f400',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionCardTitlePrimary: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  actionCardSubPrimary: {
    fontFamily: 'Inter',
    fontSize: 11,
    marginTop: 2,
  },
  actionCardTitle: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  actionCardSub: {
    fontFamily: 'Inter',
    fontSize: 11,
    marginTop: 2,
  },
  hubStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    marginBottom: 18,
  },
  hubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hubItemText: {
    fontFamily: 'Oswald',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  hubDivider: {
    width: 1,
    height: 20,
  },
  consistencyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  consistencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  consistencyTitle: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  consistencySub: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricCol: { flex: 1, alignItems: 'center' },
  metricNumber: {
    fontFamily: 'JetBrains Mono',
    fontSize: 20,
    fontWeight: '700',
  },
  metricLabelText: {
    fontFamily: 'Inter',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 3,
  },
  metricLine: { width: 1, height: 28 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Oswald',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sectionSubtitle: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    marginTop: 2,
  },
  createRoutineLink: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  viewAllLink: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
    letterSpacing: 0.5,
  },
  programsCarousel: {
    paddingRight: 20,
    gap: 14,
    paddingBottom: 4,
    marginBottom: 20,
  },
  programCard: {
    width: 240,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  programTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  programLevelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  programLevelText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    fontWeight: '700',
  },
  programDurationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  programDurationText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11,
  },
  programTitle: {
    fontFamily: 'Oswald',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
    height: 44,
  },
  programCategory: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: '#38bdf8',
    marginBottom: 6,
  },
  programDesc: {
    fontFamily: 'Inter',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
    height: 32,
  },
  programExCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 14,
  },
  programExCountText: {
    fontFamily: 'Inter',
    fontSize: 11,
  },
  launchProgramBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#c3f400',
    borderRadius: 10,
    paddingVertical: 10,
  },
  launchProgramBtnText: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
    color: '#051424',
    letterSpacing: 1,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginBottom: 20,
  },
  categoryCard: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  catIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  catName: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '600',
  },
  catCount: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    marginTop: 2,
  },
  recentLogsSection: { marginTop: 4 },
  recentSessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  recentSessionName: {
    fontFamily: 'Oswald',
    fontSize: 15,
    fontWeight: '600',
  },
  recentSessionDate: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    marginTop: 2,
  },
  recentSessionVolumeBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  recentSessionVolumeVal: {
    fontFamily: 'JetBrains Mono',
    fontSize: 12,
    fontWeight: '700',
  },
});
