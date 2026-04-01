import React, { useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { MobileShell } from '../../components/MobileShell';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface SessionSelectionScreenProps {
  onSelectTemplate?: (template: { id: string; name: string; exercises: string[] }) => void;
  onSelectIndividual: () => void;
  onViewTemplates?: () => void;
  onBack: () => void;
}

export default function SessionSelectionScreen({
  onSelectIndividual,
  onViewTemplates,
  onBack,
}: SessionSelectionScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const options = useMemo(
    () => [
      {
        title: 'Use Deck',
        body: 'Pick a saved routine and jump straight into sets.',
        icon: '📋',
        action: () => onViewTemplates?.(),
        testId: 'card-use-template',
      },
      {
        title: 'Custom Workout',
        body: "Build today's session from scratch. Choose exercises next.",
        icon: '✨',
        action: onSelectIndividual,
        testId: 'card-custom-workout',
      },
    ],
    [onSelectIndividual, onViewTemplates],
  );

  const animatedStyle = {
    opacity: fadeAnim,
    transform: [{ translateY: slideAnim }],
  };

  return (
    <MobileShell>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.container, animatedStyle]}>
          <View style={styles.header}>
            <Button
              variant="ghost"
              onPress={onBack}
              style={styles.backButton}
              testID="button-back-home"
            >
              <ChevronLeft size={18} color={Colors.textSecondary} strokeWidth={2} />
              <Text style={styles.backButtonText}>Back</Text>
            </Button>
            <Text style={styles.headerTitle}>START SESSION</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.screenTitle} testID="text-session-title">
              Choose your run
            </Text>
            <Text style={styles.screenSubtitle} testID="text-session-subtitle">
              Decks are fast. Custom is flexible.
            </Text>
          </View>

          <View style={styles.options}>
            {options.map((o) => (
              <TouchableOpacity
                key={o.title}
                activeOpacity={0.7}
                onPress={o.action}
                testID={o.testId}
                accessibilityRole="button"
              >
                <Card style={styles.optionCard}>
                  <CardContent style={styles.optionCardContent}>
                    <View style={styles.optionRow}>
                      <View style={styles.optionIcon}>
                        <Text style={styles.optionIconText}>{o.icon}</Text>
                      </View>
                      <View style={styles.optionText}>
                        <Text style={styles.optionTitle}>{o.title}</Text>
                        <Text style={styles.optionBody}>{o.body}</Text>
                      </View>
                    </View>
                    <View style={styles.optionFooter}>
                      <Button
                        onPress={o.action}
                        style={styles.selectButton}
                        testID={`button-${o.testId}`}
                      >
                        Select
                      </Button>
                    </View>
                  </CardContent>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  container: {
    gap: 20,
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
  titleSection: {
    marginBottom: 8,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  options: {
    gap: 12,
  },
  optionCard: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundCard,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  optionCardContent: {
    padding: 20,
    paddingTop: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconText: {
    fontSize: 24,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  optionBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  optionFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  selectButton: {
    height: 40,
    paddingHorizontal: 20,
  },
});
