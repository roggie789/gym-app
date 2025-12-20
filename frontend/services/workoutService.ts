import { supabase } from '../config/supabase';
import { ExerciseLog, checkAndCreatePR } from './exerciseService';

export interface AttendanceRecord {
  id: string;
  user_id: string;
  workout_date: string;
  points_earned: number;
  notes?: string;
}

/**
 * Log a gym attendance/workout with exercises
 */
export async function logWorkout(
  userId: string,
  exercises: ExerciseLog[],
  date?: Date,
  notes?: string
) {
  const workoutDate = date || new Date();
  const dateString = workoutDate.toISOString().split('T')[0]; // YYYY-MM-DD format

  try {
    // Check if attendance already exists for this date
    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('user_id', userId)
      .eq('workout_date', dateString)
      .single();

    if (existing) {
      return { error: { message: 'Workout already logged for this date' } };
    }

    if (!exercises || exercises.length === 0) {
      return { error: { message: 'Please add at least one exercise' } };
    }

    // Get current stats to calculate streak and multiplier
    const { data: stats } = await supabase
      .from('user_stats')
      .select('current_streak, last_workout_date')
      .eq('user_id', userId)
      .single();

    let newStreak = 1;
    let streakMultiplier = 1.0;

    if (stats) {
      const lastWorkout = stats.last_workout_date
        ? new Date(stats.last_workout_date)
        : null; 
      const today = new Date(workoutDate);
      today.setHours(0, 0, 0, 0);
      
      if (lastWorkout) {
        lastWorkout.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor(
          (today.getTime() - lastWorkout.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff === 1) {
          // Consecutive day - continue streak
          newStreak = (stats.current_streak || 0) + 1;
          // Streak multiplier: 1.0x for day 1, 1.1x for day 2, 1.2x for day 3, etc. (max 2.0x)
          streakMultiplier = Math.min(1.0 + (newStreak - 1) * 0.1, 2.0);
        } else if (daysDiff === 0) {
          return { error: { message: 'Workout already logged for this date' } };
        } else {
          // Streak broken - start new streak
          newStreak = 1;
          streakMultiplier = 1.0;
        }
      }
    }

    // Check for PRs and calculate points
    let attendancePoints = 10; // Base attendance points
    let prPoints = 0;
    const prsAchieved: string[] = [];

    for (const exercise of exercises) {
      const prResult = await checkAndCreatePR(
        userId,
        exercise.exercise_id,
        exercise.weight,
        exercise.reps,
        exercise.sets
      );

      if (prResult.isNewPR) {
        prPoints += prResult.pointsEarned;
        prsAchieved.push(exercise.exercise_name);
      }
    }

    // Apply streak multiplier to attendance points only (not PR points)
    const totalPoints = Math.round(attendancePoints * streakMultiplier) + prPoints;

    // Insert attendance record
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance')
      .insert({
        user_id: userId,
        workout_date: dateString,
        points_earned: totalPoints,
        notes: notes || null,
      })
      .select()
      .single();

    if (attendanceError) {
      return { error: attendanceError };
    }

    // Update user stats
    const { data: currentStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (currentStats) {
      const updates: any = {
        total_points: (currentStats.total_points || 0) + totalPoints,
        current_streak: newStreak,
        total_workouts: (currentStats.total_workouts || 0) + 1,
        total_prs: (currentStats.total_prs || 0) + prsAchieved.length,
        last_workout_date: dateString,
      };

      if (newStreak > (currentStats.longest_streak || 0)) {
        updates.longest_streak = newStreak;
      }

      // Calculate level based on total points (level = floor(sqrt(points/100)) + 1)
      const newLevel = Math.floor(Math.sqrt((updates.total_points) / 100)) + 1;
      updates.level = newLevel;

      await supabase
        .from('user_stats')
        .update(updates)
        .eq('user_id', userId);
    }

    return {
      data: attendance,
      error: null,
      prsAchieved,
      pointsBreakdown: {
        attendance: Math.round(attendancePoints * streakMultiplier),
        prs: prPoints,
        streakMultiplier: streakMultiplier.toFixed(1),
      },
    };
  } catch (error: any) {
    return { error: { message: error.message || 'Failed to log workout' } };
  }
}

/**
 * Get attendance history for a user
 */
export async function getAttendanceHistory(userId: string, limit: number = 30) {
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .order('workout_date', { ascending: false })
      .limit(limit);

    if (error) {
      return { error, data: null };
    }

    return { data, error: null };
  } catch (error: any) {
    return { error: { message: error.message }, data: null };
  }
}

