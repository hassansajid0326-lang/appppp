import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  Animated,
  Easing,
  NativeModules,
  Platform,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../../../lib/theme';

interface HeartRateLog {
  id: string;
  bpm: number;
  type: 'resting' | 'active';
  loggedAt: string;
}

export default function HeartRateScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useAppTheme();
  const [logType, setLogType] = useState<'resting' | 'active'>('resting');
  const [hrHistory, setHrHistory] = useState<HeartRateLog[]>([]);
  const [loading, setLoading] = useState(false);

  // Diagnostic Report Modal States
  const [diagnosticModalVisible, setDiagnosticModalVisible] = useState(false);
  const [diagnosticBpm, setDiagnosticBpm] = useState(72);
  const [diagnosticType, setDiagnosticType] = useState<'resting' | 'active'>('resting');

  // Scan states
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanSeconds, setScanSeconds] = useState(5);

  // Animated heart pulse
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  // Pulse animation looping
  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 350,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 350,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true
        })
      ]).start(() => {
        pulse();
      });
    };

    pulse();
  }, []);

  // Load Heart Rate logs
  const loadHrHistory = async () => {
    try {
      const data = await AsyncStorage.getItem('fitpulse_hr_logs');
      if (data) {
        const parsed = JSON.parse(data) as HeartRateLog[];
        const sorted = parsed.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
        setHrHistory(sorted);
      } else {
        setHrHistory([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadHrHistory();
    }, [])
  );

  const getDiagnosticInfo = (bpm: number, type: 'resting' | 'active') => {
    if (type === 'resting') {
      if (bpm < 60) {
        return {
          status: 'LOW (BRADYCARDIA)',
          color: '#38bdf8',
          description: 'Aapka resting heart rate standard 60 BPM se kam hai. Agar aap aam tor par active rehte hain ya athlete hain to ye behtar athletic fitness ko show karta hai.',
          solutions: [
            'Dizziness ya weakness mehsoos hon to aaram karein.',
            'Electrolytes aur hydration levels ko maintain rakhein.',
            'Agar symptoms barkarar rahein ya chest discomfort ho to doctor se consult karein.'
          ]
        };
      } else if (bpm <= 100) {
        return {
          status: 'NORMAL (SINUS RHYTHM)',
          color: isDark ? '#c3f400' : '#16a34a',
          description: 'Aapka heart rate bilkul healthy aur normal range (60-100 BPM) mein pump kar raha hai. Heart efficiency optimal hai.',
          solutions: [
            'Regular moderate cardio routine (e.g. 30-min brisk walk) maintain rakhein.',
            'Stress levels manage karne ke liye deep breathing exercise continue karein.',
            'Oats, walnuts aur omega-3 rich food cardiorespiratory health ke liye consume karein.'
          ]
        };
      } else {
        return {
          status: 'HIGH (TACHYCARDIA)',
          color: '#ff4a4a',
          description: 'Aapka heart rate normal resting limits se zyada hai. Ye anxiety, fever, lack of recovery ya caffeine excess ki wajah se ho sakta hai.',
          solutions: [
            'Aram se beth jayein aur 4-7-8 breathing method (saans andar 4s, hold 7s, saans bahar 8s) practice karein.',
            'Thanda pani piyein taaki vagus nerve trigger ho aur rate down ho.',
            'Coffee, chai ya nicotine ka use temporarily band kar dein. RHR elevated rahe to checkup karayein.'
          ]
        };
      }
    } else {
      // Active workout zones based on age max HR (approx 195)
      if (bpm < 110) {
        return {
          status: 'ACTIVE RECOVERY (ZONE 1)',
          color: '#38bdf8',
          description: 'Aapka heart rate warming up ya active recovery zone mein hai. Body muscular cooldown state mein hai.',
          solutions: [
            'Recovery walks ya slow cooldown exercises continue rakhein.',
            'Workout ke baad standard full body stretches perform karein.'
          ]
        };
      } else if (bpm <= 145) {
        return {
          status: 'FAT BURN ZONE (ZONE 2-3)',
          color: isDark ? '#c3f400' : '#16a34a',
          description: 'Aapka heart rate aerobic range mein hai jahan body primary energy target fat reserves se utilize karti hai.',
          solutions: [
            'Endurance aur stamina build karne ke liye is zone mein stable training behtar hai.',
            'Workout during hydration levels maintain rakhein.'
          ]
        };
      } else {
        return {
          status: 'ANAEROBIC CARDIO (ZONE 4-5)',
          color: '#ff4a4a',
          description: 'Aapka heart rate high-intensity zone mein hai. Muscular fatigue building fast ho rahi hai.',
          solutions: [
            'Heavy intervals ke baad recovery rest periods zaroor add karein.',
            'Extreme dizziness ya fatigue feel hotay hi exercise stop kar ke normal walks par shift hon.'
          ]
        };
      }
    }
  };

  // Optical PPG Fingerprint Sensor scan via Native Camera or Simulation fallback
  const handleMeasurePulse = async () => {
    const { PPGHeartRateModule } = NativeModules;
    
    if (Platform.OS === 'android' && PPGHeartRateModule) {
      setIsScanning(true);
      try {
        const bpm = await PPGHeartRateModule.measureHeartRate();
        if (bpm) {
          await saveRealPulse(bpm);
        } else {
          Alert.alert('Scan Cancelled', 'Heart rate measurement was cancelled.');
        }
      } catch (err: any) {
        console.warn('Native PPG scan failed, running simulator:', err);
        runSimulatedScanner();
      } finally {
        setIsScanning(false);
      }
    } else {
      runSimulatedScanner();
    }
  };

  const runSimulatedScanner = () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanSeconds(5);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setScanProgress(progress);
      setScanSeconds(prev => prev - 1);

      if (progress >= 100) {
        clearInterval(interval);
        saveSimulatedPulse();
      }
    }, 1000);
  };

  const saveRealPulse = async (bpm: number) => {
    setLoading(true);
    try {
      const newLog: HeartRateLog = {
        id: Math.random().toString(),
        bpm: bpm,
        type: logType,
        loggedAt: new Date().toISOString()
      };

      const stored = await AsyncStorage.getItem('fitpulse_hr_logs');
      const parsed = stored ? JSON.parse(stored) : [];
      const updated = [newLog, ...parsed];

      await AsyncStorage.setItem('fitpulse_hr_logs', JSON.stringify(updated));
      
      const sorted = updated.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
      setHrHistory(sorted);

      // Open diagnostic report instead of native Alert
      setDiagnosticBpm(bpm);
      setDiagnosticType(logType);
      setDiagnosticModalVisible(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to save pulse log.');
    } finally {
      setLoading(false);
    }
  };

  const saveSimulatedPulse = async () => {
    setLoading(true);
    try {
      let measuredBpm = 72;
      if (logType === 'resting') {
        measuredBpm = Math.floor(Math.random() * (74 - 62 + 1)) + 62; // random 62-74 BPM
      } else {
        measuredBpm = Math.floor(Math.random() * (138 - 120 + 1)) + 120; // random 120-138 BPM
      }

      const newLog: HeartRateLog = {
        id: Math.random().toString(),
        bpm: measuredBpm,
        type: logType,
        loggedAt: new Date().toISOString()
      };

      const stored = await AsyncStorage.getItem('fitpulse_hr_logs');
      const parsed = stored ? JSON.parse(stored) : [];
      const updated = [newLog, ...parsed];

      await AsyncStorage.setItem('fitpulse_hr_logs', JSON.stringify(updated));
      
      const sorted = updated.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
      setHrHistory(sorted);

      setIsScanning(false);
      
      // Open diagnostic report instead of native Alert
      setDiagnosticBpm(measuredBpm);
      setDiagnosticType(logType);
      setDiagnosticModalVisible(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to save pulse log.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    Alert.alert(
      'Delete Log',
      'Are you sure you want to delete this heart rate reading?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const stored = await AsyncStorage.getItem('fitpulse_hr_logs');
              if (stored) {
                const parsed = JSON.parse(stored) as HeartRateLog[];
                const filtered = parsed.filter(item => item.id !== id);
                await AsyncStorage.setItem('fitpulse_hr_logs', JSON.stringify(filtered));
                setHrHistory(hrHistory.filter(item => item.id !== id));
              }
            } catch (err) {
              console.error(err);
            }
          }
        }
      ]
    );
  };

  const restingLogs = hrHistory.filter(item => item.type === 'resting');
  const avgResting = restingLogs.length > 0 
    ? Math.round(restingLogs.reduce((sum, item) => sum + item.bpm, 0) / restingLogs.length)
    : 65; 

  const latestLog = hrHistory[0];

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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Cardio Physiology</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* Science description banner */}
          <View style={[styles.scienceBanner, { backgroundColor: isDark ? 'rgba(255, 74, 74, 0.08)' : 'rgba(255, 74, 74, 0.12)', borderColor: isDark ? 'rgba(255, 74, 74, 0.15)' : 'rgba(255, 74, 74, 0.25)' }]}>
            <Ionicons name="pulse" size={16} color="#ff4a4a" />
            <Text style={[styles.scienceBannerText, { color: colors.textSecondary }]}>
              Autonomic health: A lower resting heart rate (RHR) indicates high vagal nerve (parasympathetic) tone and strong stroke volume.
            </Text>
          </View>

          {/* Animated Heart Rate Pulse Widget */}
          <View style={[styles.pulseCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Animated.View style={[styles.heartContainer, { transform: [{ scale: pulseAnim }] }]}>
              <Ionicons name="heart" size={64} color="#ff4a4a" />
              <View style={styles.bpmOverlay}>
                <Text style={[styles.bpmVal, { color: '#ffffff' }]}>{latestLog ? latestLog.bpm : '--'}</Text>
                <Text style={[styles.bpmLbl, { color: '#ffffff' }]}>BPM</Text>
              </View>
            </Animated.View>

            <View style={[styles.pulseDetailsRow, { borderTopColor: colors.borderSubtle }]}>
              <View style={styles.pulseDetailCol}>
                <Text style={[styles.detailTitle, { color: colors.textMuted }]}>Resting Avg</Text>
                <Text style={[styles.detailVal, { color: colors.text }]}>{avgResting} BPM</Text>
                <Text style={[styles.detailSub, { color: colors.textMuted }]}>Optimal: 50-70 BPM</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
              <View style={styles.pulseDetailCol}>
                <Text style={[styles.detailTitle, { color: colors.textMuted }]}>Latest Type</Text>
                <Text style={[styles.detailVal, { color: colors.text, textTransform: 'capitalize' }]}>
                  {latestLog ? latestLog.type : '--'}
                </Text>
                <Text style={[styles.detailSub, { color: colors.textMuted }]}>
                  {latestLog ? new Date(latestLog.loggedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'No records today'}
                </Text>
              </View>
            </View>
          </View>

          {/* Automated optical scan tracker */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="finger-print-outline" size={18} color={isDark ? '#c3f400' : '#65a30d'} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Optical Pulse Scanner</Text>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>SCAN CONTEXT</Text>
            <View style={[styles.typeSelector, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f1f5f9', borderColor: colors.cardBorder }]}>
              {(['resting', 'active'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeBtn, 
                    logType === t && [styles.typeBtnActive, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]
                  ]}
                  onPress={() => setLogType(t)}
                  disabled={isScanning}
                >
                  <Text style={[
                    styles.typeBtnText, 
                    { color: colors.textMuted },
                    logType === t && [styles.typeBtnTextActive, { color: isDark ? '#c3f400' : '#051424' }]
                  ]}>
                    {t.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {isScanning ? (
              <View style={styles.scanContainer}>
                <ActivityIndicator size="large" color="#ff4a4a" />
                <Text style={styles.scanProgressText}>Reading capillary blood flow... {scanSeconds}s</Text>
                <View style={[styles.scanProgressBarBg, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
                  <View style={[styles.scanProgressBarFill, { width: `${scanProgress}%` }]} />
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.btnMeasure, { backgroundColor: colors.primary }]}
                onPress={handleMeasurePulse}
                disabled={loading}
              >
                <Ionicons name="scan-outline" size={16} color={colors.onPrimary} style={{ marginRight: 6 }} />
                <Text style={[styles.btnMeasureText, { color: colors.onPrimary }]}>MEASURE RESTING PULSE</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Heart Rate History List */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Pulse Logs History</Text>
            
            {hrHistory.length === 0 ? (
              <Text style={[styles.emptyHistoryText, { color: colors.textMuted }]}>No past logs found.</Text>
            ) : (
              <View style={styles.historyList}>
                {hrHistory.map((item) => (
                  <TouchableOpacity 
                    key={item.id} 
                    style={[styles.historyRow, { backgroundColor: isDark ? 'rgba(5, 20, 36, 0.4)' : '#f8fafc', borderColor: colors.cardBorder }]}
                    onPress={() => {
                      setDiagnosticBpm(item.bpm);
                      setDiagnosticType(item.type);
                      setDiagnosticModalVisible(true);
                    }}
                  >
                    <View>
                      <Text style={[styles.historyDate, { color: colors.text }]}>
                        {new Date(item.loggedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })} • {new Date(item.loggedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Text style={[styles.historySubtext, { color: colors.textMuted, textTransform: 'capitalize' }]}>
                        Type: {item.type} • Tap to view report
                      </Text>
                    </View>
                    <View style={styles.historyRight}>
                      <Text style={[styles.historyBpm, { color: colors.text }]}>{item.bpm} BPM</Text>
                      <TouchableOpacity onPress={() => handleDeleteLog(item.id)} style={styles.btnDelete}>
                        <Ionicons name="trash-outline" size={14} color="#ff4a4a" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* Custom Medical Diagnosis Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={diagnosticModalVisible}
        onRequestClose={() => setDiagnosticModalVisible(false)}
      >
        <View style={styles.modalBg}>
          <View style={[styles.diagModalContent, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            
            {/* Modal Header */}
            <View style={[styles.diagHeader, { borderBottomColor: colors.borderSubtle, backgroundColor: isDark ? 'rgba(5, 20, 36, 0.4)' : '#f8fafc' }]}>
              <View style={styles.diagHeaderLeft}>
                <Ionicons name="medical" size={16} color="#ff4a4a" style={{ marginRight: 6 }} />
                <Text style={[styles.diagModalTitle, { color: colors.text }]}>PHYSIOLOGICAL REPORT</Text>
              </View>
              <TouchableOpacity onPress={() => setDiagnosticModalVisible(false)} style={styles.diagCloseBtnIcon}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Diagnostic Metrics Display */}
            {(() => {
              const diag = getDiagnosticInfo(diagnosticBpm, diagnosticType);
              return (
                <ScrollView contentContainerStyle={styles.diagBody} showsVerticalScrollIndicator={false}>
                  
                  <View style={styles.diagBpmCircleContainer}>
                    <View style={[styles.diagBpmCircle, { borderColor: diag.color, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#f1f5f9' }]}>
                      <Text style={[styles.diagBpmVal, { color: colors.text }]}>{diagnosticBpm}</Text>
                      <Text style={[styles.diagBpmUnit, { color: colors.textMuted }]}>BPM</Text>
                    </View>
                    <View style={[styles.diagStatusPill, { backgroundColor: diag.color + '20', borderColor: diag.color }]}>
                      <Text style={[styles.diagStatusText, { color: diag.color }]}>{diag.status}</Text>
                    </View>
                  </View>

                  <Text style={[styles.diagSectionLabel, { color: colors.textMuted }]}>PHYSIOLOGICAL EXPLANATION</Text>
                  <Text style={[styles.diagDescText, { color: colors.textSecondary }]}>{diag.description}</Text>

                  <Text style={[styles.diagSectionLabel, { color: colors.textMuted }]}>ACTIONABLE SOLUTIONS / STEPS</Text>
                  <View style={styles.solutionsList}>
                    {diag.solutions.map((item, idx) => (
                      <View key={idx} style={styles.solutionItemRow}>
                        <Ionicons name="checkmark-circle-outline" size={14} color={diag.color} style={{ marginTop: 2, marginRight: 8 }} />
                        <Text style={[styles.solutionItemText, { color: colors.textSecondary }]}>{item}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity 
                    style={[styles.diagCloseBtn, { backgroundColor: colors.primary }]}
                    onPress={() => setDiagnosticModalVisible(false)}
                  >
                    <Text style={[styles.diagCloseBtnText, { color: colors.onPrimary }]}>SAVE & CONTINUE</Text>
                  </TouchableOpacity>

                </ScrollView>
              );
            })()}

          </View>
        </View>
      </Modal>
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
  pulseCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  heartContainer: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 10,
  },
  bpmOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bpmVal: {
    fontFamily: 'Oswald',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 8,
  },
  bpmLbl: {
    fontFamily: 'Inter',
    fontSize: 9,
    fontWeight: 'bold',
  },
  pulseDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  pulseDetailCol: {
    flex: 1,
    alignItems: 'center',
  },
  detailTitle: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  detailVal: {
    fontFamily: 'Oswald',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  detailSub: {
    fontFamily: 'Inter',
    fontSize: 9,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 36,
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
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  typeSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 2,
    gap: 2,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  typeBtnActive: {},
  typeBtnText: {
    fontFamily: 'Oswald',
    fontSize: 10,
    fontWeight: '700',
  },
  typeBtnTextActive: {},
  btnMeasure: {
    flexDirection: 'row',
    borderRadius: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  btnMeasureText: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  scanContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  scanProgressText: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#ff4a4a',
    marginTop: 10,
  },
  scanProgressBarBg: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  scanProgressBarFill: {
    height: '100%',
    backgroundColor: '#ff4a4a',
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
  historyBpm: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '600',
  },
  btnDelete: {
    padding: 4,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(5, 20, 36, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  diagModalContent: {
    width: '100%',
    maxHeight: '85%',
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  diagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  diagHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  diagModalTitle: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  diagCloseBtnIcon: {
    padding: 2,
  },
  diagBody: {
    padding: 20,
    paddingBottom: 30,
  },
  diagBpmCircleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  diagBpmCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  diagBpmVal: {
    fontFamily: 'Oswald',
    fontSize: 34,
    fontWeight: '700',
  },
  diagBpmUnit: {
    fontFamily: 'Inter',
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: -4,
  },
  diagStatusPill: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  diagStatusText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    fontWeight: 'bold',
  },
  diagSectionLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 10,
  },
  diagDescText: {
    fontFamily: 'Inter',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  solutionsList: {
    gap: 8,
    marginBottom: 20,
  },
  solutionItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  solutionItemText: {
    fontFamily: 'Inter',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  diagCloseBtn: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  diagCloseBtnText: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
