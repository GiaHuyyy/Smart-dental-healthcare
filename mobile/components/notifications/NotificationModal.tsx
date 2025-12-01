import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useNotifications } from '@/contexts/notification-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { apiRequest } from '@/utils/api';

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
  });
}

const NOTIFICATION_ICONS: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  appointment: { name: 'calendar', color: Colors.primary[600], bg: Colors.primary[50] },
  payment: { name: 'card', color: Colors.success[600], bg: Colors.success[50] },
  reminder: { name: 'alarm', color: Colors.warning[600], bg: Colors.warning[50] },
  system: { name: 'information-circle', color: Colors.primary[600], bg: Colors.primary[50] },
};

function NotificationItem({ notification, onPress }: { notification: Notification; onPress: () => void }) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const iconConfig = NOTIFICATION_ICONS[notification.type || 'system'] || NOTIFICATION_ICONS.system;
  
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View 
        className="p-3 border-b"
        style={{ 
          borderBottomColor: theme.border,
          backgroundColor: notification.isRead ? 'transparent' : Colors.primary[50] + '40',
        }}
      >
        <View className="flex-row items-start space-x-3">
          <View
            className="h-10 w-10 items-center justify-center rounded-full mt-0.5"
            style={{ backgroundColor: iconConfig.bg }}
          >
            <Ionicons name={iconConfig.name} size={20} color={iconConfig.color} />
          </View>
          
          <View className="flex-1">
            <View className="flex-row items-start justify-between mb-0.5">
              <Text 
                className="flex-1 text-sm font-semibold pr-2"
                style={{ color: theme.text.primary }}
                numberOfLines={1}
              >
                {notification.title || 'Thông báo'}
              </Text>
              {!notification.isRead && (
                <View 
                  className="h-2 w-2 rounded-full mt-1"
                  style={{ backgroundColor: Colors.primary[600] }}
                />
              )}
            </View>
            
            <Text 
              className="text-xs mb-1"
              style={{ color: theme.text.secondary }}
              numberOfLines={2}
            >
              {notification.message || 'Không có nội dung'}
            </Text>
            
            <Text 
              className="text-xs"
              style={{ color: theme.text.secondary, opacity: 0.6 }}
            >
              {formatDateTime(notification.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
}

export function NotificationModal({ visible, onClose }: NotificationModalProps) {
  const { session } = useAuth();
  const { notifications: contextNotifications, refreshNotifications } = useNotifications();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const userId = session?.user?._id;
  const token = session?.token;

  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Sync with context notifications
  useEffect(() => {
    if (visible) {
      setLocalNotifications(contextNotifications);
    }
  }, [visible, contextNotifications]);

  const handleMarkAsRead = useCallback(
    async (notificationId: string) => {
      if (!token) return;

      try {
        await apiRequest(`/notifications/${notificationId}/read`, {
          method: 'PATCH',
          token,
        });

        setLocalNotifications((prev) =>
          prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
        );
        // Refresh context to update badge count
        await refreshNotifications();
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    },
    [token, refreshNotifications],
  );

  const handleMarkAllAsRead = useCallback(async () => {
    if (!userId || !token) return;

    setLoading(true);
    try {
      await apiRequest(`/notifications/user/${userId}/read-all`, {
        method: 'PATCH',
        token,
      });

      setLocalNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await refreshNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, token, refreshNotifications]);

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return localNotifications.filter((n) => !n.isRead);
    }
    return localNotifications;
  }, [localNotifications, filter]);

  const unreadCount = localNotifications.filter((n) => !n.isRead).length;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        className="flex-1" 
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        activeOpacity={1}
        onPress={onClose}
      >
        <View className="flex-1 items-end pt-16 px-4">
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            style={{ 
              backgroundColor: theme.surface,
              maxHeight: '80%',
            }}
          >
            {/* Header */}
            <View className="px-5 pt-5 pb-3 border-b" style={{ borderBottomColor: theme.border }}>
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xl font-bold" style={{ color: theme.text.primary }}>
                  Thông báo
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  className="w-8 h-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: Colors.primary[50] }}
                >
                  <Ionicons name="close" size={20} color={Colors.primary[600]} />
                </TouchableOpacity>
              </View>

              {/* Stats & Actions */}
              <View className="flex-row items-center justify-between">
                <Text className="text-xs" style={{ color: theme.text.secondary }}>
                  {localNotifications.length} thông báo
                  {unreadCount > 0 && ` • ${unreadCount} chưa đọc`}
                </Text>
                
                {unreadCount > 0 && (
                  <TouchableOpacity
                    onPress={handleMarkAllAsRead}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: Colors.primary[50] }}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color={Colors.primary[600]} />
                    ) : (
                      <Text className="text-xs font-semibold" style={{ color: Colors.primary[600] }}>
                        Đánh dấu tất cả
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Filter Tabs */}
              <View className="flex-row gap-2 mt-3">
                <TouchableOpacity
                  onPress={() => setFilter('all')}
                  className="px-4 py-1.5 rounded-full"
                  style={{
                    backgroundColor: filter === 'all' ? Colors.primary[600] : Colors.primary[50],
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
                  className="px-4 py-1.5 rounded-full"
                  style={{
                    backgroundColor: filter === 'unread' ? Colors.primary[600] : Colors.primary[50],
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: filter === 'unread' ? '#ffffff' : Colors.primary[700] }}
                  >
                    Chưa đọc {unreadCount > 0 && `(${unreadCount})`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Notifications List */}
            <ScrollView 
              className="flex-1"
              showsVerticalScrollIndicator={false}
            >
              {filteredNotifications.length === 0 ? (
                <View className="items-center justify-center py-12 px-6">
                  <Ionicons 
                    name={filter === 'unread' ? 'checkmark-circle-outline' : 'notifications-off-outline'} 
                    size={48} 
                    color={Colors.primary[300]} 
                  />
                  <Text className="mt-4 text-sm font-semibold text-center" style={{ color: theme.text.primary }}>
                    {filter === 'unread' ? 'Tất cả đã đọc!' : 'Chưa có thông báo'}
                  </Text>
                  <Text className="mt-1 text-xs text-center" style={{ color: theme.text.secondary }}>
                    {filter === 'unread'
                      ? 'Bạn không có thông báo chưa đọc'
                      : 'Thông báo sẽ xuất hiện ở đây'}
                  </Text>
                </View>
              ) : (
                <View>
                  {filteredNotifications.map((notification) => (
                    <NotificationItem
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
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
