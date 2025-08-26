import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { UsersService } from '../users/users.service';

@Injectable()
export class AiChatService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(private usersService: UsersService) {
    this.genAI = new GoogleGenerativeAI(
      process.env.GEMINI_API_KEY || 'your-gemini-api-key-here',
    );
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  private async getDoctorsFromDatabase() {
    try {
      const doctors = await this.usersService.findDoctors();
      return doctors.map((doctor) => ({
        fullName: doctor.fullName,
        specialty: doctor.specialty || 'Nha khoa tổng quát',
        keywords: this.getKeywordsForSpecialty(doctor.specialty || ''),
      }));
    } catch (error) {
      console.error('Failed to fetch doctors from database:', error);
      // Fallback data if database fails
      return [
        {
          fullName: 'BS. Nguyễn Văn A',
          specialty: 'Nha khoa tổng quát, cấy ghép implant',
          keywords: ['implant', 'cấy ghép', 'tổng quát'],
        },
        {
          fullName: 'BS. Trần Thị B',
          specialty: 'Chỉnh nha, niềng răng',
          keywords: ['niềng', 'chỉnh nha', 'răng khấp khểnh'],
        },
        {
          fullName: 'BS. Lê Văn C',
          specialty: 'Phẫu thuật hàm mặt, răng khôn',
          keywords: ['răng khôn', 'phẫu thuật', 'nhổ răng'],
        },
        {
          fullName: 'BS. Phạm Thị D',
          specialty: 'Nha chu, chảy máu nướu',
          keywords: ['nướu', 'chảy máu', 'viêm nướu'],
        },
        {
          fullName: 'BS. Hoàng Văn E',
          specialty: 'Thẩm mỹ răng, tẩy trắng',
          keywords: ['tẩy trắng', 'thẩm mỹ', 'răng đẹp'],
        },
      ];
    }
  }

  private getKeywordsForSpecialty(specialty: string): string[] {
    const specialtyKeywords: { [key: string]: string[] } = {
      implant: ['implant', 'cấy ghép', 'tổng quát'],
      'chỉnh nha': ['niềng', 'chỉnh nha', 'răng khấp khểnh'],
      'phẫu thuật': ['răng khôn', 'phẫu thuật', 'nhổ răng'],
      'nha chu': ['nướu', 'chảy máu', 'viêm nướu'],
      'thẩm mỹ': ['tẩy trắng', 'thẩm mỹ', 'răng đẹp'],
    };

    const lowerSpecialty = specialty.toLowerCase();
    for (const [key, keywords] of Object.entries(specialtyKeywords)) {
      if (lowerSpecialty.includes(key)) {
        return keywords;
      }
    }
    return ['tổng quát'];
  }

