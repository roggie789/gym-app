import { supabase } from '../config/supabase';

export interface Exercise {
  id: string;
  name: string;
  category: string;
  muscle_groups?: string[];
  description?: string;
  unit: string;
}

export interface ExerciseLog {
  exercise_id: string;
  exercise_name: string;
  weight: number;
  reps: number;
  sets?: number;
}

export interface PersonalRecord {
  id: string;
  user_id: string;
  exercise_id: string;
  exercise_name: string;
  weight: number;
  reps: number;
  sets?: number;
  pr_date: string;
  is_current_pr: boolean;
}

/**
 * Get all available exercises
 */
export async function getExercises() {
  try {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      return { error, data: null };
    }

    return { data, error: null };
  } catch (error: any) {
    return { error: { message: error.message }, data: null };
  }
}

/**
 * Get user's current PRs for all exercises
 */
export async function getUserPRs(userId: string) {
  try {
    const { data, error } = await supabase
      .from('personal_records')
      .select(`
        *,
        exercises:exercise_id (
          name,
          unit
        )
      `)
      .eq('user_id', userId)
      .eq('is_current_pr', true);

    if (error) {
      return { error, data: null };
    }

    return { data, error: null };
  } catch (error: any) {
    return { error: { message: error.message }, data: null };
  }
}

/**
 * Check if a new PR was achieved and create record if so
 */
export async function checkAndCreatePR(
  userId: string,
  exerciseId: string,
  weight: number,
  reps: number,
  sets?: number
) {
  try {
    // Get current PR for this exercise
    const { data: currentPR } = await supabase
      .from('personal_records')
      .select('*')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .eq('is_current_pr', true)
      .single();

    let isNewPR = false;
    let pointsEarned = 0;

    if (!currentPR) {
      // First time doing this exercise - it's a PR!
      isNewPR = true;
      pointsEarned = 100;
    } else {
      // Check if this beats the current PR
      // PR is based on weight primarily, reps as tiebreaker
      if (weight > currentPR.weight || (weight === currentPR.weight && reps > currentPR.reps)) {
        isNewPR = true;
        pointsEarned = 100;
      }
    }

    if (isNewPR) {
      // Mark old PR as not current
      if (currentPR) {
        await supabase
          .from('personal_records')
          .update({ is_current_pr: false })
          .eq('id', currentPR.id);
      }

      // Create new PR record
      const { data: newPR, error: prError } = await supabase
        .from('personal_records')
        .insert({
          user_id: userId,
          exercise_id: exerciseId,
          weight: weight,
          reps: reps,
          sets: sets || null,
          pr_date: new Date().toISOString().split('T')[0],
          points_earned: pointsEarned,
          is_current_pr: true,
        })
        .select()
        .single();

      if (prError) {
        return { error: prError, isNewPR: false, pointsEarned: 0 };
      }

      return { data: newPR, isNewPR: true, pointsEarned };
    }

    return { isNewPR: false, pointsEarned: 0 };
  } catch (error: any) {
    return { error: { message: error.message }, isNewPR: false, pointsEarned: 0 };
  }
}

