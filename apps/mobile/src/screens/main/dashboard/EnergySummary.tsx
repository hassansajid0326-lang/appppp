import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile } from '../../../lib/store';
import { useAppTheme } from '../../../lib/theme';

interface EnergySummaryProps {
  profile: UserProfile | null;
  steps: number;
  weightKg: number;
  caloriesGained: number;
  workoutCalories?: number;
}

export default function EnergySummary({ 
  profile, 
  steps, 
  weightKg, 
  caloriesGained,
  workoutCalories = 0
}: EnergySummaryProps) {
  const { colors, isDark } = useAppTheme();

  // 1. Calculate Resting BMR (Mifflin-St Jeor)
  let bmr = 1600; // Default average fallback
  
  const heightVal = profile?.height_cm || 170;
  const ageVal = profile?.age || 25;
  const sexVal = profile?.sex || 'other';
  
  if (sexVal === 'male') {
    bmr = 10 * weightKg + 6.25 * heightVal - 5 * ageVal + 5;
  } else if (sexVal === 'female') {
    bmr = 10 * weightKg + 6.25 * heightVal - 5 * ageVal - 161;
  } else {
    // Average gender-neutral Mifflin-St Jeor
    bmr = 10 * weightKg + 6.25 * heightVal - 5 * ageVal - 78;
  }

  // Calculate pro-rated BMR burned so far today (resting burn accumulated up to current hour)
  const now = new Date();
  const hoursPassed = now.getHours() + now.getMinutes() / 60;
  const bmrBurnedSoFar = Math.round(bmr * (hoursPassed / 24));

  // 2. Calculate Active Calories from Steps (MET formula: 0.000525 * weightKg * steps)
  const activeCalories = Math.round(0.000525 * weightKg * steps);
  const totalBurned = Math.round(bmrBurnedSoFar + activeCalories + workoutCalories);
  
  // 3. Energy Balance
  const netBalance = Math.round(caloriesGained - totalBurned);
  const isSurplus = netBalance >= 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Energy Balance</Text>
      
      <View style={[styles.burnContainer, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
        <View style={styles.burnTextContainer}>
          <Text style={[styles.burnValue, { color: colors.text }]}>{totalBurned.toLocaleString()} kcal</Text>
          <Text style={[styles.burnLabel, { color: colors.textSecondary }]}>Total Burn Today</Text>
        </View>
        <Ionicons name="flame" size={32} color="#ff4a4a" />
      </View>

      <View style={styles.breakdownRow}>
        <View style={styles.breakdownItem}>
          <Text style={[styles.subValue, { color: colors.text }]}>{bmrBurnedSoFar} kcal</Text>
          <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Resting BMR</Text>
          <Text style={[styles.dailyBmrSublabel, { color: colors.textMuted }]}>
            Daily: {Math.round(bmr)} kcal
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
        <View style={styles.breakdownItem}>
          <Text style={[styles.subValue, { color: colors.text }]}>{activeCalories} kcal</Text>
          <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Active Steps</Text>
          <Text style={[styles.dailyBmrSublabel, { color: colors.textMuted }]}>
            {steps.toLocaleString()} steps
          </Text>
        </View>
        {workoutCalories > 0 && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
            <View style={styles.breakdownItem}>
              <Text style={[styles.subValue, { color: colors.text }]}>{workoutCalories} kcal</Text>
              <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Active Workouts</Text>
              <Text style={[styles.dailyBmrSublabel, { color: colors.textMuted }]}>
                Stopwatch logs
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Energy Balance (Surplus/Deficit) Display */}
      <View style={[styles.balanceContainer, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
        <View style={styles.balanceRow}>
          <View style={styles.balanceSub}>
            <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>GAINED</Text>
            <Text style={[styles.balanceSubValue, { color: isDark ? '#c3f400' : '#65a30d' }]}>
              +{Math.round(caloriesGained)} kcal
            </Text>
          </View>
          <View style={[styles.verticalDivider, { backgroundColor: colors.borderSubtle }]} />
          <View style={styles.balanceSub}>
            <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>BURNED</Text>
            <Text style={[styles.balanceSubValue, { color: '#ff4a4a' }]}>
              -{totalBurned} kcal
            </Text>
          </View>
        </View>

        <View style={[
          styles.netPill, 
          { 
            backgroundColor: isSurplus 
              ? (isDark ? 'rgba(195, 244, 0, 0.15)' : 'rgba(101, 163, 13, 0.12)') 
              : 'rgba(255, 74, 74, 0.12)', 
            borderColor: isSurplus 
              ? (isDark ? '#c3f400' : '#65a30d') 
              : '#ff4a4a' 
          }
        ]}>
          <Text style={[
            styles.netText, 
            { color: isSurplus ? (isDark ? '#c3f400' : '#65a30d') : '#ff4a4a' }
          ]}>
            NET BALANCE: {isSurplus ? '+' : ''}{netBalance} kcal ({isSurplus ? 'SURPLUS' : 'DEFICIT'})
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignSelf: 'stretch',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Oswald',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 16,
  },
  burnContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  burnTextContainer: {
    flexDirection: 'column',
  },
  burnValue: {
    fontFamily: 'Oswald',
    fontSize: 22,
    fontWeight: '700',
  },
  burnLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    marginTop: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  subValue: {
    fontFamily: 'Oswald',
    fontSize: 16,
    fontWeight: '700',
  },
  subLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    marginTop: 4,
  },
  dailyBmrSublabel: {
    fontSize: 9,
    fontFamily: 'JetBrains Mono',
    marginTop: 2,
  },
  divider: {
    height: 36,
    width: 1,
  },
  balanceContainer: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceSub: {
    flex: 1,
    alignItems: 'center',
  },
  balanceLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  balanceSubValue: {
    fontFamily: 'Oswald',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  verticalDivider: {
    width: 1,
    height: 24,
  },
  netPill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  netText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
