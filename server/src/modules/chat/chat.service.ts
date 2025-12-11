import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  message: string;
  success: boolean;
  data?: any;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(private readonly configService: ConfigService) {
    this.genAI = new GoogleGenerativeAI(
      this.configService.get<string>('GEMINI_API_KEY') ||
        'your-gemini-api-key-here',
    );
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  async getDentalAdvice(
    message: string,
    chatHistory: ChatMessage[] = [],
    imageData?: string,
  ): Promise<ChatResponse> {
    try {
      this.logger.log(
        `Processing chat request: ${message.substring(0, 100)}...`,
      );

      const prompt = this.createDentalChatPrompt(message, chatHistory);

      let result;
      if (imageData) {
        // If image is provided, include it in the analysis
        result = await this.model.generateContent([
          prompt,
          {
            inlineData: {
              data: imageData,
              mimeType: 'image/jpeg',
            },
          },
        ]);
      } else {
        // Text-only chat
        result = await this.model.generateContent([prompt]);
      }

      const response = await result.response;
      const responseText = response.text();

      return {
        message: responseText,
        success: true,
        data: {
          timestamp: new Date(),
          hasImage: !!imageData,
        },
      };
    } catch (error) {
      this.logger.error(`Chat request failed: ${error.message}`);
      return {
        message:
          'Xin lỗi, tôi gặp sự cố khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.',
        success: false,
      };
    }
  }

  private createDentalChatPrompt(
    message: string,
    chatHistory: ChatMessage[],
  ): string {
    const historyContext = chatHistory
      .slice(-5) // Lấy 5 tin nhắn gần nhất
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    return `Bạn là một trợ lý AI chuyên về nha khoa với 20 năm kinh nghiệm. Hãy trả lời câu hỏi của người dùng bằng tiếng Việt một cách chuyên nghiệp, thân thiện và dễ hiểu.

Nguyên tắc trả lời:
1. Luôn nhấn mạnh tầm quan trọng của việc khám bác sĩ trực tiếp
2. Cung cấp thông tin giáo dục và lời khuyên chung
3. Không đưa ra chẩn đoán y khoa cụ thể
4. Khuyến khích vệ sinh răng miệng tốt
5. Trả lời ngắn gọn, rõ ràng (tối đa 200 từ)

Lịch sử hội thoại gần đây:
${historyContext}

Câu hỏi hiện tại: ${message}

Trả lời:`;
  }

  async processImageWithChat(
    message: string,
    imageData: string,
    chatHistory: ChatMessage[] = [],
  ): Promise<ChatResponse> {
    try {
      this.logger.log('Processing image with chat context');

      const prompt = `Bạn là một bác sĩ nha khoa AI chuyên gia. Hãy phân tích hình ảnh này và trả lời câu hỏi của bệnh nhân bằng tiếng Việt.

Câu hỏi của bệnh nhân: ${message}

Lịch sử hội thoại:
${chatHistory
  .slice(-3)
  .map((msg) => `${msg.role}: ${msg.content}`)
  .join('\n')}

Hãy:
1. Phân tích hình ảnh một cách chuyên nghiệp
2. Trả lời câu hỏi cụ thể của bệnh nhân
3. Đưa ra lời khuyên phù hợp
4. Nhấn mạnh tầm quan trọng của việc khám bác sĩ trực tiếp

Trả lời (tối đa 300 từ):`;

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageData,
            mimeType: 'image/jpeg',
          },
        },
      ]);

      const response = await result.response;
      const responseText = response.text();

      return {
        message: responseText,
        success: true,
        data: {
          timestamp: new Date(),
          hasImage: true,
          type: 'image_analysis_chat',
        },
      };
    } catch (error) {
      this.logger.error(`Image chat processing failed: ${error.message}`);
      return {
        message:
          'Xin lỗi, tôi không thể phân tích hình ảnh ngay lúc này. Vui lòng thử lại sau hoặc mô tả triệu chứng bằng lời.',
        success: false,
      };
    }
  }

  async getSuggestedQuestions(): Promise<string[]> {
    return [
      'Làm thế nào để chăm sóc răng miệng đúng cách?',
      'Tại sao răng tôi hay ê buốt?',
      'Khi nào nên đi khám nha khoa?',
      'Làm sao để ngăn ngừa sâu răng?',
      'Niềng răng có đau không?',
      'Có nên nhổ răng khôn không?',
      'Tẩy trắng răng có an toàn không?',
      'Làm gì khi bị đau răng đột ngột?',
    ];
  }

  async checkServiceHealth(): Promise<boolean> {
    try {
      const testResult = await this.model.generateContent(['Test connection']);
      return !!testResult;
    } catch (error) {
      this.logger.warn(`Chat service health check failed: ${error.message}`);
      return false;
    }
  }
}
