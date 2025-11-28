import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeocodingResult {
  success: boolean;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
  error?: string;
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly geminiApiKey: string;
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(private readonly configService: ConfigService) {
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY') || '';

    if (this.geminiApiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(this.geminiApiKey);
        this.model = this.genAI.getGenerativeModel({
          model: 'gemini-2.5-pro',
        });
        this.logger.log('GeocodingService initialized with Gemini AI');
      } catch (error) {
        this.logger.error('Failed to initialize Gemini AI:', error);
      }
    } else {
      this.logger.warn('GEMINI_API_KEY not configured');
    }
  }

  async geocodeAddress(address: string): Promise<GeocodingResult> {
    if (!address || !address.trim()) {
      return {
        success: false,
        error: 'Địa chỉ không được để trống',
      };
    }

    if (!this.model) {
      return {
        success: false,
        error: 'Gemini AI chưa được cấu hình',
      };
    }

    try {
      this.logger.log(`Geocoding address: ${address}`);

      const prompt = `Bạn là một chuyên gia về địa lý Việt Nam. Hãy xác định tọa độ GPS (latitude, longitude) chính xác cho địa chỉ sau tại Việt Nam:

Địa chỉ: "${address}"

Yêu cầu:
1. Xác định tọa độ GPS chính xác nhất có thể cho địa chỉ này
2. Nếu địa chỉ không đầy đủ, hãy suy luận dựa trên các thông tin có sẵn (tên đường, quận/huyện, thành phố)
3. Ưu tiên các địa điểm nổi tiếng, bệnh viện, phòng khám nếu có trong địa chỉ

Trả về kết quả theo định dạng JSON sau (chỉ trả về JSON, không có text khác):
{
  "latitude": <số thập phân>,
  "longitude": <số thập phân>,
  "formattedAddress": "<địa chỉ đầy đủ đã được format>",
  "confidence": "<high/medium/low>"
}

Nếu không thể xác định tọa độ, trả về:
{
  "error": "<lý do không thể xác định>"
}`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      this.logger.log(`Gemini response: ${text}`);

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          success: false,
          error: 'Không thể phân tích kết quả từ AI',
        };
      }

      const parsedResult = JSON.parse(jsonMatch[0] as string);

      if (parsedResult.error) {
        return {
          success: false,
          error: parsedResult.error,
        };
      }

      if (
        typeof parsedResult.latitude === 'number' &&
        typeof parsedResult.longitude === 'number'
      ) {
        // Validate coordinates are within Vietnam bounds
        const lat = parsedResult.latitude;
        const lng = parsedResult.longitude;

        // Vietnam bounds: 8.18°N to 23.39°N, 102.14°E to 109.46°E
        if (lat < 8 || lat > 24 || lng < 102 || lng > 110) {
          this.logger.warn(`Coordinates outside Vietnam: ${lat}, ${lng}`);
          // Still return but log warning
        }

        return {
          success: true,
          latitude: lat,
          longitude: lng,
          formattedAddress: parsedResult.formattedAddress || address,
        };
      }

      return {
        success: false,
        error: 'Tọa độ không hợp lệ',
      };
    } catch (error) {
      this.logger.error('Geocoding error:', error);
      return {
        success: false,
        error: 'Lỗi khi xử lý yêu cầu geocoding',
      };
    }
  }
}
