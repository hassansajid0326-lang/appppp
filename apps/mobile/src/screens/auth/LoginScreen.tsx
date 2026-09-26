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
import { useAppTheme } from '../../lib/theme';

// Define local backend API URL (using live Vercel deployment URL)
const API_URL = 'https://appppp-silk.vercel.app';

export default function LoginScreen({ navigation }: any) {
  const { colors, isDark } = useAppTheme();
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

  // Password policy flags for recovery
  const checkForgotLength = forgotNewPassword.length >= 8;
  const checkForgotUpper = /[A-Z]/.test(forgotNewPassword);
  const checkForgotLower = /[a-z]/.test(forgotNewPassword);
  const checkForgotDigit = /[0-9]/.test(forgotNewPassword);
  const checkForgotSpecial = /[@$!%*?&]/.test(forgotNewPassword);

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

    if (!checkForgotLength || !checkForgotUpper || !checkForgotLower || !checkForgotDigit || !checkForgotSpecial) {
      Alert.alert('Security Policy Error', 'Your new password does not meet the safety requirements.');
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
      colors={colors.backgroundGradient}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          {/* Headline and Branding */}
          <Animated.View entering={FadeInUp.delay(200).duration(800)} style={styles.header}>
            <Image 
              source={require('../../../assets/icon.png')} 
              style={styles.logo} 
              contentFit="contain"
            />
            <Text style={[styles.brandSubtitle, { color: colors.primary }]}>TRACK YOUR FITNESS GOALS</Text>
          </Animated.View>

          {/* Login Panel Card (Glassmorphism) */}
          <Animated.View 
            entering={FadeInDown.delay(400).duration(800)} 
            style={[styles.glassCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          >
            <Text style={[styles.cardHeader, { color: colors.text, borderBottomColor: colors.borderSubtle }]}>Log In</Text>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textMuted }]}>EMAIL ADDRESS</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle, color: colors.text }]}
                placeholder="casey@fitpulse.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textMuted }]}>PASSWORD</Text>
              <View style={[styles.passwordInputWrapper, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                <TextInput
                  style={[styles.passwordInput, { color: colors.text }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
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
                    color={colors.textMuted} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.loginButton, { backgroundColor: colors.primary }]} 
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={[styles.loginButtonText, { color: colors.onPrimary }]}>LOG IN</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerLinks}>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')} style={{ marginBottom: 14 }}>
                <Text style={[styles.linkText, { color: colors.textSecondary }]}>CREATE A NEW ACCOUNT</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowForgotModal(true)}>
                <Text style={[styles.linkText, { color: colors.primary, textDecorationLine: 'none' }]}>FORGOT PASSWORD?</Text>
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
          colors={colors.backgroundGradient}
          style={styles.modalContainer}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', padding: 24 }}
          >
            <ScrollView 
              style={{ width: '100%' }}
              contentContainerStyle={styles.modalScroll} 
              keyboardShouldPersistTaps="handled"
            >
              <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Image 
                  source={require('../../../assets/icon.png')} 
                  style={styles.modalLogo} 
                  contentFit="contain" 
                />
                <Text style={[styles.modalTitle, { color: colors.text }]}>PASSWORD RECOVERY</Text>
                
                {forgotStep === 1 ? (
                  <View style={{ alignSelf: 'stretch' }}>
                    <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                      Enter your registered email address to receive an 8-digit security verification OTP code.
                    </Text>
                    <View style={styles.inputContainer}>
                      <Text style={[styles.label, { color: colors.textMuted }]}>EMAIL ADDRESS</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle, color: colors.text }]}
                        placeholder="casey@fitpulse.com"
                        placeholderTextColor={colors.textMuted}
                        value={forgotEmail}
                        onChangeText={setForgotEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                    
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: colors.primary }]} 
                      onPress={handleRequestResetOTP}
                      disabled={forgotLoading}
                    >
                      {forgotLoading ? (
                        <ActivityIndicator color={colors.onPrimary} />
                      ) : (
                        <Text style={[styles.actionButtonText, { color: colors.onPrimary }]}>SEND RESET OTP</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ alignSelf: 'stretch' }}>
                    <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                      Enter the 8-digit OTP code sent to your email and set your new password.
                    </Text>
                    <View style={styles.inputContainer}>
                      <Text style={[styles.label, { color: colors.textMuted }]}>8-DIGIT SECURITY OTP</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle, color: colors.text }]}
                        placeholder="12345678"
                        placeholderTextColor={colors.textMuted}
                        value={forgotOtp}
                        onChangeText={setForgotOtp}
                        keyboardType="number-pad"
                        maxLength={8}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={[styles.label, { color: colors.textMuted }]}>NEW PASSWORD</Text>
                      <View style={[styles.passwordInputWrapper, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                        <TextInput
                          style={[styles.passwordInput, { color: colors.text }]}
                          placeholder="••••••••"
                          placeholderTextColor={colors.textMuted}
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
                            color={colors.textMuted} 
                          />
                        </TouchableOpacity>
                      </View>
                      
                      {/* Password policy checklist */}
                      <View style={styles.policyList}>
                        <View style={styles.policyItem}>
                          <Ionicons 
                            name={checkForgotLength ? "checkmark-circle" : "ellipse-outline"} 
                            size={14} 
                            color={checkForgotLength ? colors.primary : colors.textMuted} 
                          />
                          <Text style={[styles.policyText, { color: checkForgotLength ? colors.text : colors.textMuted }]}>
                            Minimum 8 characters
                          </Text>
                        </View>
                        <View style={styles.policyItem}>
                          <Ionicons 
                            name={checkForgotUpper ? "checkmark-circle" : "ellipse-outline"} 
                            size={14} 
                            color={checkForgotUpper ? colors.primary : colors.textMuted} 
                          />
                          <Text style={[styles.policyText, { color: checkForgotUpper ? colors.text : colors.textMuted }]}>
                            At least one uppercase letter (A-Z)
                          </Text>
                        </View>
                        <View style={styles.policyItem}>
                          <Ionicons 
                            name={checkForgotLower ? "checkmark-circle" : "ellipse-outline"} 
                            size={14} 
                            color={checkForgotLower ? colors.primary : colors.textMuted} 
                          />
                          <Text style={[styles.policyText, { color: checkForgotLower ? colors.text : colors.textMuted }]}>
                            At least one lowercase letter (a-z)
                          </Text>
                        </View>
                        <View style={styles.policyItem}>
                          <Ionicons 
                            name={checkForgotDigit ? "checkmark-circle" : "ellipse-outline"} 
                            size={14} 
                            color={checkForgotDigit ? colors.primary : colors.textMuted} 
                          />
                          <Text style={[styles.policyText, { color: checkForgotDigit ? colors.text : colors.textMuted }]}>
                            At least one number (0-9)
                          </Text>
                        </View>
                        <View style={styles.policyItem}>
                          <Ionicons 
                            name={checkForgotSpecial ? "checkmark-circle" : "ellipse-outline"} 
                            size={14} 
                            color={checkForgotSpecial ? colors.primary : colors.textMuted} 
                          />
                          <Text style={[styles.policyText, { color: checkForgotSpecial ? colors.text : colors.textMuted }]}>
                            Special character (@$!%*?&)
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={[styles.label, { color: colors.textMuted }]}>CONFIRM NEW PASSWORD</Text>
                      <View style={[styles.passwordInputWrapper, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                        <TextInput
                          style={[styles.passwordInput, { color: colors.text }]}
                          placeholder="••••••••"
                          placeholderTextColor={colors.textMuted}
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
                            color={colors.textMuted} 
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: colors.primary }]} 
                      onPress={handleResetPassword}
                      disabled={forgotLoading}
                    >
                      {forgotLoading ? (
                        <ActivityIndicator color={colors.onPrimary} />
                      ) : (
                        <Text style={[styles.actionButtonText, { color: colors.onPrimary }]}>RESET PASSWORD</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity 
                  style={[styles.closeButton, { borderColor: colors.borderSubtle }]} 
                  onPress={() => {
                    setShowForgotModal(false);
                    setForgotStep(1);
                  }}
                >
                  <Text style={[styles.closeButtonText, { color: colors.textMuted }]}>CANCEL</Text>
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
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 20, 36, 0.6)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingRight: 12,
    alignSelf: 'stretch',
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
    padding: 24,
    alignItems: 'center',
    alignSelf: 'center',
  },
  modalTitle: {
    fontFamily: 'Oswald',
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1.5,
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
    paddingHorizontal: 8,
  },
  actionButton: {
    backgroundColor: '#c3f400',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    alignSelf: 'stretch',
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
    alignSelf: 'stretch',
  },
  closeButtonText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 12,
    color: '#94A3B8',
    letterSpacing: 1,
  },
  policyList: {
    marginTop: 8,
    gap: 6,
    alignSelf: 'flex-start',
    width: '100%',
    paddingHorizontal: 4,
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
});
