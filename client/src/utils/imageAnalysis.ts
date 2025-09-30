import { sendRequest, sendRequestFile } from "./api";

export interface ImageAnalysisResult {
  message: string;
  analysisResult: any;
  // Legacy / convenience fields used across UI
  analysis?: string;
  urgencyLevel?: "high" | "medium" | "low";
  imageUrl?: string;
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
  async uploadAndAnalyze(file: File, token: string): Promise<ImageAnalysisResponse> {
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await sendRequestFile<ImageAnalysisResponse>({
        method: "POST",
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/image-analysis/upload`,
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Kiểm tra response từ server
      if (!response.success && response.error) {
        // Xử lý các lỗi cụ thể
        if (response.error.includes("Cloudinary") || response.error.includes("cấu hình")) {
          return {
            success: false,
            error: "Dịch vụ lưu trữ ảnh chưa được cấu hình. Vui lòng liên hệ quản trị viên để được hỗ trợ.",
          };
        } else if (response.error.includes("kết nối") || response.error.includes("mạng")) {
          return {
            success: false,
            error: "Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet và thử lại.",
          };
        } else if (response.error.includes("file")) {
          return {
            success: false,
            error: "Lỗi xử lý file ảnh. Vui lòng thử lại với ảnh khác hoặc kiểm tra định dạng file.",
          };
        }
      }

      return response;
    } catch (error) {
      console.error("Image analysis API error:", error);

      // Xử lý lỗi network
      if (error instanceof TypeError && error.message.includes("fetch")) {
        return {
          success: false,
          error: "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng và thử lại.",
        };
      }

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
