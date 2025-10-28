import {
  BadRequestException,
  Injectable,
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

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name) private appointmentModel: Model<Appointment>,
    @InjectModel(MedicalRecord.name)
    private readonly medicalRecordModel: Model<MedicalRecord>,
    private readonly notificationGateway: AppointmentNotificationGateway,
    private readonly emailService: AppointmentEmailService,
    private readonly billingHelper: BillingHelperService,
    private readonly vouchersService: VouchersService,
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

      // Basic required fields validation
      if (!doctorId) {
        throw new BadRequestException('Thiếu doctorId');
      }

      // Normalize and validate appointmentDate -> store as UTC midnight date
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

      // Ensure appointmentDate is a Date
      const apptDate =
        appointmentDate instanceof Date
          ? appointmentDate
          : new Date(appointmentDate);

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

      // Send real-time notification to doctor
      const docId = (populatedAppointment.doctorId as any)._id.toString();
      this.notificationGateway.notifyDoctorNewAppointment(
        docId,
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

    if (actualCancelledBy === 'patient') {
      // Patient cancel: Delete appointment
      await this.appointmentModel.findByIdAndDelete(id);
      await this.syncFollowUpRecord(appointment as any, { cancelled: true });

      // Notify doctor
      this.notificationGateway.notifyAppointmentCancelled(
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
      this.notificationGateway.notifyAppointmentCancelled(
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

    this.notificationGateway.notifyPatientAppointmentConfirmed(
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

    this.notificationGateway.notifyAppointmentCompleted(patId, appointmentData);

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
    console.log('📋 Booked appointments:', bookedAppointments);

    // Extract booked time slots
    const bookedSlots = bookedAppointments.map((appt) => appt.startTime);
    console.log('🚫 Booked slots array:', bookedSlots);

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
      // Charge reservation fee
      await this.billingHelper.chargeReservationFeeFromPatient(
        (appointment.patientId as any)._id.toString(),
        (appointment.doctorId as any)._id.toString(),
        appointment._id.toString(),
      );

      await this.billingHelper.createReservationFeeForDoctor(
        (appointment.doctorId as any)._id.toString(),
        (appointment.patientId as any)._id.toString(),
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

    // Update old appointment
    appointment.status = AppointmentStatus.CANCELLED;
    appointment.cancellationReason = feeCharged
      ? 'Đã đổi lịch (có phí đặt chỗ)'
      : 'Đã đổi lịch';
    await appointment.save();

    // Send notifications to both patient and doctor
    const patientId = (appointment.patientId as any)._id.toString();
    const doctorId = (appointment.doctorId as any)._id.toString();

    await this.notificationGateway.notifyAppointmentRescheduled(
      patientId,
      newAppointment as any,
      'patient',
      feeCharged,
    );

    await this.notificationGateway.notifyAppointmentRescheduled(
      doctorId,
      newAppointment as any,
      'doctor',
      feeCharged,
    );

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
        // < 30 min: Charge reservation fee
        await this.billingHelper.chargeReservationFeeFromPatient(
          (appointment.patientId as any)._id.toString(),
          (appointment.doctorId as any)._id.toString(),
          appointment._id.toString(),
        );

        await this.billingHelper.createReservationFeeForDoctor(
          (appointment.doctorId as any)._id.toString(),
          (appointment.patientId as any)._id.toString(),
          appointment._id.toString(),
        );

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
        // Patient late: Charge fee + refund consultation fee
        await this.billingHelper.chargeReservationFeeFromPatient(
          (appointment.patientId as any)._id.toString(),
          (appointment.doctorId as any)._id.toString(),
          appointment._id.toString(),
        );

        await this.billingHelper.createReservationFeeForDoctor(
          (appointment.doctorId as any)._id.toString(),
          (appointment.patientId as any)._id.toString(),
          appointment._id.toString(),
        );

        feeCharged = true;

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

            refundIssued = true;
          }
        }
      }
    }

    appointment.status = AppointmentStatus.CANCELLED;
    appointment.cancellationReason = reason;
    await appointment.save();

    // Send notifications
    const patientId = (appointment.patientId as any)._id.toString();
    const doctorId = (appointment.doctorId as any)._id.toString();

    const targetUserId = cancelledBy === 'patient' ? patientId : doctorId;

    await this.notificationGateway.notifyAppointmentCancelled(
      targetUserId,
      appointment as any,
      cancelledBy,
      feeCharged,
      voucherCreated,
    );

    // Also notify the other party
    const otherUserId = cancelledBy === 'patient' ? doctorId : patientId;
    await this.notificationGateway.notifyAppointmentCancelled(
      otherUserId,
      appointment as any,
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
   * ENHANCED: Create follow-up appointment suggestion (pending state)
   * Doctor creates suggestion → Patient sees in tab → Patient schedules with 5% discount
   */
  async createFollowUpSuggestion(
    parentAppointmentId: string,
    suggestedDate?: Date,
    suggestedTime?: string,
    notes?: string,
  ) {
    const parentAppointment = await this.appointmentModel
      .findById(parentAppointmentId)
      .populate('patientId')
      .populate('doctorId');

    if (!parentAppointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn gốc');
    }

    // Create voucher for follow-up discount
    const voucher = await this.vouchersService.createFollowUpVoucher(
      (parentAppointment.patientId as any)._id.toString(),
      parentAppointmentId,
    );

    // Create follow-up appointment in PENDING_PATIENT_CONFIRMATION state
    // Date and time will be selected by patient later
    const followUpAppointment = new this.appointmentModel({
      patientId: (parentAppointment.patientId as any)._id,
      doctorId: (parentAppointment.doctorId as any)._id,
      appointmentDate: suggestedDate, // Optional - patient will choose
      startTime: suggestedTime, // Optional - patient will choose
      endTime: suggestedTime
        ? this.calculateEndTime(suggestedTime, 30)
        : undefined,
      duration: 30,
      appointmentType: 'Tái khám',
      consultationFee: parentAppointment.consultationFee,
      notes: notes || 'Lịch tái khám theo đề xuất của bác sĩ',
      status: AppointmentStatus.PENDING_PATIENT_CONFIRMATION,
      isFollowUp: true,
      isFollowUpSuggestion: true,
      followUpParentId: parentAppointmentId,
      followUpDiscount: 5,
      suggestedFollowUpDate: suggestedDate, // Store suggestion if provided
      suggestedFollowUpTime: suggestedTime, // Store suggestion if provided
      appliedVoucherId: (voucher as any)._id,
    });

    await followUpAppointment.save();

    // Send notification to patient
    await this.notificationGateway.notifyFollowUpSuggestion(
      followUpAppointment as any,
    );

    // Send email to patient (comment out until email method is added)
    // await this.emailService.sendFollowUpSuggestionEmail(
    //   parentAppointment.patientId as any,
    //   parentAppointment.doctorId as any,
    //   followUpAppointment as any,
    // );

    return {
      followUpAppointment,
      voucher,
    };
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
    await this.notificationGateway.notifyFollowUpConfirmed(
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
