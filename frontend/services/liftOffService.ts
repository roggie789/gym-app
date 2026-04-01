import { supabase } from '../config/supabase';

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

    const { data: stats, error: statsError } = await supabase
      .from('user_stats')
      .select('gold')
      .eq('user_id', challengerId)
      .single();

    if (statsError || !stats) {
      return {
        data: null,
        error: new Error('Failed to fetch user stats'),
      };
    }

    const availableGold = stats.gold || 0;
    if (availableGold < params.wagerXp) {
      return {
        data: null,
        error: new Error(`Insufficient gold. You have ${availableGold} gold but need ${params.wagerXp}.`),
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
    const { data: stats, error: statsError } = await supabase
      .from('user_stats')
      .select('gold')
      .eq('user_id', userId)
      .single();

    if (statsError || !stats) {
      return {
        data: null,
        error: new Error('Failed to fetch user stats'),
      };
    }

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

    const availableGold = stats.gold || 0;
    if (availableGold < challenge.wager_xp) {
      return {
        data: null,
        error: new Error(`Insufficient gold. You have ${availableGold} gold but need ${challenge.wager_xp}.`),
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
      // Determine winner and transfer gold
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
 * Complete challenge and transfer gold between winner and loser
 */
async function completeChallenge(
  challengeId: string,
  winnerId: string,
  wagerGold: number
): Promise<void> {
  try {
    const { data: challenge, error: challengeError } = await supabase
      .from('lift_off_challenges')
      .select('challenger_id, challenged_id')
      .eq('id', challengeId)
      .single();

    if (challengeError || !challenge) {
      throw new Error('Challenge not found');
    }

    const loserId =
      winnerId === challenge.challenger_id
        ? challenge.challenged_id
        : challenge.challenger_id;

    const { data: winnerStats } = await supabase
      .from('user_stats')
      .select('gold, challenges_won')
      .eq('user_id', winnerId)
      .single();

    const { data: loserStats } = await supabase
      .from('user_stats')
      .select('gold')
      .eq('user_id', loserId)
      .single();

    if (!winnerStats) throw new Error('Winner stats not found');
    if (!loserStats) throw new Error('Loser stats not found');

    const winnerNewGold = (winnerStats.gold || 0) + wagerGold;
    const loserNewGold = Math.max(0, (loserStats.gold || 0) - wagerGold);

    const { error: winnerUpdateError } = await supabase
      .from('user_stats')
      .update({
        gold: winnerNewGold,
        challenges_won: (winnerStats.challenges_won || 0) + 1,
      })
      .eq('user_id', winnerId);

    if (winnerUpdateError) throw winnerUpdateError;

    const { error: loserUpdateError } = await supabase
      .from('user_stats')
      .update({ gold: loserNewGold })
      .eq('user_id', loserId);

    if (loserUpdateError) throw loserUpdateError;

    const { error: challengeUpdateError } = await supabase
      .from('lift_off_challenges')
      .update({
        status: 'completed',
        winner_id: winnerId,
      })
      .eq('id', challengeId);

    if (challengeUpdateError) throw challengeUpdateError;
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

