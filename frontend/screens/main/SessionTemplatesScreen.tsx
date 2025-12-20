import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { getExercises, Exercise } from '../../services/exerciseService';
import { supabase } from '../../config/supabase';
import { Colors } from '../../constants/colors';

interface SessionTemplate {
  id: string;
  name: string;
  exercises: string[];
}

export default function SessionTemplatesScreen() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
    loadExercises();
  }, []);

  const loadTemplates = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('session_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setTemplates(data);
    }
    setLoading(false);
  };

  const loadExercises = async () => {
    const { data } = await getExercises();
    if (data) {
      setExercises(data);
    }
  };

  const toggleExercise = (exerciseId: string) => {
    if (selectedExercises.includes(exerciseId)) {
      setSelectedExercises(selectedExercises.filter((id) => id !== exerciseId));
    } else {
      setSelectedExercises([...selectedExercises, exerciseId]);
    }
  };

  const handleCreateTemplate = async () => {
    if (!user || !templateName.trim() || selectedExercises.length === 0) {
      Alert.alert('Error', 'Please enter a name and select at least one exercise');
      return;
    }

    const { error } = await supabase.from('session_templates').insert({
      user_id: user.id,
      name: templateName.trim(),
      exercises: selectedExercises,
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Deck created!');
      setShowCreateModal(false);
      setTemplateName('');
      setSelectedExercises([]);
      loadTemplates();
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    Alert.alert('Delete Deck', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('session_templates').delete().eq('id', templateId);
          loadTemplates();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>YOUR DECKS</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.createButtonText}>+ CREATE</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading...</Text>
          </View>
        ) : templates.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No decks created yet</Text>
            <Text style={styles.emptySubtext}>Create your first deck to get started!</Text>
          </View>
        ) : (
          templates.map((template) => {
            const exerciseNames = template.exercises
              .map((id) => exercises.find((e) => e.id)?.name)
              .filter(Boolean)
              .join(', ');

            return (
              <View key={template.id} style={styles.deckCard}>
                <View style={styles.deckCardGlow} />
                <View style={styles.deckInfo}>
                  <Text style={styles.deckName}>{template.name.toUpperCase()}</Text>
                  <Text style={styles.deckExercises} numberOfLines={2}>
                    {exerciseNames || `${template.exercises.length} exercises`}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteTemplate(template.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.deleteButtonText}>✕</Text>
                </TouchableOpacity>
                <View style={styles.deckCardBorder} />
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>CREATE DECK</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCreateModal(false);
                  setTemplateName('');
                  setSelectedExercises([]);
                }}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>DECK NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Push Day, Leg Day"
              placeholderTextColor={Colors.textMuted}
              value={templateName}
              onChangeText={setTemplateName}
            />

            <Text style={styles.label}>SELECT EXERCISES</Text>
            <ScrollView style={styles.exerciseList}>
              {exercises.map((exercise) => {
                const isSelected = selectedExercises.includes(exercise.id);
                return (
                  <TouchableOpacity
                    key={exercise.id}
                    style={[
                      styles.exerciseOption,
                      isSelected && styles.exerciseOptionSelected,
                    ]}
                    onPress={() => toggleExercise(exercise.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.exerciseOptionText}>{exercise.name.toUpperCase()}</Text>
                    <Text style={styles.exerciseCategory}>{exercise.category}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCreateModal(false);
                  setTemplateName('');
                  setSelectedExercises([]);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButtonModal]}
                onPress={handleCreateTemplate}
                activeOpacity={0.8}
              >
                <Text style={styles.createButtonText}>CREATE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 2,
    textShadowColor: Colors.primary,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  createButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: Colors.accent1,
  },
  createButtonText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  deckCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 18,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  deckCardGlow: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    opacity: 0.2,
  },
  deckInfo: {
    flex: 1,
  },
  deckName: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: 6,
    letterSpacing: 1,
  },
  deckExercises: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.textPrimary,
  },
  deleteButtonText: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  deckCardBorder: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.backgroundCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '85%',
    borderTopWidth: 3,
    borderTopColor: Colors.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  closeButtonText: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.accent1,
    marginBottom: 10,
    marginTop: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 16,
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  exerciseList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  exerciseOption: {
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: Colors.backgroundSecondary,
  },
  exerciseOptionSelected: {
    borderColor: Colors.accent1,
    backgroundColor: Colors.backgroundCard,
  },
  exerciseOptionText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  exerciseCategory: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
  },
  cancelButton: {
    backgroundColor: Colors.backgroundSecondary,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  createButtonModal: {
    backgroundColor: Colors.primary,
    borderColor: Colors.accent1,
  },
});
