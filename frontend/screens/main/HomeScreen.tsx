import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { Maximize2, X, Trash2, Plus } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useUserStats } from '../../hooks/useUserStats';
import { supabase } from '../../config/supabase';
import { Colors } from '../../constants/colors';
import { MobileShell } from '../../components/MobileShell';
import { Card, CardContent } from '../../components/ui/Card';
import { Calendar, DayData } from '../../components/ui/Calendar';
import {
  Habit,
  HabitCompletion,
  getUserHabits,
  getCompletionsForMonth,
  getHabitColor,
} from '../../services/habitsService';
import {
  CalendarEvent,
  getEventsForMonth,
  createCalendarEvent,
  deleteCalendarEvent,
} from '../../services/calendarService';

interface HomeScreenProps {
  onStartSession: () => void;
  noTopPadding?: boolean;
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long' });
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface DailyItem {
  id: string;
  title: string;
  description: string | null;
  color: string;
  type: 'habit' | 'event';
}

const EVENT_COLORS = [
  '#3B82F6', '#10B981', '#8B5CF6', '#EF4444',
  '#F59E0B', '#EC4899', '#06B6D4', '#F97316',
  '#14B8A6', '#6366F1',
];

export default function HomeScreen({ onStartSession, noTopPadding }: HomeScreenProps) {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { stats, loading, refreshStats } = useUserStats();

  const [prevMonthXP, setPrevMonthXP] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // Day overlay state
  const [dayModalVisible, setDayModalVisible] = useState(false);
  const [dayModalDate, setDayModalDate] = useState<Date>(new Date());
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventColorIdx, setNewEventColorIdx] = useState(0);
  const [creating, setCreating] = useState(false);

  // Expand overlay state
  const [expandVisible, setExpandVisible] = useState(false);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const currentMonthLabel = getMonthLabel(now);
  const prevMonthLabel = getMonthLabel(prevDate);
  const prevMonthKey = getMonthKey(prevDate);

