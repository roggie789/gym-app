import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useUserStats } from '../../hooks/useUserStats';
import { getXPForLevel } from '../../services/xpService';
import { Colors } from '../../constants/colors';

interface HomeScreenProps {
  onStartSession: () => void;
}

export default function HomeScreen({ onStartSession }: HomeScreenProps) {
  const { user } = useAuth();
  const { stats, loading, refreshStats } = useUserStats();

  useEffect(() => {
    refreshStats();
  }, []);

  if (loading || !stats) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const currentMonth = stats.current_month || new Date().toISOString().slice(0, 7);
  const monthName = new Date(currentMonth + '-01').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const xpForCurrentLevel = getXPForLevel(stats.level);
  const xpForNextLevel = stats.level < 100 ? getXPForLevel(stats.level + 1) : xpForCurrentLevel;
  const progressPercent = stats.level < 100
    ? (stats.level_xp / xpForNextLevel) * 100
    : 100;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero Section - Level & XP */}
      <View style={styles.heroSection}>
        <View style={styles.levelBadge}>
          <View style={styles.levelBadgeInner}>
            <Text style={styles.levelLabel}>LEVEL</Text>
            <Text style={styles.levelNumber}>{stats.level}</Text>
          </View>
          {stats.level < 100 && (
            <View style={styles.xpSection}>
              <Text style={styles.xpText}>
                {stats.level_xp.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP
              </Text>
              <View style={styles.progressBarOuter}>
                <View style={[styles.progressBarInner, { width: `${progressPercent}%` }]} />
                <View style={styles.progressBarGlow} />
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Monthly Challenge Card */}
      <View style={styles.challengeCard}>
        <View style={styles.challengeHeader}>
          <Text style={styles.challengeTitle}>MONTHLY CHALLENGE</Text>
          <Text style={styles.challengeMonth}>{monthName.toUpperCase()}</Text>
        </View>
        <View style={styles.challengeContent}>
          <Text style={styles.challengeXP}>{stats.current_month_xp.toLocaleString()}</Text>
          <Text style={styles.challengeLabel}>TOTAL XP</Text>
        </View>
      </View>

      {/* Stats Grid - Game Cards */}
      <View style={styles.statsGrid}>
        <TouchableOpacity style={[styles.statCard, styles.statCard1]} activeOpacity={0.8}>
          <View style={styles.statCardGlow} />
          <Text style={styles.statIcon}>🔥</Text>
          <Text style={styles.statValue}>{stats.current_streak}</Text>
          <Text style={styles.statLabel}>STREAK</Text>
          <View style={styles.statCardBorder} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.statCard, styles.statCard2]} activeOpacity={0.8}>
          <View style={styles.statCardGlow} />
          <Text style={styles.statIcon}>💪</Text>
          <Text style={styles.statValue}>{stats.total_prs}</Text>
          <Text style={styles.statLabel}>PRs</Text>
          <View style={styles.statCardBorder} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.statCard, styles.statCard3]} activeOpacity={0.8}>
          <View style={styles.statCardGlow} />
          <Text style={styles.statIcon}>📊</Text>
          <Text style={styles.statValue}>{stats.total_workouts}</Text>
          <Text style={styles.statLabel}>WORKOUTS</Text>
          <View style={styles.statCardBorder} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.statCard, styles.statCard4]} activeOpacity={0.8}>
          <View style={styles.statCardGlow} />
          <Text style={styles.statIcon}>⭐</Text>
          <Text style={styles.statValue}>{stats.longest_streak}</Text>
          <Text style={styles.statLabel}>BEST STREAK</Text>
          <View style={styles.statCardBorder} />
        </TouchableOpacity>
      </View>

      {/* Main Action Button */}
      <TouchableOpacity 
        style={styles.playButton} 
        onPress={onStartSession} 
        activeOpacity={0.9}
      >
        <View style={styles.playButtonGlow} />
        <View style={styles.playButtonContent}>
          <Text style={styles.playButtonIcon}>⚔️</Text>
          <Text style={styles.playButtonText}>START WORKOUT</Text>
        </View>
        <View style={styles.playButtonShine} />
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
    padding: 16,
    paddingBottom: 100,
  },
  heroSection: {
    marginBottom: 24,
  },
  levelBadge: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.levelPurple,
    shadowColor: Colors.levelPurple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  levelBadgeInner: {
    alignItems: 'center',
    marginBottom: 16,
  },
  levelLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.accent1,
    letterSpacing: 2,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  levelNumber: {
    fontSize: 56,
    fontWeight: '900',
    color: Colors.textPrimary,
    textShadowColor: Colors.levelPurple,
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  xpSection: {
    marginTop: 12,
  },
  xpText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.xpGold,
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  progressBarOuter: {
    height: 16,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.border,
    position: 'relative',
  },
  progressBarInner: {
    height: '100%',
    backgroundColor: Colors.xpGold,
    borderRadius: 6,
    shadowColor: Colors.xpGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  progressBarGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.xpGold,
    opacity: 0.3,
  },
  challengeCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  challengeTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  challengeMonth: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  challengeContent: {
    alignItems: 'center',
  },
  challengeXP: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.textPrimary,
    textShadowColor: Colors.primary,
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
    marginBottom: 4,
  },
  challengeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  statCard1: {
    borderColor: Colors.streakFire,
  },
  statCard2: {
    borderColor: Colors.prGreen,
  },
  statCard3: {
    borderColor: Colors.accent4,
  },
  statCard4: {
    borderColor: Colors.accent1,
  },
  statCardGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    opacity: 0.1,
  },
  statCardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.textPrimary,
    opacity: 0.1,
  },
  statIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 40,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  playButton: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    padding: 22,
    marginTop: 8,
    borderWidth: 3,
    borderColor: Colors.accent1,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  playButtonGlow: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.accent1,
    opacity: 0.2,
  },
  playButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  playButtonIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  playButtonText: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  playButtonShine: {
    position: 'absolute',
    top: 0,
    left: -100,
    width: 50,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ skewX: '-20deg' }],
  },
});

