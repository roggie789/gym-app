import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Swords, Search, Coins } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { createChallenge } from '../services/liftOffService';
import { getExercises, Exercise } from '../services/exerciseService';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { useInvalidate } from '../hooks/useQueryHooks';

interface CreateChallengeModalProps {
  visible: boolean;
  onClose: () => void;
  challengedUserId: string;
  challengedUsername?: string;
  onChallengeCreated: () => void;
}

export default function CreateChallengeModal({
  visible,
  onClose,
  challengedUserId,
  challengedUsername,
  onChallengeCreated,
}: CreateChallengeModalProps) {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const invalidate = useInvalidate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
  const [wagerXp, setWagerXp] = useState('');
  const [loading, setLoading] = useState(false);
  const [exerciseFilter, setExerciseFilter] = useState('');

  useEffect(() => {
    if (visible) {
      loadExercises();
      setSelectedExerciseId('');
      setWagerXp('');
      setExerciseFilter('');
    }
  }, [visible, challengedUserId]);

  const loadExercises = async () => {
    const { data } = await getExercises();
    setExercises(data || []);
  };

  const filteredExercises = exercises.filter((e) =>
    e.name.toLowerCase().includes(exerciseFilter.toLowerCase())
  );

  const handleCreate = async () => {
    if (!user) {
      showAlert({ title: 'Error', message: 'You must be logged in' });
      return;
    }
    if (!challengedUserId) {
      showAlert({ title: 'Error', message: 'Invalid user selected' });
      return;
    }
    if (!selectedExerciseId) {
      showAlert({ title: 'Error', message: 'Please select an exercise' });
      return;
    }
    const wager = parseInt(wagerXp);
    if (isNaN(wager) || wager <= 0) {
      showAlert({ title: 'Error', message: 'Please enter a valid gold wager' });
      return;
    }

    setLoading(true);
    const { error } = await createChallenge(user.id, {
      challengedUserId,
      exerciseId: selectedExerciseId,
      wagerXp: wager,
    });
    setLoading(false);

    if (error) {
      showAlert({ title: 'Error', message: error.message || 'Failed to create challenge' });
      return;
    }

    invalidate.challenges();
    onChallengeCreated();
    onClose();
  };

  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Swords size={18} color={Colors.primary} strokeWidth={2.5} />
              <Text style={styles.title}>Lift Off</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
              <X size={14} color={Colors.textSecondary} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Opponent */}
          <View style={styles.opponentRow}>
            <Text style={styles.opponentLabel}>Challenging</Text>
            <Text style={styles.opponentName}>{challengedUsername || 'User'}</Text>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Exercise Selection */}
            <Text style={styles.sectionLabel}>SELECT EXERCISE</Text>

            <View style={styles.filterContainer}>
              <Search size={14} color={Colors.textMuted} strokeWidth={2} />
              <TextInput
                style={styles.filterInput}
                placeholder="Filter exercises..."
                placeholderTextColor={Colors.textMuted}
                value={exerciseFilter}
                onChangeText={setExerciseFilter}
                autoCapitalize="none"
              />
            </View>

            <ScrollView style={styles.exerciseList} nestedScrollEnabled>
              {filteredExercises.map((exercise) => {
                const selected = selectedExerciseId === exercise.id;
                return (
                  <TouchableOpacity
                    key={exercise.id}
                    style={[styles.exerciseOption, selected && styles.exerciseOptionSelected]}
                    onPress={() => setSelectedExerciseId(exercise.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.exerciseOptionText, selected && styles.exerciseOptionTextSelected]}>
                      {exercise.name}
                    </Text>
                    {selected && <View style={styles.selectedDot} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Wager */}
            <Text style={styles.sectionLabel}>GOLD WAGER</Text>
            <View style={styles.wagerInputRow}>
              <Coins size={16} color={Colors.xpGold} strokeWidth={2} />
              <TextInput
                style={styles.wagerInput}
                placeholder="Enter gold amount"
                placeholderTextColor={Colors.textMuted}
                value={wagerXp}
                onChangeText={setWagerXp}
                keyboardType="number-pad"
              />
            </View>
            <Text style={styles.hint}>
              Both players must have enough gold. Winner takes the wager.
            </Text>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, loading && styles.buttonDisabled]}
              onPress={handleCreate}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Swords size={16} color={Colors.textPrimary} strokeWidth={2.5} />
              <Text style={styles.confirmButtonText}>
                {loading ? 'Sending...' : 'Send Challenge'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opponentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
  },
  opponentLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  opponentName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: 360,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 10,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 8,
    paddingHorizontal: 10,
    gap: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterInput: {
    flex: 1,
    height: 36,
    color: Colors.textPrimary,
    fontSize: 13,
  },
  exerciseList: {
    maxHeight: 160,
    marginBottom: 20,
  },
  exerciseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exerciseOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
  },
  exerciseOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  exerciseOptionTextSelected: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  wagerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 6,
  },
  wagerInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  hint: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  confirmButton: {
    flex: 2,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
