import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { UsersModule } from '../users/users.module';
import { ImageAnalysisController } from './image-analysis.controller';
import { ImageAnalysisService } from './image-analysis.service';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads/images',
    }),
    HttpModule,
    UsersModule,
    CloudinaryModule,
  ],
  controllers: [ImageAnalysisController],
  providers: [ImageAnalysisService],
  exports: [ImageAnalysisService],
})
export class ImageAnalysisModule {}
