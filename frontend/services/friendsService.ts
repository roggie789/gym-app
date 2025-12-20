import { supabase } from '../config/supabase';

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  requested_by: string;
  created_at: string;
  friend_username?: string;
  friend_email?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  level?: number;
  total_points?: number;
}

// Search users by username
export async function searchUsers(query: string, currentUserId: string) {
  if (!query.trim()) {
    return { data: [], error: null };
  }

  try {
    // First try searching user_profiles
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, username, email')
      .ilike('username', `%${query}%`)
      .neq('id', currentUserId)
      .limit(20);

    if (profileError) {
      console.error('Search user_profiles error:', profileError);
      // If RLS or table doesn't exist, try alternative approach
      // Fallback: search in users table if available
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username, email')
        .ilike('username', `%${query}%`)
        .neq('id', currentUserId)
        .limit(20);

      if (usersError) {
        console.error('Search users table error:', usersError);
        return { data: [], error: usersError };
      }

      // Map users table results to UserProfile format
      const mappedData = (usersData || []).map((user: any) => ({
        id: user.id,
        username: user.username || user.email?.split('@')[0] || 'user',
        email: user.email || '',
      }));

      return { data: mappedData, error: null };
    }

    return { data: profileData || [], error: null };
  } catch (err) {
    console.error('Search users exception:', err);
    return { data: [], error: err as any };
  }
}

// Send friend request
export async function sendFriendRequest(userId: string, friendId: string) {
  // Check if friendship already exists
  const { data: existing } = await supabase
    .from('friends')
    .select('*')
    .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
    .single();

  if (existing) {
    return { data: null, error: { message: 'Friendship already exists or request pending' } };
  }

  const { data, error } = await supabase
    .from('friends')
    .insert({
      user_id: userId,
      friend_id: friendId,
      requested_by: userId,
      status: 'pending',
    })
    .select()
    .single();

  return { data, error };
}

// Accept friend request
export async function acceptFriendRequest(friendshipId: string) {
  const { data, error } = await supabase
    .from('friends')
    .update({ status: 'accepted' })
    .eq('id', friendshipId)
    .select()
    .single();

  return { data, error };
}

// Get user's friends
export async function getFriends(userId: string) {
  const { data, error } = await supabase
    .from('friends')
    .select('*')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .eq('status', 'accepted');

  if (error || !data) {
    return { data: [], error };
  }

  // Get friend IDs
  const friendIds = data.map(f => f.user_id === userId ? f.friend_id : f.user_id);
  
  // Get usernames from user_profiles
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, username, email')
    .in('id', friendIds);

  // Create a map of friend_id to profile
  const profileMap = new Map<string, { username: string; email: string }>();
  (profiles || []).forEach(profile => {
    profileMap.set(profile.id, { username: profile.username, email: profile.email });
  });

  // Add username and email to friend records
  const friendsWithProfiles = data.map(friend => {
    const friendId = friend.user_id === userId ? friend.friend_id : friend.user_id;
    const profile = profileMap.get(friendId);
    return {
      ...friend,
      friend_username: profile?.username,
      friend_email: profile?.email,
    };
  });

  return { data: friendsWithProfiles, error: null };
}

// Get pending friend requests
export async function getPendingRequests(userId: string) {
  const { data, error } = await supabase
    .from('friends')
    .select('*')
    .eq('friend_id', userId)
    .eq('status', 'pending');

  if (error || !data) {
    return { data: [], error };
  }

  // Get requester IDs
  const requesterIds = data.map(r => r.requested_by);
  
  // Get usernames from user_profiles
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, username, email')
    .in('id', requesterIds);

  // Create a map of requester_id to profile
  const profileMap = new Map<string, { username: string; email: string }>();
  (profiles || []).forEach(profile => {
    profileMap.set(profile.id, { username: profile.username, email: profile.email });
  });

  // Add requester info to requests
  const requestsWithProfiles = data.map(request => {
    const profile = profileMap.get(request.requested_by);
    return {
      ...request,
      requester: {
        id: request.requested_by,
        username: profile?.username,
        email: profile?.email || '',
      },
    };
  });

  return { data: requestsWithProfiles, error: null };
}

// Remove friend
export async function removeFriend(friendshipId: string) {
  const { error } = await supabase
    .from('friends')
    .delete()
    .eq('id', friendshipId);

  return { error };
}

