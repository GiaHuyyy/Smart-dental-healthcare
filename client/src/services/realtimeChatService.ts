import { io, Socket } from "socket.io-client";

interface Message {
  _id: string;
  content: string;
  senderId: {
    _id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
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
    avatarUrl?: string;
    email: string;
  };
  doctorId: {
    _id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
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

  // Call message events (for real-time call status updates)
  callMessageUpdated: (data: { message: Message; conversationId: string }) => void;

  // Conversation events
  conversationUpdated: (conversation: Conversation) => void;

  // List events
  conversationsLoaded: (data: { conversations: Array<Conversation> }) => void;
  messagesLoaded: (data: { conversationId: string; messages: Array<Message> }) => void;

  // Typing events
  userTyping: (data: { conversationId: string; userId: string; userRole: string; isTyping: boolean }) => void;

  // Error events
  error: (error: any) => void;
  connect_error: (error: any) => void;
}

class RealtimeChatService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private joinedRooms: Set<string> = new Set();
  private reconnectCallbacks: Array<() => void> = [];
  private userId: string | null = null;
  private userRole: "patient" | "doctor" | null = null;

  connect(token: string, userId: string, userRole: "patient" | "doctor"): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Store user info for reconnections
        this.userId = userId;
        this.userRole = userRole;

        console.log(`Attempting to connect socket with userID: ${userId}, role: ${userRole}`);
        console.log(`Server URL: ${process.env.NEXT_PUBLIC_BACKEND_URL}`);

        // Disconnect existing connection
        if (this.socket) {
          console.log("Disconnecting existing socket connection");
          this.socket.disconnect();
        }

        // Ensure token is properly formatted
        const formattedToken = token.startsWith("Bearer ") ? token : `Bearer ${token}`;

        this.socket = io(`${process.env.NEXT_PUBLIC_BACKEND_URL}/chat`, {
          auth: {
            token: formattedToken,
            userId,
            userRole,
          },
          extraHeaders: {
            Authorization: formattedToken,
          },
          transports: ["websocket", "polling"],
          upgrade: true,
          timeout: 20000,
          path: "/socket.io",
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        // Debug listener for all events
        this.socket.onAny((event, ...args) => {
          if (event !== "ping" && event !== "pong") {
            console.log(`[Socket] Received event: ${event}`, args);
          }
        });

        this.socket.on("connect", () => {
          console.log(`Socket connected with ID: ${this.socket?.id}`);
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
    this.userId = null;
    this.userRole = null;
  }

  // Event listeners
  on(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  onReconnect(cb: () => void) {
    this.reconnectCallbacks.push(cb);
  }

  // Conversation actions
  joinConversation(conversationId: string) {
    if (this.socket && conversationId) {
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
      return new Promise<void>((resolve, reject) => {
        this.socket?.emit(
          "sendMessage",
          {
            conversationId,
            content,
            messageType,
          },
          (response: { success: boolean; error?: string }) => {
            if (response.success) {
              resolve();
            } else {
              reject(new Error(response.error || "Failed to send message"));
            }
          }
        );
      });
    }
    return Promise.reject(new Error("Socket not connected"));
  }

  // Load conversations
  loadConversations() {
    if (this.socket && this.userId && this.userRole) {
      return new Promise<void>((resolve, reject) => {
        console.log(`Emitting loadConversations event with userId: ${this.userId}, userRole: ${this.userRole}`);

        this.socket?.emit("loadConversations", {
          userId: this.userId,
          userRole: this.userRole,
        });

        // Set up a one-time listener to resolve the promise
        const timeout = setTimeout(() => {
          console.warn("Server did not respond to loadConversations event after 10 seconds");
          resolve(); // Resolve anyway to not block UI
        }, 10000);

        this.socket?.once("conversationsLoaded", () => {
          clearTimeout(timeout);
          resolve();
        });

        this.socket?.once("error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    }
    return Promise.reject(new Error("Socket not connected or user info missing"));
  }

  // Load messages for a conversation
  loadMessages(conversationId: string, limit: number = 100) {
    if (this.socket && this.userId && this.userRole) {
      return new Promise<void>((resolve, reject) => {
        console.log(`Emitting loadMessages event for conversation: ${conversationId}`);

        this.socket?.emit("loadMessages", {
          conversationId,
          userId: this.userId,
          userRole: this.userRole,
          limit,
        });

        const timeout = setTimeout(() => {
          console.warn("Server did not respond to loadMessages event after 10 seconds");
          resolve();
        }, 10000);

        this.socket?.once("messagesLoaded", (data) => {
          if (data.conversationId === conversationId) {
            clearTimeout(timeout);
            resolve();
          }
        });

        this.socket?.once("error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    }
    return Promise.reject(new Error("Socket not connected or user info missing"));
  }

  markMessageAsRead(conversationId: string, messageId: string) {
    if (this.socket) {
      this.socket.emit("markMessageRead", {
        conversationId,
        messageId,
      });
    }
  }

  // Mark all messages in a conversation as read
  markConversationAsRead(conversationId: string) {
    if (this.socket) {
      console.log(`[Socket] Emitting markConversationAsRead for ${conversationId}`);
      this.socket.emit("markConversationAsRead", { conversationId });
    }
  }

  // Create a new conversation
  createConversation(patientId: string, doctorId: string): Promise<any> {
    // Thay đổi kiểu trả về thành any để linh hoạt
    if (this.socket) {
      return new Promise<any>((resolve, reject) => {
        // Cung cấp hàm callback (ack) làm tham số thứ 3
        this.socket?.emit(
          "createConversation",
          { patientId, doctorId },
          // Hàm này sẽ được server gọi để trả kết quả về
          (response: { success: boolean; conversation?: any; error?: string }) => {
            if (response.success && response.conversation) {
              console.log("Client received new conversation:", response.conversation);
              resolve(response.conversation);
            } else {
              reject(new Error(response.error || "Failed to create conversation on server"));
            }
          }
        );
      });
    }
    return Promise.reject(new Error("Socket not connected"));
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

  // Upload image via socket
  uploadImage(conversationId: string, imageData: string, fileName: string, fileType: string) {
    if (this.socket) {
      return new Promise<{ success: boolean; url?: string; public_id?: string; error?: string }>((resolve) => {
        this.socket?.emit(
          "uploadImage",
          {
            conversationId,
            image: imageData,
            fileName,
            fileType,
          },
          (response: { success: boolean; url?: string; public_id?: string; error?: string }) => {
            resolve(response);
          }
        );
      });
    }
    return Promise.reject(new Error("Socket not connected"));
  }

  // Check connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Get socket instance (for advanced usage)
  getSocket(): Socket | null {
    return this.socket;
  }

  // Get current user info
  getUserInfo() {
    return {
      userId: this.userId,
      userRole: this.userRole,
    };
  }
}

// Export singleton instance
export const realtimeChatService = new RealtimeChatService();
export default realtimeChatService;
