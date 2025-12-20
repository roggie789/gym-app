import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../config/supabase';
import { Colors } from '../constants/colors';

// Auth Screens
import SimpleLoginScreen from '../screens/auth/SimpleLoginScreen';
import SimpleSignupScreen from '../screens/auth/SimpleSignupScreen';

// Main Screens
import HomeScreen from '../screens/main/HomeScreen';
import SessionSelectionScreen from '../screens/main/SessionSelectionScreen';
import ExerciseSelectionScreen from '../screens/main/ExerciseSelectionScreen';
import WorkoutScreen from '../screens/main/WorkoutScreen';
import SessionTemplatesScreen from '../screens/main/SessionTemplatesScreen';
import MonthlyXPHistoryScreen from '../screens/main/MonthlyXPHistoryScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import FriendsScreen from '../screens/main/FriendsScreen';
import GroupsScreen from '../screens/main/GroupsScreen';
import LeaderboardScreen from '../screens/main/LeaderboardScreen';
import LeaderboardDetailScreen from '../screens/main/LeaderboardDetailScreen';
import LiftOffDetailScreen from '../screens/main/LiftOffDetailScreen';

// Services
import { Exercise } from '../services/exerciseService';
import { ExerciseSet, processWorkoutSession } from '../services/xpService';
import { getExercises } from '../services/exerciseService';
import { useUserStats } from '../hooks/useUserStats';

type Screen =
  | 'home'
  | 'session-selection'
  | 'exercise-selection'
  | 'workout'
  | 'templates'
  | 'monthly-xp'
  | 'profile'
  | 'friends'
  | 'groups'
  | 'leaderboard'
  | 'leaderboard-detail'
  | 'lift-off-detail';

