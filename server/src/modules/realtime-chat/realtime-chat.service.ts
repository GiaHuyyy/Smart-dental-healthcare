import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
} from './schemas/conversation.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class RealtimeChatService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  async createConversation(
    createConversationDto: CreateConversationDto,
  ): Promise<ConversationDocument> {
    const { patientId, doctorId } = createConversationDto;

    // Check if conversation already exists
    const existingConversation = await this.conversationModel.findOne({
      patientId,
      doctorId,
    });

    if (existingConversation) {
      return existingConversation;
    }

    const conversation = new this.conversationModel({
      patientId,
      doctorId,
    });

    return await conversation.save();
  }

  async getConversationByParticipants(
    patientId: Types.ObjectId,
    doctorId: Types.ObjectId,
  ): Promise<ConversationDocument | null> {
    return await this.conversationModel
      .findOne({
        patientId,
        doctorId,
      })
      .populate('lastMessage');
  }

  async getUserConversations(
    userId: Types.ObjectId,
    userRole: 'patient' | 'doctor',
  ): Promise<ConversationDocument[]> {
    const query =
      userRole === 'patient' ? { patientId: userId } : { doctorId: userId };

    return await this.conversationModel
      .find(query)
      .populate('lastMessage')
      .populate('patientId', 'fullName firstName lastName avatar email')
      .populate(
        'doctorId',
        'fullName firstName lastName avatar email specialty',
      )
      .sort({ lastMessageAt: -1 });
  }

  async sendMessage(
    senderId: Types.ObjectId,
    senderRole: 'patient' | 'doctor',
    sendMessageDto: SendMessageDto,
  ): Promise<MessageDocument> {
    const {
      conversationId,
      content,
      messageType = 'text',
      fileUrl,
      fileName,
      fileType,
      fileSize,
      replyTo,
    } = sendMessageDto;

    // Verify conversation exists and sender is participant
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    console.log('=== PARTICIPANT VERIFICATION ===');
    console.log('senderRole:', senderRole);
    console.log('senderId:', senderId, 'type:', typeof senderId);
    console.log(
      'conversation.patientId:',
      conversation.patientId,
      'type:',
      typeof conversation.patientId,
    );
    console.log(
      'conversation.doctorId:',
      conversation.doctorId,
      'type:',
      typeof conversation.doctorId,
    );
    console.log('senderId.toString():', senderId.toString());
    console.log(
      'conversation.patientId.toString():',
      conversation.patientId.toString(),
    );
    console.log(
      'conversation.doctorId.toString():',
      conversation.doctorId.toString(),
    );

    // Extract actual IDs from potentially populated objects
    const patientIdStr = (
      conversation.patientId?._id || conversation.patientId
    ).toString();
    const doctorIdStr = (
      conversation.doctorId?._id || conversation.doctorId
    ).toString();
    const senderIdStr = senderId.toString();

    const isPatientMatch =
      senderRole === 'patient' && patientIdStr === senderIdStr;
    const isDoctorMatch =
      senderRole === 'doctor' && doctorIdStr === senderIdStr;

    console.log('isPatientMatch:', isPatientMatch);
    console.log('isDoctorMatch:', isDoctorMatch);
    console.log('isParticipant:', isPatientMatch || isDoctorMatch);

    if (!isPatientMatch && !isDoctorMatch) {
      console.log('❌ PARTICIPANT CHECK FAILED');
      throw new BadRequestException(
        'You are not a participant in this conversation',
      );
    }

    console.log('✅ PARTICIPANT CHECK PASSED');

    // Create message
    const message = new this.messageModel({
      conversationId,
      senderId,
      senderRole,
      content,
      messageType,
      fileUrl,
      fileName,
      fileType,
      fileSize,
      replyTo,
    });

    const savedMessage = await message.save();

    // Update conversation
    await this.conversationModel.findByIdAndUpdate(conversationId, {
      $push: { messages: savedMessage._id },
      lastMessage: savedMessage._id,
      lastMessageAt: new Date(),
      // Increment unread count for the other participant
      ...(senderRole === 'patient'
        ? { $inc: { unreadDoctorCount: 1 } }
        : { $inc: { unreadPatientCount: 1 } }),
    });

    const populatedMessage = await this.messageModel
      .findById(savedMessage._id)
      .populate('senderId', 'firstName lastName avatar')
      .populate('replyTo');

    if (!populatedMessage) {
      throw new Error('Failed to retrieve saved message');
    }

    return populatedMessage;
  }

  async getConversationMessages(
    conversationId: Types.ObjectId,
    userId: Types.ObjectId,
    userRole: 'patient' | 'doctor',
    page: number = 1,
    limit: number = 50,
  ): Promise<MessageDocument[]> {
    // Verify user is participant in conversation
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (
      (userRole === 'patient' && !conversation.patientId.equals(userId)) ||
      (userRole === 'doctor' && !conversation.doctorId.equals(userId))
    ) {
      throw new BadRequestException(
        'You are not a participant in this conversation',
      );
    }

    const skip = (page - 1) * limit;

    // Fetch newest first to ensure recent messages are included, then reverse
    const newestFirst = await this.messageModel
      .find({ conversationId, isDeleted: false })
      .select(
        'conversationId senderId senderRole content messageType fileUrl fileName fileType fileSize isRead readAt createdAt updatedAt',
      )
      .populate('senderId', 'firstName lastName avatar')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return newestFirst.reverse() as any;
  }

  async markMessageAsRead(
    conversationId: Types.ObjectId,
    messageId: Types.ObjectId,
    userId: Types.ObjectId,
    userRole: 'patient' | 'doctor',
  ): Promise<void> {
    // Verify user is participant in conversation
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (
      (userRole === 'patient' && !conversation.patientId.equals(userId)) ||
      (userRole === 'doctor' && !conversation.doctorId.equals(userId))
    ) {
      throw new BadRequestException(
        'You are not a participant in this conversation',
      );
    }

    // Mark message as read
    await this.messageModel.findByIdAndUpdate(messageId, {
      isRead: true,
      readAt: new Date(),
    });

    // Reset unread count for this user
    const updateField =
      userRole === 'patient' ? 'unreadPatientCount' : 'unreadDoctorCount';
    await this.conversationModel.findByIdAndUpdate(conversationId, {
      [updateField]: 0,
    });
  }

  // Mark conversation as read (reset unread count for user)
  async markConversationAsRead(
    conversationId: Types.ObjectId,
    userId: Types.ObjectId,
    userRole: 'patient' | 'doctor',
  ): Promise<ConversationDocument> {
    // Find conversation and verify it exists
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Reset unread count for this user
    const updateField =
      userRole === 'patient' ? 'unreadPatientCount' : 'unreadDoctorCount';

    const updatedConversation = await this.conversationModel.findByIdAndUpdate(
      conversationId,
      { [updateField]: 0 },
      { new: true },
    );

    if (!updatedConversation) {
      throw new NotFoundException('Failed to update conversation');
    }

    return updatedConversation;
  }

  async updateTypingStatus(
    conversationId: Types.ObjectId,
    userId: Types.ObjectId,
    userRole: 'patient' | 'doctor',
    isTyping: boolean,
  ): Promise<void> {
    const updateField =
      userRole === 'patient' ? 'isPatientTyping' : 'isDoctorTyping';

    await this.conversationModel.findByIdAndUpdate(conversationId, {
      [updateField]: isTyping,
    });
  }

  async getConversationById(
    conversationId: Types.ObjectId,
  ): Promise<ConversationDocument> {
    const conversation = await this.conversationModel
      .findById(conversationId)
      .populate('patientId', 'firstName lastName avatar email')
      .populate('doctorId', 'firstName lastName avatar email specialization')
      .populate('lastMessage');

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async createCallMessage(
    senderId: string,
    receiverId: string,
    senderRole: 'patient' | 'doctor',
    callData: {
      callType: 'audio' | 'video';
      callStatus: 'missed' | 'answered' | 'rejected' | 'completed';
      callDuration: number;
      startedAt: Date;
      endedAt?: Date;
    },
  ): Promise<MessageDocument> {
    // Find or create conversation
    const patientId = senderRole === 'patient' ? senderId : receiverId;
    const doctorId = senderRole === 'doctor' ? senderId : receiverId;

    let conversation = await this.getConversationByParticipants(
      new Types.ObjectId(patientId),
      new Types.ObjectId(doctorId),
    );

    if (!conversation) {
      conversation = await this.createConversation({
        patientId: new Types.ObjectId(patientId),
        doctorId: new Types.ObjectId(doctorId),
      });
    }

    // Create message
    const message = new this.messageModel({
      conversationId: conversation._id,
      senderId: new Types.ObjectId(senderId),
      senderRole,
      content: '',
      messageType: 'call',
      callData,
    });

    const savedMessage = await message.save();

    // Update conversation's last message
    conversation.lastMessage = savedMessage._id as Types.ObjectId;
    await conversation.save();

    return savedMessage;
  }

  async updateCallStatus(
    messageId: string,
    callStatus: 'missed' | 'answered' | 'rejected' | 'completed',
    callDuration: number = 0,
    endedAt: Date = new Date(),
  ): Promise<MessageDocument> {
    const message = await this.messageModel.findById(messageId);
    if (!message || message.messageType !== 'call') {
      throw new NotFoundException('Call message not found');
    }

    message.callData = {
      ...message.callData,
      callStatus,
      callDuration,
      endedAt,
    };

    return await message.save();
  }
}
