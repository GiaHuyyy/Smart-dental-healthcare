import {
    BadRequestException,
    Controller,
    Get,
    Logger,
    Post,
    Request,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../auth/passport/jwt-auth.guard';
import { Public } from '../../decorator/customize';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import {
    ImageAnalysisResult,
    ImageAnalysisService,
} from './image-analysis.service';

@Controller('image-analysis')
@UseGuards(JwtAuthGuard)
export class ImageAnalysisController {
  private readonly logger = new Logger(ImageAnalysisController.name);

  constructor(
    private readonly imageAnalysisService: ImageAnalysisService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  @Public()
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      fileFilter: (req, file, callback) => {
        if (!file.originalname?.match(/\.(jpg|jpeg|png|gif)$/)) {
          return callback(
            new BadRequestException(
              'Chỉ chấp nhận file ảnh (jpg, jpeg, png, gif)!',
            ),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadAndAnalyze(
    @UploadedFile() file: any,
    @Request() req: any,
  ): Promise<{
    success: boolean;
    data?: ImageAnalysisResult;
    error?: string;
  }> {
    try {
      this.logger.log(
        `Upload request received. File: ${file ? 'exists' : 'null'}`,
      );
      this.logger.log(`Request body:`, req.body);

      if (!file) {
        this.logger.error('No file uploaded');
        throw new BadRequestException('Không có file được upload');
      }

      // For demo purposes, use a default user ID when no authentication
      const userId = req.user?.id || 'demo_user_' + Date.now();

      this.logger.log(
        `Processing image upload for user ${userId}: ${file.originalname} (${file.size} bytes)`,
      );

      // Upload to Cloudinary first
      const cloudinaryResult = await this.cloudinaryService.uploadImage(file);
      this.logger.log(`Image uploaded to Cloudinary: ${cloudinaryResult.url}`);

      const analysisResult = await this.imageAnalysisService.analyzeImage(
        cloudinaryResult.url,
        userId as string,
      );

      // Add Cloudinary URL to the result
      analysisResult.cloudinaryUrl = cloudinaryResult.url;
      analysisResult.cloudinaryPublicId = cloudinaryResult.public_id;

      return {
        success: true,
        data: analysisResult,
      };
    } catch (error) {
      this.logger.error(`Image analysis failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Public()
  @Get('health')
  async healthCheck(): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const serviceHealthy =
        await this.imageAnalysisService.checkServiceHealth();

      return {
        success: true,
        data: {
          status: 'healthy',
          geminiService: serviceHealthy ? 'connected' : 'disconnected',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
