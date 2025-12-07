"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/contexts/NotificationContext";
import { Bell, BellOff, Check, Trash2, UserPlus, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";

type NotificationFilter =
  | "all"
  | "unread"
  | "APPOINTMENT_NEW"
  | "APPOINTMENT_CONFIRMED"
  | "APPOINTMENT_CANCELLED"
  | "APPOINTMENT_REMINDER"
  | "SYSTEM";

interface Notification {
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

export default function NotificationsContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const userRole = session?.user?.role || "patient";
  const isDoctor = userRole === "doctor";

  useEffect(() => {
    let filtered = [...notifications];

    if (filter === "unread") {
      filtered = filtered.filter((n) => !n.isRead);
    } else if (filter !== "all") {
      filtered = filtered.filter((n) => n.type === filter);
    }

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setFilteredNotifications(filtered);
  }, [notifications, filter]);

  const getNotificationIcon = (type: string, icon?: string) => {
    if (icon) return icon;
    switch (type) {
      case "APPOINTMENT_NEW":
        return "📅";
      case "APPOINTMENT_CONFIRMED":
        return "✅";
      case "APPOINTMENT_CANCELLED":
        return "❌";
      case "APPOINTMENT_RESCHEDULED":
        return "🔄";
      case "APPOINTMENT_COMPLETED":
        return "✅";
      case "APPOINTMENT_REMINDER":
        return "⏰";
      case "PRESCRIPTION_NEW":
        return "💊";
      case "MEDICAL_RECORD_NEW":
        return "📋";
      case "PAYMENT_SUCCESS":
        return "💰";
      case "CHAT_NEW":
        return "💬";
      case "SYSTEM":
        return "⚙️";
      default:
        return "🔔";
    }
  };

  const getNotificationColor = (type: string) => {
    if (type.includes("CANCELLED")) return "border-red-200 bg-red-50";
    if (type.includes("CONFIRMED") || type.includes("COMPLETED")) return "border-green-200 bg-green-50";
    if (type.includes("REMINDER")) return "border-yellow-200 bg-yellow-50";
    if (type.includes("NEW")) return "border-primary/20 bg-primary/5";
    return "border-gray-200 bg-gray-50";
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
    } catch (error) {
      toast.error("Không thể đánh dấu đã đọc");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      await markAllAsRead();
      toast.success("Đã đánh dấu tất cả là đã đọc");
    } catch (error) {
      toast.error("Không thể đánh dấu tất cả");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      toast.success("Đã xóa thông báo");
    } catch (error) {
      toast.error("Không thể xóa thông báo");
    }
  };

  const filterOptions = [
    { value: "all", label: "Tất cả", icon: Bell },
    { value: "unread", label: "Chưa đọc", icon: BellOff },
    { value: "APPOINTMENT_NEW", label: isDoctor ? "Lịch hẹn mới" : "Yêu cầu mới", icon: UserPlus },
    { value: "APPOINTMENT_CONFIRMED", label: "Đã xác nhận", icon: Check },
    { value: "APPOINTMENT_CANCELLED", label: "Đã hủy", icon: Trash2 },
    { value: "APPOINTMENT_REMINDER", label: "Nhắc nhở", icon: Activity },
    { value: "SYSTEM", label: "Hệ thống", icon: Activity },
  ];

  const stats = {
    total: notifications.length,
    unread: unreadCount,
    appointments: notifications.filter((n) => n.type.includes("APPOINTMENT")).length,
    today: notifications.filter((n) => {
      const notifDate = new Date(n.createdAt);
      const today = new Date();
      return notifDate.toDateString() === today.toDateString();
    }).length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Thông báo</h1>
              <p className="text-sm text-gray-600">Quản lý và theo dõi lịch sử thông báo của bạn</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={loading}
              className="btn-primary-filled flex items-center gap-2"
            >
              <Check className="w-5 h-5" />
              Đọc tất cả
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div
            style={{ background: "linear-gradient(to bottom right, rgba(0, 166, 244, 0.1), rgba(0, 166, 244, 0.2))" }}
            className="rounded-xl p-4"
          >
            <div className="text-sm mb-1">Tổng số</div>
            <div className="text-2xl font-bold text-primary-contrast">{stats.total}</div>
          </div>
          <div className="bg-linear-to-br from-red-50 to-red-100 rounded-xl p-4">
            <div className="text-sm text-red-600 mb-1">Chưa đọc</div>
            <div className="text-2xl font-bold text-red-900">{stats.unread}</div>
          </div>
          <div className="bg-linear-to-br from-green-50 to-green-100 rounded-xl p-4">
            <div className="text-sm text-green-600 mb-1">Lịch hẹn</div>
            <div className="text-2xl font-bold text-green-900">{stats.appointments}</div>
          </div>
          <div className="bg-linear-to-br from-purple-50 to-purple-100 rounded-xl p-4">
            <div className="text-sm text-purple-600 mb-1">Hôm nay</div>
            <div className="text-2xl font-bold text-purple-900">{stats.today}</div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filterOptions.map((option) => {
            const Icon = option.icon;
            const count =
              option.value === "all"
                ? stats.total
                : option.value === "unread"
                ? stats.unread
                : notifications.filter((n) => n.type === option.value).length;

            return (
              <button
                key={option.value}
                onClick={() => setFilter(option.value as NotificationFilter)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition ${
                  filter === option.value
                    ? "bg-primary text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                {option.label}
                {count > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      filter === option.value ? "bg-white/20" : "bg-gray-200"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="space-y-3 mt-2">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-16 text-center">
              <BellOff className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Không có thông báo</h3>
              <p className="text-gray-500">
                {filter === "unread" ? "Tuyệt vời! Bạn đã đọc hết thông báo" : "Chưa có thông báo nào trong mục này"}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification._id}
                className={`bg-white rounded-xl shadow-md overflow-hidden transition hover:shadow-xl ${
                  !notification.isRead ? "border-l-4 border-primary" : ""
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm ${getNotificationColor(
                        notification.type
                      )}`}
                    >
                      {getNotificationIcon(notification.type, notification.icon)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <h3
                            className={`font-semibold text-lg ${
                              !notification.isRead ? "text-gray-900" : "text-gray-600"
                            }`}
                          >
                            {notification.title}
                          </h3>
                          {!notification.isRead && (
                            <span className="px-2 py-0.5 bg-primary text-white text-xs rounded-full">Mới</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: vi,
                          })}
                        </span>
                      </div>

                      <p className={`text-sm mb-4 ${!notification.isRead ? "text-gray-700" : "text-gray-500"}`}>
                        {notification.message}
                      </p>

                      <div className="flex items-center gap-2 flex-wrap">
                        {notification.linkTo && (
                          <button
                            onClick={() => {
                              if (!notification.isRead) {
                                handleMarkAsRead(notification._id);
                              }
                              // Add timestamp to URL to force re-processing when already on the same page
                              const url = new URL(notification.linkTo as string, window.location.origin);
                              url.searchParams.set("_t", Date.now().toString());
                              router.push(url.pathname + url.search);
                            }}
                            className="text-sm px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition shadow-md"
                          >
                            Xem chi tiết →
                          </button>
                        )}

                        {!notification.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notification._id)}
                            className="text-sm px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            Đánh dấu đã đọc
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(notification._id)}
                          className="text-sm px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition flex items-center gap-1.5 ml-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                          Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {filteredNotifications.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-4 mt-6 text-center">
            <p className="text-sm text-gray-500">
              Hiển thị <span className="font-semibold text-gray-700">{filteredNotifications.length}</span> thông báo
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
