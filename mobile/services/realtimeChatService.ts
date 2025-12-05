import { io, Socket } from "socket.io-client";

// Socket.IO server is NOT under /api/v1, so use raw URL without API prefix
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.51.8:8081";
const SOCKET_BASE_URL = BASE_URL.replace(/\/api\/v1$/, "");

export interface ChatMessage {
  _id: string;
  content: string;
  senderId: {
    _id: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    name?: string;
    avatar?: string;
  };
  senderRole: "patient" | "doctor";
  messageType: "text" | "image" | "file" | "call";
  createdAt: string;
  isRead: boolean;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  // Call data for call messages
  callData?: {
    callType: "audio" | "video";
    callStatus: "missed" | "answered" | "rejected" | "completed";
    callDuration: number;
    startedAt?: string;
    endedAt?: string;
  };
}

export interface ChatConversation {
  _id: string;
  patientId: {
    _id: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    name?: string;
    avatar?: string;
    email?: string;
  };
  doctorId: {
    _id: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    name?: string;
    avatar?: string;
    email?: string;
    specialty?: string;
    specialization?: string;
  };
  status: string;
  unreadPatientCount: number;
  unreadDoctorCount: number;
  lastMessage?: ChatMessage;
  updatedAt: string;
}

export interface SocketEvents {
  // Connection events
  userOnline: (data: { userId: string; userRole: string }) => void;
  userOffline: (data: { userId: string }) => void;

  // Message events
  newMessage: (data: { message: ChatMessage; conversationId: string }) => void;
  messageRead: (data: { conversationId: string; messageId: string; readBy: string }) => void;
  messageError: (data: { error: string }) => void;

  // Conversation events
  conversationCreated: (conversation: ChatConversation) => void;
  conversationUpdated: (conversation: ChatConversation) => void;

  // List events
  conversationsLoaded: (data: { conversations: Array<ChatConversation> }) => void;
  messagesLoaded: (data: { conversationId: string; messages: Array<ChatMessage> }) => void;

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
  private eventListeners: Map<string, Array<(...args: any[]) => void>> = new Map();

  connect(token: string, userId: string, userRole: "patient" | "doctor"): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Store user info for reconnections
        this.userId = userId;
        this.userRole = userRole;

        console.log(`🔌 [Socket] Connecting with userID: ${userId}, role: ${userRole}`);
        console.log(`🔌 [Socket] Server URL: ${SOCKET_BASE_URL}`);

        // Disconnect existing connection
        if (this.socket) {
          console.log("🔌 [Socket] Disconnecting existing socket connection");
          this.socket.disconnect();
        }

        // Ensure token is properly formatted
        const formattedToken = token.startsWith("Bearer ") ? token : `Bearer ${token}`;

