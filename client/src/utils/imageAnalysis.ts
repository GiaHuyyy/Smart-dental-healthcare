import { sendRequestFile, sendRequest } from "./api";

export interface ImageAnalysisResult {
  message: string;
  analysisResult: any;
  richContent?: {
    title?: string;
    analysis?: string;
    highlights?: string[];
    recommendations?: string[];
    sections?: Array<{ heading?: string; text?: string; bullets?: string[] }>;
  };
  options?: string[];
  suggestedDoctor?: {
    fullName: string;
    specialty: string;
    keywords: string[];
  };
}

export interface ImageAnalysisResponse {
  success: boolean;
  data?: ImageAnalysisResult;
  error?: string;
}

export const imageAnalysisAPI = {
  // Upload và phân tích ảnh
  async uploadAndAnalyze(file: File): Promise<ImageAnalysisResponse> {
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await sendRequestFile<ImageAnalysisResponse>({
        method: "POST",
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/image-analysis/upload`,
        body: formData,
      });

      return response;
    } catch (error) {
      console.error("Image analysis API error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi không xác định khi phân tích ảnh",
      };
    }
  },

  // Kiểm tra health của service
  async checkHealth(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await sendRequest<{ success: boolean; data?: any; error?: string }>({
        method: "GET",
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/image-analysis/health`,
      });

      return response;
    } catch (error) {
      console.error("Image analysis health check error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi khi kiểm tra trạng thái service",
      };
    }
  },
};
