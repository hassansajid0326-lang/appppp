import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOfflineStore, OfflineRoutineItem } from '../../../lib/offlineStore';

interface RoutineChecklistProps {
  userId: string;
  items: OfflineRoutineItem[];
  logs: any[];
}

export default function RoutineChecklist({ userId, items, logs }: RoutineChecklistProps) {
  const { toggleRoutineLog, addRoutineItem } = useOfflineStore();
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [showInput, setShowInput] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const isCompleted = (itemId: string) => {
    const log = logs.find((l) => l.routine_item_id === itemId && l.date === todayStr);
    return log ? log.completed : false;
  };

  const handleToggle = (itemId: string) => {
    const currentStatus = isCompleted(itemId);
    toggleRoutineLog(userId, itemId, todayStr, !currentStatus);
  };

  const handleAddHabit = async () => {
    if (!newHabitTitle.trim()) return;
    setAdding(true);
    try {
      await addRoutineItem(userId, newHabitTitle.trim());
      setNewHabitTitle('');
      setShowInput(false);
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Daily Habits</Text>
        <TouchableOpacity onPress={() => setShowInput(!showInput)} style={styles.addButton}>
          <Ionicons name={showInput ? "close-circle-outline" : "add-circle-outline"} size={22} color="#c3f400" />
        </TouchableOpacity>
      </View>

      {showInput && (
        <View style={styles.addInputRow}>
          <TextInput
            style={styles.input}
            placeholder="E.g. Drink 3L Water"
            placeholderTextColor="#64748B"
            value={newHabitTitle}
            onChangeText={setNewHabitTitle}
            onSubmitEditing={handleAddHabit}
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.saveButton} onPress={handleAddHabit} disabled={adding}>
            {adding ? (
              <ActivityIndicator color="#051424" size="small" />
            ) : (
              <Ionicons name="checkmark" size={18} color="#051424" />
            )}
          </TouchableOpacity>
        </View>
      )}

      {items.length === 0 ? (
        <Text style={styles.emptyText}>No daily habits set up yet. Add one above!</Text>
      ) : (
        <View style={styles.listContainer}>
          {items.map((item) => {
            const completed = isCompleted(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.itemRow, completed && styles.itemRowCompleted]}
                onPress={() => handleToggle(item.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={completed ? "checkmark-circle" : "ellipse-outline"}
                  size={20}
                  color={completed ? "#c3f400" : "#64748B"}
                />
                <Text style={[styles.itemText, completed && styles.itemTextCompleted]}>
                  {item.title}
                </Text>
              </TouchableOpacity>
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
  },
  addButton: {
    padding: 2,
  },
  addInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#ffffff',
    backgroundColor: 'rgba(5, 20, 36, 0.6)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveButton: {
    backgroundColor: '#c3f400',
    borderRadius: 8,
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#64748B',
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
    backgroundColor: 'rgba(5, 20, 36, 0.4)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  itemRowCompleted: {
    borderColor: 'rgba(195, 244, 0, 0.2)',
    backgroundColor: 'rgba(195, 244, 0, 0.02)',
  },
  itemText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#cbd5e1',
    flex: 1,
  },
  itemTextCompleted: {
    color: '#64748B',
    textDecorationLine: 'line-through',
  },
});
