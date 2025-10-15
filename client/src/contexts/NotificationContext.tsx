"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (status !== "authenticated" || !session?.access_token) {
      return;
    }

    try {
      const url = `${
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081"
      }/api/v1/notifications?current=1&pageSize=50`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.data?.results) {
          setNotifications(data.data.results);
          setUnreadCount(data.data.results.filter((n: Notification) => !n.isRead).length);
        }
      } else {
        const errorText = await response.text();
        console.error("Failed to fetch notifications:", response.status, errorText);
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
          `${
            process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081"
          }/api/v1/notifications/${notificationId}/read`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (response.ok) {
          setNotifications((prev) => prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n)));
          setUnreadCount((prev) => Math.max(0, prev - 1));
        } else {
          console.error("Failed to mark as read:", response.status);
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
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081"}/api/v1/notifications/mark-all-read/${
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
          `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081"}/api/v1/notifications/${notificationId}`,
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

  // Setup socket listeners for notification events (KHÔNG fetch ở đây)
  useEffect(() => {
    if (!socket || status !== "authenticated" || !session?.user) return;

    // Listen for new notifications
    const handleNewNotification = (notification: Notification) => {
      // Add to list
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Show toast with action button using router.push
      toast.info(notification.title, {
        description: notification.message,
        duration: 5000,
        icon: notification.icon || "🔔",
        action: notification.linkTo
          ? {
              label: "Xem",
              onClick: () => {
                router.push(notification.linkTo);
              },
            }
          : undefined,
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

    // Cleanup
    return () => {
      socket.off("notification:new", handleNewNotification);
      socket.off("notification:read", handleNotificationRead);
      socket.off("notification:allRead", handleAllNotificationsRead);
    };
  }, [socket, session?.user, status, router]);

  // ✅ Separate effect: Fetch notifications when access_token is available
  useEffect(() => {
    if (status === "authenticated" && session?.access_token) {
      fetchNotifications();
    } else if (status === "authenticated" && session?.user && !session?.access_token) {
      toast.error("Session không hợp lệ", {
        description: "Vui lòng đăng xuất và đăng nhập lại",
        duration: 10000,
      });
    }
  }, [status, session?.access_token, session?.user, fetchNotifications]);

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
