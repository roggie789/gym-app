import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { logWorkout, getAttendanceHistory, AttendanceRecord } from '../../services/workoutService';
import { getExercises, Exercise, ExerciseLog } from '../../services/exerciseService';
import { useUserStats } from '../../hooks/useUserStats';

export default function WorkoutsScreen() {
  const { user } = useAuth();
  const { refreshStats } = useUserStats();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [sets, setSets] = useState('');

  useEffect(() => {
    if (user) {
      loadHistory();
      loadExercises();
    }
  }, [user]);

  const loadExercises = async () => {
    const { data, error } = await getExercises();
    if (data) {
      setExercises(data);
    }
  };

  const loadHistory = async () => {
    if (!user) return;

    setLoadingHistory(true);
    const { data, error } = await getAttendanceHistory(user.id, 30);
    if (data) {
      setHistory(data);
    }
    setLoadingHistory(false);
  };

  const handleAddExercise = () => {
    if (!selectedExercise || !weight || !reps) {
      Alert.alert('Error', 'Please fill in exercise, weight, and reps');
      return;
    }

    const newLog: ExerciseLog = {
      exercise_id: selectedExercise.id,
      exercise_name: selectedExercise.name,
      weight: parseFloat(weight),
      reps: parseInt(reps),
      sets: sets ? parseInt(sets) : undefined,
    };

    setExerciseLogs([...exerciseLogs, newLog]);
    setSelectedExercise(null);
    setWeight('');
    setReps('');
    setSets('');
    setShowAddExercise(false);
  };

  const removeExercise = (index: number) => {
    setExerciseLogs(exerciseLogs.filter((_, i) => i !== index));
  };

  const handleLogWorkout = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    if (exerciseLogs.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise');
      return;
    }

    setLoading(true);
    const result = await logWorkout(user.id, exerciseLogs, undefined, notes);

    if (result.error) {
      Alert.alert('Error', result.error.message || 'Failed to log workout');
    } else {
      let message = 'Workout logged successfully!';
      if (result.prsAchieved && result.prsAchieved.length > 0) {
        message += `\n\n🎉 New PRs: ${result.prsAchieved.join(', ')}`;
        message += `\n+${result.pointsBreakdown?.prs} points for PRs`;
      }
      message += `\n+${result.pointsBreakdown?.attendance} points for attendance`;
      if (parseFloat(result.pointsBreakdown?.streakMultiplier || '1') > 1) {
        message += ` (${result.pointsBreakdown?.streakMultiplier}x streak bonus!)`;
      }
      Alert.alert('Success', message);
      setNotes('');
      setExerciseLogs([]);
      refreshStats();
      loadHistory();
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Log Workout</Text>

      {/* Exercise List */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Exercises</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddExercise(true)}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {exerciseLogs.length === 0 ? (
          <Text style={styles.emptyText}>No exercises added yet</Text>
        ) : (
          exerciseLogs.map((log, index) => (
            <View key={index} style={styles.exerciseItem}>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{log.exercise_name}</Text>
                <Text style={styles.exerciseDetails}>
                  {log.weight}lbs × {log.reps} reps
                  {log.sets && ` × ${log.sets} sets`}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeExercise(index)}
              >
                <Text style={styles.removeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Notes */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notes (Optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Add workout notes..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          placeholderTextColor="#999"
        />
      </View>

      {/* Log Button */}
      <TouchableOpacity
        style={[styles.logButton, loading && styles.buttonDisabled]}
        onPress={handleLogWorkout}
        disabled={loading}
      >
        <Text style={styles.logButtonText}>
          {loading ? 'Logging...' : 'Log Workout'}
        </Text>
      </TouchableOpacity>

      {/* History Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Workouts</Text>
        {loadingHistory ? (
          <Text style={styles.emptyText}>Loading...</Text>
        ) : history.length === 0 ? (
          <Text style={styles.emptyText}>No workouts logged yet</Text>
        ) : (
          history.map((workout) => (
            <View key={workout.id} style={styles.historyItem}>
              <View style={styles.historyItemLeft}>
                <Text style={styles.historyDate}>{formatDate(workout.workout_date)}</Text>
                {workout.notes && (
                  <Text style={styles.historyNotes}>{workout.notes}</Text>
                )}
              </View>
              <View style={styles.historyItemRight}>
                <Text style={styles.historyPoints}>+{workout.points_earned} pts</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Add Exercise Modal */}
      <Modal
        visible={showAddExercise}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddExercise(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Exercise</Text>

            <Text style={styles.label}>Exercise</Text>
            <ScrollView style={styles.exerciseList}>
              {exercises.map((exercise) => (
                <TouchableOpacity
                  key={exercise.id}
                  style={[
                    styles.exerciseOption,
                    selectedExercise?.id === exercise.id && styles.exerciseOptionSelected,
                  ]}
                  onPress={() => setSelectedExercise(exercise)}
                >
                  <Text style={styles.exerciseOptionText}>{exercise.name}</Text>
                  <Text style={styles.exerciseCategory}>{exercise.category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Weight ({selectedExercise?.unit || 'kg'})</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter weight"
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Reps</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter reps"
              value={reps}
              onChangeText={setReps}
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Sets (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter sets"
              value={sets}
              onChangeText={setSets}
              keyboardType="number-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddExercise(false);
                  setSelectedExercise(null);
                  setWeight('');
                  setReps('');
                  setSets('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.addButtonModal]}
                onPress={handleAddExercise}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  exerciseDetails: {
    fontSize: 14,
    color: '#666',
  },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  notesInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  logButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  logButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyItemLeft: {
    flex: 1,
  },
  historyItemRight: {
    marginLeft: 15,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  historyNotes: {
    fontSize: 14,
    color: '#666',
  },
  historyPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 15,
    color: '#333',
  },
  exerciseList: {
    maxHeight: 200,
    marginBottom: 10,
  },
  exerciseOption: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 10,
  },
  exerciseOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
  },
  exerciseOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  exerciseCategory: {
    fontSize: 12,
    color: '#666',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  addButtonModal: {
    backgroundColor: '#007AFF',
  },
});
