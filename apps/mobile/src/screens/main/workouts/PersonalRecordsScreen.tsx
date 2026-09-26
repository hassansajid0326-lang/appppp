import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useOfflineStore } from '../../../lib/offlineStore';
import { useAuthStore } from '../../../lib/store';
import { useAppTheme } from '../../../lib/theme';

export default function PersonalRecordsScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useAppTheme();
  const { personalRecords } = useOfflineStore();
  const { profile } = useAuthStore();
  const isImperial = profile?.units === 'imperial';
  const weightUnit = isImperial ? 'lbs' : 'kg';

  // 1RM Calculator State
  const [calcWeight, setCalcWeight] = useState('100');
  const [calcReps, setCalcReps] = useState('5');

  // Compute 1RM = Weight * (1 + Reps/30)
  const compute1RM = (w: number, r: number) => {
    if (w <= 0 || r <= 0) return 0;
    return Math.round(w * (1 + r / 30));
  };

  const parsedW = parseFloat(calcWeight) || 0;
  const parsedR = parseInt(calcReps, 10) || 0;
  const calculated1RM = compute1RM(parsedW, parsedR);

  const prList = Object.values(personalRecords);

  // Key hallmark lifts
  const benchPR = personalRecords['ch-01'] || personalRecords['pl-03'];
  const squatPR = personalRecords['lg-01'] || personalRecords['pl-01'];
  const deadliftPR = personalRecords['bk-01'] || personalRecords['pl-06'];
  const ohpPR = personalRecords['sh-01'];

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
            <Text style={[styles.headerTitle, { color: colors.text }]}>PERSONAL RECORDS</Text>
            <Text style={[styles.headerSubtitle, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>TROPHY ROOM & 1RM CALCULATOR</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Big Lifts Showcase Grid */}
          <Text style={[styles.sectionHeading, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>THE POWER CORNER</Text>
          <View style={styles.showcaseGrid}>
            {/* Bench Press */}
            <View style={[styles.hallmarkCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.hallmarkIconRow}>
                <Ionicons name="trophy" size={18} color={isDark ? '#c3f400' : '#4d7c0f'} />
                <Text style={[styles.hallmarkTag, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>CHEST</Text>
              </View>
              <Text style={[styles.hallmarkName, { color: colors.text }]}>BENCH PRESS</Text>
              <Text style={[styles.hallmarkVal, { color: colors.text }]}>
                {benchPR ? `${benchPR.max_weight_kg} ${weightUnit}` : '---'}
              </Text>
              <Text style={[styles.hallmarkSub, { color: colors.textMuted }]}>
                {benchPR ? `${benchPR.max_reps} reps • 1RM: ~${benchPR.estimated_1rm}${weightUnit}` : 'No record yet'}
              </Text>
            </View>

            {/* Squat */}
            <View style={[styles.hallmarkCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.hallmarkIconRow}>
                <Ionicons name="trophy" size={18} color="#38bdf8" />
                <Text style={[styles.hallmarkTag, { color: '#38bdf8' }]}>QUADS</Text>
              </View>
              <Text style={[styles.hallmarkName, { color: colors.text }]}>BACK SQUAT</Text>
              <Text style={[styles.hallmarkVal, { color: colors.text }]}>
                {squatPR ? `${squatPR.max_weight_kg} ${weightUnit}` : '---'}
              </Text>
              <Text style={[styles.hallmarkSub, { color: colors.textMuted }]}>
                {squatPR ? `${squatPR.max_reps} reps • 1RM: ~${squatPR.estimated_1rm}${weightUnit}` : 'No record yet'}
              </Text>
            </View>

            {/* Deadlift */}
            <View style={[styles.hallmarkCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.hallmarkIconRow}>
                <Ionicons name="trophy" size={18} color="#f59e0b" />
                <Text style={[styles.hallmarkTag, { color: '#f59e0b' }]}>POSTERIOR</Text>
              </View>
              <Text style={[styles.hallmarkName, { color: colors.text }]}>DEADLIFT</Text>
              <Text style={[styles.hallmarkVal, { color: colors.text }]}>
                {deadliftPR ? `${deadliftPR.max_weight_kg} ${weightUnit}` : '---'}
              </Text>
              <Text style={[styles.hallmarkSub, { color: colors.textMuted }]}>
                {deadliftPR ? `${deadliftPR.max_reps} reps • 1RM: ~${deadliftPR.estimated_1rm}${weightUnit}` : 'No record yet'}
              </Text>
            </View>

            {/* Overhead Press */}
            <View style={[styles.hallmarkCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.hallmarkIconRow}>
                <Ionicons name="trophy" size={18} color="#a855f7" />
                <Text style={[styles.hallmarkTag, { color: '#a855f7' }]}>DELTS</Text>
              </View>
              <Text style={[styles.hallmarkName, { color: colors.text }]}>OVERHEAD PRESS</Text>
              <Text style={[styles.hallmarkVal, { color: colors.text }]}>
                {ohpPR ? `${ohpPR.max_weight_kg} ${weightUnit}` : '---'}
              </Text>
              <Text style={[styles.hallmarkSub, { color: colors.textMuted }]}>
                {ohpPR ? `${ohpPR.max_reps} reps • 1RM: ~${ohpPR.estimated_1rm}${weightUnit}` : 'No record yet'}
              </Text>
            </View>
          </View>

          {/* Interactive 1RM Calculator */}
          <Text style={[styles.sectionHeading, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>1-REP MAX (1RM) CALCULATOR</Text>
          <View style={[styles.calcCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.calcInputsRow}>
              <View style={styles.calcInputBox}>
                <Text style={[styles.calcInputLabel, { color: colors.textMuted }]}>WEIGHT ({weightUnit.toUpperCase()})</Text>
                <TextInput
                  style={[styles.calcInput, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : '#f8fafc', borderColor: colors.cardBorder, color: isDark ? '#c3f400' : '#051424' }]}
                  keyboardType="numeric"
                  value={calcWeight}
                  onChangeText={setCalcWeight}
                  placeholder="100"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={styles.calcInputBox}>
                <Text style={[styles.calcInputLabel, { color: colors.textMuted }]}>REPS PERFORMED</Text>
                <TextInput
                  style={[styles.calcInput, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : '#f8fafc', borderColor: colors.cardBorder, color: isDark ? '#c3f400' : '#051424' }]}
                  keyboardType="numeric"
                  value={calcReps}
                  onChangeText={setCalcReps}
                  placeholder="5"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            {/* Estimated 1RM Big Badge */}
            <View style={[styles.est1RMBox, { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.08)' : 'rgba(195, 244, 0, 0.15)', borderColor: isDark ? 'rgba(195, 244, 0, 0.3)' : 'rgba(195, 244, 0, 0.4)' }]}>
              <Text style={[styles.est1RMLabel, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>ESTIMATED 1-REP MAX</Text>
              <Text style={[styles.est1RMVal, { color: colors.text }]}>
                {calculated1RM} <Text style={{ fontSize: 16, color: colors.textMuted }}>{weightUnit}</Text>
              </Text>
            </View>

            {/* Rep Percentage Matrix */}
            <View style={[styles.matrixRow, { borderColor: colors.borderSubtle }]}>
              <View style={styles.matrixItem}>
                <Text style={[styles.matrixPct, { color: colors.textMuted }]}>100%</Text>
                <Text style={[styles.matrixWeight, { color: colors.text }]}>{calculated1RM}</Text>
                <Text style={[styles.matrixRepLabel, { color: colors.textSecondary }]}>1 Rep</Text>
              </View>
              <View style={styles.matrixItem}>
                <Text style={[styles.matrixPct, { color: colors.textMuted }]}>93%</Text>
                <Text style={[styles.matrixWeight, { color: colors.text }]}>{Math.round(calculated1RM * 0.93)}</Text>
                <Text style={[styles.matrixRepLabel, { color: colors.textSecondary }]}>3 Reps</Text>
              </View>
              <View style={styles.matrixItem}>
                <Text style={[styles.matrixPct, { color: colors.textMuted }]}>87%</Text>
                <Text style={[styles.matrixWeight, { color: colors.text }]}>{Math.round(calculated1RM * 0.87)}</Text>
                <Text style={[styles.matrixRepLabel, { color: colors.textSecondary }]}>5 Reps</Text>
              </View>
              <View style={styles.matrixItem}>
                <Text style={[styles.matrixPct, { color: colors.textMuted }]}>80%</Text>
                <Text style={[styles.matrixWeight, { color: colors.text }]}>{Math.round(calculated1RM * 0.80)}</Text>
                <Text style={[styles.matrixRepLabel, { color: colors.textSecondary }]}>8 Reps</Text>
              </View>
              <View style={styles.matrixItem}>
                <Text style={[styles.matrixPct, { color: colors.textMuted }]}>75%</Text>
                <Text style={[styles.matrixWeight, { color: colors.text }]}>{Math.round(calculated1RM * 0.75)}</Text>
                <Text style={[styles.matrixRepLabel, { color: colors.textSecondary }]}>10 Reps</Text>
              </View>
            </View>
          </View>

          {/* Complete PR Logs */}
          <Text style={[styles.sectionHeading, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>ALL ACHIEVED RECORDS ({prList.length})</Text>
          {prList.length > 0 ? (
            prList.map((pr, idx) => (
              <View key={idx} style={[styles.prListItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={[styles.prListTrophy, { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.1)' : 'rgba(195, 244, 0, 0.2)' }]}>
                  <Ionicons name="trophy-outline" size={20} color={isDark ? '#c3f400' : '#4d7c0f'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.prListName, { color: colors.text }]}>{pr.exercise_name}</Text>
                  <Text style={[styles.prListSub, { color: colors.textMuted }]}>
                    Max: {pr.max_weight_kg}
                    {weightUnit} × {pr.max_reps} reps
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.prList1RM, { color: isDark ? '#c3f400' : '#4d7c0f' }]}>
                    ~{pr.estimated_1rm} {weightUnit}
                  </Text>
                  <Text style={[styles.prList1RMLabel, { color: colors.textMuted }]}>Est. 1RM</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={[styles.emptyPRBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Feather name="award" size={36} color={colors.textMuted} />
              <Text style={[styles.emptyPRTitle, { color: colors.text }]}>No Records Recorded</Text>
              <Text style={[styles.emptyPRSub, { color: colors.textMuted }]}>
                Execute and complete workout sessions to automatically unlock and store personal bests.
              </Text>
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
  scrollContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 50 },
  sectionHeading: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 10,
  },
  showcaseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  hallmarkCard: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  hallmarkIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  hallmarkTag: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    fontWeight: '700',
  },
  hallmarkName: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '600',
  },
  hallmarkVal: {
    fontFamily: 'JetBrains Mono',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  hallmarkSub: {
    fontFamily: 'Inter',
    fontSize: 10,
    marginTop: 2,
  },
  calcCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  calcInputsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  calcInputBox: { flex: 1 },
  calcInputLabel: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 6,
  },
  calcInput: {
    borderWidth: 1,
    borderRadius: 10,
    height: 44,
    textAlign: 'center',
    fontFamily: 'JetBrains Mono',
    fontSize: 16,
    fontWeight: '700',
  },
  est1RMBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  est1RMLabel: {
    fontFamily: 'Oswald',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  est1RMVal: {
    fontFamily: 'JetBrains Mono',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 2,
  },
  matrixRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  matrixItem: { alignItems: 'center' },
  matrixPct: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
  },
  matrixWeight: {
    fontFamily: 'JetBrains Mono',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  matrixRepLabel: {
    fontFamily: 'Inter',
    fontSize: 9,
    marginTop: 2,
  },
  prListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  prListTrophy: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prListName: {
    fontFamily: 'Oswald',
    fontSize: 15,
    fontWeight: '600',
  },
  prListSub: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11,
    marginTop: 2,
  },
  prList1RM: {
    fontFamily: 'JetBrains Mono',
    fontSize: 15,
    fontWeight: '700',
  },
  prList1RMLabel: {
    fontFamily: 'Inter',
    fontSize: 9,
  },
  emptyPRBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    borderRadius: 14,
    borderWidth: 1,
  },
  emptyPRTitle: {
    fontFamily: 'Oswald',
    fontSize: 16,
    marginTop: 10,
    letterSpacing: 0.5,
  },
  emptyPRSub: {
    fontFamily: 'Inter',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});
