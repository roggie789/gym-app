import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/colors';
import { useCustomAlert } from '../../utils/alert';
import {
  getUserChallenges,
  getChallengeById,
  submitLiftWeight,
  acceptChallenge,
  declineChallenge,
  LiftOffChallenge,
} from '../../services/liftOffService';

interface LiftOffDetailScreenProps {
  challengeId: string;
  onBack: () => void;
}

export default function LiftOffDetailScreen({
  challengeId,
  onBack,
  onChallengeUpdate,
}: LiftOffDetailScreenProps) {
  const { user } = useAuth();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [challenge, setChallenge] = useState<LiftOffChallenge | null>(null);
  const [loading, setLoading] = useState(false);
  const [weight, setWeight] = useState('');
  const [showWeightInput, setShowWeightInput] = useState(false);

  useEffect(() => {
    loadChallenge();
  }, [challengeId]);

  const loadChallenge = async () => {
    if (!user) return;
    setLoading(true);
    
    // Try to get challenge directly by ID first
    const { data: directChallenge, error: directError } = await getChallengeById(challengeId, user.id);
    
    if (directChallenge && !directError) {
      setChallenge(directChallenge);
      setLoading(false);
      return;
    }
    
    // Fallback to getting all challenges and finding the one
    const { data, error } = await getUserChallenges(user.id);
    
    if (error) {
      console.error('Error loading challenges:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to load challenge: ' + error.message,
        type: 'error',
      });
      setLoading(false);
      return;
    }
    
    const found = data?.find((c) => c.id === challengeId);
    
    if (!found) {
      console.error('Challenge not found. ChallengeId:', challengeId, 'Available challenges:', data?.map(c => c.id));
    }
    
    setChallenge(found || null);
    setLoading(false);
  };

  const handleSubmitWeight = async () => {
    if (!user || !challenge) return;

    const weightValue = parseFloat(weight);
    if (isNaN(weightValue) || weightValue <= 0) {
      showAlert({
        title: 'Error',
        message: 'Please enter a valid weight',
        type: 'error',
      });
      return;
    }

    setLoading(true);
    const { error } = await submitLiftWeight(challengeId, user.id, weightValue);
    setLoading(false);

    if (error) {
      showAlert({
        title: 'Error',
        message: error.message || 'Failed to submit weight',
        type: 'error',
      });
      return;
    }

    showAlert({
      title: 'Success',
      message: 'Weight submitted! Waiting for opponent...',
      type: 'success',
    });
    setShowWeightInput(false);
    setWeight('');
    loadChallenge();
  };

  const handleAccept = async () => {
    if (!user) return;

    setLoading(true);
    const { error } = await acceptChallenge(challengeId, user.id);
    setLoading(false);

    if (error) {
      showAlert({
        title: 'Error',
        message: error.message || 'Failed to accept challenge',
        type: 'error',
      });
      return;
    }

    showAlert({
      title: 'Success',
      message: 'Challenge accepted! You have 7 days to complete your lift.',
      type: 'success',
    });
    loadChallenge();
    // Notify parent to refresh challenges on home screen
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
            setLoading(true);
            const { error } = await declineChallenge(challengeId, user.id);
            setLoading(false);

            if (error) {
              showAlert({
                title: 'Error',
                message: error.message || 'Failed to decline challenge',
                type: 'error',
              });
              return;
            }

            showAlert({
              title: 'Challenge Declined',
              message: 'The challenge has been declined.',
              type: 'info',
            });
            onChallengeUpdate?.();
            onBack();
          },
        },
      ],
    });
  };

  if (loading && !challenge) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!challenge) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Challenge not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← BACK</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isChallenger = challenge.challenger_id === user?.id;
  const isChallenged = challenge.challenged_id === user?.id;
  const opponent = isChallenger
    ? challenge.challenged_username
    : challenge.challenger_username;
  const hasCompleted = isChallenger
    ? !!challenge.challenger_completed_at
    : !!challenge.challenged_completed_at;
  const opponentCompleted = isChallenger
    ? !!challenge.challenged_completed_at
    : !!challenge.challenger_completed_at;
  const myWeight = isChallenger ? challenge.challenger_weight : challenge.challenged_weight;
  const opponentWeight = isChallenger
    ? challenge.challenged_weight
    : challenge.challenger_weight;
  const daysLeft = challenge.expires_at
    ? Math.ceil(
        (new Date(challenge.expires_at).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  return (
    <>
      {AlertComponent}
      <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>LIFT-OFF</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.challengeCard}>
          <View style={styles.vsSection}>
            <Text style={styles.vsText}>VS</Text>
            <Text style={styles.opponentName}>{opponent?.toUpperCase() || 'OPPONENT'}</Text>
          </View>

          <View style={styles.exerciseSection}>
            <Text style={styles.exerciseLabel}>EXERCISE</Text>
            <Text style={styles.exerciseName}>
              {challenge.exercise?.name.toUpperCase() || 'EXERCISE'}
            </Text>
          </View>

          <View style={styles.wagerSection}>
            <Text style={styles.wagerLabel}>WAGER</Text>
            <Text style={styles.wagerAmount}>
              {challenge.wager_xp.toLocaleString()} XP
            </Text>
          </View>

          {challenge.status === 'pending' && (
            <View style={styles.pendingActions}>
              {!isChallenger && isChallenged ? (
                <>
                  <Text style={styles.pendingText}>
                    {challenge.challenger_username?.toUpperCase() || 'SOMEONE'} has challenged you!
                  </Text>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={handleAccept}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionButtonText}>ACCEPT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.declineButton]}
                      onPress={handleDecline}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionButtonText}>DECLINE</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : isChallenger && !isChallenged ? (
                <Text style={styles.pendingText}>
                  Waiting for {challenge.challenged_username?.toUpperCase() || 'OPPONENT'} to respond...
                </Text>
              ) : (
                <Text style={styles.pendingText}>
                  Invalid challenge state. Please contact support.
                </Text>
              )}
            </View>
          )}

          {challenge.status === 'accepted' && (
            <>
              <View style={styles.statusSection}>
                <Text style={styles.statusLabel}>STATUS</Text>
                <Text style={styles.statusText}>
                  {hasCompleted
                    ? 'WAITING FOR OPPONENT'
                    : opponentCompleted
                    ? 'OPPONENT COMPLETED - ENTER YOUR LIFT'
                    : 'ENTER YOUR LIFT'}
                </Text>
                <Text style={styles.daysLeft}>
                  {daysLeft} DAY{daysLeft !== 1 ? 'S' : ''} LEFT
                </Text>
              </View>

              {!hasCompleted && (
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={() => setShowWeightInput(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitButtonText}>ENTER WEIGHT</Text>
                </TouchableOpacity>
              )}

              {hasCompleted && (
                <View style={styles.weightSection}>
                  <Text style={styles.weightLabel}>YOUR LIFT</Text>
                  <Text style={styles.weightValue}>
                    {myWeight?.toLocaleString()} {challenge.exercise?.unit || 'kg'}
                  </Text>
                </View>
              )}

              {opponentCompleted && (
                <View style={styles.weightSection}>
                  <Text style={styles.weightLabel}>OPPONENT'S LIFT</Text>
                  <Text style={styles.weightValue}>
                    {opponentWeight?.toLocaleString()} {challenge.exercise?.unit || 'kg'}
                  </Text>
                </View>
              )}

              {hasCompleted && opponentCompleted && challenge.winner_id && (
                <View style={styles.resultSection}>
                  <Text style={styles.resultLabel}>RESULT</Text>
                  <Text style={styles.resultText}>
                    {challenge.winner_id === user?.id
                      ? '🏆 YOU WON!'
                      : '😔 YOU LOST'}
                  </Text>
                </View>
              )}
            </>
          )}

          {challenge.status === 'completed' && (
            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>FINAL RESULT</Text>
              <Text style={styles.resultText}>
                {challenge.winner_id === user?.id
                  ? '🏆 YOU WON!'
                  : '😔 YOU LOST'}
              </Text>
              <View style={styles.finalWeights}>
                <Text style={styles.finalWeightText}>
                  You: {myWeight?.toLocaleString()} {challenge.exercise?.unit || 'kg'}
                </Text>
                <Text style={styles.finalWeightText}>
                  {opponent}: {opponentWeight?.toLocaleString()} {challenge.exercise?.unit || 'kg'}
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Weight Input Modal */}
      <Modal
        visible={showWeightInput}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWeightInput(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>ENTER YOUR LIFT</Text>
            <Text style={styles.modalSubtitle}>
              {challenge.exercise?.name.toUpperCase()}
            </Text>
            <TextInput
              style={styles.weightInput}
              placeholder="Weight"
              placeholderTextColor={Colors.textMuted}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
            />
            <Text style={styles.unitText}>
              {challenge.exercise?.unit || 'kg'}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowWeightInput(false);
                  setWeight('');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonTextCancel}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleSubmitWeight}
                activeOpacity={0.8}
                disabled={loading}
              >
                <Text style={styles.modalButtonTextConfirm}>
                  {loading ? 'SUBMITTING...' : 'SUBMIT'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.backgroundSecondary,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 2,
    textShadowColor: Colors.primary,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 80,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  challengeCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  vsSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  vsText: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.accent1,
    letterSpacing: 3,
    marginBottom: 8,
  },
  opponentName: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  exerciseSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  exerciseLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  wagerSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  wagerLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  wagerAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.xpGold,
    textShadowColor: Colors.xpGold,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  pendingActions: {
    marginTop: 20,
  },
  pendingText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    minHeight: 50,
  },
  acceptButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.accent1,
  },
  declineButton: {
    backgroundColor: Colors.backgroundSecondary,
    borderColor: Colors.border,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  statusSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.accent1,
    marginBottom: 8,
    textAlign: 'center',
  },
  daysLeft: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.accent1,
    marginTop: 12,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  weightSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    alignItems: 'center',
  },
  weightLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  weightValue: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  resultSection: {
    marginTop: 20,
    padding: 20,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  resultText: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  finalWeights: {
    marginTop: 12,
    width: '100%',
  },
  finalWeightText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
  errorText: {
    fontSize: 16,
    color: Colors.danger,
    textAlign: 'center',
    marginTop: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    borderWidth: 3,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 2,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  weightInput: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '900',
    color: Colors.textPrimary,
    borderWidth: 2,
    borderColor: Colors.border,
    width: '100%',
    textAlign: 'center',
    marginBottom: 8,
  },
  unitText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  modalButtonCancel: {
    backgroundColor: Colors.backgroundSecondary,
    borderColor: Colors.border,
    marginRight: 6,
  },
  modalButtonConfirm: {
    backgroundColor: Colors.primary,
    borderColor: Colors.accent1,
    marginLeft: 6,
  },
  modalButtonTextCancel: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  modalButtonTextConfirm: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
});

