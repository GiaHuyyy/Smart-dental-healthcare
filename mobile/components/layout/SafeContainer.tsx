/**
 * SafeContainer Component
 * Container with safe area insets and consistent padding
 */

import React from 'react';
import { ScrollView, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SafeContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  padding?: boolean;
  paddingHorizontal?: boolean;
  paddingVertical?: boolean;
  backgroundColor?: string;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
}

export function SafeContainer({
  children,
  scrollable = false,
  padding = false,
  paddingHorizontal = false,
  paddingVertical = false,
  backgroundColor,
  style,
  contentContainerStyle,
  edges = ['top', 'bottom'],
}: SafeContainerProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: backgroundColor || theme.background,
    ...style,
  };

  const contentStyle: ViewStyle = {
    paddingHorizontal: padding || paddingHorizontal ? Spacing.base : 0,
    paddingVertical: padding || paddingVertical ? Spacing.base : 0,
    paddingBottom: scrollable ? 100 : padding || paddingVertical ? Spacing.base : 0, // Extra space for tab bar
    ...contentContainerStyle,
  };

  if (scrollable) {
    return (
      <SafeAreaView style={containerStyle} edges={edges}>
        <ScrollView
          contentContainerStyle={contentStyle}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={containerStyle} edges={edges}>
      <View style={contentStyle}>{children}</View>
    </SafeAreaView>
  );
}

export default SafeContainer;
