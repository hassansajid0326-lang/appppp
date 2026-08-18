import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface WorkoutCardProps {
  workoutName?: string;
  hasScheduledToday: boolean;
  onPressStart: () => void;
}

export default function WorkoutCard({ workoutName = 'Strength Training', hasScheduledToday, onPressStart }: WorkoutCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Today's Training</Text>

      {hasScheduledToday ? (
        <View style={styles.contentContainer}>
          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="barbell" size={22} color="#c3f400" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.workoutName}>{workoutName}</Text>
              <Text style={styles.subtext}>Duration: ~45 min • Muscle groups: Chest/Back</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.startButton} onPress={onPressStart}>
            <Text style={styles.startButtonText}>START WORKOUT</Text>
            <Ionicons name="play-forward" size={16} color="#051424" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={24} color="#64748B" style={{ marginBottom: 8 }} />
          <Text style={styles.emptyText}>No workout planned for today.</Text>
          <TouchableOpacity style={styles.planButton} onPress={onPressStart}>
            <Text style={styles.planButtonText}>SCHEDULE WORKOUT</Text>
          </TouchableOpacity>
        </View>
      )}
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
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'Oswald',
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
    marginBottom: 16,
  },
  contentContainer: {
    flexDirection: 'column',
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(195, 244, 0, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(195, 244, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flexDirection: 'column',
    flex: 1,
  },
  workoutName: {
    fontFamily: 'Oswald',
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtext: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#c3f400',
    borderRadius: 8,
    paddingVertical: 12,
  },
  startButtonText: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '700',
    color: '#051424',
    letterSpacing: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  emptyText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  planButton: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  planButtonText: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
    letterSpacing: 1,
  },
});
