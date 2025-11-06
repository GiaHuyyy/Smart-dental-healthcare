import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { AppHeader } from '@/components/layout/AppHeader';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useNotifications } from '@/contexts/notification-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { apiRequest, formatApiError } from '@/utils/api';

type Notification = {
  _id?: string;
  userId?: string;
  type?: 'appointment' | 'payment' | 'reminder' | 'system' | string;
  title?: string;
  message?: string;
  isRead?: boolean;
  metadata?: Record<string, any>;
  createdAt?: string | Date;
};

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function parseDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatDateTime(value?: string | Date | null): string {
  const date = parseDate(value);
  if (!date) return '—';
  
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;
  
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const NOTIFICATION_ICONS: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  appointment: { name: 'calendar', color: Colors.primary[600], bg: Colors.primary[50] },
  payment: { name: 'card', color: Colors.success[600], bg: Colors.success[50] },
  reminder: { name: 'alarm', color: Colors.warning[600], bg: Colors.warning[50] },
  system: { name: 'information-circle', color: Colors.primary[600], bg: Colors.primary[50] },
};

function NotificationCard({ notification, onPress }: { notification: Notification; onPress: () => void }) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const iconConfig = NOTIFICATION_ICONS[notification.type || 'system'] || NOTIFICATION_ICONS.system;
  
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card 
        className="p-4"
        style={{
          backgroundColor: notification.isRead ? theme.surface : Colors.primary[50],
          borderLeftWidth: 3,
          borderLeftColor: notification.isRead ? 'transparent' : Colors.primary[600],
        }}
      >
        <View className="flex-row items-start space-x-3">
          <View
            className="h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: iconConfig.bg }}
          >
            <Ionicons name={iconConfig.name} size={24} color={iconConfig.color} />
          </View>
          
          <View className="flex-1">
            <View className="flex-row items-start justify-between mb-1">
              <Text 
                className="flex-1 text-sm font-semibold pr-2"
                style={{ color: theme.text.primary }}
              >
                {notification.title || 'Thông báo'}
              </Text>
              {!notification.isRead && (
                <View 
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: Colors.primary[600] }}
                />
              )}
            </View>
            
            <Text 
              className="text-xs mb-2"
              style={{ color: theme.text.secondary }}
              numberOfLines={2}
            >
              {notification.message || 'Không có nội dung'}
            </Text>
            
            <Text 
              className="text-xs"
              style={{ color: theme.text.secondary, opacity: 0.7 }}
            >
              {formatDateTime(notification.createdAt)}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { session, isAuthenticated } = useAuth();
  const { refreshNotifications: refreshContext } = useNotifications();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const userId = session?.user?._id ?? '';
  const token = session?.token ?? '';

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const loadNotifications = useCallback(
    async ({ viaRefresh = false, signal }: { viaRefresh?: boolean; signal?: AbortSignal } = {}) => {
      if (!userId || !token) {
        setNotifications([]);
        return;
      }

      if (viaRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await apiRequest<Notification[]>(`/api/v1/notifications/user/${userId}`, {
          token,
          abortSignal: signal,
        });
        setNotifications(ensureArray<Notification>(response.data));
        setErrorMessage(null);
        // Refresh context to update badge count
        void refreshContext();
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        setNotifications([]);
        setErrorMessage(formatApiError(error, 'Không thể tải thông báo.'));
      } finally {
        if (viaRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [userId, token],
  );

  useFocusEffect(
    useCallback(() => {
      if (!userId || !token) return;
      const controller = new AbortController();
      void loadNotifications({ signal: controller.signal });
      return () => controller.abort();
    }, [userId, token, loadNotifications]),
  );

  const handleRefresh = useCallback(() => {
    if (!userId || !token) return;
    void loadNotifications({ viaRefresh: true });
  }, [userId, token, loadNotifications]);

  const handleMarkAsRead = useCallback(
    async (notificationId: string) => {
      if (!token) return;

      try {
        await apiRequest(`/api/v1/notifications/${notificationId}/read`, {
          method: 'PATCH',
          token,
        });

        setNotifications((prev) =>
          prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
        );
        // Refresh context to update badge count
        void refreshContext();
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    },
    [token],
  );

  const handleMarkAllAsRead = useCallback(async () => {
    if (!userId || !token) return;

    try {
      await apiRequest(`/api/v1/notifications/user/${userId}/read-all`, {
        method: 'PATCH',
        token,
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      // Refresh context to update badge count
      void refreshContext();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [userId, token]);

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, filter]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  if (!isAuthenticated) {
    return (
      <>
        <AppHeader title="Thông báo" showBack />
        <View 
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: theme.background }}
        >
          <Card className="w-full p-6">
            <View className="items-center">
              <Ionicons name="notifications-outline" size={48} color={Colors.primary[600]} />
              <Text className="mt-4 text-lg font-semibold text-center" style={{ color: theme.text.primary }}>
                Đăng nhập để xem thông báo
              </Text>
              <Text className="mt-2 text-sm text-center" style={{ color: theme.text.secondary }}>
                Nhận thông báo về lịch hẹn, thanh toán và nhắc nhở quan trọng.
              </Text>
              <TouchableOpacity
                className="mt-6 w-full items-center justify-center rounded-2xl py-3"
                style={{ backgroundColor: Colors.primary[600] }}
                onPress={() => router.push('/(auth)/login' as const)}
              >
                <Text className="text-sm font-semibold text-white">Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </>
    );
  }

  return (
    <>
      <AppHeader title="Thông báo" showBack />
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        {/* Header Stats */}
        <View className="px-5 py-4 border-b" style={{ borderBottomColor: theme.border }}>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                {notifications.length}
              </Text>
              <Text className="text-xs" style={{ color: theme.text.secondary }}>
                Tổng số thông báo
              </Text>
            </View>
            
            {unreadCount > 0 && (
              <View className="flex-row items-center space-x-3">
                <View
                  className="px-3 py-1 rounded-full"
                  style={{ backgroundColor: Colors.primary[50] }}
                >
                  <Text className="text-xs font-semibold" style={{ color: Colors.primary[600] }}>
                    {unreadCount} chưa đọc
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleMarkAllAsRead}
                  className="px-3 py-1 rounded-full border"
                  style={{ 
                    borderColor: Colors.primary[100],
                    backgroundColor: Colors.primary[50],
                  }}
                >
                  <Text className="text-xs font-semibold" style={{ color: Colors.primary[600] }}>
                    Đánh dấu tất cả
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Filter Tabs */}
          <View className="flex-row gap-2 mt-4">
            <TouchableOpacity
              onPress={() => setFilter('all')}
              className="px-4 py-2 rounded-full border"
              style={{
                borderColor: filter === 'all' ? Colors.primary[600] : Colors.primary[100],
                backgroundColor: filter === 'all' ? Colors.primary[600] : '#ffffff',
              }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: filter === 'all' ? '#ffffff' : Colors.primary[700] }}
              >
                Tất cả
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilter('unread')}
              className="px-4 py-2 rounded-full border"
              style={{
                borderColor: filter === 'unread' ? Colors.primary[600] : Colors.primary[100],
                backgroundColor: filter === 'unread' ? Colors.primary[600] : '#ffffff',
              }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: filter === 'unread' ? '#ffffff' : Colors.primary[700] }}
              >
                Chưa đọc ({unreadCount})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications List */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary[600]} />
          }
        >
          {errorMessage ? (
            <Card className="p-4 border" style={{ borderColor: Colors.warning[100], backgroundColor: Colors.warning[50] }}>
              <View className="flex-row items-center space-x-2">
                <Ionicons name="alert-circle-outline" size={18} color={Colors.warning[600]} />
                <Text className="flex-1 text-sm" style={{ color: Colors.warning[700] }}>
                  {errorMessage}
                </Text>
              </View>
            </Card>
          ) : loading && notifications.length === 0 ? (
            <Card className="items-center justify-center p-8">
              <ActivityIndicator color={Colors.primary[600]} />
              <Text className="mt-3 text-sm" style={{ color: theme.text.secondary }}>
                Đang tải thông báo...
              </Text>
            </Card>
          ) : filteredNotifications.length === 0 ? (
            <View className="items-center justify-center py-12">
              <Ionicons name="notifications-off-outline" size={48} color={Colors.primary[300]} />
              <Text className="mt-4 text-base font-semibold" style={{ color: theme.text.primary }}>
                {filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo'}
              </Text>
              <Text className="mt-2 text-sm text-center" style={{ color: theme.text.secondary }}>
                {filter === 'unread'
                  ? 'Tất cả thông báo đã được đọc'
                  : 'Bạn sẽ nhận được thông báo về lịch hẹn và thanh toán'}
              </Text>
            </View>
          ) : (
            <View className="space-y-3">
              {filteredNotifications.map((notification) => (
                <NotificationCard
                  key={notification._id ?? `notif-${notification.createdAt}`}
                  notification={notification}
                  onPress={() => {
                    if (notification._id && !notification.isRead) {
                      void handleMarkAsRead(notification._id);
                    }
                  }}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}
