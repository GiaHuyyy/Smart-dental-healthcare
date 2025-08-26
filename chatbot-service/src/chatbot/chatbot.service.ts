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
  richContent?: {
    title?: string;
    highlights?: string[];
    sections?: Array<{ heading?: string; text?: string; bullets?: string[] }>;
  };
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

    // If user asks for product suggestions explicitly
    if (lowerMessage.includes('sản phẩm') || lowerMessage.includes('gợi ý sản phẩm') || lowerMessage.includes('danh sách sản phẩm')) {
      return this.handleProductSuggestions(session, lowerMessage);
    }

    // Detect cosmetic whitening intent early
    if (lowerMessage.includes('trắng') || lowerMessage.includes('làm trắng') || lowerMessage.includes('trắng sáng') || lowerMessage.includes('tẩy trắng')) {
      (session.patientInfo as any).intent = 'whitening';
      return this.handleWhiteningIntro(session, lowerMessage);
    }

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
      case 'whitening_intro':
        return this.handleWhiteningIntro(session, lowerMessage);

      case 'whitening_preference':
        return this.handleWhiteningPreference(session, message);

      case 'whitening_sensitivity':
        return this.handleWhiteningSensitivity(session, message);
      
      case 'collecting_symptoms':
        return this.handleSymptomsCollection(session, message);
      
      case 'collecting_pain_level':
        return this.handlePainLevelCollection(session, message);
      
      case 'collecting_last_visit':
        return this.handleLastVisitCollection(session, message);

      case 'triage':
        return this.handleTriageUrgency(session, lowerMessage);

      case 'collecting_medications':
        return this.handleMedicationsCollection(session, message);

      case 'collecting_allergies':
        return this.handleAllergiesCollection(session, message);

      case 'confirm_summary':
        return this.handleConfirmSummary(session, lowerMessage);

      case 'scheduling':
        return this.handleScheduling(session, lowerMessage);
      
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
    // If user expressed whitening intent, skip symptom collection and go to whitening preference
    if ((session.patientInfo as any).intent === 'whitening') {
      return {
        message: `Bạn ${age} tuổi. Tuyệt — bạn muốn làm trắng răng. Bạn muốn làm trắng tại nhà hay tại phòng khám?`,
        options: ['Tại nhà', 'Phòng khám'],
        nextStep: 'whitening_preference'
      };
    }

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
    
    const rich = {
      title: 'Kết quả đánh giá sơ bộ',
      highlights: [
        ...(session.patientInfo.painLevel && session.patientInfo.painLevel >= 7 ? ['Mức đau cao — cần khám sớm'] : []),
      ],
      sections: [
        { heading: 'Thông tin bệnh nhân', text: `Tên: ${session.patientInfo.name || '-'}\nTuổi: ${session.patientInfo.age || '-'}` },
        { heading: 'Tổng quan triệu chứng', text: analysis },
        { heading: 'Hành động đề xuất', bullets: ['Gửi ảnh X-quang nếu có', 'Gửi ảnh chụp răng miệng', 'Nhận khuyến nghị tiếp theo'] }
      ]
    };

    return {
      message: `Cảm ơn bạn — mình đã lưu thông tin. Tóm tắt ngắn: ${analysis.split('\n')[0] || ''}`,
      nextStep: 'analysis_complete',
      options: ['Gửi ảnh X-quang', 'Gửi ảnh răng miệng', 'Tiếp tục', 'Kết thúc'],
      richContent: rich
    };
  }

  // Cosmetic whitening flow
  private handleWhiteningIntro(session: ChatSession, message: string): BotResponse {
    // If we already have age, skip asking age
    if (session.patientInfo.age) {
      return {
        message: 'Bạn muốn làm trắng răng theo cách tại nhà hay tại phòng khám? (ví dụ: tại nhà, phòng khám)',
        options: ['Tại nhà', 'Phòng khám'],
        nextStep: 'whitening_preference'
      };
    }

    (session.patientInfo as any).intent = 'whitening';
    return {
      message: 'Bạn muốn răng trắng sáng hơn — tuyệt! Trước khi tư vấn, cho mình biết tuổi của bạn nhé:',
      nextStep: 'collecting_age'
    };
  }

  private handleWhiteningPreference(session: ChatSession, message: string): BotResponse {
    const lower = message.toLowerCase();
    const pref = lower.includes('nhà') ? 'home' : (lower.includes('phòng') ? 'clinic' : 'unknown');
    (session.patientInfo as any).whiteningPreference = pref;

    return {
      message: `Một số phương án làm trắng:\n• Tại nhà: sử dụng gel/nước súc/miếng làm trắng (an toàn nếu dùng đúng hướng dẫn)\n• Tại phòng khám: tẩy trắng chuyên sâu với đèn, hiệu quả nhanh hơn nhưng chi phí cao hơn\n\nBạn có răng nhạy cảm hoặc từng bị ê buốt khi dùng sản phẩm làm trắng không? (có/không)`,
      options: ['Có', 'Không'],
      nextStep: 'whitening_sensitivity'
    };
  }

  private handleWhiteningSensitivity(session: ChatSession, message: string): BotResponse {
    const lower = message.toLowerCase();
    const sensitive = lower.includes('có') || lower.includes('yes') || lower.includes('y');
    (session.patientInfo as any).teethSensitivity = sensitive;

    const pref = (session.patientInfo as any).whiteningPreference || 'home';
    if (sensitive) {
      // Recommend conservative approach
      return {
        message: `Vì răng bạn nhạy cảm, mình khuyên bắt đầu bằng phương pháp nhẹ nhàng: gel/miếng làm trắng có nồng độ thấp, thời gian ngắn hơn, hoặc tư vấn bác sĩ trước khi tẩy chuyên sâu.

Bạn muốn mình gợi ý sản phẩm an toàn hoặc đặt lịch tư vấn tại phòng khám?`,
        options: ['Gợi ý sản phẩm', 'Đặt lịch tư vấn', 'Kết thúc'],
        nextStep: 'analysis_complete'
      };
    }

    // Not sensitive
    if (pref === 'clinic') {
      return {
        message: 'Phòng khám sẽ có phương pháp tẩy trắng chuyên sâu, hiệu quả nhanh. Bạn muốn mình giúp đặt lịch tư vấn/đặt lịch tẩy trắng?',
        options: ['Đặt lịch tư vấn', 'Thông tin chi phí', 'Kết thúc'],
        nextStep: 'analysis_complete'
      };
    }

    return {
      message: 'Tuyệt — bạn thích phương án tại nhà. Mình có thể gợi ý sản phẩm an toàn và lịch sử dụng. Bạn muốn nhận danh sách sản phẩm hay hướng dẫn chi tiết cách dùng?',
      options: ['Danh sách sản phẩm', 'Hướng dẫn dùng', 'Kết thúc'],
      nextStep: 'analysis_complete'
    };
  }

  private handleProductSuggestions(session: ChatSession, message: string): BotResponse {
    // Example product list commonly available in Vietnam (non-exhaustive, check local availability)
    const products = [
      { name: 'Crest 3D Whitestrips', note: 'Miếng dán tẩy trắng, hiệu quả nhanh, cần tuân theo hướng dẫn' },
      { name: 'Ora2 White', note: 'Sản phẩm Nhật Bản, có kem đánh răng làm trắng nhẹ' },
      { name: 'Colgate Optic White', note: 'Kem đánh răng hỗ trợ làm trắng, an toàn khi dùng thường xuyên' },
      { name: 'Dentiste Whitening', note: 'Sản phẩm hỗ trợ, chải đều theo hướng dẫn' },
    ];

    const rich = {
      title: 'Gợi ý sản phẩm làm trắng răng (tham khảo)',
      highlights: ['Luôn kiểm tra độ nhạy cảm', 'Tuân thủ hướng dẫn sử dụng'],
      sections: [
        { heading: 'Sản phẩm gợi ý', bullets: products.map(p => `${p.name} — ${p.note}`) },
        { heading: 'Lưu ý an toàn', text: 'Nếu răng nhạy cảm hoặc đang mang thai/bú, tốt nhất hỏi bác sĩ trước khi dùng các sản phẩm tẩy trắng.' }
      ]
    };

    return {
      message: 'Dưới đây là một số sản phẩm làm trắng răng được dùng phổ biến — bạn muốn mình gửi link mua hàng hoặc hướng dẫn sử dụng chi tiết?',
      richContent: rich,
      options: ['Gửi link mua', 'Hướng dẫn sử dụng', 'Tư vấn bác sĩ']
    };
  }

  // Triage urgent symptoms to prompt immediate care when needed
  private handleTriageUrgency(session: ChatSession, message: string): BotResponse {
    const urgentKeywords = ['không thở', 'chảy máu nhiều', 'sưng lớn', 'sốt cao', 'mất ý thức', 'đau dữ dội'];
    const isUrgent = urgentKeywords.some(k => message.includes(k));

    if (isUrgent) {
      return {
        message: `Mình rất tiếc bạn đang gặp triệu chứng nghiêm trọng. Nếu có dấu hiệu nguy kịch (chảy máu nhiều, khó thở, mất ý thức), vui lòng liên hệ cấp cứu hoặc đến phòng cấp cứu gần nhất ngay.

Bạn có muốn mình gọi đường dây hỗ trợ hoặc giúp đặt lịch khẩn?`,
        options: ['Gọi cấp cứu', 'Đặt lịch khẩn', 'Hướng dẫn tạm thời'],
        nextStep: 'scheduling'
      };
    }

    // Không quá cấp tính -> ask about medications/allergies
    return {
      message: `Cảm ơn bạn đã chia sẻ. Để đánh giá kỹ hơn, bạn đang dùng thuốc gì (nếu có)? Ví dụ: thuốc giảm đau, thuốc chống đông máu...`,
      nextStep: 'collecting_medications'
    };
  }

  private handleMedicationsCollection(session: ChatSession, message: string): BotResponse {
    const meds = message.split(',').map(s => s.trim()).filter(Boolean);
    (session.patientInfo as any).medications = meds;

    return {
      message: `Ghi nhận thuốc: ${meds.length ? meds.join(', ') : 'Không'}. Bạn có dị ứng thuốc nào không? (ví dụ: penicillin, aspirin)`,
      nextStep: 'collecting_allergies'
    };
  }

  private handleAllergiesCollection(session: ChatSession, message: string): BotResponse {
    const allergies = message.split(',').map(s => s.trim()).filter(Boolean);
    (session.patientInfo as any).allergies = allergies;

    return {
      message: `Cảm ơn. Mình sẽ tóm tắt lại thông tin trước khi đưa khuyến nghị. Bạn có muốn xem bản tóm tắt hay xác nhận ngay?`,
      options: ['Xem tóm tắt', 'Xác nhận', 'Sửa thông tin'],
      nextStep: 'confirm_summary'
    };
  }

  private handleConfirmSummary(session: ChatSession, message: string): BotResponse {
    const lower = message.toLowerCase();
    const summary = this.generateInitialAnalysis(session);

    if (lower.includes('xác nhận') || lower.includes('ok') || lower.includes('đồng ý')) {
      return {
        message: `Cảm ơn bạn đã xác nhận. Mình sẽ đưa ra khuyến nghị dựa trên thông tin hiện có. Bạn muốn đặt lịch khám hay nhận hướng dẫn tự chăm sóc trước?`,
        options: ['Đặt lịch khám', 'Hướng dẫn tự chăm sóc', 'Kết thúc'],
        nextStep: 'analysis_complete'
      };
    }

    if (lower.includes('xem') || lower.includes('tóm tắt')) {
      const rich = {
        title: 'Tóm tắt thông tin bệnh nhân',
        sections: [
          { heading: 'Bệnh nhân', text: `Tên: ${session.patientInfo.name || '-'}\nTuổi: ${session.patientInfo.age || '-'}` },
          { heading: 'Triệu chứng', text: session.patientInfo.symptoms ? session.patientInfo.symptoms.join(', ') : '-' },
          { heading: 'Thuốc đang dùng', text: (session.patientInfo as any).medications ? (session.patientInfo as any).medications.join(', ') : '-' },
          { heading: 'Dị ứng', text: (session.patientInfo as any).allergies ? (session.patientInfo as any).allergies.join(', ') : '-' }
        ]
      };

      return {
        message: `Đây là tóm tắt thông tin của bạn:\n${summary}`,
        richContent: rich,
        options: ['Xác nhận', 'Sửa thông tin', 'Đặt lịch khám']
      };
    }

    return {
      message: 'Bạn muốn sửa phần nào? (tên/tuổi/triệu chứng/thuốc/dị ứng)',
      options: ['Sửa tên', 'Sửa tuổi', 'Sửa triệu chứng', 'Sửa thuốc', 'Sửa dị ứng'],
      nextStep: 'collecting_name'
    };
  }

  private handleScheduling(session: ChatSession, message: string): BotResponse {
    const lower = message.toLowerCase();
    if (lower.includes('gọi') || lower.includes('cấp cứu')) {
      return {
        message: `Nếu là tình trạng khẩn cấp, vui lòng gọi số cấp cứu địa phương ngay lập tức. Nếu bạn cần mình gọi dịch vụ hỗ trợ của phòng khám, vui lòng xác nhận số điện thoại và địa điểm.`,
        nextStep: 'analysis_complete'
      };
    }

    if (lower.includes('đặt') || lower.includes('khẩn')) {
      return {
        message: `Mình đã ghi nhận yêu cầu đặt lịch khẩn. Nhân viên phòng khám sẽ liên hệ bạn trong vòng 1 giờ. Bạn muốn đặt vào buổi sáng hay chiều?`,
        options: ['Sáng', 'Chiều', 'Bất kỳ'],
        nextStep: 'analysis_complete'
      };
    }

    return {
      message: `Mình có thể hướng dẫn bạn giảm đau tạm thời: súc miệng nước muối ấm, chườm lạnh vùng má (10-15 phút), dùng thuốc giảm đau theo hướng dẫn. Bạn muốn nhận hướng dẫn chi tiết?`,
      options: ['Hướng dẫn chi tiết', 'Đặt lịch', 'Kết thúc'],
      nextStep: 'analysis_complete'
    };
  }

  private async handleImageUpload(session: ChatSession, imagePath: string): Promise<BotResponse> {
    try {
      this.logger.log(`Processing image upload for session ${session.id}`);
      
      // Gửi ảnh đến AI analysis service
      const analysisResult = await this.analyzeImage(imagePath);
  // Compose friendlier message with clear sections
  const lines: string[] = [];
      lines.push('🔍 Kết quả phân tích ảnh (tóm tắt):');
      if (analysisResult.diagnosis) lines.push(`• Chẩn đoán: ${analysisResult.diagnosis}`);
      if (typeof analysisResult.confidence === 'number') lines.push(`• Độ tin cậy: ${(analysisResult.confidence * 100).toFixed(1)}%`);
      if (analysisResult.severity) lines.push(`• Mức độ: ${analysisResult.severity}`);
      if (analysisResult.estimatedCost) lines.push(`• Chi phí ước tính: ${analysisResult.estimatedCost.min.toLocaleString('vi-VN')} - ${analysisResult.estimatedCost.max.toLocaleString('vi-VN')} VND`);

      lines.push('\n💡 Khuyến nghị ngắn gọn:');
      if (Array.isArray(analysisResult.recommendations)) {
        analysisResult.recommendations.slice(0, 5).forEach(r => lines.push(`• ${r}`));
      }

      lines.push('\nBạn muốn mình giải thích chi tiết, giúp đặt lịch khám hay nhận hướng dẫn tự chăm sóc?');

      const rich = {
        title: 'Kết quả phân tích ảnh',
        highlights: [analysisResult.diagnosis || 'Kết quả sơ bộ'],
        sections: [
          { heading: 'Chẩn đoán', text: analysisResult.diagnosis },
          { heading: 'Độ tin cậy', text: typeof analysisResult.confidence === 'number' ? `${(analysisResult.confidence * 100).toFixed(1)}%` : '-' },
          { heading: 'Mức độ', text: analysisResult.severity || '-' },
          { heading: 'Ước tính chi phí', text: analysisResult.estimatedCost ? `${analysisResult.estimatedCost.min.toLocaleString('vi-VN')} - ${analysisResult.estimatedCost.max.toLocaleString('vi-VN')} VND` : '-' },
          { heading: 'Khuyến nghị', bullets: Array.isArray(analysisResult.recommendations) ? analysisResult.recommendations.slice(0, 10) : [] },
        ]
      };

      return {
        message: lines.join('\n'),
        nextStep: 'analysis_complete',
        analysisResult,
        options: ['Giải thích thêm', 'Đặt lịch khám', 'Hướng dẫn tự chăm sóc', 'Kết thúc'],
        richContent: rich
      };
    } catch (error) {
      this.logger.error(`Image analysis failed: ${error.message}`);
      return {
        message: '❌ Không thể phân tích ảnh. Vui lòng thử lại hoặc liên hệ bác sĩ trực tiếp.',
        nextStep: 'analysis_complete'
      };
    }
  }

  // pick one variant from options to make conversation varied
  private pickOne(variants: string[]): string {
    if (!variants || variants.length === 0) return '';
    const idx = Math.floor(Math.random() * variants.length);
    return variants[idx];
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
      if (!imagePath || typeof imagePath !== 'string') {
        throw new Error('Invalid imagePath');
      }

      if (!fs.existsSync(imagePath)) {
        throw new Error('File does not exist');
      }

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

      if (!response || !response.data) {
        throw new Error('Empty response from AI analysis service');
      }

      return response.data;
    } catch (error) {
      this.logger.error(`AI analysis failed: ${error.message}`);
      throw error;
    }
  }

  // For testing we can inject a predictable id by passing an optional seed
  private generateId(seed?: string): string {
    if (seed) return `${Date.now()}-${seed}`;
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
