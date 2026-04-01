import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Swords, Coins, Trophy, Clock, Dumbbell } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/colors';
import { useCustomAlert } from '../../utils/alert';
import { useChallengeDetail, useInvalidate } from '../../hooks/useQueryHooks';
import {
  submitLiftWeight,
  acceptChallenge,
  declineChallenge,
} from '../../services/liftOffService';

interface LiftOffDetailScreenProps {
  challengeId: string;
  onBack: () => void;
  onChallengeUpdate?: () => void;
}

export default function LiftOffDetailScreen({
  challengeId,
  onBack,
  onChallengeUpdate,
}: LiftOffDetailScreenProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { showAlert, AlertComponent } = useCustomAlert();
  const invalidate = useInvalidate();
  const { data: challenge = null, isLoading: loading } = useChallengeDetail(challengeId);
  const [submitting, setSubmitting] = useState(false);
  const [weight, setWeight] = useState('');
  const [showWeightInput, setShowWeightInput] = useState(false);

  const refreshChallenge = () => {
    invalidate.challengeDetail(challengeId);
    invalidate.challenges();
  };

  const handleSubmitWeight = async () => {
    if (!user || !challenge) return;
    const weightValue = parseFloat(weight);
    if (isNaN(weightValue) || weightValue <= 0) {
      showAlert({ title: 'Error', message: 'Please enter a valid weight', type: 'error' });
      return;
    }

    setSubmitting(true);
    const { error } = await submitLiftWeight(challengeId, user.id, weightValue);
    setSubmitting(false);

    if (error) {
      showAlert({ title: 'Error', message: error.message || 'Failed to submit weight', type: 'error' });
      return;
    }

    showAlert({ title: 'Success', message: 'Weight submitted! Waiting for opponent...', type: 'success' });
    setShowWeightInput(false);
    setWeight('');
    refreshChallenge();
  };

  const handleAccept = async () => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await acceptChallenge(challengeId, user.id);
    setSubmitting(false);

    if (error) {
      showAlert({ title: 'Error', message: error.message || 'Failed to accept challenge', type: 'error' });
      return;
    }

    showAlert({ title: 'Success', message: 'Challenge accepted! You have 7 days to complete your lift.', type: 'success' });
    refreshChallenge();
    onChallengeUpdate?.();
  };

  const handleDecline = async () => {
    if (!user) return;
    showAlert({
      title: 'Decline Challenge',
      message: 'Are you sure you want to decline?',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            const { error } = await declineChallenge(challengeId, user.id);
            setSubmitting(false);
            if (error) {
              showAlert({ title: 'Error', message: error.message || 'Failed to decline', type: 'error' });
              return;
            }
            showAlert({ title: 'Challenge Declined', message: 'The challenge has been declined.', type: 'info' });
            refreshChallenge();
            onChallengeUpdate?.();
            onBack();
          },
        },
      ],
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!challenge) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <ChevronLeft size={18} color={Colors.textSecondary} strokeWidth={2} />
            <Text style={styles.backButtonLabel}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>LIFT OFF</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.errorText}>Challenge not found</Text>
        </View>
      </View>
    );
  }

  const isChallenger = challenge.challenger_id === user?.id;
  const isChallenged = challenge.challenged_id === user?.id;
  const opponent = isChallenger ? challenge.challenged_username : challenge.challenger_username;
  const hasCompleted = isChallenger ? !!challenge.challenger_completed_at : !!challenge.challenged_completed_at;
  const opponentCompleted = isChallenger ? !!challenge.challenged_completed_at : !!challenge.challenger_completed_at;
  const myWeight = isChallenger ? challenge.challenger_weight : challenge.challenged_weight;
  const opponentWeight = isChallenger ? challenge.challenged_weight : challenge.challenger_weight;
  const daysLeft = challenge.expires_at
    ? Math.ceil((new Date(challenge.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  const statusColor =
    challenge.status === 'pending' ? Colors.accent1 :
    challenge.status === 'accepted' ? Colors.primary :
    challenge.status === 'completed' ? Colors.success : Colors.textMuted;

  return (
    <>
      {AlertComponent}
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <ChevronLeft size={18} color={Colors.textSecondary} strokeWidth={2} />
            <Text style={styles.backButtonLabel}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>LIFT OFF</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Status Badge */}
          <View style={styles.statusBadgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20`, borderColor: statusColor }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {challenge.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* VS Card */}
          <View style={styles.card}>
            <View style={styles.vsRow}>
              <View style={styles.vsPlayer}>
                <Text style={styles.vsPlayerLabel}>YOU</Text>
                <View style={[styles.vsAvatar, { backgroundColor: Colors.primary }]}>
                  <Swords size={18} color={Colors.textPrimary} strokeWidth={2} />
                </View>
              </View>
              <Text style={styles.vsText}>VS</Text>
              <View style={styles.vsPlayer}>
                <Text style={styles.vsPlayerLabel}>{(opponent || 'OPPONENT').toUpperCase()}</Text>
                <View style={[styles.vsAvatar, { backgroundColor: Colors.backgroundSecondary }]}>
                  <Swords size={18} color={Colors.textSecondary} strokeWidth={2} />
                </View>
              </View>
            </View>
          </View>

          {/* Exercise & Wager */}
          <View style={styles.card}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>EXERCISE</Text>
                <Text style={styles.detailValue}>{challenge.exercise?.name || 'Unknown'}</Text>
              </View>
              <View style={styles.detailDivider} />
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>WAGER</Text>
                <View style={styles.wagerRow}>
                  <Coins size={16} color={Colors.xpGold} strokeWidth={2} />
                  <Text style={styles.wagerValue}>{challenge.wager_xp.toLocaleString()} gold</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Pending: Receiver actions */}
          {challenge.status === 'pending' && isChallenged && !isChallenger && (
            <View style={styles.card}>
              <Text style={styles.infoText}>
                {challenge.challenger_username || 'Someone'} has challenged you!
              </Text>
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.declineBtn} onPress={handleDecline} activeOpacity={0.7}>
                  <Text style={styles.declineBtnText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept} activeOpacity={0.7}>
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Pending: Sender waiting */}
          {challenge.status === 'pending' && isChallenger && (
            <View style={styles.card}>
              <View style={styles.waitingRow}>
                <Clock size={16} color={Colors.textMuted} strokeWidth={2} />
                <Text style={styles.waitingText}>
                  Waiting for {challenge.challenged_username || 'opponent'} to respond...
                </Text>
              </View>
            </View>
          )}

          {/* Active challenge */}
          {challenge.status === 'accepted' && (
            <>
              <View style={styles.card}>
                <View style={styles.timerRow}>
                  <Clock size={14} color={Colors.textMuted} strokeWidth={2} />
                  <Text style={styles.timerText}>
                    {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
                  </Text>
                </View>

                <Text style={styles.infoText}>
                  {hasCompleted ? 'Waiting for opponent to complete their lift...'
                    : opponentCompleted ? 'Opponent has submitted — enter your lift!'
                    : 'Enter your best lift for this exercise'}
                </Text>

                {!hasCompleted && (
                  <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowWeightInput(true)} activeOpacity={0.7}>
                    <Dumbbell size={16} color={Colors.textPrimary} strokeWidth={2.5} />
                    <Text style={styles.primaryBtnText}>Enter Weight</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Weight results */}
              {(hasCompleted || opponentCompleted) && (
                <View style={styles.card}>
                  <Text style={styles.sectionLabel}>RESULTS</Text>
                  {hasCompleted && (
                    <View style={styles.weightResultRow}>
                      <Text style={styles.weightResultLabel}>Your lift</Text>
                      <Text style={styles.weightResultValue}>
                        {myWeight?.toLocaleString()} {challenge.exercise?.unit || 'kg'}
                      </Text>
                    </View>
                  )}
                  {opponentCompleted && (
                    <View style={styles.weightResultRow}>
                      <Text style={styles.weightResultLabel}>{opponent}'s lift</Text>
                      <Text style={styles.weightResultValue}>
                        {opponentWeight?.toLocaleString()} {challenge.exercise?.unit || 'kg'}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {hasCompleted && opponentCompleted && challenge.winner_id && (
                <View style={[styles.card, styles.resultCard, challenge.winner_id === user?.id ? styles.winCard : styles.loseCard]}>
                  <Trophy size={24} color={challenge.winner_id === user?.id ? Colors.xpGold : Colors.textMuted} strokeWidth={2} />
                  <Text style={styles.resultText}>
                    {challenge.winner_id === user?.id ? 'You Won!' : 'You Lost'}
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Completed challenge */}
          {challenge.status === 'completed' && (
            <>
              <View style={[styles.card, styles.resultCard, challenge.winner_id === user?.id ? styles.winCard : styles.loseCard]}>
                <Trophy size={24} color={challenge.winner_id === user?.id ? Colors.xpGold : Colors.textMuted} strokeWidth={2} />
                <Text style={styles.resultText}>
                  {challenge.winner_id === user?.id ? 'You Won!' : 'You Lost'}
                </Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>FINAL SCORES</Text>
                <View style={styles.weightResultRow}>
                  <Text style={styles.weightResultLabel}>You</Text>
                  <Text style={styles.weightResultValue}>
                    {myWeight?.toLocaleString()} {challenge.exercise?.unit || 'kg'}
                  </Text>
                </View>
                <View style={styles.weightResultRow}>
                  <Text style={styles.weightResultLabel}>{opponent}</Text>
                  <Text style={styles.weightResultValue}>
                    {opponentWeight?.toLocaleString()} {challenge.exercise?.unit || 'kg'}
                  </Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>

        {/* Weight Input Modal */}
        <Modal visible={showWeightInput} transparent animationType="fade" onRequestClose={() => setShowWeightInput(false)}>
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Enter Your Lift</Text>
              <Text style={styles.modalSubtitle}>{challenge.exercise?.name}</Text>
              <TextInput
                style={styles.weightInput}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                autoFocus
              />
              <Text style={styles.unitText}>{challenge.exercise?.unit || 'kg'}</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => { setShowWeightInput(false); setWeight(''); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmBtn, submitting && { opacity: 0.5 }]}
                  onPress={handleSubmitWeight}
                  activeOpacity={0.7}
                  disabled={submitting}
                >
                  <Text style={styles.modalConfirmText}>{submitting ? 'Submitting...' : 'Submit'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </>
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
  content: { flex: 1 },
  scrollContent: { gap: 12, paddingBottom: 32 },

  statusBadgeRow: { alignItems: 'center' },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },

  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },

  vsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  vsPlayer: { alignItems: 'center', gap: 8, flex: 1 },
  vsPlayerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  vsAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textMuted,
    letterSpacing: 2,
    marginHorizontal: 12,
  },

  detailRow: { flexDirection: 'row', alignItems: 'center' },
  detailItem: { flex: 1, alignItems: 'center', gap: 4 },
  detailDivider: { width: 1, height: 36, backgroundColor: Colors.border },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  wagerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wagerValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.xpGold,
  },

  infoText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 20,
  },
  actionRow: { flexDirection: 'row', gap: 10 },
  declineBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  acceptBtn: {
    flex: 2,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },

  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  waitingText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },

  primaryBtn: {
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },

  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 10,
  },
  weightResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  weightResultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  weightResultValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },

  resultCard: { alignItems: 'center', gap: 8 },
  winCard: { borderColor: Colors.xpGold },
  loseCard: { borderColor: Colors.border },
  resultText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
  errorText: {
    fontSize: 14,
    color: Colors.danger,
    textAlign: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  weightInput: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 10,
    padding: 14,
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    width: '100%',
    textAlign: 'center',
    marginBottom: 4,
  },
  unitText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  modalConfirmBtn: {
    flex: 2,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
});
