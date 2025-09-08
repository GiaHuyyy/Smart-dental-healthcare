import { ChatMessage } from "./aiChat";

const CHAT_STORAGE_KEY = "smart_dental_ai_chat";
const CHAT_EXPIRY_HOURS = 24;

interface StoredChatData {
  messages: ChatMessage[];
  sessionId: string;
  timestamp: number;
  expiresAt: number;
  version: string;
}

export const chatStorage = {
  // Lưu chat history
  saveChat(messages: ChatMessage[]): void {
    try {
      // Chỉ lưu nếu có tin nhắn của user (bỏ qua tin nhắn chào mừng)
      const userMessages = messages.filter((msg) => msg.role === "user");
      if (userMessages.length === 0) return;

      const now = Date.now();
      const expiresAt = now + CHAT_EXPIRY_HOURS * 60 * 60 * 1000;

      const chatData: StoredChatData = {
        messages: messages.map((msg) => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp,
        })) as any,
        sessionId: this.generateSessionId(),
        timestamp: now,
        expiresAt,
        version: "2.0",
      };

      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatData));
      console.log(`💾 Saved ${messages.length} messages (expires in ${CHAT_EXPIRY_HOURS}h)`);
    } catch (error) {
      console.warn("Failed to save chat history:", error);
    }
  },

  // Lấy chat history
  loadChat(): ChatMessage[] {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      if (!stored) {
        console.log("📭 No chat history found");
        return [];
      }

      const chatData: StoredChatData = JSON.parse(stored);

      // Kiểm tra version
      if (chatData.version !== "2.0") {
        console.log("🔄 Chat history version mismatch, clearing");
        this.clearChat();
        return [];
      }

      // Kiểm tra hết hạn
      if (Date.now() > chatData.expiresAt) {
        console.log("⏰ Chat history expired, clearing");
        this.clearChat();
        return [];
      }

      // Convert timestamp strings back to Date objects
      const messages = chatData.messages.map((msg) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));

      console.log(`📂 Loaded ${messages.length} messages from storage`);
      return messages;
    } catch (error) {
      console.warn("Failed to load chat history:", error);
      this.clearChat();
      return [];
    }
  },

  // Xóa chat history
  clearChat(): void {
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
      console.log("🗑️ Chat history cleared");
    } catch (error) {
      console.warn("Failed to clear chat history:", error);
    }
  },

  // Kiểm tra còn hạn không
  isExpired(): boolean {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      if (!stored) return true;

      const chatData: StoredChatData = JSON.parse(stored);
      return Date.now() > chatData.expiresAt;
    } catch (error) {
      return true;
    }
  },

  // Lấy thời gian còn lại (phút)
  getTimeRemaining(): number {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      if (!stored) return 0;

      const chatData: StoredChatData = JSON.parse(stored);
      const remaining = chatData.expiresAt - Date.now();
      return Math.max(0, Math.floor(remaining / (60 * 1000)));
    } catch (error) {
      return 0;
    }
  },

  // Tạo session ID duy nhất
  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // Lấy thông tin session
  getSessionInfo(): { sessionId: string; messageCount: number; timeRemaining: number } | null {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      if (!stored) return null;

      const chatData: StoredChatData = JSON.parse(stored);

      return {
        sessionId: chatData.sessionId,
        messageCount: chatData.messages.length,
        timeRemaining: this.getTimeRemaining(),
      };
    } catch (error) {
      return null;
    }
  },

  // Auto cleanup expired chats
  autoCleanup(): void {
    if (this.isExpired()) {
      this.clearChat();
    }
  },
};

// Auto cleanup khi load module
if (typeof window !== "undefined") {
  chatStorage.autoCleanup();
}
