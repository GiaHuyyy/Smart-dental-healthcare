import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { aiChatHistoryService, AiChatSession, AiChatMessage, ChatStats } from "@/utils/aiChatHistory";

interface UseAiChatHistoryReturn {
  // Session management
  currentSession: AiChatSession | null;
  setCurrentSession: (session: AiChatSession | null) => void;
  createSession: (symptoms?: string, urgencyLevel?: string) => Promise<AiChatSession>;
  updateSession: (sessionId: string, updateData: Partial<AiChatSession>) => Promise<void>;
  completeSession: (finalAction: string, summary?: string) => Promise<void>;

  // Message management
  addMessage: (
    message: Omit<AiChatMessage, "_id" | "sessionId" | "userId" | "createdAt" | "updatedAt">
  ) => Promise<AiChatMessage>;
  getSessionMessages: (sessionId: string) => Promise<AiChatMessage[]>;

  // User sessions
  userSessions: AiChatSession[];
  loadUserSessions: (page?: number, limit?: number) => Promise<void>;
  searchSessions: (query: string, filters?: any) => Promise<AiChatSession[]>;

  // Analytics
  userStats: ChatStats | null;
  loadUserStats: () => Promise<void>;

  // State
  isLoading: boolean;
  error: string | null;
}

export const useAiChatHistory = (): UseAiChatHistoryReturn => {
  const { data: session } = useSession();
  const [currentSession, setCurrentSession] = useState<AiChatSession | null>(null);
  const [userSessions, setUserSessions] = useState<AiChatSession[]>([]);
  const [userStats, setUserStats] = useState<ChatStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentUserId = useCallback(() => {
    if (!session?.user) {
      console.log("No session user found");
      return null;
    }

    const user = session.user as any;
    const userId = user._id || user.id;
    console.log("getCurrentUserId - user object:", user);
    console.log("getCurrentUserId - extracted userId:", userId);
    return userId;
  }, [session]);

  // Create new chat session
  const createSession = useCallback(
    async (symptoms?: string, urgencyLevel: string = "low"): Promise<AiChatSession> => {
      const userId = getCurrentUserId();
      console.log("Creating session with userId:", userId);
      console.log("Session data:", session);

      if (!userId) {
        throw new Error("User not authenticated");
      }

      setIsLoading(true);
      setError(null);

      try {
        const sessionData = {
          userId,
          sessionId: aiChatHistoryService.generateSessionId(),
          symptoms: symptoms || "",
          urgencyLevel,
          status: "active",
          tags: symptoms
            ? aiChatHistoryService.extractTags([{ content: symptoms, role: "user" } as AiChatMessage])
            : [],
        };

        const newSession = await aiChatHistoryService.createSession(sessionData);
        setCurrentSession(newSession);
        return newSession;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to create session";
        setError(errorMessage);
        console.error("Error creating session:", err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getCurrentUserId, session]
  );

  // Update current session
  const updateSession = useCallback(
    async (sessionId: string, updateData: Partial<AiChatSession>): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const updatedSession = await aiChatHistoryService.updateSession(sessionId, updateData);
        if (currentSession?._id === sessionId) {
          setCurrentSession(updatedSession);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update session";
        setError(errorMessage);
        console.error("Error updating session:", err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [currentSession]
  );

  // Complete current session
  const completeSession = useCallback(
    async (finalAction: string, summary?: string): Promise<void> => {
      if (!currentSession) {
        throw new Error("No active session to complete");
      }

      try {
        await updateSession(currentSession._id!, {
          status: "completed",
          finalAction,
          summary:
            summary ||
            (await aiChatHistoryService.generateSessionSummary(currentSession._id!).then((res) => res.summary)),
        });
      } catch (err) {
        console.error("Error completing session:", err);
        throw err;
      }
    },
    [currentSession, updateSession]
  );

  // Add message to current session
  const addMessage = useCallback(
    async (
      messageData: Omit<AiChatMessage, "_id" | "sessionId" | "userId" | "createdAt" | "updatedAt">
    ): Promise<AiChatMessage> => {
      const userId = getCurrentUserId();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      if (!currentSession) {
        throw new Error("No active session");
      }

      setError(null);

      try {
        const message = await aiChatHistoryService.addMessage({
          ...messageData,
          sessionId: currentSession._id!,
          userId,
        });

        return message;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to add message";
        setError(errorMessage);
        console.error("Error adding message:", err);
        throw err;
      }
    },
    [getCurrentUserId, currentSession]
  );

  // Get messages for a session
  const getSessionMessages = useCallback(async (sessionId: string): Promise<AiChatMessage[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const messages = await aiChatHistoryService.getSessionMessages(sessionId);
      return messages;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load messages";
      setError(errorMessage);
      console.error("Error loading messages:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load user sessions
  const loadUserSessions = useCallback(
    async (page: number = 1, limit: number = 20): Promise<void> => {
      const userId = getCurrentUserId();
      if (!userId) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await aiChatHistoryService.getUserSessions(userId, page, limit);
        setUserSessions(result.sessions);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load sessions";
        setError(errorMessage);
        console.error("Error loading sessions:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [getCurrentUserId]
  );

  // Search sessions
  const searchSessions = useCallback(
    async (query: string, filters?: any): Promise<AiChatSession[]> => {
      const userId = getCurrentUserId();
      if (!userId) return [];

      setIsLoading(true);
      setError(null);

      try {
        const sessions = await aiChatHistoryService.searchSessions(userId, query, filters);
        return sessions;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to search sessions";
        setError(errorMessage);
        console.error("Error searching sessions:", err);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [getCurrentUserId]
  );

  // Load user stats
  const loadUserStats = useCallback(async (): Promise<void> => {
    const userId = getCurrentUserId();
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const stats = await aiChatHistoryService.getUserStats(userId);
      setUserStats(stats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load stats";
      setError(errorMessage);
      console.error("Error loading stats:", err);
    } finally {
      setIsLoading(false);
    }
  }, [getCurrentUserId]);

  // Auto-load user sessions on mount
  useEffect(() => {
    if (session?.user) {
      loadUserSessions();
      loadUserStats();
    }
  }, [session, loadUserSessions, loadUserStats]);

  return {
    // Session management
    currentSession,
    setCurrentSession,
    createSession,
    updateSession,
    completeSession,

    // Message management
    addMessage,
    getSessionMessages,

    // User sessions
    userSessions,
    loadUserSessions,
    searchSessions,

    // Analytics
    userStats,
    loadUserStats,

    // State
    isLoading,
    error,
  };
};
