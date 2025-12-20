import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/colors';
import { supabase } from '../../config/supabase';
import { sendFriendRequest, getFriends } from '../../services/friendsService';
import { getUserProfile } from '../../services/userProfileService';

interface ViewProfileScreenProps {
  userId: string;
  username?: string;
  onBack: () => void;
}

interface UserStats {
  level: number;
  level_xp: number;
  longest_streak: number;
  total_prs: number;
  challenges_won: number;
  total_workouts: number;
  current_streak: number;
}

export default function ViewProfileScreen({ userId, username: initialUsername, onBack }: ViewProfileScreenProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileUsername, setProfileUsername] = useState(initialUsername || '');
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [friendRequestPending, setFriendRequestPending] = useState(false);
  const [addingFriend, setAddingFriend] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [userId, user]);

  const loadProfile = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Load username
      if (!initialUsername) {
        const { data: profile } = await getUserProfile(userId);
        if (profile) {
          setProfileUsername(profile.username);
        }
      }

      // Load stats
      const { data: userStats } = await supabase
        .from('user_stats')
        .select('level, level_xp, longest_streak, total_prs, challenges_won, total_workouts, current_streak')
        .eq('user_id', userId)
        .single();

      if (userStats) {
        setStats({
          level: userStats.level || 1,
          level_xp: userStats.level_xp || 0,
          longest_streak: userStats.longest_streak || 0,
          total_prs: userStats.total_prs || 0,
          challenges_won: userStats.challenges_won || 0,
          total_workouts: userStats.total_workouts || 0,
          current_streak: userStats.current_streak || 0,
        });
      }

      // Only check friend status if viewing someone else's profile
      if (userId !== user.id) {
        // Check if already friends
        const { data: friends } = await getFriends(user.id);
        const friendIds = friends.map(f => f.user_id === user.id ? f.friend_id : f.user_id);
        setIsFriend(friendIds.includes(userId));

        // Check if friend request is pending
        const { data: pendingRequest } = await supabase
          .from('friends')
          .select('*')
          .or(`and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`)
          .eq('status', 'pending')
          .single();

        setFriendRequestPending(!!pendingRequest);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!user || addingFriend) return;

    setAddingFriend(true);
    const { error } = await sendFriendRequest(user.id, userId);
    setAddingFriend(false);

    if (error) {
      Alert.alert('Error', error.message || 'Failed to send friend request');
    } else {
      Alert.alert('Success', 'Friend request sent!');
      setFriendRequestPending(true);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
            <Text style={styles.backButtonText}>← BACK</Text>
          </TouchableOpacity>
          <Text style={styles.title}>PROFILE</Text>
          <View style={{ width: 80 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>PROFILE</Text>
        <View style={{ width: 80 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>USERNAME</Text>
        <View style={styles.infoCard}>
          <Text style={styles.value}>{profileUsername || 'Unknown'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>STATS</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>LEVEL</Text>
            <Text style={styles.statValue}>{stats?.level || 1}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>TOTAL XP</Text>
            <Text style={styles.statValue}>{(stats?.level_xp || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>HIGHEST STREAK</Text>
            <Text style={styles.statValue}>{stats?.longest_streak || 0}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>CURRENT STREAK</Text>
            <Text style={styles.statValue}>{stats?.current_streak || 0}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>TOTAL PRS</Text>
            <Text style={styles.statValue}>{stats?.total_prs || 0}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>CHALLENGES WON</Text>
            <Text style={styles.statValue}>{stats?.challenges_won || 0}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>TOTAL WORKOUTS</Text>
            <Text style={styles.statValue}>{stats?.total_workouts || 0}</Text>
          </View>
        </View>
      </View>

      {user && userId !== user.id && (
        <View style={styles.section}>
          {isFriend ? (
            <View style={styles.friendStatusCard}>
              <Text style={styles.friendStatusText}>✓ FRIENDS</Text>
            </View>
          ) : friendRequestPending ? (
            <View style={styles.friendStatusCard}>
              <Text style={styles.friendStatusText}>FRIEND REQUEST PENDING</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.addFriendButton, addingFriend && styles.buttonDisabled]}
              onPress={handleAddFriend}
              disabled={addingFriend}
              activeOpacity={0.8}
            >
              <Text style={styles.addFriendButtonText}>
                {addingFriend ? 'SENDING...' : 'ADD FRIEND'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 2,
    textShadowColor: Colors.primary,
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    textTransform: 'uppercase',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  section: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.secondary,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.accent1,
    marginBottom: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  infoCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  value: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginBottom: 8,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 24,
    color: Colors.primary,
    fontWeight: '900',
    letterSpacing: 1,
  },
  addFriendButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.accent1,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  addFriendButtonText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  friendStatusCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.success,
  },
  friendStatusText: {
    color: Colors.success,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});

