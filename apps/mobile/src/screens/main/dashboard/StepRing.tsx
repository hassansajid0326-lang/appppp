import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StepRingProps {
  steps: number;
  goal: number;
  isSimulated?: boolean;
  onSimulatePress?: () => void;
  units?: 'metric' | 'imperial';
}

export default function StepRing({ 
  steps, 
  goal, 
  isSimulated = false, 
  onSimulatePress, 
  units = 'metric' 
}: StepRingProps) {
  const percentage = Math.min(100, Math.round((steps / goal) * 100));
  
  // Dynamic unit conversions
  const isImperial = units === 'imperial';
  // Metric: 0.75m per step. Imperial: 2.5 ft per step (0.762m) -> 5280 feet in a mile
  const distance = isImperial
    ? ((steps * 2.5) / 5280).toFixed(2)
    : ((steps * 0.75) / 1000).toFixed(2);
  const distanceUnit = isImperial ? 'miles' : 'km';
  
  const activeMinutes = Math.round(steps * 0.008); // approx 120 steps per minute

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Daily Steps</Text>
        {(isSimulated || __DEV__) && (
          <View style={styles.simBadge}>
            <Ionicons name="construct-outline" size={10} color="#051424" />
            <Text style={styles.simText}>SIMULATOR ACTIVE</Text>
          </View>
        )}
      </View>
      
      <View style={styles.ringContainer}>
        {/* Visual Step Indicator Ring */}
        <View style={styles.outerRing}>
          <View style={styles.innerRing}>
            <Ionicons name="footsteps" size={28} color="#c3f400" style={{ marginBottom: 6 }} />
            <Text style={styles.stepsCount}>{steps.toLocaleString()}</Text>
            <Text style={styles.stepsGoal}>/ {goal.toLocaleString()} steps</Text>
            <Text style={styles.pctText}>{percentage}% done</Text>
          </View>
        </View>
      </View>

      {/* Simulator Control Action */}
      {(isSimulated || __DEV__) && onSimulatePress && (
        <TouchableOpacity style={styles.simButton} onPress={onSimulatePress} activeOpacity={0.8}>
          <Ionicons name="walk" size={16} color="#051424" />
          <Text style={styles.simButtonText}>SIMULATE WALK (+1,000 STEPS)</Text>
        </TouchableOpacity>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Ionicons name="map-outline" size={18} color="#64748B" />
          <View style={styles.statTexts}>
            <Text style={styles.statValue}>{distance} {distanceUnit}</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.statBox}>
          <Ionicons name="time-outline" size={18} color="#64748B" />
          <View style={styles.statTexts}>
            <Text style={styles.statValue}>{activeMinutes} mins</Text>
            <Text style={styles.statLabel}>Active Time</Text>
          </View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Oswald',
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
    marginBottom: 0,
  },
  simBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#c3f400',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  simText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 8,
    color: '#051424',
    fontWeight: 'bold',
  },
  simButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#c3f400',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  simButtonText: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
    color: '#051424',
    letterSpacing: 0.5,
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  outerRing: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 6,
    borderColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  innerRing: {
    width: 154,
    height: 154,
    borderRadius: 77,
    backgroundColor: 'rgba(5, 20, 36, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepsCount: {
    fontFamily: 'Oswald',
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  stepsGoal: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  pctText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    color: '#c3f400',
    fontWeight: 'bold',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 16,
    marginTop: 16,
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    justifyContent: 'center',
  },
  statTexts: {
    flexDirection: 'column',
  },
  statValue: {
    fontFamily: 'Oswald',
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  statLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#64748B',
  },
  divider: {
    height: 24,
    width: 1,
    backgroundColor: '#1e293b',
  },
});
