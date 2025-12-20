import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface UserStats {
  id: string;
  user_id: string;
  level: number;
  total_points: number;
  current_streak: number;
  longest_streak: number;
  total_workouts: number;
  total_prs: number;
  last_workout_date: string | null;
  bodyweight?: number;
  level_xp: number;
  current_month_xp: number;
  current_month?: string;
}

export function useUserStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setStats(null);
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (fetchError) {
          console.error('Error fetching stats:', fetchError);
          setError(fetchError.message);
        } else {
          setStats(data);
          setError(null);
        }
      } catch (err: any) {
        console.error('Error in fetchStats:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Subscribe to changes in user_stats
    const subscription = supabase
      .channel('user_stats_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_stats',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            setStats(payload.new as UserStats);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const refreshStats = async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!fetchError && data) {
        setStats(data);
      }
    } catch (err) {
      console.error('Error refreshing stats:', err);
    }
  };

  return { stats, loading, error, refreshStats };
}

