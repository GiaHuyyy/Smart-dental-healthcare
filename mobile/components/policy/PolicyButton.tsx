/**
 * PolicyButton Component
 * Reusable button to open appointment policy modal
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable } from 'react-native';

import { Colors } from '@/constants/colors';

interface PolicyButtonProps {
  onPress: () => void;
}

export function PolicyButton({ onPress }: PolicyButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      className="w-10 h-10 items-center justify-center rounded-full ml-2"
      style={{ backgroundColor: Colors.primary[100] }}
    >
      <Ionicons name="information-circle" size={22} color={Colors.primary[600]} />
    </Pressable>
  );
}
