import { supabase } from '../config/supabase';
import { getExerciseCoefficient } from './exerciseCoefficients';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExerciseSet {
  exercise_id: string;
  exercise_name: string;
  weight: number;
  reps: number;
  sets: number;
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

// ─── Level System ────────────────────────────────────────────────────────────

export function getXPForLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5));
}

// ─── E1RM ────────────────────────────────────────────────────────────────────

/**
 * Epley formula: E1RM = weight × (1 + reps / 30)
 * Only valid for sets of 12 reps or fewer.
 */
export function calculateE1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  return weight * (1 + reps / 30);
}

/**
 * Fetch the stored E1RM for an exercise. Returns null if none exists or if expired.
 */
async function getStoredE1RM(
  userId: string,
  exerciseId: string
): Promise<{ e1rm_value: number; expired: boolean } | null> {
  const { data } = await supabase
    .from('exercise_e1rm')
    .select('e1rm_value, expires_at')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .single();

  if (!data) return null;

  const today = new Date().toISOString().split('T')[0];
  const expired = data.expires_at < today;
  return { e1rm_value: data.e1rm_value, expired };
}

/**
 * Upsert the E1RM record for an exercise.
 * Sets a 30-day expiry from today.
 */
async function upsertE1RM(
  userId: string,
  exerciseId: string,
  e1rmValue: number,
  sourceWeight: number,
  sourceReps: number
) {
  const today = new Date();
  const expiresAt = new Date(today);
  expiresAt.setDate(expiresAt.getDate() + 30);

  const todayStr = today.toISOString().split('T')[0];
  const expiresStr = expiresAt.toISOString().split('T')[0];

  const { data: existing } = await supabase
    .from('exercise_e1rm')
    .select('id')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('exercise_e1rm')
      .update({
        e1rm_value: e1rmValue,
        source_weight: sourceWeight,
        source_reps: sourceReps,
        set_date: todayStr,
        expires_at: expiresStr,
      })
      .eq('id', existing.id);
  } else {
    await supabase.from('exercise_e1rm').insert({
      user_id: userId,
      exercise_id: exerciseId,
      e1rm_value: e1rmValue,
      source_weight: sourceWeight,
      source_reps: sourceReps,
      set_date: todayStr,
      expires_at: expiresStr,
    });
  }
}

// ─── XP Formulas ─────────────────────────────────────────────────────────────

/**
 * Calculate XP for a single set using the new formula:
 *   Set_XP = Base × Intensity_Multiplier × Volume_Factor × Exercise_Multiplier
 *
 * Where:
 *   Base = 10
 *   Intensity = min(weight / e1rm, 1.05)
 *   Intensity_Multiplier = 1 + (intensity² × 2)
 *   Volume_Factor = reps^0.8
 *   Exercise_Multiplier = coefficient from lookup table
 *
 * If no E1RM is available yet (first time), intensity is treated as 1.0
 * (the set itself will establish the E1RM).
 */
export function calculateSetXP(
  weight: number,
  reps: number,
  e1rm: number | null,
  exerciseName: string
): number {
  if (weight <= 0 || reps <= 0) return 0;

  const BASE = 10;
  const exerciseMultiplier = getExerciseCoefficient(exerciseName);

  let intensity: number;
  if (e1rm && e1rm > 0) {
    intensity = Math.min(weight / e1rm, 1.05);
  } else {
    intensity = 1.0;
  }

  const intensityMultiplier = 1 + (Math.pow(intensity, 2) * 2);
  const volumeFactor = Math.pow(reps, 0.8);

  return Math.round(BASE * intensityMultiplier * volumeFactor * exerciseMultiplier);
}

// ─── Streak Multiplier ───────────────────────────────────────────────────────

/**
 * Monthly session-count streak multiplier.
 *   Multiplier = 1 + 0.05 × sessions_this_month (including current session)
 * On the 20th session in a month, multiplier = 2.0x.
 */
