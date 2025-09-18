"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { realtimeChatService } from "@/services/realtimeChatService";
import { sendRequest } from "@/utils/api";

interface Message {
  _id: string;
  content: string;
  senderId: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  senderRole: "patient" | "doctor";
  messageType: "text" | "image" | "file";
  createdAt: string;
  isRead: boolean;
}

interface Conversation {
  _id: string;
  patientId: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    email: string;
  };
  doctorId: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    email: string;
    specialization?: string;
  };
  status: string;
  unreadPatientCount: number;
  unreadDoctorCount: number;
  lastMessageAt: string;
  lastMessage?: {
    content: string;
    createdAt: string;
  };
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "patient" | "doctor";
  specialization?: string;
}

interface RealtimeChatContextType {
  // Connection state
  isConnected: boolean;
  isLoading: boolean;

  // Data
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  currentUser: User | null;

  // UI state
  isTyping: boolean;
  onlineUsers: string[];

  // Actions
  connectToChat: (token: string, user: User) => Promise<void>;
  disconnectFromChat: () => void;
  startConversation: (otherUserId: string) => Promise<Conversation>;
  selectConversation: (conversation: Conversation) => void;
  sendMessage: (content: string) => void;
  markMessageAsRead: (messageId: string) => void;
  setTypingStatus: (isTyping: boolean) => void;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
}

const RealtimeChatContext = createContext<RealtimeChatContextType | undefined>(undefined);

export const useRealtimeChat = () => {
  const context = useContext(RealtimeChatContext);
  if (!context) {
    throw new Error("useRealtimeChat must be used within a RealtimeChatProvider");
  }
  return context;
};

interface RealtimeChatProviderProps {
  children: React.ReactNode;
}