export default function AppNavigator() {
  const { session, loading } = useAuth();
  const { refreshStats } = useUserStats();
  const [showSignup, setShowSignup] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedLeaderboardId, setSelectedLeaderboardId] = useState<string | 'global'>('global');
  const [selectedLeaderboardData, setSelectedLeaderboardData] = useState<any>(null);
  const [selectedLiftOffId, setSelectedLiftOffId] = useState<string | null>(null);

  // Calculate streak multiplier
  const getStreakMultiplier = async (userId: string): Promise<number> => {
    const { data: stats } = await supabase
      .from('user_stats')
      .select('current_streak, last_workout_date')
      .eq('user_id', userId)
      .single();

    if (!stats) return 1.0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastWorkout = stats.last_workout_date
      ? new Date(stats.last_workout_date)
      : null;

    if (lastWorkout) {
      lastWorkout.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor(
        (today.getTime() - lastWorkout.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 1) {
        // Consecutive day
        const streak = (stats.current_streak || 0) + 1;
        return Math.min(1.0 + (streak - 1) * 0.1, 2.0);
      }
    }

    return 1.0;
  };

  const handleStartSession = () => {
    setCurrentScreen('session-selection');
  };

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template);
    // Load exercises from template
    getExercises().then(({ data: allExercises }) => {
      if (allExercises) {
        const templateExercises = allExercises.filter((e) =>
          template.exercises.includes(e.id)
        );
        setSelectedExercises(templateExercises);
        setCurrentScreen('workout');
      }
    });
  };

  const handleSelectIndividual = () => {
    setSelectedExercises([]);
    setCurrentScreen('exercise-selection');
  };

  const handleExerciseSelected = (exercise: Exercise) => {
    if (!selectedExercises.find((e) => e.id === exercise.id)) {
      setSelectedExercises([...selectedExercises, exercise]);
    }
    // Stay on selection screen to add more
  };

  const handleStartWorkout = () => {
    if (selectedExercises.length === 0) {
      Alert.alert('Error', 'Please select at least one exercise');
      return;
    }
    setCurrentScreen('workout');
  };

  const handleCompleteWorkout = async (exerciseSets: ExerciseSet[]) => {
    if (!session?.user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    const streakMultiplier = await getStreakMultiplier(session.user.id);
    const result = await processWorkoutSession(
      session.user.id,
      exerciseSets,
      streakMultiplier
    );

    if (result.error) {
      Alert.alert('Error', result.error.message || 'Failed to process workout');
    } else {
      let message = `Workout Complete!\n\n`;
      message += `Session XP: ${result.data?.sessionXP.toLocaleString()}\n`;
      if (result.data?.prsAchieved && result.data.prsAchieved > 0) {
        message += `🎉 ${result.data.prsAchieved} PR${result.data.prsAchieved > 1 ? 's' : ''} achieved!\n`;
      }
      if (streakMultiplier > 1) {
        message += `${streakMultiplier.toFixed(1)}x streak multiplier!\n`;
      }
      message += `\nLevel: ${result.data?.levelProgress.level}`;
      message += `\nXP Progress: ${result.data?.levelProgress.current} / ${result.data?.levelProgress.needed}`;

      Alert.alert('Success', message, [
        {
          text: 'OK',
          onPress: () => {
            setCurrentScreen('home');
            setSelectedExercises([]);
            setSelectedTemplate(null);
            refreshStats();
          },
        },
      ]);
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'session-selection':
        return (
          <SessionSelectionScreen
            onSelectTemplate={handleSelectTemplate}
            onSelectIndividual={handleSelectIndividual}
            onBack={() => setCurrentScreen('home')}
          />
        );
      case 'exercise-selection':
        return (
          <ExerciseSelectionScreen
            onExerciseSelected={handleExerciseSelected}
            onBack={() => setCurrentScreen('session-selection')}
            onStartWorkout={handleStartWorkout}
            selectedExerciseIds={selectedExercises.map((e) => e.id)}
          />
        );
      case 'workout':
        if (selectedExercises.length === 0) {
          // If no exercises selected, go back to selection
          return (
            <ExerciseSelectionScreen
              onExerciseSelected={handleExerciseSelected}
              onBack={() => setCurrentScreen('session-selection')}
              onStartWorkout={handleStartWorkout}
              selectedExerciseIds={[]}
            />
          );
        }
        return (
          <WorkoutScreen
            exercises={selectedExercises}
            onComplete={handleCompleteWorkout}
            onBack={() => {
              if (selectedTemplate) {
                setCurrentScreen('session-selection');
              } else {
                setCurrentScreen('exercise-selection');
              }
            }}
          />
        );
      case 'templates':
        return <SessionTemplatesScreen />;
      case 'monthly-xp':
        return <MonthlyXPHistoryScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'friends':
        return <FriendsScreen />;
      case 'groups':
        return <GroupsScreen />;
      case 'leaderboard':
        return (
          <LeaderboardScreen
            onSelectLeaderboard={(groupId, groupData) => {
              setSelectedLeaderboardId(groupId);
              setSelectedLeaderboardData(groupData);
              setCurrentScreen('leaderboard-detail');
            }}
          />
        );
      case 'leaderboard-detail':
        return (
          <LeaderboardDetailScreen
            groupId={selectedLeaderboardId}
            groupData={selectedLeaderboardData}
            onBack={() => setCurrentScreen('leaderboard')}
          />
        );
      case 'lift-off-detail':
        return (
          <LiftOffDetailScreen
            challengeId={selectedLiftOffId || ''}
            onBack={() => {
              setCurrentScreen('home');
              // Trigger refresh by re-rendering home screen
              setTimeout(() => {
                if ((HomeScreen as any).refreshChallenges) {
                  (HomeScreen as any).refreshChallenges();
                }
              }, 100);
            }}
            onChallengeUpdate={() => {
              // Go back to home and refresh challenges
              setCurrentScreen('home');
              setTimeout(() => {
                if ((HomeScreen as any).refreshChallenges) {
                  (HomeScreen as any).refreshChallenges();
                }
              }, 100);
            }}
          />
        );
      default:
        return (
          <HomeScreen
            onStartSession={handleStartSession}
            onViewLiftOff={(challengeId) => {
              setSelectedLiftOffId(challengeId);
              setCurrentScreen('lift-off-detail');
            }}
            onChallengeUpdate={() => {
              // Refresh will happen automatically via useEffect
            }}
          />
        );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!session) {
    if (showSignup) {
      return <SimpleSignupScreen onSwitchToLogin={() => setShowSignup(false)} />;
    }
    return <SimpleLoginScreen onSwitchToSignup={() => setShowSignup(true)} />;
  }

  // Don't show nav on workout/selection screens or detail screens
  const showNav = !['session-selection', 'exercise-selection', 'workout', 'leaderboard-detail', 'lift-off-detail'].includes(
    currentScreen
  );

  return (
    <View style={styles.container}>
      {renderScreen()}
      {showNav && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, currentScreen === 'home' && styles.tabActive]}
            onPress={() => setCurrentScreen('home')}
          >
            <Text
              style={[styles.tabText, currentScreen === 'home' && styles.tabTextActive]}
            >
              Home
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, currentScreen === 'templates' && styles.tabActive]}
            onPress={() => setCurrentScreen('templates')}
          >
            <Text
              style={[
                styles.tabText,
                currentScreen === 'templates' && styles.tabTextActive,
              ]}
            >
              Templates
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, currentScreen === 'leaderboard' && styles.tabActive]}
            onPress={() => setCurrentScreen('leaderboard')}
          >
            <Text
              style={[
                styles.tabText,
                currentScreen === 'leaderboard' && styles.tabTextActive,
              ]}
            >
              Leaderboard
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, currentScreen === 'friends' && styles.tabActive]}
            onPress={() => setCurrentScreen('friends')}
          >
            <Text
              style={[styles.tabText, currentScreen === 'friends' && styles.tabTextActive]}
            >
              Friends
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, currentScreen === 'profile' && styles.tabActive]}
            onPress={() => setCurrentScreen('profile')}
          >
            <Text
              style={[styles.tabText, currentScreen === 'profile' && styles.tabTextActive]}
            >
              Profile
            </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundSecondary,
    borderTopWidth: 2,
    borderTopColor: Colors.primary,
    paddingVertical: 12,
    paddingBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabActive: {
    borderTopWidth: 3,
    borderTopColor: Colors.accent1,
    paddingTop: 5,
  },
  tabText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tabTextActive: {
    color: Colors.accent1,
    fontWeight: '900',
    textShadowColor: Colors.accent1,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
});
