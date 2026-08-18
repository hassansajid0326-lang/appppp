import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  Alert 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';

export default function OnboardingScreen({ navigation }: any) {
  const { session, setProfile } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Profile data states
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'male' | 'female' | 'other' | null>(null);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState<'lose' | 'maintain' | 'gain' | null>(null);
  const [activity, setActivity] = useState<'sedentary' | 'light' | 'moderate' | 'active' | null>(null);

  // Unit system states
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');

  const nextStep = () => {
    if (step === 1) {
      if (!name.trim()) {
        Alert.alert('Invalid Input', 'Please enter your name.');
        return;
      }
      const ageVal = parseInt(age);
      if (isNaN(ageVal) || ageVal <= 0 || ageVal >= 120) {
        Alert.alert('Invalid Input', 'Please enter a valid age (1-119).');
        return;
      }
    } else if (step === 2) {
      if (!sex) {
        Alert.alert('Selection Required', 'Please select your biological sex.');
        return;
      }
    } else if (step === 3) {
      if (heightUnit === 'cm') {
        const heightVal = parseFloat(height);
        if (isNaN(heightVal) || heightVal <= 0) {
          Alert.alert('Invalid Input', 'Please enter a valid height.');
          return;
        }
      } else {
        const feetVal = parseFloat(heightFeet);
        const inchesVal = parseFloat(heightInches);
        if (isNaN(feetVal) || feetVal <= 0 || isNaN(inchesVal) || inchesVal < 0 || inchesVal >= 12) {
          Alert.alert('Invalid Input', 'Please enter valid feet and inches (0-11).');
          return;
        }
      }

      const weightVal = parseFloat(weight);
      if (isNaN(weightVal) || weightVal <= 0) {
        Alert.alert('Invalid Input', 'Please enter a valid weight.');
        return;
      }
    } else if (step === 4) {
      if (!goal || !activity) {
        Alert.alert('Selection Required', 'Please complete both selections.');
        return;
      }
    }
    
    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(Math.max(1, step - 1));
  };

  const handleSkip = async () => {
    if (!session?.user) {
      navigation.replace('Login');
      return;
    }
    setLoading(true);
    try {
      const defaultProfile = {
        id: session.user.id,
        name: name.trim() || 'User',
        age: parseInt(age) || 25,
        sex: sex || 'other',
        height_cm: height ? parseFloat(height) : 170.0,
        goal_type: goal || 'maintain',
        activity_level: activity || 'moderate',
        daily_step_goal: 10000,
        units: 'metric',
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert(defaultProfile)
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      navigation.replace('MainTabs');
    } catch (e: any) {
      navigation.replace('MainTabs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProfile = async () => {
    if (!session?.user) {
      Alert.alert('Error', 'No authenticated session found. Please log in.');
      navigation.replace('Login');
      return;
    }

    setLoading(true);
    
    let finalHeightCm = parseFloat(height);
    if (heightUnit === 'ft') {
      const feetVal = parseFloat(heightFeet) || 0;
      const inchesVal = parseFloat(heightInches) || 0;
      finalHeightCm = (feetVal * 12 + inchesVal) * 2.54;
    }

    const profilePayload = {
      id: session.user.id,
      name: name.trim(),
      age: parseInt(age),
      sex,
      height_cm: parseFloat(finalHeightCm.toFixed(1)),
      goal_type: goal,
      activity_level: activity,
      daily_step_goal: 10000,
      units: heightUnit === 'cm' && weightUnit === 'kg' ? 'metric' : 'imperial',
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profilePayload)
        .select()
        .single();

      if (error) throw error;

      // Save initial weight entry to weight_entries table
      const weightVal = parseFloat(weight);
      if (!isNaN(weightVal) && weightVal > 0) {
        const finalWeightKg = weightUnit === 'lbs' ? weightVal * 0.45359237 : weightVal;
        const { error: weightError } = await supabase
          .from('weight_entries')
          .insert({
            user_id: session.user.id,
            weight_kg: parseFloat(finalWeightKg.toFixed(2)),
            logged_at: new Date().toISOString(),
          });
        if (weightError) console.error('Error saving onboarding weight:', weightError);
      }

      setProfile(data);
      
      Alert.alert(
        'Profile Saved', 
        'Your profile has been created successfully!', 
        [
          { 
            text: 'OK', 
            onPress: () => {
              navigation.replace('MainTabs');
            } 
          }
        ]
      );
    } catch (e: any) {
      Alert.alert('Database Sync Error', e.message || 'Failed to submit profile.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Animated.View key="step1" entering={FadeIn.duration(400)} exiting={FadeOut.duration(200)} style={styles.card}>
            <Text style={styles.cardHeader}>Basic Info</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>FULL NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="Casey Jenkins"
                placeholderTextColor="#64748B"
                value={name}
                onChangeText={setName}
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>AGE (YEARS)</Text>
              <TextInput
                style={styles.input}
                placeholder="28"
                placeholderTextColor="#64748B"
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity style={styles.actionButton} onPress={nextStep}>
              <Text style={styles.actionButtonText}>CONTINUE</Text>
            </TouchableOpacity>
          </Animated.View>
        );
      case 2:
        return (
          <Animated.View key="step2" entering={FadeIn.duration(400)} exiting={FadeOut.duration(200)} style={styles.card}>
            <Text style={styles.cardHeader}>Biological Sex</Text>
            <Text style={styles.description}>We use biological sex to compute accurate daily calorie burn targets.</Text>

            <View style={styles.chipsContainer}>
              {['male', 'female', 'other'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.chip, sex === option && styles.chipActive]}
                  onPress={() => setSex(option as any)}
                >
                  <Text style={[styles.chipText, sex === option && styles.chipTextActive]}>
                    {option.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.navigationRow}>
              <TouchableOpacity style={styles.backButton} onPress={prevStep}>
                <Text style={styles.backButtonText}>BACK</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButtonHalf} onPress={nextStep}>
                <Text style={styles.actionButtonText}>CONTINUE</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        );
      case 3:
        return (
          <Animated.View key="step3" entering={FadeIn.duration(400)} exiting={FadeOut.duration(200)} style={styles.card}>
            <Text style={styles.cardHeader}>Height & Weight</Text>

            {/* Height section with unit switcher */}
            <View style={styles.inputContainer}>
              <View style={styles.unitSelectorHeader}>
                <Text style={styles.label}>HEIGHT</Text>
                <View style={styles.unitTabsRow}>
                  <TouchableOpacity 
                    onPress={() => setHeightUnit('cm')} 
                    style={[styles.unitTab, heightUnit === 'cm' && styles.unitTabActive]}
                  >
                    <Text style={[styles.unitTabText, heightUnit === 'cm' && styles.unitTabTextActive]}>cm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setHeightUnit('ft')} 
                    style={[styles.unitTab, heightUnit === 'ft' && styles.unitTabActive]}
                  >
                    <Text style={[styles.unitTabText, heightUnit === 'ft' && styles.unitTabTextActive]}>ft/in</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {heightUnit === 'cm' ? (
                <TextInput
                  style={styles.input}
                  placeholder="175"
                  placeholderTextColor="#64748B"
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="numeric"
                />
              ) : (
                <View style={styles.inlineInputsRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Feet (e.g. 5)"
                    placeholderTextColor="#64748B"
                    value={heightFeet}
                    onChangeText={setHeightFeet}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Inches (e.g. 9)"
                    placeholderTextColor="#64748B"
                    value={heightInches}
                    onChangeText={setHeightInches}
                    keyboardType="numeric"
                  />
                </View>
              )}
            </View>

            {/* Weight section with unit switcher */}
            <View style={styles.inputContainer}>
              <View style={styles.unitSelectorHeader}>
                <Text style={styles.label}>CURRENT WEIGHT</Text>
                <View style={styles.unitTabsRow}>
                  <TouchableOpacity 
                    onPress={() => setWeightUnit('kg')} 
                    style={[styles.unitTab, weightUnit === 'kg' && styles.unitTabActive]}
                  >
                    <Text style={[styles.unitTabText, weightUnit === 'kg' && styles.unitTabTextActive]}>kg</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setWeightUnit('lbs')} 
                    style={[styles.unitTab, weightUnit === 'lbs' && styles.unitTabActive]}
                  >
                    <Text style={[styles.unitTabText, weightUnit === 'lbs' && styles.unitTabTextActive]}>lbs</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TextInput
                style={styles.input}
                placeholder={weightUnit === 'kg' ? "74.5" : "164"}
                placeholderTextColor="#64748B"
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.navigationRow}>
              <TouchableOpacity style={styles.backButton} onPress={prevStep}>
                <Text style={styles.backButtonText}>BACK</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButtonHalf} onPress={nextStep}>
                <Text style={styles.actionButtonText}>CONTINUE</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        );
      case 4:
        return (
          <Animated.View key="step4" entering={FadeIn.duration(400)} exiting={FadeOut.duration(200)} style={styles.card}>
            <Text style={styles.cardHeader}>Goals & Activity</Text>

            <Text style={styles.label}>PRIMARY GOAL</Text>
            <View style={styles.chipsContainer}>
              {['lose', 'maintain', 'gain'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.chip, goal === option && styles.chipActive]}
                  onPress={() => setGoal(option as any)}
                >
                  <Text style={[styles.chipText, goal === option && styles.chipTextActive]}>
                    {option.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { marginTop: 12 }]}>ACTIVITY LEVEL</Text>
            <View style={styles.chipsContainerWrap}>
              {['sedentary', 'light', 'moderate', 'active'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.chipWrap, activity === option && styles.chipWrapActive]}
                  onPress={() => setActivity(option as any)}
                >
                  <Text style={[styles.chipText, activity === option && styles.chipTextActive]}>
                    {option.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.navigationRow}>
              <TouchableOpacity style={styles.backButton} onPress={prevStep}>
                <Text style={styles.backButtonText}>BACK</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButtonHalf} onPress={handleSubmitProfile} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#051424" />
                ) : (
                  <Text style={styles.actionButtonText}>SAVE PROFILE</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        );
      default:
        return null;
    }
  };

  return (
    <LinearGradient
      colors={['#051424', '#0d1c2d', '#010f1f']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Onboarding Steps Progress Header */}
          <View style={styles.progressHeader}>
            <View style={styles.titleAndSkipRow}>
              <Text style={styles.progressTitle}>SET UP PROFILE</Text>
              <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                <Text style={styles.skipButtonText}>SKIP</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.barContainer}>
              {[1, 2, 3, 4].map((i) => (
                <View 
                  key={i} 
                  style={[
                    styles.progressBar, 
                    i <= step && styles.progressBarActive,
                    i === step && styles.progressBarCurrent
                  ]} 
                />
              ))}
            </View>
          </View>

          {/* Render Active Step with Reanimated layouts */}
          <Animated.View layout={Layout.springify()} style={styles.cardOuter}>
            {renderStep()}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  progressHeader: {
    alignItems: 'center',
    marginBottom: 36,
    width: '100%',
    maxWidth: 400,
  },
  titleAndSkipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  progressTitle: {
    fontFamily: 'Oswald',
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  skipButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  skipButtonText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 12,
    color: '#c3f400',
    textDecorationLine: 'underline',
    letterSpacing: 1,
  },
  barContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  progressBar: {
    height: 4,
    width: '23%',
    backgroundColor: '#1c2b3c',
    borderRadius: 2,
  },
  progressBarActive: {
    backgroundColor: '#64748B',
  },
  progressBarCurrent: {
    backgroundColor: '#c3f400', // Glowing Electric Lime
  },
  cardOuter: {
    width: '100%',
    maxWidth: 400,
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 28,
  },
  cardHeader: {
    fontFamily: 'Oswald',
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1.5,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#273647',
    paddingBottom: 6,
  },
  description: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
    alignSelf: 'stretch',
  },
  label: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    color: '#64748B',
    marginBottom: 8,
    letterSpacing: 1.2,
  },
  input: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: '#ffffff',
    backgroundColor: 'rgba(5, 20, 36, 0.6)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  chipsContainerWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  chip: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: 'rgba(5, 20, 36, 0.6)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  chipActive: {
    borderColor: '#c3f400',
    backgroundColor: 'rgba(195, 244, 0, 0.05)',
  },
  chipWrap: {
    width: '47%',
    backgroundColor: 'rgba(5, 20, 36, 0.6)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  chipWrapActive: {
    borderColor: '#c3f400',
    backgroundColor: 'rgba(195, 244, 0, 0.05)',
  },
  chipText: {
    fontFamily: 'Oswald',
    fontSize: 14,
    color: '#64748B',
    letterSpacing: 1,
  },
  chipTextActive: {
    color: '#c3f400',
  },
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  actionButton: {
    backgroundColor: '#c3f400',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  actionButtonHalf: {
    width: '48%',
    backgroundColor: '#c3f400',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionButtonText: {
    fontFamily: 'Oswald',
    fontSize: 15,
    fontWeight: '700',
    color: '#051424',
    letterSpacing: 1.5,
  },
  backButton: {
    width: '48%',
    backgroundColor: 'rgba(5, 20, 36, 0.6)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  backButtonText: {
    fontFamily: 'Oswald',
    fontSize: 15,
    color: '#64748B',
    letterSpacing: 1.5,
  },
  unitSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  unitTabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  unitTab: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: 'transparent',
  },
  unitTabActive: {
    borderColor: '#c3f400',
    backgroundColor: 'rgba(195, 244, 0, 0.1)',
  },
  unitTabText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    color: '#64748B',
  },
  unitTabTextActive: {
    color: '#c3f400',
    fontWeight: 'bold',
  },
  inlineInputsRow: {
    flexDirection: 'row',
    gap: 12,
  },
});
