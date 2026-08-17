import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function DashboardScreen() {
  return (
    <LinearGradient colors={['#051424', '#0d1c2d']} style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>DASHBOARD</Text>
        <Text style={styles.text}>SYSTEM STATUS // ACTIVE</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontFamily: 'Oswald', fontSize: 28, color: '#ffffff', letterSpacing: 2 },
  text: { fontFamily: 'JetBrains Mono', fontSize: 12, color: '#c3f400', marginTop: 8 },
});
