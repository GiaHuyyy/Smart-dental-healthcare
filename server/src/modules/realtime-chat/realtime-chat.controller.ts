import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { RealtimeChatService } from './realtime-chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MarkMessageReadDto } from './dto/chat-actions.dto';
import { JwtAuthGuard } from '../../auth/passport/jwt-auth.guard';
import { Public } from 'src/decorator/customize';

@Controller('realtime-chat')
@Public()
export class RealtimeChatController {
  constructor(private readonly realtimeChatService: RealtimeChatService) {}

  @Post('conversations')
  async createConversation(
    @Body() body: { patientId: string; doctorId: string },
  ) {
    const createConversationDto: CreateConversationDto = {
      patientId: new Types.ObjectId(body.patientId),
      doctorId: new Types.ObjectId(body.doctorId),
    };

    return await this.realtimeChatService.createConversation(
      createConversationDto,
    );
  }

  @Get('conversations')
  async getUserConversations(
    @Query('userId') userId: string,
    @Query('userRole') userRole: 'patient' | 'doctor',
  ) {
    if (!userId || !userRole) {
      throw new BadRequestException('userId and userRole are required');
    }

    return await this.realtimeChatService.getUserConversations(
      new Types.ObjectId(userId),
      userRole,
    );
  }

  @Get('conversations/:conversationId')
  async getConversation(
    @Param('conversationId') conversationId: string,
    @Request() req: any,
  ) {
    const conversation = await this.realtimeChatService.getConversationById(
      new Types.ObjectId(conversationId),
    );

    // Verify user is participant
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (
      (userRole === 'patient' && !conversation.patientId._id.equals(userId)) ||
      (userRole === 'doctor' && !conversation.doctorId._id.equals(userId))
    ) {
      throw new BadRequestException(
        'You are not a participant in this conversation',
      );
    }

    return conversation;
  }

  @Get('conversations/:conversationId/messages')
  async getConversationMessages(
    @Param('conversationId') conversationId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('userId') userId?: string,
    @Query('userRole') userRole?: 'patient' | 'doctor',
  ) {
    // For public access (testing), use query params
    if (userId && userRole) {
      return await this.realtimeChatService.getConversationMessages(
        new Types.ObjectId(conversationId),
        new Types.ObjectId(userId),
        userRole,
        parseInt(page),
        parseInt(limit),
      );
    }

    // For authenticated requests, use request user
    // const authUserId = new Types.ObjectId(req.user.userId);
    // const authUserRole = req.user.role;

    // return await this.realtimeChatService.getConversationMessages(
    //   new Types.ObjectId(conversationId),
    //   authUserId,
    //   authUserRole,
    //   parseInt(page),
    //   parseInt(limit),
    // );

    throw new BadRequestException(
      'userId and userRole are required for public access',
    );
  }

  // Simple endpoint for sending messages
  @Post('messages')
  async sendSimpleMessage(
    @Body()
    body: {
      conversationId: string;
      senderId: string;
      content: string;
      type?: string;
    },
  ) {
    const sendMessageDto = {
      conversationId: new Types.ObjectId(body.conversationId),
      senderId: new Types.ObjectId(body.senderId),
      content: body.content,
      type: body.type || 'text',
    };

    // Determine user role by checking conversation participants
    const conversation = await this.realtimeChatService.getConversationById(
      new Types.ObjectId(body.conversationId),
    );

    if (!conversation) {
      throw new BadRequestException('Conversation not found');
    }

    console.log('Conversation found:', {
      id: conversation._id,
      patientId: conversation.patientId,
      doctorId: conversation.doctorId,
      senderId: body.senderId,
    });

    let userRole: 'patient' | 'doctor' = 'patient';

    // Extract actual IDs from potentially populated objects
    const doctorIdStr = (
      conversation.doctorId?._id || conversation.doctorId
    )?.toString();
    const patientIdStr = (
      conversation.patientId?._id || conversation.patientId
    )?.toString();

    console.log('Doctor ID comparison:', {
      doctorId: conversation.doctorId,
      doctorIdExtracted: doctorIdStr,
      senderId: body.senderId,
      isEqual: doctorIdStr === body.senderId,
    });

    if (conversation.doctorId && doctorIdStr === body.senderId) {
      userRole = 'doctor';
    }

    console.log('Determined user role:', userRole);

    return await this.realtimeChatService.sendMessage(
      new Types.ObjectId(body.senderId),
      userRole,
      sendMessageDto,
    );
  }

  @Post('conversations/:conversationId/messages')
  async sendMessage(
    @Param('conversationId') conversationId: string,
    @Body() sendMessageDto: Omit<SendMessageDto, 'conversationId'>,
    @Request() req: any,
  ) {
    const userId = new Types.ObjectId(req.user.userId);
    const userRole = req.user.role;

    const fullSendMessageDto: SendMessageDto = {
      ...sendMessageDto,
      conversationId: new Types.ObjectId(conversationId),
    };

    return await this.realtimeChatService.sendMessage(
      userId,
      userRole,
      fullSendMessageDto,
    );
  }

  @Post('conversations/:conversationId/messages/:messageId/read')
  async markMessageAsRead(
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @Request() req: any,
  ) {
    const userId = new Types.ObjectId(req.user.userId);
    const userRole = req.user.role;

    await this.realtimeChatService.markMessageAsRead(
      new Types.ObjectId(conversationId),
      new Types.ObjectId(messageId),
      userId,
      userRole,
    );

    return { success: true };
  }

  // Mark conversation as read (reset unread count for user)
  @Patch('conversations/:conversationId/mark-read')
  async markConversationAsRead(
    @Param('conversationId') conversationId: string,
    @Body() body: { userRole: 'patient' | 'doctor' },
    @Request() req: any,
  ) {
    const userId = new Types.ObjectId(req.user?.userId || req.user?.id);
    const userRole = body.userRole || req.user?.role;

    return await this.realtimeChatService.markConversationAsRead(
      new Types.ObjectId(conversationId),
      userId,
      userRole,
    );
  }

  @Get('conversations/with/:otherUserId')
  async getConversationWithUser(
    @Param('otherUserId') otherUserId: string,
    @Request() req: any,
  ) {
    const userId = new Types.ObjectId(req.user.userId);
    const userRole = req.user.role;
    const targetUserId = new Types.ObjectId(otherUserId);

    let conversation;
    if (userRole === 'patient') {
      // Patient talking to doctor
      conversation =
        await this.realtimeChatService.getConversationByParticipants(
          userId,
          targetUserId,
        );
    } else {
      // Doctor talking to patient
      conversation =
        await this.realtimeChatService.getConversationByParticipants(
          targetUserId,
          userId,
        );
    }

    if (!conversation) {
      // Create new conversation if it doesn't exist
      const createConversationDto: CreateConversationDto = {
        patientId: userRole === 'patient' ? userId : targetUserId,
        doctorId: userRole === 'doctor' ? userId : targetUserId,
      };
      conversation = await this.realtimeChatService.createConversation(
        createConversationDto,
      );
    }

    return conversation;
  }
}
