import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../config/supabase';
import { Colors } from '../constants/colors';
import { useCustomAlert } from '../utils/alert';
import { useInvalidate, useChallengesRealtime } from '../hooks/useQueryHooks';
import { TopHeader } from '../components/TopHeader';

// Auth Screens
import SimpleLoginScreen from '../screens/auth/SimpleLoginScreen';
import SimpleSignupScreen from '../screens/auth/SimpleSignupScreen';

// Main Screens
import HomeScreen from '../screens/main/HomeScreen';
import SessionSelectionScreen from '../screens/main/SessionSelectionScreen';
import ExerciseSelectionScreen from '../screens/main/ExerciseSelectionScreen';
import WorkoutScreen from '../screens/main/WorkoutScreen';
import SessionTemplatesScreen from '../screens/main/SessionTemplatesScreen';
import GymScreen from '../screens/main/GymScreen';
import MonthlyXPHistoryScreen from '../screens/main/MonthlyXPHistoryScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import FriendsScreen from '../screens/main/FriendsScreen';
import GroupsScreen from '../screens/main/GroupsScreen';
import LeaderboardScreen from '../screens/main/LeaderboardScreen';
import LeaderboardDetailScreen from '../screens/main/LeaderboardDetailScreen';
import LiftOffDetailScreen from '../screens/main/LiftOffDetailScreen';
import ChallengeHistoryScreen from '../screens/main/ChallengeHistoryScreen';
import ViewProfileScreen from '../screens/main/ViewProfileScreen';
import HabitsScreen from '../screens/main/HabitsScreen';
import TexturedBackground from '../components/TexturedBackground';
import { BottomTabs } from '../components/BottomTabs';
import { SwipeableTabView } from '../components/SwipeableTabView';
import { WorkoutCompleteModal, WorkoutResult } from '../components/WorkoutCompleteModal';

// Services
import { Exercise } from '../services/exerciseService';
import { ExerciseSet, processWorkoutSession, getMonthlyStreakMultiplier } from '../services/xpService';
import { getExercises } from '../services/exerciseService';
import { useUserStats } from '../hooks/useUserStats';

type Screen =
  | 'home'
  | 'session-selection'
  | 'exercise-selection'
  | 'workout'
  | 'templates'
  | 'deck-selection'
  | 'monthly-xp'
  | 'profile'
  | 'friends'
  | 'groups'
  | 'leaderboard'
  | 'leaderboard-detail'
  | 'lift-off-detail'
  | 'challenge-history'
  | 'view-profile'
  | 'habits'
  | 'gym'
  | 'tbd';

// Tab bar order: left to right = TBD, Habits, Home, Gym, Clans (must match BottomTabs)
const TAB_ROUTES: Screen[] = ['tbd', 'habits', 'home', 'gym', 'leaderboard'];

