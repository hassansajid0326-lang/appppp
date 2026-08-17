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
  Alert,
  Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';

// Define local backend API URL (using live Vercel deployment URL)
const API_URL = 'https://appppp-silk.vercel.app';

export default function SignUpScreen({ navigation }: any) {
  const { setSession, setProfile } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Eye toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP Verification Modal states
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  // Live password policy calculations
  const checkLength = password.length >= 8;
  const checkUpper = /[A-Z]/.test(password);
  const checkLower = /[a-z]/.test(password);
  const checkDigit = /\d/.test(password);
  const checkSpecial = /[@$!%*?&]/.test(password);
  const isPasswordValid = checkLength && checkUpper && checkLower && checkDigit && checkSpecial;

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Missing Info', 'Please fill in all security fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'The passwords you typed do not match.');
      return;
    }

    if (!isPasswordValid) {
      Alert.alert('Insecure Password', 'Your password must satisfy all security policies listed below.');
      return;
    }

    setLoading(true);
    try {
      // Call custom backend registration API
      const response = await fetch(`${API_URL}/api/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          password 
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to initialize account.');
      }

      // If OTP pending, show verification modal
      if (resData.status === 'verification_pending') {
        Alert.alert('OTP Sent', 'An 8-digit verification OTP code has been logged/sent to your email.');
        setShowOtpModal(true);
      }
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Unable to create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 8) {
      Alert.alert('Invalid Code', 'Please enter a valid 8-digit verification code.');
      return;
    }

    setOtpLoading(true);
    try {
      // Verify OTP code on the Express server
      const verifyResponse = await fetch(`${API_URL}/api/v1/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otpCode,
          purpose: 'signup'
        }),
      });

      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || 'Invalid OTP code. Please try again.');
      }

      if (verifyData.status === 'verified') {
        // Automatically sign in the user now that they are confirmed in Supabase Auth
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (signInError) throw signInError;

        if (data?.session) {
          setSession(data.session);

          // Fetch user profile from Supabase profiles
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .single();

          setProfile(profile);

          Alert.alert('Verification Successful', 'Welcome to FitPulse! Let us configure your details next.', [
            { 
              text: 'Proceed', 
              onPress: () => {
                setShowOtpModal(false);
                navigation.replace('Onboarding'); 
              } 
            }
          ]);
        }
      }
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message || 'OTP verification failed.');
    } finally {
      setOtpLoading(false);
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
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <Animated.View entering={FadeInUp.delay(200).duration(800)} style={styles.header}>
            <Image 
              source={require('../../../assets/icon.png')} 
              style={styles.logo} 
              resizeMode="contain"
            />
            <Text style={styles.brandSubtitle}>NEW ATHLETE REGISTRATION</Text>
          </Animated.View>

          {/* Registration Card */}
          <Animated.View 
            entering={FadeInDown.delay(400).duration(800)} 
            style={styles.glassCard}
          >
            <Text style={styles.cardHeader}>Sign Up</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.input}
                placeholder="casey@fitpulse.com"
                placeholderTextColor="#64748B"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  placeholderTextColor="#64748B"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity 
                  style={styles.eyeButton} 
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color="#64748B" 
                  />
                </TouchableOpacity>
              </View>
              
              {/* Password security policy checklist indicators */}
              <View style={styles.policyList}>
                <View style={styles.policyItem}>
                  <Ionicons 
                    name={checkLength ? "checkmark-circle" : "ellipse-outline"} 
                    size={14} 
                    color={checkLength ? "#c3f400" : "#64748B"} 
                  />
                  <Text style={[styles.policyText, { color: checkLength ? "#ffffff" : "#64748B" }]}>
                    Minimum 8 characters
                  </Text>
                </View>
                <View style={styles.policyItem}>
                  <Ionicons 
                    name={checkUpper ? "checkmark-circle" : "ellipse-outline"} 
                    size={14} 
                    color={checkUpper ? "#c3f400" : "#64748B"} 
                  />
                  <Text style={[styles.policyText, { color: checkUpper ? "#ffffff" : "#64748B" }]}>
                    At least one uppercase letter (A-Z)
                  </Text>
                </View>
                <View style={styles.policyItem}>
                  <Ionicons 
                    name={checkLower ? "checkmark-circle" : "ellipse-outline"} 
                    size={14} 
                    color={checkLower ? "#c3f400" : "#64748B"} 
                  />
                  <Text style={[styles.policyText, { color: checkLower ? "#ffffff" : "#64748B" }]}>
                    At least one lowercase letter (a-z)
                  </Text>
                </View>
                <View style={styles.policyItem}>
                  <Ionicons 
                    name={checkDigit ? "checkmark-circle" : "ellipse-outline"} 
                    size={14} 
                    color={checkDigit ? "#c3f400" : "#64748B"} 
                  />
                  <Text style={[styles.policyText, { color: checkDigit ? "#ffffff" : "#64748B" }]}>
                    At least one number (0-9)
                  </Text>
                </View>
                <View style={styles.policyItem}>
                  <Ionicons 
                    name={checkSpecial ? "checkmark-circle" : "ellipse-outline"} 
                    size={14} 
                    color={checkSpecial ? "#c3f400" : "#64748B"} 
                  />
                  <Text style={[styles.policyText, { color: checkSpecial ? "#ffffff" : "#64748B" }]}>
                    Special character (@$!%*?&)
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>CONFIRM PASSWORD</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  placeholderTextColor="#64748B"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity 
                  style={styles.eyeButton} 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons 
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color="#64748B" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.signUpButton} 
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#051424" />
              ) : (
                <Text style={styles.signUpButtonText}>INITIALIZE ACCOUNT</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerLinks}>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.linkText}>ALREADY HAVE AN ACCOUNT? LOGIN</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* OTP Verification Screen/Modal */}
      <Modal
        visible={showOtpModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOtpModal(false)}
      >
        <LinearGradient
          colors={['#051424', '#0d1c2d', '#010f1f']}
          style={styles.modalContainer}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', padding: 24 }}
          >
            <View style={styles.modalContent}>
              <Image 
                source={require('../../../assets/icon.png')} 
                style={styles.modalLogo} 
                resizeMode="contain" 
              />
              <Text style={styles.modalTitle}>EMAIL OTP VERIFICATION</Text>
              <Text style={styles.modalDescription}>
                Enter the 8-digit verification OTP code that has been logged/sent to your email: {email}
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>ENTER 8-DIGIT SECURITY KEY</Text>
                <TextInput
                  style={[styles.input, { letterSpacing: 8, fontSize: 24, textAlign: 'center', width: 280, fontWeight: '700' }]}
                  placeholder="12345678"
                  placeholderTextColor="#334155"
                  value={otpCode}
                  onChangeText={setOtpCode}
                  keyboardType="number-pad"
                  maxLength={8}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity 
                style={styles.verifyButton} 
                onPress={handleVerifyOTP}
                disabled={otpLoading}
              >
                {otpLoading ? (
                  <ActivityIndicator color="#051424" />
                ) : (
                  <Text style={styles.verifyButtonText}>VERIFY CODE</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => setShowOtpModal(false)}
              >
                <Text style={styles.closeButtonText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </LinearGradient>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 4,
  },
  modalLogo: {
    width: 100,
    height: 100,
    marginBottom: 8,
  },
  brandSubtitle: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    color: '#c3f400',
    letterSpacing: 2,
    marginTop: 6,
  },
  glassCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  cardHeader: {
    fontFamily: 'Oswald',
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#273647',
    paddingBottom: 8,
  },
  inputContainer: {
    marginBottom: 20,
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
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 20, 36, 0.6)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 15,
    color: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  eyeButton: {
    padding: 4,
  },
  signUpButton: {
    backgroundColor: '#c3f400',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
    shadowColor: '#c3f400',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  signUpButtonText: {
    fontFamily: 'Oswald',
    fontSize: 16,
    fontWeight: '700',
    color: '#051424',
    letterSpacing: 2,
  },
  footerLinks: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11,
    color: '#64748B',
    textDecorationLine: 'underline',
    letterSpacing: 0.8,
  },
  policyList: {
    marginTop: 10,
    gap: 6,
  },
  policyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  policyText: {
    fontFamily: 'Inter',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: 'Oswald',
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 2,
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  verifyButton: {
    backgroundColor: '#c3f400',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
  },
  verifyButtonText: {
    fontFamily: 'Oswald',
    fontSize: 16,
    fontWeight: '700',
    color: '#051424',
    letterSpacing: 2,
  },
  closeButton: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
    width: '100%',
  },
  closeButtonText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 12,
    color: '#94A3B8',
    letterSpacing: 1,
  },
});
