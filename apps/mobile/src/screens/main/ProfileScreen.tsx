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
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../lib/store';
import { useOfflineStore } from '../../lib/offlineStore';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import * as LocalAuthentication from 'expo-local-authentication';
import { supabase } from '../../lib/supabase';
import { useAppTheme } from '../../lib/theme';

const API_URL = 'https://appppp-silk.vercel.app';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, session, setProfile, logout } = useAuthStore();
  const { colors, isDark, setTheme } = useAppTheme();
  const { 
    latestWeightKg, 
    weightHistory, 
    addWeightEntry, 
    fetchLatestWeight,
    clearLocalData
  } = useOfflineStore();

  // Active Main Tab: 'fitness' | 'security'
  const [activeTab, setActiveTab] = useState<'fitness' | 'security'>('fitness');

  // Loading States
  const [weightInput, setWeightInput] = useState('');
  const [loggingWeight, setLoggingWeight] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [wipingData, setWipingData] = useState(false);

  // Security preferences
  const [biometricLockEnabled, setBiometricLockEnabled] = useState(false);
  const [testingBiometric, setTestingBiometric] = useState(false);

  // Change Password Modal States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordStep, setPasswordStep] = useState<1 | 2>(1); // 1 = Request OTP, 2 = Verify & Change
  const [passwordOtp, setPasswordOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Change Email Modal States
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailStep, setEmailStep] = useState<1 | 2>(1); // 1 = Enter New Email & Request OTP, 2 = Enter OTP & Update
  const [newEmailInput, setNewEmailInput] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // Password Policy Checks
  const checkLength = newPassword.length >= 8;
  const checkUpper = /[A-Z]/.test(newPassword);
  const checkLower = /[a-z]/.test(newPassword);
  const checkDigit = /[0-9]/.test(newPassword);
  const checkSpecial = /[@$!%*?&]/.test(newPassword);
  const isPasswordPolicyMet = checkLength && checkUpper && checkLower && checkDigit && checkSpecial;

  // Profile Edit fields
  const [name, setName] = useState(profile?.name || '');
  const [age, setAge] = useState(profile?.age ? String(profile.age) : '');
  const [stepGoal, setStepGoal] = useState(profile?.daily_step_goal ? String(profile.daily_step_goal) : '10000');
  const [sex, setSex] = useState<'male' | 'female' | 'other'>(profile?.sex || 'male');
  const [heightVal, setHeightVal] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');

  const userId = session?.user?.id;
  const userEmail = session?.user?.email || 'athlete@fitpulse.internal';
  const currentUnits = profile?.units || 'metric';

  // Load preferences
  useFocusEffect(
    React.useCallback(() => {
      const loadSecurityPrefs = async () => {
        try {
          const bio = await SecureStore.getItemAsync('fitpulse_biometric_lock_enabled');
          setBiometricLockEnabled(bio === 'true');
        } catch (e) {
          console.log('Error loading security prefs:', e);
        }
      };
      loadSecurityPrefs();
    }, [])
  );

  useEffect(() => {
    if (userId) {
      fetchLatestWeight(userId);
    }
  }, [userId]);

  // Sync profile fields
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
    if (profile?.name) setName(profile.name);
    if (profile?.age) setAge(String(profile.age));
    if (profile?.sex) setSex(profile.sex);
    if (profile?.daily_step_goal) setStepGoal(String(profile.daily_step_goal));
  }, [profile, currentUnits]);

  const displayWeight = currentUnits === 'imperial' 
    ? Math.round(latestWeightKg * 2.20462) 
    : latestWeightKg;
  const weightUnitLabel = currentUnits === 'imperial' ? 'lbs' : 'kg';

  // Real native Biometric toggle
  const handleToggleBiometric = async (value: boolean) => {
    try {
      if (!LocalAuthentication || typeof LocalAuthentication.hasHardwareAsync !== 'function') {
        Alert.alert(
          'Rebuild Required',
          'Biometric native module was just installed. Please rebuild the app once using: npx expo run:android to enable hardware fingerprint scanning.'
        );
        return;
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          'Biometric Not Set Up',
          'No enrolled fingerprint or device lock found on this phone. Please register your fingerprint or screen lock in your Android Settings first.'
        );
        return;
      }

      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: value 
          ? 'Confirm fingerprint to activate Biometric App Lock' 
          : 'Confirm fingerprint to disable Biometric App Lock',
        fallbackLabel: 'Use Device PIN / Password',
        cancelLabel: 'Cancel'
      });

      if (authResult.success) {
        setBiometricLockEnabled(value);
        await SecureStore.setItemAsync('fitpulse_biometric_lock_enabled', value ? 'true' : 'false');
        Alert.alert(
          value ? 'Biometric Lock Activated! 🔒' : 'Biometric Lock Disabled',
          value 
            ? 'FitPulse is now protected. Your fingerprint or device PIN will be required whenever you open the app.' 
            : 'App lock has been disabled.'
        );
      } else {
        Alert.alert('Authentication Failed', 'Fingerprint was not recognized. Biometric setting remained unchanged.');
      }
    } catch (e: any) {
      if (e.message?.includes('Cannot find native module') || e.message?.includes('ExpoLocalAuthentication')) {
        Alert.alert(
          'App Rebuild Needed',
          'Native fingerprint module requires rebuilding the Android app once. Please run `npx expo run:android` in your terminal.'
        );
      } else {
        Alert.alert('Security Error', e.message || 'Could not update biometric preference.');
      }
    }
  };

  // Test fingerprint scanner directly
  const handleTestBiometric = async () => {
    setTestingBiometric(true);
    try {
      if (!LocalAuthentication || typeof LocalAuthentication.hasHardwareAsync !== 'function') {
        Alert.alert(
          'Rebuild Required',
          'Biometric native module was just installed. Please rebuild the app once using: npx expo run:android to link native fingerprint libraries.'
        );
        return;
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          'Biometric Not Available',
          'Your device either does not have biometric hardware or no fingerprint is enrolled in Android Settings.'
        );
        return;
      }

      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'FitPulse Fingerprint Diagnostic',
        fallbackLabel: 'Use Device PIN',
        cancelLabel: 'Cancel'
      });

      if (authResult.success) {
        Alert.alert('Fingerprint Verified! ✅', 'Your biometric scanner is fully working and synchronized with FitPulse.');
      } else {
        Alert.alert('Failed ❌', authResult.error === 'user_cancel' ? 'Test cancelled.' : 'Fingerprint did not match.');
      }
    } catch (e: any) {
      if (e.message?.includes('Cannot find native module') || e.message?.includes('ExpoLocalAuthentication')) {
        Alert.alert(
          'App Rebuild Needed',
          'Native fingerprint module was newly added. Please re-run `npx expo run:android` in the terminal to compile native biometric support.'
        );
      } else {
        Alert.alert('Diagnostic Error', e.message || 'Biometric test failed.');
      }
    } finally {
      setTestingBiometric(false);
    }
  };

  // Log weight
  const handleLogWeight = async () => {
    const val = parseFloat(weightInput);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight number.');
      return;
    }

    setLoggingWeight(true);
    try {
      const finalWeightKg = currentUnits === 'imperial' ? val / 2.20462 : val;
      if (userId) {
        await addWeightEntry(userId, parseFloat(finalWeightKg.toFixed(2)));
        setWeightInput('');
        Alert.alert('Weight Saved', 'Your weight log has been updated successfully!');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to log weight.');
    } finally {
      setLoggingWeight(false);
    }
  };

  // Update profile
  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter your name.');
      return;
    }

    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
      Alert.alert('Invalid Age', 'Please enter an age between 1 and 120.');
      return;
    }

    const stepGoalNum = parseInt(stepGoal);
    if (isNaN(stepGoalNum) || stepGoalNum < 1000 || stepGoalNum > 100000) {
      Alert.alert('Invalid Goal', 'Daily step target should be between 1,000 and 100,000.');
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
            sex: sex,
            height_cm: parseFloat(finalHeightCm.toFixed(1)),
            daily_step_goal: stepGoalNum
          })
          .eq('id', userId)
          .select()
          .single();

        if (error) throw error;
        setProfile(data);
        Alert.alert('Profile Saved', 'Your profile details have been updated!');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Toggle Units
  const handleToggleUnits = async () => {
    const nextUnits = currentUnits === 'metric' ? 'imperial' : 'metric';
    
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
      console.log('Failed to toggle units:', e);
    }
  };

  // Change Password flow
  const handleRequestPasswordOtp = async () => {
    setPasswordLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP code.');

      setPasswordStep(2);
      Alert.alert('Security Code Sent', `An 8-digit verification code was sent to ${userEmail}. Please check your inbox and spam folder.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not send verification code.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleVerifyAndResetPassword = async () => {
    if (!passwordOtp || passwordOtp.trim().length !== 8) {
      Alert.alert('Invalid Code', 'Please enter the 8-digit OTP code sent to your email.');
      return;
    }

    if (!isPasswordPolicyMet) {
      Alert.alert('Weak Password', 'New password must meet all security requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New password and confirm password do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const verifyRes = await fetch(`${API_URL}/api/v1/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          otp: passwordOtp.trim(),
          purpose: 'forgot_password'
        })
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || 'Invalid or expired OTP code.');

      const resetRes = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          otp: passwordOtp.trim(),
          newPassword
        })
      });

      const resetData = await resetRes.json();
      if (!resetRes.ok) throw new Error(resetData.error || 'Failed to update password.');

      setShowPasswordModal(false);
      setPasswordOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordStep(1);
      Alert.alert('Password Changed! 🎉', 'Your account password has been updated securely.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to change password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Change Email flow
  const handleRequestEmailChangeOtp = async () => {
    const trimmedNewEmail = newEmailInput.trim().toLowerCase();
    if (!trimmedNewEmail || !trimmedNewEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid new email address.');
      return;
    }

    if (trimmedNewEmail === userEmail.toLowerCase()) {
      Alert.alert('Same Email', 'New email must be different from your current email.');
      return;
    }

    setEmailLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/request-email-change-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentEmail: userEmail,
          newEmail: trimmedNewEmail,
          userId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request email change code.');

      setEmailStep(2);
      Alert.alert('Verification Code Sent', `An 8-digit verification code was sent to your current email (${userEmail}) to confirm this change.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not initiate email change.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleVerifyAndUpdateEmail = async () => {
    if (!emailOtp || emailOtp.trim().length !== 8) {
      Alert.alert('Invalid Code', 'Please enter the 8-digit OTP code sent to your current email.');
      return;
    }

    setEmailLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/change-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentEmail: userEmail,
          newEmail: newEmailInput.trim().toLowerCase(),
          otp: emailOtp.trim(),
          userId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update email address.');

      if (session?.user) {
        session.user.email = newEmailInput.trim().toLowerCase();
      }

      setShowEmailModal(false);
      setNewEmailInput('');
      setEmailOtp('');
      setEmailStep(1);
      Alert.alert('Email Updated! 🎉', `Your account email is now set to ${data.newEmail}.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to verify and update email.');
    } finally {
      setEmailLoading(false);
    }
  };

  // Cryptographic Wipe
  const handleCryptographicWipe = () => {
    Alert.alert(
      '⚠️ Clear All App Data & Sign Out',
      'This will clear your local offline caches, delete stored tokens, and safely sign you out.\n\nAre you sure you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'CLEAR ALL DATA', 
          style: 'destructive',
          onPress: async () => {
            setWipingData(true);
            try {
              clearLocalData();
              await AsyncStorage.clear();
              await SecureStore.deleteItemAsync('fitpulse_biometric_lock_enabled');
              await Notifications.cancelAllScheduledNotificationsAsync();
              await supabase.auth.signOut();
              logout();
            } catch (e: any) {
              logout();
            } finally {
              setWipingData(false);
            }
          }
        }
      ]
    );
  };

  // Sign out
  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out from FitPulse?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              await Notifications.cancelAllScheduledNotificationsAsync();
              logout();
            } catch (e: any) {
              logout();
            }
          }
        }
      ]
    );
  };

  const getInitials = (fullName: string | null) => {
    if (!fullName) return 'FP';
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <LinearGradient colors={colors.backgroundGradient} style={styles.container}>
      <View style={{ paddingTop: Math.max(insets.top + 8, 20), flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          
          {/* Header Row */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>ATHLETE PROFILE</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>ACCOUNT, SETTINGS & SECURITY</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={18} color="#ff4a4a" />
              <Text style={styles.logoutBtnText}>LOGOUT</Text>
            </TouchableOpacity>
          </View>

          {/* User Profile Card */}
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.avatarCircle, { backgroundColor: isDark ? '#051424' : '#f1f5f9', borderColor: isDark ? '#c3f400' : '#65a30d' }]}>
              <Text style={[styles.avatarText, { color: isDark ? '#c3f400' : '#65a30d' }]}>{getInitials(name)}</Text>
            </View>
            <View style={styles.profileDetails}>
              <View style={styles.nameBadgeRow}>
                <Text style={[styles.userName, { color: colors.text }]}>{name || 'Kinetic Athlete'}</Text>
                <View style={[styles.proBadge, { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.15)' : 'rgba(101, 163, 13, 0.15)', borderColor: isDark ? '#c3f400' : '#65a30d' }]}>
                  <Text style={[styles.proBadgeText, { color: isDark ? '#c3f400' : '#65a30d' }]}>PRO</Text>
                </View>
              </View>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{userEmail}</Text>
              <View style={styles.statusChip}>
                <Ionicons name="shield-checkmark" size={12} color={isDark ? '#c3f400' : '#65a30d'} />
                <Text style={[styles.statusChipText, { color: isDark ? '#c3f400' : '#65a30d' }]}>Protected Account</Text>
              </View>
            </View>
          </View>

          {/* Segmented Top Navigation Tabs */}
          <View style={[styles.tabContainer, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
            <TouchableOpacity 
              style={[
                styles.tabButton, 
                activeTab === 'fitness' && [styles.tabButtonActive, { backgroundColor: isDark ? '#c3f400' : '#65a30d' }]
              ]}
              onPress={() => setActiveTab('fitness')}
              activeOpacity={0.85}
            >
              <Ionicons 
                name="body-outline" 
                size={16} 
                color={activeTab === 'fitness' ? (isDark ? '#051424' : '#ffffff') : colors.textMuted} 
              />
              <Text style={[
                styles.tabText, 
                { color: colors.textMuted },
                activeTab === 'fitness' && { color: isDark ? '#051424' : '#ffffff' }
              ]}>
                BODY & FITNESS
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.tabButton, 
                activeTab === 'security' && [styles.tabButtonActive, { backgroundColor: isDark ? '#c3f400' : '#65a30d' }]
              ]}
              onPress={() => setActiveTab('security')}
              activeOpacity={0.85}
            >
              <Ionicons 
                name="lock-closed-outline" 
                size={16} 
                color={activeTab === 'security' ? (isDark ? '#051424' : '#ffffff') : colors.textMuted} 
              />
              <Text style={[
                styles.tabText, 
                { color: colors.textMuted },
                activeTab === 'security' && { color: isDark ? '#051424' : '#ffffff' }
              ]}>
                SECURITY & ACCOUNT
              </Text>
            </TouchableOpacity>
          </View>

          {/* ========================================================= */}
          {/* TAB 1: BODY & FITNESS TAB */}
          {/* ========================================================= */}
          {activeTab === 'fitness' && (
            <View>
              {/* Appearance & Theme Card */}
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name={isDark ? "moon-outline" : "sunny-outline"} size={16} color={isDark ? "#c3f400" : "#65a30d"} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Appearance & Theme</Text>
                </View>
                <View style={[styles.unitToggleRow, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                  <TouchableOpacity 
                    style={[
                      styles.unitTab, 
                      isDark && [styles.unitTabActive, { backgroundColor: '#c3f400' }]
                    ]}
                    onPress={() => setTheme('dark')}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="moon" size={14} color={isDark ? '#051424' : colors.textMuted} />
                      <Text style={[styles.unitTabText, { color: isDark ? '#051424' : colors.textMuted }]}>
                        DARK COCKPIT
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.unitTab, 
                      !isDark && [styles.unitTabActive, { backgroundColor: '#65a30d' }]
                    ]}
                    onPress={() => setTheme('light')}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="sunny" size={14} color={!isDark ? '#ffffff' : colors.textMuted} />
                      <Text style={[styles.unitTabText, { color: !isDark ? '#ffffff' : colors.textMuted }]}>
                        LIGHT KINETIC
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Unit System */}
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="swap-horizontal" size={16} color={isDark ? "#c3f400" : "#65a30d"} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Unit Preferences</Text>
                </View>
                <View style={[styles.unitToggleRow, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                  <TouchableOpacity 
                    style={[
                      styles.unitTab, 
                      currentUnits === 'metric' && [styles.unitTabActive, { backgroundColor: isDark ? '#c3f400' : '#65a30d' }]
                    ]}
                    onPress={() => currentUnits === 'imperial' && handleToggleUnits()}
                  >
                    <Text style={[
                      styles.unitTabText, 
                      { color: colors.textMuted },
                      currentUnits === 'metric' && { color: isDark ? '#051424' : '#ffffff' }
                    ]}>
                      METRIC (KG, CM)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.unitTab, 
                      currentUnits === 'imperial' && [styles.unitTabActive, { backgroundColor: isDark ? '#c3f400' : '#65a30d' }]
                    ]}
                    onPress={() => currentUnits === 'metric' && handleToggleUnits()}
                  >
                    <Text style={[
                      styles.unitTabText, 
                      { color: colors.textMuted },
                      currentUnits === 'imperial' && { color: isDark ? '#051424' : '#ffffff' }
                    ]}>
                      IMPERIAL (LBS, FT/IN)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Personal Details */}
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="person-outline" size={16} color={isDark ? "#c3f400" : "#65a30d"} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Personal Info & Biometrics</Text>
                </View>

                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>FULL NAME</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle, color: colors.text }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your Name"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>BIOLOGICAL SEX</Text>
                <View style={styles.sexSelectorRow}>
                  {(['male', 'female', 'other'] as const).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.sexButton, 
                        { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle },
                        sex === s && [styles.sexButtonActive, { backgroundColor: isDark ? '#c3f400' : '#65a30d', borderColor: isDark ? '#c3f400' : '#65a30d' }]
                      ]}
                      onPress={() => setSex(s)}
                    >
                      <Ionicons 
                        name={s === 'male' ? 'male-outline' : s === 'female' ? 'female-outline' : 'ellipse-outline'} 
                        size={14} 
                        color={sex === s ? (isDark ? '#051424' : '#ffffff') : colors.textMuted} 
                      />
                      <Text style={[
                        styles.sexButtonText, 
                        { color: colors.textMuted },
                        sex === s && { color: isDark ? '#051424' : '#ffffff' }
                      ]}>
                        {s.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldHalf}>
                    <Text style={[styles.inputLabel, { color: colors.textMuted }]}>AGE (YEARS)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle, color: colors.text }]}
                      value={age}
                      onChangeText={setAge}
                      keyboardType="numeric"
                      placeholder="e.g. 24"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  <View style={styles.fieldHalf}>
                    <Text style={[styles.inputLabel, { color: colors.textMuted }]}>HEIGHT ({currentUnits === 'imperial' ? 'ft/in' : 'cm'})</Text>
                    {currentUnits === 'imperial' ? (
                      <View style={styles.heightFtInRow}>
                        <TextInput
                          style={[styles.input, { flex: 1, marginRight: 6, backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle, color: colors.text }]}
                          value={heightFeet}
                          onChangeText={setHeightFeet}
                          keyboardType="numeric"
                          placeholder="ft"
                          placeholderTextColor={colors.textMuted}
                        />
                        <TextInput
                          style={[styles.input, { flex: 1, backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle, color: colors.text }]}
                          value={heightInches}
                          onChangeText={setHeightInches}
                          keyboardType="numeric"
                          placeholder="in"
                          placeholderTextColor={colors.textMuted}
                        />
                      </View>
                    ) : (
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle, color: colors.text }]}
                        value={heightVal}
                        onChangeText={setHeightVal}
                        keyboardType="numeric"
                        placeholder="cm"
                        placeholderTextColor={colors.textMuted}
                      />
                    )}
                  </View>
                </View>

                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>DAILY STEP GOAL</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle, color: colors.text }]}
                  value={stepGoal}
                  onChangeText={setStepGoal}
                  keyboardType="numeric"
                  placeholder="10000"
                  placeholderTextColor={colors.textMuted}
                />

                <TouchableOpacity 
                  style={[styles.primaryButton, { backgroundColor: isDark ? '#c3f400' : '#65a30d' }]} 
                  onPress={handleUpdateProfile}
                  disabled={updatingProfile}
                  activeOpacity={0.85}
                >
                  {updatingProfile ? (
                    <ActivityIndicator size="small" color={isDark ? "#051424" : "#ffffff"} />
                  ) : (
                    <View style={styles.btnRow}>
                      <Ionicons name="checkmark-circle-outline" size={16} color={isDark ? "#051424" : "#ffffff"} />
                      <Text style={[styles.primaryButtonText, { color: isDark ? "#051424" : "#ffffff" }]}>SAVE PROFILE</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Weight Logger */}
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="scale-outline" size={16} color={isDark ? "#c3f400" : "#65a30d"} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Weight Tracker</Text>
                </View>

                <View style={[styles.weightBanner, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                  <View>
                    <Text style={[styles.weightBannerSub, { color: colors.textMuted }]}>CURRENT WEIGHT</Text>
                    <Text style={[styles.weightBannerMain, { color: colors.text }]}>{displayWeight} <Text style={{ fontSize: 16, color: isDark ? '#c3f400' : '#65a30d' }}>{weightUnitLabel}</Text></Text>
                  </View>
                  <View style={[styles.weightBadge, { backgroundColor: isDark ? 'rgba(195, 244, 0, 0.1)' : 'rgba(101, 163, 13, 0.12)' }]}>
                    <Ionicons name="trending-down-outline" size={22} color={isDark ? "#c3f400" : "#65a30d"} />
                  </View>
                </View>

                <View style={styles.weightInputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle, color: colors.text }]}
                    placeholder={`Enter weight (${weightUnitLabel})`}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={weightInput}
                    onChangeText={setWeightInput}
                  />
                  <TouchableOpacity 
                    style={[styles.logWeightBtn, { backgroundColor: isDark ? '#c3f400' : '#65a30d' }]} 
                    onPress={handleLogWeight}
                    disabled={loggingWeight}
                  >
                    {loggingWeight ? (
                      <ActivityIndicator size="small" color={isDark ? "#051424" : "#ffffff"} />
                    ) : (
                      <Text style={[styles.logWeightBtnText, { color: isDark ? "#051424" : "#ffffff" }]}>LOG</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Weight History list */}
                {weightHistory.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.inputLabel, { color: colors.textMuted, marginBottom: 6 }]}>RECENT ENTRIES</Text>
                    {weightHistory.slice(0, 3).map((item) => {
                      const displayVal = currentUnits === 'imperial'
                        ? Math.round(item.weight_kg * 2.20462)
                        : item.weight_kg;
                      const dateLabel = new Date(item.logged_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      });
                      return (
                        <View key={item.id} style={[styles.historyRow, { borderBottomColor: colors.borderSubtle }]}>
                          <Text style={[styles.historyDateText, { color: colors.textMuted }]}>{dateLabel}</Text>
                          <Text style={[styles.historyWeightText, { color: colors.text }]}>{displayVal} {weightUnitLabel}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ========================================================= */}
          {/* TAB 2: SECURITY & ACCOUNT TAB (WITH OTP PASSWORD & EMAIL) */}
          {/* ========================================================= */}
          {activeTab === 'security' && (
            <View>
              {/* Account Credentials Card */}
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="key-outline" size={16} color={isDark ? "#c3f400" : "#65a30d"} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Login & Credentials</Text>
                </View>

                {/* Change Password Button */}
                <TouchableOpacity 
                  style={[styles.actionRow, { borderBottomColor: colors.borderSubtle }]}
                  onPress={() => {
                    setPasswordStep(1);
                    setPasswordOtp('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setShowPasswordModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionLeft}>
                    <View style={[styles.actionIconBox, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                      <Ionicons name="lock-closed" size={16} color={isDark ? "#c3f400" : "#65a30d"} />
                    </View>
                    <View>
                      <Text style={[styles.actionTitle, { color: colors.text }]}>Change Password</Text>
                      <Text style={[styles.actionSub, { color: colors.textMuted }]}>Requires 8-digit email OTP verification</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>

                {/* Change Email Button */}
                <TouchableOpacity 
                  style={[styles.actionRow, { borderBottomWidth: 0 }]}
                  onPress={() => {
                    setEmailStep(1);
                    setNewEmailInput('');
                    setEmailOtp('');
                    setShowEmailModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.actionLeft}>
                    <View style={[styles.actionIconBox, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                      <Ionicons name="mail" size={16} color="#38bdf8" />
                    </View>
                    <View>
                      <Text style={[styles.actionTitle, { color: colors.text }]}>Change Email Address</Text>
                      <Text style={[styles.actionSub, { color: colors.textMuted }]}>Current: {userEmail}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Device Security & App Lock */}
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={isDark ? "#c3f400" : "#65a30d"} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Device Protection & Biometrics</Text>
                </View>

                <View style={styles.toggleRow}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={[styles.toggleTitle, { color: colors.text }]}>Biometric App Lock</Text>
                    <Text style={[styles.toggleSub, { color: colors.textMuted }]}>Require Fingerprint / PIN to unlock FitPulse</Text>
                  </View>
                  <Switch
                    trackColor={{ false: colors.cardSubtle, true: isDark ? '#c3f400' : '#65a30d' }}
                    thumbColor={biometricLockEnabled ? (isDark ? '#051424' : '#ffffff') : colors.textMuted}
                    onValueChange={handleToggleBiometric}
                    value={biometricLockEnabled}
                  />
                </View>

                {/* Fingerprint Test Button */}
                <TouchableOpacity 
                  style={[styles.testBioBtn, { backgroundColor: isDark ? '#c3f400' : '#65a30d' }]}
                  onPress={handleTestBiometric}
                  disabled={testingBiometric}
                  activeOpacity={0.8}
                >
                  {testingBiometric ? (
                    <ActivityIndicator size="small" color={isDark ? "#051424" : "#ffffff"} />
                  ) : (
                    <View style={styles.btnRow}>
                      <Ionicons name="finger-print" size={16} color={isDark ? "#051424" : "#ffffff"} />
                      <Text style={[styles.testBioBtnText, { color: isDark ? "#051424" : "#ffffff" }]}>TEST FINGERPRINT SCANNER</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Encryption Status */}
                <View style={[styles.securityStatusBox, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                  <View style={styles.securityStatusRow}>
                    <Ionicons name="shield-outline" size={14} color="#38bdf8" />
                    <Text style={[styles.securityStatusText, { color: colors.textSecondary }]}>Hardware Key Storage: AES-256 Encrypted</Text>
                  </View>
                  <View style={styles.securityStatusRow}>
                    <Ionicons name="cloud-offline-outline" size={14} color={isDark ? "#c3f400" : "#65a30d"} />
                    <Text style={[styles.securityStatusText, { color: colors.textSecondary }]}>Offline-First Local Vault (SQLite Isolated)</Text>
                  </View>
                </View>
              </View>

              {/* Account Storage & Reset */}
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="trash-outline" size={16} color="#ff4a4a" />
                  <Text style={[styles.cardTitle, { color: '#ff4a4a' }]}>Account Storage & Reset</Text>
                </View>

                <Text style={[styles.privacyDescription, { color: colors.textSecondary }]}>
                  Wipe offline cached workout sets, nutrition logs, and local auth keys if you want a complete clean reset.
                </Text>

                <TouchableOpacity 
                  style={styles.wipeBtn}
                  onPress={handleCryptographicWipe}
                  disabled={wipingData}
                  activeOpacity={0.8}
                >
                  {wipingData ? (
                    <ActivityIndicator size="small" color="#ff4a4a" />
                  ) : (
                    <View style={styles.btnRow}>
                      <Ionicons name="trash-bin-outline" size={16} color="#ff4a4a" />
                      <Text style={styles.wipeBtnText}>CLEAR ALL APP DATA & SIGN OUT</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Version text */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>FitPulse Kinetic Pro • Version 2.4.0</Text>
          </View>

        </ScrollView>
      </View>

      {/* ========================================================================= */}
      {/* MODAL 1: CHANGE PASSWORD (OTP VERIFICATION) */}
      {/* ========================================================================= */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="lock-closed" size={18} color={isDark ? "#c3f400" : "#65a30d"} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Change Password</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {passwordStep === 1 ? (
              <View>
                <Text style={[styles.modalBodyText, { color: colors.textSecondary }]}>
                  To protect your account, we will send an 8-digit verification security key to your email:
                </Text>
                <View style={[styles.emailDisplayBox, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                  <Text style={[styles.emailDisplayText, { color: isDark ? '#c3f400' : '#65a30d' }]}>{userEmail}</Text>
                </View>

                <TouchableOpacity 
                  style={[styles.primaryButton, { backgroundColor: isDark ? '#c3f400' : '#65a30d' }]}
                  onPress={handleRequestPasswordOtp}
                  disabled={passwordLoading}
                >
                  {passwordLoading ? (
                    <ActivityIndicator size="small" color={isDark ? "#051424" : "#ffffff"} />
                  ) : (
                    <Text style={[styles.primaryButtonText, { color: isDark ? "#051424" : "#ffffff" }]}>SEND VERIFICATION CODE</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={[styles.modalBodyText, { color: colors.textSecondary }]}>
                  Enter the 8-digit OTP sent to <Text style={{ color: isDark ? '#c3f400' : '#65a30d', fontWeight: 'bold' }}>{userEmail}</Text> and enter your new password:
                </Text>

                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>8-DIGIT SECURITY CODE</Text>
                <TextInput
                  style={[styles.input, styles.otpInput, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle, color: isDark ? '#c3f400' : '#65a30d' }]}
                  value={passwordOtp}
                  onChangeText={setPasswordOtp}
                  keyboardType="numeric"
                  maxLength={8}
                  placeholder="12345678"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>NEW PASSWORD</Text>
                <View style={[styles.passwordInputContainer, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0, borderWidth: 0, color: colors.text }]}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    placeholder="Enter new password"
                    placeholderTextColor={colors.textMuted}
                  />
                  <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={{ padding: 10 }}>
                    <Ionicons name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Password Policy Indicators */}
                <View style={[styles.policyBox, { backgroundColor: colors.cardSubtle }]}>
                  <Text style={[styles.policyText, { color: colors.textMuted }, checkLength && [styles.policyMet, { color: isDark ? '#c3f400' : '#65a30d' }]]}>• 8+ Characters</Text>
                  <Text style={[styles.policyText, { color: colors.textMuted }, checkUpper && [styles.policyMet, { color: isDark ? '#c3f400' : '#65a30d' }]]}>• Uppercase (A-Z)</Text>
                  <Text style={[styles.policyText, { color: colors.textMuted }, checkLower && [styles.policyMet, { color: isDark ? '#c3f400' : '#65a30d' }]]}>• Lowercase (a-z)</Text>
                  <Text style={[styles.policyText, { color: colors.textMuted }, checkDigit && [styles.policyMet, { color: isDark ? '#c3f400' : '#65a30d' }]]}>• Number (0-9)</Text>
                  <Text style={[styles.policyText, { color: colors.textMuted }, checkSpecial && [styles.policyMet, { color: isDark ? '#c3f400' : '#65a30d' }]]}>• Special (@$!%*?&)</Text>
                </View>

                <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 8 }]}>CONFIRM NEW PASSWORD</Text>
                <View style={[styles.passwordInputContainer, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle }]}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0, borderWidth: 0, color: colors.text }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    placeholder="Re-type new password"
                    placeholderTextColor={colors.textMuted}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 10 }}>
                    <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={[styles.primaryButton, { backgroundColor: isDark ? '#c3f400' : '#65a30d', marginTop: 14 }]}
                  onPress={handleVerifyAndResetPassword}
                  disabled={passwordLoading}
                >
                  {passwordLoading ? (
                    <ActivityIndicator size="small" color={isDark ? "#051424" : "#ffffff"} />
                  ) : (
                    <Text style={[styles.primaryButtonText, { color: isDark ? "#051424" : "#ffffff" }]}>VERIFY & UPDATE PASSWORD</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{ alignItems: 'center', marginTop: 10 }}
                  onPress={() => setPasswordStep(1)}
                >
                  <Text style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: colors.textMuted }}>← Resend Code</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: CHANGE EMAIL (OTP VERIFICATION) */}
      {/* ========================================================================= */}
      <Modal
        visible={showEmailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEmailModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="mail" size={18} color="#38bdf8" />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Change Email Address</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEmailModal(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {emailStep === 1 ? (
              <View>
                <Text style={[styles.modalBodyText, { color: colors.textSecondary }]}>
                  Current email: <Text style={{ color: colors.text, fontWeight: 'bold' }}>{userEmail}</Text>
                </Text>
                <Text style={[styles.modalBodyText, { color: colors.textSecondary, marginTop: 4 }]}>
                  Enter your new email address below. We will send a security verification key to authorize the change:
                </Text>

                <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 10 }]}>NEW EMAIL ADDRESS</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle, color: colors.text }]}
                  value={newEmailInput}
                  onChangeText={setNewEmailInput}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="newemail@example.com"
                  placeholderTextColor={colors.textMuted}
                />

                <TouchableOpacity 
                  style={[styles.primaryButton, { backgroundColor: isDark ? '#c3f400' : '#65a30d' }]}
                  onPress={handleRequestEmailChangeOtp}
                  disabled={emailLoading}
                >
                  {emailLoading ? (
                    <ActivityIndicator size="small" color={isDark ? "#051424" : "#ffffff"} />
                  ) : (
                    <Text style={[styles.primaryButtonText, { color: isDark ? "#051424" : "#ffffff" }]}>SEND VERIFICATION CODE</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={[styles.modalBodyText, { color: colors.textSecondary }]}>
                  An 8-digit code has been sent to your current email <Text style={{ color: isDark ? '#c3f400' : '#65a30d', fontWeight: 'bold' }}>{userEmail}</Text>.
                </Text>
                <Text style={[styles.modalBodyText, { color: colors.textSecondary, marginTop: 4 }]}>
                  Enter the code below to finalize changing your email to <Text style={{ color: '#38bdf8', fontWeight: 'bold' }}>{newEmailInput}</Text>:
                </Text>

                <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 12 }]}>8-DIGIT SECURITY CODE</Text>
                <TextInput
                  style={[styles.input, styles.otpInput, { backgroundColor: colors.cardSubtle, borderColor: colors.borderSubtle, color: isDark ? '#c3f400' : '#65a30d' }]}
                  value={emailOtp}
                  onChangeText={setEmailOtp}
                  keyboardType="numeric"
                  maxLength={8}
                  placeholder="12345678"
                  placeholderTextColor={colors.textMuted}
                />

                <TouchableOpacity 
                  style={[styles.primaryButton, { backgroundColor: isDark ? '#c3f400' : '#65a30d' }]}
                  onPress={handleVerifyAndUpdateEmail}
                  disabled={emailLoading}
                >
                  {emailLoading ? (
                    <ActivityIndicator size="small" color={isDark ? "#051424" : "#ffffff"} />
                  ) : (
                    <Text style={[styles.primaryButtonText, { color: isDark ? "#051424" : "#ffffff" }]}>CONFIRM & UPDATE EMAIL</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{ alignItems: 'center', marginTop: 12 }}
                  onPress={() => setEmailStep(1)}
                >
                  <Text style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: colors.textMuted }}>← Change New Email</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: 'Oswald',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  subtitle: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 74, 74, 0.12)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 74, 74, 0.3)',
  },
  logoutBtnText: {
    fontFamily: 'Oswald',
    fontSize: 11,
    fontWeight: '700',
    color: '#ff4a4a',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
    gap: 12,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: 'Oswald',
    fontSize: 20,
    fontWeight: '700',
  },
  profileDetails: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userName: {
    fontFamily: 'Oswald',
    fontSize: 17,
    fontWeight: '700',
  },
  proBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  proBadgeText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 8,
    fontWeight: 'bold',
  },
  userEmail: {
    fontFamily: 'Inter',
    fontSize: 11,
    marginTop: 2,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  statusChipText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    marginBottom: 14,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabButtonActive: {},
  tabText: {
    fontFamily: 'Oswald',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  unitToggleRow: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
  },
  unitTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  unitTabActive: {},
  unitTabText: {
    fontFamily: 'Oswald',
    fontSize: 11,
    fontWeight: '700',
  },
  inputLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 5,
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    fontFamily: 'Inter',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
  },
  otpInput: {
    fontFamily: 'JetBrains Mono',
    fontSize: 18,
    letterSpacing: 4,
    textAlign: 'center',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
  },
  sexSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  sexButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  sexButtonActive: {},
  sexButtonText: {
    fontFamily: 'Oswald',
    fontSize: 11,
    fontWeight: '700',
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldHalf: {
    flex: 1,
  },
  heightFtInRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryButton: {
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  primaryButtonText: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  weightBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
  },
  weightBannerSub: {
    fontFamily: 'JetBrains Mono',
    fontSize: 8,
    fontWeight: 'bold',
  },
  weightBannerMain: {
    fontFamily: 'Oswald',
    fontSize: 22,
    fontWeight: '700',
  },
  weightBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logWeightBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logWeightBtnText: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  historyDateText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
  },
  historyWeightText: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  actionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitle: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
  },
  actionSub: {
    fontFamily: 'Inter',
    fontSize: 10,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  toggleTitle: {
    fontFamily: 'Oswald',
    fontSize: 13,
    fontWeight: '700',
  },
  toggleSub: {
    fontFamily: 'Inter',
    fontSize: 10,
    marginTop: 2,
  },
  securityStatusBox: {
    borderRadius: 8,
    padding: 10,
    gap: 6,
    marginTop: 10,
    borderWidth: 1,
  },
  securityStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  securityStatusText: {
    fontFamily: 'Inter',
    fontSize: 10,
  },
  privacyDescription: {
    fontFamily: 'Inter',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  testBioBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  testBioBtnText: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  wipeBtn: {
    backgroundColor: 'rgba(255, 74, 74, 0.12)',
    borderWidth: 1,
    borderColor: '#ff4a4a',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  wipeBtnText: {
    fontFamily: 'Oswald',
    fontSize: 12,
    fontWeight: '700',
    color: '#ff4a4a',
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  footerText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  modalTitle: {
    fontFamily: 'Oswald',
    fontSize: 16,
    fontWeight: '700',
  },
  modalBodyText: {
    fontFamily: 'Inter',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  emailDisplayBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  emailDisplayText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 13,
    fontWeight: 'bold',
  },
  policyBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  policyText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
  },
  policyMet: {
    fontWeight: 'bold',
  },
});

