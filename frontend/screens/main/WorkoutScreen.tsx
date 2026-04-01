import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Exercise } from '../../services/exerciseService';
import { ExerciseSet } from '../../services/xpService';
import { ChevronLeft } from 'lucide-react-native';
import { useAlert } from '../../contexts/AlertContext';
import { Colors } from '../../constants/colors';
import { MobileShell } from '../../components/MobileShell';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export interface TemplateExerciseDetail {
  id: string;
  sets: number;
  reps: number;
  tags: string[];
}

interface WorkoutScreenProps {
  exercises: Exercise[];
  templateDetails?: TemplateExerciseDetail[];
  onComplete: (exerciseSets: ExerciseSet[]) => void;
  onBack: () => void;
}

interface ExerciseWithSets {
  exercise: Exercise;
  tags: string[];
  sets: Array<{ weight: string; reps: string }>;
}

export default function WorkoutScreen({
  exercises,
  templateDetails,
  onComplete,
  onBack,
}: WorkoutScreenProps) {
  const { showAlert } = useAlert();
  const [exerciseData, setExerciseData] = useState<ExerciseWithSets[]>(() =>
    exercises.map((ex) => {
      const detail = templateDetails?.find((d) => d.id === ex.id);
      const numSets = detail ? Math.max(detail.sets, 1) : 1;
      return {
        exercise: ex,
        tags: detail?.tags || [],
        sets: Array.from({ length: numSets }, () => ({ weight: '', reps: '' })),
      };
    })
  );

  const addSet = (exerciseIndex: number) => {
    const updated = [...exerciseData];
    updated[exerciseIndex].sets.push({ weight: '', reps: '' });
    setExerciseData(updated);
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const updated = [...exerciseData];
    if (updated[exerciseIndex].sets.length <= 1) return;
    updated[exerciseIndex].sets.splice(setIndex, 1);
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
          showAlert({ title: 'Error', message: `Invalid values for ${exData.exercise.name}` });
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
      showAlert({ title: 'Error', message: 'Please fill in at least one set for at least one exercise' });
      return;
    }

    onComplete(exerciseSets);
  };

  return (
    <MobileShell noTabBar>
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Button variant="ghost" onPress={onBack} style={styles.backButton}>
            <ChevronLeft size={18} color={Colors.textSecondary} strokeWidth={2} />
            <Text style={styles.backButtonLabel}>Back</Text>
          </Button>
          <Text style={styles.headerTitle}>WORKOUT</Text>
          <View style={styles.headerSpacer} />
        </View>
        {exerciseData.map((exData, exerciseIndex) => (
          <Card key={exData.exercise.id} style={styles.exerciseCard}>
            <Text style={styles.exerciseName}>
              {exData.exercise.name.toUpperCase()}
            </Text>
            {exData.tags.length > 0 ? (
              <View style={styles.tagsRow}>
                {exData.tags.map((tag, ti) => (
                  <View key={ti} style={styles.tagChip}>
                    <Text style={styles.tagChipText}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ height: 6 }} />
            )}

            <View style={styles.setsHeader}>
              <Text style={styles.setsLabel}>SETS</Text>
              <Text style={styles.setsCount}>{exData.sets.length}</Text>
            </View>

            {exData.sets.map((set, setIndex) => (
              <View key={setIndex} style={styles.setRow}>
                <Text style={styles.setNumber}>{setIndex + 1}</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    WEIGHT ({exData.exercise.unit})
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                    value={set.weight}
                    onChangeText={(v) => updateSet(exerciseIndex, setIndex, 'weight', v)}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>REPS</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                    value={set.reps}
                    onChangeText={(v) => updateSet(exerciseIndex, setIndex, 'reps', v)}
                    keyboardType="number-pad"
                  />
                </View>
                {exData.sets.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeSetButton}
                    onPress={() => removeSet(exerciseIndex, setIndex)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.removeSetText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <TouchableOpacity
              style={styles.addSetRow}
              onPress={() => addSet(exerciseIndex)}
              activeOpacity={0.7}
            >
              <Text style={styles.addSetText}>+ Add Set</Text>
            </TouchableOpacity>
          </Card>
        ))}

        <Button onPress={handleSubmit} style={styles.submitButton}>
          Complete Workout
        </Button>
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  list: {
    flex: 1,
  },
  listContent: {
    gap: 12,
    paddingBottom: 8,
  },
  exerciseCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundCardTransparent,
    padding: 14,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  tagChip: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  setsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  setsCount: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 8,
  },
  setNumber: {
    width: 20,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    textAlign: 'center',
    paddingBottom: 10,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  removeSetButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  removeSetText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.danger,
  },
  addSetRow: {
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 4,
  },
  addSetText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  submitButton: {
    height: 48,
    marginTop: 4,
  },
});
