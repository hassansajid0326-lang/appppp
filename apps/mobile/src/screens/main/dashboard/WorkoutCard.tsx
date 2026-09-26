import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../lib/theme';

interface WorkoutCardProps {
  workoutName?: string;
  hasScheduledToday: boolean;
  onPressStart: () => void;
}

export default function WorkoutCard({ workoutName = 'Strength Training', hasScheduledToday, onPressStart }: WorkoutCardProps) {
  const { colors, isDark } = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Training</Text>

      {hasScheduledToday ? (
        <View style={styles.contentContainer}>
          <View style={styles.infoRow}>
            <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.1)' : 'rgba(101, 163, 13, 0.1)', borderColor: isDark ? 'rgba(195, 244, 0, 0.3)' : 'rgba(101, 163, 13, 0.3)' }]}>
              <Ionicons name="barbell" size={22} color={isDark ? "#c3f400" : "#65a30d"} />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.workoutName, { color: colors.text }]}>{workoutName}</Text>
              <Text style={[styles.subtext, { color: colors.textSecondary }]}>Duration: ~45 min • Muscle groups: Chest/Back</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.startButton} onPress={onPressStart} activeOpacity={0.85}>
            <Text style={styles.startButtonText}>START WORKOUT</Text>
            <Ionicons name="play-forward" size={16} color="#051424" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={24} color={colors.textMuted} style={{ marginBottom: 8 }} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No workout planned for today.</Text>
          <TouchableOpacity 
            style={[styles.planButton, { borderColor: colors.border, backgroundColor: colors.cardSubtle }]} 
            onPress={onPressStart}
            activeOpacity={0.7}
          >
            <Text style={[styles.planButtonText, { color: colors.text }]}>SCHEDULE WORKOUT</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignSelf: 'stretch',
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'Oswald',
    fontSize: 16,
    fontWeight: '700',
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
    borderWidth: 1,
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
  },
  subtext: {
    fontFamily: 'Inter',
    fontSize: 11,
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
    marginBottom: 12,
  },
  planButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  planButtonText: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
