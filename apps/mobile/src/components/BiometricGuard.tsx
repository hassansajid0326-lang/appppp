import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  AppState, 
  AppStateStatus,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

interface BiometricGuardProps {
  children: React.ReactNode;
}

export const BIOMETRIC_STORAGE_KEY = 'fitpulse_biometric_lock_enabled';

export default function BiometricGuard({ children }: BiometricGuardProps) {
  const [isLocked, setIsLocked] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const appState = useRef(AppState.currentState);

  const performBiometricAuth = async () => {
    try {
      setAuthError(null);
      const isEnabled = await SecureStore.getItemAsync(BIOMETRIC_STORAGE_KEY);
      
      if (isEnabled !== 'true') {
        setIsLocked(false);
        setIsChecking(false);
        return;
      }

      // Safe check for native module compilation
      let hasHardware = false;
      let isEnrolled = false;
      try {
        hasHardware = typeof LocalAuthentication?.hasHardwareAsync === 'function' && (await LocalAuthentication.hasHardwareAsync());
        isEnrolled = typeof LocalAuthentication?.isEnrolledAsync === 'function' && (await LocalAuthentication.isEnrolledAsync());
      } catch (nativeErr) {
        console.log('Native biometric module not loaded yet in this binary:', nativeErr);
        setIsLocked(false);
        setIsChecking(false);
        return;
      }

      if (!hasHardware || !isEnrolled) {
        // Biometrics not enrolled on device, unlock gracefully
        setIsLocked(false);
        setIsChecking(false);
        return;
      }

      setIsLocked(true);
      setIsChecking(false);

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock FitPulse Vault',
        fallbackLabel: 'Use Device PIN / Password',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel'
      });

      if (result.success) {
        setIsLocked(false);
        setAuthError(null);
      } else {
        setAuthError(result.error === 'user_cancel' ? 'Authentication cancelled.' : 'Fingerprint did not match.');
      }
    } catch (e: any) {
      console.log('Biometric guard error:', e);
      setIsLocked(false);
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Check on initial app launch
    performBiometricAuth();

    // Listen to background -> active app state changes
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to foreground, re-prompt biometric if enabled
        SecureStore.getItemAsync(BIOMETRIC_STORAGE_KEY).then((val) => {
          if (val === 'true') {
            performBiometricAuth();
          }
        });
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (isChecking) {
    return null; // Brief splash check
  }

  if (isLocked) {
    return (
      <LinearGradient colors={['#051424', '#0d1c2d', '#010f1f']} style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="finger-print" size={56} color="#c3f400" />
          </View>

          <Text style={styles.title}>APP LOCKED</Text>
          <Text style={styles.subtitle}>FITPULSE BIOMETRIC SECURITY</Text>

          <Text style={styles.description}>
            Biometric verification is required to access your workouts, nutrition vault, and profile metrics.
          </Text>

          {authError && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#ff4a4a" />
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          )}

          <TouchableOpacity 
            style={styles.unlockBtn} 
            onPress={performBiometricAuth}
            activeOpacity={0.85}
          >
            <Ionicons name="scan-outline" size={20} color="#051424" />
            <Text style={styles.unlockBtnText}>SCAN FINGERPRINT</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(195, 244, 0, 0.3)',
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(195, 244, 0, 0.1)',
    borderWidth: 2,
    borderColor: '#c3f400',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Oswald',
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  subtitle: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
    letterSpacing: 1,
    marginBottom: 12,
  },
  description: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 74, 74, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 74, 74, 0.3)',
    marginBottom: 16,
  },
  errorText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11,
    color: '#ff4a4a',
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#c3f400',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
  },
  unlockBtnText: {
    fontFamily: 'Oswald',
    fontSize: 14,
    fontWeight: '700',
    color: '#051424',
    letterSpacing: 1,
  },
});