export default function AppNavigator() {
  const { session, loading } = useAuth();
  const { refreshStats } = useUserStats();
  const { showAlert, AlertComponent } = useCustomAlert();
  const invalidate = useInvalidate();
  const insets = useSafeAreaInsets();
  useChallengesRealtime();
  const [showSignup, setShowSignup] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedLeaderboardId, setSelectedLeaderboardId] = useState<string | 'global'>('global');
  const [selectedLeaderboardData, setSelectedLeaderboardData] = useState<any>(null);
  const [selectedLiftOffId, setSelectedLiftOffId] = useState<string | null>(null);
  const [viewingProfileUserId, setViewingProfileUserId] = useState<string | null>(null);
  const [viewingProfileUsername, setViewingProfileUsername] = useState<string>('');
  const [previousScreen, setPreviousScreen] = useState<Screen>('home');
  const [workoutResult, setWorkoutResult] = useState<WorkoutResult | null>(null);
  const [showWorkoutComplete, setShowWorkoutComplete] = useState(false);

  // Streak multiplier: 1 + 0.05 per session this month (resets monthly)
  const getStreakMultiplier = async (userId: string): Promise<number> => {
    return getMonthlyStreakMultiplier(userId);
  };

  const handleStartSession = () => {
    setCurrentScreen('session-selection');
  };

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template);
    // Load exercises from template — handle both old string[] and new ExerciseDetail[] formats
    getExercises().then(({ data: allExercises }) => {
      if (allExercises) {
        const exerciseIds: string[] = template.exercises.map((item: any) =>
          typeof item === 'string' ? item : item.id
        );
        const templateExercises = allExercises.filter((e) =>
          exerciseIds.includes(e.id)
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
    const exists = selectedExercises.find((e) => e.id === exercise.id);
    if (exists) {
      setSelectedExercises(selectedExercises.filter((e) => e.id !== exercise.id));
    } else {
      setSelectedExercises([...selectedExercises, exercise]);
    }
  };

  const handleStartWorkout = () => {
    if (selectedExercises.length === 0) {
      showAlert({
        title: 'Error',
        message: 'Please select at least one exercise',
        type: 'error',
      });
      return;
    }
    setCurrentScreen('workout');
  };

  const handleCompleteWorkout = async (exerciseSets: ExerciseSet[]) => {
    if (!session?.user) {
      showAlert({
        title: 'Error',
        message: 'You must be logged in',
        type: 'error',
      });
      return;
    }

    const streakMultiplier = await getStreakMultiplier(session.user.id);
    const result = await processWorkoutSession(
      session.user.id,
      exerciseSets,
      streakMultiplier
    );

    if (result.error) {
      showAlert({
        title: 'Error',
        message: result.error.message || 'Failed to process workout',
        type: 'error',
      });
    } else {
      setWorkoutResult({
        sessionXP: result.data?.sessionXP || 0,
        exerciseXP: result.data?.exerciseXP || 0,
        prsAchieved: result.data?.prsAchieved || 0,
        streakMultiplier: result.data?.streakMultiplier || 1,
        goldEarned: result.data?.goldEarned || 0,
        newLevel: result.data?.newLevel || 1,
        levelProgress: result.data?.levelProgress || { current: 0, needed: 100, level: 1 },
        exerciseLogs: result.data?.exerciseLogs,
      });
      setShowWorkoutComplete(true);
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'session-selection':
        return (
          <SessionSelectionScreen
            onSelectIndividual={handleSelectIndividual}
            onViewTemplates={() => setCurrentScreen('deck-selection')}
            onBack={() => setCurrentScreen('gym')}
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
          return (
            <ExerciseSelectionScreen
              onExerciseSelected={handleExerciseSelected}
              onBack={() => setCurrentScreen('session-selection')}
              onStartWorkout={handleStartWorkout}
              selectedExerciseIds={[]}
            />
          );
        }
        const templateDetails = selectedTemplate?.exercises
          ?.map((item: any) => {
            if (typeof item !== 'object' || !item.id) return null;
            const tags: string[] = item.tags?.length
              ? item.tags
              : item.label
                ? [item.label]
                : [];
            return { id: item.id, sets: item.sets ?? 1, reps: item.reps ?? 10, tags };
          })
          .filter(Boolean) || undefined;

        return (
          <WorkoutScreen
            exercises={selectedExercises}
            templateDetails={templateDetails}
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
      case 'gym':
        return (
          <GymScreen
            onStartWorkout={() => setCurrentScreen('session-selection')}
            onViewChallenge={(challengeId) => {
              setSelectedLiftOffId(challengeId);
              setCurrentScreen('lift-off-detail');
            }}
            onViewClans={() => setCurrentScreen('leaderboard')}
          />
        );
      case 'templates':
        return (
          <SessionTemplatesScreen
            onViewProfile={() => setCurrentScreen('profile')}
            onViewFriends={() => setCurrentScreen('friends')}
            onViewSettings={() => setCurrentScreen('profile')}
          />
        );
      case 'deck-selection':
        return (
          <SessionTemplatesScreen
            onSelectTemplate={handleSelectTemplate}
            onBack={() => setCurrentScreen('session-selection')}
          />
        );
      case 'monthly-xp':
        return <MonthlyXPHistoryScreen onBack={() => setCurrentScreen('profile')} />;
      case 'profile':
        return (
          <ProfileScreen
            onViewChallengeHistory={() => setCurrentScreen('challenge-history')}
            onViewMonthlyXP={() => setCurrentScreen('monthly-xp')}
            onClose={() => setCurrentScreen('home')}
          />
        );
      case 'challenge-history':
        return (
          <ChallengeHistoryScreen
            onBack={() => setCurrentScreen('profile')}
            onViewChallenge={(challengeId) => {
              setSelectedLiftOffId(challengeId);
              setCurrentScreen('lift-off-detail');
            }}
          />
        );
      case 'friends':
        return (
          <FriendsScreen
            onViewProfile={(userId, username) => {
              setPreviousScreen('friends');
              setViewingProfileUserId(userId);
              setViewingProfileUsername(username);
              setCurrentScreen('view-profile');
            }}
            onClose={() => setCurrentScreen('home')}
          />
        );
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
            onViewProfile={(userId, username) => {
              setPreviousScreen('leaderboard-detail');
              setViewingProfileUserId(userId);
              setViewingProfileUsername(username);
              setCurrentScreen('view-profile');
            }}
          />
        );
      case 'view-profile':
        return (
          <ViewProfileScreen
            userId={viewingProfileUserId || ''}
            username={viewingProfileUsername}
            onBack={() => {
              setCurrentScreen(previousScreen);
            }}
          />
        );
      case 'lift-off-detail':
        return (
          <LiftOffDetailScreen
            challengeId={selectedLiftOffId || ''}
            onBack={() => setCurrentScreen('home')}
            onChallengeUpdate={() => setCurrentScreen('home')}
          />
        );
      case 'habits':
        return <HabitsScreen />;
      case 'tbd':
        return (
          <View style={styles.placeholderTab}>
            <Text style={styles.placeholderIcon}>🚧</Text>
            <Text style={styles.placeholderTitle}>Coming Soon</Text>
            <Text style={styles.placeholderSubtitle}>This feature is under construction</Text>
          </View>
        );
      default:
        return (
          <HomeScreen
            onStartSession={handleStartSession}
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
  const showNav = !['session-selection', 'exercise-selection', 'workout', 'deck-selection', 'templates', 'leaderboard-detail', 'lift-off-detail', 'challenge-history', 'view-profile', 'friends', 'profile', 'monthly-xp'].includes(
    currentScreen
  );

  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen as Screen);
  };

  const tabIndex = TAB_ROUTES.indexOf(currentScreen);
  const canSwipe = showNav && tabIndex >= 0;

  // Render a tab screen by route for use as adjacent pager content
  const renderTabScreen = (route: Screen) => {
    switch (route) {
      case 'tbd':
        return (
          <View style={styles.placeholderTab}>
            <Text style={styles.placeholderIcon}>🚧</Text>
            <Text style={styles.placeholderTitle}>Coming Soon</Text>
            <Text style={styles.placeholderSubtitle}>This feature is under construction</Text>
          </View>
        );
      case 'habits':
        return <HabitsScreen noTopPadding />;
      case 'gym':
        return (
          <GymScreen
            onStartWorkout={() => setCurrentScreen('session-selection')}
            onViewChallenge={(challengeId) => {
              setSelectedLiftOffId(challengeId);
              setCurrentScreen('lift-off-detail');
            }}
            onViewClans={() => setCurrentScreen('leaderboard')}
            noTopPadding
          />
        );
      case 'leaderboard':
        return (
          <LeaderboardScreen
            onSelectLeaderboard={(groupId, groupData) => {
              setSelectedLeaderboardId(groupId);
              setSelectedLeaderboardData(groupData);
              setCurrentScreen('leaderboard-detail');
            }}
            noTopPadding
          />
        );
      case 'home':
      default:
        return (
          <HomeScreen
            onStartSession={handleStartSession}
            noTopPadding
          />
        );
    }
  };

  const tabScreens = TAB_ROUTES.map(route => renderTabScreen(route));

  return (
    <TexturedBackground>
      <View style={styles.container}>
        {canSwipe ? (
          <>
            <View style={[styles.sharedHeader, { paddingTop: insets.top + 8 }]}>
              <TopHeader
                onViewProfile={() => setCurrentScreen('profile')}
                onViewFriends={() => setCurrentScreen('friends')}
                onViewSettings={() => setCurrentScreen('profile')}
              />
            </View>
            <SwipeableTabView
              tabs={tabScreens}
              activeIndex={tabIndex}
              onChangeIndex={(index) => setCurrentScreen(TAB_ROUTES[index])}
            />
            {AlertComponent}
          </>
        ) : (
          <>
            {renderScreen()}
            {AlertComponent}
          </>
        )}
        {showNav && (
          <BottomTabs currentScreen={currentScreen} onNavigate={handleNavigate} />
        )}
        <WorkoutCompleteModal
          visible={showWorkoutComplete}
          result={workoutResult}
          onDismiss={() => {
            setShowWorkoutComplete(false);
            setWorkoutResult(null);
            setCurrentScreen('home');
            setSelectedExercises([]);
            setSelectedTemplate(null);
            refreshStats();
            invalidate.challenges();
          }}
        />
      </View>
    </TexturedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sharedHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  placeholderTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  placeholderIcon: {
    fontSize: 36,
    marginBottom: 4,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  placeholderSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
