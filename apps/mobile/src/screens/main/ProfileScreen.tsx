import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../lib/store';
import { useOfflineStore } from '../../lib/offlineStore';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen() {
  const { profile, session, setProfile, logout } = useAuthStore();
  const { 
    latestWeightKg, 
    weightHistory, 
    addWeightEntry, 
    fetchLatestWeight 
  } = useOfflineStore();

  const [weightInput, setWeightInput] = useState('');
  const [loggingWeight, setLoggingWeight] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Profile Edit fields
  const [name, setName] = useState(profile?.name || '');
  const [age, setAge] = useState(profile?.age ? String(profile.age) : '');
  const [heightVal, setHeightVal] = useState(''); // cm or feet depending on unit
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');

  const userId = session?.user?.id;
  const currentUnits = profile?.units || 'metric';

  useEffect(() => {
    if (userId) {
      fetchLatestWeight(userId);
    }
  }, [userId]);

  // Set initial height fields based on unit
  useEffect(() => {
    if (profile?.height_cm) {
      if (currentUnits === 'imperial') {
        const totalInches = profile.height_cm / 2.54;
        setHeightFeet(String(Math.floor(totalInches / 12)));
        setHeightInches(String(Math.round(totalInches % 12)));
      } else {
        setHeightVal(String(profile.height_cm));
      }
    }
  }, [profile, currentUnits]);

  // Convert weight for display
  const displayWeight = currentUnits === 'imperial' 
    ? Math.round(latestWeightKg * 2.20462) 
    : latestWeightKg;
  const weightUnitLabel = currentUnits === 'imperial' ? 'lbs' : 'kg';

  // Handle Weight Log Submit
  const handleLogWeight = async () => {
    const val = parseFloat(weightInput);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight.');
      return;
    }

    setLoggingWeight(true);
    try {
      const finalWeightKg = currentUnits === 'imperial' ? val / 2.20462 : val;
      if (userId) {
        await addWeightEntry(userId, parseFloat(finalWeightKg.toFixed(2)));
        setWeightInput('');
        Alert.alert('Weight Logged', 'Your weight has been updated successfully!');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to log weight.');
    } finally {
      setLoggingWeight(false);
    }
  };

  // Handle Profile Update (Name, Age, Height)
  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Name cannot be empty.');
      return;
    }

    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
      Alert.alert('Invalid Age', 'Please enter a valid age (1-120).');
      return;
    }

    let finalHeightCm = 170;
    if (currentUnits === 'imperial') {
      const ft = parseFloat(heightFeet);
      const inch = parseFloat(heightInches) || 0;
      if (isNaN(ft) || ft <= 0 || inch < 0 || inch >= 12) {
        Alert.alert('Invalid Height', 'Please enter valid feet and inches.');
        return;
      }
      finalHeightCm = (ft * 12 + inch) * 2.54;
    } else {
      const cm = parseFloat(heightVal);
      if (isNaN(cm) || cm <= 0) {
        Alert.alert('Invalid Height', 'Please enter a valid height in cm.');
        return;
      }
      finalHeightCm = cm;
    }

    setUpdatingProfile(true);
    try {
      if (userId) {
        const { data, error } = await supabase
          .from('profiles')
          .update({
            name: name.trim(),
            age: ageNum,
            height_cm: parseFloat(finalHeightCm.toFixed(1)),
          })
          .eq('id', userId)
          .select()
          .single();

        if (error) throw error;
        setProfile(data);
        Alert.alert('Success', 'Profile updated successfully!');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Toggle Units Preference
  const handleToggleUnits = async () => {
    const nextUnits = currentUnits === 'metric' ? 'imperial' : 'metric';
    
    // Optimistically update height display states
    if (profile?.height_cm) {
      if (nextUnits === 'imperial') {
        const totalInches = profile.height_cm / 2.54;
        setHeightFeet(String(Math.floor(totalInches / 12)));
        setHeightInches(String(Math.round(totalInches % 12)));
      } else {
        setHeightVal(String(profile.height_cm));
      }
    }

    try {
      if (userId) {
        const { data, error } = await supabase
          .from('profiles')
          .update({ units: nextUnits })
          .eq('id', userId)
          .select()
          .single();

        if (error) throw error;
        setProfile(data);
      }
    } catch (e: any) {
      Alert.alert('Sync Error', e.message || 'Failed to change unit preferences.');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            logout();
          }
        }
      ]
    );
  };

  return (
    <LinearGradient colors={['#051424', '#0d1c2d', '#010f1f']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>ATHLETE BIOMETRICS</Text>
              <Text style={styles.subtitle}>MANAGE UNIT PREFERENCES & HEALTH PROFILE</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#ff4a4a" />
            </TouchableOpacity>
          </View>

          {/* Unit selection toggle */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Unit Preferences</Text>
            <View style={styles.unitToggleRow}>
              <TouchableOpacity 
                style={[styles.unitTab, currentUnits === 'metric' && styles.unitTabActive]}
                onPress={() => currentUnits === 'imperial' && handleToggleUnits()}
              >
                <Text style={[styles.unitTabText, currentUnits === 'metric' && styles.unitTabTextActive]}>
                  METRIC (KG, CM)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.unitTab, currentUnits === 'imperial' && styles.unitTabActive]}
                onPress={() => currentUnits === 'metric' && handleToggleUnits()}
              >
                <Text style={[styles.unitTabText, currentUnits === 'imperial' && styles.unitTabTextActive]}>
                  IMPERIAL (LBS, FT/IN)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Profile fields */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Personal Info</Text>

            <Text style={styles.inputLabel}>FULL NAME</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your Name"
              placeholderTextColor="#334155"
            />

            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.inputLabel}>AGE (years)</Text>
                <TextInput
                  style={styles.input}
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                  placeholder="e.g. 28"
                  placeholderTextColor="#334155"
                />
              </View>

              <View style={styles.fieldHalf}>
                <Text style={styles.inputLabel}>HEIGHT ({currentUnits === 'imperial' ? 'ft/in' : 'cm'})</Text>
                {currentUnits === 'imperial' ? (
                  <View style={styles.heightFtInRow}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginRight: 6 }]}
                      value={heightFeet}
                      onChangeText={setHeightFeet}
                      keyboardType="numeric"
                      placeholder="ft"
                      placeholderTextColor="#334155"
                    />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={heightInches}
                      onChangeText={setHeightInches}
                      keyboardType="numeric"
                      placeholder="in"
                      placeholderTextColor="#334155"
                    />
                  </View>
                ) : (
                  <TextInput
                    style={styles.input}
                    value={heightVal}
                    onChangeText={setHeightVal}
                    keyboardType="numeric"
                    placeholder="cm"
                    placeholderTextColor="#334155"
                  />
                )}
              </View>
            </View>

            <TouchableOpacity 
              style={styles.updateButton} 
              onPress={handleUpdateProfile}
              disabled={updatingProfile}
            >
              {updatingProfile ? (
                <ActivityIndicator size="small" color="#051424" />
              ) : (
                <Text style={styles.updateButtonText}>UPDATE PROFILE</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Weight Log section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Record Weight</Text>
            <View style={styles.weightLogForm}>
              <View style={styles.weightInputContainer}>
                <TextInput
                  style={[styles.input, { marginBottom: 0, flex: 1 }]}
                  placeholder={`Current Weight (${weightUnitLabel})`}
                  placeholderTextColor="#334155"
                  keyboardType="numeric"
                  value={weightInput}
                  onChangeText={setWeightInput}
                />
                <Text style={styles.weightUnitLabel}>{weightUnitLabel}</Text>
              </View>
              <TouchableOpacity 
                style={styles.logWeightBtn} 
                onPress={handleLogWeight}
                disabled={loggingWeight}
              >
                {loggingWeight ? (
                  <ActivityIndicator size="small" color="#051424" />
                ) : (
                  <Text style={styles.logWeightBtnText}>LOG</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Weight history timeline */}
          <Text style={styles.sectionTitle}>WEIGHT LOG HISTORY</Text>
          {weightHistory.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="bar-chart-outline" size={32} color="#334155" />
              <Text style={styles.emptyText}>No weight logs recorded yet.</Text>
            </View>
          ) : (
            weightHistory.map((item) => {
              const displayVal = currentUnits === 'imperial'
                ? Math.round(item.weight_kg * 2.20462)
                : item.weight_kg;
              const dateLabel = new Date(item.logged_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
              return (
                <View key={item.id} style={styles.historyItem}>
                  <View>
                    <Text style={styles.historyDate}>{dateLabel}</Text>
                  </View>
                  <Text style={styles.historyWeight}>{displayVal} {weightUnitLabel}</Text>
                </View>
              );
            })
          )}

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Oswald',
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  subtitle: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  logoutButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 74, 74, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 74, 74, 0.2)',
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 20,
    alignSelf: 'stretch',
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: 'Oswald',
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
    marginBottom: 16,
  },
  unitToggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(5, 20, 36, 0.4)',
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  unitTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  unitTabActive: {
    backgroundColor: '#c3f400',
  },
  unitTabText: {
    fontFamily: 'Oswald',
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  unitTabTextActive: {
    color: '#051424',
  },
  inputLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: '#64748B',
    fontWeight: 'bold',
    marginBottom: 6,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: 'rgba(5, 20, 36, 0.4)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    color: '#ffffff',
    fontFamily: 'Inter',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  fieldHalf: {
    flex: 1,
  },
  heightFtInRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  updateButton: {
    backgroundColor: '#c3f400',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  updateButtonText: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
    color: '#051424',
    letterSpacing: 0.5,
  },
  weightLogForm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weightInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 20, 36, 0.4)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingRight: 12,
  },
  weightUnitLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748B',
  },
  logWeightBtn: {
    backgroundColor: '#c3f400',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logWeightBtnText: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
    color: '#051424',
  },
  sectionTitle: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: 'rgba(30, 41, 59, 0.2)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  historyDate: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11,
    color: '#64748B',
  },
  historyWeight: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
