/**
 * SectionHeader Component
 * Divider with title for sections
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  icon?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, action, icon }: SectionHeaderProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <View className="flex-row items-center justify-between mb-3">
      <View className="flex-row items-center gap-2 flex-1">
        {icon}
        <View className="flex-1">
          <Text className="text-lg font-semibold" style={{ color: theme.text.primary }}>
            {title}
          </Text>
          {subtitle && (
            <Text className="text-sm" style={{ color: theme.text.secondary }}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {action && (
        <Pressable onPress={action.onPress} className="active:opacity-70">
          <Text className="text-sm font-medium" style={{ color: Colors.primary[600] }}>
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default SectionHeader;
