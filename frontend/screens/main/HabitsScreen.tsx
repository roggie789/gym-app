import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, X, Trash2 } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { Colors } from '../../constants/colors';
import { MobileShell } from '../../components/MobileShell';
import { Card } from '../../components/ui/Card';
import {
  Habit,
  HabitCompletion,
  getUserHabits,
  createHabit,
  deleteHabit,
  getCompletionsForMonth,
  toggleCompletion,
  getHabitColor,
} from '../../services/habitsService';

interface HabitsScreenProps {
  noTopPadding?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function HabitsScreen({ noTopPadding }: HabitsScreenProps) {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [creating, setCreating] = useState(false);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = now.getDate();
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [habitsRes, completionsRes] = await Promise.all([
      getUserHabits(user.id),
      getCompletionsForMonth(user.id, year, month),
    ]);
    setHabits(habitsRes.data);
    setCompletions(completionsRes.data);
    setLoading(false);
  }, [user, year, month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const completionSet = new Set(
    completions.map((c) => `${c.habit_id}:${c.completed_date}`)
  );

  const handleToggle = async (habitId: string, day: number) => {
    if (!user) return;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const key = `${habitId}:${dateStr}`;

    // Optimistic update
    if (completionSet.has(key)) {
      setCompletions((prev) =>
        prev.filter((c) => !(c.habit_id === habitId && c.completed_date === dateStr))
      );
    } else {
      setCompletions((prev) => [
        ...prev,
        { id: `temp-${Date.now()}`, habit_id: habitId, user_id: user.id, completed_date: dateStr },
      ]);
    }

    const { error } = await toggleCompletion(user.id, habitId, dateStr);
    if (error) {
      loadData();
    }
  };

  const handleCreate = async () => {
    if (!user) return;
    const name = newHabitName.trim();
    if (!name) {
      showAlert({ title: 'Error', message: 'Enter a habit name' });
      return;
    }
    setCreating(true);
    const color = getHabitColor(habits.length + selectedColorIdx);
    const { error } = await createHabit(user.id, name, color);
    setCreating(false);
    if (error) {
      showAlert({ title: 'Error', message: error.message });
    } else {
      setNewHabitName('');
      setSelectedColorIdx(0);
      setShowCreateModal(false);
      loadData();
    }
  };

  const handleDelete = (habit: Habit) => {
    showAlert({
      title: 'Delete Habit',
      message: `Delete "${habit.name}"? All completion data will be lost.`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteHabit(habit.id);
            loadData();
          },
        },
      ],
    });
  };

  const availableColors = Array.from({ length: 10 }, (_, i) => getHabitColor(i));

  // Calculate box size based on screen width and days
  const CARD_PADDING = 14;
  const HABIT_SIDE_PADDING = 16 * 2; // MobileShell paddingHorizontal
  const availableWidth = SCREEN_WIDTH - HABIT_SIDE_PADDING - CARD_PADDING * 2;
  const GAP = 3;
  const boxSize = Math.floor((availableWidth - GAP * (daysInMonth - 1)) / daysInMonth);
  const clampedBoxSize = Math.min(Math.max(boxSize, 6), 14);

  return (
    <MobileShell noTopPadding={noTopPadding}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.monthLabel}>{monthLabel.toUpperCase()}</Text>

          {loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Loading...</Text>
            </View>
          ) : habits.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔥</Text>
              <Text style={styles.emptyTitle}>No habits yet</Text>
              <Text style={styles.emptyText}>
                Tap the + button to create your first habit
              </Text>
            </View>
          ) : (
            <View style={styles.habitsList}>
              {habits.map((habit) => {
                const completedDays = new Set(
                  completions
                    .filter((c) => c.habit_id === habit.id)
                    .map((c) => parseInt(c.completed_date.split('-')[2]))
                );
                const streak = countCurrentStreak(completedDays, today);
                const color = habit.color || Colors.primary;

                return (
                  <Card key={habit.id} style={styles.habitCard}>
                    <View style={styles.habitHeader}>
                      <View style={styles.habitNameRow}>
                        <View style={[styles.colorDot, { backgroundColor: color }]} />
                        <Text style={styles.habitName} numberOfLines={1}>{habit.name}</Text>
                      </View>
                      <View style={styles.habitRight}>
                        {streak > 0 && (
                          <Text style={[styles.streakText, { color }]}>{streak}🔥</Text>
                        )}
                        <TouchableOpacity
                          onPress={() => handleDelete(habit)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          activeOpacity={0.6}
                        >
                          <Trash2 size={14} color={Colors.textMuted} strokeWidth={2} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.boxGrid}>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const isCompleted = completedDays.has(day);
                        const isFuture = day > today;
                        const isToday = day === today;

                        return (
                          <TouchableOpacity
                            key={day}
                            style={[
                              styles.dayBox,
                              {
                                width: clampedBoxSize,
                                height: clampedBoxSize,
                                borderRadius: Math.max(2, clampedBoxSize * 0.2),
                              },
                              isCompleted && { backgroundColor: color },
                              !isCompleted && !isFuture && styles.dayBoxEmpty,
                              isFuture && styles.dayBoxFuture,
                              isToday && !isCompleted && { borderColor: color, borderWidth: 1 },
                            ]}
                            onPress={() => !isFuture && handleToggle(habit.id, day)}
                            activeOpacity={isFuture ? 1 : 0.6}
                            disabled={isFuture}
                          />
                        );
                      })}
                    </View>
                    <View style={styles.habitFooter}>
                      <Text style={styles.completedCount}>
                        {completedDays.size}/{daysInMonth} days
                      </Text>
                      <TouchableOpacity
                        style={[styles.todayBtn, completionSet.has(`${habit.id}:${getTodayString()}`) && { backgroundColor: color }]}
                        onPress={() => handleToggle(habit.id, today)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.todayBtnText,
                          completionSet.has(`${habit.id}:${getTodayString()}`) && { color: Colors.textPrimary },
                        ]}>
                          {completionSet.has(`${habit.id}:${getTodayString()}`) ? 'Done ✓' : 'Mark Today'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Floating Add Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
        >
          <Plus size={24} color={Colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>

        {/* Create Habit Modal */}
        <Modal
          visible={showCreateModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCreateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>NEW HABIT</Text>
                <TouchableOpacity onPress={() => setShowCreateModal(false)} activeOpacity={0.7}>
                  <X size={20} color={Colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalLabel}>NAME</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Drink 2L water"
                placeholderTextColor={Colors.textMuted}
                value={newHabitName}
                onChangeText={setNewHabitName}
                autoFocus
              />

              <Text style={styles.modalLabel}>COLOR</Text>
              <View style={styles.colorPicker}>
                {availableColors.map((c, i) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorOption,
                      { backgroundColor: c },
                      selectedColorIdx === i && styles.colorOptionSelected,
                    ]}
                    onPress={() => setSelectedColorIdx(i)}
                    activeOpacity={0.7}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[styles.createBtn, creating && { opacity: 0.5 }]}
                onPress={handleCreate}
                activeOpacity={0.7}
                disabled={creating}
              >
                <Text style={styles.createBtnText}>{creating ? 'Creating...' : 'Create Habit'}</Text>
              </TouchableOpacity>
            </Card>
          </View>
        </Modal>
      </View>
    </MobileShell>
  );
}

function countCurrentStreak(completedDays: Set<number>, today: number): number {
  let streak = 0;
  let day = today;
  while (day >= 1 && completedDays.has(day)) {
    streak++;
    day--;
  }
  return streak;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { gap: 12, paddingBottom: 80 },
  monthLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyIcon: { fontSize: 32, marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  emptyText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },

  habitsList: { gap: 10 },
  habitCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundCard,
    padding: 14,
    gap: 10,
  },
  habitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  habitNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  habitName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  habitRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700',
  },
  boxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  dayBox: {
    backgroundColor: 'transparent',
  },
  dayBoxEmpty: {
    backgroundColor: Colors.backgroundSecondary,
  },
  dayBoxFuture: {
    backgroundColor: Colors.backgroundSecondary,
    opacity: 0.3,
  },
  habitFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  completedCount: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  todayBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },

  fab: {
    position: 'absolute',
    bottom: 16,
    right: 0,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  modalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  modalInput: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    color: Colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorOption: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: Colors.textPrimary,
  },
  createBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  createBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
