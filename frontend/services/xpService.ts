import { supabase } from '../config/supabase';

export interface ExerciseSet {
  exercise_id: string;
  exercise_name: string;
  weight: number; // Weight for PR detection (best set)
  reps: number; // Reps for PR detection (best set)
  sets: number; // Total number of sets
  // Optional: if sets have different weights/reps, provide array
  setDetails?: Array<{ weight: number; reps: number }>;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  session_date: string;
  total_xp: number;
  exercises_completed: ExerciseSet[];
  prs_achieved: number;
  streak_multiplier: number;
}

/**
 * Calculate XP required for a specific level
 */
export function getXPForLevel(level: number): number {
  // Formula: 100 * level^1.5 (rounded)
  return Math.round(100 * Math.pow(level, 1.5));
}

/**
 * Calculate exercise XP
 * Formula: (weight / bodyweight) × 10 × reps × sets
 * For PR: (weight / bodyweight) × 100 (no reps/sets multiplier)
 */
export function calculateExerciseXP(
  weight: number,
  bodyweight: number,
  reps: number,
  sets: number,
  isPR: boolean = false
): number {
  if (bodyweight <= 0) return 0;
  
  if (isPR) {
    return Math.round((weight / bodyweight) * 100);
  }
  
  return Math.round((weight / bodyweight) * 10 * reps * sets);
}

/**
 * Check if a new PR was achieved
 * Note: First time logging an exercise does NOT count as a PR
 */
export async function checkPR(
  userId: string,
  exerciseId: string,
  weight: number,
  reps: number
): Promise<{ isPR: boolean; previousPR?: { weight: number; reps: number } }> {
  try {
    const { data: currentPR } = await supabase
      .from('personal_records')
      .select('*')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .eq('is_current_pr', true)
      .single();

    // If no PR exists, this is the first time logging this exercise - don't count as PR
    if (!currentPR) {
      return { isPR: false };
    }

    // Check if this beats the current PR (weight primary, reps as tiebreaker)
    const isPR = weight > currentPR.weight || 
                 (weight === currentPR.weight && reps > currentPR.reps);

    return {
      isPR,
      previousPR: isPR ? { weight: currentPR.weight, reps: currentPR.reps } : undefined,
    };
  } catch (error) {
    return { isPR: false };
  }
}

/**
 * Create PR record
 * Note: This should only be called when a PR is actually achieved (not first time logging)
 */
export async function createPR(
  userId: string,
  exerciseId: string,
  weight: number,
  reps: number,
  sets?: number
) {
  try {
    // Mark old PR as not current (if one exists)
    await supabase
      .from('personal_records')
      .update({ is_current_pr: false })
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .eq('is_current_pr', true);

    // Create new PR
    const { data, error } = await supabase
      .from('personal_records')
      .insert({
        user_id: userId,
        exercise_id: exerciseId,
        weight: weight,
        reps: reps,
        sets: sets || null,
        pr_date: new Date().toISOString().split('T')[0],
        is_current_pr: true,
      })
      .select()
      .single();

    return { data, error };
  } catch (error: any) {
    return { error: { message: error.message }, data: null };
  }
}

/**
 * Create initial record for an exercise (first time logging, not a PR)
 * This establishes a baseline for future PR comparisons
 */
export async function createInitialExerciseRecord(
  userId: string,
  exerciseId: string,
  weight: number,
  reps: number,
  sets?: number
) {
  try {
    // Check if any record exists for this exercise
    const { data: existing } = await supabase
      .from('personal_records')
      .select('id')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .limit(1)
      .single();

    // Only create if no record exists (first time)
    if (!existing) {
      const { data, error } = await supabase
        .from('personal_records')
        .insert({
          user_id: userId,
          exercise_id: exerciseId,
          weight: weight,
          reps: reps,
          sets: sets || null,
          pr_date: new Date().toISOString().split('T')[0],
          is_current_pr: true, // This becomes the baseline for future PRs
          points_earned: 0, // No points for initial record
        })
        .select()
        .single();

      return { data, error };
    }

    return { data: null, error: null };
  } catch (error: any) {
    // If error is "no rows returned", that's fine - no record exists yet
    if (error.code === 'PGRST116') {
      // Create the initial record
      const { data, error: insertError } = await supabase
        .from('personal_records')
        .insert({
          user_id: userId,
          exercise_id: exerciseId,
          weight: weight,
          reps: reps,
          sets: sets || null,
          pr_date: new Date().toISOString().split('T')[0],
          is_current_pr: true,
          points_earned: 0,
        })
        .select()
        .single();

      return { data, error: insertError };
    }
    return { error: { message: error.message }, data: null };
  }
}

