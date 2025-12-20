import { supabase } from '../config/supabase';
import { getXPForLevel } from './xpService';

/**
 * Convert cumulative XP to level and remaining XP for current level
 */
function calculateLevelFromCumulativeXP(cumulativeXP: number): { level: number; remainingXP: number } {
  let level = 1;
  let remainingXP = cumulativeXP;
  
  while (level < 100) {
    const xpForLevel = getXPForLevel(level);
    if (remainingXP >= xpForLevel) {
      remainingXP -= xpForLevel;
      level++;
    } else {
      break;
    }
  }
  
  return { level, remainingXP };
}

/**
 * Convert level and remaining XP to cumulative total XP
 */
function calculateCumulativeXPFromLevel(level: number, remainingXP: number): number {
  let cumulativeXP = remainingXP;
  
  for (let l = 1; l < level; l++) {
    cumulativeXP += getXPForLevel(l);
  }
  
  return cumulativeXP;
}

export interface LiftOffChallenge {
  id: string;
  challenger_id: string;
  challenged_id: string;
  exercise_id: string;
  exercise?: {
    id: string;
    name: string;
    category: string;
    unit: string;
  };
  wager_xp: number;
  status: 'pending' | 'accepted' | 'completed' | 'declined' | 'expired';
  created_at: string;
  accepted_at?: string;
  expires_at?: string;
  challenger_weight?: number;
  challenged_weight?: number;
  challenger_completed_at?: string;
  challenged_completed_at?: string;
  winner_id?: string;
  updated_at: string;
  challenger_username?: string;
  challenged_username?: string;
}

export interface CreateChallengeParams {
  challengedUserId: string;
  exerciseId: string;
  wagerXp: number;
}

export interface ChallengeResponse {
  data: LiftOffChallenge | null;
  error: Error | null;
}

/**
 * Create a new lift-off challenge
 */
