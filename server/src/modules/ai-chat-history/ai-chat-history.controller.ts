import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiChatHistoryService } from './ai-chat-history.service';
import {
  CreateAiChatMessageDto,
  UpdateAiChatSessionDto,
} from './dto/ai-chat-history.dto';
import { CreateAiChatSessionDto } from './dto/ai-chat-history.dto';
import { Public } from 'src/decorator/customize';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('ai-chat-history')
@Public()
export class AiChatHistoryController {
  constructor(
    private readonly aiChatHistoryService: AiChatHistoryService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post('sessions')
  async createSession(@Body() createSessionDto: CreateAiChatSessionDto) {
    return await this.aiChatHistoryService.createSession(
      createSessionDto as any,
    );
  }

  // Essential session endpoints
  @Get('users/:userId/sessions')
  async getUserSessions(
    @Param('userId') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return await this.aiChatHistoryService.getUserSessions(
      userId,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Get('sessions/:sessionId')
  async getSession(@Param('sessionId') sessionId: string) {
    return await this.aiChatHistoryService.getSessionById(sessionId);
  }

  @Put('sessions/:sessionId')
  async updateSession(
    @Param('sessionId') sessionId: string,
    @Body() updateDto: UpdateAiChatSessionDto,
  ) {
    return await this.aiChatHistoryService.updateSession(sessionId, updateDto);
  }

  @Delete('sessions/:sessionId/messages')
  async clearSessionMessages(@Param('sessionId') sessionId: string) {
    return await this.aiChatHistoryService.clearSessionMessages(sessionId);
  }

  // Essential message endpoints
  @Post('messages')
  async addMessage(@Body() createMessageDto: CreateAiChatMessageDto) {
    return await this.aiChatHistoryService.addMessage(createMessageDto);
  }

  @Get('sessions/:sessionId/messages')
  async getSessionMessages(
    @Param('sessionId') sessionId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    return await this.aiChatHistoryService.getSessionMessages(
      sessionId,
      parseInt(page),
      parseInt(limit),
    );
  }

  // Image upload for chat
  @Post('upload-image')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    try {
      const result = await this.cloudinaryService.uploadImage(file);
      return {
        success: true,
        url: result.url,
        public_id: result.public_id,
      };
    } catch (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
}
