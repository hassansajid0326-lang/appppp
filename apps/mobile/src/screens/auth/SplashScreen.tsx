import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME_STORAGE_KEY } from '../../lib/theme';

// Load primary branding logo
const splashLogo = require('../../../assets/icon.png');

export default function SplashScreen({ navigation }: any) {
  const { setSession, setProfile, setAppReady, setTheme } = useAuthStore();

  useEffect(() => {
    // Auth Gating Lifecycle
    const initializeApp = async () => {
      const startTime = Date.now();
      let nextScreen = 'Login';

      try {
        // Restore Theme preference
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setTheme(savedTheme);
        }

        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          setSession(data.session);
          
          // Fetch profile details
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .single();

          if (profile && !error) {
            setProfile(profile);
            nextScreen = 'MainTabs'; // Route straight to dashboard
          } else {
            nextScreen = 'Onboarding'; // User registered but profile not complete
          }
        }
      } catch (e) {
        console.error('App init failed:', e);
      } finally {
        // Enforce the 5-second animated experience
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 5000 - elapsedTime);

        setTimeout(() => {
          setAppReady(true);
          navigation.replace(nextScreen);
        }, remainingTime);
      }
    };

    initializeApp();
  }, []);

  return (
    <LinearGradient
      colors={['#051424', '#0d1c2d', '#010f1f']}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Static Premium Branding Logo */}
        <Animated.View entering={FadeIn.delay(200).duration(1500)} style={styles.logoImageContainer}>
          <Image
            source={splashLogo}
            style={styles.logoImage}
            contentFit="contain"
          />
        </Animated.View>

        {/* Text Logo Overlay */}
        <Animated.View entering={FadeIn.delay(800).duration(1500)} style={styles.logoContainer}>
          <Text style={styles.logoText}>FITPULSE</Text>
          <Text style={styles.subtitle}>TRACK YOUR FITNESS GOALS</Text>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  logoImageContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoContainer: {
    position: 'absolute',
    bottom: -60,
    alignItems: 'center',
  },
  logoText: {
    fontFamily: 'Oswald',
    fontSize: 38,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 5,
    textShadowColor: 'rgba(195, 244, 0, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 15,
  },
  subtitle: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    color: '#64748B',
    marginTop: 8,
    letterSpacing: 1.5,
  },
});
