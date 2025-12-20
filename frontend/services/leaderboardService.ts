import { supabase } from '../config/supabase';

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  total_points: number;
  level: number;
  current_streak: number;
  total_prs: number;
  total_workouts: number;
  challenges_won?: number;
  rank: number;
}

// Get leaderboard for a group
export async function getGroupLeaderboard(groupId: string) {
  // Get all members of the group
  const { data: members, error: membersError } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId);

  if (membersError || !members) {
    return { data: [], error: membersError };
  }

  const userIds = members.map(m => m.user_id);

  // Get stats for all members with usernames
  const { data: stats, error: statsError } = await supabase
    .from('user_stats')
    .select(`
      user_id,
      level_xp,
      level,
      current_streak,
      total_prs,
      total_workouts,
      challenges_won
    `)
    .in('user_id', userIds)
    .order('level_xp', { ascending: false });

  if (statsError) {
    return { data: [], error: statsError };
  }

  // Get usernames from user_profiles
  const userIdsList = (stats || []).map(s => s.user_id);
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, username, email')
    .in('id', userIdsList);

  // Create a map of user_id to username
  const usernameMap = new Map<string, string>();
  (profiles || []).forEach(profile => {
    usernameMap.set(profile.id, profile.username);
  });

  // Format and rank the results
  const leaderboard: LeaderboardEntry[] = (stats || []).map((stat, index) => {
    const username = usernameMap.get(stat.user_id) || 'Unknown';
    return {
      user_id: stat.user_id,
      username,
      total_points: stat.level_xp || 0,
      level: stat.level || 1,
      current_streak: stat.current_streak || 0,
      total_prs: stat.total_prs || 0,
      total_workouts: stat.total_workouts || 0,
      challenges_won: stat.challenges_won || 0,
      rank: index + 1,
    };
  });

  return { data: leaderboard, error: null };
}

// Get global leaderboard (top users)
export async function getGlobalLeaderboard(limit: number = 100) {
  const { data: stats, error } = await supabase
    .from('user_stats')
    .select(`
      user_id,
      level_xp,
      level,
      current_streak,
      total_prs,
      total_workouts,
      challenges_won
    `)
    .order('level_xp', { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [], error };
  }

  // Get usernames from user_profiles
  const userIdsList = (stats || []).map(s => s.user_id);
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, username, email')
    .in('id', userIdsList);

  // Create a map of user_id to username
  const usernameMap = new Map<string, string>();
  (profiles || []).forEach(profile => {
    usernameMap.set(profile.id, profile.username);
  });

  const leaderboard: LeaderboardEntry[] = (stats || []).map((stat, index) => {
    const username = usernameMap.get(stat.user_id) || 'Unknown';
    return {
      user_id: stat.user_id,
      username,
      total_points: stat.level_xp || 0,
      level: stat.level || 1,
      current_streak: stat.current_streak || 0,
      total_prs: stat.total_prs || 0,
      total_workouts: stat.total_workouts || 0,
      challenges_won: stat.challenges_won || 0,
      rank: index + 1,
    };
  });

  return { data: leaderboard, error: null };
}

// Get user's rank in a group
export async function getUserGroupRank(groupId: string, userId: string) {
  const { data: leaderboard, error } = await getGroupLeaderboard(groupId);
  
  if (error) {
    return { rank: null, error };
  }

  const userEntry = leaderboard.find(entry => entry.user_id === userId);
  return { rank: userEntry?.rank || null, error: null };
}

