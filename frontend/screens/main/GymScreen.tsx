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
import { supabase } from '../../config/supabase';
import { Pencil, Trash2, Plus, X, Dumbbell, ChevronRight, Swords } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { useTemplates, useExercises, useInvalidate, useChallenges } from '../../hooks/useQueryHooks';
import { Badge } from '../../components/ui/Badge';
import { MobileShell } from '../../components/MobileShell';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import {
  ExerciseDetail,
  normalizeExercises,
} from './SessionTemplatesScreen';

interface GymScreenProps {
  onStartWorkout: () => void;
  onViewChallenge?: (challengeId: string) => void;
  onViewClans?: () => void;
  noTopPadding?: boolean;
}

interface ExerciseConfig {
  sets: string;
  reps: string;
  tags: string[];
}

interface SessionTemplate {
  id: string;
  name: string;
  exercises: (string | ExerciseDetail)[];
}

type ModalStep = 'select' | 'configure';

export default function GymScreen({
  onStartWorkout,
  onViewChallenge,
  onViewClans,
  noTopPadding,
}: GymScreenProps) {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const invalidate = useInvalidate();
  const { data: templates = [], isLoading: loading } = useTemplates();
  const { data: exercises = [] } = useExercises();
  const { data: challenges = [] } = useChallenges();

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

  const toggleExercise = (exerciseId: string) => {
    setSelectedIds((prev) =>
      prev.includes(exerciseId) ? prev.filter((id) => id !== exerciseId) : [...prev, exerciseId]
    );
  };

  const updateConfig = (id: string, field: 'sets' | 'reps', value: string) => {
    setExerciseConfigs((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
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
      [id]: { ...prev[id], tags: prev[id].tags.filter((_, i) => i !== tagIndex) },
    }));
  };

  const removeExercise = (id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
    setExerciseConfigs((prev) => { const next = { ...prev }; delete next[id]; return next; });
  };

  const handleConfirmExercises = () => {
    if (selectedIds.length === 0) {
      showAlert({ title: 'Error', message: 'Select at least one exercise' });
      return;
    }
    const configs: Record<string, ExerciseConfig> = {};
    selectedIds.forEach((id) => {
      configs[id] = exerciseConfigs[id] || { sets: '3', reps: '10', tags: [] };
    });
    setExerciseConfigs(configs);
    setModalStep('configure');
  };

  const closeModal = () => {
    setShowModal(false);
    setModalStep('select');
    setEditingTemplate(null);
    setTemplateName('');
    setSelectedIds([]);
    setExerciseConfigs({});
    setSearchQuery('');
    setSelectedCategory(null);
    setTagInputs({});
  };

  const openEditModal = (t: SessionTemplate) => {
    const normalized = normalizeExercises(t.exercises);
    setEditingTemplate(t);
    setTemplateName(t.name);
    setSelectedIds(normalized.map((e: ExerciseDetail) => e.id));
    const configs: Record<string, ExerciseConfig> = {};
    normalized.forEach((e: ExerciseDetail) => {
      configs[e.id] = { sets: String(e.sets), reps: String(e.reps), tags: e.tags || [] };
    });
    setExerciseConfigs(configs);
    setModalStep('configure');
    setShowModal(true);
  };

  const handleCreateTemplate = async () => {
    if (!user) return;
    if (!templateName.trim()) { showAlert({ title: 'Error', message: 'Enter a deck name' }); return; }
    if (selectedIds.length === 0) { showAlert({ title: 'Error', message: 'Select at least one exercise' }); return; }
    const exerciseDetails: ExerciseDetail[] = selectedIds.map((id) => ({
      id, sets: parseInt(exerciseConfigs[id]?.sets || '3') || 3,
      reps: parseInt(exerciseConfigs[id]?.reps || '10') || 10,
      tags: exerciseConfigs[id]?.tags || [],
    }));
    const { error } = await supabase.from('session_templates').insert({
      user_id: user.id, name: templateName.trim(), exercises: exerciseDetails,
    });
    if (error) { showAlert({ title: 'Error', message: error.message }); }
    else { showAlert({ title: 'Success', message: 'Deck created!' }); closeModal(); invalidate.templates(); }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate || !user) return;
    if (!templateName.trim()) { showAlert({ title: 'Error', message: 'Enter a deck name' }); return; }
    const exerciseDetails: ExerciseDetail[] = selectedIds.map((id) => ({
      id, sets: parseInt(exerciseConfigs[id]?.sets || '3') || 3,
      reps: parseInt(exerciseConfigs[id]?.reps || '10') || 10,
      tags: exerciseConfigs[id]?.tags || [],
    }));
    const { error } = await supabase.from('session_templates').update({
      name: templateName.trim(), exercises: exerciseDetails,
    }).eq('id', editingTemplate.id);
    if (error) { showAlert({ title: 'Error', message: error.message }); }
    else { showAlert({ title: 'Success', message: 'Deck updated!' }); closeModal(); invalidate.templates(); }
  };

  const handleDeleteTemplate = (templateId: string) => {
    showAlert({
      title: 'Delete Deck',
      message: 'Are you sure?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await supabase.from('session_templates').delete().eq('id', templateId);
            invalidate.templates();
          },
        },
      ],
    });
  };

  const categories = useMemo(() => {
    const cats = new Set(exercises.map((e: any) => e.category));
    return ['All', ...Array.from(cats)];
  }, [exercises]);

  const filteredExercises = useMemo(() => {
    let list = exercises;
    if (selectedCategory && selectedCategory !== 'All') {
      list = list.filter((e: any) => e.category === selectedCategory);
    }
    if (searchQuery) {
      list = list.filter((e: any) => e.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return list;
  }, [exercises, searchQuery, selectedCategory]);

  return (
    <MobileShell noTopPadding={noTopPadding}>
      <View style={styles.container}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Start Workout */}
          <TouchableOpacity style={styles.startCard} onPress={onStartWorkout} activeOpacity={0.7}>
            <View style={styles.startCardInner}>
              <View style={styles.startIconCircle}>
                <Dumbbell size={22} color={Colors.textPrimary} strokeWidth={2.5} />
              </View>
              <View style={styles.startCardText}>
                <Text style={styles.startTitle}>Start Workout</Text>
                <Text style={styles.startSubtitle}>Use a deck or build a custom session</Text>
              </View>
              <ChevronRight size={20} color={Colors.textSecondary} strokeWidth={2} />
            </View>
          </TouchableOpacity>

          {/* Decks Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>YOUR DECKS</Text>
            <TouchableOpacity
              style={styles.addDeckBtn}
              onPress={() => { closeModal(); setShowModal(true); }}
              activeOpacity={0.7}
            >
              <Plus size={16} color={Colors.textPrimary} strokeWidth={2.5} />
              <Text style={styles.addDeckText}>New</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Loading...</Text>
            </View>
          ) : templates.length === 0 ? (
            <View style={styles.emptyState}>
              <Dumbbell size={28} color={Colors.textMuted} strokeWidth={1.5} />
              <Text style={styles.emptyText}>No decks yet</Text>
              <Text style={styles.emptySubtext}>Create your first deck to get started</Text>
            </View>
          ) : (
            <View style={styles.decksList}>
              {templates.map((t: any) => (
                <Card key={t.id} style={styles.deckCard}>
                  <View style={styles.deckCardInner}>
                    <View style={styles.deckInfo}>
                      <Text style={styles.deckName} numberOfLines={1}>{t.name}</Text>
                      <Text style={styles.deckMeta}>
                        {t.exercises?.length || 0} exercise{(t.exercises?.length || 0) !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View style={styles.deckActions}>
                      <TouchableOpacity
                        style={styles.deckActionBtn}
                        onPress={() => openEditModal(t)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Pencil size={14} color={Colors.textSecondary} strokeWidth={2.25} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deckActionBtn}
                        onPress={() => handleDeleteTemplate(t.id)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Trash2 size={14} color={Colors.danger} strokeWidth={2.25} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}

          {/* Active Challenges */}
          <View style={styles.challengesSection}>
            <View style={styles.challengesHeader}>
              <Text style={styles.sectionLabel}>ACTIVE CHALLENGES</Text>
              <TouchableOpacity style={styles.clansBtn} onPress={onViewClans} activeOpacity={0.7}>
                <Text style={styles.clansBtnText}>Clans</Text>
                <ChevronRight size={14} color={Colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <View style={styles.challengesList}>
              {challenges.length === 0 ? (
                <Card style={styles.emptyChallengeCard}>
                  <Swords size={20} color={Colors.textMuted} strokeWidth={1.5} />
                  <Text style={styles.emptyChallengeText}>No active challenges</Text>
                </Card>
              ) : (
                challenges.map((challenge: any, idx: number) => (
                  <TouchableOpacity
                    key={challenge.id}
                    activeOpacity={0.7}
                    onPress={() => onViewChallenge?.(challenge.id)}
                  >
                    <Card style={styles.challengeCard}>
                      <View style={styles.challengeTop}>
                        <View style={styles.challengeInfo}>
                          <Text style={styles.challengeName} numberOfLines={1}>
                            Lift Off: {challenge.exercise?.name || 'Unknown'}
                          </Text>
                          <Text style={styles.challengeOpponent}>
                            vs {user?.id === challenge.challenger_id ? challenge.challenged_username : challenge.challenger_username} • {challenge.wager_xp} gold
                          </Text>
                        </View>
                        <Badge
                          variant={challenge.status === 'accepted' ? 'default' : 'secondary'}
                          style={[
                            challenge.status === 'accepted' && styles.badgeActive,
                            challenge.status === 'pending' && styles.badgePending,
                          ]}
                        >
                          {challenge.status === 'accepted' ? 'Active' : 'Pending'}
                        </Badge>
                      </View>
                      <View style={styles.challengeBottom}>
                        <View style={styles.challengeType}>
                          <Swords size={14} color={Colors.textSecondary} strokeWidth={2.25} />
                          <Text style={styles.challengeTypeText}>Lift Off</Text>
                        </View>
                        <ChevronRight size={16} color={Colors.textMuted} strokeWidth={2} />
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        </ScrollView>

        {/* Create/Edit Deck Modal */}
        <Modal visible={showModal} animationType="slide" transparent={false} statusBarTranslucent onRequestClose={closeModal}>
          <View style={[styles.modalContainer, { paddingTop: insets.top + 8 }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={modalStep === 'configure' && !isEditing ? () => setModalStep('select') : closeModal} activeOpacity={0.7}>
                <Text style={styles.modalBack}>{modalStep === 'configure' && !isEditing ? '← Back' : '✕ Close'}</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{isEditing ? 'EDIT DECK' : modalStep === 'select' ? 'SELECT EXERCISES' : 'CONFIGURE'}</Text>
              <View style={{ width: 60 }} />
            </View>

            {modalStep === 'select' ? (
              <>
                <View style={styles.modalSearchRow}>
                  <TextInput
                    style={styles.modalSearchInput}
                    placeholder="Search exercises..."
                    placeholderTextColor={Colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryContent}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryChip, (selectedCategory === cat || (!selectedCategory && cat === 'All')) && styles.categoryChipActive]}
                      onPress={() => setSelectedCategory(cat === 'All' ? null : cat)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.categoryChipText, (selectedCategory === cat || (!selectedCategory && cat === 'All')) && styles.categoryChipTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent}>
                  {filteredExercises.map((exercise: any) => {
                    const isSelected = selectedIds.includes(exercise.id);
                    return (
                      <TouchableOpacity
                        key={exercise.id}
                        style={[styles.exerciseItem, isSelected && styles.exerciseItemSelected]}
                        onPress={() => toggleExercise(exercise.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.exerciseItemText, isSelected && styles.exerciseItemTextSelected]}>{exercise.name}</Text>
                        {isSelected && <View style={styles.selectedDot} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <View style={styles.modalFooter}>
                  <Button onPress={handleConfirmExercises} style={styles.modalFooterBtn}>
                    Next ({selectedIds.length} selected)
                  </Button>
                </View>
              </>
            ) : (
              <>
                <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent}>
                  <Text style={styles.configLabel}>DECK NAME</Text>
                  <TextInput
                    style={styles.configInput}
                    placeholder="e.g. Push Day"
                    placeholderTextColor={Colors.textMuted}
                    value={templateName}
                    onChangeText={setTemplateName}
                  />
                  <Text style={[styles.configLabel, { marginTop: 16 }]}>EXERCISES</Text>
                  {selectedIds.map((id) => {
                    const ex = exercises.find((e: any) => e.id === id);
                    const cfg = exerciseConfigs[id];
                    if (!ex || !cfg) return null;
                    return (
                      <Card key={id} style={styles.configCard}>
                        <View style={styles.configCardHeader}>
                          <Text style={styles.configCardName}>{(ex as any).name}</Text>
                          <TouchableOpacity onPress={() => removeExercise(id)} activeOpacity={0.7}>
                            <X size={16} color={Colors.textMuted} strokeWidth={2} />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.configRow}>
                          <View style={styles.configField}>
                            <Text style={styles.configFieldLabel}>Sets</Text>
                            <TextInput style={styles.configFieldInput} value={cfg.sets} onChangeText={(v) => updateConfig(id, 'sets', v)} keyboardType="number-pad" />
                          </View>
                          <View style={styles.configField}>
                            <Text style={styles.configFieldLabel}>Reps</Text>
                            <TextInput style={styles.configFieldInput} value={cfg.reps} onChangeText={(v) => updateConfig(id, 'reps', v)} keyboardType="number-pad" />
                          </View>
                        </View>
                        <View style={styles.tagsRow}>
                          {cfg.tags.map((tag, i) => (
                            <TouchableOpacity key={i} style={styles.tag} onPress={() => removeTag(id, i)} activeOpacity={0.7}>
                              <Text style={styles.tagText}>{tag} ×</Text>
                            </TouchableOpacity>
                          ))}
                          <View style={styles.tagInputRow}>
                            <TextInput
                              style={styles.tagInput}
                              placeholder="Add tag"
                              placeholderTextColor={Colors.textMuted}
                              value={tagInputs[id] || ''}
                              onChangeText={(v) => setTagInputs((prev) => ({ ...prev, [id]: v }))}
                              onSubmitEditing={() => addTag(id)}
                            />
                          </View>
                        </View>
                      </Card>
                    );
                  })}
                </ScrollView>
                <View style={styles.modalFooter}>
                  <Button onPress={isEditing ? handleUpdateTemplate : handleCreateTemplate} style={styles.modalFooterBtn}>
                    {isEditing ? 'Update Deck' : 'Create Deck'}
                  </Button>
                </View>
              </>
            )}
          </View>
        </Modal>
      </View>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 16 },
  content: { flex: 1 },
  scrollContent: { gap: 16, paddingBottom: 32 },

  startCard: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    overflow: 'hidden',
  },
  startCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  startIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startCardText: { flex: 1 },
  startTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  startSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  addDeckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addDeckText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  emptySubtext: { fontSize: 13, color: Colors.textMuted },

  decksList: { gap: 8 },
  deckCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundCard,
    padding: 0,
  },
  deckCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  deckInfo: { flex: 1, gap: 2 },
  deckName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  deckMeta: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  deckActions: {
    flexDirection: 'row',
    gap: 12,
  },
  deckActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal styles
  modalContainer: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalBack: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  modalTitle: { fontSize: 14, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 1 },
  modalSearchRow: { marginBottom: 10 },
  modalSearchInput: {
    backgroundColor: Colors.backgroundSecondary, borderRadius: 8, paddingHorizontal: 12, height: 40,
    color: Colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: Colors.border,
  },
  categoryScroll: { maxHeight: 36, marginBottom: 10 },
  categoryContent: { gap: 6, paddingRight: 16 },
  categoryChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: Colors.backgroundSecondary, borderWidth: 1, borderColor: Colors.border,
  },
  categoryChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryChipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  categoryChipTextActive: { color: Colors.textPrimary },
  modalList: { flex: 1 },
  modalListContent: { gap: 6, paddingBottom: 16 },
  exerciseItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: Colors.backgroundSecondary,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
  },
  exerciseItemSelected: { borderColor: Colors.primary, backgroundColor: Colors.backgroundCard },
  exerciseItemText: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary },
  exerciseItemTextSelected: { color: Colors.textPrimary, fontWeight: '600' },
  selectedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  modalFooter: { paddingVertical: 12 },
  modalFooterBtn: { height: 44 },

  configLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1, marginBottom: 8 },
  configInput: {
    backgroundColor: Colors.backgroundSecondary, borderRadius: 8, paddingHorizontal: 12, height: 40,
    color: Colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 8,
  },
  configCard: { borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.backgroundCard, padding: 14, gap: 10 },
  configCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  configCardName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  configRow: { flexDirection: 'row', gap: 10 },
  configField: { flex: 1, gap: 4 },
  configFieldLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  configFieldInput: {
    backgroundColor: Colors.backgroundSecondary, borderRadius: 6, paddingHorizontal: 10, height: 36,
    color: Colors.textPrimary, fontSize: 14, fontWeight: '600', borderWidth: 1, borderColor: Colors.border, textAlign: 'center',
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  tag: { backgroundColor: Colors.backgroundSecondary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border },
  tagText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  tagInputRow: { flex: 1, minWidth: 80 },
  tagInput: { height: 28, fontSize: 12, color: Colors.textPrimary, paddingHorizontal: 4 },

  // Challenges
  challengesSection: { gap: 10 },
  challengesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clansBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  clansBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  challengesList: { gap: 8 },
  challengeCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundCard,
    padding: 0,
  },
  challengeTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  challengeInfo: { flex: 1, gap: 2 },
  challengeName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  challengeOpponent: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  badgeActive: {
    backgroundColor: `${Colors.primary}26`,
    borderColor: Colors.primary,
  },
  badgePending: {
    backgroundColor: Colors.backgroundSecondary,
  },
  challengeBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  challengeType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  challengeTypeText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  emptyChallengeCard: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundCard,
  },
  emptyChallengeText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});