export async function getMonthlyStreakMultiplier(userId: string): Promise<number> {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const today = now.toISOString().split('T')[0];

  const { count } = await supabase
    .from('workout_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('session_date', monthStart)
    .lte('session_date', today);

  // count is sessions already logged; add 1 for the current session being processed
  const sessionsIncludingCurrent = (count || 0) + 1;
  return 1 + 0.05 * sessionsIncludingCurrent;
}

// ─── Main Processor ──────────────────────────────────────────────────────────

/**
 * Process a completed workout session:
 *   1. For each set, look up / update E1RM, then calculate Set XP
 *   2. Sum all set XPs to get total exercise XP
 *   3. Multiply by monthly streak multiplier
 *   4. Update user stats (level, XP, gold, streak, etc.)
 *   5. Save workout session
 */
export async function processWorkoutSession(
  userId: string,
  exercises: ExerciseSet[],
  streakMultiplier: number = 1.0
) {
  try {
    const { data: stats } = await supabase
      .from('user_stats')
      .select('bodyweight, current_streak, longest_streak, level, level_xp, current_month_xp, total_prs, total_workouts, last_workout_date')
      .eq('user_id', userId)
      .single();

    if (!stats) {
      return { error: { message: 'User stats not found' } };
    }

    let totalExerciseXP = 0;
    let prsAchieved = 0;
    const exerciseLogs: any[] = [];

    for (const exercise of exercises) {
      const sets = exercise.setDetails && exercise.setDetails.length > 0
        ? exercise.setDetails
        : [{ weight: exercise.weight, reps: exercise.reps }];

      let exerciseXP = 0;
      let bestE1RMThisSession = 0;
      let bestE1RMSourceWeight = 0;
      let bestE1RMSourceReps = 0;
      let isPR = false;

      // Fetch stored E1RM for this exercise
      const storedE1RM = await getStoredE1RM(userId, exercise.exercise_id);
      let currentE1RM = storedE1RM && !storedE1RM.expired ? storedE1RM.e1rm_value : null;

      // If expired, we'll recalculate from this session's qualifying sets
      const e1rmExpiredOrMissing = !currentE1RM;

      for (const set of sets) {
        // Calculate E1RM for qualifying sets (≤12 reps)
        if (set.reps <= 12 && set.weight > 0) {
          const setE1RM = calculateE1RM(set.weight, set.reps);
          if (setE1RM > bestE1RMThisSession) {
            bestE1RMThisSession = setE1RM;
            bestE1RMSourceWeight = set.weight;
            bestE1RMSourceReps = set.reps;
          }
        }

        // For XP calculation: use the current known E1RM, or null if none
        const setXP = calculateSetXP(set.weight, set.reps, currentE1RM, exercise.exercise_name);
        exerciseXP += setXP;
      }

      // E1RM update logic:
      // - If new session E1RM beats stored → update (this is a new PR-level E1RM)
      // - If stored is expired and we have a qualifying set → establish new E1RM
      // - If no stored exists → establish initial E1RM
      if (bestE1RMThisSession > 0) {
        if (currentE1RM && bestE1RMThisSession > currentE1RM) {
          // New E1RM beats stored — update and mark as PR
          await upsertE1RM(userId, exercise.exercise_id, bestE1RMThisSession, bestE1RMSourceWeight, bestE1RMSourceReps);
          isPR = true;
          prsAchieved++;
        } else if (e1rmExpiredOrMissing) {
          // No valid E1RM — establish from this session
          await upsertE1RM(userId, exercise.exercise_id, bestE1RMThisSession, bestE1RMSourceWeight, bestE1RMSourceReps);
        }
      }

      // Also update legacy personal_records for backward compatibility
      await updatePersonalRecord(userId, exercise.exercise_id, exercise.weight, exercise.reps, exercise.sets, isPR);

      totalExerciseXP += exerciseXP;

      exerciseLogs.push({
        exercise_id: exercise.exercise_id,
        exercise_name: exercise.exercise_name,
        weight: exercise.weight,
        reps: exercise.reps,
        sets: exercise.sets,
        xp: exerciseXP,
        is_pr: isPR,
        e1rm: bestE1RMThisSession > 0 ? Math.round(bestE1RMThisSession * 100) / 100 : null,
        coefficient: getExerciseCoefficient(exercise.exercise_name),
      });
    }

    // Apply streak multiplier
    const sessionXP = Math.round(totalExerciseXP * streakMultiplier);
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Level calculation
    const currentLevelXP = stats.level_xp || 0;
    const currentLevel = stats.level || 1;

    let cumulativeXPForPreviousLevels = 0;
    for (let level = 1; level < currentLevel; level++) {
      cumulativeXPForPreviousLevels += getXPForLevel(level);
    }

    const currentCumulativeXP = currentLevelXP < cumulativeXPForPreviousLevels
      ? cumulativeXPForPreviousLevels + currentLevelXP
      : currentLevelXP;

    const newCumulativeXP = currentCumulativeXP + sessionXP;
    const newMonthXP = (stats.current_month_xp || 0) + sessionXP;

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

    // Attendance & streak
    const today = new Date().toISOString().split('T')[0];
    const { data: todayAttendance } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .eq('workout_date', today)
      .maybeSingle();

    let newStreak = stats.current_streak || 0;
    let longestStreak = stats.longest_streak || 0;

    if (!todayAttendance) {
      await supabase.from('attendance').insert({ user_id: userId, workout_date: today });

      const lastWorkout = stats.last_workout_date ? new Date(stats.last_workout_date) : null;
      const todayDate = new Date(today);
      todayDate.setHours(0, 0, 0, 0);

      if (lastWorkout) {
        lastWorkout.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((todayDate.getTime() - lastWorkout.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff === 1) {
          newStreak = (stats.current_streak || 0) + 1;
        } else if (daysDiff > 1) {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }
      longestStreak = Math.max(newStreak, stats.longest_streak || 0);
    }

    // Gold (10% of session XP)
    const goldEarned = Math.floor(sessionXP * 0.1);
    const { data: currentGoldData } = await supabase
      .from('user_stats')
      .select('gold')
      .eq('user_id', userId)
      .single();
    const newGold = (currentGoldData?.gold || 0) + goldEarned;

    // Update stats
    const { error: updateError } = await supabase
      .from('user_stats')
      .update({
        level: newLevel,
        level_xp: newCumulativeXP,
        current_month_xp: newMonthXP,
        current_month: currentMonth,
        total_prs: (stats.total_prs || 0) + prsAchieved,
        current_streak: newStreak,
        longest_streak: longestStreak,
        total_workouts: (stats.total_workouts || 0) + (todayAttendance ? 0 : 1),
        last_workout_date: today,
        gold: newGold,
      })
      .eq('user_id', userId);

    if (updateError) return { error: updateError };

    // Save session
    const { data: session, error: sessionError } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: userId,
        session_date: today,
        total_xp: sessionXP,
        exercises_completed: exerciseLogs,
        prs_achieved: prsAchieved,
        streak_multiplier: streakMultiplier,
      })
      .select()
      .single();

    if (sessionError) return { error: sessionError };

    return {
      data: {
        sessionXP,
        exerciseXP: totalExerciseXP,
        prsAchieved,
        streakMultiplier,
        goldEarned,
        newLevel,
        levelProgress: {
          current: remainingXP,
          needed: getXPForLevel(newLevel),
          level: newLevel,
        },
        exerciseLogs,
      },
      error: null,
    };
  } catch (error: any) {
    return { error: { message: error.message || 'Failed to process workout' } };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function updatePersonalRecord(
  userId: string,
  exerciseId: string,
  weight: number,
  reps: number,
  sets: number,
  isPR: boolean
) {
  try {
    if (isPR) {
      await supabase
        .from('personal_records')
        .update({ is_current_pr: false })
        .eq('user_id', userId)
        .eq('exercise_id', exerciseId)
        .eq('is_current_pr', true);

      await supabase.from('personal_records').insert({
        user_id: userId,
        exercise_id: exerciseId,
        weight,
        reps,
        sets: sets || null,
        pr_date: new Date().toISOString().split('T')[0],
        is_current_pr: true,
      });
    } else {
      // Ensure a baseline record exists
      const { data: existing } = await supabase
        .from('personal_records')
        .select('id')
        .eq('user_id', userId)
        .eq('exercise_id', exerciseId)
        .limit(1)
        .maybeSingle();

      if (!existing) {
        await supabase.from('personal_records').insert({
          user_id: userId,
          exercise_id: exerciseId,
          weight,
          reps,
          sets: sets || null,
          pr_date: new Date().toISOString().split('T')[0],
          is_current_pr: true,
          points_earned: 0,
        });
      }
    }
  } catch {
    // Non-critical — don't fail the session
  }
}

// ─── Monthly XP History ──────────────────────────────────────────────────────

export async function getMonthlyXPHistory(userId: string, sortOrder: 'high' | 'low' = 'high') {
  try {
    const { data, error } = await supabase
      .from('monthly_xp')
      .select('*')
      .eq('user_id', userId)
      .order('month', { ascending: true });

    if (error) return { error, data: null };

    const xpMap = new Map((data || []).map((r: any) => [r.month, r]));

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let startMonth = currentMonth;
    if (data && data.length > 0) {
      const sorted = [...data].sort((a: any, b: any) => a.month.localeCompare(b.month));
      startMonth = sorted[0].month;
    }

    const allMonths: { id: string; month: string; total_xp: number; user_id: string }[] = [];
    const [startY, startM] = startMonth.split('-').map(Number);
    let y = startY;
    let m = startM;
    const [endY, endM] = currentMonth.split('-').map(Number);

    while (y < endY || (y === endY && m <= endM)) {
      const key = `${y}-${String(m).padStart(2, '0')}`;
      const existing = xpMap.get(key);
      allMonths.push(
        existing || { id: `generated-${key}`, month: key, total_xp: 0, user_id: userId }
      );
      m++;
      if (m > 12) { m = 1; y++; }
    }

    if (sortOrder === 'high') {
      allMonths.sort((a, b) => b.total_xp - a.total_xp);
    } else {
      allMonths.sort((a, b) => a.total_xp - b.total_xp);
    }

    return { data: allMonths, error: null };
  } catch (error: any) {
    return { error: { message: error.message }, data: null };
  }
}
