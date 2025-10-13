"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
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

interface AppointmentSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  notifications: AppointmentNotification[];
  clearNotifications: () => void;
}

const AppointmentSocketContext = createContext<AppointmentSocketContextType>({
  socket: null,
  isConnected: false,
  notifications: [],
  clearNotifications: () => {},
});

export function AppointmentSocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<AppointmentNotification[]>([]);
  const socketRef = React.useRef<Socket | null>(null);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    if (!session?.user) return;

    // Prevent double connection in StrictMode
    if (socketRef.current) return;

    const userId = session.user._id;
    const userRole = session.user.role;

    if (!userId || !userRole) return;

    // Connect to appointment socket namespace
    const socketUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";
    const newSocket = io(`${socketUrl}/appointments`, {
      auth: {
        userId,
        userRole,
        token: session.access_token,
      },
      transports: ["websocket", "polling"],
    });

    socketRef.current = newSocket;

    newSocket.on("connect", () => {
      console.log("✅ Appointment socket connected - User:", userId, "Role:", userRole);
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from appointment socket");
      setIsConnected(false);
    });

    // Handle new appointment (for doctors)
    newSocket.on("appointment:new", (data: AppointmentNotification) => {
      console.log("New appointment notification:", data);
      setNotifications((prev) => [...prev, data]);

      const patientName =
        typeof data.appointment.patientId === "string"
          ? data.appointment.patient?.fullName || "N/A"
          : data.appointment.patientId?.fullName || "N/A";

      toast.success(data.message, {
        description: `Bệnh nhân: ${patientName}`,
        action: {
          label: "Xem",
          onClick: () => (window.location.href = "/doctor/schedule"),
        },
        duration: 10000,
      });
    });

    // Handle appointment confirmed (for patients)
    newSocket.on("appointment:confirmed", (data: AppointmentNotification) => {
      console.log("Appointment confirmed:", data);
      setNotifications((prev) => [...prev, data]);

      const doctorName =
        typeof data.appointment.doctorId === "string"
          ? data.appointment.doctor?.fullName || "N/A"
          : data.appointment.doctorId?.fullName || "N/A";

      toast.success(data.message, {
        description: `Bác sĩ: ${doctorName}`,
        action: {
          label: "Xem",
          onClick: () => (window.location.href = "/patient/appointments/my-appointments"),
        },
        duration: 10000,
      });
    });

    // Handle appointment cancelled
    newSocket.on("appointment:cancelled", (data: AppointmentNotification) => {
      console.log("Appointment cancelled:", data);
      setNotifications((prev) => [...prev, data]);

      const cancellerText = data.cancelledBy === "doctor" ? "Bác sĩ" : "Bệnh nhân";

      toast.error(data.message, {
        description: `${cancellerText} đã hủy lịch hẹn`,
        action: {
          label: "Xem",
          onClick: () => {
            const url = userRole === "doctor" ? "/doctor/schedule" : "/patient/appointments/my-appointments";
            window.location.href = url;
          },
        },
        duration: 10000,
      });
    });

    // Handle appointment rescheduled
    newSocket.on("appointment:rescheduled", (data: AppointmentNotification) => {
      console.log("Appointment rescheduled:", data);
      setNotifications((prev) => [...prev, data]);

      toast.info(data.message, {
        description: "Vui lòng kiểm tra thời gian mới",
        action: {
          label: "Xem",
          onClick: () => {
            const url = userRole === "doctor" ? "/doctor/schedule" : "/patient/appointments/my-appointments";
            window.location.href = url;
          },
        },
        duration: 10000,
      });
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
    });

    setSocket(newSocket);

    return () => {
      console.log("🔌 Cleaning up socket connection");
      socketRef.current = null;
      newSocket.close();
    };
  }, [session]);

  return (
    <AppointmentSocketContext.Provider
      value={{
        socket,
        isConnected,
        notifications,
        clearNotifications,
      }}
    >
      {children}
    </AppointmentSocketContext.Provider>
  );
}

export function useAppointmentSocket() {
  const context = useContext(AppointmentSocketContext);
  if (context === undefined) {
    throw new Error("useAppointmentSocket must be used within AppointmentSocketProvider");
  }
  return context;
}
