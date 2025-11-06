/**
 * Week Calendar Component
 * Hiển thị lịch theo tuần với timeline
 */

import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

interface WeekCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  markedDates?: {
    [key: string]: {
      count?: number;
      color?: string;
    };
  };
}

export function WeekCalendar({
  selectedDate,
  onDateSelect,
  markedDates = {},
}: WeekCalendarProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const date = new Date(selectedDate);
    const day = date.getDay();
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
  });

  // Generate week days
  const weekDays = useMemo(() => {
    const days = [];
    const start = new Date(currentWeekStart);

    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);

      const dateKey = date.toISOString().split('T')[0];
      const today = new Date();
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
      const isSelected =
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear();

      days.push({
        date,
        day: date.getDate(),
        dayName: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()],
        isToday,
        isSelected,
        count: markedDates[dateKey]?.count || 0,
        color: markedDates[dateKey]?.color,
      });
    }

    return days;
  }, [currentWeekStart, selectedDate, markedDates]);

  const goToPreviousWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const goToNextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  const goToToday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    setCurrentWeekStart(new Date(today.setDate(diff)));
    onDateSelect(new Date());
  };

  const monthNames = [
    'Tháng 1',
    'Tháng 2',
    'Tháng 3',
    'Tháng 4',
    'Tháng 5',
    'Tháng 6',
    'Tháng 7',
    'Tháng 8',
    'Tháng 9',
    'Tháng 10',
    'Tháng 11',
    'Tháng 12',
  ];

  return (
    <View className="bg-white rounded-xl p-3 mb-3" style={{ backgroundColor: theme.card }}>
      {/* Header - Compact */}
      <View className="flex-row items-center justify-between mb-3">
        <Pressable
          onPress={goToPreviousWeek}
          className="w-8 h-8 items-center justify-center rounded-lg active:opacity-70"
          style={{ backgroundColor: Colors.primary[50] }}
        >
          <Ionicons name="chevron-back" size={18} color={Colors.primary[600]} />
        </Pressable>

        <Pressable onPress={goToToday} className="flex-1 items-center active:opacity-70">
          <Text className="text-base font-bold" style={{ color: theme.text.primary }}>
            {monthNames[currentWeekStart.getMonth()]} {currentWeekStart.getFullYear()}
          </Text>
        </Pressable>

        <Pressable
          onPress={goToNextWeek}
          className="w-8 h-8 items-center justify-center rounded-lg active:opacity-70"
          style={{ backgroundColor: Colors.primary[50] }}
        >
          <Ionicons name="chevron-forward" size={18} color={Colors.primary[600]} />
        </Pressable>
      </View>

      {/* Week days - Compact */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-row"
        contentContainerStyle={{ paddingVertical: 4, paddingHorizontal: 2 }}
      >
        {weekDays.map((item, index) => (
          <Pressable
            key={index}
            onPress={() => onDateSelect(item.date)}
            className="items-center mx-1.5 active:opacity-70"
          >
            <View
              className="w-12 h-16 items-center justify-center rounded-xl"
              style={{
                backgroundColor: item.isSelected
                  ? Colors.primary[600]
                  : item.isToday
                  ? Colors.primary[50]
                  : Colors.gray[50],
                borderWidth: item.isToday && !item.isSelected ? 2 : 0,
                borderColor: Colors.primary[600],
              }}
            >
              <Text
                className="text-xs font-medium mb-0.5"
                style={{
                  color: item.isSelected
                    ? '#fff'
                    : item.isToday
                    ? Colors.primary[600]
                    : theme.text.secondary,
                }}
              >
                {item.dayName}
              </Text>
              <Text
                className="text-lg font-bold"
                style={{
                  color: item.isSelected
                    ? '#fff'
                    : item.isToday
                    ? Colors.primary[600]
                    : theme.text.primary,
                }}
              >
                {item.day}
              </Text>

              {/* Count badge - Smaller, không che ngày */}
              {item.count > 0 && (
                <View
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full items-center justify-center px-1"
                  style={{
                    backgroundColor: item.color || Colors.primary[600],
                  }}
                >
                  <Text className="text-white text-[10px] font-bold">
                    {item.count > 9 ? '9+' : item.count}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
