"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Appointment } from "@/types/appointment";
import { useGlobalSocket } from "./GlobalSocketContext";

interface AppointmentNotification {
  type: string;
  appointment: Appointment;
  message: string;
  timestamp: Date;
  cancelledBy?: "doctor" | "patient";
}

interface AppointmentContextType {
  isConnected: boolean;
  notifications: AppointmentNotification[];
  clearNotifications: () => void;
  // Refresh callback
  onAppointmentUpdate?: () => void;
  registerAppointmentCallback: (callback: () => void) => void;
  unregisterAppointmentCallback: () => void;
}

const AppointmentContext = createContext<AppointmentContextType>({
  isConnected: false,
  notifications: [],
  clearNotifications: () => {},
  registerAppointmentCallback: () => {},
  unregisterAppointmentCallback: () => {},
});

export function AppointmentProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { socket, isConnected } = useGlobalSocket(); // ✅ Sử dụng socket từ GlobalSocketContext
  const [notifications, setNotifications] = useState<AppointmentNotification[]>([]);
  const appointmentCallbackRef = React.useRef<(() => void) | null>(null);

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

  // Setup appointment event listeners
  useEffect(() => {
    if (!socket || status !== "authenticated" || !session?.user) return;

    const userId = session.user._id;
    const userRole = session.user.role;

    console.log("📅 Setting up appointment listeners for user:", userId, "role:", userRole);

    // ==========================================
    // APPOINTMENT EVENTS (for all users)
    // ==========================================

    // Handle new appointment (mainly for doctors)
    const handleAppointmentNew = (data: AppointmentNotification) => {
      console.log("📅 New appointment notification:", data);
      const notification: AppointmentNotification = {
        ...data,
        timestamp: new Date(),
      };
      setNotifications((prev) => [...prev, notification]);
      triggerAppointmentRefresh();
    };

    // Handle appointment confirmed (mainly for patients)
    const handleAppointmentConfirmed = (data: AppointmentNotification) => {
      console.log("✅ Appointment confirmed:", data);
      const notification: AppointmentNotification = {
        ...data,
        timestamp: new Date(),
      };
      setNotifications((prev) => [...prev, notification]);
      triggerAppointmentRefresh();
    };

    // Handle appointment cancelled (for both doctors and patients)
    const handleAppointmentCancelled = (data: AppointmentNotification) => {
      console.log("❌ Appointment cancelled:", data);
      const notification: AppointmentNotification = {
        ...data,
        timestamp: new Date(),
      };
      setNotifications((prev) => [...prev, notification]);
      triggerAppointmentRefresh();
    };

    // Handle appointment rescheduled (for both doctors and patients)
    const handleAppointmentRescheduled = (data: AppointmentNotification) => {
      console.log("🔄 Appointment rescheduled:", data);
      const notification: AppointmentNotification = {
        ...data,
        timestamp: new Date(),
      };
      setNotifications((prev) => [...prev, notification]);
      triggerAppointmentRefresh();
    };

    // Handle appointment completed (mainly for patients)
    const handleAppointmentCompleted = (data: AppointmentNotification) => {
      console.log("✅ Appointment completed:", data);
      const notification: AppointmentNotification = {
        ...data,
        timestamp: new Date(),
      };
      setNotifications((prev) => [...prev, notification]);
      triggerAppointmentRefresh();
    };

    // Handle appointment reminder (30 minutes before - for both doctors and patients)
    const handleAppointmentReminder = (data: AppointmentNotification) => {
      console.log("⏰ Appointment reminder:", data);
      const notification: AppointmentNotification = {
        ...data,
        timestamp: new Date(),
      };
      setNotifications((prev) => [...prev, notification]);
      triggerAppointmentRefresh();
    };

    // Register listeners
    socket.on("appointment:new", handleAppointmentNew);
    socket.on("appointment:confirmed", handleAppointmentConfirmed);
    socket.on("appointment:cancelled", handleAppointmentCancelled);
    socket.on("appointment:rescheduled", handleAppointmentRescheduled);
    socket.on("appointment:completed", handleAppointmentCompleted);
    socket.on("appointment:reminder", handleAppointmentReminder);

    // Cleanup
    return () => {
      console.log("🧹 Cleaning up appointment listeners");
      socket.off("appointment:new", handleAppointmentNew);
      socket.off("appointment:confirmed", handleAppointmentConfirmed);
      socket.off("appointment:cancelled", handleAppointmentCancelled);
      socket.off("appointment:rescheduled", handleAppointmentRescheduled);
      socket.off("appointment:completed", handleAppointmentCompleted);
      socket.off("appointment:reminder", handleAppointmentReminder);
    };
  }, [socket, session, status, triggerAppointmentRefresh]);

  return (
    <AppointmentContext.Provider
      value={{
        isConnected,
        notifications,
        clearNotifications,
        registerAppointmentCallback,
        unregisterAppointmentCallback,
      }}
    >
      {children}
    </AppointmentContext.Provider>
  );
}

export function useAppointment() {
  const context = useContext(AppointmentContext);
  if (context === undefined) {
    throw new Error("useAppointment must be used within AppointmentProvider");
  }
  return context;
}

// Keep backward compatibility
export { AppointmentProvider as AppointmentSocketProvider, useAppointment as useAppointmentSocket };
