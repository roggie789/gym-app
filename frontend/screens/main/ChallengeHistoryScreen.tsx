import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Swords, ChevronRight, Coins } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useChallengeHistory } from '../../hooks/useQueryHooks';
import { Colors } from '../../constants/colors';

interface ChallengeHistoryScreenProps {
  onBack: () => void;
  onViewChallenge?: (challengeId: string) => void;
}

type FilterType = 'all' | 'won' | 'lost' | 'pending';

export default function ChallengeHistoryScreen({ onBack, onViewChallenge }: ChallengeHistoryScreenProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { data: challenges = [], isLoading: loading } = useChallengeHistory();
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredChallenges = challenges.filter((challenge) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return challenge.status === 'pending' || challenge.status === 'accepted';
    if (filter === 'won') return challenge.status === 'completed' && challenge.winner_id === user?.id;
    if (filter === 'lost') {
      return challenge.status === 'completed' && challenge.winner_id !== user?.id &&
        (challenge.challenger_id === user?.id || challenge.challenged_id === user?.id);
    }
    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getChallengeResult = (challenge: LiftOffChallenge): string => {
    if (challenge.status === 'pending') return 'PENDING';
    if (challenge.status === 'accepted') return 'ACTIVE';
    if (challenge.status === 'declined') return 'DECLINED';
    if (challenge.status === 'expired') return 'EXPIRED';
    if (challenge.status === 'completed') {
      return challenge.winner_id === user?.id ? 'WON' : 'LOST';
    }
    return challenge.status.toUpperCase();
  };

  const getResultColor = (result: string): string => {
    switch (result) {
      case 'WON': return Colors.success;
      case 'LOST': return Colors.danger;
      case 'PENDING': return Colors.warning;
      case 'ACTIVE': return Colors.primary;
      default: return Colors.textMuted;
    }
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'won', label: 'Won' },
    { key: 'lost', label: 'Lost' },
    { key: 'pending', label: 'Active' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <ChevronLeft size={18} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.backButtonLabel}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CHALLENGE HISTORY</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filters}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      ) : filteredChallenges.length === 0 ? (
        <View style={styles.centered}>
          <Swords size={32} color={Colors.textMuted} strokeWidth={1.5} />
          <Text style={styles.emptyText}>No challenges found</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {filteredChallenges.map((challenge) => {
            const isChallenger = challenge.challenger_id === user?.id;
            const opponent = isChallenger ? challenge.challenged_username : challenge.challenger_username;
            const result = getChallengeResult(challenge);
            const resultColor = getResultColor(result);

            return (
              <TouchableOpacity
                key={challenge.id}
                style={styles.card}
                onPress={() => onViewChallenge?.(challenge.id)}
                activeOpacity={0.7}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.opponentText}>vs {opponent || 'Unknown'}</Text>
                    <Text style={styles.exerciseText}>{challenge.exercise?.name || 'Exercise'}</Text>
                  </View>
                  <View style={[styles.resultBadge, { backgroundColor: `${resultColor}18`, borderColor: resultColor }]}>
                    <Text style={[styles.resultText, { color: resultColor }]}>{result}</Text>
                  </View>
                </View>

                <View style={styles.cardBottom}>
                  <View style={styles.detailChip}>
                    <Coins size={12} color={Colors.xpGold} strokeWidth={2} />
                    <Text style={styles.detailChipText}>{challenge.wager_xp.toLocaleString()} gold</Text>
                  </View>
                  <Text style={styles.dateText}>{formatDate(challenge.created_at)}</Text>
                  <ChevronRight size={16} color={Colors.textMuted} strokeWidth={2} />
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
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
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
  headerSpacer: { width: 64 },

  filters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },

  list: { flex: 1 },
  listContent: { gap: 10, paddingBottom: 32 },

  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: { flex: 1, gap: 2 },
  opponentText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  exerciseText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  resultText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detailChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.xpGold,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
    flex: 1,
  },
});
