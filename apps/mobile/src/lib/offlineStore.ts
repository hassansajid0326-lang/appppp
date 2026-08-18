import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import NetInfo from '@react-native-community/netinfo';

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export interface OfflineRoutineItem {
  id: string;
  title: string;
  repeat_rule: 'daily' | 'weekly' | 'custom';
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
  logged_at: string;
}

export interface OfflineWeightEntry {
  id: string;
  user_id: string;
  weight_kg: number;
  logged_at: string;
}

interface SyncItem {
  id: string;
  action: 'add_routine' | 'toggle_routine' | 'add_food' | 'delete_food' | 'add_weight' | 'update_step_goal';
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
  
  // Actions
  setDailySteps: (steps: number) => void;
  incrementPickups: () => void;
  logActivity: (type: 'walking' | 'driving_or_riding' | 'still', durationSec: number) => void;
  addRoutineItem: (userId: string, title: string) => Promise<void>;
  toggleRoutineLog: (userId: string, itemId: string, date: string, completed: boolean) => Promise<void>;
  
  fetchFoodEntries: (userId: string, date: string) => Promise<void>;
  addFoodEntry: (
    userId: string,
    date: string,
    name: string,
    calories: number,
    protein: number,
    carbs: number,
    fat: number
  ) => Promise<void>;
  deleteFoodEntry: (entryId: string) => Promise<void>;
  
  fetchLatestWeight: (userId: string) => Promise<void>;
  addWeightEntry: (userId: string, weightKg: number) => Promise<void>;
  updateStepsGoalOffline: (userId: string, goal: number) => Promise<void>;
  
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

      setDailySteps: (dailySteps) => set({ dailySteps }),

