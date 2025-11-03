/**
 * Doctor Schedule Screen
 * Lịch khám của bác sĩ
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

import { AppHeader } from '@/components/layout/AppHeader';
import { SafeContainer } from '@/components/layout/SafeContainer';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function DoctorSchedule() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <>
      <AppHeader
        title="Lịch khám"
        showNotification
        showSearch
      />

      <SafeContainer scrollable padding>
        <Card>
          <View className="items-center py-16">
            <Ionicons name="calendar-outline" size={64} color={Colors.gray[300]} />
            <Text className="mt-4 text-lg font-semibold" style={{ color: theme.text.primary }}>
              Lịch khám
            </Text>
            <Text className="mt-2 text-center" style={{ color: theme.text.secondary }}>
              Tính năng đang được phát triển
            </Text>
          </View>
        </Card>
      </SafeContainer>
    </>
  );
}
