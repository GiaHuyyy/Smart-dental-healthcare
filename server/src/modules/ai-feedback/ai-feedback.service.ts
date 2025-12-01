import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AIFeedback, AIFeedbackDocument } from './schemas/ai-feedback.schema';
import {
  CreateAIFeedbackDto,
  UpdateAIFeedbackDto,
  QueryAIFeedbackDto,
} from './dto/ai-feedback.dto';

@Injectable()
export class AIFeedbackService {
  private readonly logger = new Logger(AIFeedbackService.name);

  constructor(
    @InjectModel(AIFeedback.name)
    private aiFeedbackModel: Model<AIFeedbackDocument>,
  ) {}

  /**
   * Tạo đánh giá mới
   */
  async create(
    doctorId: string,
    dto: CreateAIFeedbackDto,
    doctorInfo?: { specialty?: string; experience?: number },
  ): Promise<AIFeedback> {
    // Check if feedback already exists for this appointment
    const existing = await this.aiFeedbackModel.findOne({
      appointmentId: new Types.ObjectId(dto.appointmentId),
    });

    if (existing) {
      throw new BadRequestException(
        'Đã có đánh giá cho lịch hẹn này. Vui lòng cập nhật thay vì tạo mới.',
      );
    }

    // Determine training priority based on diagnosis accuracy
    let trainingPriority: 'high' | 'medium' | 'low' = 'medium';
    if (dto.diagnosisAccuracy === 'incorrect') {
      trainingPriority = 'high'; // AI sai cần ưu tiên cao để sửa
    } else if (dto.diagnosisAccuracy === 'partially_correct') {
      trainingPriority = 'medium';
    } else {
      trainingPriority = 'low'; // AI đúng, ưu tiên thấp hơn
    }

    const feedback = new this.aiFeedbackModel({
      doctorId: new Types.ObjectId(doctorId),
      appointmentId: new Types.ObjectId(dto.appointmentId),
      imageUrl: dto.imageUrl,
      originalAIAnalysis: dto.originalAIAnalysis,
      accuracyRating: dto.accuracyRating,
      diagnosisAccuracy: dto.diagnosisAccuracy,
      actualDiagnosis: dto.actualDiagnosis,
      correctPoints: dto.correctPoints || [],
      incorrectPoints: dto.incorrectPoints || [],
      missedPoints: dto.missedPoints || [],
      recommendationsQuality: dto.recommendationsQuality,
      additionalRecommendations: dto.additionalRecommendations || [],
      detailedComment: dto.detailedComment,
      improvementSuggestions: dto.improvementSuggestions,
      tags: dto.tags || [],
      trainingPriority,
      doctorSpecialty: doctorInfo?.specialty,
      doctorExperience: doctorInfo?.experience,
    });

    const saved = await feedback.save();
    this.logger.log(
      `Created AI feedback for appointment ${dto.appointmentId} by doctor ${doctorId}`,
    );
    return saved;
  }

  /**
   * Cập nhật đánh giá
   */
  async update(
    feedbackId: string,
    doctorId: string,
    dto: UpdateAIFeedbackDto,
  ): Promise<AIFeedback> {
    const feedback = await this.aiFeedbackModel.findOne({
      _id: new Types.ObjectId(feedbackId),
      doctorId: new Types.ObjectId(doctorId),
    });

    if (!feedback) {
      throw new NotFoundException(
        'Không tìm thấy đánh giá hoặc bạn không có quyền chỉnh sửa',
      );
    }

    // Update training priority if diagnosis accuracy changed
    if (dto.diagnosisAccuracy) {
      if (dto.diagnosisAccuracy === 'incorrect') {
        feedback.trainingPriority = 'high';
      } else if (dto.diagnosisAccuracy === 'partially_correct') {
        feedback.trainingPriority = 'medium';
      } else {
        feedback.trainingPriority = 'low';
      }
    }

    Object.assign(feedback, dto);
    return await feedback.save();
  }

  /**
   * Kiểm tra xem appointment đã có feedback chưa
   */
  async checkExists(appointmentId: string): Promise<boolean> {
    const count = await this.aiFeedbackModel.countDocuments({
      appointmentId: new Types.ObjectId(appointmentId),
    });
    return count > 0;
  }

