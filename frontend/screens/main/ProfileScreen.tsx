import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, ScrollView } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useUserStats } from '../../hooks/useUserStats';
import { supabase } from '../../config/supabase';
import { Colors } from '../../constants/colors';
import { getUserProfile, updateUsername } from '../../services/userProfileService';

interface ProfileScreenProps {
  onViewChallengeHistory?: () => void;
}

export default function ProfileScreen({ onViewChallengeHistory }: ProfileScreenProps) {
  const { user, signOut } = useAuth();
  const { stats, refreshStats } = useUserStats();
  const [bodyweight, setBodyweight] = useState(stats?.bodyweight?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    setLoadingProfile(true);
    const { data } = await getUserProfile(user.id);
    if (data) {
      setUsername(data.username);
    }
    setLoadingProfile(false);
  };

  const handleSaveBodyweight = async () => {
    if (!user || !bodyweight) {
      Alert.alert('Error', 'Please enter your bodyweight');
      return;
    }

    const weight = parseFloat(bodyweight);
    if (isNaN(weight) || weight <= 0) {
      Alert.alert('Error', 'Please enter a valid weight');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('user_stats')
      .update({ bodyweight: weight })
      .eq('user_id', user.id);

    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Bodyweight updated!');
      refreshStats();
    }
  };

  const handleSaveUsername = async () => {
    if (!user || !username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    if (username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }

    setSavingUsername(true);
    const { error } = await updateUsername(user.id, username.trim());
    setSavingUsername(false);

    if (error) {
      Alert.alert('Error', error.message || 'Failed to update username');
    } else {
      Alert.alert('Success', 'Username updated!');
      setEditingUsername(false);
      loadProfile();
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>PROFILE</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.infoCard}>
          <Text style={styles.label}>EMAIL</Text>
          <Text style={styles.value}>{user?.email}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.label}>USERNAME</Text>
          {editingUsername ? (
            <View style={styles.usernameEdit}>
              <TextInput
                style={styles.usernameInput}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                maxLength={50}
              />
              <View style={styles.usernameButtons}>
                <TouchableOpacity
                  style={[styles.usernameButton, styles.cancelButton]}
                  onPress={() => {
                    setEditingUsername(false);
                    loadProfile();
                  }}
                >
                  <Text style={styles.usernameButtonText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.usernameButton, styles.saveButton]}
                  onPress={handleSaveUsername}
                  disabled={savingUsername}
                >
                  <Text style={styles.usernameButtonText}>
                    {savingUsername ? 'SAVING...' : 'SAVE'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.usernameRow}>
              <Text style={styles.value}>{username || 'Not set'}</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setEditingUsername(true)}
              >
                <Text style={styles.editButtonText}>EDIT</Text>
              </TouchableOpacity>
            </View>
          )}
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
            <Text style={styles.statLabel}>TOTAL PRS</Text>
            <Text style={styles.statValue}>{stats?.total_prs || 0}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>CHALLENGES WON</Text>
            <Text style={styles.statValue}>{stats?.challenges_won || 0}</Text>
          </View>
        </View>
        {onViewChallengeHistory && (
          <TouchableOpacity
            style={styles.challengeHistoryButton}
            onPress={onViewChallengeHistory}
            activeOpacity={0.8}
          >
            <Text style={styles.challengeHistoryButtonText}>VIEW CHALLENGE HISTORY</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>BODYWEIGHT</Text>
        <Text style={styles.sectionSubtitle}>
          Required for accurate XP calculation
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Enter bodyweight (kg)"
          placeholderTextColor={Colors.textMuted}
          value={bodyweight}
          onChangeText={setBodyweight}
          keyboardType="decimal-pad"
        />
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={handleSaveBodyweight}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'SAVING...' : 'SAVE BODYWEIGHT'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.8}>
        <Text style={styles.signOutText}>SIGN OUT</Text>
      </TouchableOpacity>
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
  title: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 32,
    color: Colors.textPrimary,
    letterSpacing: 2,
    textShadowColor: Colors.primary,
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    textTransform: 'uppercase',
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
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 8,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 16,
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  saveButton: {
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
  saveButtonText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  signOutButton: {
    backgroundColor: Colors.danger,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 2,
    borderColor: Colors.textPrimary,
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  signOutText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  usernameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  usernameEdit: {
    marginTop: 8,
  },
  usernameInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  usernameButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  usernameButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  cancelButton: {
    backgroundColor: Colors.backgroundSecondary,
    borderColor: Colors.border,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.accent1,
  },
  usernameButtonText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editButtonText: {
    color: Colors.secondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
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
  challengeHistoryButton: {
    marginTop: 16,
    backgroundColor: Colors.secondary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.accent1,
  },
  challengeHistoryButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
