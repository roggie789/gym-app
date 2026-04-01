import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { Exercise } from '../../services/exerciseService';
import { supabase } from '../../config/supabase';
import { ChevronLeft, Pencil, Trash2, Plus, X } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { useTemplates, useExercises, useInvalidate } from '../../hooks/useQueryHooks';
import { MobileShell } from '../../components/MobileShell';
import { TopHeader } from '../../components/TopHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

/* ── Types ── */

export interface ExerciseDetail {
  id: string;
  sets: number;
  reps: number;
  tags: string[];
}

interface SessionTemplate {
  id: string;
  name: string;
  exercises: (string | ExerciseDetail | LegacyDetail)[];
}

/** Old format that used a single label string */
interface LegacyDetail {
  id: string;
  sets?: number;
  reps?: number;
  label?: string;
  tags?: string[];
}

/** Normalise any format to ExerciseDetail[] */
export function normalizeExercises(
  raw: (string | LegacyDetail | ExerciseDetail)[]
): ExerciseDetail[] {
  return raw.map((item) => {
    if (typeof item === 'string') {
      return { id: item, sets: 3, reps: 10, tags: [] };
    }
    const tags: string[] =
      (item as ExerciseDetail).tags?.length
        ? (item as ExerciseDetail).tags
        : (item as LegacyDetail).label
          ? [(item as LegacyDetail).label!]
          : [];
    return {
      id: item.id,
      sets: item.sets ?? 3,
      reps: item.reps ?? 10,
      tags,
    };
  });
}

/* ── Per-exercise config (strings for inputs, array for tags) ── */
interface ExerciseConfig {
  sets: string;
  reps: string;
  tags: string[];
}

type ModalStep = 'select' | 'configure';

interface SessionTemplatesScreenProps {
  onSelectTemplate?: (template: SessionTemplate) => void;
  onBack?: () => void;
  onViewProfile?: () => void;
  onViewFriends?: () => void;
  onViewSettings?: () => void;
}

