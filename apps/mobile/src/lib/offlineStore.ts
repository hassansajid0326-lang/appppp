import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import NetInfo from '@react-native-community/netinfo';
import { ExerciseItem, WorkoutTemplate, UNIVERSAL_EXERCISES } from './exerciseDatabase';

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export interface OfflineRoutineItem {
  id: string;
  title: string;
  repeat_rule: 'daily' | 'weekly' | 'custom' | 'monthly';
  repeat_days?: number[];
  reminder_time?: string;
  notification_id?: string;
  active: boolean;
  user_id: string;
}

export interface OfflineRoutineLog {
  id: string;
  routine_item_id: string;
  date: string;
  completed: boolean;
  user_id: string;
}

export interface OfflineActivityLog {
  id: string;
  activity_type: 'walking' | 'driving_or_riding' | 'still';
  started_at: string;
  duration_sec: number;
}

export interface OfflineFoodEntry {
  id: string;
  user_id: string;
  date: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  image_url?: string;
  logged_at: string;
}

export interface OfflineWeightEntry {
  id: string;
  user_id: string;
  weight_kg: number;
  logged_at: string;
}

// Workout System Interfaces
export interface ActiveWorkoutSet {
  set_number: number;
  reps: number;
  weight_kg: number;
  duration_sec?: number;
  completed: boolean;
  rpe?: number;
  previous?: string;
}

export interface ActiveWorkoutExercise {
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  equipment: string;
  sets: ActiveWorkoutSet[];
}

export interface ActiveWorkoutSession {
  id: string;
  name: string;
  started_at: string;
  duration_sec: number;
  exercises: ActiveWorkoutExercise[];
}

export interface CompletedWorkoutSet {
  id: string;
  set_number: number;
  reps: number;
  weight_kg: number;
  duration_sec?: number;
  rpe?: number;
}

export interface CompletedWorkoutExerciseSummary {
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  sets: CompletedWorkoutSet[];
}

export interface CompletedWorkoutSession {
  id: string;
  user_id: string;
  name: string;
  started_at: string;
  completed_at: string;
  duration_sec: number;
  total_volume_kg: number;
  total_sets: number;
  notes?: string;
  exercises: CompletedWorkoutExerciseSummary[];
  pr_count?: number;
}

export interface PersonalRecordItem {
  exercise_id: string;
  exercise_name: string;
  max_weight_kg: number;
  max_reps: number;
  estimated_1rm: number;
  achieved_at: string;
}

interface SyncItem {
  id: string;
  action: 
    | 'add_routine' 
    | 'toggle_routine' 
    | 'delete_routine' 
    | 'add_food' 
    | 'delete_food' 
    | 'add_weight' 
    | 'update_step_goal'
    | 'add_workout'
    | 'delete_workout';
  payload: any;
  timestamp: string;
}

interface OfflineState {
  routineItems: OfflineRoutineItem[];
  routineLogs: OfflineRoutineLog[];
  activityLogs: OfflineActivityLog[];
  foodEntries: OfflineFoodEntry[];
  latestWeightKg: number;
  weightHistory: OfflineWeightEntry[];
  devicePickups: number;
  dailySteps: number;
  lastStepsDate: string;
  syncQueue: SyncItem[];
  
  // Hydration & Fasting State
  waterIntakeMl: number;
  waterGoalMl: number;
  isFasting: boolean;
  fastingStartTime: string | null;
  fastingDurationHours: number;

  // Workouts State
  workoutSessions: CompletedWorkoutSession[];
  activeWorkout: ActiveWorkoutSession | null;
  personalRecords: Record<string, PersonalRecordItem>;
  customTemplates: WorkoutTemplate[];

  // General Actions
  setDailySteps: (steps: number) => void;
  incrementPickups: () => void;
  logActivity: (type: 'walking' | 'driving_or_riding' | 'still', durationSec: number) => void;
  addRoutineItem: (
    userId: string, 
    title: string, 
    repeatRule?: 'daily' | 'weekly' | 'custom' | 'monthly', 
    repeatDays?: number[], 
    reminderTime?: string, 
    notificationId?: string
  ) => Promise<void>;
  toggleRoutineLog: (userId: string, itemId: string, date: string, completed: boolean) => Promise<void>;
  deleteRoutineItem: (userId: string, itemId: string) => Promise<void>;
  
