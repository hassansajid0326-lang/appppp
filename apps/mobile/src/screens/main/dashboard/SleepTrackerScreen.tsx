import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOfflineStore } from '../../../lib/offlineStore';
import { useAppTheme } from '../../../lib/theme';

interface SleepLog {
  id: string;
  hours: number;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  loggedAt: string;
}

export default function SleepTrackerScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useAppTheme();
  const [sleepHours, setSleepHours] = useState<number>(8.0); // Always stored in hours
  const [sleepQuality, setSleepQuality] = useState<'poor' | 'fair' | 'good' | 'excellent'>('good');
  const [sleepHistory, setSleepHistory] = useState<SleepLog[]>([]);
  const [loading, setLoading] = useState(false);

  // Units and Manual input states
  const [sleepUnit, setSleepUnit] = useState<'hours' | 'minutes'>('hours');
  const [isManualInput, setIsManualInput] = useState(false);
  const [manualText, setManualText] = useState('');

  // Load sleep history
  const loadSleepHistory = async () => {
    try {
      const data = await AsyncStorage.getItem('fitpulse_sleep_logs');
      if (data) {
        const parsed = JSON.parse(data) as SleepLog[];
        const sorted = parsed.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
        setSleepHistory(sorted);
      } else {
        setSleepHistory([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadSleepHistory();
    }, [])
  );

  const handleSaveSleepLog = async () => {
    setLoading(true);
    try {
      let finalHours = 8.0;

      if (isManualInput) {
        const val = parseFloat(manualText);
        if (isNaN(val) || val <= 0) {
          Alert.alert('Invalid Entry', 'Please enter a valid positive number.');
          setLoading(false);
          return;
        }
        finalHours = sleepUnit === 'minutes' ? val / 60 : val;
      } else {
        finalHours = sleepUnit === 'minutes' ? sleepHours / 60 : sleepHours;
      }

      const newLog: SleepLog = {
        id: Math.random().toString(),
        hours: Number(finalHours.toFixed(1)),
        quality: sleepQuality,
        loggedAt: new Date().toISOString()
      };

      const stored = await AsyncStorage.getItem('fitpulse_sleep_logs');
      const parsed = stored ? JSON.parse(stored) : [];
      const updated = [newLog, ...parsed];

      await AsyncStorage.setItem('fitpulse_sleep_logs', JSON.stringify(updated));
      
      const sorted = updated.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
      setSleepHistory(sorted);

      setIsManualInput(false);
      setManualText('');

      Alert.alert('Sleep Logged', 'Last night\'s sleep has been recorded successfully based on Sleep Medicine standards.');
    } catch (err) {
      Alert.alert('Error', 'Failed to save sleep log.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    Alert.alert(
      'Delete Log',
      'Are you sure you want to delete this sleep log?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const stored = await AsyncStorage.getItem('fitpulse_sleep_logs');
              if (stored) {
                const parsed = JSON.parse(stored) as SleepLog[];
                const filtered = parsed.filter(item => item.id !== id);
                await AsyncStorage.setItem('fitpulse_sleep_logs', JSON.stringify(filtered));
                setSleepHistory(sleepHistory.filter(item => item.id !== id));
              }
            } catch (err) {
              console.error(err);
            }
          }
        }
      ]
    );
  };

  const getSleepStages = (hours: number) => {
    const totalMinutes = hours * 60;
    const deepMinutes = Math.round(totalMinutes * 0.18); 
    const remMinutes = Math.round(totalMinutes * 0.22); 
    const lightMinutes = Math.round(totalMinutes * 0.60); 
    
    return {
      deep: `${Math.floor(deepMinutes / 60)}h ${deepMinutes % 60}m`,
      rem: `${Math.floor(remMinutes / 60)}h ${remMinutes % 60}m`,
      light: `${Math.floor(lightMinutes / 60)}h ${lightMinutes % 60}m`
    };
  };

  const latestLog = sleepHistory[0];
  const stages = latestLog ? getSleepStages(latestLog.hours) : null;

  // Increment / Decrement handlers
  const adjustSleep = (amount: number) => {
    setSleepHours(prev => {
      const next = prev + amount;
      const minVal = sleepUnit === 'minutes' ? 120 : 2;
      const maxVal = sleepUnit === 'minutes' ? 1080 : 18;
      return next < minVal ? minVal : next > maxVal ? maxVal : parseFloat(next.toFixed(1));
    });
  };

  const handleUnitChange = (newUnit: 'hours' | 'minutes') => {
    if (newUnit === sleepUnit) return;
    if (newUnit === 'minutes') {
      setSleepHours(Math.round(sleepHours * 60));
    } else {
      setSleepHours(parseFloat((sleepHours / 60).toFixed(1)));
    }
    setSleepUnit(newUnit);
  };

  return (
    <LinearGradient colors={colors.backgroundGradient as [string, string, ...string[]]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }]}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Sleep Medicine</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* Scientific Info Banner */}
          <View style={[styles.scienceBanner, { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.08)' : 'rgba(195, 244, 0, 0.15)', borderColor: isDark ? 'rgba(195, 244, 0, 0.15)' : 'rgba(195, 244, 0, 0.3)' }]}>
            <Ionicons name="bulb-outline" size={16} color={isDark ? '#c3f400' : '#4d7c0f'} />
            <Text style={[styles.scienceBannerText, { color: colors.textSecondary }]}>
              AASM guidelines: Healthy adult recovery requires 7-9 hours of structured sleep cycles (Deep, REM, Light).
            </Text>
          </View>

          {/* Latest Sleep Summary */}
          {latestLog ? (
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Last Night's Sleep Architecture</Text>
              
              <View style={styles.durationRow}>
                <View>
                  <Text style={[styles.durationVal, { color: colors.text }]}>{latestLog.hours} hrs</Text>
                  <Text style={[styles.durationLbl, { color: colors.textMuted }]}>Total Duration</Text>
                </View>
                <View style={[styles.qualityBadge, styles[latestLog.quality]]}>
                  <Text style={[styles.qualityBadgeText, { color: latestLog.quality === 'excellent' && !isDark ? '#365314' : '#ffffff' }]}>
                    {latestLog.quality.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Progress Bar of Sleep Architecture */}
              <View style={styles.stagesBarContainer}>
                <View style={[styles.stagesBar, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
                  <View style={[styles.stageSegment, { flex: 18, backgroundColor: '#818cf8' }]} />
                  <View style={[styles.stageSegment, { flex: 22, backgroundColor: '#a78bfa' }]} />
                  <View style={[styles.stageSegment, { flex: 60, backgroundColor: '#38bdf8' }]} />
                </View>
                
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: '#818cf8' }]} />
                    <Text style={[styles.legendText, { color: colors.textMuted }]}>Deep ({stages?.deep})</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: '#a78bfa' }]} />
                    <Text style={[styles.legendText, { color: colors.textMuted }]}>REM ({stages?.rem})</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: '#38bdf8' }]} />
                    <Text style={[styles.legendText, { color: colors.textMuted }]}>Light ({stages?.light})</Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>No Sleep Record Logged</Text>
              <Text style={[styles.emptyCardText, { color: colors.textMuted }]}>Log sleep session using the sliders below to calibrate your recovery readiness score.</Text>
            </View>
          )}

          {/* Log Sleep Form */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="bed-outline" size={18} color={isDark ? '#c3f400' : '#65a30d'} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Log Sleep Session</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setIsManualInput(!isManualInput)} 
                style={styles.keyboardToggle}
              >
                <Ionicons 
                  name={isManualInput ? "create-outline" : "keypad-outline"} 
                  size={16} 
                  color={isDark ? '#c3f400' : '#4d7c0f'} 
                />
                <Text style={[styles.keyboardToggleText, { color: colors.textSecondary }]}>
                  {isManualInput ? 'Steppers' : 'Manual'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Unit Selector */}
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>CHOOSE DURATION UNIT</Text>
            <View style={[styles.unitSelector, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f1f5f9', borderColor: colors.cardBorder }]}>
              {(['hours', 'minutes'] as const).map((u) => (
                <TouchableOpacity 
                  key={u}
                  style={[
                    styles.unitBtn, 
                    sleepUnit === u && [styles.unitBtnActive, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]
                  ]}
                  onPress={() => handleUnitChange(u)}
                >
                  <Text style={[
                    styles.unitBtnText, 
                    { color: colors.textMuted },
                    sleepUnit === u && [styles.unitBtnTextActive, { color: isDark ? '#c3f400' : '#051424' }]
                  ]}>
                    {u.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>SLEEP DURATION</Text>
            
            {isManualInput ? (
              <View style={styles.manualWrapper}>
                <TextInput
                  style={[styles.manualInput, { backgroundColor: isDark ? '#051424' : '#f8fafc', borderColor: colors.cardBorder, color: colors.text }]}
                  keyboardType="numeric"
                  placeholder={`Enter duration in ${sleepUnit}`}
                  placeholderTextColor={colors.textMuted}
                  value={manualText}
                  onChangeText={setManualText}
                />
              </View>
            ) : (
              /* Visual Stepper */
              <View style={[styles.stepperContainer, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc', borderColor: colors.cardBorder }]}>
                <TouchableOpacity 
                  onPress={() => adjustSleep(sleepUnit === 'minutes' ? -30 : -0.5)} 
                  style={[styles.stepperBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }]}
                >
                  <Ionicons name="remove" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.stepperValContainer}>
                  <Text style={[styles.stepperValText, { color: colors.text }]}>
                    {sleepUnit === 'minutes' ? sleepHours : sleepHours.toFixed(1)}
                  </Text>
                  <Text style={[styles.stepperUnitText, { color: colors.textMuted }]}>{sleepUnit}</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => adjustSleep(sleepUnit === 'minutes' ? 30 : 0.5)} 
                  style={[styles.stepperBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }]}
                >
                  <Ionicons name="add" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
            )}

            {/* Quick Choice Presets */}
            <View style={styles.presetSleepRow}>
              <TouchableOpacity 
                onPress={() => setSleepHours(6.0)} 
                style={[
                  styles.presetSleepBtn, 
                  { backgroundColor: isDark ? 'rgba(5, 20, 36, 0.4)' : '#f1f5f9', borderColor: colors.cardBorder },
                  sleepHours === 6.0 && [styles.presetSleepBtnActive, { borderColor: isDark ? '#c3f400' : '#65a30d', backgroundColor: isDark ? 'rgba(195, 244, 0, 0.05)' : 'rgba(195, 244, 0, 0.15)' }]
                ]}
              >
                <Text style={[styles.presetSleepText, { color: colors.text }]}>6.0h (Rest)</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setSleepHours(8.0)} 
                style={[
                  styles.presetSleepBtn, 
                  { backgroundColor: isDark ? 'rgba(5, 20, 36, 0.4)' : '#f1f5f9', borderColor: colors.cardBorder },
                  sleepHours === 8.0 && [styles.presetSleepBtnActive, { borderColor: isDark ? '#c3f400' : '#65a30d', backgroundColor: isDark ? 'rgba(195, 244, 0, 0.05)' : 'rgba(195, 244, 0, 0.15)' }]
                ]}
              >
                <Text style={[styles.presetSleepText, { color: colors.text }]}>8.0h (Optimal)</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setSleepHours(9.0)} 
                style={[
                  styles.presetSleepBtn, 
                  { backgroundColor: isDark ? 'rgba(5, 20, 36, 0.4)' : '#f1f5f9', borderColor: colors.cardBorder },
                  sleepHours === 9.0 && [styles.presetSleepBtnActive, { borderColor: isDark ? '#c3f400' : '#65a30d', backgroundColor: isDark ? 'rgba(195, 244, 0, 0.05)' : 'rgba(195, 244, 0, 0.15)' }]
                ]}
              >
                <Text style={[styles.presetSleepText, { color: colors.text }]}>9.0h (Recovery)</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 20, color: colors.textMuted }]}>SLEEP QUALITY</Text>
            <View style={[styles.qualitySelector, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f1f5f9', borderColor: colors.cardBorder }]}>
              {(['poor', 'fair', 'good', 'excellent'] as const).map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[
                    styles.qualityBtn, 
                    sleepQuality === q && [styles.qualityBtnActive, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]
                  ]}
                  onPress={() => setSleepQuality(q)}
                >
                  <Text style={[
                    styles.qualityBtnText, 
                    { color: colors.textMuted },
                    sleepQuality === q && [styles.qualityBtnTextActive, { color: isDark ? '#c3f400' : '#051424' }]
                  ]}>
                    {q.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.btnSave, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]}
              onPress={handleSaveSleepLog}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Text style={[styles.btnSaveText, { color: colors.onPrimary }]}>RECORD SLEEP DATA</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Sleep History List */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Sleep Logs History</Text>
            
            {sleepHistory.length === 0 ? (
              <Text style={[styles.emptyHistoryText, { color: colors.textMuted }]}>No past logs found.</Text>
            ) : (
              <View style={styles.historyList}>
                {sleepHistory.map((item) => (
                  <View key={item.id} style={[styles.historyRow, { backgroundColor: isDark ? 'rgba(5, 20, 36, 0.4)' : '#f8fafc', borderColor: colors.cardBorder }]}>
                    <View>
                      <Text style={[styles.historyDate, { color: colors.text }]}>
                        {new Date(item.loggedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
                      </Text>
                      <Text style={[styles.historySubtext, { color: colors.textMuted }]}>
                        Quality: {item.quality}
                      </Text>
                    </View>
                    <View style={styles.historyRight}>
                      <Text style={[styles.historyHours, { color: colors.text }]}>{item.hours} hrs</Text>
                      <TouchableOpacity onPress={() => handleDeleteLog(item.id)} style={styles.btnDelete}>
                        <Ionicons name="trash-outline" size={14} color="#ff4a4a" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
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
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Oswald',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  scienceBanner: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 10,
    alignItems: 'center',
  },
  scienceBannerText: {
    fontFamily: 'Inter',
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontFamily: 'Oswald',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 16,
  },
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  durationVal: {
    fontFamily: 'Oswald',
    fontSize: 32,
    fontWeight: '700',
  },
  durationLbl: {
    fontFamily: 'Inter',
    fontSize: 11,
    marginTop: 2,
  },
  qualityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  poor: { backgroundColor: 'rgba(255, 74, 74, 0.2)' },
  fair: { backgroundColor: 'rgba(234, 179, 8, 0.2)' },
  good: { backgroundColor: 'rgba(56, 189, 248, 0.2)' },
  excellent: { backgroundColor: 'rgba(195, 244, 0, 0.25)' },
  qualityBadgeText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    fontWeight: 'bold',
  },
  stagesBarContainer: {
    marginTop: 10,
  },
  stagesBar: {
    height: 8,
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  stageSegment: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: 'Inter',
    fontSize: 9,
  },
  emptyCardText: {
    fontFamily: 'Inter',
    fontSize: 12,
    lineHeight: 18,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Oswald',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  fieldLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    marginBottom: 12,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValContainer: {
    alignItems: 'center',
  },
  stepperValText: {
    fontFamily: 'Oswald',
    fontSize: 28,
    fontWeight: '700',
  },
  stepperUnitText: {
    fontFamily: 'Inter',
    fontSize: 10,
    marginTop: -2,
  },
  presetSleepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  presetSleepBtn: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  presetSleepBtnActive: {},
  presetSleepText: {
    fontFamily: 'Oswald',
    fontSize: 10,
    fontWeight: '700',
  },
  qualitySelector: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 2,
    gap: 2,
  },
  qualityBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  qualityBtnActive: {},
  qualityBtnText: {
    fontFamily: 'Oswald',
    fontSize: 10,
    fontWeight: '700',
  },
  qualityBtnTextActive: {},
  btnSave: {
    borderRadius: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  btnSaveText: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emptyHistoryText: {
    fontFamily: 'Inter',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 10,
  },
  historyList: {
    gap: 8,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  historyDate: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '500',
  },
  historySubtext: {
    fontFamily: 'Inter',
    fontSize: 10,
    marginTop: 2,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyHours: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '600',
  },
  btnDelete: {
    padding: 4,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  keyboardToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  keyboardToggleText: {
    fontFamily: 'Inter',
    fontSize: 11,
  },
  unitSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 2,
    gap: 2,
    marginBottom: 12,
  },
  unitBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  unitBtnActive: {},
  unitBtnText: {
    fontFamily: 'Oswald',
    fontSize: 10,
    fontWeight: '700',
  },
  unitBtnTextActive: {},
  manualWrapper: {
    gap: 6,
    marginBottom: 12,
  },
  manualInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontFamily: 'Oswald',
    fontSize: 16,
  },
});
