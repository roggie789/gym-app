import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { getUserChallenges, LiftOffChallenge } from '../../services/liftOffService';
import { Colors } from '../../constants/colors';

interface ChallengeHistoryScreenProps {
  onBack: () => void;
  onViewChallenge?: (challengeId: string) => void;
}

export default function ChallengeHistoryScreen({ onBack, onViewChallenge }: ChallengeHistoryScreenProps) {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<LiftOffChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'won' | 'lost' | 'pending'>('all');

  useEffect(() => {
    loadChallenges();
  }, [user, filter]);

  const loadChallenges = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await getUserChallenges(user.id);
    if (error) {
      console.error('Error loading challenges:', error);
    } else {
      setChallenges(data || []);
    }
    setLoading(false);
  };

  const filteredChallenges = challenges.filter((challenge) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return challenge.status === 'pending';
    if (filter === 'won') {
      return challenge.status === 'completed' && challenge.winner_id === user?.id;
    }
    if (filter === 'lost') {
      return (
        challenge.status === 'completed' &&
        challenge.winner_id !== user?.id &&
        (challenge.challenger_id === user?.id || challenge.challenged_id === user?.id)
      );
    }
    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getChallengeResult = (challenge: LiftOffChallenge): string => {
    if (challenge.status === 'pending') return 'PENDING';
    if (challenge.status === 'declined') return 'DECLINED';
    if (challenge.status === 'expired') return 'EXPIRED';
    if (challenge.status === 'completed') {
      if (challenge.winner_id === user?.id) return 'WON';
      return 'LOST';
    }
    return 'ACTIVE';
  };

  const getChallengeResultColor = (result: string): string => {
    if (result === 'WON') return Colors.success;
    if (result === 'LOST') return Colors.danger;
    if (result === 'PENDING') return Colors.warning;
    return Colors.textSecondary;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>CHALLENGE HISTORY</Text>
        <View style={{ width: 80 }} />
      </View>

      <View style={styles.filters}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>ALL</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'won' && styles.filterButtonActive]}
          onPress={() => setFilter('won')}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterText, filter === 'won' && styles.filterTextActive]}>WON</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'lost' && styles.filterButtonActive]}
          onPress={() => setFilter('lost')}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterText, filter === 'lost' && styles.filterTextActive]}>LOST</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'pending' && styles.filterButtonActive]}
          onPress={() => setFilter('pending')}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>PENDING</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : filteredChallenges.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>NO CHALLENGES FOUND</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {filteredChallenges.map((challenge) => {
            const isChallenger = challenge.challenger_id === user?.id;
            const opponent = isChallenger ? challenge.challenged_username : challenge.challenger_username;
            const result = getChallengeResult(challenge);
            const resultColor = getChallengeResultColor(result);

            return (
              <TouchableOpacity
                key={challenge.id}
                style={styles.challengeCard}
                onPress={() => onViewChallenge?.(challenge.id)}
                activeOpacity={0.8}
              >
                <View style={styles.challengeHeader}>
                  <View style={styles.challengeHeaderLeft}>
                    <Text style={styles.challengeOpponent}>VS {opponent?.toUpperCase() || 'OPPONENT'}</Text>
                    <Text style={styles.challengeExercise}>
                      {challenge.exercise?.name.toUpperCase() || 'EXERCISE'}
                    </Text>
                  </View>
                  <View style={[styles.resultBadge, { borderColor: resultColor }]}>
                    <Text style={[styles.resultText, { color: resultColor }]}>{result}</Text>
                  </View>
                </View>

                <View style={styles.challengeDetails}>
                  <View style={styles.challengeDetailRow}>
                    <Text style={styles.challengeDetailLabel}>WAGER:</Text>
                    <Text style={styles.challengeDetailValue}>{challenge.wager_xp.toLocaleString()} XP</Text>
                  </View>
                  <View style={styles.challengeDetailRow}>
                    <Text style={styles.challengeDetailLabel}>DATE:</Text>
                    <Text style={styles.challengeDetailValue}>{formatDate(challenge.created_at)}</Text>
                  </View>
                  {challenge.status === 'completed' && challenge.challenger_weight && challenge.challenged_weight && (
                    <View style={styles.challengeDetailRow}>
                      <Text style={styles.challengeDetailLabel}>WEIGHTS:</Text>
                      <Text style={styles.challengeDetailValue}>
                        {challenge.challenger_weight}kg vs {challenge.challenged_weight}kg
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
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
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.accent1,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  filterTextActive: {
    color: Colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  challengeCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.secondary,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  challengeHeaderLeft: {
    flex: 1,
  },
  challengeOpponent: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  challengeExercise: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accent1,
    letterSpacing: 0.5,
  },
  resultBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: Colors.backgroundSecondary,
  },
  resultText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  challengeDetails: {
    gap: 8,
  },
  challengeDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  challengeDetailLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  challengeDetailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});

