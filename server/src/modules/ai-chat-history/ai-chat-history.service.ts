import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AiChatSession,
  AiChatSessionDocument,
} from './schemas/ai-chat-session.schema';
import {
  AiChatMessage,
  AiChatMessageDocument,
} from './schemas/ai-chat-message.schema';
import {
  CreateAiChatSessionDto,
  CreateAiChatMessageDto,
  UpdateAiChatSessionDto,
} from './dto/ai-chat-history.dto';

@Injectable()
export class AiChatHistoryService {
  constructor(
    @InjectModel(AiChatSession.name)
    private aiChatSessionModel: Model<AiChatSessionDocument>,
    @InjectModel(AiChatMessage.name)
    private aiChatMessageModel: Model<AiChatMessageDocument>,
  ) {}

  // Session management
  async createSession(
    createSessionDto: CreateAiChatSessionDto,
  ): Promise<AiChatSessionDocument> {
    if (!createSessionDto.userId) {
      throw new Error('User ID is required');
    }

    const session = new this.aiChatSessionModel({
      ...createSessionDto,
      userId: new Types.ObjectId(createSessionDto.userId),
      suggestedDoctorId: createSessionDto.suggestedDoctorId
        ? new Types.ObjectId(createSessionDto.suggestedDoctorId)
        : undefined,
    });

    return await session.save();
  }

  async getSessionById(sessionId: string): Promise<AiChatSessionDocument> {
    const session = await this.aiChatSessionModel
      .findById(sessionId)
      .populate('userId', 'firstName lastName email')
      .populate('suggestedDoctorId', 'firstName lastName specialization');

    if (!session) {
      throw new NotFoundException('AI chat session not found');
    }

    return session;
  }

  async getUserSessions(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    sessions: AiChatSessionDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      this.aiChatSessionModel
        .find({ userId: new Types.ObjectId(userId) })
        .populate('suggestedDoctorId', 'firstName lastName specialization')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.aiChatSessionModel.countDocuments({
        userId: new Types.ObjectId(userId),
      }),
    ]);

    return {
      sessions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateSession(
    sessionId: string,
    updateDto: UpdateAiChatSessionDto,
  ): Promise<AiChatSessionDocument> {
    const session = await this.aiChatSessionModel.findByIdAndUpdate(
      sessionId,
      updateDto,
      { new: true },
    );

    if (!session) {
      throw new NotFoundException('AI chat session not found');
    }

    return session;
  }

  // Message management
  async addMessage(
    createMessageDto: CreateAiChatMessageDto,
  ): Promise<AiChatMessageDocument> {
    if (!createMessageDto.userId) {
      throw new Error('User ID is required');
    }

    const message = new this.aiChatMessageModel({
      ...createMessageDto,
      sessionId: new Types.ObjectId(createMessageDto.sessionId),
      userId: new Types.ObjectId(createMessageDto.userId),
    });

    const savedMessage = await message.save();

    // Increment message count in session
    await this.aiChatSessionModel.findByIdAndUpdate(
      createMessageDto.sessionId,
      { $inc: { messageCount: 1 } },
    );

    return savedMessage;
  }

  async getSessionMessages(
    sessionId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<AiChatMessageDocument[]> {
    const skip = (page - 1) * limit;

    return await this.aiChatMessageModel
      .find({ sessionId: new Types.ObjectId(sessionId) })
      .sort({ createdAt: 1 }) // Oldest first for chat display
      .skip(skip)
      .limit(limit);
  }

  async getSessionMessagesWithSession(sessionId: string) {
    const [session, messages] = await Promise.all([
      this.getSessionById(sessionId),
      this.getSessionMessages(sessionId),
    ]);

    return {
      session,
      messages,
    };
  }

  // Analytics and reporting
  async getUserChatStats(userId: string) {
    const [
      totalSessions,
      activeSessions,
      completedSessions,
      totalMessages,
      urgentSessions,
      sessionsWithImages,
    ] = await Promise.all([
      this.aiChatSessionModel.countDocuments({
        userId: new Types.ObjectId(userId),
      }),
      this.aiChatSessionModel.countDocuments({
        userId: new Types.ObjectId(userId),
        status: 'active',
      }),
      this.aiChatSessionModel.countDocuments({
        userId: new Types.ObjectId(userId),
        status: 'completed',
      }),
      this.aiChatMessageModel.countDocuments({
        userId: new Types.ObjectId(userId),
      }),
      this.aiChatSessionModel.countDocuments({
        userId: new Types.ObjectId(userId),
        urgencyLevel: 'high',
      }),
      this.aiChatSessionModel.countDocuments({
        userId: new Types.ObjectId(userId),
        hasImageAnalysis: true,
      }),
    ]);

    return {
      totalSessions,
      activeSessions,
      completedSessions,
      totalMessages,
      urgentSessions,
      sessionsWithImages,
    };
  }

  async searchSessions(
    userId: string,
    searchQuery: string,
    filters?: {
      urgencyLevel?: string;
      hasImageAnalysis?: boolean;
      tags?: string[];
      dateFrom?: Date;
      dateTo?: Date;
    },
  ) {
    const matchConditions: any = {
      userId: new Types.ObjectId(userId),
    };

    if (searchQuery) {
      matchConditions.$or = [
        { symptoms: { $regex: searchQuery, $options: 'i' } },
        { summary: { $regex: searchQuery, $options: 'i' } },
        { tags: { $in: [new RegExp(searchQuery, 'i')] } },
      ];
    }

    if (filters) {
      if (filters.urgencyLevel) {
        matchConditions.urgencyLevel = filters.urgencyLevel;
      }
      if (filters.hasImageAnalysis !== undefined) {
        matchConditions.hasImageAnalysis = filters.hasImageAnalysis;
      }
      if (filters.tags && filters.tags.length > 0) {
        matchConditions.tags = { $in: filters.tags };
      }
      if (filters.dateFrom || filters.dateTo) {
        matchConditions.createdAt = {};
        if (filters.dateFrom) {
          matchConditions.createdAt.$gte = filters.dateFrom;
        }
        if (filters.dateTo) {
          matchConditions.createdAt.$lte = filters.dateTo;
        }
      }
    }

    return await this.aiChatSessionModel
      .find(matchConditions)
      .populate('suggestedDoctorId', 'firstName lastName specialization')
      .sort({ createdAt: -1 });
  }

  // Generate session summary using the chat messages
  async generateSessionSummary(sessionId: string): Promise<string> {
    const messages = await this.getSessionMessages(sessionId);

    // Extract key information from messages
    const userMessages = messages.filter((msg) => msg.role === 'user');
    const assistantMessages = messages.filter(
      (msg) => msg.role === 'assistant',
    );

    const symptoms = userMessages.map((msg) => msg.content).join('; ');
    const hasEmergency = assistantMessages.some(
      (msg) => msg.content.includes('KHẨN CẤP') || msg.urgencyLevel === 'high',
    );

    // Simple summary generation (in real app, you might use AI for this)
    let summary = `Bệnh nhân tư vấn về: ${symptoms.substring(0, 200)}`;
    if (hasEmergency) summary += ' - Có dấu hiệu khẩn cấp';

    // Update session with summary
    await this.updateSession(sessionId, { summary });

    return summary;
  }
}
