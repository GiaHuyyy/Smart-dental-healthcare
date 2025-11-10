import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import aqp from 'api-query-params';
import { Model } from 'mongoose';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { Appointment, AppointmentStatus } from './schemas/appointment.schemas';
import { MedicalRecord } from '../medical-records/schemas/medical-record.schemas';
import { AppointmentNotificationGateway } from './appointment-notification.gateway';
import { AppointmentEmailService } from './appointment-email.service';
import {
  BillingHelperService,
  RESERVATION_FEE_AMOUNT,
} from '../payments/billing-helper.service';
import { VouchersService } from '../vouchers/vouchers.service';
import {
  FollowUpSuggestion,
  FollowUpSuggestionStatus,
} from './schemas/follow-up-suggestion.schema';
import { Payment } from '../payments/schemas/payment.schemas';
import { Revenue } from '../revenue/schemas/revenue.schemas';
import { NotificationGateway } from '../notifications/notification.gateway';
import { PaymentGateway } from '../payments/payment.gateway';
import { RevenueGateway } from '../revenue/revenue.gateway';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    @InjectModel(Appointment.name) private appointmentModel: Model<Appointment>,
    @InjectModel(MedicalRecord.name)
    private readonly medicalRecordModel: Model<MedicalRecord>,
    @InjectModel(FollowUpSuggestion.name)
    private readonly followUpSuggestionModel: Model<FollowUpSuggestion>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<Payment>,
    @InjectModel(Revenue.name)
    private readonly revenueModel: Model<Revenue>,
    private readonly appointmentNotificationGateway: AppointmentNotificationGateway,
    private readonly notificationGateway: NotificationGateway,
    private readonly emailService: AppointmentEmailService,
    private readonly billingHelper: BillingHelperService,
    private readonly vouchersService: VouchersService,
    private readonly paymentGateway: PaymentGateway,
    private readonly revenueGateway: RevenueGateway,
  ) {}

  // Convert "HH:MM" or ISO datetime string -> minutes since midnight (UTC for ISO)
  private timeToMinutes(time: string) {
    if (!time) return 0;
    if (time.includes('T')) {
      // ISO datetime
      const d = new Date(time);
      if (isNaN(d.getTime())) return 0;
      return d.getUTCHours() * 60 + d.getUTCMinutes();
    }
    const parts = time.split(':').map((v) => Number(v));
    const h = parts[0];
    const m = parts[1] ?? 0;
    return (isNaN(h) ? 0 : h * 60) + (isNaN(m) ? 0 : m);
  }

  // Check interval overlap: [aStart,aEnd) overlaps [bStart,bEnd)
  private intervalsOverlap(
    aStart: number,
    aEnd: number,
    bStart: number,
    bEnd: number,
  ) {
    return aStart < bEnd && bStart < aEnd;
  }

  // Check if doctor has overlapping appointment on same day, optionally excluding an appointment id
  private async hasOverlap(
    doctorId: string,
    appointmentDate: Date,
    startTime: string,
    endTime: string,
    excludeId?: string,
  ) {
    const apd =
      appointmentDate instanceof Date
        ? appointmentDate
        : new Date(appointmentDate);
    const startOfDay = new Date(
      Date.UTC(
        apd.getUTCFullYear(),
        apd.getUTCMonth(),
        apd.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
    const endOfDay = new Date(
      Date.UTC(
        apd.getUTCFullYear(),
        apd.getUTCMonth(),
        apd.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );

    const filter: any = {
      doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: [AppointmentStatus.CANCELLED] },
    };

    if (excludeId) filter._id = { $ne: excludeId };

    const appointments = await this.appointmentModel.find(filter).lean();

    const aStart = this.timeToMinutes(startTime);
    const aEnd = this.timeToMinutes(endTime);

    for (const appt of appointments) {
      const ap = appt as any;
      const storedStart = (ap.startTime || ap.appointmentTime || ap.time || '')
        .toString()
        .trim();
      if (!storedStart) continue; // skip malformed/legacy entries without a start time
      const bStart = this.timeToMinutes(storedStart);
      const durationNum = Number(ap.duration) || 30;
      const storedEnd = (ap.endTime || '').toString().trim();
      const bEnd = storedEnd
        ? this.timeToMinutes(storedEnd)
        : bStart + durationNum;
      if (this.intervalsOverlap(aStart, aEnd, bStart, bEnd)) {
        return true;
      }
    }

    return false;
  }

  // Kiểm tra xem bác sĩ có lịch hẹn chính xác vào khung giờ này không
  private async hasExactTimeOverlap(
    doctorId: string,
    appointmentDate: Date,
    startTime: string,
  ) {
    const apd =
      appointmentDate instanceof Date
        ? appointmentDate
        : new Date(appointmentDate);
    const startOfDay = new Date(
      Date.UTC(
        apd.getUTCFullYear(),
        apd.getUTCMonth(),
        apd.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
    const endOfDay = new Date(
      Date.UTC(
        apd.getUTCFullYear(),
        apd.getUTCMonth(),
        apd.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );

    const filter: any = {
      doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      startTime: startTime,
      status: { $nin: [AppointmentStatus.CANCELLED] },
    };

    const count = await this.appointmentModel.countDocuments(filter);
    return count > 0;
  }

  // Calculate end time string from startTime and duration (minutes). Returns "HH:MM"
  private calculateEndTime(startTime: string, duration: number) {
    const start = this.timeToMinutes(startTime);
    const dur =
      typeof duration === 'number' && !isNaN(duration) ? duration : 30;
    const end = start + dur;
    const h = Math.floor(end / 60);
    const m = end % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  // Basic HH:MM validator (also allow ISO datetimes with 'T')
  private isValidTimeString(time?: string) {
    if (!time) return false;
    if (time.includes('T')) {
      const d = new Date(time);
      return !isNaN(d.getTime());
    }
    return /^\d{1,2}:\d{2}$/.test(time);
  }

  async create(createAppointmentDto: CreateAppointmentDto) {
    try {
      // Kiểm tra xem bác sĩ có lịch trùng không
      const { doctorId, appointmentDate, startTime } = createAppointmentDto;

      // DEBUG: Log entire payload to check followUpParentId
      this.logger.log('🔍 [DEBUG] Creating appointment with payload:');
      this.logger.log(JSON.stringify(createAppointmentDto, null, 2));

      // DEBUG: Log follow-up parent ID if present
      const followUpParentId = (createAppointmentDto as any).followUpParentId;
      if (followUpParentId) {
        this.logger.log(
          `🔗 Creating follow-up appointment with parent: ${followUpParentId}`,
        );
      } else {
        this.logger.log('❌ No followUpParentId in payload');
      }

      // Basic required fields validation
      if (!doctorId) {
        throw new BadRequestException('Thiếu doctorId');
      } // Normalize and validate appointmentDate -> store as UTC midnight date
      const apptDateRaw =
        appointmentDate instanceof Date
          ? appointmentDate
          : new Date(appointmentDate as any);
      if (!apptDateRaw || isNaN(apptDateRaw.getTime())) {
        throw new BadRequestException('appointmentDate không hợp lệ');
      }
      const normalizedDate = new Date(
        Date.UTC(
          apptDateRaw.getUTCFullYear(),
          apptDateRaw.getUTCMonth(),
          apptDateRaw.getUTCDate(),
          0,
          0,
          0,
          0,
        ),
      );
      (createAppointmentDto as any).appointmentDate = normalizedDate;

      if (!startTime || !this.isValidTimeString(startTime)) {
        throw new BadRequestException(
          'startTime không hợp lệ (định dạng HH:MM)',
        );
      }

      // ensure numeric duration and compute endTime if missing
      (createAppointmentDto as any).duration =
        Number((createAppointmentDto as any).duration) || 30;
      if (!createAppointmentDto.endTime) {
        (createAppointmentDto as any).endTime = this.calculateEndTime(
          startTime,
          (createAppointmentDto as any).duration,
        );
      }

      // Ensure legacy appointmentTime field is populated (avoid nulls that violate old unique index)
      if (!(createAppointmentDto as any).appointmentTime) {
        (createAppointmentDto as any).appointmentTime = startTime;
      }

      // Per product decision: allow patients to create multiple appointments with the same doctor on the same day.
      // Do not block creation by exact-time overlap here. The DB unique index on (doctorId, appointmentDate, startTime)
      // will still prevent two appointments with the exact same startTime for the same doctor and date.

      // Save appointment (also keep legacy appointmentTime if needed elsewhere)
      const payload = {
        ...(createAppointmentDto as any),
        // force legacy field to be the start time to avoid nulls that trigger legacy unique index
        appointmentTime:
          (createAppointmentDto as any).startTime ||
          (createAppointmentDto as any).appointmentTime ||
          (createAppointmentDto as any).time,
      };

      const appointment = await this.appointmentModel.create(payload);

      // Populate doctor and patient info for notifications
      const populatedAppointment = await appointment.populate([
        { path: 'doctorId', select: 'fullName email phone specialty address' },
        { path: 'patientId', select: 'fullName email phone' },
      ]);

      // 🆕 Create pending payment bill for consultation fee
      // This allows patients to pay later via the payments page
      // BUT: Only create if:
      //   1. No bill exists yet (avoid duplicate when paying with wallet/momo)
      //   2. Payment method is "cash" or "later" (not immediate payment methods)
      const consultationFee =
        (createAppointmentDto as any).consultationFee || 200000;
      const patientId = (createAppointmentDto as any).patientId;
      const docId = (populatedAppointment.doctorId as any)._id;
      const paymentMethod = (createAppointmentDto as any).paymentMethod;

      console.log('💳 ========== CHECKING PAYMENT BILL CREATION ==========');
      console.log('   - Appointment ID:', appointment._id);
      console.log('   - Patient ID:', patientId);
      console.log('   - Doctor ID:', docId);
      console.log('   - Consultation Fee:', consultationFee);
      console.log('   - Payment Method:', paymentMethod);

      // Only create pending bill for "cash" or "later" payment methods
      const shouldCreatePendingBill =
        paymentMethod === 'cash' || paymentMethod === 'later';

      console.log('   - Should create pending bill?', shouldCreatePendingBill);

      if (!shouldCreatePendingBill) {
        console.log(
          `⏭️ ========== SKIPPING PENDING BILL - Payment method is "${paymentMethod}" ==========`,
        );
        console.log(
          '   💡 For wallet/momo payments, revenue should be created by payment service',
        );
      } else {
        try {
          // Check if bill already exists (e.g., created by wallet payment)
          const existingBill = await this.paymentModel.findOne({
            refId: appointment._id,
            billType: 'consultation_fee',
          });

          if (existingBill) {
            this.logger.log('Payment bill already exists, skipping...');
          } else {
            // 1. Create pending bill for PATIENT (trừ tiền)
            const pendingPayment = await this.paymentModel.create({
              patientId,
              doctorId: docId,
              amount: -consultationFee, // Số ÂM - patient bị trừ tiền
              status: 'pending',
              paymentMethod: 'pending',
              type: 'appointment',
              billType: 'consultation_fee',
              refId: appointment._id,
              refModel: 'Appointment',
              description: `Phí khám bệnh - Lịch hẹn #${appointment._id.toString()}`,
            });

            // 2. 🆕 Create pending REVENUE record for DOCTOR (vào bảng revenues riêng)
            const platformFee = -Math.round(consultationFee * 0.05); // Âm (trừ 5%)
            const netAmount = consultationFee + platformFee; // amount + platformFee (platformFee âm nên trừ đi)

            const pendingRevenue = await this.revenueModel.create({
              doctorId: docId,
              patientId,
              amount: consultationFee, // Số DƯƠNG - doctor nhận tiền
              platformFee, // ÂM - phí nền tảng (5%)
              netAmount, // Thực nhận sau khi trừ phí
              revenueDate: new Date(),
              status: 'pending', // Chờ thanh toán
              refId: appointment._id,
              refModel: 'Appointment',
              type: 'appointment',
              notes: `Doanh thu dự kiến từ lịch hẹn #${appointment._id.toString()}`,
            });

            // 🆕 Emit realtime events
            try {
              // Populate trước khi emit
              const populatedPayment = await this.paymentModel
                .findById(pendingPayment._id)
                .populate('doctorId', 'fullName email')
                .exec();
              const populatedRevenue = await this.revenueModel
                .findById(pendingRevenue._id)
                .populate('patientId', 'fullName email phone')
                .exec();

              // Emit to patient's payment page
              if (this.paymentGateway && populatedPayment) {
                this.paymentGateway.emitNewPayment(patientId, populatedPayment);
              }

              // Emit to doctor's revenue page
              if (this.revenueGateway && populatedRevenue) {
                this.revenueGateway.emitNewRevenue(
                  docId.toString(),
                  populatedRevenue,
                );
              }
            } catch (emitError) {
              this.logger.error('Failed to emit realtime events:', emitError);
            }
          }
        } catch (billError) {
          this.logger.error('Failed to create pending bills:', billError);
          // Don't fail the appointment creation if bill creation fails
        }
      }

      // Send real-time notification to doctor
      void this.appointmentNotificationGateway.notifyDoctorNewAppointment(
        docId.toString(),
        populatedAppointment.toObject(),
      );

      // Send email to doctor (async, don't wait)
      void this.emailService.sendNewAppointmentEmailToDoctor(
        populatedAppointment.toObject(),
        populatedAppointment.doctorId as any,
        populatedAppointment.patientId as any,
      );

      return appointment;
    } catch (error) {
      // Handle legacy duplicate-key errors caused by old DB indexes pointing to appointmentTime
      if (
        error &&
        (error.code === 11000 || error.name === 'MongoServerError')
      ) {
        // Surface more info when possible
        const keyInfo =
          (error.keyValue && JSON.stringify(error.keyValue)) ||
          (error.keyPattern && JSON.stringify(error.keyPattern)) ||
          '';
        // Log server-side so ops can inspect (kept minimal)
        console.warn('Duplicate key on create appointment:', keyInfo);
        throw new BadRequestException(
          `Duplicate key error ${keyInfo}. If this persists, run server/scripts/drop-starttime-index.js to remove legacy index or inspect the DB.`,
        );
      }
      throw error;
    }
  }

  async findAll(query: string) {
    const { filter, sort, population, projection } = aqp(query);
    const appointments = await this.appointmentModel
      .find(filter)
      .sort(sort as any)
      .populate(population)
      .select(projection as any);
    return appointments;
  }

  async findOne(id: string) {
    const appointment = await this.appointmentModel
      .findById(id)
      .populate('patientId', 'fullName email phone')
      .populate('doctorId', 'fullName email specialty');

    if (!appointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn');
    }

    return appointment;
  }

  async update(id: string, updateAppointmentDto: UpdateAppointmentDto) {
    const appointment = await this.appointmentModel.findByIdAndUpdate(
      id,
      updateAppointmentDto,
      { new: true },
    );

    if (!appointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn');
    }

    return appointment;
  }

  async remove(id: string) {
    const appointment = await this.appointmentModel.findByIdAndDelete(id);

    if (!appointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn');
    }

    return { message: 'Xóa lịch hẹn thành công' };
  }

  async findByPatient(patientId: string, query: string) {
    const { filter, sort, population, projection } = aqp(query);
    const appointments = await this.appointmentModel
      .find({
        ...filter,
        patientId,
      })
      .sort(sort as any)
      .populate(population)
      .select(projection as any);

    return appointments;
  }

  async findByDoctor(doctorId: string, query: string) {
    const { filter, sort, population, projection } = aqp(query);
    const appointments = await this.appointmentModel
      .find({
        ...filter,
        doctorId,
      })
      .sort(sort as any)
      .populate(population)
      .select(projection as any);

    return appointments;
  }

  async findUpcomingByDoctor(doctorId: string, query: string) {
    const { filter, sort, population, projection } = aqp(query);
    const currentDate = new Date();

    const appointments = await this.appointmentModel
      .find({
        ...filter,
        doctorId,
        appointmentDate: { $gte: currentDate },
        status: {
          $in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
        },
      })
      .sort((sort as any) || { appointmentDate: 1, startTime: 1 })
      .populate(population)
      .select(projection as any);

    return appointments;
  }

  async findUpcomingByPatient(patientId: string, query: string) {
    const { filter, sort, population, projection } = aqp(query);
    const currentDate = new Date();

    const appointments = await this.appointmentModel
      .find({
        ...filter,
        patientId,
        appointmentDate: { $gte: currentDate },
        status: {
          $in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
        },
      })
      .sort((sort as any) || { appointmentDate: 1, startTime: 1 })
      .populate(population)
      .select(projection as any);

    return appointments;
  }

  async findHistoryByDoctor(doctorId: string, query: string) {
    const { filter, sort, population, projection } = aqp(query);
    const currentDate = new Date();

    const appointments = await this.appointmentModel
      .find({
        ...filter,
        doctorId,
        $or: [
          { appointmentDate: { $lt: currentDate } },
          {
            status: {
              $in: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED],
            },
          },
        ],
      })
      .sort((sort as any) || { appointmentDate: -1, startTime: -1 })
      .populate(population)
      .select(projection as any);

    return appointments;
  }

  async findHistoryByPatient(patientId: string, query: string) {
    const { filter, sort, population, projection } = aqp(query);
    const currentDate = new Date();

    const appointments = await this.appointmentModel
      .find({
        ...filter,
        patientId,
        $or: [
          { appointmentDate: { $lt: currentDate } },
          {
            status: {
              $in: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED],
            },
          },
        ],
      })
      .sort((sort as any) || { appointmentDate: -1, startTime: -1 })
      .populate(population)
      .select(projection as any);

    return appointments;
  }

  async updateStatus(id: string, status: string) {
    const appointment = await this.appointmentModel.findById(id);

    if (!appointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn');
    }

    appointment.status = status as AppointmentStatus;
    await appointment.save();

    return appointment;
  }

  async reschedule(id: string, appointmentDate: Date, appointmentTime: string) {
    const appointment = await this.appointmentModel.findById(id);

    if (!appointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn');
    }

    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Không thể đổi lịch hẹn đã hoàn thành');
    }

    // Validate and normalize appointmentDate and time
    const apptDateRaw =
      appointmentDate instanceof Date
        ? appointmentDate
        : new Date(appointmentDate as any);
    if (!apptDateRaw || isNaN(apptDateRaw.getTime())) {
      throw new BadRequestException('appointmentDate không hợp lệ');
    }
    const normalizedDate = new Date(
      Date.UTC(
        apptDateRaw.getUTCFullYear(),
        apptDateRaw.getUTCMonth(),
        apptDateRaw.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );

    if (!appointmentTime || !this.isValidTimeString(appointmentTime)) {
      throw new BadRequestException(
        'appointmentTime không hợp lệ (định dạng HH:MM)',
      );
    }

    // Kiểm tra xem bác sĩ có lịch hẹn chính xác vào khung giờ này không
    const hasExactTimeOverlap = await this.hasExactTimeOverlap(
      appointment.doctorId.toString(),
      normalizedDate,
      appointmentTime,
    );

    if (hasExactTimeOverlap) {
      throw new BadRequestException('Bác sĩ đã có lịch hẹn vào khung giờ này');
    }

    appointment.appointmentDate = normalizedDate;
    appointment.startTime = appointmentTime;
    // keep legacy field in sync to avoid inserting null appointmentTime
    (appointment as any).appointmentTime =
      (appointment as any).appointmentTime || appointmentTime;
    // update endTime
    appointment.endTime = this.calculateEndTime(
      appointmentTime,
      appointment.duration || 30,
    );
    appointment.status = AppointmentStatus.PENDING;

    await appointment.save();

    await this.syncFollowUpRecord(appointment as any, {
      updatedDate: appointment.appointmentDate,
      updatedTime: appointment.startTime,
    });

    return appointment;
  }

  async cancel(id: string, reason: string, cancelledBy?: 'doctor' | 'patient') {
    // For patient-initiated cancellations, remove the appointment document entirely.
    const appointment = await this.appointmentModel.findById(id).populate([
      { path: 'doctorId', select: 'fullName email' },
      { path: 'patientId', select: 'fullName email' },
    ]);

    if (!appointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn');
    }

    // Get IDs before deletion/update
    const docId = (appointment.doctorId as any)._id.toString();
    const patId = (appointment.patientId as any)._id.toString();
    const appointmentData = appointment.toObject();

    // Determine who cancelled
    const actualCancelledBy = cancelledBy || 'patient'; // Default to patient for backward compatibility

    // Delete any pending bills for this appointment
    await this.billingHelper.deletePendingBillsForAppointment(id);

    if (actualCancelledBy === 'patient') {
      // Patient cancel: Delete appointment
      await this.appointmentModel.findByIdAndDelete(id);
      await this.syncFollowUpRecord(appointment as any, { cancelled: true });

      // Notify doctor
      void this.appointmentNotificationGateway.notifyAppointmentCancelled(
        docId,
        appointmentData,
        'patient',
      );

      // Send email to doctor
      void this.emailService.sendCancellationEmail(
        appointmentData,
        appointment.doctorId as any,
        appointment.patientId as any,
        'patient',
        reason,
      );
    } else {
      // Doctor cancel: Update status to cancelled (keep record)
      appointment.status = AppointmentStatus.CANCELLED;
      appointment.cancellationReason = reason;
      await appointment.save();
      await this.syncFollowUpRecord(appointment as any, { cancelled: true });

      // Notify patient
      void this.appointmentNotificationGateway.notifyAppointmentCancelled(
        patId,
        appointmentData,
        'doctor',
      );

      // Send email to patient
      void this.emailService.sendCancellationEmail(
        appointmentData,
        appointment.doctorId as any,
        appointment.patientId as any,
        'doctor',
        reason,
      );
    }

    return { message: 'Đã hủy lịch hẹn' };
  }

  async confirm(id: string) {
    return this.confirmAppointment(id);
  }

  async complete(id: string) {
    return this.completeAppointment(id);
  }

  async findByDate(date: string, query: string) {
    const { filter, sort, population, projection } = aqp(query);
    const sd = new Date(date);
    const startDate = new Date(
      Date.UTC(
        sd.getUTCFullYear(),
        sd.getUTCMonth(),
        sd.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
    const endDate = new Date(
      Date.UTC(
        sd.getUTCFullYear(),
        sd.getUTCMonth(),
        sd.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );

    const appointments = await this.appointmentModel
      .find({
        ...filter,
        appointmentDate: { $gte: startDate, $lte: endDate },
        status: { $ne: AppointmentStatus.CANCELLED }, // Exclude cancelled appointments from calendar
      })
      .sort((sort as any) || { startTime: 1 })
      .populate(population)
      .select(projection as any);

    return appointments;
  }

  async findByDateRange(startDate: string, endDate: string, query: string) {
    const { filter, sort, population, projection } = aqp(query);
    const s = new Date(startDate);
    const start = new Date(
      Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate(), 0, 0, 0, 0),
    );
    const e = new Date(endDate);
    const end = new Date(
      Date.UTC(
        e.getUTCFullYear(),
        e.getUTCMonth(),
        e.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );

    const appointments = await this.appointmentModel
      .find({
        ...filter,
        appointmentDate: { $gte: start, $lte: end },
        status: { $ne: AppointmentStatus.CANCELLED }, // Exclude cancelled appointments from calendar
      })
      .sort((sort as any) || { appointmentDate: 1, startTime: 1 })
      .populate(population)
      .select(projection as any);

    return appointments;
  }

  async findByMonth(year: number, month: number, query: string) {
    const { filter, sort, population, projection } = aqp(query);

    // Tạo ngày đầu tháng và cuối tháng
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const lastDay = new Date(Date.UTC(year, month, 0));
    const endDate = new Date(
      Date.UTC(year, month - 1, lastDay.getUTCDate(), 23, 59, 59, 999),
    );

    const appointments = await this.appointmentModel
      .find({
        ...filter,
        appointmentDate: { $gte: startDate, $lte: endDate },
        status: { $ne: AppointmentStatus.CANCELLED }, // Exclude cancelled appointments from calendar
      })
      .sort((sort as any) || { appointmentDate: 1, startTime: 1 })
      .populate(population)
      .select(projection as any);

    return appointments;
  }

  async cancelAppointment(id: string, reason: string) {
    const appointment = await this.appointmentModel.findById(id);

    if (!appointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn');
    }

    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Không thể hủy lịch hẹn đã hoàn thành');
    }

    // Delete any pending bills for this appointment
    await this.billingHelper.deletePendingBillsForAppointment(id);

    appointment.status = AppointmentStatus.CANCELLED;
    appointment.cancellationReason = reason;

    await appointment.save();

    await this.syncFollowUpRecord(appointment as any, { cancelled: true });

    return appointment;
  }

  async confirmAppointment(id: string) {
    const appointment = await this.appointmentModel.findById(id).populate([
      { path: 'doctorId', select: 'fullName email' },
      { path: 'patientId', select: 'fullName email' },
    ]);

    if (!appointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn');
    }

    if (appointment.status !== AppointmentStatus.PENDING) {
      throw new BadRequestException('Chỉ có thể xác nhận lịch hẹn đang chờ');
    }

    appointment.status = AppointmentStatus.CONFIRMED;
    await appointment.save();

    // Notify patient about confirmation
    const patId = (appointment.patientId as any)._id.toString();
    const appointmentData = appointment.toObject();

    void this.appointmentNotificationGateway.notifyPatientAppointmentConfirmed(
      patId,
      appointmentData,
    );

    return appointment;
  }

  async completeAppointment(id: string) {
    const appointment = await this.appointmentModel.findById(id).populate([
      { path: 'doctorId', select: 'fullName email' },
      { path: 'patientId', select: 'fullName email' },
    ]);

    if (!appointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn');
    }

    if (
      appointment.status !== AppointmentStatus.CONFIRMED &&
      appointment.status !== AppointmentStatus.IN_PROGRESS
    ) {
      throw new BadRequestException(
        'Chỉ có thể hoàn thành lịch hẹn đã xác nhận hoặc đang tiến hành',
      );
    }

    appointment.status = AppointmentStatus.COMPLETED;
    await appointment.save();

    // Notify patient about completion
    const patId = (appointment.patientId as any)._id.toString();
    const appointmentData = appointment.toObject();

    void this.appointmentNotificationGateway.notifyAppointmentCompleted(
      patId,
      appointmentData,
    );

    return appointment;
  }

  async startAppointment(id: string) {
    const appointment = await this.appointmentModel.findById(id);

    if (!appointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn');
    }

    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new BadRequestException('Chỉ có thể bắt đầu lịch hẹn đã xác nhận');
    }

    appointment.status = AppointmentStatus.IN_PROGRESS;

    await appointment.save();

    return appointment;
  }

  async rescheduleAppointment(
    id: string,
    updateAppointmentDto: UpdateAppointmentDto,
  ) {
    const appointment = await this.appointmentModel.findById(id);

    if (!appointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn');
    }

    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Không thể đổi lịch hẹn đã hoàn thành');
    }

    // Prepare new appointment data
    const newData = {
      ...appointment.toObject(),
      ...updateAppointmentDto,
      _id: undefined,
      isRescheduled: true,
      previousAppointmentId: appointment._id,
      status: AppointmentStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    // Determine appointmentDate and times for overlap check
    // normalize and validate new appointment date/time
    const newApptDate =
      newData.appointmentDate instanceof Date
        ? newData.appointmentDate
        : new Date(newData.appointmentDate);
    if (!newApptDate || isNaN(newApptDate.getTime())) {
      throw new BadRequestException(
        'appointmentDate không hợp lệ cho lịch mới',
      );
    }
    newData.appointmentDate = new Date(
      Date.UTC(
        newApptDate.getUTCFullYear(),
        newApptDate.getUTCMonth(),
        newApptDate.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );

    const newStart = newData.startTime || appointment.startTime;
    if (!newStart || !this.isValidTimeString(newStart)) {
      throw new BadRequestException('startTime không hợp lệ cho lịch mới');
    }
    newData.startTime = newStart;
    newData.endTime =
      newData.endTime ||
      this.calculateEndTime(
        newStart,
        Number(newData.duration) || appointment.duration || 30,
      );
    // ensure legacy appointmentTime is present on new data
    newData.appointmentTime = newData.appointmentTime || newData.startTime;

    // Kiểm tra xem bác sĩ có lịch hẹn chính xác vào khung giờ này không
    // Chỉ kiểm tra trùng khớp chính xác khung giờ, không chặn các khung giờ liền kề
    const hasExactTimeOverlap = await this.hasExactTimeOverlap(
      appointment.doctorId.toString(),
      newData.appointmentDate,
      newData.startTime,
    );

    if (hasExactTimeOverlap) {
      throw new BadRequestException('Bác sĩ đã có lịch hẹn vào khung giờ này');
    }

    // Tạo lịch hẹn mới với thông tin cập nhật
    const newAppointment = new this.appointmentModel(newData);

    // Lưu lịch hẹn mới
    await newAppointment.save();

    // Cập nhật lịch hẹn cũ thành đã hủy
    appointment.status = AppointmentStatus.CANCELLED;
    appointment.cancellationReason = 'Đã đổi lịch';

    await appointment.save();

    await this.syncFollowUpRecord(newAppointment as any, {
      updatedDate: newAppointment.appointmentDate,
      updatedTime: newAppointment.startTime,
    });

    return newAppointment;
  }

  async getPatientAppointmentHistory(patientId: string, query: any) {
    try {
      const { current = 1, pageSize = 10, status } = query;

      const filter: any = { patientId };

      if (status && status !== 'all') {
        filter.status = status;
      }

      const skip = (current - 1) * pageSize;
      const totalItems = await this.appointmentModel.countDocuments(filter);
      const totalPages = Math.ceil(totalItems / pageSize);

      const appointments = await this.appointmentModel
        .find(filter)
        .populate('doctorId', 'fullName specialty')
        .populate('patientId', 'fullName phone email')
        .sort({ appointmentDate: -1, startTime: -1 })
        .skip(skip)
        .limit(pageSize)
        .exec();

      return {
        success: true,
        data: {
          appointments,
          pagination: {
            current: +current,
            pageSize: +pageSize,
            totalItems,
            totalPages,
          },
        },
        message: 'Lấy lịch sử lịch hẹn thành công',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy lịch sử lịch hẹn',
      };
    }
  }

  async getPatientUpcomingAppointments(patientId: string) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcomingAppointments = await this.appointmentModel
        .find({
          patientId,
          appointmentDate: { $gte: today },
          status: { $nin: ['cancelled', 'completed'] },
        })
        .populate('doctorId', 'fullName specialty')
        .populate('patientId', 'fullName phone email')
        .sort({ appointmentDate: 1, startTime: 1 })
        .exec();

      return {
        success: true,
        data: upcomingAppointments,
        message: 'Lấy lịch hẹn sắp tới thành công',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy lịch hẹn sắp tới',
      };
    }
  }

  // Generate follow-up schedule for all patients seen by a doctor
  async getFollowUpByDoctor(doctorId: string) {
    if (!doctorId) throw new BadRequestException('Thiếu doctorId');

    // Find completed appointments for this doctor and sort by date desc
    const appointments = await this.appointmentModel
      .find({
        doctorId,
        status: AppointmentStatus.COMPLETED,
      })
      .sort({ appointmentDate: -1 })
      .populate('patientId', 'fullName phone email')
      .lean();

    // Map latest completed appointment per patient
    const latestByPatient = new Map<string, any>();
    for (const appt of appointments) {
      const pid =
        appt.patientId && (appt.patientId as any)._id
          ? String((appt.patientId as any)._id)
          : String(appt.patientId);
      if (!latestByPatient.has(pid)) {
        latestByPatient.set(pid, appt);
      }
    }

    const results: any[] = [];
    for (const [pid, appt] of latestByPatient.entries()) {
      const patient = appt.patientId || { _id: pid };
      const lastDate = appt.appointmentDate
        ? new Date(appt.appointmentDate)
        : null;
      if (!lastDate) continue;

      const m1 = new Date(lastDate);
      m1.setMonth(m1.getMonth() + 1);
      const m3 = new Date(lastDate);
      m3.setMonth(m3.getMonth() + 3);
      const m6 = new Date(lastDate);
      m6.setMonth(m6.getMonth() + 6);

      results.push({
        patient: {
          _id: patient._id,
          fullName: patient.fullName,
          phone: patient.phone,
          email: patient.email,
        },
        lastAppointmentDate: lastDate,
        followUps: {
          oneMonth: m1,
          threeMonths: m3,
          sixMonths: m6,
        },
      });
    }

    return results;
  }

  // Generate follow-up schedule for a single patient (grouped by doctor)
  async getFollowUpByPatient(patientId: string) {
    if (!patientId) throw new BadRequestException('Thiếu patientId');

    const appointments = await this.appointmentModel
      .find({
        patientId,
        status: AppointmentStatus.COMPLETED,
      })
      .sort({ appointmentDate: -1 })
      .populate('doctorId', 'fullName specialty')
      .lean();

    const latestByDoctor = new Map<string, any>();
    for (const appt of appointments) {
      const did =
        appt.doctorId && (appt.doctorId as any)._id
          ? String((appt.doctorId as any)._id)
          : String(appt.doctorId);
      if (!latestByDoctor.has(did)) {
        latestByDoctor.set(did, appt);
      }
    }

    const results: any[] = [];
    for (const [did, appt] of latestByDoctor.entries()) {
      const doctor = appt.doctorId || { _id: did };
      const lastDate = appt.appointmentDate
        ? new Date(appt.appointmentDate)
        : null;
      if (!lastDate) continue;

      const m1 = new Date(lastDate);
      m1.setMonth(m1.getMonth() + 1);
      const m3 = new Date(lastDate);
      m3.setMonth(m3.getMonth() + 3);
      const m6 = new Date(lastDate);
      m6.setMonth(m6.getMonth() + 6);

      results.push({
        doctor: {
          _id: doctor._id,
          fullName: doctor.fullName,
          specialty: doctor.specialty,
        },
        lastAppointmentDate: lastDate,
        followUps: {
          oneMonth: m1,
          threeMonths: m3,
          sixMonths: m6,
        },
      });
    }

    return results;
  }

  // Get available time slots for a doctor on a specific date
  async getAvailableSlots(
    doctorId: string,
    date: string,
    durationMinutes: number = 30,
  ) {
    if (!doctorId || !date) {
      throw new BadRequestException('Thiếu doctorId hoặc date');
    }

    // Parse date string (YYYY-MM-DD) to Date object
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      throw new BadRequestException('Định dạng ngày không hợp lệ');
    }

    // Set to start of day
    targetDate.setHours(0, 0, 0, 0);

    // End of day
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    // Fetch all booked appointments for this doctor on this date
    // KHÔNG exclude CANCELLED - cho phép đặt trùng giờ với lịch đã hủy
    const bookedAppointments = await this.appointmentModel
      .find({
        doctorId,
        appointmentDate: {
          $gte: targetDate,
          $lte: endDate,
        },
        status: {
          $nin: [AppointmentStatus.CANCELLED], // Chỉ exclude CANCELLED, giữ COMPLETED để check overlap
        },
      })
      .select('startTime endTime status')
      .lean();

    console.log('🔍 Query params:', {
      doctorId,
      targetDate,
      endDate,
      bookedAppointmentsCount: bookedAppointments.length,
    });

    // Extract booked time slots
    const bookedSlots = bookedAppointments.map((appt) => appt.startTime);

    // Generate all possible time slots based on duration
    const allSlots = this.generateTimeSlots(durationMinutes);

    // Filter out booked slots
    const availableSlots = allSlots.filter(
      (slot) => !bookedSlots.includes(slot),
    );

    return {
      date,
      duration: durationMinutes,
      bookedSlots,
      availableSlots,
      totalSlots: allSlots.length,
      availableCount: availableSlots.length,
    };
  }

  // Helper: Generate time slots from 8:00 to 17:00
  private generateTimeSlots(durationMinutes: number): string[] {
    const slots: string[] = [];
    const startHour = 8; // 8:00 AM
    const endHour = 17; // 5:00 PM

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += durationMinutes) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

        // Calculate end time to check if it exceeds working hours
        const totalMinutes = hour * 60 + minute + durationMinutes;
        const endHour = Math.floor(totalMinutes / 60);
        const endMinute = totalMinutes % 60;

        // Don't add slot if end time exceeds 17:00
        if (endHour > 17 || (endHour === 17 && endMinute > 0)) continue;

        slots.push(timeString);
      }
    }

    return slots;
  }

  private async syncFollowUpRecord(
    appointment: Appointment & { _id: any; medicalRecordId?: any },
    options: {
      cancelled?: boolean;
      updatedDate?: Date;
      updatedTime?: string;
    } = {},
  ): Promise<void> {
    const appointmentId = appointment?._id
      ? appointment._id.toString()
      : undefined;
    if (!appointmentId) return;

    const medicalRecordId = (appointment as any).medicalRecordId;

    let record = medicalRecordId
      ? await this.medicalRecordModel.findById(medicalRecordId).exec()
      : null;

    if (!record) {
      record = await this.medicalRecordModel
        .findOne({ followUpAppointmentId: appointmentId })
        .exec();
    }

    if (!record) return;

    if (options.cancelled) {
      record.isFollowUpRequired = false;
      record.followUpDate = null;
      (record as any).followUpTime = null;
      (record as any).followUpAppointmentId = null;
      await record.save();
      return;
    }

    const dateSource = options.updatedDate
      ? new Date(options.updatedDate)
      : appointment.appointmentDate instanceof Date
        ? new Date(appointment.appointmentDate)
        : new Date(appointment.appointmentDate as any);

    if (Number.isNaN(dateSource.getTime())) return;

    const startTime = options.updatedTime || appointment.startTime;
    if (!startTime || typeof startTime !== 'string') return;

    const timeMatch = startTime.match(/^(\d{1,2}):(\d{2})$/);
    if (!timeMatch) return;
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return;

    dateSource.setHours(hours, minutes, 0, 0);

    record.followUpDate = dateSource;
    (record as any).followUpTime =
      `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}`;
    (record as any).followUpAppointmentId = appointment._id;
    record.isFollowUpRequired = true;
    await record.save();
  }

  /**
   * ENHANCED: Check if rescheduling is within 30 minutes (near-time)
   */
  private isNearTime(appointmentDate: Date, startTime: string): boolean {
    const apptDateTime = new Date(appointmentDate);
    const [hours, minutes] = startTime.split(':').map(Number);
    apptDateTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const diffMinutes = (apptDateTime.getTime() - now.getTime()) / (1000 * 60);

    return diffMinutes < 30 && diffMinutes > 0;
  }

  /**
   * ENHANCED: Reschedule with billing logic
   * - Nếu còn >= 30 phút: Miễn phí
   * - Nếu < 30 phút: Thu phí 100,000 VND đặt chỗ
   */
  async rescheduleAppointmentWithBilling(
    id: string,
    updateAppointmentDto: UpdateAppointmentDto,
    userId: string,
  ) {
    const appointment = await this.appointmentModel
      .findById(id)
      .populate('patientId')
      .populate('doctorId');

    if (!appointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn');
    }

    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Không thể đổi lịch hẹn đã hoàn thành');
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Không thể đổi lịch hẹn đã hủy');
    }

    // Check if reschedule is near-time
    const nearTime = this.isNearTime(
      appointment.appointmentDate,
      appointment.startTime,
    );

    let feeCharged = false;
    if (nearTime) {
      // Create pending reservation charge (Phí giữ chỗ)
      await this.billingHelper.createPendingReservationCharge(
        (appointment.patientId as any)._id.toString(),
        (appointment.doctorId as any)._id.toString(),
        appointment._id.toString(),
      );

      feeCharged = true;
    }

    // Create new appointment
    const newData = {
      ...appointment.toObject(),
      ...updateAppointmentDto,
      _id: undefined,
      isRescheduled: true,
      previousAppointmentId: appointment._id,
      status: AppointmentStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    const newApptDate =
      newData.appointmentDate instanceof Date
        ? newData.appointmentDate
        : new Date(newData.appointmentDate);
    newData.appointmentDate = new Date(
      Date.UTC(
        newApptDate.getUTCFullYear(),
        newApptDate.getUTCMonth(),
        newApptDate.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );

    const newStart = newData.startTime || appointment.startTime;
    newData.startTime = newStart;
    newData.endTime =
      newData.endTime ||
      this.calculateEndTime(
        newStart,
        Number(newData.duration) || appointment.duration || 30,
      );

    const hasExactTimeOverlap = await this.hasExactTimeOverlap(
      (appointment.doctorId as any)._id.toString(),
      newData.appointmentDate,
      newData.startTime,
    );

    if (hasExactTimeOverlap) {
      throw new BadRequestException('Bác sĩ đã có lịch hẹn vào khung giờ này');
    }

    const newAppointment = new this.appointmentModel(newData);
    await newAppointment.save();

    // Populate newAppointment to get full doctor and patient data
    await newAppointment.populate([
      { path: 'doctorId', select: 'fullName email specialty' },
      { path: 'patientId', select: 'fullName email phone' },
    ]);

    // Update old appointment
    appointment.status = AppointmentStatus.CANCELLED;
    appointment.cancellationReason = feeCharged
      ? 'Đã đổi lịch (có phí đặt chỗ)'
      : 'Đã đổi lịch';
    await appointment.save();

    // Determine who rescheduled and notify only the other party
    const patientId = (appointment.patientId as any)._id.toString();
    const doctorId = (appointment.doctorId as any)._id.toString();

    const isPatientRescheduling = userId === patientId;

    if (isPatientRescheduling) {
      // Patient rescheduled -> notify doctor only
      await this.appointmentNotificationGateway.notifyAppointmentRescheduled(
        doctorId,
        newAppointment.toObject(),
        'doctor',
        feeCharged,
      );
    } else {
      // Doctor rescheduled -> notify patient only
      await this.appointmentNotificationGateway.notifyAppointmentRescheduled(
        patientId,
        newAppointment.toObject(),
        'patient',
        feeCharged,
      );
    }

    return {
      newAppointment,
      feeCharged,
      feeAmount: feeCharged ? RESERVATION_FEE_AMOUNT : 0,
    };
  }

  /**
   * ENHANCED: Cancel appointment with refund and billing logic
   * Patient cancellation:
   * - >= 30 min: Miễn phí, hoàn 100% phí khám nếu đã thanh toán
   * - < 30 min: Thu phí 100k đặt chỗ + hoàn phí khám nếu đã thanh toán
   */
  async cancelAppointmentWithBilling(
    id: string,
    reason: string,
    cancelledBy: 'patient' | 'doctor',
    doctorReason?: 'emergency' | 'patient_late',
  ) {
    const appointment = await this.appointmentModel
      .findById(id)
      .populate('patientId')
      .populate('doctorId');

    if (!appointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn');
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Lịch hẹn đã bị hủy trước đó');
    }

    const nearTime = this.isNearTime(
      appointment.appointmentDate,
      appointment.startTime,
    );

    let feeCharged = false;
    let voucherCreated = false;
    let refundIssued = false;

    if (cancelledBy === 'patient') {
      // Patient cancellation logic
      if (nearTime) {
        // < 30 min: Create pending reservation charge (Phí giữ chỗ)
        const result = await this.billingHelper.createPendingReservationCharge(
          (appointment.patientId as any)._id.toString(),
          (appointment.doctorId as any)._id.toString(),
          appointment._id.toString(),
        );

        // Emit events are already handled inside billingHelper.createPendingReservationCharge
        feeCharged = true;
      }

      // Check if consultation fee was paid, refund it
      const hasPaid = await this.billingHelper.hasExistingPayment(
        appointment._id.toString(),
      );

      if (hasPaid) {
        const originalPayment = await this.billingHelper.getOriginalPayment(
          appointment._id.toString(),
        );

        if (originalPayment) {
          await this.billingHelper.refundConsultationFee(
            (originalPayment as any)._id.toString(),
            originalPayment.amount,
            (appointment.patientId as any)._id.toString(),
            (appointment.doctorId as any)._id.toString(),
            appointment._id.toString(),
          );
          // Emit events are already handled inside billingHelper.refundConsultationFee

          refundIssued = true;
        }
      }

      appointment.cancelledBy = 'patient';
      appointment.cancellationFeeCharged = feeCharged;
      appointment.cancellationFeeAmount = feeCharged
        ? RESERVATION_FEE_AMOUNT
        : 0;
    } else {
      // Doctor cancellation logic
      appointment.cancelledBy = 'doctor';
      appointment.doctorCancellationReason = doctorReason;

      if (doctorReason === 'emergency') {
        // Emergency: Refund + create voucher
        const hasPaid = await this.billingHelper.hasExistingPayment(
          appointment._id.toString(),
        );

        if (hasPaid) {
          const originalPayment = await this.billingHelper.getOriginalPayment(
            appointment._id.toString(),
          );

          if (originalPayment) {
            await this.billingHelper.refundConsultationFee(
              (originalPayment as any)._id.toString(),
              originalPayment.amount,
              (appointment.patientId as any)._id.toString(),
              (appointment.doctorId as any)._id.toString(),
              appointment._id.toString(),
            );
            // Emit events are already handled inside billingHelper.refundConsultationFee

            refundIssued = true;
          }
        }

        // Create 5% voucher
        await this.vouchersService.createDoctorCancellationVoucher(
          (appointment.patientId as any)._id.toString(),
          appointment._id.toString(),
        );

        voucherCreated = true;
      } else if (doctorReason === 'patient_late') {
        // Patient late: Create ONE pending bill for patient (Phí giữ chỗ)
        this.logger.log(
          `Creating pending reservation charge for patient_late cancellation`,
        );

        const result = await this.billingHelper.createPendingReservationCharge(
          (appointment.patientId as any)._id.toString(),
          (appointment.doctorId as any)._id.toString(),
          appointment._id.toString(),
        );
        // Emit events are already handled inside billingHelper.createPendingReservationCharge

        feeCharged = true;

        // Refund consultation fee if already paid
        const hasPaid = await this.billingHelper.hasExistingPayment(
          appointment._id.toString(),
        );

        if (hasPaid) {
          const originalPayment = await this.billingHelper.getOriginalPayment(
            appointment._id.toString(),
          );

          if (originalPayment) {
            await this.billingHelper.refundConsultationFee(
              (originalPayment as any)._id.toString(),
              originalPayment.amount,
              (appointment.patientId as any)._id.toString(),
              (appointment.doctorId as any)._id.toString(),
              appointment._id.toString(),
            );
            // Emit events are already handled inside billingHelper.refundConsultationFee

            refundIssued = true;
          }
        }
      }
    }

    // Delete any pending consultation fee bills for this appointment
    // BillingHelper will emit revenue:delete events for deleted pending revenues
    // IMPORTANT: Only delete old consultation_fee bills, NOT the new cancellation_charge we just created
    // This applies when payment method was "cash" or "later" (pending payment)
    if (doctorReason !== 'patient_late') {
      // For emergency cancellation or patient cancellation, delete all pending bills
      await this.billingHelper.deletePendingBillsForAppointment(
        appointment._id.toString(),
      );
    } else {
      // For patient_late, only delete pending consultation_fee bills, keep the new cancellation_charge
      await this.billingHelper.deletePendingConsultationFeeBills(
        appointment._id.toString(),
      );
    }

    appointment.status = AppointmentStatus.CANCELLED;
    appointment.cancellationReason = reason;
    await appointment.save();

    // Send notification only to the other party (not the one who cancelled)
    const patientId = (appointment.patientId as any)._id.toString();
    const doctorId = (appointment.doctorId as any)._id.toString();

    // If patient cancelled -> notify doctor
    // If doctor cancelled -> notify patient
    const recipientUserId = cancelledBy === 'patient' ? doctorId : patientId;

    await this.appointmentNotificationGateway.notifyAppointmentCancelled(
      recipientUserId,
      appointment.toObject(),
      cancelledBy,
      feeCharged,
      voucherCreated,
    );

    return {
      appointment,
      feeCharged,
      feeAmount: feeCharged ? RESERVATION_FEE_AMOUNT : 0,
      refundIssued,
      voucherCreated,
    };
  }

  /**
   * Create follow-up suggestion (NOT an appointment)
   * Bác sĩ tạo đề xuất → Bệnh nhân thấy trong tab → Bệnh nhân đặt lịch như bình thường
   */
  async createFollowUpSuggestion(parentAppointmentId: string, notes?: string) {
    try {
      console.log('=== CREATE FOLLOW-UP SUGGESTION ===');
      console.log('parentAppointmentId:', parentAppointmentId);

      const parentAppointment = await this.appointmentModel
        .findById(parentAppointmentId)
        .populate('patientId')
        .populate('doctorId');

      console.log('parentAppointment found:', !!parentAppointment);

      if (!parentAppointment) {
        throw new NotFoundException('Không tìm thấy lịch hẹn gốc');
      }

      console.log(
        'patientId:',
        (parentAppointment.patientId as any)?._id?.toString(),
      );
      console.log(
        'doctorId:',
        (parentAppointment.doctorId as any)?._id?.toString(),
      );

      // Create voucher for follow-up discount
      console.log('Creating voucher...');
      const voucher = await this.vouchersService.createFollowUpVoucher(
        (parentAppointment.patientId as any)._id.toString(),
        parentAppointmentId,
      );
      console.log('Voucher created:', (voucher as any)._id);

      // Create follow-up SUGGESTION (not appointment) - just a simple record
      console.log('Creating suggestion...');
      const suggestion = new this.followUpSuggestionModel({
        patientId: (parentAppointment.patientId as any)._id,
        doctorId: (parentAppointment.doctorId as any)._id,
        parentAppointmentId: parentAppointmentId,
        notes: notes || 'Lịch tái khám theo đề xuất của bác sĩ',
        status: FollowUpSuggestionStatus.PENDING,
        voucherId: (voucher as any)._id,
      });

      await suggestion.save();
      console.log('✅ Suggestion saved:', suggestion._id);
      console.log(
        '🔗 Suggestion has parentAppointmentId:',
        parentAppointmentId,
      );
      this.logger.log(
        `🔔 Created follow-up suggestion ${String(suggestion._id)} for appointment ${String(parentAppointmentId)}`,
      );

      // Populate suggestion for notification and email
      const populatedSuggestion = await this.followUpSuggestionModel
        .findById(suggestion._id)
        .populate('patientId')
        .populate('doctorId')
        .populate('voucherId');

      // Send notification to patient
      try {
        console.log('Sending notification...');
        await this.notificationGateway.notifyFollowUpSuggestion(
          String((parentAppointment.patientId as any)._id),
          populatedSuggestion,
        );
        console.log('Notification sent successfully');
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
        // Don't throw - notification failure shouldn't break the flow
      }

      // Send email to patient
      try {
        console.log('Sending email...');
        if (populatedSuggestion) {
          await this.emailService.sendFollowUpSuggestionEmail(
            populatedSuggestion.patientId as any,
            populatedSuggestion.doctorId as any,
            populatedSuggestion as any,
          );
          console.log('Email sent successfully');
        }
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Don't throw - email failure shouldn't break the flow
      }

      console.log('=== FOLLOW-UP SUGGESTION CREATED SUCCESSFULLY ===');
      return {
        suggestion,
        voucher,
      };
    } catch (error) {
      console.error('=== ERROR IN createFollowUpSuggestion ===');
      console.error('Error:', error);
      console.error('Stack:', error.stack);
      throw error;
    }
  }

  /**
   * Get follow-up suggestions for patient
   */
  async getFollowUpSuggestions(patientId: string) {
    const suggestions = await this.followUpSuggestionModel
      .find({
        patientId,
        status: FollowUpSuggestionStatus.PENDING,
      })
      .populate('doctorId')
      .populate('parentAppointmentId')
      .populate('voucherId')
      .sort({ createdAt: -1 });

    this.logger.log(
      `📋 Found ${suggestions.length} follow-up suggestions for patient ${patientId}`,
    );

    if (suggestions.length > 0) {
      suggestions.forEach((s) => {
        const parentId =
          typeof s.parentAppointmentId === 'object'
            ? (s.parentAppointmentId as any)?._id
            : s.parentAppointmentId;
        this.logger.log(
          `  🔗 Suggestion ${String(s._id)} → parent: ${String(parentId)}`,
        );
      });
    }

    return suggestions;
  }

  /**
   * Reject follow-up suggestion
   */
  async rejectFollowUpSuggestion(suggestionId: string) {
    try {
      const suggestion = await this.followUpSuggestionModel
        .findById(suggestionId)
        .populate('patientId', 'fullName email')
        .populate('doctorId', 'fullName email');

      if (!suggestion) {
        throw new NotFoundException('Không tìm thấy đề xuất tái khám');
      }

      if (suggestion.status !== FollowUpSuggestionStatus.PENDING) {
        throw new BadRequestException('Đề xuất này đã được xử lý');
      }

      suggestion.status = FollowUpSuggestionStatus.REJECTED;
      suggestion.rejectedAt = new Date();
      await suggestion.save();

      // Send notification to doctor
      try {
        const doctorIdString =
          typeof suggestion.doctorId === 'object'
            ? (suggestion.doctorId as any)._id.toString()
            : (suggestion.doctorId as any).toString();

        await this.notificationGateway.notifyFollowUpRejected(
          doctorIdString,
          suggestion as any,
        );
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
        // Continue execution even if notification fails
      }

      // Send email to doctor
      try {
        console.log('Sending rejection email to doctor...');
        const populatedSuggestion = await this.followUpSuggestionModel
          .findById(suggestion._id)
          .populate('patientId')
          .populate('doctorId');

        if (
          populatedSuggestion &&
          populatedSuggestion.patientId &&
          populatedSuggestion.doctorId
        ) {
          await this.emailService.sendFollowUpRejectedEmail(
            populatedSuggestion.doctorId as any,
            populatedSuggestion.patientId as any,
            populatedSuggestion as any,
          );
          console.log('Rejection email sent successfully');
        } else {
          console.warn('Could not send email - missing patient or doctor data');
        }
      } catch (emailError) {
        console.error('Error sending rejection email:', emailError);
        // Don't throw - email failure shouldn't break the flow
      }

      return suggestion;
    } catch (error) {
      console.error('Error in rejectFollowUpSuggestion:', error);
      throw error;
    }
  }

  /**
   * Mark suggestion as scheduled (called after patient books appointment via 3-step modal)
   */
  async markFollowUpSuggestionAsScheduled(
    suggestionId: string,
    appointmentId: string,
  ) {
    const suggestion =
      await this.followUpSuggestionModel.findById(suggestionId);

    if (!suggestion) {
      throw new NotFoundException('Không tìm thấy đề xuất tái khám');
    }

    suggestion.status = FollowUpSuggestionStatus.SCHEDULED;
    suggestion.scheduledAppointmentId = appointmentId as any;
    suggestion.scheduledAt = new Date();
    await suggestion.save();

    return suggestion;
  }

  async confirmFollowUpAppointment(
    appointmentId: string,
    finalDate: Date,
    finalTime: string,
  ) {
    const appointment = await this.appointmentModel
      .findById(appointmentId)
      .populate('patientId')
      .populate('doctorId');

    if (!appointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn');
    }

    if (appointment.status !== AppointmentStatus.PENDING_PATIENT_CONFIRMATION) {
      throw new BadRequestException('Lịch hẹn không ở trạng thái chờ xác nhận');
    }

    // Update appointment with final date/time
    appointment.appointmentDate = finalDate;
    appointment.startTime = finalTime;
    appointment.endTime = this.calculateEndTime(
      finalTime,
      appointment.duration,
    );
    appointment.status = AppointmentStatus.PENDING_PAYMENT;

    // Apply 5% discount
    if (appointment.followUpDiscount && appointment.consultationFee) {
      const discountAmount =
        (appointment.consultationFee * appointment.followUpDiscount) / 100;
      appointment.consultationFee =
        appointment.consultationFee - discountAmount;
    }

    await appointment.save();

    // Send notification to doctor
    await this.appointmentNotificationGateway.notifyFollowUpConfirmed(
      (appointment.doctorId as any)._id.toString(),
      appointment as any,
    );

    return appointment;
  }

  async rejectFollowUpAppointment(appointmentId: string) {
    const appointment = await this.appointmentModel
      .findById(appointmentId)
      .populate('patientId')
      .populate('doctorId');

    if (!appointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn');
    }

    if (appointment.status !== AppointmentStatus.PENDING_PATIENT_CONFIRMATION) {
      throw new BadRequestException('Lịch hẹn không ở trạng thái chờ xác nhận');
    }

    appointment.status = AppointmentStatus.CANCELLED;
    appointment.cancelledBy = 'patient';
    appointment.cancellationReason = 'Bệnh nhân từ chối lịch tái khám';

    await appointment.save();

    // Send notification to doctor
    await this.notificationGateway.notifyFollowUpRejected(
      (appointment.doctorId as any)._id.toString(),
      appointment as any,
    );

    return appointment;
  }
}
