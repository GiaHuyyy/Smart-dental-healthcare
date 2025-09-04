import { AiResponse, ChatMessage, DoctorSuggestion } from "@/types/chat";
import { sendRequest } from "./api";

export const aiChatAPI = {
  // Get AI advice for patients
  async getDentalAdvice(
    message: string,
    chatHistory: ChatMessage[] = [],
    sessionId?: string,
    imageData?: string
  ): Promise<AiResponse> {
    try {
      const response = await sendRequest<AiResponse>({
        method: "POST",
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/ai-chat/advice`,
        body: {
          message,
          chatHistory: chatHistory.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          sessionId,
          imageData,
        },
      });
      return response;
    } catch (error) {
      console.error("AI Chat API Error:", error);
      return {
        message: "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.",
        suggestedDoctor: {
          _id: "1",
          fullName: "BS. Nguyễn Văn A",
          specialty: "Nha khoa tổng quát",
          keywords: ["nha khoa", "tổng quát"],
          email: "doctor@example.com",
          phone: "0123-456-789",
        },
        timestamp: new Date(),
        urgencyLevel: "low",
        confidence: 0,
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
        suggestedDoctor: {
          _id: "1",
          fullName: "BS. Nguyễn Văn A",
          specialty: "Nha khoa tổng quát",
          keywords: ["nha khoa", "tổng quát"],
          email: "doctor@example.com",
          phone: "0123-456-789",
        },
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

// Re-export types for backward compatibility
export type { AiResponse, ChatMessage, DoctorSuggestion };

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  imageUrl?: string;
  actionButtons?: string[];
  isAnalysisResult?: boolean;
  analysisData?: any;
  isUrgent?: boolean;
  messageType?: "normal" | "urgent" | "analysis" | "suggestion";
}
