import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, TrendingUp } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { getMonthlyXPHistory } from '../../services/xpService';
import { Colors } from '../../constants/colors';

interface MonthlyXP {
  id: string;
  month: string;
  total_xp: number;
}

interface MonthlyXPHistoryScreenProps {
  onBack: () => void;
}

export default function MonthlyXPHistoryScreen({ onBack }: MonthlyXPHistoryScreenProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<MonthlyXP[]>([]);
  const [sortOrder, setSortOrder] = useState<'high' | 'low'>('high');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadHistory();
  }, [user, sortOrder]);

  const loadHistory = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await getMonthlyXPHistory(user.id, sortOrder);
    if (data) setHistory(data);
    setLoading(false);
  };

  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const maxXP = history.length > 0 ? Math.max(...history.map(m => m.total_xp)) : 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <ChevronLeft size={18} color={Colors.textSecondary} strokeWidth={2} />
          <Text style={styles.backButtonLabel}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MONTHLY XP</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Sort Tabs */}
      <View style={styles.sortRow}>
        <TouchableOpacity
          style={[styles.sortTab, sortOrder === 'high' && styles.sortTabActive]}
          onPress={() => setSortOrder('high')}
          activeOpacity={0.7}
        >
          <Text style={[styles.sortText, sortOrder === 'high' && styles.sortTextActive]}>
            Highest
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortTab, sortOrder === 'low' && styles.sortTabActive]}
          onPress={() => setSortOrder('low')}
          activeOpacity={0.7}
        >
          <Text style={[styles.sortText, sortOrder === 'low' && styles.sortTextActive]}>
            Lowest
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      ) : history.length === 0 ? (
        <View style={styles.centered}>
          <TrendingUp size={32} color={Colors.textMuted} strokeWidth={1.5} />
          <Text style={styles.emptyText}>No monthly XP history yet</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {history.map((month, index) => {
            const barWidth = Math.max(8, (month.total_xp / maxXP) * 100);
            return (
              <View key={month.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={styles.rankCircle}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.monthName}>{formatMonth(month.month)}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${barWidth}%` }]} />
                    </View>
                  </View>
                  <Text style={styles.xpValue}>{month.total_xp.toLocaleString()}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backButtonLabel: {
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
  headerSpacer: { width: 64 },

  sortRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  sortTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  sortTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sortText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  sortTextActive: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },

  list: { flex: 1 },
  listContent: { gap: 8, paddingBottom: 32 },

  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rankText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  cardInfo: {
    flex: 1,
    gap: 6,
  },
  monthName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.backgroundSecondary,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  xpValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    minWidth: 60,
    textAlign: 'right',
  },
});
