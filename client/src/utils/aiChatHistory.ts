// AI Chat History API service
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";

export interface AiChatSession {
  _id?: string;
  userId: string;
  sessionId: string;
  status?: string;
  symptoms?: string;
  urgencyLevel?: string;
  suggestedDoctorId?: string;
  finalAction?: string;
  messageCount?: number;
  summary?: string;
  hasImageAnalysis?: boolean;
  imageUrls?: string[];
  analysisResults?: any;
  patientSatisfaction?: number;
  followUpNeeded?: boolean;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AiChatMessage {
  _id?: string;
  sessionId: string;
  userId: string;
  role: string; // 'user' | 'assistant'
  content: string;
  messageType?: string;
  imageUrl?: string;
  analysisData?: any;
  actionButtons?: string[];
  urgencyLevel?: string;
  suggestedDoctor?: any;
  isQuickSuggestion?: boolean;
  quickSuggestionType?: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatStats {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  totalMessages: number;
  urgentSessions: number;
  sessionsWithImages: number;
}

class AiChatHistoryService {
  // Session methods
  async getSession(sessionId: string): Promise<AiChatSession> {
    const response = await fetch(`${API_BASE_URL}/api/v1/ai-chat-history/sessions/${sessionId}`);

    if (!response.ok) {
      throw new Error(`Failed to get session: ${response.statusText}`);
    }

    return await response.json();
  }

  async getUserSessions(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    sessions: AiChatSession[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/ai-chat-history/users/${userId}/sessions?page=${page}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`Failed to get user sessions: ${response.statusText}`);
    }

    return await response.json();
  }

  async updateSession(sessionId: string, updateData: Partial<AiChatSession>): Promise<AiChatSession> {
    const response = await fetch(`${API_BASE_URL}/api/v1/ai-chat-history/sessions/${sessionId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update session: ${response.statusText}`);
    }

    return await response.json();
  }

  // Message methods
  async addMessage(messageData: Omit<AiChatMessage, "_id" | "createdAt" | "updatedAt">): Promise<AiChatMessage> {
    const response = await fetch(`${API_BASE_URL}/api/v1/ai-chat-history/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messageData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", errorText);
      throw new Error(`Failed to add message: ${response.statusText}`);
    }

    return await response.json();
  }

  async getSessionMessages(sessionId: string, page: number = 1, limit: number = 50): Promise<AiChatMessage[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/ai-chat-history/sessions/${sessionId}/messages?page=${page}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`Failed to get session messages: ${response.statusText}`);
    }

    return await response.json();
  }

  // Utility methods
  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  extractSymptoms(messages: AiChatMessage[]): string {
    const userMessages = messages.filter((msg) => msg.role === "user");
    return userMessages
      .map((msg) => msg.content)
      .join("; ")
      .substring(0, 500);
  }

  detectUrgency(messages: AiChatMessage[]): string {
    const urgentKeywords = ["khẩn cấp", "cấp cứu", "đau dữ dội", "chảy máu", "sưng to"];
    const content = messages.map((msg) => msg.content.toLowerCase()).join(" ");

    for (const keyword of urgentKeywords) {
      if (content.includes(keyword)) {
        return "high";
      }
    }

    return "low";
  }

  extractTags(messages: AiChatMessage[]): string[] {
    const tags: string[] = [];
    const content = messages.map((msg) => msg.content.toLowerCase()).join(" ");

    const tagMap = {
      "đau răng": "dental_pain",
      "sâu răng": "cavity",
      "chảy máu": "bleeding",
      "viêm nướu": "gingivitis",
      "khẩn cấp": "emergency",
      "niềng răng": "orthodontic",
      "răng khôn": "wisdom_tooth",
      "tẩy trắng": "whitening",
      "cấy ghép": "implant",
      "nhổ răng": "extraction",
    };

    for (const [keyword, tag] of Object.entries(tagMap)) {
      if (content.includes(keyword)) {
        tags.push(tag);
      }
    }

    return [...new Set(tags)]; // Remove duplicates
  }
}

export const aiChatHistoryService = new AiChatHistoryService();
