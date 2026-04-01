import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';

export interface DayIndicator {
  color: string;
}

export interface DayData {
  [dateKey: string]: DayIndicator[]; // "YYYY-MM-DD" → array of colored indicators
}

interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
  dayData?: DayData;
  style?: ViewStyle;
  testID?: string;
}

const MAX_DOTS = 5;

export const Calendar = ({ selected, onSelect, dayData, style, testID }: CalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(selected || new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const days: (number | null)[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
  for (let day = 1; day <= daysInMonth; day++) days.push(day);
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) for (let i = 0; i < remaining; i++) days.push(null);

  const todayObj = new Date();
  const isToday = (day: number) =>
    todayObj.getDate() === day && todayObj.getMonth() === month && todayObj.getFullYear() === year;

  const isSelected = (day: number) => {
    if (!selected) return false;
    return selected.getDate() === day && selected.getMonth() === month && selected.getFullYear() === year;
  };

  const dateKey = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return (
    <View testID={testID} style={[styles.container, style]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCurrentMonth(new Date(year, month - 1, 1))} style={styles.navButton}>
          <Text style={styles.navText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthText}>{monthNames[month]} {year}</Text>
        <TouchableOpacity onPress={() => setCurrentMonth(new Date(year, month + 1, 1))} style={styles.navButton}>
          <Text style={styles.navText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekDays}>
        {weekDays.map((d, i) => (
          <View key={i} style={styles.weekDayCell}>
            <Text style={styles.weekDayText}>{d}</Text>
          </View>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {days.map((day, index) => {
          const indicators = day ? (dayData?.[dateKey(day)] || []) : [];
          const dots = indicators.slice(0, MAX_DOTS);
          const dayIsToday = day ? isToday(day) : false;
          const dayIsSelected = day ? isSelected(day) : false;

          return (
            <TouchableOpacity
              key={index}
              style={styles.dayCell}
              onPress={() => day && onSelect?.(new Date(year, month, day))}
              disabled={!day}
              activeOpacity={0.6}
            >
              {day !== null && (
                <View style={[
                  styles.dayInner,
                  dayIsToday && styles.todayInner,
                  dayIsSelected && styles.selectedInner,
                ]}>
                  <Text style={[
                    styles.dayText,
                    dayIsToday && styles.todayText,
                    dayIsSelected && styles.selectedText,
                  ]}>
                    {day}
                  </Text>
                  {dots.length > 0 && (
                    <View style={styles.dotsRow}>
                      {dots.map((dot, di) => (
                        <View key={di} style={[styles.dot, { backgroundColor: dot.color }]} />
                      ))}
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const CELL_ASPECT = 1.1;

const styles = StyleSheet.create({
  container: { width: '100%' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  navText: { fontSize: 18, color: Colors.textPrimary, fontWeight: '600' },
  monthText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  weekDays: { flexDirection: 'row', marginBottom: 4 },
  weekDayCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  weekDayText: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1 / CELL_ASPECT,
    padding: 1,
  },
  dayInner: {
    flex: 1,
    borderRadius: 6,
    paddingTop: 3,
    paddingLeft: 5,
    gap: 2,
  },
  dayText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  todayInner: {
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  todayText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  selectedInner: {
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.textPrimary,
  },
  selectedText: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  dotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    marginTop: 1,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
