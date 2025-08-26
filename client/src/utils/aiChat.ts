import { sendRequest } from "./api";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  imageUrl?: string; // Add optional image URL field
  actionButtons?: string[]; // Add optional action buttons
}

export interface DoctorSuggestion {
  fullName: string;
  specialty: string;
  keywords: string[];
}

export interface AiResponse {
  message: string;
  suggestedDoctor: DoctorSuggestion | null;
  timestamp: Date;
}

export const aiChatAPI = {
  // Get AI advice for patients
  async getDentalAdvice(message: string, chatHistory: ChatMessage[] = [], imageData?: string): Promise<AiResponse> {
    try {
      const response = await sendRequest<AiResponse>({
        method: "POST",
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/chat/dental-advice`,
        body: {
          message,
          chatHistory: chatHistory.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          imageData,
        },
      });
      return response;
    } catch (error) {
      console.error("AI Chat API Error:", error);
      return {
        message: "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.",
        suggestedDoctor: null,
        timestamp: new Date(),
      };
    }
  },

  // Process image with chat context
  async processImageWithChat(message: string, imageData: string, chatHistory: ChatMessage[] = []): Promise<AiResponse> {
    try {
      const response = await sendRequest<AiResponse>({
        method: "POST",
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/chat/image-chat`,
        body: {
          message,
          imageData,
          chatHistory: chatHistory.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        },
      });
      return response;
    } catch (error) {
      console.error("Image Chat API Error:", error);
      return {
        message: "Xin lỗi, tôi không thể phân tích hình ảnh ngay lúc này. Vui lòng thử lại sau.",
        suggestedDoctor: null,
        timestamp: new Date(),
      };
    }
  },

  // Get suggested questions
  async getSuggestedQuestions(): Promise<string[]> {
    try {
      const response = await sendRequest<{ questions: string[] }>({
        method: "GET",
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/chat/suggested-questions`,
      });
      return response.questions;
    } catch (error) {
      console.error("Suggested Questions API Error:", error);
      return [];
    }
  },

  // Get quick suggestions for symptoms
  async getQuickSuggestions(symptom: string): Promise<string[]> {
    try {
      const response = await sendRequest<string[]>({
        method: "GET",
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/ai-chat/suggestions/${symptom}`,
      });
      return response;
    } catch (error) {
      console.error("Quick Suggestions API Error:", error);
      return [];
    }
  },

  // Analyze urgency level
  async analyzeUrgency(message: string): Promise<"high" | "medium" | "low"> {
    try {
      const response = await sendRequest<{ urgency: "high" | "medium" | "low" }>({
        method: "POST",
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/ai-chat/urgency`,
        body: { message },
      });
      return response.urgency;
    } catch (error) {
      console.error("Urgency Analysis API Error:", error);
      return "low";
    }
  },

  // For doctors - analyze patient chat history
  async analyzeForDoctor(chatHistory: ChatMessage[], patientInfo: any) {
    try {
      const response = await sendRequest({
        method: "POST",
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/ai-chat/analyze`,
        body: {
          chatHistory,
          patientInfo,
        },
      });
      return response;
    } catch (error) {
      console.error("Doctor Analysis API Error:", error);
      return null;
    }
  },
};
