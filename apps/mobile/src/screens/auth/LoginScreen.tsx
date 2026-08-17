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

// Define local backend API URL (using local IP for physical device debugging)
const API_URL = 'http://192.168.100.6:3000';

export default function LoginScreen({ navigation }: any) {
  const { setSession, setProfile } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password flow states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1 = request code, 2 = verify & reset
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Info', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) throw error;

      if (data?.session) {
        setSession(data.session);

        // Fetch user profile from Supabase profiles
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .single();

        if (profile && !profileError) {
          setProfile(profile);
          navigation.replace('MainTabs');
        } else {
          navigation.replace('Onboarding');
        }
      }
    } catch (error: any) {
      Alert.alert('Authentication Error', error.message || 'Log in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestResetOTP = async () => {
    if (!forgotEmail) {
      Alert.alert('Missing Info', 'Please enter your email address.');
      return;
    }

    setForgotLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to send OTP.');

      Alert.alert('OTP Sent', 'The 8-digit verification code has been logged/sent to your email.');
      setForgotStep(2);
    } catch (err: any) {
      Alert.alert('Reset Failed', err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!forgotOtp || !forgotNewPassword || !forgotConfirmPassword) {
      Alert.alert('Missing Info', 'Please fill in all recovery fields.');
      return;
    }

    if (forgotOtp.length !== 8) {
      Alert.alert('Invalid Code', 'The OTP code must be exactly 8 digits.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      Alert.alert('Password Mismatch', 'New passwords do not match.');
      return;
    }

    setForgotLoading(true);
    try {
      // Step 1: Verify the OTP is correct and mark it as verified in database
      const verifyResponse = await fetch(`${API_URL}/api/v1/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: forgotEmail.trim().toLowerCase(), 
          otp: forgotOtp, 
          purpose: 'forgot_password' 
        }),
      });

      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok) throw new Error(verifyData.error || 'Failed to verify OTP.');

      // Step 2: Reset the password
      const resetResponse = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          otp: forgotOtp,
          newPassword: forgotNewPassword
        }),
      });

      const resetData = await resetResponse.json();
      if (!resetResponse.ok) throw new Error(resetData.error || 'Failed to reset password.');

      Alert.alert('Success', 'Your password has been reset successfully. You can now log in.', [
        { 
          text: 'OK', 
          onPress: () => {
            setShowForgotModal(false);
            setForgotStep(1);
            setForgotEmail('');
            setForgotOtp('');
            setForgotNewPassword('');
            setForgotConfirmPassword('');
          } 
        }
      ]);
    } catch (err: any) {
      Alert.alert('Reset Failed', err.message);
    } finally {
      setForgotLoading(false);
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
          {/* Headline and Branding */}
          <Animated.View entering={FadeInUp.delay(200).duration(800)} style={styles.header}>
            <View style={styles.brandTitleContainer}>
              <Image 
                source={require('../../../assets/favicon.png')} 
                style={styles.favicon} 
              />
              <Text style={styles.brandTitle}>FITPULSE</Text>
            </View>
            <Text style={styles.brandSubtitle}>KINETIC CORE // SYSTEM ACCESS</Text>
          </Animated.View>

          {/* Login Panel Card (Glassmorphism) */}
          <Animated.View 
            entering={FadeInDown.delay(400).duration(800)} 
            style={styles.glassCard}
          >
            <Text style={styles.cardHeader}>Log In</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>EMAIL ADDRESS // ID</Text>
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
              <Text style={styles.label}>PASSWORD // SECURITY KEY</Text>
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
            </View>

            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#051424" />
              ) : (
                <Text style={styles.loginButtonText}>START PROTOCOL</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerLinks}>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')} style={{ marginBottom: 14 }}>
                <Text style={styles.linkText}>CREATE NEW ATHLETE ACCOUNT</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowForgotModal(true)}>
                <Text style={[styles.linkText, { color: '#c3f400', textDecorationLine: 'none' }]}>FORGOT PASSWORD // RESET KEY</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowForgotModal(false);
          setForgotStep(1);
        }}
      >
        <LinearGradient
          colors={['#051424', '#0d1c2d', '#010f1f']}
          style={styles.modalContainer}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', padding: 24 }}
          >
            <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.modalContent}>
                <View style={styles.brandTitleContainer}>
                  <Image source={require('../../../assets/favicon.png')} style={styles.favicon} />
                  <Text style={styles.brandTitle}>FITPULSE</Text>
                </View>
                <Text style={styles.modalTitle}>PASSWORD RECOVERY</Text>
                
                {forgotStep === 1 ? (
                  <View style={{ width: '100%' }}>
                    <Text style={styles.modalDescription}>
                      Enter your registered email address to receive an 8-digit security verification OTP code.
                    </Text>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>EMAIL ADDRESS</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="casey@fitpulse.com"
                        placeholderTextColor="#64748B"
                        value={forgotEmail}
                        onChangeText={setForgotEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.actionButton} 
                      onPress={handleRequestResetOTP}
                      disabled={forgotLoading}
                    >
                      {forgotLoading ? (
                        <ActivityIndicator color="#051424" />
                      ) : (
                        <Text style={styles.actionButtonText}>SEND RESET OTP</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ width: '100%' }}>
                    <Text style={styles.modalDescription}>
                      Enter the 8-digit OTP code sent to your email and set your new password.
                    </Text>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>8-DIGIT SECURITY OTP</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="12345678"
                        placeholderTextColor="#64748B"
                        value={forgotOtp}
                        onChangeText={setForgotOtp}
                        keyboardType="number-pad"
                        maxLength={8}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>NEW PASSWORD</Text>
                      <View style={styles.passwordInputWrapper}>
                        <TextInput
                          style={styles.passwordInput}
                          placeholder="••••••••"
                          placeholderTextColor="#64748B"
                          value={forgotNewPassword}
                          onChangeText={setForgotNewPassword}
                          secureTextEntry={!showForgotNewPassword}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                        <TouchableOpacity 
                          style={styles.eyeButton} 
                          onPress={() => setShowForgotNewPassword(!showForgotNewPassword)}
                        >
                          <Ionicons 
                            name={showForgotNewPassword ? "eye-off-outline" : "eye-outline"} 
                            size={20} 
                            color="#64748B" 
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>CONFIRM NEW PASSWORD</Text>
                      <View style={styles.passwordInputWrapper}>
                        <TextInput
                          style={styles.passwordInput}
                          placeholder="••••••••"
                          placeholderTextColor="#64748B"
                          value={forgotConfirmPassword}
                          onChangeText={setForgotConfirmPassword}
                          secureTextEntry={!showForgotConfirmPassword}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                        <TouchableOpacity 
                          style={styles.eyeButton} 
                          onPress={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                        >
                          <Ionicons 
                            name={showForgotConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                            size={20} 
                            color="#64748B" 
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <TouchableOpacity 
                      style={styles.actionButton} 
                      onPress={handleResetPassword}
                      disabled={forgotLoading}
                    >
                      {forgotLoading ? (
                        <ActivityIndicator color="#051424" />
                      ) : (
                        <Text style={styles.actionButtonText}>RESET PASSWORD</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={() => {
                    setShowForgotModal(false);
                    setForgotStep(1);
                  }}
                >
                  <Text style={styles.closeButtonText}>CANCEL</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  brandTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  favicon: {
    width: 40,
    height: 40,
  },
  brandTitle: {
    fontFamily: 'Oswald',
    fontSize: 42,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 6,
    textShadowColor: 'rgba(195, 244, 0, 0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  brandSubtitle: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    color: '#c3f400', // Electric Lime
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
  loginButton: {
    backgroundColor: '#c3f400', // Electric Lime
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
  loginButtonText: {
    fontFamily: 'Oswald',
    fontSize: 16,
    fontWeight: '700',
    color: '#051424', // Deep Navy text contrast
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
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
    fontSize: 24,
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
  actionButton: {
    backgroundColor: '#c3f400',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
  },
  actionButtonText: {
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
