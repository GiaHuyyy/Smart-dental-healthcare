import { io, Socket } from "socket.io-client";

// Socket.IO server is NOT under /api/v1, so use raw URL without API prefix
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.51.8:8081";
const SOCKET_BASE_URL = BASE_URL.replace(/\/api\/v1$/, "");

export interface AppointmentEventData {
  type: 'NEW_APPOINTMENT' | 'APPOINTMENT_CONFIRMED' | 'APPOINTMENT_CANCELLED' | 'APPOINTMENT_COMPLETED';
  appointment: any;
  message: string;
  timestamp: Date;
}

export interface NotificationEventData {
  _id: string;
  title: string;
  message: string;
  type: string;
  linkTo?: string;
  icon?: string;
  timestamp: Date;
}

export interface SocketEvents {
  // Appointment events
  'appointment:new': (data: AppointmentEventData) => void;
  'appointment:confirmed': (data: AppointmentEventData) => void;
  'appointment:cancelled': (data: AppointmentEventData) => void;
  'appointment:completed': (data: AppointmentEventData) => void;
  
  // Notification events
  'notification:new': (data: NotificationEventData) => void;
  
  // Error events
  error: (error: any) => void;
  connect_error: (error: any) => void;
}

class RealtimeAppointmentService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private userId: string | null = null;
  private userRole: "patient" | "doctor" | null = null;
  private eventListeners: Map<string, Array<(...args: any[]) => void>> = new Map();
  private connectionState: "disconnected" | "connecting" | "connected" | "failed" = "disconnected";

  connect(token: string, userId: string, userRole: "patient" | "doctor"): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Store user info for reconnections
        this.userId = userId;
        this.userRole = userRole;
        this.connectionState = "connecting";

        console.log(`🔌 [AppointmentSocket] Connecting with userID: ${userId}, role: ${userRole}`);
        console.log(`🔌 [AppointmentSocket] Server URL: ${SOCKET_BASE_URL}/appointments`);

        // Disconnect existing connection
        if (this.socket) {
          console.log("🔌 [AppointmentSocket] Disconnecting existing socket connection");
          this.socket.disconnect();
          this.socket = null;
        }

        // Ensure token is properly formatted
        const formattedToken = token.startsWith("Bearer ") ? token : `Bearer ${token}`;

        this.socket = io(`${SOCKET_BASE_URL}/appointments`, {
          auth: {
            userId,
            userRole,
          },
          extraHeaders: {
            Authorization: formattedToken,
          },
          // Start with polling first, then upgrade to websocket if available
          transports: ["polling", "websocket"],
          upgrade: true,
          timeout: 30000,
          path: "/socket.io",
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          forceNew: true,
          autoConnect: true,
        });

        // Connection success
        this.socket.on("connect", () => {
          console.log("✅ [AppointmentSocket] Connected successfully");
          this.connectionState = "connected";
          this.reconnectAttempts = 0;
          
          // Reattach all event listeners
          this.reattachEventListeners();
          
          resolve();
        });

        // Connection error
        this.socket.on("connect_error", (error) => {
          console.error("❌ [AppointmentSocket] Connection error:", error.message);
          this.connectionState = "failed";
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(new Error(`Connection failed after ${this.maxReconnectAttempts} attempts`));
          } else {
            this.reconnectAttempts++;
            console.log(`🔄 [AppointmentSocket] Retry ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
          }
        });

        // Disconnection
        this.socket.on("disconnect", (reason) => {
          console.log("🔌 [AppointmentSocket] Disconnected:", reason);
          this.connectionState = "disconnected";
        });

        // Error event
        this.socket.on("error", (error) => {
          console.error("❌ [AppointmentSocket] Error:", error);
        });

      } catch (error) {
        console.error("❌ [AppointmentSocket] Connection setup error:", error);
        this.connectionState = "failed";
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      console.log("🔌 [AppointmentSocket] Disconnecting");
      this.socket.disconnect();
      this.socket = null;
      this.connectionState = "disconnected";
      this.eventListeners.clear();
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getConnectionState(): "disconnected" | "connecting" | "connected" | "failed" {
    return this.connectionState;
  }

  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]) {
    if (!this.socket) {
      console.warn(`⚠️ [AppointmentSocket] Cannot add listener for ${event}: socket not initialized`);
      return;
    }

    // Store listener for reattachment on reconnect
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback as any);

    // Attach to socket
    this.socket.on(event, callback as any);
    console.log(`✅ [AppointmentSocket] Listener added for: ${event}`);
  }

  off<K extends keyof SocketEvents>(event: K, callback?: SocketEvents[K]) {
    if (!this.socket) return;

    if (callback) {
      this.socket.off(event, callback as any);
      
      // Remove from stored listeners
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback as any);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    } else {
      this.socket.off(event);
      this.eventListeners.delete(event);
    }
    
    console.log(`🗑️ [AppointmentSocket] Listener removed for: ${event}`);
  }

  private reattachEventListeners() {
    if (!this.socket) return;

    console.log("🔄 [AppointmentSocket] Reattaching event listeners");
    
    this.eventListeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        this.socket?.on(event, callback);
      });
    });
  }

  // Utility method to reconnect manually if needed
  reconnect(token: string) {
    if (!this.userId || !this.userRole) {
      console.error("❌ [AppointmentSocket] Cannot reconnect: missing user info");
      return Promise.reject(new Error("Missing user info"));
    }
    
    console.log("🔄 [AppointmentSocket] Manual reconnect requested");
    return this.connect(token, this.userId, this.userRole);
  }
}

// Export singleton instance
export const realtimeAppointmentService = new RealtimeAppointmentService();
