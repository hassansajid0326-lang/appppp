import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  ActivityIndicator,
  Switch,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useOfflineStore } from '../../../lib/offlineStore';
import { useAuthStore } from '../../../lib/store';
import { requestNotificationPermissions } from '../../../lib/notifications';
import { useAppTheme } from '../../../lib/theme';

// Habit templates by category
const HABIT_TEMPLATES = [
  { id: 't1', title: 'Hit 10,000 Steps', category: 'Fitness', icon: 'walk-outline', color: '#c3f400', rule: 'daily' },
  { id: 't2', title: '30-Min Gym Workout', category: 'Fitness', icon: 'barbell-outline', color: '#ff4a4a', rule: 'weekly', days: [1, 3, 5] }, // Mon, Wed, Fri
  { id: 't3', title: 'Morning Stretching', category: 'Fitness', icon: 'body-outline', color: '#38bdf8', rule: 'daily' },
  { id: 't4', title: 'Drink 3L Water', category: 'Nutrition', icon: 'water-outline', color: '#38bdf8', rule: 'daily' },
  { id: 't5', title: 'Eat Veggies/Salad', category: 'Nutrition', icon: 'nutrition-outline', color: '#10b981', rule: 'daily' },
  { id: 't6', title: 'Check Weight', category: 'Nutrition', icon: 'scale-outline', color: '#eab308', rule: 'weekly', days: [0] }, // Sunday
  { id: 't7', title: '8 Hours Sleep', category: 'Mind', icon: 'bed-outline', color: '#818cf8', rule: 'daily' },
  { id: 't8', title: '15-Min Meditation', category: 'Mind', icon: 'compass-outline', color: '#a78bfa', rule: 'daily' },
  { id: 't9', title: 'Pay Gym Fees', category: 'Mind', icon: 'card-outline', color: '#f472b6', rule: 'monthly', day: 1 }, // 1st of month
  { id: 't10', title: '1 Hour Screen Detox', category: 'Mind', icon: 'phone-portrait-outline', color: '#f59e0b', rule: 'daily' },
];

const WEEKDAYS = [
  { label: 'S', value: 0 },
  { label: 'M', value: 1 },
  { label: 'T', value: 2 },
  { label: 'W', value: 3 },
  { label: 'T', value: 4 },
  { label: 'F', value: 5 },
  { label: 'S', value: 6 }
];