  fetchFoodEntries: (userId: string, date: string) => Promise<void>;
  addFoodEntry: (
    userId: string,
    date: string,
    name: string,
    calories: number,
    protein: number,
    carbs: number,
    fat: number,
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    imageUrl?: string
  ) => Promise<void>;
  deleteFoodEntry: (entryId: string) => Promise<void>;

  addWaterIntake: (ml: number) => void;
  resetWaterIntake: () => void;
  startFasting: (hours?: number) => void;
  stopFasting: () => void;
  
  fetchLatestWeight: (userId: string) => Promise<void>;
  addWeightEntry: (userId: string, weightKg: number) => Promise<void>;
  updateStepsGoalOffline: (userId: string, goal: number) => Promise<void>;

  // Workouts Actions
  startActiveWorkout: (name: string, initialExercises?: ExerciseItem[]) => void;
  loadTemplateIntoActive: (template: WorkoutTemplate) => void;
  updateActiveWorkoutTime: (durationSec: number) => void;
  updateActiveWorkoutSet: (
    exerciseIndex: number, 
    setIndex: number, 
    fields: Partial<ActiveWorkoutSet>
  ) => void;
  addActiveWorkoutSet: (exerciseIndex: number) => void;
  removeActiveWorkoutSet: (exerciseIndex: number, setIndex: number) => void;
  addActiveWorkoutExercise: (exercise: ExerciseItem) => void;
  removeActiveWorkoutExercise: (exerciseIndex: number) => void;
  finishActiveWorkout: (userId: string, notes?: string) => Promise<CompletedWorkoutSession | null>;
  cancelActiveWorkout: () => void;
  deleteWorkoutSession: (userId: string, sessionId: string) => Promise<void>;
  saveCustomTemplate: (template: WorkoutTemplate) => void;
  deleteCustomTemplate: (templateId: string) => void;
  fetchWorkoutHistory: (userId: string) => Promise<void>;

  syncQueueToServer: () => Promise<void>;
  fetchLatestFromServer: (userId: string) => Promise<void>;
  checkDailyReset: () => void;
  clearLocalData: () => void;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      routineItems: [],
      routineLogs: [],
      activityLogs: [],
      foodEntries: [],
      latestWeightKg: 70,
      weightHistory: [],
      devicePickups: 0,
      dailySteps: 0,
      lastStepsDate: '',
      syncQueue: [],

      waterIntakeMl: 1750,
      waterGoalMl: 3500,
      isFasting: false,
      fastingStartTime: null,
      fastingDurationHours: 16,
      
      workoutSessions: [],
      activeWorkout: null,
      personalRecords: {},
      customTemplates: [],

      setDailySteps: (dailySteps) => set({ dailySteps }),

      incrementPickups: () => {
        set((state) => ({ devicePickups: state.devicePickups + 1 }));
      },

      logActivity: (type, durationSec) => {
        const newLog: OfflineActivityLog = {
          id: generateUUID(),
          activity_type: type,
          started_at: new Date().toISOString(),
          duration_sec: durationSec,
        };
        set((state) => ({
          activityLogs: [newLog, ...state.activityLogs].slice(0, 50),
        }));
      },

