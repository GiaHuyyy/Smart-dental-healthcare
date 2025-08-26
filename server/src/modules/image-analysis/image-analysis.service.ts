import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';

export interface ImageAnalysisResult {
  message: string;
  analysisResult: any;
  richContent?: {
    title?: string;
    highlights?: string[];
    sections?: Array<{ heading?: string; text?: string; bullets?: string[] }>;
  };
  options?: string[];
  suggestedDoctor?: {
    fullName: string;
    specialty: string;
    keywords: string[];
  };
}

@Injectable()
export class ImageAnalysisService {
  private readonly logger = new Logger(ImageAnalysisService.name);
  private readonly chatbotServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.chatbotServiceUrl =
      this.configService.get<string>('CHATBOT_SERVICE_URL') ||
      'http://localhost:3001';
  }

  async analyzeImage(
    filePath: string,
    userId: string,
  ): Promise<ImageAnalysisResult> {
    try {
      this.logger.log(
        `Starting image analysis for user ${userId}, file: ${filePath}`,
      );

      if (!fs.existsSync(filePath)) {
        throw new BadRequestException('File không tồn tại');
      }

      // Tạo FormData để gửi ảnh đến chatbot service
      const fileBuffer = fs.readFileSync(filePath);
      const formData = new FormData();

      // Chuyển Buffer thành Blob để có thể append vào FormData
      const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
      formData.append('image', blob, 'dental_image.jpg');

      // Thêm thông tin session và user
      const sessionId = `analysis_${userId}_${Date.now()}`;
      formData.append('sessionId', sessionId);
      formData.append('userId', userId);

      // Gửi request đến chatbot service
      const response = await fetch(`${this.chatbotServiceUrl}/chatbot/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();

      if (!responseData?.success) {
        throw new Error(
          'Chatbot service trả về lỗi: ' +
            (responseData?.error || 'Unknown error'),
        );
      }

      const analysisData = responseData.data;

      // Get doctor suggestion based on analysis result
      const doctorSuggestion = await this.getSuggestedDoctor(
        analysisData.analysisResult,
      );

      // Transform response từ chatbot service
      const result: ImageAnalysisResult = {
        message: analysisData.message || 'Phân tích ảnh hoàn tất',
        analysisResult: analysisData.analysisResult,
        richContent: analysisData.richContent,
        options: analysisData.options || [
          'Giải thích thêm',
          'Đặt lịch khám',
          'Hướng dẫn tự chăm sóc',
        ],
        suggestedDoctor: doctorSuggestion || undefined,
      };

      this.logger.log(
        `Image analysis completed successfully for user ${userId}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Image analysis failed for user ${userId}: ${error.message}`,
      );
      throw new BadRequestException(`Phân tích ảnh thất bại: ${error.message}`);
    }
  }

  async checkChatbotServiceHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.chatbotServiceUrl}/chatbot/health`, {
        method: 'GET',
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data?.success === true;
    } catch (error) {
      this.logger.warn(`Chatbot service health check failed: ${error.message}`);
      return false;
    }
  }

  private async getSuggestedDoctor(
    analysisResult: any,
  ): Promise<{
    fullName: string;
    specialty: string;
    keywords: string[];
  } | null> {
    try {
      // Call AI chat service để lấy doctor suggestion dựa trên analysis result
      const suggestionPrompt = `Dựa trên kết quả phân tích ảnh răng sau:
- Chẩn đoán: ${analysisResult?.diagnosis || 'Không rõ'}
- Mức độ: ${analysisResult?.severity || 'Không rõ'}
- Khuyến nghị: ${analysisResult?.recommendations?.join(', ') || 'Không có'}

Gợi ý bác sĩ phù hợp nhất từ danh sách.`;

      const response = await fetch(
        `http://localhost:8081/api/v1/ai-chat/suggestions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: suggestionPrompt,
            chatHistory: [],
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        return data?.suggestedDoctor || null;
      }
    } catch (error) {
      this.logger.warn(`Failed to get doctor suggestion: ${error.message}`);
    }

    return null;
  }
}
