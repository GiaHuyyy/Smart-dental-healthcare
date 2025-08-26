import { sendRequest } from "./api";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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
  async getDentalAdvice(message: string, chatHistory: ChatMessage[] = []): Promise<AiResponse> {
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
