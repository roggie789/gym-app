import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile } from '../services/userProfileService';
import { getUserChallenges, getChallengeById } from '../services/liftOffService';
import { getFriends, getPendingRequests } from '../services/friendsService';
import { getUserGroups, getPublicGroups } from '../services/groupsService';
import { getExercises } from '../services/exerciseService';
import { supabase } from '../config/supabase';

// ── Query Keys ──

export const queryKeys = {
  username: (userId: string) => ['username', userId] as const,
  challenges: (userId: string) => ['challenges', userId] as const,
  challengeDetail: (challengeId: string) => ['challengeDetail', challengeId] as const,
  challengeHistory: (userId: string) => ['challengeHistory', userId] as const,
  friends: (userId: string) => ['friends', userId] as const,
  pendingRequests: (userId: string) => ['pendingRequests', userId] as const,
  myGroups: (userId: string) => ['myGroups', userId] as const,
  publicGroups: (userId: string) => ['publicGroups', userId] as const,
  templates: (userId: string) => ['templates', userId] as const,
  exercises: ['exercises'] as const,
};

// ── Home Screen Hooks ──

export function useUsername() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.username(user?.id ?? ''),
    queryFn: async () => {
      const { data } = await getUserProfile(user!.id);
      return data?.username ?? 'User';
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 min — username rarely changes
  });
}

export function useChallenges() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.challenges(user?.id ?? ''),
    queryFn: async () => {
      const { data } = await getUserChallenges(user!.id);
      if (!data) return [];
      return data.filter(c =>
        c.status === 'pending' ||
        (c.status === 'accepted' &&
          (!c.challenger_completed_at || !c.challenged_completed_at) &&
          new Date(c.expires_at || '') > new Date())
      ).slice(0, 10);
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });
}

export function useChallengeDetail(challengeId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.challengeDetail(challengeId),
    queryFn: async () => {
      const { data, error } = await getChallengeById(challengeId, user!.id);
      if (data && !error) return data;
      const { data: all } = await getUserChallenges(user!.id);
      return all?.find(c => c.id === challengeId) ?? null;
    },
    enabled: !!user && !!challengeId,
    staleTime: 60 * 1000,
  });
}

export function useChallengeHistory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.challengeHistory(user?.id ?? ''),
    queryFn: async () => {
      const { data } = await getUserChallenges(user!.id);
      return data || [];
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });
}

/**
 * Subscribe to real-time changes on lift_off_challenges and auto-invalidate
 * the React Query cache. Call this once from an always-mounted component.
 */
export function useChallengesRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const invalidateAll = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.challenges(user.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.challengeHistory(user.id) });
      queryClient.invalidateQueries({ queryKey: ['challengeDetail'] });
    };

    const channel = supabase
      .channel('challenges_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lift_off_challenges',
          filter: `challenger_id=eq.${user.id}`,
        },
        invalidateAll
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lift_off_challenges',
          filter: `challenged_id=eq.${user.id}`,
        },
        invalidateAll
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);
}

// ── Friends Screen Hooks ──

export function useFriends() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.friends(user?.id ?? ''),
    queryFn: async () => {
      const { data } = await getFriends(user!.id);
      return data || [];
    },
    enabled: !!user,
    staleTime: 60 * 1000, // 1 min
  });
}

export function usePendingFriendRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.pendingRequests(user?.id ?? ''),
    queryFn: async () => {
      const { data } = await getPendingRequests(user!.id);
      return data || [];
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30s
  });
}

// ── Leaderboard Screen Hooks ──

export function useMyGroups() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.myGroups(user?.id ?? ''),
    queryFn: async () => {
      const { data } = await getUserGroups(user!.id);
      return (data || []).map((item: any) => ({
        ...item.group,
        user_role: item.role,
      }));
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 min
  });
}

export function usePublicGroups(enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.publicGroups(user?.id ?? ''),
    queryFn: async () => {
      const { data } = await getPublicGroups(user!.id);
      return data || [];
    },
    enabled: !!user && enabled,
    staleTime: 2 * 60 * 1000, // 2 min
  });
}

// ── Templates / Decks Hooks ──

export function useTemplates() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.templates(user?.id ?? ''),
    queryFn: async () => {
      const { data } = await supabase
        .from('session_templates')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 min — only changes on user action
  });
}

export function useExercises() {
  return useQuery({
    queryKey: queryKeys.exercises,
    queryFn: async () => {
      const { data } = await getExercises();
      return data || [];
    },
    staleTime: 30 * 60 * 1000, // 30 min — exercise catalog rarely changes
  });
}

// ── Invalidation Helpers ──

export function useInvalidate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return {
    challenges: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.challenges(user.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.challengeHistory(user.id) });
      }
    },
    challengeDetail: (challengeId: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.challengeDetail(challengeId) });
    },
    friends: () => {
      if (user) queryClient.invalidateQueries({ queryKey: queryKeys.friends(user.id) });
    },
    pendingRequests: () => {
      if (user) queryClient.invalidateQueries({ queryKey: queryKeys.pendingRequests(user.id) });
    },
    myGroups: () => {
      if (user) queryClient.invalidateQueries({ queryKey: queryKeys.myGroups(user.id) });
    },
    publicGroups: () => {
      if (user) queryClient.invalidateQueries({ queryKey: queryKeys.publicGroups(user.id) });
    },
    templates: () => {
      if (user) queryClient.invalidateQueries({ queryKey: queryKeys.templates(user.id) });
    },
    username: () => {
      if (user) queryClient.invalidateQueries({ queryKey: queryKeys.username(user.id) });
    },
  };
}