/**
 * Calculate session XP and update user stats
 */
export async function processWorkoutSession(
  userId: string,
  exercises: ExerciseSet[],
  streakMultiplier: number = 1.0
) {
  try {
    // Get user bodyweight
    const { data: stats } = await supabase
      .from('user_stats')
      .select('bodyweight, current_streak, level, level_xp, current_month_xp')
      .eq('user_id', userId)
      .single();

    if (!stats || !stats.bodyweight) {
      return { error: { message: 'Please set your bodyweight in profile settings' } };
    }

    let totalExerciseXP = 0;
    let prsAchieved = 0;
    const exerciseLogs: any[] = [];

    // Process each exercise
    for (const exercise of exercises) {
      // Check for PR
      const prCheck = await checkPR(
        userId,
        exercise.exercise_id,
        exercise.weight,
        exercise.reps
      );

      let exerciseXP = 0;
      let isPR = false;

      if (prCheck.isPR) {
        // This is a new PR - create PR record
        await createPR(userId, exercise.exercise_id, exercise.weight, exercise.reps, exercise.sets);
        isPR = true;
        prsAchieved++;
        
        // PR XP: (weight / bodyweight) × 100
        exerciseXP = calculateExerciseXP(
          exercise.weight,
          stats.bodyweight,
          1,
          1,
          true
        );
      } else {
        // Check if this is the first time logging this exercise
        const { data: existingRecord } = await supabase
          .from('personal_records')
          .select('id')
          .eq('user_id', userId)
          .eq('exercise_id', exercise.exercise_id)
          .limit(1)
          .single();

        // If no record exists, create initial baseline (not a PR)
        if (!existingRecord) {
          await createInitialExerciseRecord(
            userId,
            exercise.exercise_id,
            exercise.weight,
            exercise.reps,
            exercise.sets
          );
        }

        // Normal XP: Sum of (weight / bodyweight) × 10 × reps for each set
        if (exercise.setDetails && exercise.setDetails.length > 0) {
          // Calculate XP for each set and sum
          exerciseXP = exercise.setDetails.reduce((total, set) => {
            return total + calculateExerciseXP(
              set.weight,
              stats.bodyweight,
              set.reps,
              1, // Each set counts as 1
              false
            );
          }, 0);
        } else {
          // Fallback: (weight / bodyweight) × 10 × reps × sets
          exerciseXP = calculateExerciseXP(
            exercise.weight,
            stats.bodyweight,
            exercise.reps,
            exercise.sets,
            false
          );
        }
      }

      totalExerciseXP += exerciseXP;

      exerciseLogs.push({
        exercise_id: exercise.exercise_id,
        exercise_name: exercise.exercise_name,
        weight: exercise.weight,
        reps: exercise.reps,
        sets: exercise.sets,
        xp: exerciseXP,
        is_pr: isPR,
      });
    }

    // Apply streak multiplier to total exercise XP
    const sessionXP = Math.round(totalExerciseXP * streakMultiplier);

    // Get current month
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Update user stats
    // level_xp is now cumulative (total XP from level 0)
    const currentLevel = stats.level || 1;
    const currentLevelXP = stats.level_xp || 0;
    
    // Check if level_xp is in old format (non-cumulative) or new format (cumulative)
    // Calculate cumulative XP for previous levels
    let cumulativeXPForPreviousLevels = 0;
    for (let level = 1; level < currentLevel; level++) {
      cumulativeXPForPreviousLevels += getXPForLevel(level);
    }
    
    // If currentLevelXP is less than cumulativeXPForPreviousLevels, it's in old format
    // Otherwise, it's already cumulative
    let currentCumulativeXP: number;
    if (currentLevelXP < cumulativeXPForPreviousLevels) {
      // Old format: convert to cumulative
      currentCumulativeXP = cumulativeXPForPreviousLevels + currentLevelXP;
    } else {
      // New format: already cumulative
      currentCumulativeXP = currentLevelXP;
    }
    
    // Add session XP to cumulative total
    const newCumulativeXP = currentCumulativeXP + sessionXP;
    const newMonthXP = (stats.current_month_xp || 0) + sessionXP;

    // Calculate new level from cumulative XP
    let newLevel = 1;
    let remainingXP = newCumulativeXP;
    
    while (newLevel < 100) {
      const xpNeeded = getXPForLevel(newLevel);
      if (remainingXP >= xpNeeded) {
        remainingXP -= xpNeeded;
        newLevel++;
      } else {
        break;
      }
    }

    // Update attendance and streak
    const today = new Date().toISOString().split('T')[0];
    const { data: todayAttendance } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .eq('workout_date', today)
      .single();

    let newStreak = stats.current_streak || 0;
    let longestStreak = stats.longest_streak || 0;

    if (!todayAttendance) {
      // Create attendance record
      await supabase.from('attendance').insert({
        user_id: userId,
        workout_date: today,
      });

      // Update streak
      const lastWorkout = stats.last_workout_date
        ? new Date(stats.last_workout_date)
        : null;
      const todayDate = new Date(today);
      todayDate.setHours(0, 0, 0, 0);
      
      if (lastWorkout) {
        lastWorkout.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor(
          (todayDate.getTime() - lastWorkout.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysDiff === 1) {
          // Consecutive day
          newStreak = (stats.current_streak || 0) + 1;
        } else if (daysDiff > 1) {
          // Streak broken
          newStreak = 1;
        }
        // daysDiff === 0 means same day, keep streak
      } else {
        // First workout
        newStreak = 1;
      }

      longestStreak = Math.max(newStreak, stats.longest_streak || 0);
    }

    // Update stats
    // Store cumulative XP (total from level 0)
    const { error: updateError } = await supabase
      .from('user_stats')
      .update({
        level: newLevel,
        level_xp: newCumulativeXP, // Store cumulative XP
        current_month_xp: newMonthXP,
        current_month: currentMonth,
        total_prs: (stats.total_prs || 0) + prsAchieved,
        current_streak: newStreak,
        longest_streak: longestStreak,
        total_workouts: (stats.total_workouts || 0) + (todayAttendance ? 0 : 1),
        last_workout_date: today,
      })
      .eq('user_id', userId);

    if (updateError) {
      return { error: updateError };
    }

    // Save workout session
    const { data: session, error: sessionError } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: userId,
        session_date: new Date().toISOString().split('T')[0],
        total_xp: sessionXP,
        exercises_completed: exerciseLogs,
        prs_achieved: prsAchieved,
        streak_multiplier: streakMultiplier,
      })
      .select()
      .single();

    if (sessionError) {
      return { error: sessionError };
    }

    return {
      data: {
        sessionXP,
        exerciseXP: totalExerciseXP,
        prsAchieved,
        streakMultiplier,
        newLevel,
        levelProgress: {
          current: remainingXP,
          needed: getXPForLevel(newLevel),
          level: newLevel,
        },
      },
      error: null,
    };
  } catch (error: any) {
    return { error: { message: error.message || 'Failed to process workout' } };
  }
}

/**
 * Get monthly XP history
 */
export async function getMonthlyXPHistory(userId: string, sortOrder: 'high' | 'low' = 'high') {
  try {
    const { data, error } = await supabase
      .from('monthly_xp')
      .select('*')
      .eq('user_id', userId)
      .order('month', { ascending: sortOrder === 'low' });

    if (error) {
      return { error, data: null };
    }

    // Sort by XP if needed
    if (sortOrder === 'high') {
      data.sort((a, b) => b.total_xp - a.total_xp);
    } else {
      data.sort((a, b) => a.total_xp - b.total_xp);
    }

    return { data, error: null };
  } catch (error: any) {
    return { error: { message: error.message }, data: null };
  }
}

