import { apiRequest, API_BASE_URL, formatApiError } from './api';

export type ChatHistoryItem = {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
};

export type SuggestedDoctor = {
  _id?: string;
  fullName?: string;
  specialty?: string;
  email?: string;
  phone?: string;
  keywords?: string[];
};

export type AiAssistantResponse = {
  message: string;
  suggestedDoctor?: SuggestedDoctor | null;
  timestamp?: string | Date;
  context?: {
    conversationType?: string;
    urgencyLevel?: 'low' | 'medium' | 'high';
    suggestedDoctors?: SuggestedDoctor[];
    symptoms?: string[];
  };
  quickActions?: string[];
  followUpQuestions?: string[];
  urgencyLevel?: 'low' | 'medium' | 'high';
  confidence?: number;
  nextSteps?: string[];
};

export type AiAdvicePayload = {
  message: string;
  chatHistory?: ChatHistoryItem[];
  sessionId?: string | null;
};

export type ImageAnalysisResult = {
  message?: string;
  analysis?: string;
  urgencyLevel?: 'low' | 'medium' | 'high';
  imageUrl?: string;
  confidence?: number;
  richContent?: {
    title?: string;
    analysis?: string;
    highlights?: string[];
    recommendations?: string[];
    sections?: Array<{ heading?: string; text?: string; bullets?: string[] }>;
  };
  options?: string[];
  suggestedDoctor?: SuggestedDoctor | null;
};

export type ImageAnalysisResponse = {
  success: boolean;
  data?: ImageAnalysisResult;
  error?: string;
};

export async function fetchAiAdvice(payload: AiAdvicePayload): Promise<AiAssistantResponse> {
  const response = await apiRequest<AiAssistantResponse>('/api/v1/ai-chat/advice', {
    method: 'POST',
    body: {
      message: payload.message,
      chatHistory: (payload.chatHistory ?? []).map((item) => ({
        role: item.role,
        content: item.content,
      })),
      sessionId: payload.sessionId,
    },
  });
  return response.data;
}

export async function fetchSuggestedQuestions(): Promise<string[]> {
  try {
    const response = await apiRequest<{ questions: string[] }>('/api/v1/chat/suggested-questions');
    return response.data.questions ?? [];
  } catch (error) {
    console.warn('Failed to load suggested questions', error);
    return [];
  }
}

export async function fetchQuickSuggestions(symptom: string): Promise<string[]> {
  try {
    const response = await apiRequest<string[]>(`/api/v1/ai-chat/suggestions/${encodeURIComponent(symptom)}`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.warn('Failed to load quick suggestions', error);
    return [];
  }
}

export async function analyzeUrgency(message: string): Promise<'low' | 'medium' | 'high'> {
  try {
    const response = await apiRequest<{ urgency: 'low' | 'medium' | 'high' }>(
      '/api/v1/ai-chat/urgency',
      {
        method: 'POST',
        body: { message },
      },
    );
    return response.data.urgency ?? 'low';
  } catch (error) {
    console.warn('Failed to analyze urgency', error);
    return 'low';
  }
}

export async function startChatSession(patientId?: string): Promise<string | null> {
  try {
    const response = await apiRequest<{ sessionId: string }>(
      '/api/v1/ai-chat/session/start',
      {
        method: 'POST',
        body: patientId ? { patientId } : {},
      },
    );
    return response.data.sessionId ?? null;
  } catch (error) {
    console.warn('Failed to start chat session', error);
    return null;
  }
}

export async function uploadAnalysisImage(
  params: {
    uri: string;
    mimeType?: string | null;
    fileName?: string;
  },
  token: string,
): Promise<ImageAnalysisResponse> {
  const formData = new FormData();
  formData.append('image', {
    uri: params.uri,
    name: params.fileName ?? `chat-analysis-${Date.now()}.jpg`,
    type: params.mimeType ?? 'image/jpeg',
  } as unknown as any);

  const target = `${API_BASE_URL}/api/v1/image-analysis/upload`;

  try {
    const response = await fetch(target, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    const payload = (await response.json()) as ImageAnalysisResponse;

    if (!response.ok || !payload.success) {
      const message = payload.error ?? formatApiError(new Error('Phân tích ảnh thất bại'));
      throw new Error(message);
    }

    return payload;
  } catch (error) {
    return {
      success: false,
      error: formatApiError(error, 'Không thể phân tích ảnh vào lúc này'),
    };
  }
}

export function formatUrgencyLabel(level?: 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'high':
      return 'Khẩn cấp';
    case 'medium':
      return 'Trung bình';
    case 'low':
    default:
      return 'Bình thường';
  }
}
