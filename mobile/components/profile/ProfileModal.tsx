/**
 * Profile Modal Component
 * Modal hiển thị thông tin cá nhân và các tùy chọn
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ProfileModal({ visible, onClose }: ProfileModalProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { session, logout } = useAuth();
  const router = useRouter();

  const userRole = session?.user?.role === 'doctor' ? 'Bác sĩ' : 'Bệnh nhân';
  const userName = session?.user?.fullName || 'Người dùng';
  const userEmail = session?.user?.email || '';
  const userPhone = session?.user?.phone || '';
  const userInitial = userName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    console.log('ProfileModal handleLogout called');
    
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Bạn có chắc chắn muốn đăng xuất?')
      : await new Promise((resolve) => {
          Alert.alert(
            'Đăng xuất',
            'Bạn có chắc chắn muốn đăng xuất?',
            [
              { text: 'Hủy', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Đăng xuất', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });
    
    if (!confirmed) {
      console.log('Logout cancelled');
      return;
    }
    
    try {
      console.log('ProfileModal logout button pressed');
      await logout();
      console.log('ProfileModal logout successful');
      // Clear navigation stack and force redirect
      if (Platform.OS === 'web') {
        window.location.href = '/';
      } else {
        router.dismissAll();
        router.replace('/');
      }
      console.log('ProfileModal navigation called');
    } catch (error) {
      console.error('ProfileModal logout error:', error);
      if (Platform.OS === 'web') {
        window.alert('Không thể đăng xuất. Vui lòng thử lại.');
      } else {
        Alert.alert('Lỗi', 'Không thể đăng xuất. Vui lòng thử lại.');
      }
    }
  };

  const MenuItem = ({
    icon,
    label,
    value,
    onPress,
    destructive,
  }: {
    icon: string;
    label: string;
    value?: string;
    onPress?: () => void;
    destructive?: boolean;
  }) => (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="active:opacity-80"
    >
      <View
        className="flex-row items-center p-4 border-b"
        style={{ borderBottomColor: Colors.gray[100] }}
      >
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
          style={{
            backgroundColor: destructive ? Colors.error[50] : Colors.primary[50],
          }}
        >
          <Ionicons
            name={icon as any}
            size={20}
            color={destructive ? Colors.error[600] : Colors.primary[600]}
          />
        </View>
        <View className="flex-1">
          <Text
            className="text-sm font-medium mb-0.5"
            style={{ color: destructive ? Colors.error[600] : theme.text.primary }}
          >
            {label}
          </Text>
          {value && (
            <Text className="text-xs" style={{ color: theme.text.secondary }}>
              {value}
            </Text>
          )}
        </View>
        {onPress && !destructive && (
          <Ionicons name="chevron-forward" size={20} color={Colors.gray[400]} />
        )}
      </View>
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        
        <View
          style={{
            backgroundColor: theme.background,
            maxHeight: '85%',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b" style={{ borderBottomColor: Colors.gray[100] }}>
            <Text className="text-lg font-bold" style={{ color: theme.text.primary }}>
              Thông tin cá nhân
            </Text>
            <Pressable onPress={onClose} className="w-8 h-8 items-center justify-center rounded-full active:bg-gray-100">
              <Ionicons name="close" size={24} color={theme.text.secondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* User Info Card */}
            <View className="p-4">
              <View
                className="p-4 rounded-2xl items-center"
                style={{ backgroundColor: Colors.primary[50] }}
              >
                <View
                  className="w-20 h-20 rounded-full items-center justify-center mb-3"
                  style={{ backgroundColor: Colors.primary[600] }}
                >
                  <Text className="text-white font-bold text-2xl">{userInitial}</Text>
                </View>
                <Text className="text-lg font-bold mb-1" style={{ color: theme.text.primary }}>
                  {userName}
                </Text>
                <View
                  className="px-3 py-1 rounded-full"
                  style={{ backgroundColor: Colors.primary[100] }}
                >
                  <Text className="text-xs font-medium" style={{ color: Colors.primary[700] }}>
                    {userRole}
                  </Text>
                </View>
              </View>
            </View>

            {/* Info Section */}
            <View className="mb-4">
              <View className="px-4 py-2">
                <Text className="text-xs font-semibold uppercase" style={{ color: theme.text.secondary }}>
                  Thông tin liên hệ
                </Text>
              </View>
              
              <MenuItem
                icon="mail-outline"
                label="Email"
                value={userEmail}
              />
              
              {userPhone && (
                <MenuItem
                  icon="call-outline"
                  label="Số điện thoại"
                  value={userPhone}
                />
              )}
            </View>

            {/* Settings Section */}
            <View className="mb-4">
              <View className="px-4 py-2">
                <Text className="text-xs font-semibold uppercase" style={{ color: theme.text.secondary }}>
                  Cài đặt
                </Text>
              </View>
              
              <MenuItem
                icon="person-outline"
                label="Chỉnh sửa hồ sơ"
                onPress={() => {
                  onClose();
                  // TODO: Navigate to edit profile
                  Alert.alert('Thông báo', 'Tính năng đang phát triển');
                }}
              />
              
              <MenuItem
                icon="lock-closed-outline"
                label="Đổi mật khẩu"
                onPress={() => {
                  onClose();
                  // TODO: Navigate to change password
                  Alert.alert('Thông báo', 'Tính năng đang phát triển');
                }}
              />
              
              <MenuItem
                icon="settings-outline"
                label="Cài đặt chung"
                onPress={() => {
                  onClose();
                  // TODO: Navigate to settings
                  Alert.alert('Thông báo', 'Tính năng đang phát triển');
                }}
              />
            </View>

            {/* About Section */}
            <View className="mb-4">
              <View className="px-4 py-2">
                <Text className="text-xs font-semibold uppercase" style={{ color: theme.text.secondary }}>
                  Về ứng dụng
                </Text>
              </View>
              
              <MenuItem
                icon="information-circle-outline"
                label="Giới thiệu"
                onPress={() => {
                  onClose();
                  Alert.alert('Smart Dental Healthcare', 'Phiên bản 1.0.0\n\nỨng dụng quản lý nha khoa thông minh');
                }}
              />
              
              <MenuItem
                icon="help-circle-outline"
                label="Trợ giúp & Hỗ trợ"
                onPress={() => {
                  onClose();
                  Alert.alert('Thông báo', 'Tính năng đang phát triển');
                }}
              />
            </View>

            {/* Logout */}
            <View className="px-4 pb-6">
              <MenuItem
                icon="log-out-outline"
                label="Đăng xuất"
                onPress={handleLogout}
                destructive
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default ProfileModal;
