/**
 * Doctor Patients Screen
 * Danh sách bệnh nhân
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

import { AppHeader } from '@/components/layout/AppHeader';
import { SafeContainer } from '@/components/layout/SafeContainer';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function DoctorPatients() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <>
      <AppHeader
        title="Bệnh nhân"
        showNotification
        showSearch
      />

      <SafeContainer scrollable padding>
        <Card>
          <View className="items-center py-16">
            <Ionicons name="people-outline" size={64} color={Colors.gray[300]} />
            <Text className="mt-4 text-lg font-semibold" style={{ color: theme.text.primary }}>
              Danh sách bệnh nhân
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
