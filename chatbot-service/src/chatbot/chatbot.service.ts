import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as FormData from 'form-data';
import * as fs from 'fs';
import { firstValueFrom } from 'rxjs';

export interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  attachments?: string[];
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  currentStep: string;
  patientInfo: {
    name?: string;
    age?: number;
    symptoms?: string[];
    painLevel?: number;
    lastDentalVisit?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface BotResponse {
  message: string;
  options?: string[];
  nextStep?: string;
  requiresImage?: boolean;
  analysisResult?: any;
}

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly aiAnalysisUrl: string;
  private readonly geminiApiKey: string;
  private readonly geminiApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  private sessions: Map<string, ChatSession> = new Map();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.aiAnalysisUrl = this.configService.get<string>('AI_ANALYSIS_URL') || 'http://localhost:3010/analyze';
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY') || 'AIzaSyDDcQCeNgxl98wPbG6-1650PFLXs1B1Yd0';
  }

  async processMessage(sessionId: string, userId: string, message: string, attachments?: string[]): Promise<BotResponse> {
    // Tạo hoặc lấy session
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = this.createNewSession(sessionId, userId);
      this.sessions.set(sessionId, session);
    }

    // Thêm message của user
    const userMessage: ChatMessage = {
      id: this.generateId(),
      type: 'user',
      content: message,
      timestamp: new Date(),
      attachments
    };
    session.messages.push(userMessage);

    // Xử lý message và tạo response
    const response = await this.generateBotResponse(session, message, attachments);
    
    // Thêm response của bot
    const botMessage: ChatMessage = {
      id: this.generateId(),
      type: 'bot',
      content: response.message,
      timestamp: new Date()
    };
    session.messages.push(botMessage);

    // Cập nhật session
    session.currentStep = response.nextStep || session.currentStep;
    session.updatedAt = new Date();

    return response;
  }

  private createNewSession(sessionId: string, userId: string): ChatSession {
    return {
      id: sessionId,
      userId,
      messages: [],
      currentStep: 'welcome',
      patientInfo: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private async generateBotResponse(session: ChatSession, message: string, attachments?: string[]): Promise<BotResponse> {
    const lowerMessage = message.toLowerCase();

    // Xử lý upload ảnh
    if (attachments && attachments.length > 0) {
      return await this.handleImageUpload(session, attachments[0]);
    }

    // Xử lý theo step hiện tại
    switch (session.currentStep) {
      case 'welcome':
        return this.handleWelcomeStep(session, lowerMessage);
      
      case 'collecting_name':
        return this.handleNameCollection(session, message);
      
      case 'collecting_age':
        return this.handleAgeCollection(session, message);
      
      case 'collecting_symptoms':
        return this.handleSymptomsCollection(session, message);
      
      case 'collecting_pain_level':
        return this.handlePainLevelCollection(session, message);
      
      case 'collecting_last_visit':
        return this.handleLastVisitCollection(session, message);
      
      case 'analysis_complete':
        return this.handleAnalysisComplete(session, lowerMessage);
      
      default:
        return this.handleGeneralConversation(session, lowerMessage);
    }
  }

  private handleWelcomeStep(session: ChatSession, message: string): BotResponse {
    if (message.includes('xin chào') || message.includes('hello') || message.includes('hi')) {
      return {
        message: `Xin chào! Tôi là trợ lý AI nha khoa. Tôi sẽ giúp bạn thăm khám răng miệng.\n\nĐể bắt đầu, hãy cho tôi biết tên của bạn:`,
        nextStep: 'collecting_name'
      };
    }
    
    return {
      message: `Xin chào! Tôi là trợ lý AI nha khoa. Tôi sẽ giúp bạn thăm khám răng miệng.\n\nĐể bắt đầu, hãy cho tôi biết tên của bạn:`,
      nextStep: 'collecting_name'
    };
  }

  private handleNameCollection(session: ChatSession, message: string): BotResponse {
    session.patientInfo.name = message.trim();
    
    return {
      message: `Cảm ơn ${session.patientInfo.name}! Bây giờ hãy cho tôi biết tuổi của bạn:`,
      nextStep: 'collecting_age'
    };
  }

  private handleAgeCollection(session: ChatSession, message: string): BotResponse {
    const age = parseInt(message);
    if (isNaN(age) || age < 1 || age > 120) {
      return {
        message: 'Vui lòng nhập tuổi hợp lệ (1-120):',
        nextStep: 'collecting_age'
      };
    }
    
    session.patientInfo.age = age;
    
    return {
      message: `Bạn ${age} tuổi. Bây giờ hãy mô tả các triệu chứng bạn đang gặp phải:\n\nVí dụ: đau răng, sưng nướu, chảy máu, răng lung lay, v.v.`,
      nextStep: 'collecting_symptoms'
    };
  }

  private handleSymptomsCollection(session: ChatSession, message: string): BotResponse {
    session.patientInfo.symptoms = message.split(',').map(s => s.trim());
    
    return {
      message: `Tôi hiểu bạn đang gặp: ${session.patientInfo.symptoms.join(', ')}\n\nBây giờ hãy đánh giá mức độ đau của bạn từ 1-10 (1 = không đau, 10 = đau dữ dội):`,
      nextStep: 'collecting_pain_level'
    };
  }

  private handlePainLevelCollection(session: ChatSession, message: string): BotResponse {
    const painLevel = parseInt(message);
    if (isNaN(painLevel) || painLevel < 1 || painLevel > 10) {
      return {
        message: 'Vui lòng nhập mức độ đau từ 1-10:',
        nextStep: 'collecting_pain_level'
      };
    }
    
    session.patientInfo.painLevel = painLevel;
    
    return {
      message: `Mức độ đau: ${painLevel}/10\n\nLần cuối bạn đi khám răng là khi nào? (Ví dụ: 6 tháng trước, 1 năm trước, chưa bao giờ):`,
      nextStep: 'collecting_last_visit'
    };
  }

  private handleLastVisitCollection(session: ChatSession, message: string): BotResponse {
    session.patientInfo.lastDentalVisit = message;
    
    const analysis = this.generateInitialAnalysis(session);
    
    return {
      message: `Cảm ơn thông tin của bạn!\n\n📋 **KẾT QUẢ ĐÁNH GIÁ SƠ BỘ:**\n${analysis}\n\n🔍 **Để chẩn đoán chính xác hơn, bạn có thể:**\n1. Gửi ảnh X-quang răng (nếu có)\n2. Gửi ảnh chụp răng miệng\n3. Nhập "tiếp tục" để nhận khuyến nghị\n\nBạn muốn làm gì tiếp theo?`,
      nextStep: 'analysis_complete',
      options: ['Gửi ảnh X-quang', 'Gửi ảnh răng miệng', 'Tiếp tục', 'Kết thúc']
    };
  }

  private async handleImageUpload(session: ChatSession, imagePath: string): Promise<BotResponse> {
    try {
      this.logger.log(`Processing image upload for session ${session.id}`);
      
      // Gửi ảnh đến AI analysis service
      const analysisResult = await this.analyzeImage(imagePath);
      
      return {
        message: `🔍 **KẾT QUẢ PHÂN TÍCH AI:**\n\n📊 **Chẩn đoán:** ${analysisResult.diagnosis}\n📈 **Độ tin cậy:** ${(analysisResult.confidence * 100).toFixed(1)}%\n⚠️ **Mức độ nghiêm trọng:** ${analysisResult.severity}\n💰 **Chi phí ước tính:** ${analysisResult.estimatedCost.min.toLocaleString('vi-VN')} - ${analysisResult.estimatedCost.max.toLocaleString('vi-VN')} VND\n\n💡 **Khuyến nghị:**\n${analysisResult.recommendations.join('\n')}\n\n🏥 **Kế hoạch điều trị:**\n• Ngay lập tức: ${analysisResult.treatmentPlan.immediate.join(', ')}\n• Ngắn hạn: ${analysisResult.treatmentPlan.shortTerm.join(', ')}\n• Dài hạn: ${analysisResult.treatmentPlan.longTerm.join(', ')}\n\n⚠️ **Yếu tố nguy cơ:**\n${analysisResult.riskFactors.join(', ')}\n\nBạn có muốn tôi giải thích thêm về kết quả này không?`,
        nextStep: 'analysis_complete',
        analysisResult,
        options: ['Giải thích thêm', 'Đặt lịch khám', 'Kết thúc']
      };
    } catch (error) {
      this.logger.error(`Image analysis failed: ${error.message}`);
      return {
        message: '❌ Không thể phân tích ảnh. Vui lòng thử lại hoặc liên hệ bác sĩ trực tiếp.',
        nextStep: 'analysis_complete'
      };
    }
  }

  private handleAnalysisComplete(session: ChatSession, message: string): BotResponse {
    if (message.includes('giải thích') || message.includes('thêm')) {
      return {
        message: `📚 **GIẢI THÍCH CHI TIẾT:**\n\nDựa trên thông tin bạn cung cấp và kết quả phân tích AI, tôi khuyến nghị:\n\n1. **Khám bác sĩ nha khoa** trong vòng 1-2 tuần\n2. **Thực hiện các biện pháp vệ sinh** răng miệng đúng cách\n3. **Theo dõi triệu chứng** và báo cáo nếu có thay đổi\n\nBạn có muốn tôi giúp đặt lịch khám không?`,
        options: ['Đặt lịch khám', 'Hướng dẫn vệ sinh', 'Kết thúc']
      };
    }
    
    if (message.includes('đặt lịch') || message.includes('khám')) {
      return {
        message: `📅 **ĐẶT LỊCH KHÁM:**\n\nĐể đặt lịch khám, vui lòng:\n\n📞 **Gọi điện:** 1900-xxxx\n🌐 **Website:** www.dentalclinic.com\n📱 **App:** Tải app DentalCare\n\nHoặc bạn có thể đến trực tiếp phòng khám vào giờ hành chính.\n\nBạn cần hỗ trợ gì thêm không?`,
        options: ['Hướng dẫn vệ sinh', 'Tư vấn thêm', 'Kết thúc']
      };
    }
    
    if (message.includes('kết thúc') || message.includes('tạm biệt')) {
      return {
        message: `Cảm ơn bạn đã sử dụng dịch vụ thăm khám AI của chúng tôi!\n\nChúc bạn sức khỏe tốt! 👋\n\nNếu cần hỗ trợ thêm, hãy quay lại bất cứ lúc nào.`,
        nextStep: 'welcome'
      };
    }
    
    return {
      message: 'Bạn có thể chọn một trong các tùy chọn sau hoặc nhập tin nhắn của mình:',
      options: ['Giải thích thêm', 'Đặt lịch khám', 'Hướng dẫn vệ sinh', 'Kết thúc']
    };
  }

  private handleGeneralConversation(session: ChatSession, message: string): BotResponse {
    if (message.includes('đau') || message.includes('sưng') || message.includes('chảy máu')) {
      return {
        message: 'Tôi hiểu bạn đang gặp vấn đề về răng miệng. Hãy bắt đầu thăm khám để tôi có thể giúp bạn tốt hơn.\n\nBạn có muốn bắt đầu thăm khám không?',
        options: ['Bắt đầu thăm khám', 'Gửi ảnh', 'Tư vấn nhanh']
      };
    }
    
    return {
      message: 'Xin chào! Tôi là trợ lý AI nha khoa. Tôi có thể giúp bạn:\n\n1. Thăm khám răng miệng\n2. Phân tích ảnh X-quang\n3. Tư vấn sức khỏe răng miệng\n\nBạn muốn làm gì?',
      options: ['Thăm khám', 'Gửi ảnh', 'Tư vấn', 'Kết thúc']
    };
  }

  private generateInitialAnalysis(session: ChatSession): string {
    const { patientInfo } = session;
    let analysis = '';
    
    // Phân tích tuổi
    if (patientInfo.age) {
      if (patientInfo.age < 18) {
        analysis += '👶 **Nhóm tuổi:** Trẻ em/Thanh thiếu niên\n';
      } else if (patientInfo.age < 60) {
        analysis += '👨‍⚕️ **Nhóm tuổi:** Người trưởng thành\n';
      } else {
        analysis += '👴 **Nhóm tuổi:** Người cao tuổi\n';
      }
    }
    
    // Phân tích triệu chứng
    if (patientInfo.symptoms) {
      const symptoms = patientInfo.symptoms.join(', ').toLowerCase();
      if (symptoms.includes('đau')) {
        analysis += '🦷 **Triệu chứng chính:** Đau răng\n';
      }
      if (symptoms.includes('sưng')) {
        analysis += '🦷 **Triệu chứng chính:** Sưng nướu\n';
      }
      if (symptoms.includes('chảy máu')) {
        analysis += '🦷 **Triệu chứng chính:** Chảy máu nướu\n';
      }
    }
    
    // Phân tích mức độ đau
    if (patientInfo.painLevel) {
      if (patientInfo.painLevel <= 3) {
        analysis += '🟢 **Mức độ đau:** Nhẹ\n';
      } else if (patientInfo.painLevel <= 7) {
        analysis += '🟡 **Mức độ đau:** Trung bình\n';
      } else {
        analysis += '🔴 **Mức độ đau:** Nghiêm trọng\n';
      }
    }
    
    // Khuyến nghị
    analysis += '\n💡 **Khuyến nghị:** Cần khám bác sĩ nha khoa để đánh giá chi tiết';
    
    return analysis;
  }

  private async analyzeImage(imagePath: string): Promise<any> {
    try {
      const fileBuffer = fs.readFileSync(imagePath);
      const formData = new FormData();
      formData.append('xray', fileBuffer, {
        filename: 'dental_image.jpg',
        contentType: 'image/jpeg'
      });

      const response = await firstValueFrom(
        this.httpService.post(this.aiAnalysisUrl, formData, {
          headers: {
            ...formData.getHeaders()
          },
          timeout: 60000,
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error(`AI analysis failed: ${error.message}`);
      throw error;
    }
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  getSession(sessionId: string): ChatSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): ChatSession[] {
    return Array.from(this.sessions.values());
  }

  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }
}
