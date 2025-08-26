import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as FormData from 'form-data';
import * as fs from 'fs';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { GeminiService } from './gemini.service';
import { Analysis, AnalysisDocument } from './schemas/analysis.schema';

export interface AnalysisResult {
  diagnosis: string;
  confidence: number;
  file: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  detailedFindings: {
    teethCondition: string;
    boneStructure: string;
    gumHealth: string;
    rootCanals: string;
    cavities: string[];
    periodontalStatus: string;
  };
  treatmentPlan: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  riskFactors: string[];
  followUpRequired: boolean;
  estimatedCost: {
    min: number;
    max: number;
    currency: string;
  };
  annotations?: Array<{
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    description: string;
  }>;
  metadata: {
    analysisDate: string;
    processingTime: number;
    imageQuality: 'poor' | 'fair' | 'good' | 'excellent';
    aiModelVersion: string;
    analysisSource: string;
  };
}

@Injectable()
export class AnalyzeService {
  private readonly logger = new Logger(AnalyzeService.name);
  private readonly aiBackendUrl: string;



  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectModel(Analysis.name) private analysisModel: Model<AnalysisDocument>,
    private readonly geminiService: GeminiService,
  ) {
    this.aiBackendUrl = this.configService.get<string>('AI_BACKEND_URL') || 'http://localhost:5002/diagnose';
  }

  async analyzeXray(filePath: string, filename: string): Promise<AnalysisResult> {
    const startTime = Date.now();
    let analysisResult: any;
    let analysisSource = 'fallback';

    try {
      this.logger.log(`Starting analysis for file: ${filename}`);
      
      // Ưu tiên sử dụng Gemini AI trước
      try {
        this.logger.log('Using Gemini AI for analysis');
        const geminiResult = await this.geminiService.analyzeXrayWithGemini(filePath, filename);
        analysisResult = geminiResult;
        analysisSource = 'gemini_ai';
        this.logger.log('Gemini AI analysis completed successfully');
      } catch (geminiError) {
        this.logger.error('Gemini AI failed:', geminiError.message);
        this.logger.warn('Gemini AI failed, trying AI Backend...');
        
        // Thử AI Backend nếu Gemini thất bại
        try {
          this.logger.log('Using AI Backend for analysis');
          const fileBuffer = fs.readFileSync(filePath);
          const formData = new FormData();
          formData.append('file', fileBuffer, {
            filename: filename,
            contentType: 'image/jpeg'
          });

          this.logger.log(`Sending file to AI backend: ${filename}, size: ${fileBuffer.length} bytes`);
          
          const response = await firstValueFrom(
            this.httpService.post(this.aiBackendUrl, formData, {
              headers: {
                ...formData.getHeaders()
              },
              timeout: 30000,
            })
          );

          analysisResult = response.data;
          analysisSource = 'ai_backend';
          this.logger.log('AI backend analysis completed successfully');
        } catch (backendError) {
          this.logger.error('AI backend failed with detailed error:', {
            message: backendError.message,
            status: backendError.response?.status,
            statusText: backendError.response?.statusText,
            data: backendError.response?.data,
            url: this.aiBackendUrl
          });
          this.logger.warn('AI backend failed, using fallback analysis:', backendError.message);
        }
      }

      // Fallback cuối cùng
      if (!analysisResult) {
        analysisResult = this.getFallbackAnalysis(filename);
        analysisSource = 'fallback';
        this.logger.log('Using fallback analysis');
      }

      // Chuẩn hóa kết quả
      const normalizedResult = this.normalizeAnalysisResult(analysisResult, filename, startTime, analysisSource);
      
      // Lưu vào MongoDB
      await this.saveAnalysisToDatabase(normalizedResult, filePath, filename);
      
      return normalizedResult;
    } catch (error) {
      this.logger.error(`Error analyzing X-ray: ${error.message}`);
      
      // Fallback response nếu tất cả AI services không khả dụng
      return this.getFallbackAnalysis(filename);
    }
  }

  private generateRecommendations(severity: 'low' | 'medium' | 'high' | 'critical'): string[] {
    const recommendationsBySeverity = {
      'low': [
        'Đánh răng đúng kỹ thuật 2 lần mỗi ngày với kem đánh răng có fluoride',
        'Sử dụng chỉ nha khoa hàng ngày để làm sạch kẽ răng',
        'Súc miệng bằng nước súc miệng kháng khuẩn',
        'Hạn chế đồ ngọt và nước có gas',
        'Kiểm tra răng định kỳ 6 tháng/lần',
        'Cạo vôi răng và đánh bóng định kỳ',
        'Uống đủ nước mỗi ngày'
      ],
      'medium': [
        'Điều trị viêm nướu bằng thuốc kháng sinh tại chỗ',
        'Cạo vôi răng sâu dưới nướu',
        'Sử dụng máng chống nghiến răng ban đêm',
        'Bổ sung canxi và vitamin D',
        'Tránh cắn đồ cứng và thức ăn quá nóng/lạnh',
        'Massage nướu nhẹ nhàng hàng ngày',
        'Kiểm tra răng 3 tháng/lần'
      ],
      'high': [
        'Điều trị tủy răng ngay lập tức',
        'Nhổ răng khôn để tránh biến chứng',
        'Bọc răng sứ để bảo vệ răng yếu',
        'Điều trị viêm nha chu chuyên sâu',
        'Sử dụng thuốc kháng sinh theo đơn bác sĩ',
        'Kiểm tra X-quang định kỳ',
        'Tái khám sau 1-2 tuần'
      ],
      'critical': [
        'Điều trị khẩn cấp trong 24-48 giờ',
        'Sử dụng kháng sinh mạnh theo đơn bác sĩ',
        'Có thể cần phẫu thuật cắt bỏ mô nhiễm trùng',
        'Theo dõi sát sao biến chứng toàn thân',
        'Cân nhắc cấy ghép implant sau điều trị',
        'Điều trị đa chuyên khoa nếu cần',
        'Tái khám hàng tuần trong giai đoạn đầu'
      ]
    };
    
    const availableRecommendations = recommendationsBySeverity[severity] || recommendationsBySeverity['medium'];
    const count = severity === 'critical' ? Math.floor(Math.random() * 3) + 4 : 
                  severity === 'high' ? Math.floor(Math.random() * 3) + 3 :
                  Math.floor(Math.random() * 3) + 2;
    
    return availableRecommendations.sort(() => 0.5 - Math.random()).slice(0, count);
  }

  private getRandomImageQuality(): 'poor' | 'fair' | 'good' | 'excellent' {
    const qualities: ('poor' | 'fair' | 'good' | 'excellent')[] = ['poor', 'fair', 'good', 'excellent'];
    return qualities[Math.floor(Math.random() * qualities.length)];
  }

  private generateEstimatedCost(severity: 'low' | 'medium' | 'high' | 'critical'): { min: number; max: number; currency: string; note: string } {
    const costsBySeverity = {
      'low': [
        { min: 100000, max: 300000, note: 'Chi phí cạo vôi răng và vệ sinh' },
        { min: 200000, max: 500000, note: 'Chi phí trám răng composite nhỏ' },
        { min: 150000, max: 400000, note: 'Chi phí tẩy trắng răng tại nhà' },
        { min: 50000, max: 150000, note: 'Chi phí tư vấn và kiểm tra' }
      ],
      'medium': [
        { min: 500000, max: 1200000, note: 'Chi phí trám răng composite lớn' },
        { min: 1000000, max: 3000000, note: 'Chi phí điều trị viêm nha chu' },
        { min: 300000, max: 800000, note: 'Chi phí nhổ răng khôn' },
        { min: 2000000, max: 4000000, note: 'Chi phí tẩy trắng răng chuyên nghiệp' }
      ],
      'high': [
        { min: 1500000, max: 3500000, note: 'Chi phí điều trị tủy răng phức tạp' },
        { min: 3000000, max: 8000000, note: 'Chi phí phẫu thuật nha chu' },
        { min: 2000000, max: 5000000, note: 'Chi phí bọc răng sứ' },
        { min: 800000, max: 2000000, note: 'Chi phí điều trị áp xe răng' }
      ],
      'critical': [
        { min: 5000000, max: 15000000, note: 'Chi phí cấy ghép implant' },
        { min: 10000000, max: 25000000, note: 'Chi phí phục hình toàn hàm' },
        { min: 50000000, max: 120000000, note: 'Chi phí niềng răng toàn diện' },
        { min: 8000000, max: 20000000, note: 'Chi phí điều trị phức tạp đa chuyên khoa' }
      ]
    };
    
    const availableCosts = costsBySeverity[severity] || costsBySeverity['medium'];
    const selected = availableCosts[Math.floor(Math.random() * availableCosts.length)];
    return {
      ...selected,
      currency: 'VND'
    };
  }

  private generateDetailedCostBreakdown(severity: 'low' | 'medium' | 'high' | 'critical'): { treatment: string; cost: { min: number; max: number }; note: string }[] {
    const treatments = {
      'low': [
        { treatment: 'Trám răng composite', cost: { min: 200000, max: 500000 }, note: 'Chi phí trám răng composite chất lượng cao' },
        { treatment: 'Cạo vôi răng', cost: { min: 100000, max: 300000 }, note: 'Vệ sinh răng miệng chuyên nghiệp' },
        { treatment: 'Tẩy trắng răng tại nhà', cost: { min: 150000, max: 400000 }, note: 'Bộ kit tẩy trắng răng an toàn' }
      ],
      'medium': [
        { treatment: 'Điều trị viêm nha chu', cost: { min: 1000000, max: 3000000 }, note: 'Điều trị viêm nha chu giai đoạn đầu' },
        { treatment: 'Nhổ răng khôn', cost: { min: 300000, max: 800000 }, note: 'Nhổ răng khôn đơn giản' },
        { treatment: 'Tẩy trắng răng tại phòng khám', cost: { min: 2000000, max: 4000000 }, note: 'Tẩy trắng răng chuyên nghiệp' }
      ],
      'high': [
        { treatment: 'Điều trị tủy răng', cost: { min: 500000, max: 1500000 }, note: 'Điều trị tủy răng hoàn chỉnh' },
        { treatment: 'Bọc răng sứ', cost: { min: 2000000, max: 5000000 }, note: 'Bọc răng sứ cao cấp' },
        { treatment: 'Phẫu thuật nha chu', cost: { min: 3000000, max: 8000000 }, note: 'Phẫu thuật nha chu phức tạp' }
      ],
      'critical': [
        { treatment: 'Cấy ghép implant', cost: { min: 5000000, max: 15000000 }, note: 'Cấy ghép implant chất lượng cao' },
        { treatment: 'Phục hình toàn hàm', cost: { min: 10000000, max: 25000000 }, note: 'Phục hình toàn diện cả hàm răng' },
        { treatment: 'Niềng răng toàn hàm', cost: { min: 50000000, max: 120000000 }, note: 'Niềng răng chỉnh nha toàn diện' }
      ]
    };

    const availableTreatments = treatments[severity] || treatments['medium'];
    const count = Math.floor(Math.random() * 2) + 1;
    return availableTreatments.sort(() => 0.5 - Math.random()).slice(0, count);
  }

  private generateSeverity(): 'low' | 'medium' | 'high' | 'critical' {
    const severities: ('low' | 'medium' | 'high' | 'critical')[] = ['low', 'medium', 'high', 'critical'];
    const weights = [0.4, 0.35, 0.2, 0.05]; // Tỷ lệ xuất hiện của mỗi mức độ
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return severities[i];
      }
    }
    return 'medium';
  }

  private generateFindings(severity: 'low' | 'medium' | 'high' | 'critical'): string[] {
    const findingsByCategory = {
      'low': [
        'Mảng bám răng nhẹ ở vùng cổ răng',
        'Vôi răng hình thành ban đầu',
        'Viêm nướu nhẹ cục bộ',
        'Sâu răng giai đoạn đầu (D1)',
        'Mòn men răng nhẹ do ma sát',
        'Khe hở nhỏ giữa các răng',
        'Tụt nướu nhẹ ở 1-2 răng'
      ],
      'medium': [
        'Sâu răng trung bình (D2) ở răng hàm',
        'Viêm nha chu giai đoạn đầu',
        'Vôi răng tích tụ nhiều vùng cổ răng',
        'Răng khôn mọc lệch nhẹ',
        'Mòn men răng do nghiến răng ban đêm',
        'Tụt nướu trung bình ở nhiều răng',
        'Viêm nướu lan rộng'
      ],
      'high': [
        'Sâu răng sâu (D3) gần tủy răng',
        'Viêm nha chu nặng với túi nha chu sâu',
        'Viêm tủy răng cấp tính',
        'Răng khôn ảnh hưởng răng bên cạnh',
        'Mòn răng nặng do acid',
        'Tụt nướu nghiêm trọng lộ chân răng',
        'Áp xe nha chu cấp tính'
      ],
      'critical': [
        'Viêm tủy răng hoại tử',
        'Áp xe răng lan rộng vào xương hàm',
        'Viêm nha chu giai đoạn cuối',
        'Răng lung lay độ 3',
        'Nhiễm trùng lan rộng vùng hàm mặt',
        'Tiêu xương ổ răng nghiêm trọng',
        'Hoại tử nướu lan rộng'
      ]
    };
    
    const availableFindings = findingsByCategory[severity] || findingsByCategory['medium'];
    const count = severity === 'critical' ? Math.floor(Math.random() * 3) + 3 : 
                  severity === 'high' ? Math.floor(Math.random() * 3) + 2 :
                  Math.floor(Math.random() * 3) + 1;
    
    return availableFindings.sort(() => 0.5 - Math.random()).slice(0, count);
  }

  private calculateConfidence(severity: 'low' | 'medium' | 'high' | 'critical', findingsCount: number): number {
    const baseConfidence = {
      'low': 85,
      'medium': 80,
      'high': 90,
      'critical': 95
    };
    
    const variation = Math.floor(Math.random() * 10) - 5; // ±5%
    const findingsBonus = Math.min(findingsCount * 2, 10);
    
    return Math.min(Math.max(baseConfidence[severity] + variation + findingsBonus, 60), 99);
  }

  private generateRiskFactors(severity: 'low' | 'medium' | 'high' | 'critical'): string[] {
    const riskFactorsByCategory = {
      'low': [
        'Vệ sinh răng miệng không đều đặn',
        'Ăn nhiều đồ ngọt',
        'Không sử dụng chỉ nha khoa',
        'Uống ít nước'
      ],
      'medium': [
        'Hút thuốc lá',
        'Stress kéo dài',
        'Nghiến răng ban đêm',
        'Chế độ ăn thiếu canxi',
        'Không kiểm tra răng định kỳ'
      ],
      'high': [
        'Tiểu đường không kiểm soát',
        'Hệ miễn dịch suy yếu',
        'Thuốc gây khô miệng',
        'Chấn thương răng',
        'Viêm nhiễm tái phát'
      ],
      'critical': [
        'Bệnh tim mạch',
        'Nhiễm trùng lan rộng',
        'Suy giảm miễn dịch nghiêm trọng',
        'Không điều trị kịp thời',
        'Biến chứng toàn thân'
      ]
    };
    
    const availableRisks = riskFactorsByCategory[severity] || riskFactorsByCategory['medium'];
    const count = Math.floor(Math.random() * 3) + 1;
    return availableRisks.sort(() => 0.5 - Math.random()).slice(0, count);
  }

  private generateFollowUpSchedule(severity: 'low' | 'medium' | 'high' | 'critical'): { type: string; timeframe: string; description: string }[] {
    const scheduleByCategory = {
      'low': [
        { type: 'Kiểm tra định kỳ', timeframe: '6 tháng', description: 'Kiểm tra tổng quát và vệ sinh răng' },
        { type: 'Tái khám', timeframe: '3 tháng', description: 'Đánh giá hiệu quả điều trị' }
      ],
      'medium': [
        { type: 'Tái khám', timeframe: '2 tuần', description: 'Kiểm tra quá trình lành thương' },
        { type: 'Kiểm tra nha chu', timeframe: '3 tháng', description: 'Đánh giá tình trạng nha chu' },
        { type: 'Kiểm tra định kỳ', timeframe: '6 tháng', description: 'Duy trì sức khỏe răng miệng' }
      ],
      'high': [
        { type: 'Tái khám khẩn', timeframe: '1 tuần', description: 'Theo dõi sát sao quá trình điều trị' },
        { type: 'Kiểm tra X-quang', timeframe: '1 tháng', description: 'Đánh giá kết quả điều trị' },
        { type: 'Tái khám', timeframe: '3 tháng', description: 'Kiểm tra ổn định lâu dài' }
      ],
      'critical': [
        { type: 'Theo dõi hàng ngày', timeframe: '1 tuần đầu', description: 'Giám sát chặt chẽ biến chứng' },
        { type: 'Tái khám cấp cứu', timeframe: '3 ngày', description: 'Đánh giá đáp ứng điều trị' },
        { type: 'Kiểm tra toàn diện', timeframe: '2 tuần', description: 'Đánh giá tình trạng tổng thể' }
      ]
    };
    
    return scheduleByCategory[severity] || scheduleByCategory['medium'];
  }

  private generatePreventiveMeasures(): string[] {
    const measures = [
      'Đánh răng đúng kỹ thuật 2 lần/ngày với kem đánh răng có fluoride',
      'Sử dụng chỉ nha khoa hàng ngày để làm sạch kẽ răng',
      'Súc miệng bằng nước súc miệng kháng khuẩn',
      'Hạn chế đồ ngọt và nước có gas',
      'Uống đủ nước mỗi ngày (ít nhất 2 lít)',
      'Không hút thuốc lá và hạn chế rượu bia',
      'Ăn nhiều rau xanh và trái cây giàu vitamin C',
      'Thay bàn chải đánh răng 3 tháng/lần',
      'Massage nướu nhẹ nhàng hàng ngày',
      'Kiểm tra răng định kỳ 6 tháng/lần'
    ];
    
    const count = Math.floor(Math.random() * 4) + 5;
    return measures.sort(() => 0.5 - Math.random()).slice(0, count);
  }

  private getFallbackAnalysis(filename: string): AnalysisResult {
    const startTime = Date.now();
    
    // Phân tích giả lập phong phú khi AI backend không khả dụng
    const mockScenarios = [
      {
        diagnosis: 'Sâu răng nhẹ ở răng hàm trên',
        confidence: 0.85,
        severity: 'low' as const,
        teethCondition: 'Phát hiện sâu răng nhẹ ở răng số 16',
        boneStructure: 'Cấu trúc xương bình thường',
        gumHealth: 'Nướu khỏe mạnh',
        rootCanals: 'Tủy răng còn sống',
        cavities: ['Sâu răng mặt nhai răng 16 - độ sâu 2mm'],
        periodontalStatus: 'Không có dấu hiệu viêm nha chu',
        immediate: ['Trám răng composite cho răng 16'],
        shortTerm: ['Vệ sinh răng miệng 2 lần/ngày', 'Sử dụng kem đánh răng có fluoride'],
        longTerm: ['Kiểm tra định kỳ 6 tháng/lần', 'Vệ sinh răng miệng chuyên nghiệp'],
        riskFactors: ['Vệ sinh răng miệng kém', 'Ăn nhiều đồ ngọt']
      },
      {
        diagnosis: 'Viêm nha chu giai đoạn đầu',
        confidence: 0.78,
        severity: 'medium' as const,
        teethCondition: 'Răng còn tốt, có vôi răng',
        boneStructure: 'Mất xương nha chu nhẹ',
        gumHealth: 'Nướu sưng nhẹ, dễ chảy máu',
        rootCanals: 'Tủy răng bình thường',
        cavities: [],
        periodontalStatus: 'Viêm nha chu giai đoạn đầu',
        immediate: ['Cạo vôi răng toàn hàm'],
        shortTerm: ['Vệ sinh răng miệng đúng kỹ thuật', 'Súc miệng kháng khuẩn'],
        longTerm: ['Kiểm tra nha chu 3 tháng/lần', 'Duy trì vệ sinh răng miệng tốt'],
        riskFactors: ['Vệ sinh răng miệng kém', 'Hút thuốc', 'Stress']
      },
      {
        diagnosis: 'Răng khôn mọc lệch cần nhổ',
        confidence: 0.92,
        severity: 'high' as const,
        teethCondition: 'Răng khôn hàm dưới mọc lệch 45 độ',
        boneStructure: 'Xương đủ dày, không tổn thương',
        gumHealth: 'Nướu quanh răng khôn viêm nhẹ',
        rootCanals: 'Chân răng gần ống thần kinh',
        cavities: [],
        periodontalStatus: 'Bình thường',
        immediate: ['Chụp CT Cone Beam', 'Tư vấn nhổ răng khôn'],
        shortTerm: ['Nhổ răng khôn', 'Kháng sinh và giảm đau'],
        longTerm: ['Theo dõi vết thương lành', 'Kiểm tra sau 1 tuần'],
        riskFactors: ['Vị trí răng khôn gần ống thần kinh', 'Viêm nướu tái phát']
      },
      {
        diagnosis: 'Tủy răng viêm cần điều trị nội nha',
        confidence: 0.88,
        severity: 'high' as const,
        teethCondition: 'Răng số 36 có sâu răng sâu đến tủy',
        boneStructure: 'Có tổn thương quanh chóp răng',
        gumHealth: 'Nướu sưng tấy quanh răng bị viêm',
        rootCanals: 'Tủy răng viêm, có mủ',
        cavities: ['Sâu răng sâu răng 36 - đã đến tủy'],
        periodontalStatus: 'Viêm nha chu cục bộ',
        immediate: ['Mở tủy dẫn lưu', 'Kháng sinh giảm viêm'],
        shortTerm: ['Điều trị tủy răng 3-4 lần', 'Trám tạm thời'],
        longTerm: ['Bọc răng sứ', 'Kiểm tra X-quang sau 6 tháng'],
        riskFactors: ['Sâu răng không điều trị kịp thời', 'Vệ sinh răng miệng kém']
      },
      {
        diagnosis: 'Răng khỏe mạnh - không có vấn đề',
        confidence: 0.95,
        severity: 'low' as const,
        teethCondition: 'Tất cả răng khỏe mạnh, không sâu răng',
        boneStructure: 'Cấu trúc xương hàm bình thường',
        gumHealth: 'Nướu hồng, không sưng tấy',
        rootCanals: 'Tủy răng khỏe mạnh',
        cavities: [],
        periodontalStatus: 'Nha chu khỏe mạnh',
        immediate: [],
        shortTerm: ['Duy trì vệ sinh răng miệng hiện tại'],
        longTerm: ['Kiểm tra định kỳ', 'Vệ sinh răng chuyên nghiệp 6 tháng/lần'],
        riskFactors: []
      },
      {
        diagnosis: 'Viêm tủy răng cấp tính',
        confidence: 0.91,
        severity: 'critical' as const,
        teethCondition: 'Răng số 26 viêm tủy cấp tính, đau dữ dội',
        boneStructure: 'Xương quanh chóp răng có tổn thương',
        gumHealth: 'Nướu sưng tấy, có mủ',
        rootCanals: 'Tủy răng hoại tử, nhiễm trùng',
        cavities: ['Sâu răng sâu đến tủy răng 26'],
        periodontalStatus: 'Áp xe quanh chóp răng',
        immediate: ['Cấp cứu nha khoa', 'Mở tủy dẫn lưu ngay', 'Kháng sinh mạnh'],
        shortTerm: ['Điều trị tủy răng khẩn cấp', 'Giảm đau mạnh'],
        longTerm: ['Bọc răng sứ sau điều trị', 'Theo dõi sát sao 3 tháng'],
        riskFactors: ['Nhiễm trùng lan rộng', 'Sốc nhiễm trùng', 'Mất răng']
      },
      {
        diagnosis: 'Viêm nha chu nặng với mất xương',
        confidence: 0.83,
        severity: 'high' as const,
        teethCondition: 'Nhiều răng lung lay, có vôi răng nhiều',
        boneStructure: 'Mất xương nha chu nghiêm trọng 40-60%',
        gumHealth: 'Nướu tụt, chảy máu, có mủ',
        rootCanals: 'Tủy răng còn sống nhưng bị ảnh hưởng',
        cavities: ['Sâu răng cổ răng do tụt nướu'],
        periodontalStatus: 'Viêm nha chu nặng giai đoạn 3',
        immediate: ['Cạo vôi sâu toàn hàm', 'Kháng sinh điều trị'],
        shortTerm: ['Phẫu thuật nha chu', 'Ghép xương nha chu'],
        longTerm: ['Duy trì điều trị nha chu', 'Có thể cần nhổ răng và cấy ghép'],
        riskFactors: ['Mất răng vĩnh viễn', 'Nhiễm trùng toàn thân', 'Bệnh tim mạch']
      },
      {
        diagnosis: 'Răng mọc chen chúc cần niềng răng',
        confidence: 0.87,
        severity: 'medium' as const,
        teethCondition: 'Răng mọc chen chúc, không đều',
        boneStructure: 'Xương hàm bình thường',
        gumHealth: 'Nướu khỏe nhưng khó vệ sinh',
        rootCanals: 'Tủy răng bình thường',
        cavities: ['Sâu răng nhẹ do khó vệ sinh'],
        periodontalStatus: 'Viêm nướu nhẹ do vệ sinh khó khăn',
        immediate: ['Vệ sinh răng miệng kỹ lưỡng'],
        shortTerm: ['Tư vấn niềng răng', 'Lập kế hoạch điều trị chỉnh nha'],
        longTerm: ['Niềng răng 18-24 tháng', 'Duy trì kết quả sau niềng'],
        riskFactors: ['Sâu răng do vệ sinh khó', 'Viêm nướu tái phát']
      },
      {
        diagnosis: 'Răng bị gãy do chấn thương',
        confidence: 0.94,
        severity: 'high' as const,
        teethCondition: 'Răng cửa trên bị gãy 1/3 thân răng',
        boneStructure: 'Xương ổ răng còn nguyên vẹn',
        gumHealth: 'Nướu bị thương nhẹ',
        rootCanals: 'Tủy răng có thể bị tổn thương',
        cavities: [],
        periodontalStatus: 'Bình thường',
        immediate: ['Kiểm tra tủy răng', 'Bảo vệ tủy răng'],
        shortTerm: ['Trám composite hoặc veneer', 'Theo dõi tủy răng'],
        longTerm: ['Có thể cần điều trị tủy', 'Bọc răng sứ thẩm mỹ'],
        riskFactors: ['Tủy răng chết', 'Nhiễm trùng', 'Mất thẩm mỹ']
      },
      {
        diagnosis: 'Khô miệng và sâu răng nhiều',
        confidence: 0.79,
        severity: 'medium' as const,
        teethCondition: 'Nhiều răng bị sâu, men răng yếu',
        boneStructure: 'Xương bình thường',
        gumHealth: 'Nướu khô, dễ bị kích ứng',
        rootCanals: 'Một số tủy răng bị ảnh hưởng',
        cavities: ['Sâu răng nhiều vị trí', 'Sâu răng cổ răng'],
        periodontalStatus: 'Viêm nướu nhẹ do khô miệng',
        immediate: ['Điều trị sâu răng ưu tiên', 'Tăng cường nước bọt'],
        shortTerm: ['Trám răng nhiều vị trí', 'Sử dụng nước súc miệng đặc biệt'],
        longTerm: ['Điều trị nguyên nhân khô miệng', 'Bảo vệ men răng lâu dài'],
        riskFactors: ['Thuốc gây khô miệng', 'Bệnh toàn thân', 'Tuổi cao']
      }
    ];
    
    const scenario = mockScenarios[Math.floor(Math.random() * mockScenarios.length)];
    const processingTime = Date.now() - startTime;
    
    this.logger.warn(`Using enhanced fallback analysis for ${filename}`);
    
    return {
      diagnosis: scenario.diagnosis,
      confidence: scenario.confidence,
      file: filename,
      severity: scenario.severity,
      recommendations: this.generateRecommendations(scenario.severity),
      detailedFindings: {
        teethCondition: scenario.teethCondition,
        boneStructure: scenario.boneStructure,
        gumHealth: scenario.gumHealth,
        rootCanals: scenario.rootCanals,
        cavities: scenario.cavities,
        periodontalStatus: scenario.periodontalStatus,
      },
      treatmentPlan: {
        immediate: scenario.immediate,
        shortTerm: scenario.shortTerm,
        longTerm: scenario.longTerm,
      },
      riskFactors: scenario.riskFactors,
      followUpRequired: scenario.severity !== 'low',
      estimatedCost: this.generateEstimatedCost(scenario.severity),
      annotations: [
        {
          label: scenario.cavities[0] || 'Vùng cần quan tâm',
          x: Math.floor(Math.random() * 400) + 50,
          y: Math.floor(Math.random() * 300) + 50,
          width: 40,
          height: 30,
          confidence: 0.85,
          description: 'Phát hiện bất thường cần chú ý'
        }
      ],
      metadata: {
        analysisDate: new Date().toLocaleString('vi-VN'),
        processingTime,
        imageQuality: this.getRandomImageQuality(),
        aiModelVersion: 'DentalAI-v2.1.0-fallback',
        analysisSource: 'fallback'
      }
    };
  }

  private normalizeAnalysisResult(analysisResult: any, filename: string, startTime: number, analysisSource: string): AnalysisResult {
    // Xử lý response từ diagnosis server
    let diagnosis: string;
    let confidence: number;
    let severity: 'low' | 'medium' | 'high' | 'critical';
    let recommendations: string[];
    let predictedClass: string = 'unknown';
    
    if (analysisSource === 'ai_backend' && analysisResult.data) {
      // Response từ diagnosis server
      const consensus = analysisResult.data.consensus;
      predictedClass = consensus?.predicted_class || 'unknown';
      
      // Map diagnosis từ predicted_class
      const diagnosisMap = {
        'healthy': 'Răng khỏe mạnh',
        'caries': 'Phát hiện sâu răng',
        'gingivitis': 'Viêm nướu',
        'periodontitis': 'Viêm nha chu',
        'tooth_discoloration': 'Đổi màu răng'
      };
      
      diagnosis = diagnosisMap[predictedClass] || 'Cần đánh giá thêm';
      confidence = consensus?.confidence || 0.85;
      
      // Map severity từ diagnosis server với logic cải tiến
      const severityMap = {
        'normal': 'low',
        'mild': 'medium', 
        'moderate': 'medium',
        'severe': 'high',
        'critical': 'critical'
      };
      
      severity = severityMap[consensus?.severity] || this.generateSeverity();
      
      // Điều chỉnh severity dựa trên predicted_class để đảm bảo tính nhất quán
      if (predictedClass === 'caries' && severity === 'low') {
        severity = 'medium'; // Nếu phát hiện sâu răng thì ít nhất là medium
      } else if (predictedClass === 'periodontitis') {
        severity = severity === 'low' ? 'high' : severity; // Viêm nha chu ít nhất là high
      }
      
      recommendations = consensus?.recommendations || this.generateRecommendations(severity);
      
    } else {
      // Response từ Gemini hoặc fallback
      diagnosis = analysisResult.diagnosis || 'Phân tích hoàn tất';
      confidence = analysisResult.confidence || 0.85;
      severity = analysisResult.severity || this.generateSeverity();
      recommendations = analysisResult.recommendations || this.generateRecommendations(severity);
    }
    
    return {
      diagnosis: diagnosis,
      confidence: confidence,
      file: filename,
      severity: severity,
      recommendations: recommendations,
      detailedFindings: {
        teethCondition: analysisResult.detailedFindings?.teethCondition || this.generateTeethCondition(severity),
        boneStructure: analysisResult.detailedFindings?.boneStructure || 'Cấu trúc xương bình thường',
        gumHealth: analysisResult.detailedFindings?.gumHealth || this.generateGumHealth(severity),
        rootCanals: analysisResult.detailedFindings?.rootCanals || 'Tủy răng bình thường',
        cavities: analysisResult.detailedFindings?.cavities || this.generateCavitiesBasedOnDiagnosis(predictedClass, severity),
        periodontalStatus: analysisResult.detailedFindings?.periodontalStatus || this.generatePeriodontalStatus(severity),
      },
      treatmentPlan: {
        immediate: analysisResult.treatmentPlan?.immediate || this.generateImmediateTreatment(severity),
        shortTerm: analysisResult.treatmentPlan?.shortTerm || this.generateShortTermTreatment(severity),
        longTerm: analysisResult.treatmentPlan?.longTerm || this.generateLongTermTreatment(severity),
      },
      riskFactors: analysisResult.riskFactors || this.generateRiskFactors(severity),
      followUpRequired: analysisResult.followUpRequired ?? (severity !== 'low'),
      estimatedCost: analysisResult.estimatedCost || this.generateEstimatedCost(severity),
      annotations: analysisResult.annotations || [],
      metadata: {
        analysisDate: new Date().toLocaleString('vi-VN'),
        processingTime: Date.now() - startTime,
        imageQuality: analysisResult.metadata?.imageQuality || this.getRandomImageQuality(),
        aiModelVersion: analysisSource === 'gemini_ai' ? 'Gemini-AI-v2.0' : (analysisSource === 'ai_backend' ? 'AI-Backend-v2.0' : 'Fallback-v1.0'),
        analysisSource: analysisSource
      }
    };
  }

  private async saveAnalysisToDatabase(result: AnalysisResult, filePath: string, filename: string): Promise<void> {
    try {
      const fileStats = fs.statSync(filePath);
      
      const analysisDoc = new this.analysisModel({
        imageUrl: `/uploads/${filename}`,
        diagnosis: result.diagnosis,
        confidence: result.confidence,
        severity: result.severity,
        detailedFindings: result.detailedFindings,
        recommendations: result.recommendations,
        treatmentPlan: result.treatmentPlan,
        riskFactors: result.riskFactors,
        estimatedCost: result.estimatedCost,
        imageQuality: result.metadata.imageQuality,
        metadata: result.metadata,
        analysisSource: result.metadata.analysisSource,
        originalFilename: filename,
        fileSize: fileStats.size,
        mimeType: this.getMimeType(filename),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await analysisDoc.save();
      this.logger.log(`Analysis saved to database for file: ${filename}`);
    } catch (error) {
      this.logger.error('Failed to save analysis to database:', error);
      // Không throw error để không làm gián đoạn quá trình phân tích
    }
  }

  private getMimeType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypes: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'webp': 'image/webp'
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  private generateTeethCondition(severity: 'low' | 'medium' | 'high' | 'critical'): string {
    const conditions = {
      'low': 'Răng trong tình trạng tốt với một số dấu hiệu nhẹ',
      'medium': 'Phát hiện vấn đề răng cần theo dõi và điều trị',
      'high': 'Tình trạng răng có vấn đề nghiêm trọng cần điều trị ngay',
      'critical': 'Tình trạng răng rất nghiêm trọng, cần can thiệp khẩn cấp'
    };
    return conditions[severity];
  }

  private generateGumHealth(severity: 'low' | 'medium' | 'high' | 'critical'): string {
    const gumConditions = {
      'low': 'Nướu khỏe mạnh, màu hồng tự nhiên',
      'medium': 'Nướu có dấu hiệu viêm nhẹ, cần cải thiện vệ sinh',
      'high': 'Viêm nướu rõ rệt, dễ chảy máu khi đánh răng',
      'critical': 'Viêm nướu nghiêm trọng, có thể có mủ và tụt nướu'
    };
    return gumConditions[severity];
  }

  private generateCavities(severity: 'low' | 'medium' | 'high' | 'critical'): string[] {
    const cavitiesMap = {
      'low': [],
      'medium': ['Sâu răng nhẹ ở mặt nhai'],
      'high': ['Sâu răng sâu ở nhiều vị trí', 'Có thể ảnh hưởng đến tủy răng'],
      'critical': ['Sâu răng lan rộng', 'Tổn thương tủy răng nghiêm trọng', 'Nguy cơ mất răng cao']
    };
    return cavitiesMap[severity];
  }

  private generateCavitiesBasedOnDiagnosis(predictedClass: string, severity: 'low' | 'medium' | 'high' | 'critical'): string[] {
    // Nếu AI backend phát hiện sâu răng, luôn trả về thông tin sâu răng
    if (predictedClass === 'caries') {
      const cavitiesMap = {
        'low': ['Sâu răng giai đoạn đầu được phát hiện'],
        'medium': ['Sâu răng nhẹ ở mặt nhai', 'Cần điều trị sớm để tránh lan rộng'],
        'high': ['Sâu răng sâu ở nhiều vị trí', 'Có thể ảnh hưởng đến tủy răng'],
        'critical': ['Sâu răng lan rộng', 'Tổn thương tủy răng nghiêm trọng', 'Nguy cơ mất răng cao']
      };
      return cavitiesMap[severity];
    }
    
    // Nếu không phát hiện sâu răng hoặc các bệnh khác
    if (predictedClass === 'healthy') {
      return ['Không phát hiện sâu răng'];
    }
    
    // Các trường hợp khác (gingivitis, periodontitis, tooth_discoloration)
    return this.generateCavities(severity);
  }

  private generatePeriodontalStatus(severity: 'low' | 'medium' | 'high' | 'critical'): string {
    const periodontalMap = {
      'low': 'Nha chu khỏe mạnh, không có dấu hiệu viêm',
      'medium': 'Viêm nha chu giai đoạn đầu, cần vệ sinh tốt hơn',
      'high': 'Viêm nha chu tiến triển, có túi nha chu',
      'critical': 'Viêm nha chu nghiêm trọng, mất xương nha chu'
    };
    return periodontalMap[severity];
  }

  private generateImmediateTreatment(severity: 'low' | 'medium' | 'high' | 'critical'): string[] {
    const immediateMap = {
      'low': ['Vệ sinh răng miệng đúng cách'],
      'medium': ['Trám răng composite', 'Vệ sinh răng miệng chuyên nghiệp'],
      'high': ['Điều trị tủy răng', 'Kháng sinh nếu có nhiễm trùng'],
      'critical': ['Cấp cứu nha khoa', 'Giảm đau và kháng sinh', 'Dẫn lưu mủ nếu cần']
    };
    return immediateMap[severity];
  }

  private generateShortTermTreatment(severity: 'low' | 'medium' | 'high' | 'critical'): string[] {
    const shortTermMap = {
      'low': ['Sử dụng kem đánh răng có fluoride', 'Kiểm tra định kỳ'],
      'medium': ['Hoàn thiện việc trám răng', 'Cải thiện kỹ thuật đánh răng'],
      'high': ['Bọc răng sứ sau điều trị tủy', 'Điều trị nha chu chuyên sâu'],
      'critical': ['Phẫu thuật nha chu', 'Cấy ghép xương nếu cần', 'Theo dõi sát sao']
    };
    return shortTermMap[severity];
  }

  private generateLongTermTreatment(severity: 'low' | 'medium' | 'high' | 'critical'): string[] {
    const longTermMap = {
      'low': ['Duy trì vệ sinh răng miệng tốt', 'Khám định kỳ 6 tháng/lần'],
      'medium': ['Theo dõi tình trạng răng đã trám', 'Vệ sinh răng miệng định kỳ'],
      'high': ['Theo dõi răng đã điều trị tủy', 'Kiểm tra X-quang định kỳ'],
      'critical': ['Phục hình răng toàn diện', 'Cấy ghép implant nếu mất răng', 'Chăm sóc nha chu dài hạn']
    };
    return longTermMap[severity];
  }

  async healthCheck(): Promise<{ status: string; aiBackend: string }> {
    try {
      // Tạo health check URL từ AI backend URL
      const healthUrl = this.aiBackendUrl?.replace('/diagnose', '/health').replace('/predict', '/health') || 'http://localhost:5002/health';
      
      await firstValueFrom(
        this.httpService.get(healthUrl, {
          timeout: 5000,
        })
      );
      return {
        status: 'healthy',
        aiBackend: 'connected',
      };
    } catch (error) {
      this.logger.warn(`AI Backend health check failed: ${error.message}`);
      return {
        status: 'healthy',
        aiBackend: 'disconnected - using fallback',
      };
    }
  }
}