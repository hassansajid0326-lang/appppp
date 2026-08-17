import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  useFonts,
  Oswald_600SemiBold,
  Oswald_700Bold 
} from '@expo-google-fonts/oswald';
import { 
  Inter_400Regular, 
  Inter_500Medium, 
  Inter_600SemiBold 
} from '@expo-google-fonts/inter';
import { 
  JetBrainsMono_500Medium 
} from '@expo-google-fonts/jetbrains-mono';
import { View, ActivityIndicator } from 'react-native';

import RootNavigator from './src/navigation/RootNavigator';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  // Load custom athletic design fonts
  const [fontsLoaded] = useFonts({
    Oswald: Oswald_600SemiBold,
    OswaldBold: Oswald_700Bold,
    Inter: Inter_400Regular,
    InterMedium: Inter_500Medium,
    InterSemiBold: Inter_600SemiBold,
    'JetBrains Mono': JetBrainsMono_500Medium,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#051424', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#c3f400" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <NavigationContainer>
          <RootNavigator />
          <StatusBar style="light" />
        </NavigationContainer>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
