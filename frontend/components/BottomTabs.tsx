import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Dumbbell, Home, Flame, Shield, HelpCircle } from 'lucide-react-native';
import { Colors } from '../constants/colors';

interface Tab {
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  testId: string;
  route: string;
}

const tabs: Tab[] = [
  { label: 'TBD', Icon: HelpCircle, testId: 'tab-tbd', route: 'tbd' },
  { label: 'Habits', Icon: Flame, testId: 'tab-habits', route: 'habits' },
  { label: 'Home', Icon: Home, testId: 'tab-home', route: 'home' },
  { label: 'Gym', Icon: Dumbbell, testId: 'tab-gym', route: 'gym' },
  { label: 'Clans', Icon: Shield, testId: 'tab-clans', route: 'leaderboard' },
];

interface BottomTabsProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
}

export function BottomTabs({ currentScreen, onNavigate }: BottomTabsProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.tabs}>
          {tabs.map((tab, index) => {
            const isActive = currentScreen === tab.route;

            return (
              <TouchableOpacity
                key={tab.testId}
                testID={`link-${tab.testId}`}
                onPress={() => onNavigate(tab.route)}
                style={[
                  styles.tab,
                  isActive && styles.tabActive,
                ]}
                activeOpacity={0.7}
              >
                <tab.Icon
                  size={20}
                  color={isActive ? Colors.textPrimary : Colors.textSecondary}
                  strokeWidth={2.25}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    isActive && styles.tabLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tabs: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingTop: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 16,
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: Colors.textSecondary,
  },
  tabLabelActive: {
    color: Colors.textPrimary,
  },
});
