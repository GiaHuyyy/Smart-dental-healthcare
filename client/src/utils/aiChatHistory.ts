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
  async createSession(sessionData: Omit<AiChatSession, "_id" | "createdAt" | "updatedAt">): Promise<AiChatSession> {
    const response = await fetch(`${API_BASE_URL}/api/v1/ai-chat-history/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sessionData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }

    return await response.json();
  }

  async getSession(sessionId: string): Promise<AiChatSession> {
    const response = await fetch(`${API_BASE_URL}/api/v1/ai-chat-history/sessions/${sessionId}`);

    if (!response.ok) {
      throw new Error(`Failed to get session: ${response.statusText}`);
    }

    return await response.json();
  }

  async getCurrentActiveSession(userId: string): Promise<AiChatSession | null> {
    const response = await fetch(`${API_BASE_URL}/api/v1/ai-chat-history/sessions/active/${userId}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null; // No active session found
      }
      throw new Error(`Failed to get current active session: ${response.statusText}`);
    }

    // Check if response has content
    const text = await response.text();
    if (!text) {
      return null; // Empty response means no active session
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      console.error("Failed to parse session response:", error);
      return null;
    }
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

  async initializeUserSession(userId: string): Promise<AiChatSession> {
    const response = await fetch(`${API_BASE_URL}/api/v1/ai-chat-history/sessions/initialize/${userId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to initialize user session: ${response.statusText}`);
    }

    return await response.json();
  }

  // Message methods
  async addMessage(messageData: Omit<AiChatMessage, "_id" | "createdAt" | "updatedAt">): Promise<AiChatMessage> {
    const url = `${API_BASE_URL}/api/v1/ai-chat-history/messages`;
    console.log("API_BASE_URL:", API_BASE_URL);
    console.log("Full URL:", url);
    console.log("Message data being sent:", messageData);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messageData),
    });

    console.log("Response status:", response.status);
    console.log("Response ok:", response.ok);

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

  async getSessionWithMessages(sessionId: string): Promise<{
    session: AiChatSession;
    messages: AiChatMessage[];
  }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/ai-chat-history/sessions/${sessionId}/full`);

    if (!response.ok) {
      throw new Error(`Failed to get session with messages: ${response.statusText}`);
    }

    return await response.json();
  }

  // Analytics methods
  async getUserStats(userId: string): Promise<ChatStats> {
    const response = await fetch(`${API_BASE_URL}/api/v1/ai-chat-history/users/${userId}/stats`);

    if (!response.ok) {
      throw new Error(`Failed to get user stats: ${response.statusText}`);
    }

    return await response.json();
  }

  async searchSessions(
    userId: string,
    searchQuery?: string,
    filters?: {
      urgencyLevel?: string;
      hasImageAnalysis?: boolean;
      tags?: string[];
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<AiChatSession[]> {
    const params = new URLSearchParams();

    if (searchQuery) params.append("q", searchQuery);
    if (filters?.urgencyLevel) params.append("urgency", filters.urgencyLevel);
    if (filters?.hasImageAnalysis !== undefined) params.append("hasImage", filters.hasImageAnalysis.toString());
    if (filters?.tags && filters.tags.length > 0) params.append("tags", filters.tags.join(","));
    if (filters?.dateFrom) params.append("dateFrom", filters.dateFrom.toISOString());
    if (filters?.dateTo) params.append("dateTo", filters.dateTo.toISOString());

    const response = await fetch(`${API_BASE_URL}/api/v1/ai-chat-history/users/${userId}/search?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to search sessions: ${response.statusText}`);
    }

    return await response.json();
  }

  async generateSessionSummary(sessionId: string): Promise<{ summary: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/ai-chat-history/sessions/${sessionId}/summary`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Failed to generate summary: ${response.statusText}`);
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