        this.socket = io(`${SOCKET_BASE_URL}/chat`, {
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
            console.log(`📨 [Socket] Event: ${event}`, JSON.stringify(args).slice(0, 200));
          }
        });

        this.socket.on("connect", () => {
          console.log(`✅ [Socket] Connected with ID: ${this.socket?.id}`);
          this.reconnectAttempts = 0;

          // Re-attach all event listeners
          this.reattachEventListeners();

          resolve();
        });

        this.socket.on("connect_error", (error) => {
          console.error("❌ [Socket] Connection error:", error);
          reject(error);
        });

        this.socket.on("disconnect", (reason) => {
          console.log("🔌 [Socket] Disconnected:", reason);

          if (reason === "io server disconnect") {
            // Server forcefully disconnected the socket, try to reconnect
            this.attemptReconnect(token, userId, userRole);
          }
        });

        // Setup auto-reconnection
        this.socket.on("reconnect_attempt", () => {
          console.log(`🔄 [Socket] Reconnect attempt ${this.reconnectAttempts + 1}`);
        });

        this.socket.on("reconnect", () => {
          console.log("✅ [Socket] Reconnected to server");
          this.reconnectAttempts = 0;

          // Re-join previously joined rooms
          this.joinedRooms.forEach((room) => {
            this.socket?.emit("joinConversation", { conversationId: room });
          });

          // Fire optional callbacks so UI can re-sync state
          this.reconnectCallbacks.forEach((cb) => cb());

          // Re-attach event listeners
          this.reattachEventListeners();
        });

        this.socket.on("reconnect_failed", () => {
          console.error("❌ [Socket] Failed to reconnect");
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect(token: string, userId: string, userRole: "patient" | "doctor") {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(
        () => {
          this.reconnectAttempts++;
          this.connect(token, userId, userRole).catch(() => {
            this.attemptReconnect(token, userId, userRole);
          });
        },
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts)
      );
    }
  }

  private reattachEventListeners() {
    if (!this.socket) return;

    this.eventListeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        this.socket?.on(event, callback);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.joinedRooms.clear();
    this.userId = null;
    this.userRole = null;
    this.eventListeners.clear();
  }

  // Event listeners with auto-reattach support
  on(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback);

      // Store for re-attachment on reconnect
      if (!this.eventListeners.has(event)) {
        this.eventListeners.set(event, []);
      }
      this.eventListeners.get(event)?.push(callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }

    // Remove from stored listeners
    if (callback) {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    } else {
      this.eventListeners.delete(event);
    }
  }

  onReconnect(cb: () => void) {
    this.reconnectCallbacks.push(cb);
  }

  // Conversation actions
  joinConversation(conversationId: string) {
    if (this.socket && this.socket.connected && conversationId) {
      console.log(`🚪 [Socket] Joining conversation: ${conversationId}`);
      this.socket.emit("joinConversation", { conversationId });
      this.joinedRooms.add(conversationId);
    } else {
      console.warn("⚠️ [Socket] Cannot join conversation - socket not connected");
    }
  }

  leaveConversation(conversationId: string) {
    if (this.socket && this.socket.connected) {
      console.log(`🚪 [Socket] Leaving conversation: ${conversationId}`);
      this.socket.emit("leaveConversation", { conversationId });
      this.joinedRooms.delete(conversationId);
    }
  }

  // Message actions
  sendMessage(
    conversationId: string,
    content: string,
    messageType: "text" | "image" | "file" = "text",
    fileUrl?: string,
    fileName?: string,
    fileType?: string,
    fileSize?: number
  ): Promise<void> {
    if (this.socket && this.socket.connected) {
      return new Promise<void>((resolve, reject) => {
        console.log(`📤 [Socket] Sending message to ${conversationId}`);

        this.socket?.emit(
          "sendMessage",
          {
            conversationId,
            content,
            messageType,
            fileUrl,
            fileName,
            fileType,
            fileSize,
          },
          (response: { success: boolean; error?: string }) => {
            if (response.success) {
              console.log("✅ [Socket] Message sent successfully");
              resolve();
            } else {
              console.error("❌ [Socket] Failed to send message:", response.error);
              reject(new Error(response.error || "Failed to send message"));
            }
          }
        );
      });
    }
    return Promise.reject(new Error("Socket not connected"));
  }

  // Load conversations
  loadConversations(): Promise<void> {
    if (this.socket && this.socket.connected && this.userId && this.userRole) {
      return new Promise<void>((resolve, reject) => {
        console.log(`📋 [Socket] Loading conversations for ${this.userId} (${this.userRole})`);

        this.socket?.emit("loadConversations", {
          userId: this.userId,
          userRole: this.userRole,
        });

        // Set up a one-time listener to resolve the promise
        const timeout = setTimeout(() => {
          console.warn("⚠️ [Socket] Server did not respond to loadConversations after 10s");
          resolve(); // Resolve anyway to not block UI
        }, 10000);

        const handler = () => {
          clearTimeout(timeout);
          resolve();
        };

        this.socket?.once("conversationsLoaded", handler);

        this.socket?.once("error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    }
    return Promise.reject(new Error("Socket not connected or user info missing"));
  }

  // Load messages for a conversation
  loadMessages(conversationId: string, limit: number = 100): Promise<void> {
    if (this.socket && this.socket.connected && this.userId && this.userRole) {
      return new Promise<void>((resolve, reject) => {
        console.log(`📨 [Socket] Loading messages for conversation: ${conversationId}`);

        this.socket?.emit("loadMessages", {
          conversationId,
          userId: this.userId,
          userRole: this.userRole,
          limit,
        });

        const timeout = setTimeout(() => {
          console.warn("⚠️ [Socket] Server did not respond to loadMessages after 10s");
          resolve();
        }, 10000);

        const handler = (data: any) => {
          if (data.conversationId === conversationId) {
            clearTimeout(timeout);
            resolve();
          }
        };

        this.socket?.once("messagesLoaded", handler);

        this.socket?.once("error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    }
    return Promise.reject(new Error("Socket not connected or user info missing"));
  }

  markMessageAsRead(conversationId: string, messageId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit("markMessageRead", {
        conversationId,
        messageId,
      });
    }
  }

  // Mark all messages in a conversation as read
  markConversationAsRead(conversationId: string) {
    if (this.socket && this.socket.connected) {
      console.log(`✓ [Socket] Marking conversation as read: ${conversationId}`);
      this.socket.emit("markConversationAsRead", { conversationId });
    }
  }

  // Create a new conversation
  createConversation(patientId: string, doctorId: string): Promise<any> {
    if (this.socket && this.socket.connected) {
      return new Promise<any>((resolve, reject) => {
        console.log(`➕ [Socket] Creating conversation: patient=${patientId}, doctor=${doctorId}`);

        this.socket?.emit(
          "createConversation",
          { patientId, doctorId },
          (response: { success: boolean; conversation?: any; error?: string }) => {
            if (response.success && response.conversation) {
              console.log("✅ [Socket] Conversation created:", response.conversation._id);
              resolve(response.conversation);
            } else {
              console.error("❌ [Socket] Failed to create conversation:", response.error);
              reject(new Error(response.error || "Failed to create conversation"));
            }
          }
        );
      });
    }
    return Promise.reject(new Error("Socket not connected"));
  }

  // Typing indicator
  sendTypingStatus(conversationId: string, isTyping: boolean) {
    if (this.socket && this.socket.connected) {
      this.socket.emit("typing", {
        conversationId,
        isTyping,
      });
    }
  }

  // Upload image via socket
  uploadImage(
    conversationId: string,
    imageData: string,
    fileName: string,
    fileType: string
  ): Promise<{ success: boolean; url?: string; public_id?: string; error?: string }> {
    if (this.socket && this.socket.connected) {
      return new Promise<{ success: boolean; url?: string; public_id?: string; error?: string }>((resolve) => {
        console.log(`📤 [Socket] Uploading image: ${fileName}`);

        this.socket?.emit(
          "uploadImage",
          {
            conversationId,
            image: imageData,
            fileName,
            fileType,
          },
          (response: { success: boolean; url?: string; public_id?: string; error?: string }) => {
            if (response.success) {
              console.log("✅ [Socket] Image uploaded:", response.url);
            } else {
              console.error("❌ [Socket] Image upload failed:", response.error);
            }
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
const realtimeChatService = new RealtimeChatService();
export default realtimeChatService;
