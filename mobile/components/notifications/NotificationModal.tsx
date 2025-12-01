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
        style={{ 
          padding: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.border || '#e5e7eb',
          backgroundColor: notification.isRead ? (theme.card || '#ffffff') : (Colors.primary[50] + '40'),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View
            style={{ 
              height: 40, 
              width: 40, 
              alignItems: 'center', 
              justifyContent: 'center', 
              borderRadius: 20, 
              marginTop: 2,
              backgroundColor: iconConfig.bg 
            }}
          >
            <Ionicons name={iconConfig.name} size={20} color={iconConfig.color} />
          </View>
          
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text 
                style={{ 
                  flex: 1, 
                  fontSize: 14, 
                  fontWeight: '600', 
                  paddingRight: 8,
                  color: theme.text.primary || '#000000'
                }}
                numberOfLines={1}
              >
                {notification.title || 'Thông báo'}
              </Text>
              {!notification.isRead && (
                <View 
                  style={{ 
                    height: 8, 
                    width: 8, 
                    borderRadius: 4, 
                    marginTop: 4,
                    backgroundColor: Colors.primary[600] 
                  }}
                />
              )}
            </View>
            
            <Text 
              style={{ 
                fontSize: 12, 
                marginBottom: 4,
                color: theme.text.secondary || '#666666'
              }}
              numberOfLines={2}
            >
              {notification.message || 'Không có nội dung'}
            </Text>
            
            <Text 
              style={{ 
                fontSize: 12,
                color: theme.text.secondary || '#666666', 
                opacity: 0.6 
              }}
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
        style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={{ flex: 1, alignItems: 'flex-end', paddingTop: 64, paddingHorizontal: 16 }}>
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{ 
              width: '100%',
              maxWidth: 448,
              backgroundColor: theme.surface || theme.card || '#ffffff',
              height: '80%',
              borderRadius: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 10,
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text.primary }}>
                  Thông báo
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: Colors.primary[50] }}
                >
                  <Ionicons name="close" size={20} color={Colors.primary[600]} />
                </TouchableOpacity>
              </View>

              {/* Stats & Actions */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                  {localNotifications.length} thông báo
                  {unreadCount > 0 && ` • ${unreadCount} chưa đọc`}
                </Text>
                
                {unreadCount > 0 && (
                  <TouchableOpacity
                    onPress={handleMarkAllAsRead}
                    disabled={loading}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.primary[50] }}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color={Colors.primary[600]} />
                    ) : (
                      <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.primary[600] }}>
                        Đánh dấu tất cả
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Filter Tabs */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <TouchableOpacity
                  onPress={() => setFilter('all')}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 6,
                    borderRadius: 16,
                    backgroundColor: filter === 'all' ? Colors.primary[600] : Colors.primary[50],
                  }}
                >
                  <Text
                    style={{ fontSize: 12, fontWeight: '600', color: filter === 'all' ? '#ffffff' : Colors.primary[700] }}
                  >
                    Tất cả
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFilter('unread')}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 6,
                    borderRadius: 16,
                    backgroundColor: filter === 'unread' ? Colors.primary[600] : Colors.primary[50],
                  }}
                >
                  <Text
                    style={{ fontSize: 12, fontWeight: '600', color: filter === 'unread' ? '#ffffff' : Colors.primary[700] }}
                  >
                    Chưa đọc {unreadCount > 0 && `(${unreadCount})`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Notifications List */}
            <ScrollView 
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
            >
              {filteredNotifications.length === 0 ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
                  <Ionicons 
                    name={filter === 'unread' ? 'checkmark-circle-outline' : 'notifications-off-outline'} 
                    size={48} 
                    color={Colors.primary[300]} 
                  />
                  <Text style={{ marginTop: 16, fontSize: 14, fontWeight: '600', textAlign: 'center', color: theme.text.primary }}>
                    {filter === 'unread' ? 'Tất cả đã đọc!' : 'Chưa có thông báo'}
                  </Text>
                  <Text style={{ marginTop: 4, fontSize: 12, textAlign: 'center', color: theme.text.secondary }}>
                    {filter === 'unread'
                      ? 'Bạn không có thông báo chưa đọc'
                      : 'Thông báo sẽ xuất hiện ở đây'}
                  </Text>
                </View>
              ) : (
                <View style={{ flex: 1 }}>
                  {filteredNotifications.map((notification, index) => {
                    return (
                      <NotificationItem
                        key={notification._id ?? `notif-${notification.createdAt}`}
                        notification={notification}
                        onPress={() => {
                          if (notification._id && !notification.isRead) {
                            void handleMarkAsRead(notification._id);
                          }
                        }}
                      />
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
