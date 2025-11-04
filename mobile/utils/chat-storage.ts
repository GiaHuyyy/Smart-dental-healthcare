import AsyncStorage from '@react-native-async-storage/async-storage';

export type StoredChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  status?: string;
  quickActions?: string[];
  followUpQuestions?: string[];
  urgencyLevel?: 'low' | 'medium' | 'high';
  nextSteps?: string[];
  suggestedDoctor?: Record<string, unknown> | null;
  analysisData?: Record<string, unknown> | null;
  attachments?: Array<Record<string, unknown>> | null;
  metadata?: Record<string, unknown>;
};

export type StoredChatState = {
  sessionId: string | null;
  messages: StoredChatMessage[];
  lastUpdated: number;
};

const AI_CHAT_STORAGE_KEY = 'smart-dental-mobile-chat-state-ai-v1';

function getDoctorChatStorageKey(conversationId: string): string {
  return `smart-dental-mobile-doctor-chat-${conversationId}-v1`;
}

export async function loadChatState(chatType: 'ai' | 'doctor' = 'ai', conversationId?: string): Promise<StoredChatState | null> {
  try {
    const storageKey = chatType === 'ai' 
      ? AI_CHAT_STORAGE_KEY 
      : conversationId 
        ? getDoctorChatStorageKey(conversationId)
        : null;
    
    if (!storageKey) {
      return null;
    }
    
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredChatState;
    if (!Array.isArray(parsed.messages)) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('Failed to load chat state', error);
    return null;
  }
}

export async function persistChatState(state: StoredChatState, chatType: 'ai' | 'doctor' = 'ai', conversationId?: string): Promise<void> {
  try {
    const storageKey = chatType === 'ai' 
      ? AI_CHAT_STORAGE_KEY 
      : conversationId 
        ? getDoctorChatStorageKey(conversationId)
        : null;
    
    if (!storageKey) {
      console.warn('Cannot persist chat state: missing storage key');
      return;
    }
    
    const payload = JSON.stringify({
      ...state,
      messages: state.messages.slice(-40),
      lastUpdated: Date.now(),
    });
    await AsyncStorage.setItem(storageKey, payload);
  } catch (error) {
    console.warn('Failed to persist chat state', error);
  }
}

export async function clearChatState(chatType: 'ai' | 'doctor' = 'ai', conversationId?: string): Promise<void> {
  try {
    const storageKey = chatType === 'ai' 
      ? AI_CHAT_STORAGE_KEY 
      : conversationId 
        ? getDoctorChatStorageKey(conversationId)
        : null;
    
    if (!storageKey) {
      return;
    }
    
    await AsyncStorage.removeItem(storageKey);
  } catch (error) {
    console.warn('Failed to clear chat state', error);
  }
}
