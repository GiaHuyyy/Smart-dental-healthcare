import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth-context';
import { apiRequest } from '@/utils/api';

type Conversation = {
  _id: string;
  unreadPatientCount: number;
  unreadDoctorCount: number;
};

interface ChatContextType {
  unreadMessagesCount: number;
  loading: boolean;
  refreshUnreadCount: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const userId = session?.user?._id;
  const userRole = session?.user?.role;
  const token = session?.token;

  const refreshUnreadCount = useCallback(async () => {
    if (!userId || !token || !userRole) {
      setUnreadMessagesCount(0);
      return;
    }

    setLoading(true);
    try {
      console.log('💬 Loading unread messages count for user:', userId);
      const response = await apiRequest<Conversation[]>(
        `/api/v1/realtime-chat/conversations?userId=${userId}&userRole=${userRole}`,
        {
          method: 'GET',
          token,
        }
      );

      const conversations = Array.isArray(response.data) ? response.data : [];
      
      // Calculate total unread messages count based on user role
      const totalUnread = conversations.reduce((total, conv) => {
        const count = userRole === 'patient' 
          ? (conv.unreadPatientCount ?? 0)
          : (conv.unreadDoctorCount ?? 0);
        return total + count;
      }, 0);

      console.log('✅ Unread messages:', totalUnread);
      setUnreadMessagesCount(totalUnread);
    } catch (error) {
      console.error('❌ Error loading unread messages count:', error);
      setUnreadMessagesCount(0);
    } finally {
      setLoading(false);
    }
  }, [userId, token, userRole]);

  useEffect(() => {
    if (userId && token && userRole) {
      void refreshUnreadCount();
    }
  }, [userId, token, userRole, refreshUnreadCount]);

  return (
    <ChatContext.Provider
      value={{
        unreadMessagesCount,
        loading,
        refreshUnreadCount,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
