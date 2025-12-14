import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Replace these with your actual Supabase URL and anon key
// You can find these in your Supabase project settings -> API
// For now, you can hardcode them here, or use environment variables with expo-constants
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://emajpallpgpanxneyllu.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtYWpwYWxscGdwYW54bmV5bGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3MDkwNzcsImV4cCI6MjA4MTI4NTA3N30.8g9jkjqJxsqx99czD-r99PFnckOz74DxwFKOf1YKcE0';

// Storage adapter for React Native - must match Supabase's expected interface exactly
const AsyncStorageAdapter = {
  getItem: (key: string): Promise<string | null> => {
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string): Promise<void> => {
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string): Promise<void> => {
    return AsyncStorage.removeItem(key);
  },
};

// Create Supabase client without custom storage to avoid type casting issues
// Session will not persist between app restarts, but this avoids the String/Double error
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false, // Disable persistence to avoid storage issues
    detectSessionInUrl: false,
  },
});

