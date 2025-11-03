/**
 * Badge Component
 * Small badge for status indicators and notifications
 */

import React from 'react';
import { Text, View, ViewStyle } from 'react-native';

import { Colors } from '@/constants/colors';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'gray';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
}

export function Badge({
  children,
  variant = 'primary',
  size = 'md',
  dot = false,
  className = '',
}: BadgeProps) {
  const sizeConfig = {
    sm: {
      paddingVertical: 2,
      paddingHorizontal: 8,
      fontSize: 10,
      dotSize: 4,
    },
    md: {
      paddingVertical: 4,
      paddingHorizontal: 10,
      fontSize: 12,
      dotSize: 6,
    },
    lg: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      fontSize: 14,
      dotSize: 8,
    },
  };

  const getColors = () => {
    switch (variant) {
      case 'primary':
        return {
          bg: Colors.primary[50],
          text: Colors.primary[700],
          dot: Colors.primary[500],
        };
      case 'success':
        return {
          bg: Colors.success[50],
          text: Colors.success[700],
          dot: Colors.success[500],
        };
      case 'warning':
        return {
          bg: Colors.warning[50],
          text: Colors.warning[700],
          dot: Colors.warning[500],
        };
      case 'error':
        return {
          bg: Colors.error[50],
          text: Colors.error[700],
          dot: Colors.error[500],
        };
      case 'gray':
        return {
          bg: Colors.gray[100],
          text: Colors.gray[700],
          dot: Colors.gray[500],
        };
      default:
        return {
          bg: Colors.primary[50],
          text: Colors.primary[700],
          dot: Colors.primary[500],
        };
    }
  };

  const colors = getColors();
  const config = sizeConfig[size];

  const containerStyle: ViewStyle = {
    backgroundColor: colors.bg,
    paddingVertical: config.paddingVertical,
    paddingHorizontal: config.paddingHorizontal,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  };

  return (
    <View style={containerStyle} className={className}>
      {dot && (
        <View
          style={{
            width: config.dotSize,
            height: config.dotSize,
            borderRadius: config.dotSize / 2,
            backgroundColor: colors.dot,
            marginRight: 6,
          }}
        />
      )}
      <Text
        style={{
          color: colors.text,
          fontSize: config.fontSize,
          fontWeight: '600',
        }}
      >
        {children}
      </Text>
    </View>
  );
}

export default Badge;