export async function createChallenge(
  challengerId: string,
  params: CreateChallengeParams
): Promise<ChallengeResponse> {
  try {
    // Prevent self-challenges
    if (challengerId === params.challengedUserId) {
      return {
        data: null,
        error: new Error('Cannot challenge yourself'),
      };
    }

    // Check if challenger has enough XP
    // Use level_xp as it's the canonical XP value (total_points may not be updated in new system)
    const { data: stats, error: statsError } = await supabase
      .from('user_stats')
      .select('level_xp, total_points, level')
      .eq('user_id', challengerId)
      .single();

    if (statsError || !stats) {
      return {
        data: null,
        error: new Error('Failed to fetch user stats'),
      };
    }

    // level_xp is now cumulative (total XP from level 0)
    // Calculate current level XP for display/validation
    const currentLevel = stats.level || 1;
    const levelXP = stats.level_xp || 0;
    
    // Calculate cumulative XP up to current level (levels 1 through level-1)
    let cumulativeXPForPreviousLevels = 0;
    for (let level = 1; level < currentLevel; level++) {
      cumulativeXPForPreviousLevels += getXPForLevel(level);
    }
    
    // Check if level_xp is in old format (non-cumulative) or new format (cumulative)
    let cumulativeXP: number;
    if (levelXP < cumulativeXPForPreviousLevels) {
      // Old format: level_xp is just current level XP, convert to cumulative
      cumulativeXP = cumulativeXPForPreviousLevels + levelXP;
    } else {
      // New format: already cumulative
      cumulativeXP = levelXP;
    }
    
    // For validation, we check against total cumulative XP
    // Users can wager from their total accumulated XP, not just current level XP
    const availableXP = cumulativeXP;

    if (availableXP < params.wagerXp) {
      return {
        data: null,
        error: new Error(`Insufficient XP to create challenge. You have ${availableXP} XP but need ${params.wagerXp} XP.`),
      };
    }

    // Calculate expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data, error } = await supabase
      .from('lift_off_challenges')
      .insert({
        challenger_id: challengerId,
        challenged_id: params.challengedUserId,
        exercise_id: params.exerciseId,
        wager_xp: params.wagerXp,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Get all challenges for a user (as challenger or challenged)
 */
export async function getUserChallenges(userId: string): Promise<{
  data: LiftOffChallenge[] | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('lift_off_challenges')
      .select(`
        *,
        exercise:exercises(id, name, category, unit)
      `)
      .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Fetch usernames separately
    const allUserIds = new Set<string>();
    (data || []).forEach((c: any) => {
      allUserIds.add(c.challenger_id);
      allUserIds.add(c.challenged_id);
    });

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, username')
      .in('id', Array.from(allUserIds));

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.username]));

    // Format the data
    const formatted = (data || []).map((challenge: any) => ({
      ...challenge,
      exercise: challenge.exercise,
      challenger_username: profileMap.get(challenge.challenger_id),
      challenged_username: profileMap.get(challenge.challenged_id),
    }));

    return { data: formatted, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Get active challenges (accepted, not completed)
 */
export async function getActiveChallenges(userId: string): Promise<{
  data: LiftOffChallenge[] | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await getUserChallenges(userId);

    if (error || !data) {
      return { data: null, error };
    }

    const active = data.filter(
      (challenge) =>
        challenge.status === 'accepted' &&
        (!challenge.challenger_completed_at || !challenge.challenged_completed_at) &&
        new Date(challenge.expires_at || '') > new Date()
    );

    return { data: active, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Accept a challenge
 */
export async function acceptChallenge(
  challengeId: string,
  userId: string
): Promise<ChallengeResponse> {
  try {
    // Check if user has enough XP
    // Use level_xp as it's the canonical XP value (total_points may not be updated in new system)
    const { data: stats, error: statsError } = await supabase
      .from('user_stats')
      .select('level_xp, total_points, level')
      .eq('user_id', userId)
      .single();

    if (statsError || !stats) {
      return {
        data: null,
        error: new Error('Failed to fetch user stats'),
      };
    }

    // Get challenge to check wager
    const { data: challenge, error: challengeError } = await supabase
      .from('lift_off_challenges')
      .select('wager_xp, challenged_id')
      .eq('id', challengeId)
      .single();

    if (challengeError || !challenge) {
      return {
        data: null,
        error: new Error('Challenge not found'),
      };
    }

    if (challenge.challenged_id !== userId) {
      return {
        data: null,
        error: new Error('You are not the challenged user'),
      };
    }

    // level_xp is now cumulative (total XP from level 0)
    // Calculate current level XP for display/validation
    const currentLevel = stats.level || 1;
    const levelXP = stats.level_xp || 0;
    
    // Calculate cumulative XP up to current level (levels 1 through level-1)
    let cumulativeXPForPreviousLevels = 0;
    for (let level = 1; level < currentLevel; level++) {
      cumulativeXPForPreviousLevels += getXPForLevel(level);
    }
    
    // Check if level_xp is in old format (non-cumulative) or new format (cumulative)
    let cumulativeXP: number;
    if (levelXP < cumulativeXPForPreviousLevels) {
      // Old format: level_xp is just current level XP, convert to cumulative
      cumulativeXP = cumulativeXPForPreviousLevels + levelXP;
    } else {
      // New format: already cumulative
      cumulativeXP = levelXP;
    }
    
    // For validation, we check against total cumulative XP
    // Users can wager from their total accumulated XP, not just current level XP
    const availableXP = cumulativeXP;

    if (availableXP < challenge.wager_xp) {
      return {
        data: null,
        error: new Error(`Insufficient XP to accept challenge. You have ${availableXP} XP but need ${challenge.wager_xp} XP.`),
      };
    }

    const { data, error } = await supabase
      .from('lift_off_challenges')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', challengeId)
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Decline a challenge
 */
export async function declineChallenge(
  challengeId: string,
  userId: string
): Promise<ChallengeResponse> {
  try {
    const { data, error } = await supabase
      .from('lift_off_challenges')
      .update({
        status: 'declined',
      })
      .eq('id', challengeId)
      .eq('challenged_id', userId)
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Submit lift weight for a challenge
 */
export async function submitLiftWeight(
  challengeId: string,
  userId: string,
  weight: number
): Promise<ChallengeResponse> {
  try {
    // Get challenge to check user role
    const { data: challenge, error: challengeError } = await supabase
      .from('lift_off_challenges')
      .select('challenger_id, challenged_id, status, wager_xp')
      .eq('id', challengeId)
      .single();

    if (challengeError || !challenge) {
      return {
        data: null,
        error: new Error('Challenge not found'),
      };
    }

    if (challenge.status !== 'accepted') {
      return {
        data: null,
        error: new Error('Challenge is not accepted'),
      };
    }

    const isChallenger = challenge.challenger_id === userId;
    const isChallenged = challenge.challenged_id === userId;

    if (!isChallenger && !isChallenged) {
      return {
        data: null,
        error: new Error('You are not part of this challenge'),
      };
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (isChallenger) {
      updateData.challenger_weight = weight;
      updateData.challenger_completed_at = new Date().toISOString();
    } else {
      updateData.challenged_weight = weight;
      updateData.challenged_completed_at = new Date().toISOString();
    }

    const { data: updatedChallenge, error: updateError } = await supabase
      .from('lift_off_challenges')
      .update(updateData)
      .eq('id', challengeId)
      .select()
      .single();

    if (updateError) {
      return { data: null, error: new Error(updateError.message) };
    }

    // Check if both parties have completed
    if (
      updatedChallenge.challenger_weight &&
      updatedChallenge.challenged_weight
    ) {
      // Determine winner and transfer XP
      const winnerId =
        updatedChallenge.challenger_weight > updatedChallenge.challenged_weight
          ? updatedChallenge.challenger_id
          : updatedChallenge.challenged_id;

      try {
        await completeChallenge(challengeId, winnerId, challenge.wager_xp);
      } catch (error) {
        console.error('ERROR: Failed to complete challenge:', error);
        throw error;
      }
    }

    return { data: updatedChallenge, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Complete challenge and transfer XP
 */
async function completeChallenge(
  challengeId: string,
  winnerId: string,
  wagerXp: number
): Promise<void> {
  try {
    console.log('\n=== LIFT-OFF CHALLENGE COMPLETION ===');
    console.log('Challenge ID:', challengeId);
    console.log('Winner ID:', winnerId);
    console.log('Wager XP:', wagerXp);
    
    // Get challenge details
    const { data: challenge, error: challengeError } = await supabase
      .from('lift_off_challenges')
      .select('challenger_id, challenged_id')
      .eq('id', challengeId)
      .single();

    if (challengeError || !challenge) {
      console.error('ERROR: Challenge not found:', challengeError);
      throw new Error('Challenge not found');
    }

    const loserId =
      winnerId === challenge.challenger_id
        ? challenge.challenged_id
        : challenge.challenger_id;
    
    console.log('Loser ID:', loserId);

    // Transfer XP: winner gains, loser loses
    // Get current stats for both users (we need level_xp, level, total_points, current_month_xp, and challenges_won)
    const { data: winnerStats } = await supabase
      .from('user_stats')
      .select('level_xp, level, total_points, current_month_xp, challenges_won')
      .eq('user_id', winnerId)
      .single();

    const { data: loserStats } = await supabase
      .from('user_stats')
      .select('level_xp, level, total_points, current_month_xp')
      .eq('user_id', loserId)
      .single();

    if (!winnerStats) {
      console.error('ERROR: Winner stats not found for user:', winnerId);
      throw new Error('Winner stats not found');
    }
    
    // Winner gains wager XP
    // level_xp is now cumulative (total XP from level 0)
    const winnerCurrentLevel = winnerStats.level || 1;
    const winnerCurrentLevelXP = winnerStats.level_xp || 0;
    
    // Check if level_xp is in old format (non-cumulative) or new format (cumulative)
    let winnerCurrentCumulativeXP: number;
    const winnerCumulativeXPForPreviousLevels = calculateCumulativeXPFromLevel(winnerCurrentLevel, 0);
    
    if (winnerCurrentLevelXP < winnerCumulativeXPForPreviousLevels) {
      // Old format: convert to cumulative
      winnerCurrentCumulativeXP = winnerCumulativeXPForPreviousLevels + winnerCurrentLevelXP;
    } else {
      // New format: already cumulative
      winnerCurrentCumulativeXP = winnerCurrentLevelXP;
    }
    
    // Add wager XP to cumulative total
    const winnerNewCumulativeXP = winnerCurrentCumulativeXP + wagerXp;
    
    // Recalculate level from cumulative XP
    const { level: winnerNewLevel } = calculateLevelFromCumulativeXP(winnerNewCumulativeXP);
    
    const winnerNewTotalPoints = (winnerStats.total_points || 0) + wagerXp;
    const winnerNewMonthXP = (winnerStats.current_month_xp || 0) + wagerXp;
    
    console.log('\n--- WINNER (Gains XP) ---');
    console.log('  Current Level:', winnerCurrentLevel, '| Current Cumulative XP:', winnerCurrentCumulativeXP);
    console.log('  Wager XP Added:', wagerXp);
    console.log('  New Level:', winnerNewLevel, '| New Cumulative XP:', winnerNewCumulativeXP);
    console.log('  Monthly XP Updated:', winnerStats.current_month_xp, '→', winnerNewMonthXP);
    
    const { error: winnerUpdateError } = await supabase
      .from('user_stats')
      .update({
        level_xp: winnerNewCumulativeXP, // Store cumulative XP
        level: winnerNewLevel,
        total_points: winnerNewTotalPoints,
        current_month_xp: winnerNewMonthXP, // Update monthly XP
        challenges_won: (winnerStats.challenges_won || 0) + 1, // Increment challenges won
      })
      .eq('user_id', winnerId);
    
    if (winnerUpdateError) {
      console.error('ERROR: Failed to update winner stats:', winnerUpdateError);
      throw winnerUpdateError;
    }
    
    console.log('  ✓ Winner stats updated successfully');

    if (!loserStats) {
      console.error('ERROR: Loser stats not found for user:', loserId);
      throw new Error('Loser stats not found');
    }
    
    // Loser loses wager XP (but not below 0)
    // level_xp is now cumulative (total XP from level 0)
    const loserCurrentLevel = loserStats.level || 1;
    const loserCurrentLevelXP = loserStats.level_xp || 0;
    
    // Check if level_xp is in old format (non-cumulative) or new format (cumulative)
    let loserCurrentCumulativeXP: number;
    const loserCumulativeXPForPreviousLevels = calculateCumulativeXPFromLevel(loserCurrentLevel, 0);
    
    if (loserCurrentLevelXP < loserCumulativeXPForPreviousLevels) {
      // Old format: convert to cumulative
      loserCurrentCumulativeXP = loserCumulativeXPForPreviousLevels + loserCurrentLevelXP;
    } else {
      // New format: already cumulative
      loserCurrentCumulativeXP = loserCurrentLevelXP;
    }
    
    // Subtract wager XP from cumulative total (but not below 0)
    const loserNewCumulativeXP = Math.max(0, loserCurrentCumulativeXP - wagerXp);
    
    // Recalculate level from cumulative XP
    const { level: loserNewLevel } = calculateLevelFromCumulativeXP(loserNewCumulativeXP);
    
    const loserNewTotalPoints = Math.max(0, (loserStats.total_points || 0) - wagerXp);
    const loserNewMonthXP = Math.max(0, (loserStats.current_month_xp || 0) - wagerXp);
    
    console.log('\n--- LOSER (Loses XP) ---');
    console.log('  Current Level:', loserCurrentLevel, '| Current Cumulative XP:', loserCurrentCumulativeXP);
    console.log('  Wager XP Lost:', wagerXp);
    console.log('  New Level:', Math.max(1, loserNewLevel), '| New Cumulative XP:', loserNewCumulativeXP);
    console.log('  Monthly XP Updated:', loserStats.current_month_xp, '→', loserNewMonthXP);
    
    const { error: loserUpdateError } = await supabase
      .from('user_stats')
      .update({
        level_xp: loserNewCumulativeXP, // Store cumulative XP
        level: Math.max(1, loserNewLevel),
        total_points: loserNewTotalPoints,
        current_month_xp: loserNewMonthXP, // Update monthly XP
      })
      .eq('user_id', loserId);
    
    if (loserUpdateError) {
      console.error('ERROR: Failed to update loser stats:', loserUpdateError);
      throw loserUpdateError;
    }
    
    console.log('  ✓ Loser stats updated successfully');
    
    // Update challenge status to completed
    const { error: challengeUpdateError } = await supabase
      .from('lift_off_challenges')
      .update({
        status: 'completed',
        winner_id: winnerId,
      })
      .eq('id', challengeId);
    
    if (challengeUpdateError) {
      console.error('ERROR: Failed to update challenge status:', challengeUpdateError);
      throw challengeUpdateError;
    }
    
    console.log('\n✓ Challenge marked as completed');
    console.log('=====================================\n');
  } catch (err) {
    console.error('Error completing challenge:', err);
    throw err;
  }
}

/**
 * Get pending challenges for a user (challenges they received)
 */
export async function getPendingChallenges(userId: string): Promise<{
  data: LiftOffChallenge[] | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('lift_off_challenges')
      .select(`
        *,
        exercise:exercises(id, name, category, unit)
      `)
      .eq('challenged_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Fetch challenger usernames separately
    const challengeIds = (data || []).map((c: any) => c.challenger_id);
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, username')
      .in('id', challengeIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.username]));

    const formatted = (data || []).map((challenge: any) => ({
      ...challenge,
      exercise: challenge.exercise,
      challenger_username: profileMap.get(challenge.challenger_id),
    }));

    return { data: formatted, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Get a single challenge by ID
 */
export async function getChallengeById(
  challengeId: string,
  userId: string
): Promise<ChallengeResponse> {
  try {
    const { data, error } = await supabase
      .from('lift_off_challenges')
      .select(`
        *,
        exercise:exercises(id, name, category, unit)
      `)
      .eq('id', challengeId)
      .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    if (!data) {
      return { data: null, error: new Error('Challenge not found') };
    }

    // Fetch usernames
    const { data: challengerProfile } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('id', data.challenger_id)
      .single();

    const { data: challengedProfile } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('id', data.challenged_id)
      .single();

    const formatted: LiftOffChallenge = {
      ...data,
      exercise: data.exercise,
      challenger_username: challengerProfile?.username,
      challenged_username: challengedProfile?.username,
    };

    return { data: formatted, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

