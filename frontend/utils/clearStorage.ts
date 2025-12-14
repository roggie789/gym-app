// Utility to clear Supabase auth storage
import AsyncStorage from '@react-native-async-storage/async-storage';

export const clearSupabaseStorage = async () => {
  try {
    // Clear all Supabase-related keys
    const keys = await AsyncStorage.getAllKeys();
    const supabaseKeys = keys.filter(key => 
      key.startsWith('sb-') || 
      key.startsWith('supabase.') ||
      key.includes('supabase')
    );
    
    if (supabaseKeys.length > 0) {
      await AsyncStorage.multiRemove(supabaseKeys);
      console.log('Cleared Supabase storage keys:', supabaseKeys);
    }
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
};