  /**
   * Lấy đánh giá theo appointmentId
   */
  async findByAppointmentId(appointmentId: string): Promise<AIFeedback | null> {
    return await this.aiFeedbackModel
      .findOne({ appointmentId: new Types.ObjectId(appointmentId) })
      .populate('doctorId', 'fullName specialty avatarUrl')
      .exec();
  }

  /**
   * Lấy danh sách đánh giá với filters
   */
  async findAll(query: QueryAIFeedbackDto): Promise<{
    feedbacks: AIFeedback[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (query.doctorId) {
      filter.doctorId = new Types.ObjectId(query.doctorId);
    }

    if (query.diagnosisAccuracy) {
      filter.diagnosisAccuracy = query.diagnosisAccuracy;
    }

    if (query.usedForTraining !== undefined) {
      filter.usedForTraining = query.usedForTraining === 'true';
    }

    if (query.trainingPriority) {
      filter.trainingPriority = query.trainingPriority;
    }

    const [feedbacks, total] = await Promise.all([
      this.aiFeedbackModel
        .find(filter)
        .populate('doctorId', 'fullName specialty avatarUrl')
        .populate('appointmentId', 'appointmentDate startTime')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.aiFeedbackModel.countDocuments(filter),
    ]);

    return {
      feedbacks,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Lấy thống kê tổng quan
   */
  async getStatistics(): Promise<{
    total: number;
    byAccuracy: {
      correct: number;
      partiallyCorrect: number;
      incorrect: number;
    };
    averageRating: number;
    usedForTraining: number;
    pendingTraining: number;
    byPriority: { high: number; medium: number; low: number };
  }> {
    const [
      total,
      correct,
      partiallyCorrect,
      incorrect,
      avgRatingResult,
      usedForTraining,
      highPriority,
      mediumPriority,
      lowPriority,
    ] = await Promise.all([
      this.aiFeedbackModel.countDocuments(),
      this.aiFeedbackModel.countDocuments({ diagnosisAccuracy: 'correct' }),
      this.aiFeedbackModel.countDocuments({
        diagnosisAccuracy: 'partially_correct',
      }),
      this.aiFeedbackModel.countDocuments({ diagnosisAccuracy: 'incorrect' }),
      this.aiFeedbackModel.aggregate([
        { $group: { _id: null, avgRating: { $avg: '$accuracyRating' } } },
      ]),
      this.aiFeedbackModel.countDocuments({ usedForTraining: true }),
      this.aiFeedbackModel.countDocuments({
        trainingPriority: 'high',
        usedForTraining: false,
      }),
      this.aiFeedbackModel.countDocuments({
        trainingPriority: 'medium',
        usedForTraining: false,
      }),
      this.aiFeedbackModel.countDocuments({
        trainingPriority: 'low',
        usedForTraining: false,
      }),
    ]);

    return {
      total,
      byAccuracy: {
        correct,
        partiallyCorrect,
        incorrect,
      },
      averageRating: avgRatingResult[0]?.avgRating || 0,
      usedForTraining,
      pendingTraining: total - usedForTraining,
      byPriority: {
        high: highPriority,
        medium: mediumPriority,
        low: lowPriority,
      },
    };
  }

  /**
   * Lấy dữ liệu để export cho training
   */
  async getTrainingData(options: {
    limit?: number;
    priority?: 'high' | 'medium' | 'low';
    includeUsed?: boolean;
  }): Promise<AIFeedback[]> {
    const filter: any = {};

    if (!options.includeUsed) {
      filter.usedForTraining = false;
    }

    if (options.priority) {
      filter.trainingPriority = options.priority;
    }

    return await this.aiFeedbackModel
      .find(filter)
      .sort({ trainingPriority: 1, createdAt: -1 }) // high priority first
      .limit(options.limit || 100)
      .exec();
  }

  /**
   * Đánh dấu đã sử dụng cho training
   */
  async markAsUsedForTraining(
    feedbackIds: string[],
  ): Promise<{ modifiedCount: number }> {
    const result = await this.aiFeedbackModel.updateMany(
      { _id: { $in: feedbackIds.map((id) => new Types.ObjectId(id)) } },
      { $set: { usedForTraining: true, trainingUsedAt: new Date() } },
    );

    return { modifiedCount: result.modifiedCount };
  }

  /**
   * Xóa đánh giá (chỉ admin)
   */
  async delete(feedbackId: string): Promise<void> {
    const result = await this.aiFeedbackModel.deleteOne({
      _id: new Types.ObjectId(feedbackId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }
  }
}