export default function SessionTemplatesScreen({ onSelectTemplate, onBack, onViewProfile, onViewFriends, onViewSettings }: SessionTemplatesScreenProps) {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const isSelectionMode = !!onSelectTemplate;
  const invalidate = useInvalidate();
  const { data: templates = [], isLoading: loading } = useTemplates();
  const { data: exercises = [] } = useExercises();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>('select');
  const [editingTemplate, setEditingTemplate] = useState<SessionTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exerciseConfigs, setExerciseConfigs] = useState<Record<string, ExerciseConfig>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});

  const isEditing = editingTemplate !== null;

  /* ── Toggle exercise in step 1 ── */
  const toggleExercise = (exerciseId: string) => {
    setSelectedIds((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };

  /* ── Config helpers ── */
  const updateConfig = (id: string, field: 'sets' | 'reps', value: string) => {
    setExerciseConfigs((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const addTag = (id: string) => {
    const text = (tagInputs[id] || '').trim();
    if (!text) return;
    setExerciseConfigs((prev) => ({
      ...prev,
      [id]: { ...prev[id], tags: [...(prev[id]?.tags || []), text] },
    }));
    setTagInputs((prev) => ({ ...prev, [id]: '' }));
  };

  const removeTag = (id: string, tagIndex: number) => {
    setExerciseConfigs((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        tags: prev[id].tags.filter((_, i) => i !== tagIndex),
      },
    }));
  };

  const removeExercise = (id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
    setExerciseConfigs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  /* ── Step transitions ── */
  const handleConfirmExercises = () => {
    if (selectedIds.length === 0) {
      showAlert({ title: 'Error', message: 'Select at least one exercise' });
      return;
    }
    // Initialise configs for any newly-selected exercises
    setExerciseConfigs((prev) => {
      const next = { ...prev };
      for (const id of selectedIds) {
        if (!next[id]) {
          next[id] = { sets: '3', reps: '10', tags: [] };
        }
      }
      // Remove configs for deselected exercises
      for (const id of Object.keys(next)) {
        if (!selectedIds.includes(id)) delete next[id];
      }
      return next;
    });
    setModalStep('configure');
  };

  const handleBackToSelect = () => {
    setModalStep('select');
  };

  /* ── Open modals ── */
  const openCreateModal = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setSelectedIds([]);
    setExerciseConfigs({});
    setSearchQuery('');
    setSelectedCategory(null);
    setTagInputs({});
    setModalStep('select');
    setShowModal(true);
  };

  const openEditModal = (template: SessionTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    const details = normalizeExercises(template.exercises);
    const ids: string[] = [];
    const configs: Record<string, ExerciseConfig> = {};
    for (const d of details) {
      ids.push(d.id);
      configs[d.id] = {
        sets: String(d.sets),
        reps: String(d.reps),
        tags: [...d.tags],
      };
    }
    setSelectedIds(ids);
    setExerciseConfigs(configs);
    setSearchQuery('');
    setSelectedCategory(null);
    setTagInputs({});
    setModalStep('configure'); // jump straight to configure when editing
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
    setTemplateName('');
    setSelectedIds([]);
    setExerciseConfigs({});
    setSearchQuery('');
    setSelectedCategory(null);
    setTagInputs({});
    setModalStep('select');
  };

  /* ── Build payload ── */
  const buildExercisesPayload = (): ExerciseDetail[] =>
    selectedIds
      .filter((id) => exerciseConfigs[id])
      .map((id) => {
        const cfg = exerciseConfigs[id];
        return {
          id,
          sets: parseInt(cfg.sets) || 1,
          reps: parseInt(cfg.reps) || 1,
          tags: cfg.tags.filter((t) => t.trim()),
        };
      });

  /* ── Create ── */
  const handleCreateTemplate = async () => {
    if (!user || !templateName.trim() || selectedIds.length === 0) {
      showAlert({ title: 'Error', message: 'Please enter a name and select at least one exercise' });
      return;
    }
    const { error } = await supabase.from('session_templates').insert({
      user_id: user.id,
      name: templateName.trim(),
      exercises: buildExercisesPayload(),
    });
    if (error) {
      showAlert({ title: 'Error', message: error.message });
    } else {
      showAlert({ title: 'Success', message: 'Deck created!' });
      closeModal();
      invalidate.templates();
    }
  };

  /* ── Update ── */
  const handleUpdateTemplate = async () => {
    if (!user || !editingTemplate || !templateName.trim() || selectedIds.length === 0) {
      showAlert({ title: 'Error', message: 'Please enter a name and select at least one exercise' });
      return;
    }
    const { error } = await supabase
      .from('session_templates')
      .update({ name: templateName.trim(), exercises: buildExercisesPayload() })
      .eq('id', editingTemplate.id);
    if (error) {
      showAlert({ title: 'Error', message: error.message });
    } else {
      showAlert({ title: 'Success', message: 'Deck updated!' });
      closeModal();
      invalidate.templates();
    }
  };

  /* ── Delete ── */
  const handleDeleteTemplate = (templateId: string) => {
    showAlert({
      title: 'Delete Deck',
      message: 'Are you sure?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('session_templates').delete().eq('id', templateId);
            invalidate.templates();
          },
        },
      ],
    });
  };

  const categories = useMemo(
    () => Array.from(new Set(exercises.map((e) => e.category))),
    [exercises]
  );

  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = !selectedCategory || ex.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [exercises, searchQuery, selectedCategory]);

  /* ── Render ── */
  return (
    <MobileShell>
      <View style={styles.container}>
        {!isSelectionMode && (
          <TopHeader
            onViewProfile={onViewProfile}
            onViewFriends={onViewFriends}
            onViewSettings={onViewSettings}
          />
        )}
        {isSelectionMode && (
          <View style={styles.header}>
            {onBack && (
              <Button variant="ghost" onPress={onBack} style={styles.backButton}>
                <ChevronLeft size={18} color={Colors.textSecondary} strokeWidth={2} />
                <Text style={styles.backButtonText}>Back</Text>
              </Button>
            )}
            <Text style={styles.title}>SELECT DECK</Text>
            <View style={{ width: 64 }} />
          </View>
        )}

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Loading...</Text>
            </View>
          ) : templates.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No decks created yet</Text>
              <Text style={styles.emptySubtext}>
                {isSelectionMode ? 'Go back and create a deck first!' : 'Create your first deck to get started!'}
              </Text>
            </View>
          ) : (
            templates.map((t) => (
              <TouchableOpacity
                key={t.id}
                activeOpacity={isSelectionMode ? 0.7 : 1}
                onPress={isSelectionMode ? () => onSelectTemplate!(t) : undefined}
              >
                <Card style={styles.deckCard}>
                  <Text style={styles.deckName} numberOfLines={1}>
                    {t.name.toUpperCase()}
                  </Text>
                  {isSelectionMode ? (
                    <View style={styles.deckExerciseCount}>
                      <Text style={styles.deckExerciseCountText}>
                        {t.exercises.length} exercise{t.exercises.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.deckActions}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => openEditModal(t)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Pencil size={14} color={Colors.textPrimary} strokeWidth={2.25} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteTemplate(t.id)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Trash2 size={14} color={Colors.textPrimary} strokeWidth={2.25} />
                      </TouchableOpacity>
                    </View>
                  )}
                </Card>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* ── Modal ── */}
        <Modal
          visible={showModal}
          animationType="slide"
          transparent={false}
          onRequestClose={closeModal}
          statusBarTranslucent
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
          <View style={[styles.modalSafeArea, { paddingTop: insets.top + 8 }]}>
            <View style={styles.modalMain}>
              {modalStep === 'select' ? (
                /* ═══ STEP 1: Select exercises ═══ */
                <>
                  <View style={styles.modalHeader}>
                    <Button variant="ghost" onPress={closeModal} style={styles.backButton}>
                      <ChevronLeft size={18} color={Colors.textSecondary} strokeWidth={2} />
                      <Text style={styles.backButtonText}>Back</Text>
                    </Button>
                    <Text style={styles.modalHeaderTitle}>SELECT EXERCISES</Text>
                    <View style={styles.headerSpacer} />
                  </View>

                  <View style={styles.searchSection}>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search exercises..."
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
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
                        onPress={() => setSelectedCategory(cat)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>
                          {cat.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <ScrollView
                    style={styles.exerciseList}
                    contentContainerStyle={styles.exerciseListContent}
                    keyboardShouldPersistTaps="handled"
                  >
                    {filteredExercises.length === 0 ? (
                      <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No exercises found</Text>
                      </View>
                    ) : (
                      filteredExercises.map((exercise) => {
                        const isSelected = selectedIds.includes(exercise.id);
                        return (
                          <TouchableOpacity
                            key={exercise.id}
                            activeOpacity={0.7}
                            onPress={() => toggleExercise(exercise.id)}
                          >
                            <Card
                              style={
                                isSelected
                                  ? { ...styles.exerciseCard, ...styles.exerciseCardSelected }
                                  : styles.exerciseCard
                              }
                            >
                              <Text style={styles.exercisePickerName} numberOfLines={1}>
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

                  <View style={styles.modalFooter}>
                    {selectedIds.length > 0 && (
                      <Text style={styles.selectedCount}>
                        {selectedIds.length} SELECTED
                      </Text>
                    )}
                    <Button onPress={handleConfirmExercises} style={styles.confirmButton}>
                      Confirm Exercises
                    </Button>
                  </View>
                </>
              ) : (
                /* ═══ STEP 2: Configure exercises ═══ */
                <>
                  <View style={styles.modalHeader}>
                    <Button variant="ghost" onPress={handleBackToSelect} style={styles.backButton}>
                      <ChevronLeft size={18} color={Colors.textSecondary} strokeWidth={2} />
                      <Text style={styles.backButtonText}>Back</Text>
                    </Button>
                    <Text style={styles.modalHeaderTitle}>
                      {isEditing ? 'EDIT DECK' : 'CREATE DECK'}
                    </Text>
                    <View style={styles.headerSpacer} />
                  </View>

                  <View style={styles.nameSection}>
                    <Text style={styles.nameLabel}>DECK NAME</Text>
                    <TextInput
                      style={styles.nameInput}
                      placeholder="e.g., Push Day, Leg Day"
                      placeholderTextColor={Colors.textMuted}
                      value={templateName}
                      onChangeText={setTemplateName}
                    />
                  </View>

                  <ScrollView
                    style={styles.configList}
                    contentContainerStyle={styles.configListContent}
                    keyboardShouldPersistTaps="handled"
                  >
                    {selectedIds.map((id) => {
                      const ex = exercises.find((e) => e.id === id);
                      const cfg = exerciseConfigs[id];
                      if (!ex || !cfg) return null;
                      return (
                        <Card key={id} style={styles.configCard}>
                          {/* Name + remove */}
                          <View style={styles.configCardHeader}>
                            <Text style={styles.configCardName} numberOfLines={1}>
                              {ex.name.toUpperCase()}
                            </Text>
                            <TouchableOpacity
                              onPress={() => removeExercise(id)}
                              activeOpacity={0.7}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <X size={16} color={Colors.textMuted} strokeWidth={2} />
                            </TouchableOpacity>
                          </View>

                          {/* Sets / Reps */}
                          <View style={styles.configRow}>
                            <View style={styles.configField}>
                              <Text style={styles.configFieldLabel}>SETS</Text>
                              <TextInput
                                style={styles.configInput}
                                value={cfg.sets}
                                onChangeText={(v) => updateConfig(id, 'sets', v)}
                                keyboardType="number-pad"
                                placeholder="3"
                                placeholderTextColor={Colors.textMuted}
                              />
                            </View>
                            <View style={styles.configField}>
                              <Text style={styles.configFieldLabel}>REPS</Text>
                              <TextInput
                                style={styles.configInput}
                                value={cfg.reps}
                                onChangeText={(v) => updateConfig(id, 'reps', v)}
                                keyboardType="number-pad"
                                placeholder="10"
                                placeholderTextColor={Colors.textMuted}
                              />
                            </View>
                          </View>

                          {/* Tags */}
                          {cfg.tags.length > 0 && (
                            <View style={styles.tagsRow}>
                              {cfg.tags.map((tag, ti) => (
                                <View key={ti} style={styles.tagChip}>
                                  <Text style={styles.tagChipText}>{tag}</Text>
                                  <TouchableOpacity
                                    onPress={() => removeTag(id, ti)}
                                    activeOpacity={0.7}
                                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                                  >
                                    <X size={10} color={Colors.textPrimary} strokeWidth={2.5} />
                                  </TouchableOpacity>
                                </View>
                              ))}
                            </View>
                          )}

                          {/* Add tag input */}
                          <View style={styles.addTagRow}>
                            <TextInput
                              style={styles.addTagInput}
                              value={tagInputs[id] || ''}
                              onChangeText={(v) =>
                                setTagInputs((prev) => ({ ...prev, [id]: v }))
                              }
                              onSubmitEditing={() => addTag(id)}
                              placeholder="Add tag (RPE, tempo, pause…)"
                              placeholderTextColor={Colors.textMuted}
                              returnKeyType="done"
                            />
                            <TouchableOpacity
                              style={styles.addTagButton}
                              onPress={() => addTag(id)}
                              activeOpacity={0.7}
                            >
                              <Plus size={14} color={Colors.textPrimary} strokeWidth={2.5} />
                            </TouchableOpacity>
                          </View>
                        </Card>
                      );
                    })}
                  </ScrollView>

                  <View style={styles.modalFooter}>
                    <Button
                      onPress={isEditing ? handleUpdateTemplate : handleCreateTemplate}
                      style={styles.confirmButton}
                    >
                      {isEditing ? 'Save Changes' : 'Create Deck'}
                    </Button>
                  </View>
                </>
              )}
            </View>
          </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Floating + (hidden in selection mode) */}
        {!isSelectionMode && (
          <View style={styles.floatingButtonContainer}>
            <TouchableOpacity
              style={styles.floatingButton}
              onPress={openCreateModal}
              activeOpacity={0.8}
            >
              <Text style={styles.floatingButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </MobileShell>
  );
}

/* ── Styles ── */
const styles = StyleSheet.create({
  container: { flex: 1, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: {
    fontSize: 14, fontWeight: '800', color: Colors.textSecondary,
    letterSpacing: 1, textTransform: 'uppercase',
  },
  floatingButtonContainer: { position: 'absolute', bottom: 25, right: 16, zIndex: 10 },
  floatingButton: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  floatingButtonText: { color: Colors.textPrimary, fontSize: 28, fontWeight: '300', lineHeight: 28 },
  content: { flex: 1 },
  scrollContent: { paddingBottom: 80, gap: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 16, opacity: 0.5 },
  emptyText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  emptySubtext: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },

  /* Deck cards */
  deckCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.backgroundCardTransparent, minHeight: 48,
  },
  deckName: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 0.5, flex: 1 },
  deckActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 12 },
  deckExerciseCount: {
    backgroundColor: Colors.backgroundSecondary, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4, marginLeft: 12,
  },
  deckExerciseCountText: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.3 },
  editButton: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.backgroundSecondary, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  deleteButton: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center', justifyContent: 'center',
  },

  /* Modal shared */
  modalSafeArea: { flex: 1, backgroundColor: Colors.background },
  modalMain: { flex: 1, flexDirection: 'column', paddingHorizontal: 16, paddingBottom: 16 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
  },
  backButton: { height: 40, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 4 },
  backButtonText: { fontSize: 16, lineHeight: 20, color: Colors.textSecondary, fontWeight: '500' },
  modalHeaderTitle: {
    fontSize: 14, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 1, textTransform: 'uppercase',
  },
  headerSpacer: { width: 64 },
  modalFooter: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 16, paddingBottom: 8, gap: 10 },
  selectedCount: {
    color: Colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase',
  },
  confirmButton: { height: 44 },

  /* Step 1: exercise picker */
  searchSection: { marginBottom: 6 },
  searchInput: {
    backgroundColor: Colors.backgroundCard, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    color: Colors.textPrimary, fontSize: 14, fontWeight: '600',
    borderWidth: 1, borderColor: Colors.border,
  },
  categoryScroll: { height: 36, maxHeight: 36, marginBottom: 8, alignSelf: 'stretch' },
  categoryScrollContent: { alignItems: 'center', flexGrow: 0 },
  categoryChip: {
    paddingHorizontal: 10, paddingVertical: 4, minHeight: 28, borderRadius: 14,
    backgroundColor: Colors.backgroundCard, marginRight: 8,
    borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  categoryChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' },
  categoryTextActive: { color: Colors.textPrimary, fontWeight: '800' },
  exerciseList: { flex: 1 },
  exerciseListContent: { paddingBottom: 24, gap: 8, flexGrow: 0 },
  exerciseCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.backgroundCardTransparent, minHeight: 48,
  },
  exerciseCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.backgroundSecondary },
  exercisePickerName: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 0.5, flex: 1 },
  selectedBadge: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  selectedBadgeText: { color: Colors.textPrimary, fontSize: 14, fontWeight: '900' },

  /* Step 2: configure */
  nameSection: { marginBottom: 10 },
  nameLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textSecondary,
    letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase',
  },
  nameInput: {
    backgroundColor: Colors.backgroundCard, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    color: Colors.textPrimary, fontSize: 14, fontWeight: '700',
    borderWidth: 1, borderColor: Colors.border,
  },
  configList: { flex: 1 },
  configListContent: { gap: 10, paddingBottom: 24 },
  configCard: {
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.backgroundCardTransparent, padding: 12, gap: 8,
  },
  configCardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  configCardName: {
    fontSize: 14, fontWeight: '800', color: Colors.textPrimary,
    letterSpacing: 0.5, flex: 1, marginRight: 8,
  },
  configRow: { flexDirection: 'row', gap: 8 },
  configField: { flex: 1 },
  configFieldLabel: {
    fontSize: 9, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase',
  },
  configInput: {
    backgroundColor: Colors.background, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8,
    color: Colors.textPrimary, fontSize: 14, fontWeight: '700',
    borderWidth: 1, borderColor: Colors.border, textAlign: 'center',
  },

  /* Tags */
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  tagChipText: { fontSize: 10, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 0.5 },
  addTagRow: { flexDirection: 'row', gap: 6 },
  addTagInput: {
    flex: 1, backgroundColor: Colors.background, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    color: Colors.textPrimary, fontSize: 12, fontWeight: '600',
    borderWidth: 1, borderColor: Colors.border,
  },
  addTagButton: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: Colors.backgroundSecondary, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
});
