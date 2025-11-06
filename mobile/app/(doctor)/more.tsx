/**
 * Doctor More Screen
 * Menu với các tính năng khác
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { AppHeader } from '@/components/layout/AppHeader';
import { SafeContainer } from '@/components/layout/SafeContainer';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface MenuItem {
  icon: string;
  title: string;
  description: string;
  route: string;
  color: string;
}

const menuItems: MenuItem[] = [
  {
    icon: 'chatbubbles',
    title: 'Chat & Tư vấn',
    description: 'Nhắn tin với bệnh nhân',
    route: '/(tabs)/chat',
    color: Colors.primary[600],
  },
  {
    icon: 'document-text',
    title: 'Hồ sơ điều trị',
    description: 'Quản lý hồ sơ bệnh án',
    route: '/medical-records',
    color: Colors.primary[600],
  },
  {
    icon: 'medical',
    title: 'Đơn thuốc',
    description: 'Kê đơn và theo dõi',
    route: '/prescriptions',
    color: Colors.primary[600],
  },
  {
    icon: 'notifications',
    title: 'Thông báo',
    description: 'Xem thông báo hệ thống',
    route: '/notifications',
    color: Colors.primary[600],
  },
  {
    icon: 'settings',
    title: 'Cài đặt',
    description: 'Cài đặt tài khoản',
    route: '/(tabs)/settings',
    color: Colors.gray[600],
  },
];

export default function DoctorMore() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { session, logout } = useAuth();

  const user = session?.user;
  const userName = user?.fullName || 'Bác sĩ';
  const userEmail = user?.email || '';
  const userInitial = userName.charAt(0).toUpperCase();

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/(auth)/login');
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể đăng xuất. Vui lòng thử lại.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <>
      <AppHeader title="Thêm" showNotification showAvatar />

      <SafeContainer scrollable padding>
        {/* User Profile Card */}
        <Card className="mb-6" shadow="md">
          <View className="items-center py-4">
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
              className="px-3 py-1 rounded-full mb-2"
              style={{ backgroundColor: Colors.primary[50] }}
            >
              <Text className="text-xs font-semibold" style={{ color: Colors.primary[700] }}>
                BÁC SĨ
              </Text>
            </View>
            {userEmail && (
              <Text className="text-sm" style={{ color: theme.text.secondary }}>
                {userEmail}
              </Text>
            )}
          </View>
        </Card>

        <View className="space-y-3">
          {menuItems.map((item, index) => (
            <Pressable
              key={index}
              onPress={() => router.push(item.route as any)}
              className="active:opacity-70"
            >
              <Card shadow="sm">
                <View className="flex-row items-center gap-4">
                  <View
                    className="w-12 h-12 rounded-xl items-center justify-center"
                    style={{ backgroundColor: `${item.color}15` }}
                  >
                    <Ionicons name={item.icon as any} size={24} color={item.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-base mb-1" style={{ color: theme.text.primary }}>
                      {item.title}
                    </Text>
                    <Text className="text-sm" style={{ color: theme.text.secondary }}>
                      {item.description}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.text.secondary} />
                </View>
              </Card>
            </Pressable>
          ))}
        </View>

        {/* Logout Button */}
        <Card className="mt-6" shadow="sm">
          <Pressable
            onPress={handleLogout}
            className="active:opacity-70"
          >
            <View className="flex-row items-center justify-center gap-3 py-3">
              <Ionicons name="log-out-outline" size={22} color={Colors.error[600]} />
              <Text className="font-bold text-base" style={{ color: Colors.error[600] }}>
                Đăng xuất
              </Text>
            </View>
          </Pressable>
        </Card>

        {/* App Version */}
        <View className="items-center mt-4 mb-2">
          <Text className="text-xs" style={{ color: theme.text.tertiary }}>
            Smart Dental Healthcare v1.0.0
          </Text>
        </View>
      </SafeContainer>
    </>
  );
}
