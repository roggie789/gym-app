import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Animated,
} from 'react-native';
import { ChevronLeft, Coins, LogOut, Trophy, Swords } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useUserStats } from '../../hooks/useUserStats';
import { supabase } from '../../config/supabase';
import { Colors } from '../../constants/colors';
import { getUserProfile, updateUsername } from '../../services/userProfileService';
import { MobileShell } from '../../components/MobileShell';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

interface ProfileScreenProps {
  onViewChallengeHistory?: () => void;
  onViewMonthlyXP?: () => void;
  onClose?: () => void;
}

export default function ProfileScreen({ onViewChallengeHistory, onViewMonthlyXP, onClose }: ProfileScreenProps) {
  const { user, signOut } = useAuth();
  const { showAlert } = useAlert();
  const { stats, refreshStats } = useUserStats();
  const [bodyweight, setBodyweight] = useState('');
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    loadProfile();
  }, [user]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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
      showAlert({ title: 'Error', message: 'Please enter your bodyweight' });
      return;
    }
    const weight = parseFloat(bodyweight);
    if (isNaN(weight) || weight <= 0) {
      showAlert({ title: 'Error', message: 'Please enter a valid weight' });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('user_stats')
      .update({ bodyweight: weight })
      .eq('user_id', user.id);
    setSaving(false);
    if (error) {
      showAlert({ title: 'Error', message: error.message });
    } else {
      showAlert({ title: 'Success', message: 'Bodyweight updated!' });
      setBodyweight('');
    }
  };

  const handleSaveUsername = async () => {
    if (!user || !username.trim()) {
      showAlert({ title: 'Error', message: 'Please enter a username' });
      return;
    }
    if (username.length < 3) {
      showAlert({ title: 'Error', message: 'Username must be at least 3 characters' });
      return;
    }
    setSavingUsername(true);
    const { error } = await updateUsername(user.id, username.trim());
    setSavingUsername(false);
    if (error) {
      showAlert({ title: 'Error', message: error.message || 'Failed to update username' });
    } else {
      showAlert({ title: 'Success', message: 'Username updated!' });
      setEditingUsername(false);
      loadProfile();
    }
  };

  const handleSignOut = async () => {
    showAlert({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ],
    });
  };

  const profileStats = useMemo(
    () => [
      { label: 'Level', value: `${stats?.level || 1}`, testId: 'level' },
      { label: 'Total XP', value: (stats?.level_xp || 0).toLocaleString(), testId: 'xp' },
      { label: 'Total PRs', value: `${stats?.total_prs || 0}`, testId: 'prs' },
      { label: 'Workouts', value: `${stats?.total_workouts || 0}`, testId: 'workouts' },
      { label: 'Current streak', value: `${stats?.current_streak || 0}d`, testId: 'streak' },
      { label: 'Longest streak', value: `${stats?.longest_streak || 0}d`, testId: 'longest' },
    ],
    [stats],
  );

  const animatedStyle = {
    opacity: fadeAnim,
    transform: [{ translateY: slideAnim }],
  };

  return (
    <MobileShell noTabBar>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[styles.container, animatedStyle]}>
          {/* Header */}
          <View style={styles.header}>
            {onClose ? (
              <Button
                variant="ghost"
                onPress={onClose}
                style={styles.backButton}
                testID="button-back-home"
              >
                <ChevronLeft size={18} color={Colors.textSecondary} strokeWidth={2} />
                <Text style={styles.backButtonLabel}>Back</Text>
              </Button>
            ) : (
              <View style={styles.headerSpacer} />
            )}
            <Text style={styles.headerTitle}>PROFILE</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Profile Card */}
          <Card style={styles.profileCard}>
            <View style={styles.profileTop}>
              <View style={styles.profileInfo}>
                {editingUsername ? (
                  <View style={styles.usernameEditRow}>
                    <TextInput
                      style={styles.usernameInput}
                      value={username}
                      onChangeText={setUsername}
                      placeholder="Username"
                      placeholderTextColor={Colors.textMuted}
                      autoCapitalize="none"
                      maxLength={50}
                    />
                    <View style={styles.usernameActions}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => {
                          setEditingUsername(false);
                          loadProfile();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onPress={handleSaveUsername}
                        disabled={savingUsername}
                      >
                        {savingUsername ? 'Saving...' : 'Save'}
                      </Button>
                    </View>
                  </View>
                ) : (
                  <Text
                    style={styles.profileUsername}
                    testID="text-profile-username"
                    onPress={() => setEditingUsername(true)}
                  >
                    {username || 'Tap to set username'}
                  </Text>
                )}
                <Text style={styles.profileHint} testID="text-profile-hint">
                  Customize your stats for better XP math.
                </Text>
              </View>
              <Badge
                variant="default"
                testID="badge-profile-level"
                style={styles.levelBadge}
              >
                Lv {stats?.level || 1}
              </Badge>
            </View>

            {/* Bodyweight */}
            <View style={styles.bodyweightRow}>
              <Text style={styles.fieldLabel}>Bodyweight (kg)</Text>
              <View style={styles.bodyweightInput}>
                <TextInput
                  testID="input-bodyweight"
                  style={styles.inputField}
                  placeholder={stats?.bodyweight ? `${stats.bodyweight}` : 'e.g. 80'}
                  placeholderTextColor={Colors.textMuted}
                  value={bodyweight}
                  onChangeText={setBodyweight}
                  keyboardType="decimal-pad"
                />
                <Button
                  size="sm"
                  onPress={handleSaveBodyweight}
                  disabled={saving}
                  style={styles.saveBodyweightBtn}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </View>
            </View>

            {/* Monthly XP */}
            <View style={styles.infoRow}>
              <View style={styles.infoRowLeft}>
                <Trophy size={16} color={Colors.primary} strokeWidth={2.4} />
                <Text style={styles.infoRowText} testID="text-profile-monthly-xp">
                  Monthly XP: {(stats?.current_month_xp || 0).toLocaleString()}
                </Text>
              </View>
              {onViewMonthlyXP && (
                <Button
                  testID="button-xp-history"
                  variant="secondary"
                  size="sm"
                  onPress={onViewMonthlyXP}
                >
                  History
                </Button>
              )}
            </View>

            {/* Challenge History */}
            <View style={styles.infoRow}>
              <View style={styles.infoRowLeft}>
                <Swords size={16} color={Colors.primary} strokeWidth={2.4} />
                <Text style={styles.infoRowText}>Challenge History</Text>
              </View>
              {onViewChallengeHistory && (
                <Button
                  testID="button-challenge-history"
                  variant="secondary"
                  size="sm"
                  onPress={onViewChallengeHistory}
                >
                  View
                </Button>
              )}
            </View>

            {/* Gold */}
            <View style={styles.infoRow}>
              <View style={styles.infoRowLeft}>
                <Coins size={16} color={Colors.xpGold} strokeWidth={2.4} />
                <Text style={styles.infoRowText} testID="text-profile-gold">
                  Gold: {(stats?.gold || 0).toLocaleString()}
                </Text>
              </View>
              <Badge variant="secondary" testID="badge-gold">
                Wallet
              </Badge>
            </View>
          </Card>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {profileStats.map((s) => (
              <Card
                key={s.testId}
                style={styles.statCard}
              >
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={styles.statValue} testID={`text-profile-stat-${s.testId}`}>
                  {s.value}
                </Text>
              </Card>
            ))}
          </View>

          {/* Gold Earned Card */}
          <Card style={styles.goldEarnedCard}>
            <View style={styles.goldEarnedRow}>
              <View>
                <Text style={styles.statLabel}>Gold earned</Text>
                <Text style={styles.statValue} testID="text-profile-stat-gold">
                  {(stats?.gold || 0).toLocaleString()}
                </Text>
              </View>
              <Badge variant="default" testID="badge-gold-earned" style={styles.goldPlusBadge}>
                +
              </Badge>
            </View>
          </Card>

          {/* Logout */}
          <Button
            testID="button-logout"
            variant="secondary"
            onPress={handleSignOut}
            style={styles.logoutButton}
          >
            <LogOut size={16} color={Colors.textPrimary} strokeWidth={2.25} />
            Logout
          </Button>
        </Animated.View>
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    gap: 16,
  },
  container: {
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    height: 40,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButtonLabel: {
    fontSize: 16,
    lineHeight: 20,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerSpacer: {
    width: 64,
  },
  profileCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundCardTransparent,
    padding: 20,
    gap: 14,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileUsername: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  profileHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  levelBadge: {
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  usernameEditRow: {
    gap: 8,
  },
  usernameInput: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  usernameActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  bodyweightRow: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  bodyweightInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputField: {
    flex: 1,
    height: 44,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveBodyweightBtn: {
    height: 36,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundCard,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoRowText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundCardTransparent,
    padding: 14,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 4,
    letterSpacing: -0.3,
  },
  goldEarnedCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundCardTransparent,
    padding: 14,
  },
  goldEarnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goldPlusBadge: {
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  logoutButton: {
    height: 48,
    marginBottom: 20,
  },
});
