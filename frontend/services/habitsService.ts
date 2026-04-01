import { supabase } from '../config/supabase';

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface HabitCompletion {
  id: string;
  habit_id: string;
  user_id: string;
  completed_date: string; // YYYY-MM-DD
}

const HABIT_COLORS = [
  '#F97316', // Orange
  '#3B82F6', // Blue
  '#10B981', // Green
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#14B8A6', // Teal
  '#6366F1', // Indigo
];

export function getHabitColor(index: number): string {
  return HABIT_COLORS[index % HABIT_COLORS.length];
}

export async function getUserHabits(userId: string) {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  return { data: (data as Habit[]) || [], error };
}

export async function createHabit(userId: string, name: string, color: string) {
  const { data, error } = await supabase
    .from('habits')
    .insert({ user_id: userId, name, color })
    .select()
    .single();

  return { data: data as Habit | null, error };
}

export async function deleteHabit(habitId: string) {
  await supabase.from('habit_completions').delete().eq('habit_id', habitId);
  const { error } = await supabase.from('habits').delete().eq('id', habitId);
  return { error };
}

export async function getCompletionsForMonth(userId: string, year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('habit_completions')
    .select('*')
    .eq('user_id', userId)
    .gte('completed_date', startDate)
    .lte('completed_date', endDate);

  return { data: (data as HabitCompletion[]) || [], error };
}

export async function toggleCompletion(userId: string, habitId: string, date: string) {
  const { data: existing } = await supabase
    .from('habit_completions')
    .select('id')
    .eq('user_id', userId)
    .eq('habit_id', habitId)
    .eq('completed_date', date)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('habit_completions').delete().eq('id', existing.id);
    return { added: false, error };
  } else {
    const { error } = await supabase
      .from('habit_completions')
      .insert({ user_id: userId, habit_id: habitId, completed_date: date });
    return { added: true, error };
  }
}
