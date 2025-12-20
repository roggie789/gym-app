import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Exercise } from '../../services/exerciseService';
import { ExerciseSet } from '../../services/xpService';
import { Colors } from '../../constants/colors';

interface WorkoutScreenProps {
  exercises: Exercise[];
  onComplete: (exerciseSets: ExerciseSet[]) => void;
  onBack: () => void;
}

interface ExerciseWithSets {
  exercise: Exercise;
  sets: Array<{ weight: string; reps: string }>;
}

export default function WorkoutScreen({
  exercises,
  onComplete,
  onBack,
}: WorkoutScreenProps) {
  const [exerciseData, setExerciseData] = useState<ExerciseWithSets[]>(
    exercises.map((ex) => ({
      exercise: ex,
      sets: [{ weight: '', reps: '' }],
    }))
  );

  const addSet = (exerciseIndex: number) => {
    const updated = [...exerciseData];
    updated[exerciseIndex].sets.push({ weight: '', reps: '' });
    setExerciseData(updated);
  };

  const updateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: 'weight' | 'reps',
    value: string
  ) => {
    const updated = [...exerciseData];
    updated[exerciseIndex].sets[setIndex][field] = value;
    setExerciseData(updated);
  };

  const handleSubmit = () => {
    const exerciseSets: ExerciseSet[] = [];

    for (const exData of exerciseData) {
      const filledSets = exData.sets.filter(
        set => set.weight.trim() !== '' && set.reps.trim() !== ''
      );

      if (filledSets.length === 0) {
        continue;
      }

      for (const set of filledSets) {
        const weight = parseFloat(set.weight);
        const reps = parseInt(set.reps);

        if (isNaN(weight) || isNaN(reps) || weight <= 0 || reps <= 0) {
          Alert.alert('Error', `Invalid values for ${exData.exercise.name}`);
          return;
        }
      }

      let bestWeight = 0;
      let bestReps = 0;

      for (const set of filledSets) {
        const weight = parseFloat(set.weight);
        const reps = parseInt(set.reps);

        if (weight > bestWeight || (weight === bestWeight && reps > bestReps)) {
          bestWeight = weight;
          bestReps = reps;
        }
      }

      const setDetails = filledSets.map(set => ({
        weight: parseFloat(set.weight),
        reps: parseInt(set.reps),
      }));

      exerciseSets.push({
        exercise_id: exData.exercise.id,
        exercise_name: exData.exercise.name,
        weight: bestWeight,
        reps: bestReps,
        sets: filledSets.length,
        setDetails: setDetails,
      });
    }

    if (exerciseSets.length === 0) {
      Alert.alert('Error', 'Please fill in at least one set for at least one exercise');
      return;
    }

    onComplete(exerciseSets);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>WORKOUT</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {exerciseData.map((exData, exerciseIndex) => (
          <View key={exData.exercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseCardGlow} pointerEvents="none" />
            <View style={styles.exerciseHeader}>
              <View>
                <Text style={styles.exerciseName}>{exData.exercise.name.toUpperCase()}</Text>
                <Text style={styles.exerciseCategory}>{exData.exercise.category}</Text>
              </View>
            </View>

            <View style={styles.setsSection}>
              <Text style={styles.setsSubheading}>SETS</Text>
              {exData.sets.map((set, setIndex) => (
                <View key={setIndex} style={styles.setRow}>
                  <View style={styles.setInputs}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>WEIGHT ({exData.exercise.unit})</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0"
                        placeholderTextColor={Colors.textMuted}
                        value={set.weight}
                        onChangeText={(value) => updateSet(exerciseIndex, setIndex, 'weight', value)}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={[styles.inputGroup, styles.inputGroupLast]}>
                      <Text style={styles.inputLabel}>REPS</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0"
                        placeholderTextColor={Colors.textMuted}
                        value={set.reps}
                        onChangeText={(value) => updateSet(exerciseIndex, setIndex, 'reps', value)}
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={styles.addSetButton}
                onPress={() => addSet(exerciseIndex)}
                activeOpacity={0.8}
              >
                <Text style={styles.addSetText}>+ ADD SET</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.exerciseCardBorder} pointerEvents="none" />
          </View>
        ))}

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.9}>
          <View style={styles.submitButtonGlow} pointerEvents="none" />
          <Text style={styles.submitButtonText}>COMPLETE WORKOUT</Text>
        </TouchableOpacity>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.backgroundSecondary,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  backButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backButtonText: {
    color: Colors.accent1,
    fontSize: 18,
    fontWeight: '900',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 2,
    textShadowColor: Colors.primary,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  exerciseCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: Colors.secondary,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  exerciseCardGlow: {
    position: 'absolute',
    top: -15,
    right: -15,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.secondary,
    opacity: 0.2,
  },
  exerciseHeader: {
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: 4,
    letterSpacing: 1,
  },
  exerciseCategory: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  setsSection: {
    marginTop: 6,
  },
  setsSubheading: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.accent1,
    marginBottom: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  setRow: {
    marginBottom: 12,
  },
  setInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputGroup: {
    flex: 1,
    marginRight: 6,
  },
  inputGroupLast: {
    flex: 1,
    marginRight: 0,
  },
  inputLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginBottom: 6,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  addSetButton: {
    marginTop: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.secondary,
    borderRadius: 12,
    borderStyle: 'dashed',
    backgroundColor: Colors.backgroundSecondary,
  },
  addSetText: {
    color: Colors.secondary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    marginTop: 20,
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
  submitButtonGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.accent1,
    opacity: 0.3,
  },
  submitButtonText: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  exerciseCardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.textPrimary,
    opacity: 0.1,
  },
});
