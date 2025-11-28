import {
  BadRequestException,
  Controller,
  Logger,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Public } from '../../decorator/customize';
import { CloudinaryService } from './cloudinary.service';

@Controller('cloudinary')
export class CloudinaryController {
  private readonly logger = new Logger(CloudinaryController.name);

  constructor(private readonly cloudinaryService: CloudinaryService) {}

  /**
   * Simple upload endpoint - just uploads to Cloudinary and returns URL
   * Used for avatar, license images, etc.
   */
  @Public()
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, callback) => {
        if (!file.originalname?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          return callback(
            new BadRequestException(
              'Chỉ chấp nhận file ảnh (jpg, jpeg, png, gif, webp)!',
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
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ): Promise<{
    success: boolean;
    url?: string;
    secure_url?: string;
    public_id?: string;
    error?: string;
  }> {
    try {
      this.logger.log(
        `Upload request received. File: ${file ? file.originalname : 'null'}`,
      );

      if (!file) {
        this.logger.error('No file uploaded');
        throw new BadRequestException('Không có file được upload');
      }

      // Check if Cloudinary is configured
      if (!this.cloudinaryService.isCloudinaryConfigured()) {
        this.logger.error('Cloudinary is not configured');
        return {
          success: false,
          error:
            'Dịch vụ lưu trữ ảnh chưa được cấu hình. Vui lòng liên hệ quản trị viên.',
        };
      }

      this.logger.log(
        `Uploading file: ${file.originalname} (${file.size} bytes) to folder: ${folder || 'default'}`,
      );

      // Upload to Cloudinary with custom folder
      const result = await this.cloudinaryService.uploadImageWithFolder(
        file,
        folder || 'smart-dental-healthcare',
      );

      this.logger.log(`File uploaded successfully: ${result.url}`);

      return {
        success: true,
        url: result.url,
        secure_url: result.url,
        public_id: result.public_id,
      };
    } catch (error) {
      this.logger.error(`Upload failed: ${error.message}`);
      return {
        success: false,
        error:
          error.message ||
          'Không thể upload ảnh. Vui lòng kiểm tra kết nối và thử lại.',
      };
    }
  }
}
