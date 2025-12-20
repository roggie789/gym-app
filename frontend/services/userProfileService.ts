import { supabase } from '../config/supabase';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  created_at?: string;
}

// Get user profile (username from auth metadata or profiles table)
export async function getUserProfile(userId: string) {
  // First try to get from auth.users metadata
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError) {
    return { data: null, error: authError };
  }

  // Get username from user_profiles table
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  // Use profile username if available, otherwise check users table, then fallback to email
  let username = profile?.username;
  
  if (!username) {
    // Try to get from users table as fallback
    const { data: userRecord } = await supabase
      .from('users')
      .select('username')
      .eq('id', userId)
      .single();
    
    username = userRecord?.username || user?.email?.split('@')[0] || 'User';
    
    // If we found a username in users table but not in profiles, create profile
    if (userRecord?.username && !profile && user?.email) {
      try {
        await supabase.from('user_profiles').upsert({
          id: userId,
          username: userRecord.username,
          email: user.email,
        }, { onConflict: 'id' });
      } catch (err) {
        console.error('Error creating profile from users table:', err);
      }
    }
  }

  return {
    data: {
      id: userId,
      username,
      email: user?.email || '',
      created_at: user?.created_at,
    },
    error: null,
  };
}

// Update username
export async function updateUsername(userId: string, username: string) {
  // Check if username is already taken
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('username', username)
    .neq('id', userId)
    .single();

  if (existing) {
    return { data: null, error: { message: 'Username already taken' } };
  }

  // Update or insert username in user_profiles
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      id: userId,
      username,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  return { data, error };
}

// Create user profile (called after signup)
export async function createUserProfile(userId: string, username: string, email: string) {
  // Use upsert to handle case where profile might already exist
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      id: userId,
      username,
      email,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'id',
    })
    .select()
    .single();

  return { data, error };
}

