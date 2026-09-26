import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { Platform } from 'react-native';

import DashboardScreen from '../screens/main/DashboardScreen';
import WorkoutsScreen from '../screens/main/WorkoutsScreen';
import ExerciseLibraryScreen from '../screens/main/workouts/ExerciseLibraryScreen';
import ActiveWorkoutScreen from '../screens/main/workouts/ActiveWorkoutScreen';
import WorkoutHistoryScreen from '../screens/main/workouts/WorkoutHistoryScreen';
import PersonalRecordsScreen from '../screens/main/workouts/PersonalRecordsScreen';
import RoutineBuilderScreen from '../screens/main/workouts/RoutineBuilderScreen';

import NutritionScreen from '../screens/main/NutritionScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import StepsDetailScreen from '../screens/main/dashboard/StepsDetailScreen';
import WaterTrackerScreen from '../screens/main/dashboard/WaterTrackerScreen';
import DigitalWellbeingScreen from '../screens/main/dashboard/DigitalWellbeingScreen';
import HabitsScreen from '../screens/main/dashboard/HabitsScreen';
import EnergyBalanceScreen from '../screens/main/dashboard/EnergyBalanceScreen';
import SleepTrackerScreen from '../screens/main/dashboard/SleepTrackerScreen';
import HeartRateScreen from '../screens/main/dashboard/HeartRateScreen';
import WeightTrackerScreen from '../screens/main/dashboard/WeightTrackerScreen';
import MealShortcutsScreen from '../screens/main/dashboard/MealShortcutsScreen';
import AICoachScreen from '../screens/main/AICoachScreen';
import { useAppTheme } from '../lib/theme';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const WorkoutsStack = createNativeStackNavigator();

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
      <HomeStack.Screen name="Habits" component={HabitsScreen} />
      <HomeStack.Screen name="EnergyBalance" component={EnergyBalanceScreen} />
      <HomeStack.Screen name="SleepTracker" component={SleepTrackerScreen} />
      <HomeStack.Screen name="HeartRate" component={HeartRateScreen} />
      <HomeStack.Screen name="WeightTracker" component={WeightTrackerScreen} />
      <HomeStack.Screen name="MealShortcuts" component={MealShortcutsScreen} />
    </HomeStack.Navigator>
  );
}

function WorkoutsStackNavigator() {
  return (
    <WorkoutsStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <WorkoutsStack.Screen name="WorkoutsHome" component={WorkoutsScreen} />
      <WorkoutsStack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} />
      <WorkoutsStack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
      <WorkoutsStack.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} />
      <WorkoutsStack.Screen name="PersonalRecords" component={PersonalRecordsScreen} />
      <WorkoutsStack.Screen name="RoutineBuilder" component={RoutineBuilderScreen} />
    </WorkoutsStack.Navigator>
  );
}

export default function MainTabs() {
  const { colors, isDark } = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: isDark ? '#c3f400' : '#051424',
        tabBarInactiveTintColor: isDark ? '#64748B' : '#94a3b8',
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopWidth: 1,
          borderTopColor: colors.tabBarBorder,
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
        component={WorkoutsStackNavigator}
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
        name="AICoach"
        component={AICoachScreen}
        options={{
          tabBarLabel: 'AI Coach',
          tabBarIcon: ({ color, size }) => (
            <Feather name="message-square" size={size || 20} color={color} />
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
