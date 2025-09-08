import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiChatHistoryService } from './ai-chat-history.service';
import {
  CreateAiChatSessionDto,
  CreateAiChatMessageDto,
  UpdateAiChatSessionDto,
} from './dto/ai-chat-history.dto';
import { JwtAuthGuard } from '../../auth/passport/jwt-auth.guard';
import { Public } from 'src/decorator/customize';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('ai-chat-history')
@Public() // Remove this in production and use proper auth
export class AiChatHistoryController {
  constructor(
    private readonly aiChatHistoryService: AiChatHistoryService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // Session endpoints
  @Post('sessions')
  async createSession(@Body() createSessionDto: CreateAiChatSessionDto) {
    return await this.aiChatHistoryService.createSession(createSessionDto);
  }

  @Get('sessions/:sessionId')
  async getSession(@Param('sessionId') sessionId: string) {
    return await this.aiChatHistoryService.getSessionById(sessionId);
  }

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

  @Put('sessions/:sessionId')
  async updateSession(
    @Param('sessionId') sessionId: string,
    @Body() updateDto: UpdateAiChatSessionDto,
  ) {
    return await this.aiChatHistoryService.updateSession(sessionId, updateDto);
  }

  // Message endpoints
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

  @Get('sessions/:sessionId/full')
  async getSessionWithMessages(@Param('sessionId') sessionId: string) {
    return await this.aiChatHistoryService.getSessionMessagesWithSession(
      sessionId,
    );
  }

  // Analytics endpoints
  @Get('users/:userId/stats')
  async getUserStats(@Param('userId') userId: string) {
    return await this.aiChatHistoryService.getUserChatStats(userId);
  }

  @Get('users/:userId/search')
  async searchUserSessions(
    @Param('userId') userId: string,
    @Query('q') searchQuery: string = '',
    @Query('urgency') urgencyLevel?: string,
    @Query('hasImage') hasImage?: string,
    @Query('tags') tags?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const filters: any = {};

    if (urgencyLevel) filters.urgencyLevel = urgencyLevel;
    if (hasImage !== undefined) filters.hasImageAnalysis = hasImage === 'true';
    if (tags) filters.tags = tags.split(',');
    if (dateFrom) filters.dateFrom = new Date(dateFrom);
    if (dateTo) filters.dateTo = new Date(dateTo);

    return await this.aiChatHistoryService.searchSessions(
      userId,
      searchQuery,
      Object.keys(filters).length > 0 ? filters : undefined,
    );
  }

  @Post('sessions/:sessionId/summary')
  async generateSummary(@Param('sessionId') sessionId: string) {
    const summary =
      await this.aiChatHistoryService.generateSessionSummary(sessionId);
    return { summary };
  }

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