      checkDailyReset: () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const lastDate = get().lastStepsDate;
        if (lastDate !== todayStr) {
          set({
            dailySteps: 0,
            lastStepsDate: todayStr
          });
        }
      },

      incrementPickups: () => set((state) => ({ devicePickups: state.devicePickups + 1 })),

      logActivity: (type, durationSec) => {
        const newLog: OfflineActivityLog = {
          id: generateUUID(),
          activity_type: type,
          started_at: new Date().toISOString(),
          duration_sec: durationSec,
        };
        set((state) => ({
          activityLogs: [newLog, ...state.activityLogs].slice(0, 100), // Keep last 100 logs
        }));
      },

      addRoutineItem: async (userId, title) => {
        const newItem: OfflineRoutineItem = {
          id: generateUUID(),
          title,
          repeat_rule: 'daily',
          active: true,
          user_id: userId,
        };

        // Update local state instantly
        set((state) => ({
          routineItems: [...state.routineItems, newItem],
        }));

        // Queue sync operation
        const syncPayload = { id: newItem.id, title, user_id: userId };
        const newSync: SyncItem = {
          id: generateUUID(),
          action: 'add_routine',
          payload: syncPayload,
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          syncQueue: [...state.syncQueue, newSync],
        }));

        // Try syncing immediately
        const netState = await NetInfo.fetch();
        if (netState.isConnected) {
          get().syncQueueToServer();
        }
      },

      toggleRoutineLog: async (userId, itemId, date, completed) => {
        const existingLogIndex = get().routineLogs.findIndex(
          (log) => log.routine_item_id === itemId && log.date === date
        );

        let updatedLogs = [...get().routineLogs];
        const now = new Date().toISOString();

        if (existingLogIndex >= 0) {
          updatedLogs[existingLogIndex] = {
            ...updatedLogs[existingLogIndex],
            completed,
          };
        } else {
          updatedLogs.push({
            id: generateUUID(),
            routine_item_id: itemId,
            date,
            completed,
            user_id: userId,
          });
        }

        // Update local state instantly
        set({ routineLogs: updatedLogs });

        // Queue sync operation
        const syncPayload = { routine_item_id: itemId, date, completed, user_id: userId, completed_at: now };
        const newSync: SyncItem = {
          id: generateUUID(),
          action: 'toggle_routine',
          payload: syncPayload,
          timestamp: now,
        };

        set((state) => ({
          syncQueue: [...state.syncQueue, newSync],
        }));

        // Try syncing immediately
        const netState = await NetInfo.fetch();
        if (netState.isConnected) {
          get().syncQueueToServer();
        }
      },

      fetchFoodEntries: async (userId, date) => {
        const netState = await NetInfo.fetch();
        if (!netState.isConnected) return;

        try {
          const { data, error } = await supabase
            .from('food_entries')
            .select('*')
            .eq('user_id', userId)
            .eq('date', date)
            .order('logged_at', { ascending: true });

          if (error) throw error;

          // Merge local syncQueue adds/deletes
          const localDeletes = get().syncQueue
            .filter((item) => item.action === 'delete_food')
            .map((item) => item.payload.id);

          const localAdds = get().syncQueue
            .filter((item) => item.action === 'add_food' && item.payload.date === date)
            .map((item) => item.payload);

          const merged = [
            ...(data || []).filter((item) => !localDeletes.includes(item.id)),
            ...localAdds,
          ].map(item => ({
            id: item.id,
            user_id: item.user_id,
            date: item.date,
            name: item.name,
            calories: parseFloat(item.calories),
            protein_g: parseFloat(item.protein_g || 0),
            carbs_g: parseFloat(item.carbs_g || 0),
            fat_g: parseFloat(item.fat_g || 0),
            logged_at: item.logged_at
          }));

          set({ foodEntries: merged });
        } catch (err) {
          console.error('Fetch food entries failed:', err);
        }
      },

      addFoodEntry: async (userId, date, name, calories, protein, carbs, fat) => {
        const newFood: OfflineFoodEntry = {
          id: generateUUID(),
          user_id: userId,
          date,
          name,
          calories,
          protein_g: protein,
          carbs_g: carbs,
          fat_g: fat,
          logged_at: new Date().toISOString(),
        };

        // Update local state instantly
        set((state) => ({
          foodEntries: [...state.foodEntries, newFood],
        }));

        // Queue sync operation
        const newSync: SyncItem = {
          id: generateUUID(),
          action: 'add_food',
          payload: newFood,
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          syncQueue: [...state.syncQueue, newSync],
        }));

        // Sync immediately if online
        const netState = await NetInfo.fetch();
        if (netState.isConnected) {
          get().syncQueueToServer();
        }
      },

      deleteFoodEntry: async (entryId) => {
        // Update local state instantly
        set((state) => ({
          foodEntries: state.foodEntries.filter((item) => item.id !== entryId),
        }));

        // Queue sync operation
        const newSync: SyncItem = {
          id: generateUUID(),
          action: 'delete_food',
          payload: { id: entryId },
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          syncQueue: [...state.syncQueue, newSync],
        }));

        // Sync immediately if online
        const netState = await NetInfo.fetch();
        if (netState.isConnected) {
          get().syncQueueToServer();
        }
      },

      fetchLatestWeight: async (userId) => {
        const netState = await NetInfo.fetch();
        if (!netState.isConnected) return;

        try {
          const { data, error } = await supabase
            .from('weight_entries')
            .select('*')
            .eq('user_id', userId)
            .order('logged_at', { ascending: false });

          if (error) throw error;

          if (data && data.length > 0) {
            set({
              latestWeightKg: parseFloat(data[0].weight_kg),
              weightHistory: data.map(item => ({
                id: item.id,
                user_id: item.user_id,
                weight_kg: parseFloat(item.weight_kg),
                logged_at: item.logged_at
              })),
            });
          }
        } catch (err) {
          console.error('Fetch weight entries failed:', err);
        }
      },

      addWeightEntry: async (userId, weightKg) => {
        const newWeight: OfflineWeightEntry = {
          id: generateUUID(),
          user_id: userId,
          weight_kg: weightKg,
          logged_at: new Date().toISOString(),
        };

        // Update local state instantly
        set((state) => ({
          latestWeightKg: weightKg,
          weightHistory: [newWeight, ...state.weightHistory],
        }));

        // Queue sync operation
        const newSync: SyncItem = {
          id: generateUUID(),
          action: 'add_weight',
          payload: newWeight,
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          syncQueue: [...state.syncQueue, newSync],
        }));

        // Sync immediately if online
        const netState = await NetInfo.fetch();
        if (netState.isConnected) {
          get().syncQueueToServer();
        }
      },

      updateStepsGoalOffline: async (userId, goal) => {
        // Queue sync operation
        const syncPayload = { userId, goal };
        const newSync: SyncItem = {
          id: generateUUID(),
          action: 'update_step_goal',
          payload: syncPayload,
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          syncQueue: [...state.syncQueue, newSync],
        }));

        // Sync immediately if online
        const netState = await NetInfo.fetch();
        if (netState.isConnected) {
          get().syncQueueToServer();
        }
      },

      syncQueueToServer: async () => {
        const { syncQueue } = get();
        if (syncQueue.length === 0) return;

        const netState = await NetInfo.fetch();
        if (!netState.isConnected) return;

        let processedIds: string[] = [];

        for (const item of syncQueue) {
          try {
            if (item.action === 'add_routine') {
              const { error } = await supabase
                .from('routine_items')
                .upsert({
                  id: item.payload.id,
                  title: item.payload.title,
                  user_id: item.payload.user_id,
                  repeat_rule: 'daily',
                  active: true
                });
              if (error) throw error;
            } else if (item.action === 'toggle_routine') {
              const { error } = await supabase
                .from('routine_logs')
                .upsert({
                  routine_item_id: item.payload.routine_item_id,
                  date: item.payload.date,
                  completed: item.payload.completed,
                  user_id: item.payload.user_id,
                  completed_at: item.payload.completed ? item.payload.completed_at : null
                }, {
                  onConflict: 'routine_item_id,date'
                });
              if (error) throw error;
            } else if (item.action === 'add_food') {
              const { error } = await supabase
                .from('food_entries')
                .upsert({
                  id: item.payload.id,
                  user_id: item.payload.user_id,
                  date: item.payload.date,
                  name: item.payload.name,
                  calories: item.payload.calories,
                  protein_g: item.payload.protein_g,
                  carbs_g: item.payload.carbs_g,
                  fat_g: item.payload.fat_g,
                  logged_at: item.payload.logged_at
                });
              if (error) throw error;
            } else if (item.action === 'delete_food') {
              const { error } = await supabase
                .from('food_entries')
                .delete()
                .eq('id', item.payload.id);
              if (error) throw error;
            } else if (item.action === 'add_weight') {
              const { error } = await supabase
                .from('weight_entries')
                .insert({
                  id: item.payload.id,
                  user_id: item.payload.user_id,
                  weight_kg: item.payload.weight_kg,
                  logged_at: item.payload.logged_at
                });
              if (error) throw error;
            } else if (item.action === 'update_step_goal') {
              const { error } = await supabase
                .from('profiles')
                .update({ daily_step_goal: item.payload.goal })
                .eq('id', item.payload.userId);
              if (error) throw error;
            }
            processedIds.push(item.id);
          } catch (err) {
            console.error(`Sync failed for item ${item.id}:`, err);
            // Halt processing to preserve sequence on error
            break;
          }
        }

        // Filter out successfully processed sync items
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

          // Merge: local sync queue has priority over server data
          const localAddedIds = get().syncQueue
            .filter((item) => item.action === 'add_routine')
            .map((item) => item.payload.id);

          const mergedItems = [
            ...(items || []).filter((item) => !localAddedIds.includes(item.id)),
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

          // Fetch latest food and weight
          await get().fetchFoodEntries(userId, todayStr);
          await get().fetchLatestWeight(userId);
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
        });
      },
    }),
    {
      name: 'fitpulse-offline-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
