"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { Appointment } from "@/types/appointment";

interface AppointmentNotification {
  type: string;
  appointment: Appointment;
  message: string;
  timestamp: Date;
  cancelledBy?: "doctor" | "patient";
}

interface GlobalSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  notifications: AppointmentNotification[];
  clearNotifications: () => void;
  // Refresh callbacks for different features
  onAppointmentUpdate?: () => void;
  registerAppointmentCallback: (callback: () => void) => void;
  unregisterAppointmentCallback: () => void;
}

const GlobalSocketContext = createContext<GlobalSocketContextType>({
  socket: null,
  isConnected: false,
  notifications: [],
  clearNotifications: () => {},
  registerAppointmentCallback: () => {},
  unregisterAppointmentCallback: () => {},
});

export function GlobalSocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<AppointmentNotification[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const appointmentCallbackRef = useRef<(() => void) | null>(null);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const registerAppointmentCallback = useCallback((callback: () => void) => {
    appointmentCallbackRef.current = callback;
  }, []);

  const unregisterAppointmentCallback = useCallback(() => {
    appointmentCallbackRef.current = null;
  }, []);

  // Trigger appointment refresh callback
  const triggerAppointmentRefresh = useCallback(() => {
    if (appointmentCallbackRef.current) {
      console.log("🔄 Triggering appointment refresh callback");
      appointmentCallbackRef.current();
    }
  }, []);

  useEffect(() => {
    // Only connect when user is authenticated
    if (status !== "authenticated" || !session?.user) {
      return;
    }

    // Prevent double connection in StrictMode
    if (socketRef.current) {
      console.log("⚠️ Socket already exists, skipping connection");
      return;
    }

    const userId = session.user._id;
    const userRole = session.user.role;

    console.log("🔌 Connecting global socket for user:", userId, "role:", userRole);

    // Create single socket connection to /appointments namespace
    // This namespace handles all appointment-related events
    const socketUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";
    const newSocket = io(`${socketUrl}/appointments`, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      auth: {
        userId,
        userRole: userRole,
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = newSocket;

    // Connection events
    newSocket.on("connect", () => {
      console.log("✅ Global socket connected:", newSocket.id);
      setIsConnected(true);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("❌ Global socket disconnected:", reason);
      setIsConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("🔴 Global socket connection error:", error.message);
      setIsConnected(false);
    });

    // ==========================================
    // APPOINTMENT EVENTS (for all users)
    // ==========================================

    // New appointment created (mainly for doctors)
    newSocket.on("appointment:new", (data: AppointmentNotification) => {
      const notification: AppointmentNotification = {
        ...data,
        timestamp: new Date(),
      };
      setNotifications((prev) => [...prev, notification]);

      // Show toast for doctors with action button
      if (userRole === "doctor") {
        toast.success("Lịch hẹn mới", {
          description: data.message || "Bạn có lịch hẹn mới từ bệnh nhân",
          duration: 6000,
          action: {
            label: "Xem lịch",
            onClick: () => router.push("/doctor/schedule"),
          },
        });
      }

      // Trigger refresh callback
      triggerAppointmentRefresh();
    });

    // Appointment confirmed (mainly for patients)
    newSocket.on("appointment:confirmed", (data: AppointmentNotification) => {
      const notification: AppointmentNotification = {
        ...data,
        timestamp: new Date(),
      };
      setNotifications((prev) => [...prev, notification]);

      // Show toast for patients with action button
      if (userRole === "patient") {
        toast.success("Lịch hẹn đã được xác nhận", {
          description: data.message || "Bác sĩ đã xác nhận lịch hẹn của bạn",
          duration: 6000,
          action: {
            label: "Xem chi tiết",
            onClick: () => router.push("/patient/appointments/my-appointments"),
          },
        });
      }

      // Trigger refresh callback
      triggerAppointmentRefresh();
    });

    // Appointment cancelled (for both doctors and patients)
    newSocket.on("appointment:cancelled", (data: AppointmentNotification) => {
      const notification: AppointmentNotification = {
        ...data,
        timestamp: new Date(),
      };
      setNotifications((prev) => [...prev, notification]);

      // Show appropriate toast based on who cancelled
      const isCancelledByMe =
        (userRole === "doctor" && data.cancelledBy === "doctor") ||
        (userRole === "patient" && data.cancelledBy === "patient");

      if (!isCancelledByMe) {
        const cancellerLabel = data.cancelledBy === "doctor" ? "Bác sĩ" : "Bệnh nhân";
        const targetRoute = userRole === "doctor" ? "/doctor/schedule" : "/patient/appointments/my-appointments";

        toast.error("Lịch hẹn đã bị hủy", {
          description: data.message || `${cancellerLabel} đã hủy lịch hẹn`,
          duration: 6000,
          action: {
            label: "Xem chi tiết",
            onClick: () => router.push(targetRoute),
          },
        });
      }

      // Trigger refresh callback
      triggerAppointmentRefresh();
    });

    // Appointment rescheduled (for both doctors and patients)
    newSocket.on("appointment:rescheduled", (data: AppointmentNotification) => {
      const notification: AppointmentNotification = {
        ...data,
        timestamp: new Date(),
      };
      setNotifications((prev) => [...prev, notification]);

      const targetRoute = userRole === "doctor" ? "/doctor/schedule" : "/patient/appointments/my-appointments";

      toast.info("Lịch hẹn đã được đổi giờ", {
        description: data.message || "Lịch hẹn đã được thay đổi thời gian",
        duration: 6000,
        action: {
          label: "Xem lịch mới",
          onClick: () => router.push(targetRoute),
        },
      });

      // Trigger refresh callback
      triggerAppointmentRefresh();
    });

    // Appointment completed (mainly for patients)
    newSocket.on("appointment:completed", (data: AppointmentNotification) => {
      const notification: AppointmentNotification = {
        ...data,
        timestamp: new Date(),
      };
      setNotifications((prev) => [...prev, notification]);

      if (userRole === "patient") {
        toast.success("Khám hoàn tất", {
          description: data.message || "Lịch khám đã hoàn tất",
          duration: 6000,
          action: {
            label: "Xem lịch sử",
            onClick: () => router.push("/patient/appointments/my-appointments"),
          },
        });
      }

      // Trigger refresh callback
      triggerAppointmentRefresh();
    });

    // ==========================================
    // CHAT EVENTS (existing chat functionality)
    // ==========================================
    // These will be handled by RealtimeChatContext or other contexts
    // No need to duplicate here, they can reuse this same socket

    setSocket(newSocket);

    // Cleanup on unmount or session change
    return () => {
      console.log("🧹 Cleaning up global socket");

      if (socketRef.current) {
        socketRef.current.off("connect");
        socketRef.current.off("disconnect");
        socketRef.current.off("connect_error");
        socketRef.current.off("appointment:new");
        socketRef.current.off("appointment:confirmed");
        socketRef.current.off("appointment:cancelled");
        socketRef.current.off("appointment:rescheduled");
        socketRef.current.off("appointment:completed");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [session, status, router, triggerAppointmentRefresh]);

  const value: GlobalSocketContextType = {
    socket,
    isConnected,
    notifications,
    clearNotifications,
    registerAppointmentCallback,
    unregisterAppointmentCallback,
  };

  return <GlobalSocketContext.Provider value={value}>{children}</GlobalSocketContext.Provider>;
}

export function useGlobalSocket() {
  const context = useContext(GlobalSocketContext);
  if (!context) {
    throw new Error("useGlobalSocket must be used within GlobalSocketProvider");
  }
  return context;
}

// Export the context for direct access if needed
export { GlobalSocketContext };
