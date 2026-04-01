import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Coins, Settings, User, Users } from 'lucide-react-native';
import { useUserStats } from '../hooks/useUserStats';
import { getXPForLevel } from '../services/xpService';
import { Colors } from '../constants/colors';
import { Card } from './ui/Card';

interface TopHeaderProps {
  onViewProfile?: () => void;
  onViewFriends?: () => void;
  onViewSettings?: () => void;
}

export function TopHeader({ onViewProfile, onViewFriends, onViewSettings }: TopHeaderProps) {
  const { stats } = useUserStats();

  if (!stats) return null;

  const xpForCurrentLevel = getXPForLevel(stats.level);
  let cumulativeXPForPreviousLevels = 0;
  for (let level = 1; level < stats.level; level++) {
    cumulativeXPForPreviousLevels += getXPForLevel(level);
  }
  let currentLevelXP = stats.level_xp - cumulativeXPForPreviousLevels;
  if (currentLevelXP < 0 || currentLevelXP > xpForCurrentLevel * 2) {
    if (stats.level_xp < xpForCurrentLevel * 2) {
      currentLevelXP = stats.level_xp;
    } else {
      currentLevelXP = Math.max(0, stats.level_xp - cumulativeXPForPreviousLevels);
    }
  }
  currentLevelXP = Math.max(0, Math.min(currentLevelXP, xpForCurrentLevel));

  return (
    <View style={styles.wrapper}>
      {/* Level + XP + Gold */}
      <View style={styles.levelRow}>
        <View style={styles.levelBadge}>
          <View style={styles.levelSquare}>
            <Text style={styles.levelNumber}>{stats.level}</Text>
          </View>
          <View style={styles.xpRect}>
            <Text style={styles.xpRectText}>
              {currentLevelXP.toLocaleString()}/{xpForCurrentLevel.toLocaleString()} XP
            </Text>
          </View>
        </View>
        <View style={styles.goldBadge}>
          <Coins size={16} color={Colors.xpGold} strokeWidth={2.25} />
          <Text style={styles.goldBadgeText}>
            {(stats.gold || 0).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <Card style={styles.quickActionsCard}>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={onViewProfile} activeOpacity={0.7}>
            <User size={20} color={Colors.textPrimary} strokeWidth={2.25} />
          </TouchableOpacity>
          <View style={styles.quickActionDivider} />
          <TouchableOpacity style={styles.quickAction} onPress={onViewFriends} activeOpacity={0.7}>
            <Users size={20} color={Colors.textPrimary} strokeWidth={2.25} />
          </TouchableOpacity>
          <View style={styles.quickActionDivider} />
          <TouchableOpacity style={styles.quickAction} onPress={onViewSettings} activeOpacity={0.7}>
            <Settings size={20} color={Colors.textPrimary} strokeWidth={2.25} />
          </TouchableOpacity>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 20,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  levelBadge: {
    flex: 6,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  levelSquare: {
    width: 40,
    height: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  xpRect: {
    flex: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundCardTransparent,
  },
  xpRectText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  goldBadge: {
    flex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundCardTransparent,
  },
  goldBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.xpGold,
  },
  quickActionsCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundCard,
    padding: 0,
    overflow: 'hidden',
  },
  quickActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  quickActionDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },
});
