import {
    BadRequestException,
    Controller,
    Get,
    Logger,
    Post,
    UploadedFile,
    UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { AnalysisResult, AnalyzeService } from './analyze.service';

@Controller('analyze')
export class AnalyzeController {
  private readonly logger = new Logger(AnalyzeController.name);

  constructor(
    private readonly analyzeService: AnalyzeService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('xray'))
  async analyzeXray(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<AnalysisResult> {
    if (!file) {
      throw new BadRequestException('No X-ray image file provided');
    }

    this.logger.log(`Received X-ray file: ${file.originalname} (${file.size} bytes)`);

    try {
      // Upload to Cloudinary first
      const cloudinaryResult = await this.cloudinaryService.uploadImage(file.path, file.filename);
      this.logger.log(`Image uploaded to Cloudinary: ${cloudinaryResult.url}`);

      const result = await this.analyzeService.analyzeXray(
        cloudinaryResult.url,
        file.filename,
      );

      // Add Cloudinary information to result
      result.cloudinaryUrl = cloudinaryResult.url;
      result.cloudinaryPublicId = cloudinaryResult.public_id;

      this.logger.log(`Analysis completed for ${file.filename}`);
      return result;
    } catch (error) {
      this.logger.error(`Analysis failed: ${error.message}`);
      throw new BadRequestException('Failed to analyze X-ray image');
    }
  }

  @Get('health')
  async healthCheck() {
    return await this.analyzeService.healthCheck();
  }
}