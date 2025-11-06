/**
 * Custom Calendar Component
 * Trực quan, dễ sử dụng, không cần thư viện bên ngoài
 */

import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

interface CalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  markedDates?: {
    [key: string]: {
      dots?: Array<{ color: string }>;
      selected?: boolean;
      disabled?: boolean;
    };
  };
  minDate?: Date;
  maxDate?: Date;
}

export function CustomCalendar({
  selectedDate,
  onDateSelect,
  markedDates = {},
  minDate,
  maxDate,
}: CalendarProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [currentMonth, setCurrentMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );

  const weekDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
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

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: Array<{
      date: Date | null;
      day: number | null;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      isDisabled: boolean;
      dots?: Array<{ color: string }>;
    }> = [];

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const date = new Date(year, month - 1, day);
      days.push({
        date,
        day,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        isDisabled: true,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
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

      let isDisabled = false;
      if (minDate && date < minDate) isDisabled = true;
      if (maxDate && date > maxDate) isDisabled = true;
      if (markedDates[dateKey]?.disabled) isDisabled = true;

      days.push({
        date,
        day,
        isCurrentMonth: true,
        isToday,
        isSelected,
        isDisabled,
        dots: markedDates[dateKey]?.dots,
      });
    }

    // Next month days to fill grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        day,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        isDisabled: true,
      });
    }

    return days;
  }, [currentMonth, selectedDate, markedDates, minDate, maxDate]);

  const goToPreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    onDateSelect(today);
  };

  return (
    <View className="bg-white rounded-xl p-3 mb-3" style={{ backgroundColor: theme.card }}>
      {/* Header - Compact */}
      <View className="flex-row items-center justify-between mb-3">
        <Pressable
          onPress={goToPreviousMonth}
          className="w-8 h-8 items-center justify-center rounded-lg active:opacity-70"
          style={{ backgroundColor: Colors.primary[50] }}
        >
          <Ionicons name="chevron-back" size={18} color={Colors.primary[600]} />
        </Pressable>

        <Pressable onPress={goToToday} className="flex-1 items-center active:opacity-70">
          <Text className="text-base font-bold" style={{ color: theme.text.primary }}>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>
        </Pressable>

        <Pressable
          onPress={goToNextMonth}
          className="w-8 h-8 items-center justify-center rounded-lg active:opacity-70"
          style={{ backgroundColor: Colors.primary[50] }}
        >
          <Ionicons name="chevron-forward" size={18} color={Colors.primary[600]} />
        </Pressable>
      </View>

      {/* Week days header - Compact */}
      <View className="flex-row mb-1">
        {weekDays.map((day, index) => (
          <View key={index} className="flex-1 items-center">
            <Text
              className="text-xs font-semibold"
              style={{
                color: index === 0 ? Colors.error[500] : theme.text.secondary,
              }}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar grid - Compact */}
      <View className="flex-row flex-wrap">
        {calendarDays.map((item, index) => {
          const isDisabled = item.isDisabled || !item.isCurrentMonth;

          return (
            <Pressable
              key={index}
              onPress={() => {
                if (!isDisabled && item.date) {
                  onDateSelect(item.date);
                }
              }}
              disabled={isDisabled}
              className="items-center justify-center"
              style={{ width: '14.28%', height: 40 }}
            >
              <View
                className="w-8 h-8 items-center justify-center rounded-full"
                style={{
                  backgroundColor: item.isSelected
                    ? Colors.primary[600]
                    : item.isToday
                    ? Colors.primary[50]
                    : 'transparent',
                }}
              >
                <Text
                  className="text-xs font-medium"
                  style={{
                    color: item.isSelected
                      ? '#fff'
                      : item.isToday
                      ? Colors.primary[600]
                      : isDisabled
                      ? Colors.gray[300]
                      : theme.text.primary,
                  }}
                >
                  {item.day}
                </Text>

                {/* Dots indicator - Smaller */}
                {item.dots && item.dots.length > 0 && (
                  <View className="flex-row gap-0.5 absolute -bottom-0.5">
                    {item.dots.slice(0, 3).map((dot, dotIndex) => (
                      <View
                        key={dotIndex}
                        className="w-1 h-1 rounded-full"
                        style={{ backgroundColor: dot.color }}
                      />
                    ))}
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