export const RealtimeChatProvider: React.FC<RealtimeChatProviderProps> = ({ children }) => {
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  // Setup event listeners
  const setupEventListeners = useCallback(() => {
    // Message events
    realtimeChatService.on("newMessage", (data) => {
      const { message, conversationId } = data;

      // Add message to current conversation if it's active
      if (activeConversation && activeConversation._id === conversationId) {
        setMessages((prev) => [...prev, message]);
      }

      // Defer conversations refresh to the page logic; avoid TDZ here
      // Optionally, we could trigger a light flag for list to refetch
      setIsLoading(false);
    });

    realtimeChatService.on("messageRead", (data) => {
      const { messageId } = data;
      setMessages((prev) => prev.map((msg) => (msg._id === messageId ? { ...msg, isRead: true } : msg)));
    });

    realtimeChatService.on("conversationUpdated", async (conversation) => {
      setConversations((prev) => {
        const index = prev.findIndex((c) => c._id === conversation._id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = conversation;
          return updated;
        }
        return [conversation, ...prev];
      });

      // If the active conversation is updated (e.g., after call end), reload messages inline
      if (activeConversation && conversation._id === activeConversation._id) {
        try {
          const response = await sendRequest({
            endpoint: `/realtime-chat/conversations/${activeConversation._id}/messages`,
            method: "GET",
          });
          if ((response as any)?.success) {
            setMessages((response as any).data || []);
          }
        } catch (e) {
          console.error("Failed to refresh messages after conversation update:", e);
        }
      }
    });

    // Typing events
    realtimeChatService.on("userTyping", (data) => {
      const { conversationId, isTyping: typing } = data;
      if (activeConversation && activeConversation._id === conversationId) {
        setIsTyping(typing);
      }
    });

    // Online status events
    realtimeChatService.on("userOnline", (data) => {
      setOnlineUsers((prev) => [...prev, data.userId]);
    });

    realtimeChatService.on("userOffline", (data) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== data.userId));
    });
  }, [activeConversation]);

  // Connect to chat
  const connectToChat = useCallback(async (token: string, user: User) => {
    try {
      setIsLoading(true);
      setCurrentUser(user);

      await realtimeChatService.connect(token, user._id, user.role);
      setIsConnected(true);

      // Setup event listeners
      setupEventListeners();

      // Re-join active conversation after (re)connect
      realtimeChatService.onReconnect(async () => {
        if (activeConversation?._id) {
          realtimeChatService.joinConversation(activeConversation._id);
          try {
            const res = await sendRequest({
              endpoint: `/realtime-chat/conversations/${activeConversation._id}/messages`,
              method: "GET",
            });
            if ((res as any)?.success) setMessages((res as any).data || []);
          } catch (err) {
            console.error("Failed to refresh messages after reconnect:", err);
          }
        }
      });

      // Load initial conversations inline (avoid TDZ)
      try {
        const resp = await sendRequest({ endpoint: "/realtime-chat/conversations", method: "GET" });
        if ((resp as any)?.success) setConversations((resp as any).data || []);
      } catch (e) {
        console.error("Failed to load conversations:", e);
      }

      // If user has an active conversation already, join its room
      if (activeConversation?._id) {
        realtimeChatService.joinConversation(activeConversation._id);
      }
    } catch (error) {
      console.error("Failed to connect to chat:", error);
    } finally {
      setIsLoading(false);
    }
  }, [activeConversation, setupEventListeners]);

  // Disconnect from chat
  const disconnectFromChat = useCallback(() => {
    realtimeChatService.disconnect();
    setIsConnected(false);
    setActiveConversation(null);
    setMessages([]);
    setConversations([]);
    setCurrentUser(null);
    setOnlineUsers([]);
  }, []);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const response = await sendRequest({
        endpoint: "/realtime-chat/conversations",
        method: "GET",
      });

      if (response.success) {
        setConversations(response.data || []);
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  }, []);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const response = await sendRequest({
        endpoint: `/realtime-chat/conversations/${conversationId}/messages`,
        method: "GET",
      });

      if (response.success) {
        // Server now returns newest first reversed on server; do not reverse again
        setMessages(response.data || []);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  }, []);

  // Start a conversation with another user
  const startConversation = useCallback(async (otherUserId: string): Promise<Conversation> => {
    try {
      const response = await sendRequest({
        endpoint: `/realtime-chat/conversations/with/${otherUserId}`,
        method: "GET",
      });

      if (response.success) {
        const conversation = response.data;

        // Add to conversations list if not already there
        setConversations((prev) => {
          const exists = prev.find((c) => c._id === conversation._id);
          if (!exists) {
            return [conversation, ...prev];
          }
          return prev;
        });

        return conversation;
      }

      throw new Error("Failed to start conversation");
    } catch (error) {
      console.error("Failed to start conversation:", error);
      throw error;
    }
  }, []);

  // Select a conversation
  const selectConversation = useCallback(
    (conversation: Conversation) => {
      setActiveConversation(conversation);

      // Join conversation room
      realtimeChatService.joinConversation(conversation._id);

      // Load messages
      loadMessages(conversation._id);
    },
    [loadMessages]
  );

  // Send a message
  const sendMessage = useCallback(
    (content: string) => {
      if (activeConversation && isConnected) {
        realtimeChatService.sendMessage(activeConversation._id, content);
      }
    },
    [activeConversation, isConnected]
  );

  // Mark message as read
  const markMessageAsRead = useCallback(
    (messageId: string) => {
      if (activeConversation && isConnected) {
        realtimeChatService.markMessageAsRead(activeConversation._id, messageId);
      }
    },
    [activeConversation, isConnected]
  );

  // Set typing status
  const setTypingStatus = useCallback(
    (typing: boolean) => {
      if (activeConversation && isConnected) {
        realtimeChatService.sendTypingStatus(activeConversation._id, typing);
      }
    },
    [activeConversation, isConnected]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectFromChat();
    };
  }, [disconnectFromChat]);

  const contextValue: RealtimeChatContextType = {
    isConnected,
    isLoading,
    conversations,
    activeConversation,
    messages,
    currentUser,
    isTyping,
    onlineUsers,
    connectToChat,
    disconnectFromChat,
    startConversation,
    selectConversation,
    sendMessage,
    markMessageAsRead,
    setTypingStatus,
    loadConversations,
    loadMessages,
  };

  return <RealtimeChatContext.Provider value={contextValue}>{children}</RealtimeChatContext.Provider>;
};