  async getDentalAdvice(userMessage: string, chatHistory: any[] = []) {
    // Get doctors from database
    const doctors = await this.getDoctorsFromDatabase();

    const systemPrompt = `
Bạn là một trợ lý AI chuyên về nha khoa tại Smart Dental Healthcare, một phòng khám nha khoa tại Việt Nam.

NHIỆM VỤ:
1. Tư vấn sơ bộ về các vấn đề răng miệng
2. Phân tích triệu chứng và đưa ra gợi ý
3. Gợi ý bác sĩ phù hợp nếu cần thiết
4. Hướng dẫn chăm sóc răng miệng cơ bản

QUY TẮC:
- Luôn trả lời bằng tiếng Việt
- Không thay thế ý kiến bác sĩ chuyên khoa
- Đưa ra lời khuyên an toàn, thận trọng
- Nếu nghiêm trọng, khuyên đến gặp bác sĩ ngay
- Thân thiện, dễ hiểu

CÁC BÁC SĨ CHUYÊN KHOA:
${doctors.map((d) => `- ${d.fullName}: ${d.specialty}`).join('\n')}

TRIỆU CHỨNG KHẨN CẤP (khuyên gặp bác sĩ ngay):
- Đau răng dữ dội kéo dài
- Sưng mặt, sốt
- Chảy máu nướu không ngừng
- Răng bị gãy, vỡ
- Nhiễm trùng miệng

FORMAT TRẢ LỜI:
1. Phân tích triệu chứng
2. Tư vấn sơ bộ
3. Gợi ý bác sĩ (nếu cần)
4. Lời khuyên chăm sóc

Hãy trả lời ngắn gọn, súc tích nhưng đầy đủ thông tin.`;

    try {
      // Prepare conversation context for Gemini
      let conversationContext = systemPrompt + '\n\nLịch sử trò chuyện:\n';

      // Add chat history
      chatHistory.forEach((msg) => {
        conversationContext += `${msg.role === 'user' ? 'Bệnh nhân' : 'AI'}: ${msg.content}\n`;
      });

      // Add current message
      conversationContext += `\nBệnh nhân hiện tại hỏi: ${userMessage}\n\nTrả lời:`;

      const result = await this.model.generateContent(conversationContext);
      const response = await result.response;
      const aiResponse: string = response.text();

      // Check if AI suggests a doctor
      const suggestedDoctor = await this.extractDoctorSuggestion(aiResponse);

      return {
        message: aiResponse,
        suggestedDoctor,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Gemini API Error:', error);
      return {
        message:
          'Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau hoặc liên hệ trực tiếp với phòng khám.',
        suggestedDoctor: null,
        timestamp: new Date(),
      };
    }
  }

  private async extractDoctorSuggestion(aiResponse: string): Promise<any> {
    // Get current doctors from database
    const doctors = await this.getDoctorsFromDatabase();

    for (const doctor of doctors) {
      if (
        doctor.keywords.some((keyword) =>
          aiResponse.toLowerCase().includes(keyword),
        )
      ) {
        return doctor;
      }
    }

    return null;
  }

  async getQuickSuggestions(symptom: string) {
    const suggestions = {
      'đau răng': [
        'Súc miệng bằng nước muối ấm',
        'Sử dụng thuốc giảm đau theo chỉ định',
        'Tránh đồ ăn quá nóng hoặc lạnh',
        'Đặt lịch khám với BS. Nguyễn Văn A',
      ],
      'răng khôn': [
        'Súc miệng bằng nước muối',
        'Uống thuốc giảm đau',
        'Chườm lạnh vùng sưng',
        'Khám với BS. Lê Văn C về phẫu thuật',
      ],
      'chảy máu nướu': [
        'Đánh răng nhẹ nhàng',
        'Sử dụng chỉ nha khoa',
        'Súc miệng bằng nước muối',
        'Khám với BS. Phạm Thị D về nha chu',
      ],
      'tẩy trắng': [
        'Hạn chế cà phê, trà',
        'Không hút thuốc',
        'Đánh răng 2 lần/ngày',
        'Tư vấn với BS. Hoàng Văn E',
      ],
      'niềng răng': [
        'Kiểm tra độ tuổi phù hợp',
        'Chụp X-quang răng',
        'Đánh giá tình trạng nướu',
        'Tư vấn với BS. Trần Thị B',
      ],
    };

    return (
      suggestions[symptom.toLowerCase()] || [
        'Duy trì vệ sinh răng miệng tốt',
        'Đánh răng 2 lần/ngày',
        'Khám răng định kỳ 6 tháng/lần',
        'Liên hệ phòng khám để được tư vấn cụ thể',
      ]
    );
  }

  async analyzeUrgency(message: string): Promise<'high' | 'medium' | 'low'> {
    const urgentKeywords = [
      'đau dữ dội',
      'sưng mặt',
      'sốt',
      'chảy máu không ngừng',
      'gãy răng',
      'vỡ răng',
    ];
    const mediumKeywords = ['đau', 'sưng', 'khó chịu', 'nhức'];

    const lowerMessage = message.toLowerCase();

    if (urgentKeywords.some((keyword) => lowerMessage.includes(keyword))) {
      return 'high';
    }

    if (mediumKeywords.some((keyword) => lowerMessage.includes(keyword))) {
      return 'medium';
    }

    return 'low';
  }
}
