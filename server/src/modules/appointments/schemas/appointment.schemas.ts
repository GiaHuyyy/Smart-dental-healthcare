import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { User } from 'src/modules/users/schemas/user.schemas';

export type AppointmentDocument = HydratedDocument<Appointment>;

export enum AppointmentStatus {
  PENDING = 'pending',
  PENDING_PAYMENT = 'pending_payment', // Chờ thanh toán MoMo
  PENDING_PATIENT_CONFIRMATION = 'pending_patient_confirmation', // Chờ bệnh nhân xác nhận lịch tái khám
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  IN_PROGRESS = 'in-progress',
}

export enum CancellationInitiator {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
}

// Added SYSTEM to represent automatic/system-initiated cancellations (cron job / system)
export enum CancellationInitiatorExtended {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  SYSTEM = 'system',
}

export enum DoctorCancellationReason {
  EMERGENCY = 'emergency',
  PATIENT_LATE = 'patient_late',
}

@Schema({ timestamps: true })
export class Appointment {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  patientId: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  doctorId: User;

  @Prop({ required: true })
  appointmentDate: Date;

  @Prop({ required: true })
  startTime: string;

  @Prop({ required: true })
  endTime: string;

  @Prop({ required: true })
  duration: number; // in minutes

  @Prop({ required: true })
  appointmentType: string; // e.g., 'Khám định kỳ', 'Nhổ răng', 'Tẩy trắng răng'

  @Prop()
  consultationFee: number; // Phí khám bệnh

  @Prop()
  notes: string;

  @Prop({ default: AppointmentStatus.PENDING })
  status: string;

  @Prop()
  cancellationReason: string;

  // cancelledBy can be 'patient', 'doctor' or 'system' (auto-cancel)
  @Prop({ type: String, enum: Object.values(CancellationInitiatorExtended) })
  cancelledBy?: string;

  @Prop({ type: String, enum: Object.values(DoctorCancellationReason) })
  doctorCancellationReason?: string; // 'emergency' hoặc 'patient_late'

  @Prop({ default: false })
  cancellationFeeCharged?: boolean; // Đã tính phí đặt chỗ chưa

  @Prop()
  cancellationFeeAmount?: number; // Số tiền phí (thường là 100,000 VND)

  @Prop({ default: false })
  isRescheduled: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Appointment' })
  previousAppointmentId: Appointment;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'MedicalRecord' })
  medicalRecordId?: MongooseSchema.Types.ObjectId;

  @Prop({ enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' })
  paymentStatus?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Payment' })
  paymentId?: MongooseSchema.Types.ObjectId;

  // Follow-up fields
  @Prop({ default: false })
  isFollowUp?: boolean; // Đây có phải lịch tái khám không

  @Prop({ default: false })
  isFollowUpSuggestion?: boolean; // Bác sĩ đề xuất lịch tái khám, chờ bệnh nhân xác nhận

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Appointment' })
  followUpParentId?: MongooseSchema.Types.ObjectId; // Lịch gốc nếu đây là tái khám

  @Prop()
  followUpDiscount?: number; // % giảm giá (thường là 5)

  @Prop()
  suggestedFollowUpDate?: Date; // Ngày bác sĩ đề xuất (nếu có)

  @Prop()
  suggestedFollowUpTime?: string; // Giờ bác sĩ đề xuất (nếu có)

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Voucher' })
  appliedVoucherId?: MongooseSchema.Types.ObjectId; // Voucher đã sử dụng

  // AI Analysis Data - Thông tin phân tích AI
  @Prop({ type: MongooseSchema.Types.Mixed })
  aiAnalysisData?: {
    symptoms?: string; // Triệu chứng từ chat
    uploadedImage?: string; // URL hình ảnh X-ray
    analysisResult?: {
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
    urgency?: string; // Mức độ khẩn cấp
    hasImageAnalysis?: boolean;
  };
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);

// Xóa index cũ nếu có
// Tạo index mới cho các trường cần thiết với partial filter để loại trừ lịch đã hủy
// Điều này cho phép đặt lịch trùng giờ với lịch đã bị hủy
AppointmentSchema.index(
  { doctorId: 1, appointmentDate: 1, startTime: 1 },
  {
    unique: true,
    // Chỉ áp dụng unique cho lịch pending, pending_payment, confirmed, completed, in-progress (không bao gồm cancelled)
    partialFilterExpression: {
      status: {
        $in: [
          'pending',
          'pending_payment',
          'confirmed',
          'completed',
          'in-progress',
        ],
      },
    },
  },
);
// NOTE: ensure the DB does not have a legacy unique index on appointmentTime.
// If a legacy index exists in the database (doctorId_1_appointmentDate_1_appointmentTime_1),
// drop it manually. The schema only uses startTime going forward.
