import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { useChat } from '@/contexts/chat-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function DoctorTabLayout() {
  const colorScheme = useColorScheme();
  const { unreadMessagesCount } = useChat();

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors[colorScheme ?? 'light'].surface,
          borderTopColor: Colors[colorScheme ?? 'light'].border,
          height: 70,
          paddingBottom: 12,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Tổng quan',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Lịch khám',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: 'Bệnh nhân',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Tin nhắn',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="chatbubbles" size={size} color={color} />
              {unreadMessagesCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -8,
                    backgroundColor: Colors.error[500],
                    borderRadius: 10,
                    minWidth: 18,
                    height: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="revenue"
        options={{
          title: 'Doanh thu',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Thêm',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="menu" size={size} color={color} />
          ),
        }}
      />
      
      {/* Hide chat detail screen from tabs */}
      <Tabs.Screen
        name="chat/[id]"
        options={{
          href: null, // This hides the screen from tabs
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
