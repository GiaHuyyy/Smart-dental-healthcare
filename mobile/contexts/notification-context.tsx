import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth-context';
import { useChat } from './chat-context';
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

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  totalUnreadCount: number; // Total: notifications + messages
  loading: boolean;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { unreadMessagesCount } = useChat();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const userId = session?.user?._id;
  const token = session?.token;

  const refreshNotifications = useCallback(async () => {
    if (!userId || !token) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    try {
      console.log('🔔 Loading notifications for user:', userId);
      const response = await apiRequest<Notification[]>(`/api/v1/notifications/user/${userId}`, {
        token,
      });
      const data = Array.isArray(response.data) ? response.data : [];
      console.log('✅ Notifications loaded:', data.length, 'total');
      console.log('📊 Unread notifications:', data.filter(n => !n.isRead).length);
      setNotifications(data);
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [userId, token]);

  useEffect(() => {
    if (userId && token) {
      void refreshNotifications();
    }
  }, [userId, token, refreshNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const totalUnreadCount = unreadCount + unreadMessagesCount;

  // Debug log
  React.useEffect(() => {
    console.log('📊 Badge Count Breakdown:');
    console.log('   - Notifications (unread):', unreadCount);
    console.log('   - Messages (unread):', unreadMessagesCount);
    console.log('   - TOTAL:', totalUnreadCount);
  }, [unreadCount, unreadMessagesCount, totalUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        totalUnreadCount,
        loading,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
