import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type AIFeedbackDocument = HydratedDocument<AIFeedback>;

/**
 * Schema để lưu trữ đánh giá của bác sĩ về kết quả phân tích AI
 * Dùng để training và cải thiện AI sau này
 */
@Schema({ timestamps: true })
export class AIFeedback {
  // ID của bác sĩ đánh giá
  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  doctorId: mongoose.Schema.Types.ObjectId;

  // ID của lịch hẹn liên quan
  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
  })
  appointmentId: mongoose.Schema.Types.ObjectId;

  // ID của bệnh nhân
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  patientId: mongoose.Schema.Types.ObjectId;

  // URL ảnh X-quang đã phân tích
  @Prop({ type: String })
  imageUrl: string;

  // Kết quả phân tích gốc của AI
  @Prop({ type: mongoose.Schema.Types.Mixed })
  originalAIAnalysis: {
    symptoms?: string;
    analysisResult?: {
      diagnosis?: string;
      analysis?: string;
      richContent?: {
        analysis?: string;
        sections?: Array<{
          heading?: string;
          text?: string;
          bullets?: string[];
        }>;
        recommendations?: string[];
      };
    };
    urgency?: string;
  };

  // ============ ĐÁNH GIÁ CỦA BÁC SĨ ============

  // Độ chính xác tổng thể (1-5)
  @Prop({ required: true, min: 1, max: 5 })
  accuracyRating: number;

  // AI có chẩn đoán đúng không?
  @Prop({ type: String, enum: ['correct', 'partially_correct', 'incorrect'] })
  diagnosisAccuracy: string;

  // Chẩn đoán thực tế của bác sĩ (nếu khác với AI)
  @Prop({ type: String })
  actualDiagnosis: string;

  // Những điểm AI phân tích đúng
  @Prop({ type: [String], default: [] })
  correctPoints: string[];

  // Những điểm AI phân tích sai hoặc thiếu
  @Prop({ type: [String], default: [] })
  incorrectPoints: string[];

  // Những điểm AI bỏ sót
  @Prop({ type: [String], default: [] })
  missedPoints: string[];

  // Khuyến nghị của AI có phù hợp không?
  @Prop({
    type: String,
    enum: ['appropriate', 'partially_appropriate', 'inappropriate'],
  })
  recommendationsQuality: string;

  // Khuyến nghị bổ sung từ bác sĩ
  @Prop({ type: [String], default: [] })
  additionalRecommendations: string[];

  // Nhận xét chi tiết của bác sĩ
  @Prop({ type: String })
  detailedComment: string;

  // Gợi ý cải thiện cho AI
  @Prop({ type: String })
  improvementSuggestions: string;

  // ============ METADATA ============

  // Chuyên khoa của bác sĩ đánh giá
  @Prop({ type: String })
  doctorSpecialty: string;

  // Số năm kinh nghiệm của bác sĩ
  @Prop({ type: Number })
  doctorExperience: number;

  // Đã được sử dụng để training chưa
  @Prop({ type: Boolean, default: false })
  usedForTraining: boolean;

  // Ngày sử dụng để training
  @Prop({ type: Date })
  trainingUsedAt: Date;

  // Tags để phân loại (ví dụ: cavity, gum_disease, etc.)
  @Prop({ type: [String], default: [] })
  tags: string[];

  // Mức độ ưu tiên cho training (high, medium, low)
  @Prop({ type: String, enum: ['high', 'medium', 'low'], default: 'medium' })
  trainingPriority: string;
}

export const AIFeedbackSchema = SchemaFactory.createForClass(AIFeedback);

// Indexes để tối ưu query
AIFeedbackSchema.index({ doctorId: 1 });
AIFeedbackSchema.index({ appointmentId: 1 }, { unique: true });
AIFeedbackSchema.index({ usedForTraining: 1 });
AIFeedbackSchema.index({ trainingPriority: 1 });
AIFeedbackSchema.index({ diagnosisAccuracy: 1 });
AIFeedbackSchema.index({ createdAt: -1 });
