"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";

interface GlobalSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const GlobalSocketContext = createContext<GlobalSocketContextType>({
  socket: null,
  isConnected: false,
});

export function GlobalSocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Only connect when user is authenticated
    if (status !== "authenticated" || !session?.user) {
      return;
    }

    // Prevent double connection in StrictMode
    if (socketRef.current) {
      return;
    }

    const userId = session.user._id;
    const userRole = session.user.role;

    // Create single socket connection to /appointments namespace
    // This namespace handles all appointment-related and notification events
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
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("❌ [GlobalSocket] Disconnected from /appointments");
      setIsConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ [GlobalSocket] Connection error:", error.message);
      setIsConnected(false);
    });

    setSocket(newSocket);

    // Cleanup on unmount or session change
    return () => {
      if (socketRef.current) {
        socketRef.current.off("connect");
        socketRef.current.off("disconnect");
        socketRef.current.off("connect_error");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [session, status]);

  const value: GlobalSocketContextType = {
    socket,
    isConnected,
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
