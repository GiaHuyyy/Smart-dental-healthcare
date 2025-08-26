import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { ChatbotController } from './chatbot.controller';
import { ChatbotGateway } from './chatbot.gateway';
import { ChatbotService } from './chatbot.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    MulterModule.register({
      dest: './uploads',
    }),
  ],
  controllers: [ChatbotController],
  providers: [ChatbotService, ChatbotGateway],
  exports: [ChatbotService],
})
export class ChatbotModule {}
