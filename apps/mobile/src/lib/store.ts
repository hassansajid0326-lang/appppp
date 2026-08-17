import { create } from 'zustand';

export interface UserProfile {
  id: string;
  name: string | null;
  age: number | null;
  sex: 'male' | 'female' | 'other' | null;
  height_cm: number | null;
  goal_type: 'lose' | 'maintain' | 'gain' | null;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | null;
  units: 'metric' | 'imperial';
  daily_step_goal: number;
}

interface AuthState {
  session: any | null;
  profile: UserProfile | null;
  theme: 'dark' | 'light';
  isAppReady: boolean;
  setSession: (session: any | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setAppReady: (ready: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  theme: 'dark', // Kinetic High-Performance default is dark cockpit styling
  isAppReady: false,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setTheme: (theme) => set({ theme }),
  setAppReady: (isAppReady) => set({ isAppReady }),
  logout: () => set({ session: null, profile: null }),
}));
