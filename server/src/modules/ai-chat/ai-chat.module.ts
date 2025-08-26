import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { UsersModule } from '../users/users.module';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';

@Module({
  imports: [UsersModule, CloudinaryModule],
  controllers: [AiChatController],
  providers: [AiChatService],
  exports: [AiChatService],
})
export class AiChatModule {}
