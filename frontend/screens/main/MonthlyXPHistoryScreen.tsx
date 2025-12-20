import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { getMonthlyXPHistory } from '../../services/xpService';
import { Colors } from '../../constants/colors';

interface MonthlyXP {
  id: string;
  month: string;
  total_xp: number;
}

export default function MonthlyXPHistoryScreen() {
  const { user } = useAuth();
  const [history, setHistory] = useState<MonthlyXP[]>([]);
  const [sortOrder, setSortOrder] = useState<'high' | 'low'>('high');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user, sortOrder]);

  const loadHistory = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await getMonthlyXPHistory(user.id, sortOrder);
    if (data) {
      setHistory(data);
    }
    setLoading(false);
  };

  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>MONTHLY XP</Text>
        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[styles.sortButton, sortOrder === 'high' && styles.sortButtonActive]}
            onPress={() => setSortOrder('high')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.sortButtonText,
                sortOrder === 'high' && styles.sortButtonTextActive,
              ]}
            >
              HIGH
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortOrder === 'low' && styles.sortButtonActive]}
            onPress={() => setSortOrder('low')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.sortButtonText,
                sortOrder === 'low' && styles.sortButtonTextActive,
              ]}
            >
              LOW
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading...</Text>
          </View>
        ) : history.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>No monthly XP history yet</Text>
          </View>
        ) : (
          history.map((month, index) => (
            <View key={month.id} style={styles.monthCard}>
              <View style={styles.monthCardGlow} />
              <View style={styles.rankBadge}>
                <Text style={styles.rankNumber}>#{index + 1}</Text>
              </View>
              <View style={styles.monthInfo}>
                <Text style={styles.monthName}>{formatMonth(month.month).toUpperCase()}</Text>
                <Text style={styles.monthXP}>{month.total_xp.toLocaleString()} XP</Text>
              </View>
              <View style={styles.monthCardBorder} />
            </View>
          ))
        )}
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
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 2,
    textShadowColor: Colors.primary,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  sortButtons: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 14,
    padding: 4,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  sortButtonActive: {
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.accent1,
  },
  sortButtonText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sortButtonTextActive: {
    color: Colors.textPrimary,
    fontWeight: '900',
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
  },
  monthCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.xpGold,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: Colors.xpGold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  monthCardGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.xpGold,
    opacity: 0.2,
  },
  rankBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: Colors.accent1,
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  monthInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  monthXP: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.xpGold,
    textShadowColor: Colors.xpGold,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  monthCardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.textPrimary,
    opacity: 0.1,
  },
});