  useEffect(() => { refreshStats(); }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase.from('monthly_xp').select('total_xp').eq('user_id', user.id).eq('month', prevMonthKey).maybeSingle()
      .then(({ data }) => setPrevMonthXP(data?.total_xp || 0));
  }, [user, prevMonthKey]);

  const loadCalendarData = useCallback(async () => {
    if (!user) return;
    const [habitsRes, completionsRes, eventsRes] = await Promise.all([
      getUserHabits(user.id),
      getCompletionsForMonth(user.id, year, month),
      getEventsForMonth(user.id, year, month),
    ]);
    setHabits(habitsRes.data);
    setCompletions(completionsRes.data);
    setEvents(eventsRes.data);
  }, [user, year, month]);

  useEffect(() => { loadCalendarData(); }, [loadCalendarData]);

  // Build day data for calendar dots
  // Every habit gets a dot on every day of the month; completed = full color, pending = dimmed
  const daysInMonth = new Date(year, month, 0).getDate();

  const dayData: DayData = useMemo(() => {
    const data: DayData = {};
    const completionSet = new Set(completions.map((c) => `${c.habit_id}:${c.completed_date}`));

    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (!data[key]) data[key] = [];

      for (const habit of habits) {
        const isCompleted = completionSet.has(`${habit.id}:${key}`);
        data[key].push({ color: isCompleted ? habit.color : `${habit.color}40` });
      }
    }

    // Calendar events → dots per day
    for (const ev of events) {
      if (!data[ev.event_date]) data[ev.event_date] = [];
      data[ev.event_date].push({ color: ev.color });
    }

    return data;
  }, [habits, completions, events, year, month, daysInMonth]);

  // Get items for a specific date — habits show on every day, marked as done or pending
  const getItemsForDate = useCallback((date: Date): DailyItem[] => {
    const ds = toDateStr(date);
    const items: DailyItem[] = [];
    const completedHabitIds = new Set(
      completions.filter((c) => c.completed_date === ds).map((c) => c.habit_id)
    );

    for (const habit of habits) {
      const done = completedHabitIds.has(habit.id);
      items.push({
        id: done ? `h-${habit.id}-${ds}` : `hp-${habit.id}-${ds}`,
        title: done ? habit.name : `${habit.name} (pending)`,
        description: null,
        color: habit.color,
        type: 'habit',
      });
    }

    // Calendar events for this date
    const dayEvents = events.filter((e) => e.event_date === ds);
    for (const e of dayEvents) {
      items.push({ id: e.id, title: e.title, description: e.description, color: e.color, type: 'event' });
    }

    return items;
  }, [habits, completions, events]);

  const todayItems = useMemo(() => getItemsForDate(now), [getItemsForDate, now]);
  const dayModalItems = useMemo(() => getItemsForDate(dayModalDate), [getItemsForDate, dayModalDate]);

  const handleDayPress = (date: Date) => {
    setSelectedDate(date);
    setDayModalDate(date);
    setNewEventTitle('');
    setNewEventDesc('');
    setNewEventColorIdx(0);
    setDayModalVisible(true);
  };

  const handleCreateEvent = async () => {
    if (!user) return;
    const title = newEventTitle.trim();
    if (!title) {
      showAlert({ title: 'Error', message: 'Enter a title' });
      return;
    }
    setCreating(true);
    const color = EVENT_COLORS[newEventColorIdx];
    const { error } = await createCalendarEvent(user.id, title, toDateStr(dayModalDate), color, newEventDesc.trim() || undefined);
    setCreating(false);
    if (error) {
      showAlert({ title: 'Error', message: error.message });
    } else {
      setNewEventTitle('');
      setNewEventDesc('');
      loadCalendarData();
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    showAlert({
      title: 'Delete Event',
      message: 'Remove this event?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            await deleteCalendarEvent(eventId);
            loadCalendarData();
          },
        },
      ],
    });
  };

  if (loading || !stats) {
    return (
      <MobileShell>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </MobileShell>
    );
  }

  const currentXP = stats.current_month_xp || 0;
  const maxXP = Math.max(currentXP, prevMonthXP, 1);

  const dayModalDateStr = dayModalDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <MobileShell noTopPadding={noTopPadding}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Monthly XP Summary */}
          <Card style={styles.xpCard}>
            <CardContent style={styles.xpCardContent}>
              <View style={styles.xpMonth}>
                <View style={styles.xpMonthLeft}>
                  <Text style={styles.xpMonthLabel}>{currentMonthLabel}</Text>
                  <Text style={styles.xpMonthHint}>This month</Text>
                </View>
                <Text style={styles.xpMonthValue}>
                  {currentXP.toLocaleString()} <Text style={styles.xpUnit}>XP</Text>
                </Text>
              </View>
              <View style={styles.xpBar}>
                <View style={[styles.xpBarFill, { width: `${(currentXP / maxXP) * 100}%` }]} />
              </View>
              <View style={styles.xpDivider} />
              <View style={styles.xpMonth}>
                <View style={styles.xpMonthLeft}>
                  <Text style={styles.xpMonthLabelPrev}>{prevMonthLabel}</Text>
                  <Text style={styles.xpMonthHint}>Last month</Text>
                </View>
                <Text style={styles.xpMonthValuePrev}>
                  {prevMonthXP.toLocaleString()} <Text style={styles.xpUnit}>XP</Text>
                </Text>
              </View>
              <View style={styles.xpBar}>
                <View style={[styles.xpBarFillPrev, { width: `${(prevMonthXP / maxXP) * 100}%` }]} />
              </View>
            </CardContent>
          </Card>

          {/* Calendar */}
          <Card style={styles.calendarCard}>
            <CardContent style={styles.calendarCardContent}>
              <Calendar selected={selectedDate} onSelect={handleDayPress} dayData={dayData} />
            </CardContent>
          </Card>

          {/* Daily Overview */}
          <Card style={styles.dailyCard}>
            <View style={styles.dailyHeader}>
              <Text style={styles.dailyTitle}>TODAY</Text>
              {todayItems.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setDayModalDate(now);
                    setExpandVisible(true);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.6}
                >
                  <Maximize2 size={16} color={Colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
            {todayItems.length === 0 ? (
              <Text style={styles.dailyEmpty}>Nothing scheduled today</Text>
            ) : (
              <View style={styles.dailyList}>
                {todayItems.slice(0, 6).map((item) => (
                  <View key={item.id} style={styles.dailyItem}>
                    <View style={[styles.dailyDot, { backgroundColor: item.color }]} />
                    <Text style={styles.dailyItemText} numberOfLines={1}>{item.title}</Text>
                  </View>
                ))}
                {todayItems.length > 6 && (
                  <Text style={styles.dailyMore}>+{todayItems.length - 6} more</Text>
                )}
              </View>
            )}
          </Card>
        </View>
      </ScrollView>

      {/* Day Overlay Modal */}
      <Modal visible={dayModalVisible} transparent animationType="slide" onRequestClose={() => setDayModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.dayModal}>
            <View style={styles.dayModalHeader}>
              <Text style={styles.dayModalTitle}>{dayModalDateStr.toUpperCase()}</Text>
              <TouchableOpacity onPress={() => setDayModalVisible(false)} activeOpacity={0.7}>
                <X size={20} color={Colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.dayModalScroll} showsVerticalScrollIndicator={false}>
              {/* Existing items for this day */}
              {dayModalItems.length > 0 && (
                <View style={styles.dayModalSection}>
                  <Text style={styles.dayModalSectionLabel}>ITEMS</Text>
                  {dayModalItems.map((item) => (
                    <View key={item.id} style={styles.dayModalItem}>
                      <View style={[styles.dayModalItemDot, { backgroundColor: item.color }]} />
                      <View style={styles.dayModalItemContent}>
                        <Text style={styles.dayModalItemTitle}>{item.title}</Text>
                        {item.description && (
                          <Text style={styles.dayModalItemDesc}>{item.description}</Text>
                        )}
                      </View>
                      {item.type === 'event' && (
                        <TouchableOpacity
                          onPress={() => handleDeleteEvent(item.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          activeOpacity={0.6}
                        >
                          <Trash2 size={14} color={Colors.textMuted} strokeWidth={2} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Add Event Form */}
              <View style={styles.dayModalSection}>
                <Text style={styles.dayModalSectionLabel}>ADD EVENT</Text>
                <TextInput
                  style={styles.dayInput}
                  placeholder="Title"
                  placeholderTextColor={Colors.textMuted}
                  value={newEventTitle}
                  onChangeText={setNewEventTitle}
                />
                <TextInput
                  style={[styles.dayInput, styles.dayInputMulti]}
                  placeholder="Description (optional)"
                  placeholderTextColor={Colors.textMuted}
                  value={newEventDesc}
                  onChangeText={setNewEventDesc}
                  multiline
                  textAlignVertical="top"
                />
                <Text style={styles.dayModalColorLabel}>COLOR</Text>
                <View style={styles.colorRow}>
                  {EVENT_COLORS.map((c, i) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: c },
                        newEventColorIdx === i && styles.colorCircleSelected,
                      ]}
                      onPress={() => setNewEventColorIdx(i)}
                      activeOpacity={0.7}
                    />
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.addBtn, creating && { opacity: 0.5 }]}
                  onPress={handleCreateEvent}
                  disabled={creating}
                  activeOpacity={0.7}
                >
                  <Plus size={16} color={Colors.textPrimary} strokeWidth={2.5} />
                  <Text style={styles.addBtnText}>{creating ? 'Adding...' : 'Add Event'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Expand Daily Overview Overlay */}
      <Modal visible={expandVisible} transparent animationType="slide" onRequestClose={() => setExpandVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.expandModal}>
            <View style={styles.dayModalHeader}>
              <Text style={styles.dayModalTitle}>
                {dayModalDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
              </Text>
              <TouchableOpacity onPress={() => setExpandVisible(false)} activeOpacity={0.7}>
                <X size={20} color={Colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.expandScroll} showsVerticalScrollIndicator={false}>
              {getItemsForDate(dayModalDate).length === 0 ? (
                <Text style={styles.dailyEmpty}>No items for this day</Text>
              ) : (
                getItemsForDate(dayModalDate).map((item) => (
                  <View key={item.id} style={styles.expandItem}>
                    <View style={[styles.expandDot, { backgroundColor: item.color }]} />
                    <View style={styles.expandItemContent}>
                      <Text style={styles.expandItemTitle}>{item.title}</Text>
                      {item.description && (
                        <Text style={styles.expandItemDesc}>{item.description}</Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, gap: 20 },
  container: { gap: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: Colors.textPrimary, fontSize: 16 },

  // XP card
  xpCard: { borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.backgroundCard },
  xpCardContent: { padding: 16, gap: 8 },
  xpMonth: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  xpMonthLeft: { gap: 1 },
  xpMonthLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  xpMonthLabelPrev: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary },
  xpMonthHint: { fontSize: 11, fontWeight: '500', color: Colors.textMuted },
  xpMonthValue: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  xpMonthValuePrev: { fontSize: 18, fontWeight: '800', color: Colors.textSecondary },
  xpUnit: { fontSize: 12, fontWeight: '600' },
  xpBar: { height: 6, borderRadius: 3, backgroundColor: Colors.backgroundSecondary, overflow: 'hidden' },
  xpBarFill: { height: '100%', borderRadius: 3, backgroundColor: Colors.primary, minWidth: 4 },
  xpBarFillPrev: { height: '100%', borderRadius: 3, backgroundColor: Colors.textMuted, minWidth: 4 },
  xpDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },

  // Calendar card
  calendarCard: { borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.backgroundCard },
  calendarCardContent: { padding: 12 },

  // Daily overview
  dailyCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  dailyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dailyTitle: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 1 },
  dailyEmpty: { fontSize: 13, color: Colors.textMuted, paddingVertical: 4 },
  dailyList: { gap: 8 },
  dailyItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dailyDot: { width: 8, height: 8, borderRadius: 4 },
  dailyItemText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  dailyMore: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, marginTop: 2 },

  // Day overlay modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  dayModal: {
    backgroundColor: Colors.backgroundCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomWidth: 0,
  },
  dayModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  dayModalTitle: { fontSize: 12, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 1 },
  dayModalScroll: { paddingHorizontal: 20, paddingBottom: 20 },
  dayModalSection: { gap: 10, marginBottom: 20 },
  dayModalSectionLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1 },
  dayModalItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dayModalItemDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  dayModalItemContent: { flex: 1, gap: 2 },
  dayModalItemTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  dayModalItemDesc: { fontSize: 12, color: Colors.textSecondary },

  dayInput: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    color: Colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayInputMulti: { height: 72, paddingTop: 10 },
  dayModalColorLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1, marginTop: 2 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: 'transparent' },
  colorCircleSelected: { borderColor: Colors.textPrimary },

  addBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },

  // Expand overlay
  expandModal: {
    backgroundColor: Colors.backgroundCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomWidth: 0,
  },
  expandScroll: { paddingHorizontal: 20, paddingBottom: 20 },
  expandItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  expandDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  expandItemContent: { flex: 1, gap: 3 },
  expandItemTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  expandItemDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
});