      checkDailyReset: () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const { lastStepsDate } = get();
        if (lastStepsDate && lastStepsDate !== todayStr) {
          set({
            dailySteps: 0,
            devicePickups: 0,
            activityLogs: [],
            lastStepsDate: todayStr,
          });
        } else if (!lastStepsDate) {
          set({ lastStepsDate: todayStr });
        }
      },

      addRoutineItem: async (userId, title, repeatRule = 'daily', repeatDays, reminderTime, notificationId) => {
        const newItemId = generateUUID();
        const newItem: OfflineRoutineItem = {
          id: newItemId,
          user_id: userId,
          title,
          repeat_rule: repeatRule,
          repeat_days: repeatDays,
          reminder_time: reminderTime,
          notification_id: notificationId,
          active: true,
        };

        set((state) => ({
          routineItems: [...state.routineItems, newItem],
          syncQueue: [
            ...state.syncQueue,
            {
              id: generateUUID(),
              action: 'add_routine',
              payload: newItem,
              timestamp: new Date().toISOString(),
            },
          ],
        }));

        get().syncQueueToServer();
      },

      toggleRoutineLog: async (userId, itemId, date, completed) => {
        const logId = generateUUID();
        const existingLogs = get().routineLogs;
        const index = existingLogs.findIndex(
          (l) => l.routine_item_id === itemId && l.date === date
        );

        let updatedLogs: OfflineRoutineLog[];
        if (index > -1) {
          updatedLogs = [...existingLogs];
          updatedLogs[index] = { ...updatedLogs[index], completed };
        } else {
          updatedLogs = [
            ...existingLogs,
            {
              id: logId,
              routine_item_id: itemId,
              user_id: userId,
              date,
              completed,
            },
          ];
        }

        set((state) => ({
          routineLogs: updatedLogs,
          syncQueue: [
            ...state.syncQueue,
            {
              id: generateUUID(),
              action: 'toggle_routine',
              payload: {
                routine_item_id: itemId,
                user_id: userId,
                date,
                completed,
              },
              timestamp: new Date().toISOString(),
            },
          ],
        }));

        get().syncQueueToServer();
      },

      deleteRoutineItem: async (userId, itemId) => {
        set((state) => ({
          routineItems: state.routineItems.filter((item) => item.id !== itemId),
          syncQueue: [
            ...state.syncQueue,
            {
              id: generateUUID(),
              action: 'delete_routine',
              payload: { id: itemId, user_id: userId },
              timestamp: new Date().toISOString(),
            },
          ],
        }));

        get().syncQueueToServer();
      },

      fetchFoodEntries: async (userId, date) => {
        try {
          const netState = await NetInfo.fetch();
          if (netState.isConnected) {
            const { data, error } = await supabase
              .from('food_entries')
              .select('*')
              .eq('user_id', userId)
              .eq('date', date)
              .order('logged_at', { ascending: true });

            if (!error && data) {
              set({ foodEntries: data });
              return;
            }
          }
        } catch (e) {
          console.log('Error fetching online food entries, using cached state:', e);
        }
      },

      addFoodEntry: async (userId, date, name, calories, protein, carbs, fat, mealType = 'lunch', imageUrl) => {
        const newEntry: OfflineFoodEntry = {
          id: generateUUID(),
          user_id: userId,
          date,
          name,
          calories: Number(calories) || 0,
          protein_g: Number(protein) || 0,
          carbs_g: Number(carbs) || 0,
          fat_g: Number(fat) || 0,
          meal_type: mealType,
          image_url: imageUrl,
          logged_at: new Date().toISOString(),
        };

        set((state) => ({
          foodEntries: [...state.foodEntries, newEntry],
          syncQueue: [
            ...state.syncQueue,
            {
              id: generateUUID(),
              action: 'add_food',
              payload: newEntry,
              timestamp: new Date().toISOString(),
            },
          ],
        }));

        get().syncQueueToServer();
      },

      deleteFoodEntry: async (entryId) => {
        set((state) => ({
          foodEntries: state.foodEntries.filter((f) => f.id !== entryId),
          syncQueue: [
            ...state.syncQueue,
            {
              id: generateUUID(),
              action: 'delete_food',
              payload: { id: entryId },
              timestamp: new Date().toISOString(),
            },
          ],
        }));

        get().syncQueueToServer();
      },

      addWaterIntake: (ml: number) => {
        set((state) => ({
          waterIntakeMl: Math.max(0, state.waterIntakeMl + ml),
        }));
      },

      resetWaterIntake: () => {
        set({ waterIntakeMl: 0 });
      },

      startFasting: (hours = 16) => {
        set({
          isFasting: true,
          fastingStartTime: new Date().toISOString(),
          fastingDurationHours: hours,
        });
      },

      stopFasting: () => {
        set({
          isFasting: false,
          fastingStartTime: null,
        });
      },

      fetchLatestWeight: async (userId) => {
        try {
          const netState = await NetInfo.fetch();
          if (netState.isConnected) {
            const { data, error } = await supabase
              .from('weight_entries')
              .select('*')
              .eq('user_id', userId)
              .order('logged_at', { ascending: false })
              .limit(30);

            if (!error && data && data.length > 0) {
              set({
                latestWeightKg: data[0].weight_kg,
                weightHistory: data,
              });
              return;
            }
          }
        } catch (e) {
          console.log('Error fetching online weight entries:', e);
        }
      },

      addWeightEntry: async (userId, weightKg) => {
        const newWeight: OfflineWeightEntry = {
          id: generateUUID(),
          user_id: userId,
          weight_kg: weightKg,
          logged_at: new Date().toISOString(),
        };

        set((state) => ({
          latestWeightKg: weightKg,
          weightHistory: [newWeight, ...state.weightHistory],
          syncQueue: [
            ...state.syncQueue,
            {
              id: generateUUID(),
              action: 'add_weight',
              payload: newWeight,
              timestamp: new Date().toISOString(),
            },
          ],
        }));

        get().syncQueueToServer();
      },

      updateStepsGoalOffline: async (userId, goal) => {
        set((state) => ({
          syncQueue: [
            ...state.syncQueue,
            {
              id: generateUUID(),
              action: 'update_step_goal',
              payload: { user_id: userId, daily_step_goal: goal },
              timestamp: new Date().toISOString(),
            },
          ],
        }));

        get().syncQueueToServer();
      },

      // ==========================================
      // WORKOUTS STATE MANAGEMENT & METHODS
      // ==========================================
      startActiveWorkout: (name, initialExercises = []) => {
        const exercisesFormatted: ActiveWorkoutExercise[] = initialExercises.map((ex) => {
          // Find past PR or previous log to populate previous badge
          const pr = get().personalRecords[ex.id];
          const previousStr = pr ? `${pr.max_weight_kg}kg × ${pr.max_reps}` : '-';

          return {
            exercise_id: ex.id,
            exercise_name: ex.name,
            muscle_group: ex.muscle_group,
            equipment: ex.equipment,
            sets: [
              { set_number: 1, reps: 10, weight_kg: 20, completed: false, previous: previousStr },
              { set_number: 2, reps: 10, weight_kg: 20, completed: false, previous: previousStr },
              { set_number: 3, reps: 10, weight_kg: 20, completed: false, previous: previousStr },
            ],
          };
        });

        const newSession: ActiveWorkoutSession = {
          id: generateUUID(),
          name: name || 'Custom Workout Session',
          started_at: new Date().toISOString(),
          duration_sec: 0,
          exercises: exercisesFormatted,
        };

        set({ activeWorkout: newSession });
      },

      loadTemplateIntoActive: (template) => {
        const exercisesFormatted: ActiveWorkoutExercise[] = template.exercises.map((tEx) => {
          const matchedEx = UNIVERSAL_EXERCISES.find((e) => e.id === tEx.exercise_id);
          const pr = get().personalRecords[tEx.exercise_id];
          const previousStr = pr ? `${pr.max_weight_kg}kg × ${pr.max_reps}` : '-';
          const setsCount = tEx.target_sets || 3;
          
          let parsedReps = 10;
          if (tEx.target_reps) {
            const firstNum = parseInt(tEx.target_reps.replace(/[^0-9]/g, ''), 10);
            if (!isNaN(firstNum)) parsedReps = firstNum;
          }

          const sets: ActiveWorkoutSet[] = [];
          for (let s = 1; s <= setsCount; s++) {
            sets.push({
              set_number: s,
              reps: parsedReps,
              weight_kg: pr ? Math.round(pr.max_weight_kg * 0.75) : 20,
              completed: false,
              previous: previousStr,
            });
          }

          return {
            exercise_id: tEx.exercise_id,
            exercise_name: tEx.exercise_name,
            muscle_group: tEx.muscle_group,
            equipment: matchedEx?.equipment || 'other',
            sets,
          };
        });

        const newSession: ActiveWorkoutSession = {
          id: generateUUID(),
          name: template.title,
          started_at: new Date().toISOString(),
          duration_sec: 0,
          exercises: exercisesFormatted,
        };

        set({ activeWorkout: newSession });
      },

      updateActiveWorkoutTime: (durationSec) => {
        set((state) => {
          if (!state.activeWorkout) return state;
          return {
            activeWorkout: {
              ...state.activeWorkout,
              duration_sec: durationSec,
            },
          };
        });
      },

      updateActiveWorkoutSet: (exerciseIndex, setIndex, fields) => {
        set((state) => {
          if (!state.activeWorkout) return state;
          const exercises = [...state.activeWorkout.exercises];
          if (!exercises[exerciseIndex]) return state;

          const sets = [...exercises[exerciseIndex].sets];
          if (!sets[setIndex]) return state;

          sets[setIndex] = { ...sets[setIndex], ...fields };
          exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };

          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises,
            },
          };
        });
      },

      addActiveWorkoutSet: (exerciseIndex) => {
        set((state) => {
          if (!state.activeWorkout) return state;
          const exercises = [...state.activeWorkout.exercises];
          if (!exercises[exerciseIndex]) return state;

          const sets = [...exercises[exerciseIndex].sets];
          const lastSet = sets[sets.length - 1];
          const nextSetNumber = sets.length + 1;

          sets.push({
            set_number: nextSetNumber,
            reps: lastSet ? lastSet.reps : 10,
            weight_kg: lastSet ? lastSet.weight_kg : 20,
            completed: false,
            previous: lastSet?.previous || '-',
          });

          exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };

          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises,
            },
          };
        });
      },

      removeActiveWorkoutSet: (exerciseIndex, setIndex) => {
        set((state) => {
          if (!state.activeWorkout) return state;
          const exercises = [...state.activeWorkout.exercises];
          if (!exercises[exerciseIndex]) return state;

          let sets = exercises[exerciseIndex].sets.filter((_, idx) => idx !== setIndex);
          // Re-index set numbers
          sets = sets.map((s, idx) => ({ ...s, set_number: idx + 1 }));

          exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };

          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises,
            },
          };
        });
      },

      addActiveWorkoutExercise: (exercise) => {
        set((state) => {
          if (!state.activeWorkout) return state;
          const pr = state.personalRecords[exercise.id];
          const previousStr = pr ? `${pr.max_weight_kg}kg × ${pr.max_reps}` : '-';

          const newEx: ActiveWorkoutExercise = {
            exercise_id: exercise.id,
            exercise_name: exercise.name,
            muscle_group: exercise.muscle_group,
            equipment: exercise.equipment,
            sets: [
              { set_number: 1, reps: 10, weight_kg: 20, completed: false, previous: previousStr },
              { set_number: 2, reps: 10, weight_kg: 20, completed: false, previous: previousStr },
              { set_number: 3, reps: 10, weight_kg: 20, completed: false, previous: previousStr },
            ],
          };

          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: [...state.activeWorkout.exercises, newEx],
            },
          };
        });
      },

      removeActiveWorkoutExercise: (exerciseIndex) => {
        set((state) => {
          if (!state.activeWorkout) return state;
          const exercises = state.activeWorkout.exercises.filter((_, idx) => idx !== exerciseIndex);
          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises,
            },
          };
        });
      },

      finishActiveWorkout: async (userId, notes = '') => {
        const { activeWorkout, personalRecords } = get();
        if (!activeWorkout) return null;

        let totalVolume = 0;
        let totalSets = 0;
        let newPrCount = 0;
        const updatedPRs = { ...personalRecords };

        const exercisesSummary: CompletedWorkoutExerciseSummary[] = [];

        activeWorkout.exercises.forEach((ex) => {
          const completedSets: CompletedWorkoutSet[] = [];
          
          ex.sets.forEach((st) => {
            if (st.completed || st.reps > 0) {
              const weight = Number(st.weight_kg) || 0;
              const reps = Number(st.reps) || 0;
              totalVolume += weight * reps;
              totalSets += 1;

              // Compute 1RM = Weight * (1 + Reps/30)
              const est1RM = Math.round(weight * (1 + reps / 30));

              // Check if new Personal Record
              const existingPR = updatedPRs[ex.exercise_id];
              if (!existingPR || weight > existingPR.max_weight_kg || (weight === existingPR.max_weight_kg && reps > existingPR.max_reps)) {
                newPrCount += 1;
                updatedPRs[ex.exercise_id] = {
                  exercise_id: ex.exercise_id,
                  exercise_name: ex.exercise_name,
                  max_weight_kg: weight,
                  max_reps: reps,
                  estimated_1rm: est1RM,
                  achieved_at: new Date().toISOString(),
                };
              }

              completedSets.push({
                id: generateUUID(),
                set_number: st.set_number,
                reps,
                weight_kg: weight,
                duration_sec: st.duration_sec,
                rpe: st.rpe,
              });
            }
          });

          if (completedSets.length > 0) {
            exercisesSummary.push({
              exercise_id: ex.exercise_id,
              exercise_name: ex.exercise_name,
              muscle_group: ex.muscle_group,
              sets: completedSets,
            });
          }
        });

        const completedSession: CompletedWorkoutSession = {
          id: activeWorkout.id,
          user_id: userId,
          name: activeWorkout.name,
          started_at: activeWorkout.started_at,
          completed_at: new Date().toISOString(),
          duration_sec: activeWorkout.duration_sec || 1,
          total_volume_kg: totalVolume,
          total_sets: totalSets,
          notes,
          exercises: exercisesSummary,
          pr_count: newPrCount,
        };

        set((state) => ({
          workoutSessions: [completedSession, ...state.workoutSessions],
          personalRecords: updatedPRs,
          activeWorkout: null,
          syncQueue: [
            ...state.syncQueue,
            {
              id: generateUUID(),
              action: 'add_workout',
              payload: completedSession,
              timestamp: new Date().toISOString(),
            },
          ],
        }));

        get().syncQueueToServer();
        return completedSession;
      },

      cancelActiveWorkout: () => {
        set({ activeWorkout: null });
      },

      deleteWorkoutSession: async (userId, sessionId) => {
        set((state) => ({
          workoutSessions: state.workoutSessions.filter((s) => s.id !== sessionId),
          syncQueue: [
            ...state.syncQueue,
            {
              id: generateUUID(),
              action: 'delete_workout',
              payload: { id: sessionId, user_id: userId },
              timestamp: new Date().toISOString(),
            },
          ],
        }));

        get().syncQueueToServer();
      },

      saveCustomTemplate: (template) => {
        set((state) => {
          const existingIdx = state.customTemplates.findIndex((t) => t.id === template.id);
          if (existingIdx > -1) {
            const updated = [...state.customTemplates];
            updated[existingIdx] = template;
            return { customTemplates: updated };
          }
          return { customTemplates: [template, ...state.customTemplates] };
        });
      },

      deleteCustomTemplate: (templateId) => {
        set((state) => ({
          customTemplates: state.customTemplates.filter((t) => t.id !== templateId),
        }));
      },

      fetchWorkoutHistory: async (userId) => {
        try {
          const netState = await NetInfo.fetch();
          if (netState.isConnected) {
            const { data, error } = await supabase
              .from('workout_sessions')
              .select(`
                id,
                user_id,
                started_at,
                completed_at,
                notes,
                created_at,
                workout_sets (
                  id,
                  set_number,
                  reps,
                  weight_kg,
                  duration_sec,
                  order_index,
                  exercise_id
                )
              `)
              .eq('user_id', userId)
              .order('completed_at', { ascending: false })
              .limit(50);

            if (!error && data && data.length > 0) {
              const sessionsFormatted: CompletedWorkoutSession[] = data.map((session: any) => {
                let totalVol = 0;
                let totalSetsCount = 0;

                const exerciseMap: Record<string, CompletedWorkoutSet[]> = {};
                (session.workout_sets || []).forEach((st: any) => {
                  totalVol += (st.weight_kg || 0) * (st.reps || 0);
                  totalSetsCount += 1;

                  if (!exerciseMap[st.exercise_id]) {
                    exerciseMap[st.exercise_id] = [];
                  }
                  exerciseMap[st.exercise_id].push({
                    id: st.id,
                    set_number: st.set_number,
                    reps: st.reps,
                    weight_kg: st.weight_kg,
                    duration_sec: st.duration_sec,
                  });
                });

                const exercises: CompletedWorkoutExerciseSummary[] = Object.keys(exerciseMap).map((exId) => {
                  const matched = UNIVERSAL_EXERCISES.find((e) => e.id === exId);
                  return {
                    exercise_id: exId,
                    exercise_name: matched ? matched.name : 'Custom Exercise',
                    muscle_group: matched ? matched.muscle_group : 'full_body',
                    sets: exerciseMap[exId],
                  };
                });

                const duration = session.completed_at && session.started_at
                  ? Math.max(1, Math.round((new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 1000))
                  : 1800;

                return {
                  id: session.id,
                  user_id: session.user_id,
                  name: session.notes ? session.notes.split(' - ')[0] : 'Workout Session',
                  started_at: session.started_at || session.created_at,
                  completed_at: session.completed_at || session.created_at,
                  duration_sec: duration,
                  total_volume_kg: totalVol,
                  total_sets: totalSetsCount,
                  notes: session.notes,
                  exercises,
                };
              });

              set({ workoutSessions: sessionsFormatted });
            }
          }
        } catch (e) {
          console.log('Error fetching online workout sessions:', e);
        }
      },

      // ==========================================
      // SERVER SYNC QUEUE HANDLER
      // ==========================================
      syncQueueToServer: async () => {
        const netState = await NetInfo.fetch();
        if (!netState.isConnected) return;

        const queue = get().syncQueue;
        if (queue.length === 0) return;

        const processedIds: string[] = [];

        for (const item of queue) {
          try {
            if (item.action === 'add_routine') {
              const { error } = await supabase.from('routine_items').insert(item.payload);
              if (!error) processedIds.push(item.id);
            } else if (item.action === 'toggle_routine') {
              const { routine_item_id, date, completed, user_id } = item.payload;
              const { error } = await supabase.from('routine_logs').upsert(
                {
                  routine_item_id,
                  user_id,
                  date,
                  completed,
                  completed_at: completed ? new Date().toISOString() : null,
                },
                { onConflict: 'routine_item_id, date' }
              );
              if (!error) processedIds.push(item.id);
            } else if (item.action === 'delete_routine') {
              const { id, user_id } = item.payload;
              const { error } = await supabase
                .from('routine_items')
                .delete()
                .eq('id', id)
                .eq('user_id', user_id);
              if (!error) processedIds.push(item.id);
            } else if (item.action === 'add_food') {
              const { error } = await supabase.from('food_entries').insert(item.payload);
              if (!error) processedIds.push(item.id);
            } else if (item.action === 'delete_food') {
              const { error } = await supabase.from('food_entries').delete().eq('id', item.payload.id);
              if (!error) processedIds.push(item.id);
            } else if (item.action === 'add_weight') {
              const { error } = await supabase.from('weight_entries').insert(item.payload);
              if (!error) processedIds.push(item.id);
            } else if (item.action === 'update_step_goal') {
              const { user_id, daily_step_goal } = item.payload;
              const { error } = await supabase
                .from('profiles')
                .update({ daily_step_goal })
                .eq('id', user_id);
              if (!error) processedIds.push(item.id);
            } else if (item.action === 'add_workout') {
              const session: CompletedWorkoutSession = item.payload;
              
              // 1. Insert session record
              const { error: sessionErr } = await supabase.from('workout_sessions').insert({
                id: session.id,
                user_id: session.user_id,
                started_at: session.started_at,
                completed_at: session.completed_at,
                notes: session.name + (session.notes ? ` - ${session.notes}` : ''),
              });

              if (!sessionErr) {
                // 2. Insert sets
                const setsToInsert: any[] = [];
                let orderIdx = 0;
                session.exercises.forEach((ex) => {
                  ex.sets.forEach((st) => {
                    setsToInsert.push({
                      id: st.id,
                      session_id: session.id,
                      exercise_id: ex.exercise_id,
                      user_id: session.user_id,
                      set_number: st.set_number,
                      reps: st.reps,
                      weight_kg: st.weight_kg,
                      duration_sec: st.duration_sec,
                      order_index: orderIdx++,
                    });
                  });
                });

                if (setsToInsert.length > 0) {
                  await supabase.from('workout_sets').insert(setsToInsert);
                }
                processedIds.push(item.id);
              }
            } else if (item.action === 'delete_workout') {
              const { id, user_id } = item.payload;
              const { error } = await supabase
                .from('workout_sessions')
                .delete()
                .eq('id', id)
                .eq('user_id', user_id);
              if (!error) processedIds.push(item.id);
            }
          } catch (err) {
            console.error('Error executing sync item:', item.action, err);
          }
        }

        if (processedIds.length > 0) {
          set((state) => ({
            syncQueue: state.syncQueue.filter((item) => !processedIds.includes(item.id)),
          }));
        }
      },

      fetchLatestFromServer: async (userId) => {
        const netState = await NetInfo.fetch();
        if (!netState.isConnected) return;

        try {
          // Fetch routine items
          const { data: items, error: itemsError } = await supabase
            .from('routine_items')
            .select('*')
            .eq('user_id', userId)
            .eq('active', true);

          if (itemsError) throw itemsError;

          // Fetch routine logs for today
          const todayStr = new Date().toISOString().split('T')[0];
          const { data: logs, error: logsError } = await supabase
            .from('routine_logs')
            .select('*')
            .eq('user_id', userId)
            .eq('date', todayStr);

          if (logsError) throw logsError;

          const localAddedIds = get().syncQueue
            .filter((item) => item.action === 'add_routine')
            .map((item) => item.payload.id);

          const localDeletedIds = get().syncQueue
            .filter((item) => item.action === 'delete_routine')
            .map((item) => item.payload.id);

          const mergedItems = [
            ...(items || [])
              .filter((item) => !localAddedIds.includes(item.id))
              .filter((item) => !localDeletedIds.includes(item.id)),
            ...get().routineItems.filter((item) => localAddedIds.includes(item.id)),
          ];

          const localToggledKeys = get().syncQueue
            .filter((item) => item.action === 'toggle_routine')
            .map((item) => `${item.payload.routine_item_id}_${item.payload.date}`);

          const mergedLogs = [
            ...(logs || []).filter((log) => !localToggledKeys.includes(`${log.routine_item_id}_${log.date}`)),
            ...get().routineLogs.filter((log) => localToggledKeys.includes(`${log.routine_item_id}_${log.date}`)),
          ];

          set({
            routineItems: mergedItems,
            routineLogs: mergedLogs,
          });

          // Fetch latest food, weight, and workouts
          await get().fetchFoodEntries(userId, todayStr);
          await get().fetchLatestWeight(userId);
          await get().fetchWorkoutHistory(userId);
        } catch (err) {
          console.error('Fetch server data failed:', err);
        }
      },

      clearLocalData: () => {
        set({
          routineItems: [],
          routineLogs: [],
          activityLogs: [],
          foodEntries: [],
          latestWeightKg: 70,
          weightHistory: [],
          devicePickups: 0,
          dailySteps: 0,
          lastStepsDate: '',
          syncQueue: [],
          workoutSessions: [],
          activeWorkout: null,
          personalRecords: {},
          customTemplates: [],
        });
      },
    }),
    {
      name: 'fitpulse-offline-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
