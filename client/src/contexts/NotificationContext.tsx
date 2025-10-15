"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useGlobalSocket } from "./GlobalSocketContext";

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  data?: any;
  isRead: boolean;
  linkTo?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  isConnected: false,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  deleteNotification: async () => {},
  refreshNotifications: async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { socket, isConnected } = useGlobalSocket(); // ✅ Sử dụng socket từ GlobalSocketContext
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (status !== "authenticated" || !session?.access_token) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081"}/api/notifications?current=1&pageSize=50`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.result) {
          setNotifications(data.data.result);
          setUnreadCount(data.data.result.filter((n: Notification) => !n.isRead).length);
        }
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, [session, status]);

  // Mark notification as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!session?.access_token) return;

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081"}/api/notifications/${notificationId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ isRead: true }),
          }
        );

        if (response.ok) {
          setNotifications((prev) => prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n)));
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    },
    [session]
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!session?.access_token || !session.user?._id) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081"}/api/notifications/mark-all-read/${
          session.user._id
        }`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        toast.success("Đã đánh dấu tất cả là đã đọc");
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  }, [session]);

  // Delete notification
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      if (!session?.access_token) return;

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081"}/api/notifications/${notificationId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (response.ok) {
          setNotifications((prev) => {
            const notification = prev.find((n) => n._id === notificationId);
            if (notification && !notification.isRead) {
              setUnreadCount((count) => Math.max(0, count - 1));
            }
            return prev.filter((n) => n._id !== notificationId);
          });
        }
      } catch (error) {
        console.error("Failed to delete notification:", error);
      }
    },
    [session]
  );

  // Setup socket listeners for notification events
  useEffect(() => {
    if (!socket || status !== "authenticated" || !session?.user) return;

    console.log("🔔 Setting up notification listeners on global socket");

    // Listen for new notifications
    const handleNewNotification = (notification: Notification) => {
      console.log("🔔 New notification received:", notification);

      // Add to list
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Show toast
      toast.info(notification.title, {
        description: notification.message,
        duration: 5000,
        icon: notification.icon || "🔔",
      });
    };

    // Listen for notification read
    const handleNotificationRead = ({ notificationId }: { notificationId: string }) => {
      setNotifications((prev) => prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    };

    // Listen for all notifications read
    const handleAllNotificationsRead = () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    };

    // Register listeners
    socket.on("notification:new", handleNewNotification);
    socket.on("notification:read", handleNotificationRead);
    socket.on("notification:allRead", handleAllNotificationsRead);

    // Initial fetch
    fetchNotifications();

    // Cleanup
    return () => {
      console.log("🧹 Cleaning up notification listeners");
      socket.off("notification:new", handleNewNotification);
      socket.off("notification:read", handleNotificationRead);
      socket.off("notification:allRead", handleAllNotificationsRead);
    };
  }, [socket, session, status, fetchNotifications]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications: fetchNotifications,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}

export { NotificationContext };
