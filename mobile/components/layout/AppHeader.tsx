/**
 * AppHeader Component
 * Modern app header with title, back button, notifications, and avatar
 */

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { Shadows } from '@/constants/shadows';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  showNotification?: boolean;
  showAvatar?: boolean;
  showSearch?: boolean;
  notificationCount?: number;
  onBackPress?: () => void;
  onNotificationPress?: () => void;
  onAvatarPress?: () => void;
  onSearchPress?: () => void;
  rightComponent?: React.ReactNode;
  gradient?: boolean;
}

export function AppHeader({
  title = '',
  showBack = false,
  showNotification = false,
  showAvatar = false,
  showSearch = false,
  notificationCount = 0,
  onBackPress,
  onNotificationPress,
  onAvatarPress,
  onSearchPress,
  rightComponent,
  gradient = false,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const handleNotificationPress = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      router.push('/notifications' as any);
    }
  };

  const handleAvatarPress = () => {
    if (onAvatarPress) {
      onAvatarPress();
    } else {
      router.push('/(tabs)/profile' as any);
    }
  };

  const containerStyle = {
    paddingTop: insets.top + 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
  };

  const HeaderContent = (
    <View style={containerStyle}>
      <View className="flex-row items-center justify-between">
        {/* Left Section */}
        <View className="flex-row items-center flex-1">
          {showBack && (
            <Pressable
              onPress={handleBackPress}
              className="mr-3 w-10 h-10 items-center justify-center rounded-full active:bg-gray-100"
              style={{ marginLeft: -8 }}
            >
              <Ionicons name="chevron-back" size={24} color={theme.text.primary} />
            </Pressable>
          )}
          <Text
            className="text-xl font-bold flex-1"
            style={{ color: theme.text.primary }}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {/* Right Section */}
        <View className="flex-row items-center gap-2">
          {showSearch && (
            <Pressable
              onPress={onSearchPress}
              className="w-10 h-10 items-center justify-center rounded-full active:bg-gray-100"
            >
              <Ionicons name="search" size={22} color={theme.text.secondary} />
            </Pressable>
          )}

          {showNotification && (
            <Pressable
              onPress={handleNotificationPress}
              className="w-10 h-10 items-center justify-center rounded-full active:bg-gray-100 relative"
            >
              <Ionicons name="notifications-outline" size={22} color={theme.text.secondary} />
              {notificationCount > 0 && (
                <View className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full items-center justify-center">
                  <Text className="text-white text-xs font-bold">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Text>
                </View>
              )}
            </Pressable>
          )}

          {showAvatar && (
            <Pressable
              onPress={handleAvatarPress}
              className="w-9 h-9 rounded-full bg-blue-500 items-center justify-center ml-1 active:opacity-80"
            >
              <Text className="text-white font-semibold text-sm">A</Text>
            </Pressable>
          )}

          {rightComponent}
        </View>
      </View>
    </View>
  );

  if (gradient) {
    return (
      <LinearGradient
        colors={
          colorScheme === 'dark'
            ? ['rgba(31, 41, 55, 1)', 'rgba(31, 41, 55, 0.95)']
            : ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 0.98)']
        }
        style={[
          Shadows.sm,
          {
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          },
        ]}
      >
        {HeaderContent}
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        {
          backgroundColor: theme.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        Shadows.sm,
      ]}
    >
      {HeaderContent}
    </View>
  );
}

export default AppHeader;
