import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Trophy, Coins, Flame, TrendingUp, Dumbbell, ChevronUp } from 'lucide-react-native';
import { Colors } from '../constants/colors';

interface ExerciseLog {
  exercise_name: string;
  xp: number;
  is_pr: boolean;
  sets: number;
  weight: number;
  reps: number;
  coefficient: number;
  e1rm: number | null;
}

export interface WorkoutResult {
  sessionXP: number;
  exerciseXP: number;
  prsAchieved: number;
  streakMultiplier: number;
  goldEarned: number;
  newLevel: number;
  levelProgress: {
    current: number;
    needed: number;
    level: number;
  };
  exerciseLogs?: ExerciseLog[];
}

interface WorkoutCompleteModalProps {
  visible: boolean;
  result: WorkoutResult | null;
  onDismiss: () => void;
}

export function WorkoutCompleteModal({ visible, result, onDismiss }: WorkoutCompleteModalProps) {
  if (!result) return null;

  const progressPct = result.levelProgress.needed > 0
    ? Math.min((result.levelProgress.current / result.levelProgress.needed) * 100, 100)
    : 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              {/* Top accent */}
              <View style={styles.accentBar} />

              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.body}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.checkCircle}>
                    <Dumbbell size={20} color={Colors.textPrimary} strokeWidth={2.5} />
                  </View>
                  <Text style={styles.title}>WORKOUT COMPLETE</Text>
                </View>

                {/* XP Earned — big number */}
                <View style={styles.xpSection}>
                  <Text style={styles.xpValue}>+{result.sessionXP.toLocaleString()}</Text>
                  <Text style={styles.xpLabel}>XP EARNED</Text>
                </View>

                {/* Stats row */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Coins size={14} color={Colors.accent1} strokeWidth={2.5} />
                    <Text style={styles.statValue}>{result.goldEarned}</Text>
                    <Text style={styles.statLabel}>Gold</Text>
                  </View>
                  {result.prsAchieved > 0 && (
                    <View style={styles.statItem}>
                      <TrendingUp size={14} color={Colors.success} strokeWidth={2.5} />
                      <Text style={[styles.statValue, { color: Colors.success }]}>{result.prsAchieved}</Text>
                      <Text style={styles.statLabel}>New PR{result.prsAchieved > 1 ? 's' : ''}</Text>
                    </View>
                  )}
                  {result.streakMultiplier > 1 && (
                    <View style={styles.statItem}>
                      <Flame size={14} color={Colors.primary} strokeWidth={2.5} />
                      <Text style={[styles.statValue, { color: Colors.primary }]}>{result.streakMultiplier.toFixed(2)}x</Text>
                      <Text style={styles.statLabel}>Multiplier</Text>
                    </View>
                  )}
                </View>

                {/* Level progress */}
                <View style={styles.levelSection}>
                  <View style={styles.levelRow}>
                    <View style={styles.levelBadge}>
                      <Text style={styles.levelBadgeText}>{result.levelProgress.level}</Text>
                    </View>
                    <View style={styles.levelInfo}>
                      <Text style={styles.levelLabel}>Level {result.levelProgress.level}</Text>
                      <Text style={styles.levelXP}>
                        {result.levelProgress.current.toLocaleString()} / {result.levelProgress.needed.toLocaleString()} XP
                      </Text>
                    </View>
                  </View>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
                  </View>
                </View>

                {/* Exercise breakdown */}
                {result.exerciseLogs && result.exerciseLogs.length > 0 && (
                  <View style={styles.breakdownSection}>
                    <Text style={styles.breakdownTitle}>BREAKDOWN</Text>
                    {result.exerciseLogs.map((ex, i) => (
                      <View key={i} style={styles.exerciseRow}>
                        <View style={styles.exerciseInfo}>
                          <View style={styles.exerciseNameRow}>
                            <Text style={styles.exerciseName} numberOfLines={1}>{ex.exercise_name}</Text>
                            {ex.is_pr && (
                              <View style={styles.prBadge}>
                                <ChevronUp size={10} color={Colors.success} strokeWidth={3} />
                                <Text style={styles.prBadgeText}>PR</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.exerciseDetail}>
                            {ex.sets}×{ex.reps} @ {ex.weight}kg
                            {ex.e1rm ? ` · E1RM ${Math.round(ex.e1rm)}` : ''}
                            {ex.coefficient !== 1.0 ? ` · ${ex.coefficient.toFixed(2)}×` : ''}
                          </Text>
                        </View>
                        <Text style={[styles.exerciseXP, ex.is_pr && { color: Colors.success }]}>
                          +{ex.xp}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>

              {/* Done button */}
              <View style={styles.footer}>
                <TouchableOpacity style={styles.doneBtn} onPress={onDismiss} activeOpacity={0.7}>
                  <Text style={styles.doneBtnText}>DONE</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
    borderRadius: 16,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  accentBar: {
    height: 3,
    backgroundColor: Colors.success,
  },
  scroll: {
    flexShrink: 1,
  },
  body: {
    padding: 24,
    gap: 20,
  },

  // Header
  header: {
    alignItems: 'center',
    gap: 12,
  },
  checkCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 2,
  },

  // XP section
  xpSection: {
    alignItems: 'center',
    gap: 2,
  },
  xpValue: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.primary,
  },
  xpLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  statItem: {
    alignItems: 'center',
    gap: 3,
    minWidth: 60,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.accent1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },

  // Level section
  levelSection: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 10,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  levelInfo: {
    flex: 1,
    gap: 1,
  },
  levelLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  levelXP: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.accent3,
    minWidth: 4,
  },

  // Breakdown
  breakdownSection: {
    gap: 8,
  },
  breakdownTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 2,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  exerciseInfo: {
    flex: 1,
    gap: 2,
    marginRight: 12,
  },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exerciseName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: `${Colors.success}20`,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  prBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.success,
    letterSpacing: 0.5,
  },
  exerciseDetail: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  exerciseXP: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },

  // Footer
  footer: {
    padding: 16,
    paddingTop: 0,
  },
  doneBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
});
