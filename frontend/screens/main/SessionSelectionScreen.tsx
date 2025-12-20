import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { getExercises, Exercise } from '../../services/exerciseService';
import { supabase } from '../../config/supabase';
import { Colors } from '../../constants/colors';

interface SessionTemplate {
  id: string;
  name: string;
  exercises: string[]; // Array of exercise IDs
}

interface SessionSelectionScreenProps {
  onSelectTemplate: (template: SessionTemplate) => void;
  onSelectIndividual: () => void;
  onBack: () => void;
}

export default function SessionSelectionScreen({
  onSelectTemplate,
  onSelectIndividual,
  onBack,
}: SessionSelectionScreenProps) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Start Session</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Quick Start Option */}
        <TouchableOpacity 
          style={styles.quickStartCard} 
          onPress={onSelectIndividual}
          activeOpacity={0.9}
        >
          <View style={styles.quickStartGlow} />
          <View style={styles.quickStartContent}>
            <Text style={styles.quickStartIcon}>🎯</Text>
            <View style={styles.quickStartText}>
              <Text style={styles.quickStartTitle}>QUICK START</Text>
              <Text style={styles.quickStartSubtitle}>Choose exercises individually</Text>
            </View>
            <Text style={styles.quickStartArrow}>→</Text>
          </View>
        </TouchableOpacity>

        {/* Templates Section */}
        <View style={styles.templatesSection}>
          <Text style={styles.sectionTitle}>YOUR DECKS</Text>
          {loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Loading...</Text>
            </View>
          ) : templates.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No decks created yet</Text>
              <Text style={styles.emptySubtext}>Create one in Templates</Text>
            </View>
          ) : (
            templates.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={styles.deckCard}
                onPress={() => onSelectTemplate(template)}
                activeOpacity={0.8}
              >
                <View style={styles.deckCardGlow} />
                <View style={styles.deckCardContent}>
                  <Text style={styles.deckIcon}>⚡</Text>
                  <View style={styles.deckInfo}>
                    <Text style={styles.deckName}>{template.name.toUpperCase()}</Text>
                    <Text style={styles.deckCount}>
                      {template.exercises.length} EXERCISE{template.exercises.length !== 1 ? 'S' : ''}
                    </Text>
                  </View>
                  <Text style={styles.deckArrow}>→</Text>
                </View>
                <View style={styles.deckCardBorder} />
              </TouchableOpacity>
            ))
          )}
        </View>
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
    fontSize: 14,
    fontWeight: '800',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textShadowColor: Colors.primary,
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  quickStartCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
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
  quickStartGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.accent1,
    opacity: 0.3,
  },
  quickStartContent: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  quickStartIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  quickStartText: {
    flex: 1,
  },
  quickStartTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: 4,
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  quickStartSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  quickStartArrow: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.accent1,
  },
  templatesSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.secondary,
    marginBottom: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
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
  deckCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  deckIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  deckInfo: {
    flex: 1,
  },
  deckName: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: 4,
    letterSpacing: 1,
  },
  deckCount: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  deckArrow: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.secondary,
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
});

