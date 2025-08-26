import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { AnalyzeController } from './analyze.controller';
import { AnalyzeService } from './analyze.service';
import { GeminiService } from './gemini.service';
import { Analysis, AnalysisSchema } from './schemas/analysis.schema';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    MongooseModule.forFeature([{ name: Analysis.name, schema: AnalysisSchema }]),
    CloudinaryModule,
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, callback) => {
          callback(null, './uploads');
        },
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return callback(new Error('Only image files are allowed!'), false);
        }
        callback(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  controllers: [AnalyzeController],
  providers: [AnalyzeService, GeminiService],
})
export class AnalyzeModule {}