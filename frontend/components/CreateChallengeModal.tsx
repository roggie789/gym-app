import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Colors } from '../constants/colors';
import { createChallenge } from '../services/liftOffService';
import { getExercises, Exercise } from '../services/exerciseService';
import { useAuth } from '../contexts/AuthContext';
import { useCustomAlert } from '../utils/alert';

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
  const { showAlert, AlertComponent } = useCustomAlert();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
  const [wagerXp, setWagerXp] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadExercises();
    }
  }, [visible, challengedUserId]);

  const loadExercises = async () => {
    const { data } = await getExercises();
    setExercises(data || []);
  };

  const handleCreate = async () => {
    if (!user) {
      showAlert({
        title: 'Error',
        message: 'You must be logged in',
        type: 'error',
      });
      return;
    }

    if (!challengedUserId) {
      showAlert({
        title: 'Error',
        message: 'Invalid user selected',
        type: 'error',
      });
      return;
    }

    const wager = parseInt(wagerXp);
    if (!selectedExerciseId) {
      showAlert({
        title: 'Error',
        message: 'Please select an exercise',
        type: 'error',
      });
      return;
    }
    if (isNaN(wager) || wager <= 0) {
      showAlert({
        title: 'Error',
        message: 'Please enter a valid XP wager',
        type: 'error',
      });
      return;
    }

    setLoading(true);
    const { data, error } = await createChallenge(user.id, {
      challengedUserId,
      exerciseId: selectedExerciseId,
      wagerXp: wager,
    });
    setLoading(false);

    if (error) {
      showAlert({
        title: 'Error',
        message: error.message || 'Failed to create challenge',
        type: 'error',
      });
      return;
    }

    showAlert({
      title: 'Success',
      message: 'Challenge sent!',
      type: 'success',
    });
    setWagerXp('');
    setSelectedExerciseId('');
    onChallengeCreated();
    onClose();
  };

  return (
    <>
      {AlertComponent}
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>CHALLENGE TO LIFT-OFF</Text>
          <Text style={styles.subtitle}>
            Challenge {challengedUsername || 'User'} to a lift-off!
          </Text>

          <ScrollView style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.label}>SELECT EXERCISE</Text>
              <ScrollView style={styles.exerciseList} nestedScrollEnabled>
                {exercises.map((exercise) => (
                  <TouchableOpacity
                    key={exercise.id}
                    style={[
                      styles.exerciseOption,
                      selectedExerciseId === exercise.id && styles.exerciseOptionSelected,
                    ]}
                    onPress={() => setSelectedExerciseId(exercise.id)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.exerciseOptionText,
                        selectedExerciseId === exercise.id && styles.exerciseOptionTextSelected,
                      ]}
                    >
                      {exercise.name.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>XP WAGER</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter XP amount"
                placeholderTextColor={Colors.textMuted}
                value={wagerXp}
                onChangeText={setWagerXp}
                keyboardType="number-pad"
              />
              <Text style={styles.hint}>
                Both players must have this amount of XP
              </Text>
            </View>
          </ScrollView>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.buttonCancel]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonTextCancel}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonConfirm]}
              onPress={handleCreate}
              activeOpacity={0.8}
              disabled={loading}
            >
              <Text style={styles.buttonTextConfirm}>
                {loading ? 'CREATING...' : 'SEND CHALLENGE'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
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
    maxHeight: '80%',
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 2,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  content: {
    maxHeight: 400,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.accent1,
    letterSpacing: 1.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  exerciseList: {
    maxHeight: 200,
  },
  exerciseOption: {
    padding: 12,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  exerciseOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
  },
  exerciseOptionText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  exerciseOptionTextSelected: {
    color: Colors.textPrimary,
  },
  input: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  hint: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  buttons: {
    flexDirection: 'row',
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  buttonCancel: {
    backgroundColor: Colors.backgroundSecondary,
    borderColor: Colors.border,
    marginRight: 8,
  },
  buttonConfirm: {
    backgroundColor: Colors.primary,
    borderColor: Colors.accent1,
  },
  buttonTextCancel: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  buttonTextConfirm: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
});

