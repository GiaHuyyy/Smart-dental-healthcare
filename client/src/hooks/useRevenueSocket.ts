"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

interface RevenueSocketHook {
  socket: Socket | null;
  isConnected: boolean;
  registerRefreshCallback: (callback: () => void) => void;
  unregisterRefreshCallback: () => void;
}

export function useRevenueSocket(): RevenueSocketHook {
  const { data: session, status } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const refreshCallbackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Only connect when user is authenticated and is a doctor
    if (status !== "authenticated" || !session?.user || session.user.role !== "doctor") {
      return;
    }

    // Prevent double connection
    if (socketRef.current) {
      return;
    }

    const doctorId = session.user._id;

    console.log("🔌 Connecting to revenue socket...", doctorId);

    // Create socket connection to /revenue namespace
    const socketUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";
    const newSocket = io(`${socketUrl}/revenue`, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      auth: {
        doctorId,
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = newSocket;

    // Connection events
    newSocket.on("connect", () => {
      console.log("✅ Connected to revenue socket");
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("❌ Disconnected from revenue socket");
      setIsConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ Revenue socket connection error:", error.message);
      setIsConnected(false);
    });

    // Revenue events - trigger refresh callback
    newSocket.on("revenue:new", (data) => {
      console.log("💰 [Revenue] New revenue:", data);
      if (refreshCallbackRef.current) {
        refreshCallbackRef.current();
      }
    });

    newSocket.on("revenue:updated", (data) => {
      console.log("🔄 [Revenue] Updated:", data);
      if (refreshCallbackRef.current) {
        refreshCallbackRef.current();
      }
    });

    newSocket.on("revenue:delete", (data) => {
      console.log("🗑️ [Revenue] Deleted:", data);
      if (refreshCallbackRef.current) {
        refreshCallbackRef.current();
      }
    });

    newSocket.on("revenue:summaryUpdated", (data) => {
      console.log("📊 [Revenue] Summary updated:", data);
      if (refreshCallbackRef.current) {
        refreshCallbackRef.current();
      }
    });

    setSocket(newSocket);

    // Cleanup on unmount or session change
    return () => {
      if (socketRef.current) {
        console.log("🔌 Cleaning up revenue socket...");
        socketRef.current.off("connect");
        socketRef.current.off("disconnect");
        socketRef.current.off("connect_error");
        socketRef.current.off("revenue:new");
        socketRef.current.off("revenue:updated");
        socketRef.current.off("revenue:delete");
        socketRef.current.off("revenue:summaryUpdated");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [session, status]);

  const registerRefreshCallback = useCallback((callback: () => void) => {
    refreshCallbackRef.current = callback;
  }, []);

  const unregisterRefreshCallback = useCallback(() => {
    refreshCallbackRef.current = null;
  }, []);

  return {
    socket,
    isConnected,
    registerRefreshCallback,
    unregisterRefreshCallback,
  };
}
