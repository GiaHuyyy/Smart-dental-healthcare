"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useNotifications } from "@/contexts/NotificationContext";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

export function NotificationButton() {
  const router = useRouter();
  const { data: session } = useSession();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Get icon for notification type
  const getIcon = (type: string, customIcon?: string) => {
    if (customIcon) return customIcon;

    const iconMap: Record<string, string> = {
      APPOINTMENT_NEW: "📅",
      APPOINTMENT_CONFIRMED: "✅",
      APPOINTMENT_CANCELLED: "❌",
      APPOINTMENT_RESCHEDULED: "🔄",
      APPOINTMENT_COMPLETED: "✅",
      APPOINTMENT_REMINDER: "⏰",
      PRESCRIPTION_NEW: "💊",
      MEDICAL_RECORD_NEW: "📋",
      PAYMENT_SUCCESS: "💳",
      CHAT_NEW: "💬",
      SYSTEM: "🔔",
    };

    return iconMap[type] || "🔔";
  };

  // Handle notification click
  const handleNotificationClick = async (notification: any) => {
    // Mark as read
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }

    // Navigate if linkTo exists
    if (notification.linkTo) {
      router.push(notification.linkTo);
    }

    setIsOpen(false);
  };

  // Handle delete
  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-primary hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Thông báo"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Thông báo</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-primary hover:text-primary-dark flex items-center gap-1"
                  title="Đánh dấu tất cả là đã đọc"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Đọc tất cả</span>
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[500px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Không có thông báo nào</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer transition-colors ${
                      notification.isRead ? "bg-white hover:bg-gray-50" : "bg-primary/5 hover:bg-primary/10"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 text-2xl">{getIcon(notification.type, notification.icon)}</div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-900 line-clamp-1">{notification.title}</p>
                          {!notification.isRead && (
                            <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-1" />
                          )}
                        </div>

                        <p className="text-sm text-gray-600 line-clamp-2 mt-1">{notification.message}</p>

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                              locale: vi,
                            })}
                          </span>

                          <div className="flex items-center gap-1">
                            {!notification.isRead && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification._id);
                                }}
                                className="p-1 text-gray-400 hover:text-primary rounded"
                                title="Đánh dấu đã đọc"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={(e) => handleDelete(e, notification._id)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                              title="Xóa"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <button
                onClick={() => {
                  const role = session?.user?.role || "patient";
                  const path = role === "doctor" ? "/doctor/notifications" : "/patient/notifications";
                  router.push(path);
                  setIsOpen(false);
                }}
                className="text-sm text-primary hover:text-primary-dark font-medium"
              >
                Xem tất cả thông báo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
