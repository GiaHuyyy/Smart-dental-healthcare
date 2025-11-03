/**
 * Doctor More Screen
 * Menu với các tính năng khác
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppHeader } from '@/components/layout/AppHeader';
import { SafeContainer } from '@/components/layout/SafeContainer';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/colors';
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

  return (
    <>
      <AppHeader title="Thêm" showNotification showAvatar />

      <SafeContainer scrollable padding>
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
            onPress={() => {
              // TODO: Implement logout
              console.log('Logout');
            }}
            className="active:opacity-70"
          >
            <View className="flex-row items-center justify-center gap-2 py-2">
              <Ionicons name="log-out-outline" size={20} color={Colors.error[600]} />
              <Text className="font-semibold" style={{ color: Colors.error[600] }}>
                Đăng xuất
              </Text>
            </View>
          </Pressable>
        </Card>
      </SafeContainer>
    </>
  );
}
