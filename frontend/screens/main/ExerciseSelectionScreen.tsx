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
import { Colors } from '../../constants/colors';

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
    const { data, error } = await getExercises();
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>SELECT EXERCISES</Text>
        <View style={styles.placeholder} />
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        <TouchableOpacity
          style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
          onPress={() => setSelectedCategory(null)}
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
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>No exercises found</Text>
          </View>
        ) : (
          filteredExercises.map((exercise) => {
            const isSelected = selectedExerciseIds.includes(exercise.id);
            return (
              <TouchableOpacity
                key={exercise.id}
                style={[styles.exerciseCard, isSelected && styles.exerciseCardSelected]}
                onPress={() => onExerciseSelected(exercise)}
                disabled={isSelected}
                activeOpacity={0.8}
              >
                <View style={styles.exerciseCardGlow} />
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.name.toUpperCase()}</Text>
                  <Text style={styles.exerciseCategory}>{exercise.category}</Text>
                </View>
                {isSelected && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>✓</Text>
                  </View>
                )}
                <View style={styles.exerciseCardBorder} />
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
          <TouchableOpacity style={styles.startButton} onPress={onStartWorkout} activeOpacity={0.9}>
            <View style={styles.startButtonGlow} />
            <Text style={styles.startButtonText}>START WORKOUT</Text>
          </TouchableOpacity>
        </View>
      )}
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
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  searchInput: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  categoryScroll: {
    maxHeight: 50,
    marginBottom: 12,
    paddingLeft: 16,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.backgroundCard,
    marginRight: 10,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.accent1,
  },
  categoryText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  categoryTextActive: {
    color: Colors.textPrimary,
    fontWeight: '900',
  },
  exerciseList: {
    flex: 1,
  },
  exerciseListContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  exerciseCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 18,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  exerciseCardSelected: {
    opacity: 0.7,
    borderColor: Colors.accent1,
    backgroundColor: Colors.backgroundSecondary,
  },
  exerciseCardGlow: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    opacity: 0.2,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: 6,
    letterSpacing: 1,
  },
  exerciseCategory: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  selectedBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.textPrimary,
  },
  selectedBadgeText: {
    color: Colors.background,
    fontSize: 20,
    fontWeight: '900',
  },
  exerciseCardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.textPrimary,
    opacity: 0.1,
  },
  footer: {
    backgroundColor: Colors.backgroundSecondary,
    borderTopWidth: 2,
    borderTopColor: Colors.primary,
    padding: 20,
  },
  selectedCount: {
    color: Colors.accent1,
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  startButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.accent1,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
  startButtonGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accent1,
    opacity: 0.3,
  },
  startButtonText: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
