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

const STORAGE_KEY = 'smart-dental-mobile-chat-state-v1';

export async function loadChatState(): Promise<StoredChatState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
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

export async function persistChatState(state: StoredChatState): Promise<void> {
  try {
    const payload = JSON.stringify({
      ...state,
      messages: state.messages.slice(-40),
      lastUpdated: Date.now(),
    });
    await AsyncStorage.setItem(STORAGE_KEY, payload);
  } catch (error) {
    console.warn('Failed to persist chat state', error);
  }
}

export async function clearChatState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear chat state', error);
  }
}
