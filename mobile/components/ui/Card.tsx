/**
 * Card Component
 * Reusable card with elevation, padding, and optional gradient
 */

import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, View, ViewStyle } from 'react-native';

import { Colors } from '@/constants/colors';
import { BorderRadius } from '@/constants/shadows';
import { Shadows, ShadowLevel } from '@/constants/shadows';
import { Spacing } from '@/constants/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
  onPress?: () => void;
  gradient?: boolean;
  gradientColors?: [string, string];
  shadow?: ShadowLevel;
  padding?: keyof typeof Spacing | number;
  borderRadius?: keyof typeof BorderRadius | number;
}

export function Card({
  children,
  className = '',
  style,
  onPress,
  gradient = false,
  gradientColors,
  shadow = 'sm',
  padding = 'base',
  borderRadius = 'xl',
}: CardProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const paddingValue = typeof padding === 'number' ? padding : Spacing[padding];
  const borderRadiusValue = typeof borderRadius === 'number' ? borderRadius : BorderRadius[borderRadius];

  const cardStyle: ViewStyle = {
    ...Shadows[shadow],
    padding: paddingValue,
    borderRadius: borderRadiusValue,
    backgroundColor: gradient ? 'transparent' : theme.card,
    borderWidth: gradient ? 0 : 1,
    borderColor: theme.border,
    ...style,
  };

  const content = gradient ? (
    <LinearGradient
      colors={gradientColors || [Colors.primary[600], Colors.primary[700]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={cardStyle}
    >
      {children}
    </LinearGradient>
  ) : (
    <View style={cardStyle} className={className}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} className="active:opacity-90">
        {content}
      </Pressable>
    );
  }

  return content;
}

export default Card;
