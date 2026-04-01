import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { getExercises, Exercise } from '../../services/exerciseService';
import { ChevronLeft } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { MobileShell } from '../../components/MobileShell';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

interface ExerciseSelectionScreenProps {
  onExerciseSelected: (exercise: Exercise) => void;
  onBack: () => void;
  onStartWorkout: () => void;
  selectedExerciseIds: string[];
}

export default function ExerciseSelectionScreen({
  onExerciseSelected,
  onBack,
  onStartWorkout,
  selectedExerciseIds,
}: ExerciseSelectionScreenProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    setLoading(true);
    const { data } = await getExercises();
    if (data) {
      setExercises(data);
    }
    setLoading(false);
  };

  const categories = Array.from(new Set(exercises.map((e) => e.category)));

  const filteredExercises = exercises.filter((exercise) => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || exercise.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <MobileShell noTabBar>
      <View style={styles.main}>
        <View style={styles.header}>
          <Button variant="ghost" onPress={onBack} style={styles.backButton}>
            <ChevronLeft size={18} color={Colors.textSecondary} strokeWidth={2} />
            <Text style={styles.backButtonText}>Back</Text>
          </Button>
          <Text style={styles.headerTitle}>SELECT EXERCISES</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.searchSection}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryScrollContent}
        >
        <TouchableOpacity
          style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
          onPress={() => setSelectedCategory(null)}
          activeOpacity={0.7}
        >
          <Text style={[styles.categoryText, !selectedCategory && styles.categoryTextActive]}>
            ALL
          </Text>
        </TouchableOpacity>
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(category)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextActive,
              ]}
            >
              {category.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
        </ScrollView>

        <ScrollView style={styles.exerciseList} contentContainerStyle={styles.exerciseListContent}>
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading...</Text>
          </View>
        ) : filteredExercises.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No exercises found</Text>
          </View>
        ) : (
          filteredExercises.map((exercise) => {
            const isSelected = selectedExerciseIds.includes(exercise.id);
            return (
              <TouchableOpacity
                key={exercise.id}
                activeOpacity={0.7}
                onPress={() => onExerciseSelected(exercise)}
              >
                <Card
                  style={[
                    styles.exerciseCard,
                    isSelected && styles.exerciseCardSelected,
                  ]}
                >
                  <Text style={styles.exerciseName} numberOfLines={1}>
                    {exercise.name.toUpperCase()}
                  </Text>
                  {isSelected && (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeText}>✓</Text>
                    </View>
                  )}
                </Card>
              </TouchableOpacity>
            );
          })
        )}
        </ScrollView>

        {selectedExerciseIds.length > 0 && (
          <View style={styles.footer}>
            <Text style={styles.selectedCount}>
              {selectedExerciseIds.length} SELECTED
            </Text>
            <Button onPress={onStartWorkout} style={styles.startButton}>
              Start Workout
            </Button>
          </View>
        )}
      </View>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    flexDirection: 'column',
  },
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
  backButtonText: {
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
  searchSection: {
    marginBottom: 6,
  },
  searchInput: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryScroll: {
    height: 36,
    maxHeight: 36,
    marginBottom: 8,
    alignSelf: 'stretch',
  },
  categoryScrollContent: {
    alignItems: 'center',
    flexGrow: 0,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 28,
    borderRadius: 14,
    backgroundColor: Colors.backgroundCard,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  categoryTextActive: {
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  exerciseList: {
    flex: 1,
  },
  exerciseListContent: {
    paddingBottom: 24,
    gap: 8,
    flexGrow: 0,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundCardTransparent,
    minHeight: 48,
  },
  exerciseCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.backgroundSecondary,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
    flex: 1,
  },
  selectedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  selectedBadgeText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 10,
  },
  selectedCount: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  startButton: {
    height: 44,
  },
});
