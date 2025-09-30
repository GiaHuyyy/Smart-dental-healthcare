import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { aiChatHistoryService, AiChatSession, AiChatMessage } from "@/utils/aiChatHistory";

interface UseAiChatHistoryReturn {
  // Session management
  currentSession: AiChatSession | null;
  setCurrentSession: (session: AiChatSession | null) => void;
  updateSession: (sessionId: string, updateData: Partial<AiChatSession>) => Promise<void>;

  // Message management
  addMessage: (
    message: Omit<AiChatMessage, "_id" | "sessionId" | "userId" | "createdAt" | "updatedAt">
  ) => Promise<AiChatMessage>;
  getSessionMessages: (sessionId: string) => Promise<AiChatMessage[]>;

  // User sessions
  userSessions: AiChatSession[];
  loadUserSessions: (page?: number, limit?: number) => Promise<void>;

  // State
  isLoading: boolean;
  error: string | null;
}

export const useAiChatHistory = (): UseAiChatHistoryReturn => {
  const { data: session } = useSession();
  const [currentSession, setCurrentSession] = useState<AiChatSession | null>(null);
  const [userSessions, setUserSessions] = useState<AiChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentUserId = useCallback(() => {
    if (!session?.user) {
      return null;
    }

    const user = session.user as { _id?: string; id?: string };
    const userId = user._id || user.id;
    return userId;
  }, [session]);

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
  const getSessionMessages = useCallback(
    async (sessionId: string, page: number = 1, limit: number = 50): Promise<AiChatMessage[]> => {
      setIsLoading(true);
      setError(null);

      try {
        const messages = await aiChatHistoryService.getSessionMessages(sessionId, page, limit);
        return messages;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load messages";
        setError(errorMessage);
        console.error("Error loading messages:", err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

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

  // Auto-load user sessions on mount
  useEffect(() => {
    if (session?.user) {
      loadUserSessions();
    }
  }, [session, loadUserSessions]);

  return {
    // Session management
    currentSession,
    setCurrentSession,
    updateSession,

    // Message management
    addMessage,
    getSessionMessages,

    // User sessions
    userSessions,
    loadUserSessions,

    // State
    isLoading,
    error,
  };
};
