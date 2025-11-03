/**
 * Button Component
 * Modern button with multiple variants and sizes
 */

import React from 'react';
import { ActivityIndicator, Pressable, Text, TextStyle, ViewStyle } from 'react-native';

import { Colors } from '@/constants/colors';
import { BorderRadius } from '@/constants/shadows';
import { Typography } from '@/constants/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  className?: string;
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  className = '',
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  // Size configurations
  const sizeConfig = {
    sm: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      fontSize: Typography.fontSize.sm,
      height: 36,
    },
    md: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      fontSize: Typography.fontSize.base,
      height: 44,
    },
    lg: {
      paddingVertical: 16,
      paddingHorizontal: 24,
      fontSize: Typography.fontSize.lg,
      height: 52,
    },
  };

  // Variant configurations
  const getVariantStyles = (): {
    container: ViewStyle;
    text: TextStyle;
  } => {
    const baseContainer: ViewStyle = {
      borderRadius: BorderRadius.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      ...sizeConfig[size],
    };

    const baseText: TextStyle = {
      fontSize: sizeConfig[size].fontSize,
      fontWeight: Typography.fontWeight.semibold as any,
    };

    switch (variant) {
      case 'primary':
        return {
          container: {
            ...baseContainer,
            backgroundColor: disabled ? Colors.gray[300] : Colors.primary[600],
          },
          text: {
            ...baseText,
            color: Colors.white,
          },
        };

      case 'secondary':
        return {
          container: {
            ...baseContainer,
            backgroundColor: disabled ? Colors.gray[100] : Colors.gray[200],
          },
          text: {
            ...baseText,
            color: disabled ? Colors.gray[400] : Colors.gray[900],
          },
        };

      case 'outline':
        return {
          container: {
            ...baseContainer,
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: disabled ? Colors.gray[300] : Colors.primary[600],
          },
          text: {
            ...baseText,
            color: disabled ? Colors.gray[400] : Colors.primary[600],
          },
        };

      case 'ghost':
        return {
          container: {
            ...baseContainer,
            backgroundColor: 'transparent',
          },
          text: {
            ...baseText,
            color: disabled ? Colors.gray[400] : Colors.primary[600],
          },
        };

      case 'danger':
        return {
          container: {
            ...baseContainer,
            backgroundColor: disabled ? Colors.gray[300] : Colors.error[500],
          },
          text: {
            ...baseText,
            color: Colors.white,
          },
        };

      default:
        return {
          container: baseContainer,
          text: baseText,
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.container,
        fullWidth && { width: '100%' },
      ]}
      className={`${className} ${disabled || loading ? 'opacity-60' : 'active:opacity-80'}`}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? Colors.white : Colors.primary[600]}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && <>{icon}</>}
          <Text style={[styles.text, icon ? { marginLeft: iconPosition === 'left' ? 8 : 0, marginRight: iconPosition === 'right' ? 8 : 0 } : undefined]}>
            {children}
          </Text>
          {icon && iconPosition === 'right' && <>{icon}</>}
        </>
      )}
    </Pressable>
  );
}

export default Button;
