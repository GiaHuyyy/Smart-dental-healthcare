// Service để quản lý đánh giá AI từ bác sĩ

export interface AIFeedbackData {
  _id?: string;
  doctorId: string;
  appointmentId: string;
  imageUrl?: string;
  originalAIAnalysis?: {
    symptoms?: string;
    analysisResult?: {
      diagnosis?: string;
      analysis?: string;
      richContent?: {
        analysis?: string;
        sections?: Array<{ heading?: string; text?: string; bullets?: string[] }>;
        recommendations?: string[];
      };
    };
    urgency?: string;
  };
  accuracyRating: number;
  diagnosisAccuracy: "correct" | "partially_correct" | "incorrect";
  actualDiagnosis?: string;
  correctPoints?: string[];
  incorrectPoints?: string[];
  missedPoints?: string[];
  recommendationsQuality?: "appropriate" | "partially_appropriate" | "inappropriate";
  additionalRecommendations?: string[];
  detailedComment?: string;
  improvementSuggestions?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAIFeedbackDto {
  appointmentId: string;
  imageUrl?: string;
  originalAIAnalysis?: AIFeedbackData["originalAIAnalysis"];
  accuracyRating: number;
  diagnosisAccuracy: "correct" | "partially_correct" | "incorrect";
  actualDiagnosis?: string;
  correctPoints?: string[];
  incorrectPoints?: string[];
  missedPoints?: string[];
  recommendationsQuality?: "appropriate" | "partially_appropriate" | "inappropriate";
  additionalRecommendations?: string[];
  detailedComment?: string;
  improvementSuggestions?: string;
  tags?: string[];
}

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

class AIFeedbackService {
  /**
   * Tạo đánh giá mới
   */
  async createFeedback(
    data: CreateAIFeedbackDto,
    accessToken?: string
  ): Promise<{ success: boolean; data?: AIFeedbackData; error?: string }> {
    try {
      const response = await fetch(`${API_URL}/api/v1/ai-feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create feedback");
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      console.error("Error creating AI feedback:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  /**
   * Cập nhật đánh giá
   */
  async updateFeedback(
    feedbackId: string,
    data: Partial<CreateAIFeedbackDto>,
    accessToken?: string
  ): Promise<{ success: boolean; data?: AIFeedbackData; error?: string }> {
    try {
      const response = await fetch(`${API_URL}/api/v1/ai-feedback/${feedbackId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update feedback");
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      console.error("Error updating AI feedback:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  /**
   * Kiểm tra xem appointment đã có feedback chưa (không cần auth)
   */
  async checkFeedbackExists(appointmentId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/api/v1/ai-feedback/appointment/${appointmentId}/exists`);
      if (!response.ok) return false;
      const result = await response.json();
      return result.exists === true;
    } catch {
      return false;
    }
  }

  /**
   * Lấy đánh giá theo appointmentId
   */
  async getFeedbackByAppointment(
    appointmentId: string,
    accessToken?: string
  ): Promise<{ success: boolean; data?: AIFeedbackData | null; error?: string }> {
    try {
      const response = await fetch(`${API_URL}/api/v1/ai-feedback/appointment/${appointmentId}`, {
        headers: {
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { success: true, data: null };
        }
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch feedback");
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      console.error("Error fetching AI feedback:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  /**
   * Lấy danh sách đánh giá
   */
  async getAllFeedbacks(
    params: {
      doctorId?: string;
      diagnosisAccuracy?: string;
      usedForTraining?: string;
      trainingPriority?: string;
      page?: number;
      limit?: number;
    },
    accessToken?: string
  ): Promise<{
    success: boolean;
    data?: {
      feedbacks: AIFeedbackData[];
      total: number;
      page: number;
      totalPages: number;
    };
    error?: string;
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (params.doctorId) queryParams.append("doctorId", params.doctorId);
      if (params.diagnosisAccuracy) queryParams.append("diagnosisAccuracy", params.diagnosisAccuracy);
      if (params.usedForTraining) queryParams.append("usedForTraining", params.usedForTraining);
      if (params.trainingPriority) queryParams.append("trainingPriority", params.trainingPriority);
      if (params.page) queryParams.append("page", params.page.toString());
      if (params.limit) queryParams.append("limit", params.limit.toString());

      const response = await fetch(`${API_URL}/api/v1/ai-feedback?${queryParams.toString()}`, {
        headers: {
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch feedbacks");
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      console.error("Error fetching AI feedbacks:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }
}

const aiFeedbackService = new AIFeedbackService();
export default aiFeedbackService;
