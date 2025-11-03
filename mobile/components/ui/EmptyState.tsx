/**
 * EmptyState Component
 * Placeholder for empty lists/screens
 */

import React from 'react';
import { Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function EmptyState({
  icon,
  title = 'Không có dữ liệu',
  description,
  action,
}: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <View className="flex-1 items-center justify-center py-16 px-8">
      {icon && <View className="mb-4">{icon}</View>}
      
      <Text
        className="text-xl font-semibold text-center mb-2"
        style={{ color: theme.text.primary }}
      >
        {title}
      </Text>
      
      {description && (
        <Text
          className="text-base text-center mb-6"
          style={{ color: theme.text.secondary }}
        >
          {description}
        </Text>
      )}
      
      {action && (
        <Button variant="primary" onPress={action.onPress}>
          {action.label}
        </Button>
      )}
    </View>
  );
}

export default EmptyState;
