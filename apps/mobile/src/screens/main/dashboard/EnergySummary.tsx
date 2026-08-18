import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile } from '../../../lib/store';

interface EnergySummaryProps {
  profile: UserProfile | null;
  steps: number;
  weightKg: number;
  caloriesGained: number;
}

export default function EnergySummary({ 
  profile, 
  steps, 
  weightKg, 
  caloriesGained 
}: EnergySummaryProps) {
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
  const totalBurned = Math.round(bmrBurnedSoFar + activeCalories);
  
  // 3. Energy Balance
  const netBalance = Math.round(caloriesGained - totalBurned);
  const isSurplus = netBalance >= 0;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Energy Balance</Text>
      
      <View style={styles.burnContainer}>
        <View style={styles.burnTextContainer}>
          <Text style={styles.burnValue}>{totalBurned.toLocaleString()} kcal</Text>
          <Text style={styles.burnLabel}>Total Burn Today</Text>
        </View>
        <Ionicons name="flame" size={32} color="#ff4a4a" />
      </View>

      <View style={styles.breakdownRow}>
        <View style={styles.breakdownItem}>
          <Text style={styles.subValue}>{bmrBurnedSoFar} kcal</Text>
          <Text style={styles.subLabel}>Resting BMR (So Far)</Text>
          <Text style={styles.dailyBmrSublabel}>
            Daily baseline: {Math.round(bmr)} kcal
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.breakdownItem}>
          <Text style={styles.subValue}>{activeCalories} kcal</Text>
          <Text style={styles.subLabel}>Active Steps</Text>
          <Text style={styles.dailyBmrSublabel}>
            MET: {(activeCalories / Math.max(1, steps)).toFixed(4)} kcal/step
          </Text>
        </View>
      </View>

      {/* Energy Balance (Surplus/Deficit) Display */}
      <View style={styles.balanceContainer}>
        <View style={styles.balanceRow}>
          <View style={styles.balanceSub}>
            <Text style={styles.balanceLabel}>GAINED</Text>
            <Text style={[styles.balanceSubValue, { color: '#c3f400' }]}>
              +{Math.round(caloriesGained)} kcal
            </Text>
          </View>
          <View style={styles.verticalDivider} />
          <View style={styles.balanceSub}>
            <Text style={styles.balanceLabel}>BURNED</Text>
            <Text style={[styles.balanceSubValue, { color: '#ff4a4a' }]}>
              -{totalBurned} kcal
            </Text>
          </View>
        </View>

        <View style={[styles.netPill, { backgroundColor: isSurplus ? 'rgba(195, 244, 0, 0.15)' : 'rgba(255, 74, 74, 0.15)', borderColor: isSurplus ? '#c3f400' : '#ff4a4a' }]}>
          <Text style={[styles.netText, { color: isSurplus ? '#c3f400' : '#ff4a4a' }]}>
            NET BALANCE: {isSurplus ? '+' : ''}{netBalance} kcal ({isSurplus ? 'SURPLUS' : 'DEFICIT'})
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 20,
    alignSelf: 'stretch',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Oswald',
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
    marginBottom: 16,
  },
  burnContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(5, 20, 36, 0.4)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
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
    color: '#ffffff',
  },
  burnLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#64748B',
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
    color: '#ffffff',
  },
  subLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  dailyBmrSublabel: {
    fontSize: 9,
    color: '#64748B',
    fontFamily: 'JetBrains Mono',
    marginTop: 2,
  },
  divider: {
    height: 36,
    width: 1,
    backgroundColor: '#1e293b',
  },
  balanceContainer: {
    backgroundColor: 'rgba(5, 20, 36, 0.3)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
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
    color: '#64748B',
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
    backgroundColor: '#1e293b',
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