export default function HabitsScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useAppTheme();
  const { session } = useAuthStore();
  const { routineItems, routineLogs, addRoutineItem, toggleRoutineLog, deleteRoutineItem } = useOfflineStore();
  
  const userId = session?.user?.id;
  
  // Date State for Calendar Strip
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [datesStrip, setDatesStrip] = useState<Date[]>([]);
  
  // Form State
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [repeatRule, setRepeatRule] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default
  const [selectedDayOfMonth, setSelectedDayOfMonth] = useState('1');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('08:00');
  
  const [adding, setAdding] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Fitness' | 'Nutrition' | 'Mind'>('All');

  // Load calendar dates strip (last 10 days to next 3 days)
  useEffect(() => {
    const list = [];
    const today = new Date();
    for (let i = -10; i <= 3; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      list.push(d);
    }
    setDatesStrip(list);
  }, []);

  // Request notifications permission on mount
  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  // Determine if a habit is scheduled on a given date string (YYYY-MM-DD)
  const isHabitScheduledForDate = (item: any, checkDateStr: string) => {
    const d = new Date(checkDateStr + 'T00:00:00');
    const dayOfWeek = d.getDay(); // 0=Sun..6=Sat
    const dayOfMonth = d.getDate(); // 1..31

    if (item.repeat_rule === 'daily' || !item.repeat_rule) return true;
    if (item.repeat_rule === 'weekly') {
      return item.repeat_days ? item.repeat_days.includes(dayOfWeek) : true;
    }
    if (item.repeat_rule === 'custom' || item.repeat_rule === 'monthly') {
      // Custom repeats used for monthly - days[0] contains day of month
      return item.repeat_days && item.repeat_days.length > 0 ? item.repeat_days[0] === dayOfMonth : true;
    }
    return true;
  };

  // Filter routine items active on the selected calendar date
  const habitsForSelectedDate = routineItems.filter(item => 
    isHabitScheduledForDate(item, selectedDateStr)
  );

  // Check if a habit is completed on selected date
  const isCompletedOnDate = (itemId: string, dateStr: string) => {
    const log = routineLogs.find((l) => l.routine_item_id === itemId && l.date === dateStr);
    return log ? log.completed : false;
  };

  // Toggle completion
  const handleToggleHabit = (itemId: string) => {
    if (!userId) return;
    const completed = isCompletedOnDate(itemId, selectedDateStr);
    toggleRoutineLog(userId, itemId, selectedDateStr, !completed);
  };

  // Setup Notification Helper
  const scheduleNotification = async (title: string, timeStr: string) => {
    if (Platform.OS === 'web') return '';
    try {
      const [hStr, mStr] = timeStr.split(':');
      const hour = parseInt(hStr, 10);
      const minute = parseInt(mStr, 10);

      if (isNaN(hour) || isNaN(minute)) return '';

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Habit Reminder 🔔',
          body: `Time to focus on your habit: "${title}"!`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
      return notificationId;
    } catch (err) {
      console.error('Failed to schedule notification:', err);
      return '';
    }
  };

  // Add custom habit
  const handleAddHabit = async (
    title: string, 
    rule: 'daily' | 'weekly' | 'monthly', 
    days: number[], 
    dayOfMonthVal: number,
    reminderOn: boolean,
    timeVal: string
  ) => {
    const cleaned = title.trim();
    if (!cleaned || !userId) return;

    if (routineItems.some(item => item.title.toLowerCase() === cleaned.toLowerCase())) {
      Alert.alert('Duplicate Habit', 'You already have this habit in your active checklist.');
      return;
    }

    setAdding(true);
    try {
      let notifId = '';
      if (reminderOn) {
        notifId = await scheduleNotification(cleaned, timeVal);
      }

      // Map parameters to fit schema
      const mappedRule = rule === 'monthly' ? 'custom' : rule;
      const mappedDays = rule === 'weekly' 
        ? days 
        : rule === 'monthly' 
          ? [dayOfMonthVal] 
          : [];

      await addRoutineItem(userId, cleaned, mappedRule, mappedDays, reminderOn ? timeVal : '', notifId);
      
      // Reset form
      setNewHabitTitle('');
      setReminderEnabled(false);
      Alert.alert('Habit Created', `"${cleaned}" has been successfully scheduled!`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to schedule habit.');
    } finally {
      setAdding(false);
    }
  };

  // Delete habit and cancel local notifications if scheduled
  const handleDeleteHabit = (item: any) => {
    if (!userId) return;
    Alert.alert(
      'Delete Habit',
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            if (item.notification_id && Platform.OS !== 'web') {
              try {
                await Notifications.cancelScheduledNotificationAsync(item.notification_id);
              } catch (e) {
                console.error(e);
              }
            }
            deleteRoutineItem(userId, item.id);
          }
        }
      ]
    );
  };

  // Toggle day selection for weekly frequency selection
  const toggleWeekdaySelection = (dayVal: number) => {
    if (selectedDays.includes(dayVal)) {
      setSelectedDays(selectedDays.filter(d => d !== dayVal));
    } else {
      setSelectedDays([...selectedDays, dayVal].sort());
    }
  };

  // Calculate stats for current selected date
  const totalHabitsOnDate = habitsForSelectedDate.length;
  const completedOnDateCount = habitsForSelectedDate.filter(item => isCompletedOnDate(item.id, selectedDateStr)).length;
  const completionRate = totalHabitsOnDate > 0 ? Math.round((completedOnDateCount / totalHabitsOnDate) * 100) : 0;

  // Filtered Templates
  const filteredTemplates = selectedCategory === 'All' 
    ? HABIT_TEMPLATES 
    : HABIT_TEMPLATES.filter(t => t.category === selectedCategory);

  return (
    <LinearGradient colors={colors.backgroundGradient} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Habits & Schedules</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Rolling Calendar Strip */}
        <View style={[styles.calendarStripContainer, { backgroundColor: colors.cardSubtle, borderBottomColor: colors.borderSubtle }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarStripScroll}>
            {datesStrip.map((dateObj, idx) => {
              const dateStr = dateObj.toISOString().split('T')[0];
              const isSelected = dateStr === selectedDateStr;
              const isToday = dateStr === new Date().toISOString().split('T')[0];
              const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
              const dayNum = dateObj.getDate();

              // Calculate date completion rate
              const itemsOnDate = routineItems.filter(item => isHabitScheduledForDate(item, dateStr));
              const itemsDone = itemsOnDate.filter(item => isCompletedOnDate(item.id, dateStr));
              const doneRate = itemsOnDate.length > 0 ? itemsDone.length / itemsOnDate.length : 0;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.calendarDayCard,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    isSelected && [styles.calendarDayCardSelected, { backgroundColor: isDark ? '#c3f400' : '#65a30d', borderColor: isDark ? '#c3f400' : '#65a30d' }],
                    isToday && !isSelected && [styles.calendarDayCardToday, { borderColor: isDark ? '#c3f400' : '#65a30d' }]
                  ]}
                  onPress={() => setSelectedDateStr(dateStr)}
                >
                  <Text style={[styles.calendarDayName, { color: colors.textMuted }, isSelected && { color: isDark ? '#051424' : '#ffffff' }]}>
                    {dayName}
                  </Text>
                  <Text style={[styles.calendarDayNum, { color: colors.text }, isSelected && { color: isDark ? '#051424' : '#ffffff' }]}>
                    {dayNum}
                  </Text>
                  {itemsOnDate.length > 0 && (
                    <View style={styles.miniProgressContainer}>
                      <View 
                        style={[
                          styles.miniProgressBar, 
                          { 
                            width: 14, 
                            backgroundColor: doneRate === 1 ? (isSelected ? (isDark ? '#051424' : '#ffffff') : (isDark ? '#c3f400' : '#65a30d')) : doneRate > 0 ? '#38bdf8' : colors.borderSubtle,
                            height: 3,
                            borderRadius: 2
                          }
                        ]} 
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* Day Completion Stats Widget */}
          <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.statsTopRow}>
              <View style={styles.statsTextCol}>
                <Text style={[styles.statsPercentage, { color: isDark ? '#c3f400' : '#65a30d' }]}>{completionRate}%</Text>
                <Text style={[styles.statsLabel, { color: colors.text }]}>
                  {selectedDateStr === new Date().toISOString().split('T')[0] ? 'Completed Today' : `Completed on ${new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                </Text>
                <Text style={[styles.statsSubtext, { color: colors.textSecondary }]}>
                  {completedOnDateCount} of {totalHabitsOnDate} active targets completed
                </Text>
              </View>
              <View style={[styles.statsProgressCircle, { borderColor: completionRate > 0 ? (isDark ? '#c3f400' : '#65a30d') : colors.borderSubtle }]}>
                <Ionicons name="checkbox-outline" size={28} color={completionRate === 100 ? (isDark ? '#c3f400' : '#65a30d') : colors.textMuted} />
              </View>
            </View>
          </View>

          {/* Create Custom Habit Section */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Add New Habit & Alarm</Text>
            
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>HABIT NAME</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle, color: colors.text }]}
              placeholder="e.g. Meditate or Lift Weights"
              placeholderTextColor={colors.textMuted}
              value={newHabitTitle}
              onChangeText={setNewHabitTitle}
              autoCorrect={false}
            />

            {/* Repeat rule buttons */}
            <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 14 }]}>REPEAT FREQUENCY</Text>
            <View style={[styles.freqRow, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
              {(['daily', 'weekly', 'monthly'] as const).map((rule) => (
                <TouchableOpacity
                  key={rule}
                  style={[
                    styles.freqBtn, 
                    repeatRule === rule && [styles.freqBtnActive, { backgroundColor: isDark ? '#c3f400' : '#65a30d' }]
                  ]}
                  onPress={() => setRepeatRule(rule)}
                >
                  <Text style={[
                    styles.freqBtnText, 
                    { color: colors.textMuted },
                    repeatRule === rule && { color: isDark ? '#051424' : '#ffffff' }
                  ]}>
                    {rule.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Weekly Selector details */}
            {repeatRule === 'weekly' && (
              <View style={styles.weeklySelectorContainer}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>REPEAT DAYS OF THE WEEK</Text>
                <View style={styles.daysBubbleRow}>
                  {WEEKDAYS.map((day) => {
                    const isSelected = selectedDays.includes(day.value);
                    return (
                      <TouchableOpacity
                        key={day.value}
                        style={[
                          styles.dayBubble, 
                          { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle },
                          isSelected && [styles.dayBubbleActive, { backgroundColor: isDark ? '#c3f400' : '#65a30d', borderColor: isDark ? '#c3f400' : '#65a30d' }]
                        ]}
                        onPress={() => toggleWeekdaySelection(day.value)}
                      >
                        <Text style={[
                          styles.dayBubbleText, 
                          { color: colors.textMuted },
                          isSelected && { color: isDark ? '#051424' : '#ffffff' }
                        ]}>
                          {day.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Monthly Selector details */}
            {repeatRule === 'monthly' && (
              <View style={styles.monthlySelectorContainer}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>DAY OF THE MONTH (1 - 31)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle, color: colors.text }]}
                  keyboardType="numeric"
                  placeholder="e.g. 1"
                  placeholderTextColor={colors.textMuted}
                  value={selectedDayOfMonth}
                  onChangeText={setSelectedDayOfMonth}
                />
              </View>
            )}

            {/* Reminders / Alarms Switch */}
            <View style={styles.reminderRow}>
              <View>
                <Text style={[styles.reminderTitle, { color: colors.text }]}>Daily Alarm Reminder</Text>
                <Text style={[styles.reminderSub, { color: colors.textMuted }]}>Receive push notification reminder</Text>
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={setReminderEnabled}
                trackColor={{ false: colors.cardSubtle, true: isDark ? '#c3f400' : '#65a30d' }}
                thumbColor={reminderEnabled ? (isDark ? '#051424' : '#ffffff') : colors.textMuted}
              />
            </View>

            {reminderEnabled && (
              <View style={styles.timeInputContainer}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>REMINDER ALARM TIME (24H Format)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle, color: colors.text }]}
                  placeholder="e.g. 08:30"
                  placeholderTextColor={colors.textMuted}
                  value={reminderTime}
                  onChangeText={setReminderTime}
                />
              </View>
            )}

            <TouchableOpacity 
              style={[styles.btnCreate, { backgroundColor: isDark ? '#c3f400' : '#65a30d' }, (!newHabitTitle.trim() || adding) && { opacity: 0.6 }]}
              onPress={() => {
                const dayOfMonthNum = parseInt(selectedDayOfMonth, 10);
                handleAddHabit(
                  newHabitTitle,
                  repeatRule,
                  selectedDays,
                  isNaN(dayOfMonthNum) ? 1 : dayOfMonthNum,
                  reminderEnabled,
                  reminderTime
                );
              }}
              disabled={!newHabitTitle.trim() || adding}
            >
              {adding ? (
                <ActivityIndicator size="small" color={isDark ? "#051424" : "#ffffff"} />
              ) : (
                <Text style={[styles.btnCreateText, { color: isDark ? "#051424" : "#ffffff" }]}>SCHEDULE HABIT</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Active Checklist Section */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Active Checklist ({new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
            </Text>
            
            {totalHabitsOnDate === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No habits scheduled for today.</Text>
                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Check another day on the top strip, or create a new habit above!</Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {habitsForSelectedDate.map((item) => {
                  const completed = isCompletedOnDate(item.id, selectedDateStr);
                  
                  return (
                    <View key={item.id} style={[
                      styles.itemRow, 
                      { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle },
                      completed && [styles.itemRowCompleted, { borderColor: isDark ? 'rgba(195, 244, 0, 0.3)' : 'rgba(101, 163, 13, 0.3)' }]
                    ]}>
                      <TouchableOpacity
                        style={styles.itemMainPress}
                        onPress={() => handleToggleHabit(item.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={completed ? "checkmark-circle" : "ellipse-outline"}
                          size={22}
                          color={completed ? (isDark ? "#c3f400" : "#65a30d") : colors.textMuted}
                        />
                        <View style={styles.itemTextContainer}>
                          <Text style={[styles.itemText, { color: colors.text }, completed && styles.itemTextCompleted]}>
                            {item.title}
                          </Text>
                          <View style={styles.badgeRow}>
                            <View style={[styles.freqBadge, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
                              <Text style={[styles.freqBadgeText, { color: colors.textMuted }]}>
                                {item.repeat_rule === 'custom' ? 'Monthly' : item.repeat_rule ? item.repeat_rule.toUpperCase() : 'DAILY'}
                              </Text>
                            </View>
                            {item.reminder_time ? (
                              <View style={[styles.alarmBadge, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
                                <Ionicons name="alarm-outline" size={9} color="#38bdf8" />
                                <Text style={styles.alarmBadgeText}>{item.reminder_time}</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.deleteButton} 
                        onPress={() => handleDeleteHabit(item)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#ff4a4a" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Templates Section */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Starter Templates</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Tap to schedule standard routine presets</Text>
            
            {/* Category tabs */}
            <View style={[styles.tabSelector, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
              {(['All', 'Fitness', 'Nutrition', 'Mind'] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.tabButton, 
                    selectedCategory === cat && [styles.tabButtonActive, { backgroundColor: isDark ? '#c3f400' : '#65a30d' }]
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[
                    styles.tabButtonText, 
                    { color: colors.textMuted },
                    selectedCategory === cat && { color: isDark ? '#051424' : '#ffffff' }
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.templatesContainer}>
              {filteredTemplates.map((template) => {
                const installed = routineItems.some(
                  i => i.title.toLowerCase() === template.title.toLowerCase()
                );

                return (
                  <TouchableOpacity
                    key={template.id}
                    style={[
                      styles.templateCard, 
                      { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle },
                      installed && styles.templateCardDisabled
                    ]}
                    onPress={() => {
                      if (installed) {
                        Alert.alert('Already Installed', 'This habit is already in your routine list.');
                      } else {
                        handleAddHabit(
                          template.title,
                          template.rule as any,
                          template.days || [],
                          template.day || 1,
                          false,
                          ''
                        );
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.templateIconContainer, { backgroundColor: `${template.color}15` }]}>
                      <Ionicons name={template.icon as any} size={18} color={template.color} />
                    </View>
                    <View style={styles.templateDetails}>
                      <Text style={[styles.templateTitle, { color: colors.text }]}>{template.title}</Text>
                      <Text style={[styles.templateCategory, { color: colors.textMuted }]}>
                        {template.category} • {template.rule.toUpperCase()}
                      </Text>
                    </View>
                    <Ionicons 
                      name={installed ? "checkmark-circle" : "add-circle-outline"} 
                      size={18} 
                      color={installed ? (isDark ? "#c3f400" : "#65a30d") : colors.textMuted} 
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Oswald',
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  calendarStripContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingVertical: 12,
  },
  calendarStripScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  calendarDayCard: {
    width: 46,
    height: 64,
    borderRadius: 10,
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
    borderWidth: 1,
    borderColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDayCardSelected: {
    backgroundColor: '#c3f400',
    borderColor: '#c3f400',
  },
  calendarDayCardToday: {
    borderColor: '#64748B',
  },
  calendarDayName: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748B',
  },
  calendarDayNum: {
    fontFamily: 'Oswald',
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
  },
  calendarDayTextSelected: {
    color: '#051424',
  },
  miniProgressContainer: {
    marginTop: 4,
  },
  miniProgressBar: {
    height: 3,
    borderRadius: 2,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  statsCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 20,
    marginBottom: 20,
  },
  statsTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsTextCol: {
    flex: 1,
  },
  statsPercentage: {
    fontFamily: 'Oswald',
    fontSize: 32,
    fontWeight: '700',
    color: '#c3f400',
  },
  statsLabel: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  statsSubtext: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  statsProgressCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 20, 36, 0.3)',
  },
  sectionCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'Oswald',
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#64748B',
    marginTop: -8,
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: '#64748B',
    fontWeight: 'bold',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#ffffff',
    backgroundColor: 'rgba(5, 20, 36, 0.6)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  freqRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(5, 20, 36, 0.6)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 2,
    gap: 2,
    marginBottom: 12,
  },
  freqBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  freqBtnActive: {
    backgroundColor: '#334155',
  },
  freqBtnText: {
    fontFamily: 'Oswald',
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  freqBtnTextActive: {
    color: '#c3f400',
  },
  weeklySelectorContainer: {
    marginBottom: 12,
  },
  daysBubbleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dayBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: 'rgba(5, 20, 36, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayBubbleActive: {
    backgroundColor: '#c3f400',
    borderColor: '#c3f400',
  },
  dayBubbleText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
  },
  dayBubbleTextActive: {
    color: '#051424',
  },
  monthlySelectorContainer: {
    marginBottom: 12,
  },
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 12,
    marginTop: 6,
    marginBottom: 12,
  },
  reminderTitle: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  reminderSub: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  timeInputContainer: {
    marginBottom: 12,
  },
  btnCreate: {
    backgroundColor: '#c3f400',
    borderRadius: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  btnCreateText: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
    color: '#051424',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 8,
  },
  emptySubtext: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#475569',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 10,
  },
  listContainer: {
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 20, 36, 0.4)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  itemRowCompleted: {
    borderColor: 'rgba(195, 244, 0, 0.15)',
    backgroundColor: 'rgba(195, 244, 0, 0.01)',
  },
  itemMainPress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemTextContainer: {
    flex: 1,
    flexDirection: 'column',
    gap: 2,
  },
  itemText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  itemTextCompleted: {
    color: '#475569',
    textDecorationLine: 'line-through',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  freqBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  freqBadgeText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748B',
  },
  alarmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  alarmBadgeText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 8,
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: 6,
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(5, 20, 36, 0.5)',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: '#1e293b',
    borderWidth: 0.5,
    borderColor: '#334155',
  },
  tabButtonText: {
    fontFamily: 'Oswald',
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  tabButtonTextActive: {
    color: '#c3f400',
  },
  templatesContainer: {
    gap: 8,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 20, 36, 0.3)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 8,
    padding: 10,
  },
  templateCardDisabled: {
    opacity: 0.7,
  },
  templateIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateDetails: {
    flex: 1,
    marginLeft: 10,
  },
  templateTitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  templateCategory: {
    fontFamily: 'JetBrains Mono',
    fontSize: 8,
    color: '#64748B',
    fontWeight: 'bold',
    marginTop: 2,
  },
});
