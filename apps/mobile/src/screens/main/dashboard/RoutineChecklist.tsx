import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useOfflineStore, OfflineRoutineItem } from '../../../lib/offlineStore';
import { useAppTheme } from '../../../lib/theme';

interface RoutineChecklistProps {
  userId: string;
  items: OfflineRoutineItem[];
  logs: any[];
}

export default function RoutineChecklist({ userId, items, logs }: RoutineChecklistProps) {
  const navigation = useNavigation<any>();
  const { toggleRoutineLog } = useOfflineStore();
  const { colors, isDark } = useAppTheme();

  const todayStr = new Date().toISOString().split('T')[0];

  const getWeeklyCompletion = (itemId: string) => {
    const today = new Date();
    const weekdays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      weekdays.push(d);
    }

    return weekdays.map(date => {
      const dateStr = date.toISOString().split('T')[0];
      const log = logs.find(l => l.routine_item_id === itemId && l.date === dateStr);
      return log ? log.completed : false;
    });
  };

  const isCompleted = (itemId: string) => {
    const log = logs.find((l) => l.routine_item_id === itemId && l.date === todayStr);
    return log ? log.completed : false;
  };

  const handleToggle = (itemId: string) => {
    const currentStatus = isCompleted(itemId);
    toggleRoutineLog(userId, itemId, todayStr, !currentStatus);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity 
          style={styles.headerTitleRow} 
          onPress={() => navigation.navigate('Habits')}
          activeOpacity={0.7}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Habits</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Habits')} style={styles.addButton}>
          <Ionicons name="settings-outline" size={20} color={isDark ? "#c3f400" : "#556d00"} />
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <TouchableOpacity 
          onPress={() => navigation.navigate('Habits')}
          activeOpacity={0.7}
        >
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No daily habits set up yet. Tap here to customize!</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.listContainer}>
          {items.map((item) => {
            const completed = isCompleted(item.id);
            const weeklyHistory = getWeeklyCompletion(item.id);

            return (
              <View 
                key={item.id} 
                style={[
                  styles.itemRow, 
                  { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle },
                  completed && (isDark 
                    ? { borderColor: 'rgba(195, 244, 0, 0.3)', backgroundColor: 'rgba(195, 244, 0, 0.05)' } 
                    : { borderColor: 'rgba(101, 163, 13, 0.3)', backgroundColor: 'rgba(101, 163, 13, 0.08)' }
                  )
                ]}
              >
                <TouchableOpacity
                  style={styles.itemMainPress}
                  onPress={() => handleToggle(item.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={completed ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={completed ? (isDark ? "#c3f400" : "#556d00") : colors.textMuted}
                  />
                  <Text style={[
                    styles.itemText, 
                    { color: colors.text },
                    completed && { color: colors.textMuted, textDecorationLine: 'line-through' }
                  ]}>
                    {item.title}
                  </Text>
                </TouchableOpacity>

                {/* Heatmap Dots */}
                <View style={styles.weeklyCheckRow}>
                  {weeklyHistory.map((dayDone, dayIdx) => (
                    <View 
                      key={dayIdx} 
                      style={[
                        styles.historyDot, 
                        dayDone 
                          ? { backgroundColor: isDark ? '#c3f400' : '#65a30d' } 
                          : { backgroundColor: isDark ? '#1e293b' : '#cbd5e1' },
                        dayIdx === 6 && { borderWidth: 1, borderColor: colors.text }
                      ]} 
                    />
                  ))}
                </View>
              </View>
            );
          })}
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
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    letterSpacing: 1,
  },
  addButton: {
    padding: 2,
  },
  emptyText: {
    fontFamily: 'Inter',
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 12,
  },
  listContainer: {
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  itemMainPress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  weeklyCheckRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
