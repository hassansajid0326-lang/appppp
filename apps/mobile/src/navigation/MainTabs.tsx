import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { Platform } from 'react-native';

import DashboardScreen from '../screens/main/DashboardScreen';
import WorkoutsScreen from '../screens/main/WorkoutsScreen';
import NutritionScreen from '../screens/main/NutritionScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import StepsDetailScreen from '../screens/main/dashboard/StepsDetailScreen';
import WaterTrackerScreen from '../screens/main/dashboard/WaterTrackerScreen';
import DigitalWellbeingScreen from '../screens/main/dashboard/DigitalWellbeingScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator 
      screenOptions={{ 
        headerShown: false, 
        animation: 'slide_from_right' 
      }}
    >
      <HomeStack.Screen name="Dashboard" component={DashboardScreen} />
      <HomeStack.Screen name="StepsDetail" component={StepsDetailScreen} />
      <HomeStack.Screen name="WaterTracker" component={WaterTrackerScreen} />
      <HomeStack.Screen name="DigitalWellbeing" component={DigitalWellbeingScreen} />
    </HomeStack.Navigator>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#c3f400', // Electric Lime
        tabBarInactiveTintColor: '#64748B', // Slate Gray
        tabBarStyle: {
          backgroundColor: '#051424', // Deep Navy background
          borderTopWidth: 1,
          borderTopColor: '#1c2b3c', // Surface container high
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 12,
        },
        tabBarLabelStyle: {
          fontFamily: 'Oswald',
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Feather name="activity" size={size || 20} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Workouts"
        component={WorkoutsScreen}
        options={{
          tabBarLabel: 'Workouts',
          tabBarIcon: ({ color, size }) => (
            <Feather name="shield" size={size || 20} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Nutrition"
        component={NutritionScreen}
        options={{
          tabBarLabel: 'Nutrition',
          tabBarIcon: ({ color, size }) => (
            <Feather name="coffee" size={size || 20} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size || 20} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
