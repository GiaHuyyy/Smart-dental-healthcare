import { io, Socket } from "socket.io-client";

interface Message {
  _id: string;
  content: string;
  senderId: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  senderRole: "patient" | "doctor";
  messageType: "text" | "image" | "file" | "call";
  createdAt: string;
  isRead: boolean;
}

interface Conversation {
  _id: string;
  patientId: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    email: string;
  };
  doctorId: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    email: string;
    specialization?: string;
  };
  status: string;
  unreadPatientCount: number;
  unreadDoctorCount: number;
}

export interface SocketEvents {
  // Connection events
  userOnline: (data: { userId: string; userRole: string }) => void;
  userOffline: (data: { userId: string }) => void;

  // Message events
  newMessage: (data: { message: Message; conversationId: string }) => void;
  messageRead: (data: { conversationId: string; messageId: string; readBy: string }) => void;
  messageError: (data: { error: string }) => void;

  // Conversation events
  conversationUpdated: (conversation: Conversation) => void;

  // Typing events
  userTyping: (data: { conversationId: string; userId: string; userRole: string; isTyping: boolean }) => void;
}

class RealtimeChatService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private joinedRooms: Set<string> = new Set();
  private reconnectCallbacks: Array<() => void> = [];

  connect(token: string, userId: string, userRole: "patient" | "doctor"): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Disconnect existing connection
        if (this.socket) {
          this.socket.disconnect();
        }

        this.socket = io(`${process.env.NEXT_PUBLIC_SERVER_URL}/chat`, {
          auth: {
            token,
            userId,
            userRole,
          },
          transports: ["websocket", "polling"],
          upgrade: true,
          timeout: 20000,
        });

        this.socket.on("connect", () => {
          console.log("Connected to realtime chat server");
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on("connect_error", (error) => {
          console.error("Socket connection error:", error);
          reject(error);
        });

        this.socket.on("disconnect", (reason) => {
          console.log("Disconnected from realtime chat server:", reason);

          if (reason === "io server disconnect") {
            // Server forcefully disconnected the socket, try to reconnect
            this.attemptReconnect(token, userId, userRole);
          }
        });

        // Setup auto-reconnection
        this.socket.on("reconnect_attempt", () => {
          console.log(`Reconnect attempt ${this.reconnectAttempts + 1}`);
        });

        this.socket.on("reconnect", () => {
          console.log("Reconnected to realtime chat server");
          this.reconnectAttempts = 0;
          // Re-join previously joined rooms
          this.joinedRooms.forEach((room) => {
            this.socket?.emit("joinConversation", { conversationId: room });
          });
          // Fire optional callbacks so UI can re-sync state
          this.reconnectCallbacks.forEach((cb) => cb());
        });

        this.socket.on("reconnect_failed", () => {
          console.error("Failed to reconnect to realtime chat server");
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect(token: string, userId: string, userRole: "patient" | "doctor") {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect(token, userId, userRole).catch(() => {
          this.attemptReconnect(token, userId, userRole);
        });
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.joinedRooms.clear();
  }

  // Event listeners
  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off<K extends keyof SocketEvents>(event: K, callback?: SocketEvents[K]) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  onReconnect(cb: () => void) {
    this.reconnectCallbacks.push(cb);
  }

  // Conversation actions
  joinConversation(conversationId: string) {
    if (this.socket) {
      this.socket.emit("joinConversation", { conversationId });
      this.joinedRooms.add(conversationId);
    }
  }

  leaveConversation(conversationId: string) {
    if (this.socket) {
      this.socket.emit("leaveConversation", { conversationId });
      this.joinedRooms.delete(conversationId);
    }
  }

  // Message actions
  sendMessage(conversationId: string, content: string, messageType: "text" | "image" | "file" = "text") {
    if (this.socket) {
      this.socket.emit("sendMessage", {
        conversationId,
        content,
        messageType,
      });
    }
  }

  markMessageAsRead(conversationId: string, messageId: string) {
    if (this.socket) {
      this.socket.emit("markMessageRead", {
        conversationId,
        messageId,
      });
    }
  }

  // Typing indicator
  sendTypingStatus(conversationId: string, isTyping: boolean) {
    if (this.socket) {
      this.socket.emit("typing", {
        conversationId,
        isTyping,
      });
    }
  }

  // Check connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Get socket instance (for advanced usage)
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Export singleton instance
export const realtimeChatService = new RealtimeChatService();
export default realtimeChatService;
