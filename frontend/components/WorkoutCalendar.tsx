import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { Colors } from '../constants/colors';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getExercises, Exercise } from '../services/exerciseService';

interface WorkoutPlan {
  id: string;
  plan_date: string;
  exercises: any[];
  notes?: string;
}

interface WorkoutCalendarProps {
  currentDate: Date;
}

export default function WorkoutCalendar({ currentDate }: WorkoutCalendarProps) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [workoutPlans, setWorkoutPlans] = useState<Map<string, WorkoutPlan>>(new Map());
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planExercises, setPlanExercises] = useState<string[]>([]);
  const [planNotes, setPlanNotes] = useState('');
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  useEffect(() => {
    if (user) {
      loadWorkoutPlans();
      loadExercises();
    }
  }, [user, month, year]);

  const loadWorkoutPlans = async () => {
    if (!user) return;
    
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
    
    const { data } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', user.id)
      .gte('plan_date', startDate)
      .lte('plan_date', endDate);
    
    if (data) {
      const plansMap = new Map<string, WorkoutPlan>();
      data.forEach((plan) => {
        plansMap.set(plan.plan_date, plan);
      });
      setWorkoutPlans(plansMap);
    }
  };

  const loadExercises = async () => {
    const { data } = await getExercises();
    setAvailableExercises(data || []);
  };

  const handleDatePress = (day: number) => {
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().split('T')[0];
    const plan = workoutPlans.get(dateStr);
    
    setSelectedDate(date);
    if (plan) {
      setPlanExercises(plan.exercises.map((e: any) => e.exercise_id || e));
      setPlanNotes(plan.notes || '');
      setSelectedExercises(new Set(plan.exercises.map((e: any) => e.exercise_id || e)));
    } else {
      setPlanExercises([]);
      setPlanNotes('');
      setSelectedExercises(new Set());
    }
    setShowPlanModal(true);
  };

  const toggleExercise = (exerciseId: string) => {
    const newSelected = new Set(selectedExercises);
    if (newSelected.has(exerciseId)) {
      newSelected.delete(exerciseId);
    } else {
      newSelected.add(exerciseId);
    }
    setSelectedExercises(newSelected);
  };

  const savePlan = async () => {
    if (!user || !selectedDate) return;
    
    const dateStr = selectedDate.toISOString().split('T')[0];
    const exercises = Array.from(selectedExercises).map((id) => ({
      exercise_id: id,
    }));
    
    const { error } = await supabase
      .from('workout_plans')
      .upsert({
        user_id: user.id,
        plan_date: dateStr,
        exercises: exercises,
        notes: planNotes || null,
      }, {
        onConflict: 'user_id,plan_date',
      });
    
    if (!error) {
      await loadWorkoutPlans();
      setShowPlanModal(false);
    }
  };

  const deletePlan = async () => {
    if (!user || !selectedDate) return;
    
    const dateStr = selectedDate.toISOString().split('T')[0];
    const { error } = await supabase
      .from('workout_plans')
      .delete()
      .eq('user_id', user.id)
      .eq('plan_date', dateStr);
    
    if (!error) {
      await loadWorkoutPlans();
      setShowPlanModal(false);
    }
  };

  const renderCalendarGrid = () => {
    const cells = [];
    const today = new Date();
    
    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.calendarCell} />);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const plan = workoutPlans.get(dateStr);
      const isToday = date.toDateString() === today.toDateString();
      
      cells.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarCell,
            isToday && styles.todayCell,
            plan && styles.hasPlanCell,
          ]}
          onPress={() => handleDatePress(day)}
        >
          <Text style={[styles.dayText, isToday && styles.todayText]}>
            {day}
          </Text>
          {plan && <View style={styles.planIndicator} />}
        </TouchableOpacity>
      );
    }
    
    return cells;
  };

  return (
    <>
      <View style={styles.calendarContainer}>
        <View style={styles.calendarGrid}>
          {renderCalendarGrid()}
        </View>
      </View>

      <Modal
        visible={showPlanModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPlanModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedDate?.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>

            <ScrollView style={styles.exercisesList}>
              {availableExercises.map((exercise) => (
                <TouchableOpacity
                  key={exercise.id}
                  style={[
                    styles.exerciseItem,
                    selectedExercises.has(exercise.id) && styles.exerciseItemSelected,
                  ]}
                  onPress={() => toggleExercise(exercise.id)}
                >
                  <Text
                    style={[
                      styles.exerciseText,
                      selectedExercises.has(exercise.id) && styles.exerciseTextSelected,
                    ]}
                  >
                    {exercise.name}
                  </Text>
                  {selectedExercises.has(exercise.id) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={styles.notesInput}
              placeholder="Notes (optional)"
              placeholderTextColor={Colors.textMuted}
              value={planNotes}
              onChangeText={setPlanNotes}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={deletePlan}
              >
                <Text style={styles.deleteButtonText}>DELETE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={savePlan}
              >
                <Text style={styles.saveButtonText}>SAVE</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowPlanModal(false)}
            >
              <Text style={styles.closeButtonText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  calendarContainer: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 6,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignSelf: 'center',
    maxWidth: '90%',
    marginHorizontal: 'auto',
    alignItems: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    width: '100%',
  },
  calendarCell: {
    width: '13.28%',
    aspectRatio: 1,
    marginHorizontal: '0.36%',
    marginBottom: '1.5%',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
  },
  todayCell: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: Colors.background,
  },
  hasPlanCell: {
    borderColor: Colors.accent1,
    borderWidth: 2,
  },
  dayText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  todayText: {
    color: Colors.primary,
    fontWeight: '900',
  },
  planIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent1,
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
    maxHeight: '80%',
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 1,
  },
  exercisesList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  exerciseItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
  },
  exerciseText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  exerciseTextSelected: {
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  checkmark: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: '900',
  },
  notesInput: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: 16,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  deleteButton: {
    backgroundColor: Colors.backgroundSecondary,
    borderColor: Colors.border,
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.accent1,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  closeButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1,
  },
});

