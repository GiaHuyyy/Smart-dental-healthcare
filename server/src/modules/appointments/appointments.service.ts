import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import aqp from 'api-query-params';
import { Model } from 'mongoose';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { Appointment, AppointmentStatus } from './schemas/appointment.schemas';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name) private appointmentModel: Model<Appointment>,
  ) { }

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
  private intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
    return aStart < bEnd && bStart < aEnd;
  }

  // Check if doctor has overlapping appointment on same day, optionally excluding an appointment id
  private async hasOverlap(doctorId: string, appointmentDate: Date, startTime: string, endTime: string, excludeId?: string) {
  const apd = appointmentDate instanceof Date ? appointmentDate : new Date(appointmentDate);
  const startOfDay = new Date(Date.UTC(apd.getUTCFullYear(), apd.getUTCMonth(), apd.getUTCDate(), 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(apd.getUTCFullYear(), apd.getUTCMonth(), apd.getUTCDate(), 23, 59, 59, 999));

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
      const storedStart = (ap.startTime || ap.appointmentTime || ap.time || '').toString().trim();
      if (!storedStart) continue; // skip malformed/legacy entries without a start time
      const bStart = this.timeToMinutes(storedStart);
      const durationNum = Number(ap.duration) || 30;
      const storedEnd = (ap.endTime || '').toString().trim();
      const bEnd = storedEnd ? this.timeToMinutes(storedEnd) : (bStart + durationNum);
      if (this.intervalsOverlap(aStart, aEnd, bStart, bEnd)) {
        return true;
      }
    }

    return false;
  }
  
  // Kiểm tra xem bác sĩ có lịch hẹn chính xác vào khung giờ này không
  private async hasExactTimeOverlap(doctorId: string, appointmentDate: Date, startTime: string) {
    const apd = appointmentDate instanceof Date ? appointmentDate : new Date(appointmentDate);
    const startOfDay = new Date(Date.UTC(apd.getUTCFullYear(), apd.getUTCMonth(), apd.getUTCDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(apd.getUTCFullYear(), apd.getUTCMonth(), apd.getUTCDate(), 23, 59, 59, 999));

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
    const dur = typeof duration === 'number' && !isNaN(duration) ? duration : 30;
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
      const apptDateRaw = appointmentDate instanceof Date ? appointmentDate : new Date(appointmentDate as any);
      if (!apptDateRaw || isNaN(apptDateRaw.getTime())) {
        throw new BadRequestException('appointmentDate không hợp lệ');
      }
      const normalizedDate = new Date(Date.UTC(apptDateRaw.getUTCFullYear(), apptDateRaw.getUTCMonth(), apptDateRaw.getUTCDate(), 0, 0, 0, 0));
      (createAppointmentDto as any).appointmentDate = normalizedDate;

      if (!startTime || !this.isValidTimeString(startTime)) {
        throw new BadRequestException('startTime không hợp lệ (định dạng HH:MM)');
      }

      // ensure numeric duration and compute endTime if missing
      (createAppointmentDto as any).duration = Number((createAppointmentDto as any).duration) || 30;
      if (!createAppointmentDto.endTime) {
        (createAppointmentDto as any).endTime = this.calculateEndTime(startTime, (createAppointmentDto as any).duration);
      }

      // Ensure appointmentDate is a Date
      const apptDate = appointmentDate instanceof Date ? appointmentDate : new Date(appointmentDate);
      
      // Kiểm tra xem bác sĩ có lịch trùng chính xác vào khung giờ này không
      const hasExactTimeOverlap = await this.hasExactTimeOverlap(doctorId, normalizedDate, startTime);
      if (hasExactTimeOverlap) {
        throw new BadRequestException('Bác sĩ đã có lịch hẹn vào khung giờ này');
      }

      // Save appointment (also keep legacy appointmentTime if needed elsewhere)
      const appointment = await this.appointmentModel.create(createAppointmentDto as any);
      return appointment;
    } catch (error) {
      // Handle legacy duplicate-key errors caused by old DB indexes pointing to appointmentTime
      if (error && (error.code === 11000 || error.name === 'MongoServerError')) {
        // Surface more info when possible
        const keyInfo = (error.keyValue && JSON.stringify(error.keyValue)) || (error.keyPattern && JSON.stringify(error.keyPattern)) || '';
        throw new BadRequestException(
          `Duplicate key error ${keyInfo}. If this persists, run server/scripts/drop-starttime-index.js to remove legacy index or inspect the DB.`,
        );
      }
      throw error;
    }
  }

  async findAll(query: string) {
    const { filter, sort, population, projection } = aqp(query);
    const appointments = await this.appointmentModel.find(filter)
      .sort(sort as any)
      .populate(population)
      .select(projection as any);
    return appointments;
  }

  async findOne(id: string) {
    const appointment = await this.appointmentModel.findById(id)
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
    const appointments = await this.appointmentModel.find({
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
    const appointments = await this.appointmentModel.find({
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
    
    const appointments = await this.appointmentModel.find({
      ...filter,
      doctorId,
      appointmentDate: { $gte: currentDate },
      status: { $in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] }
    })
      .sort(sort as any || { appointmentDate: 1, startTime: 1 })
      .populate(population)
      .select(projection as any);

    return appointments;
  }

  async findUpcomingByPatient(patientId: string, query: string) {
    const { filter, sort, population, projection } = aqp(query);
    const currentDate = new Date();
    
    const appointments = await this.appointmentModel.find({
      ...filter,
      patientId,
      appointmentDate: { $gte: currentDate },
      status: { $in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] }
    })
      .sort(sort as any || { appointmentDate: 1, startTime: 1 })
      .populate(population)
      .select(projection as any);

    return appointments;
  }

  async findHistoryByDoctor(doctorId: string, query: string) {
    const { filter, sort, population, projection } = aqp(query);
    const currentDate = new Date();
    
    const appointments = await this.appointmentModel.find({
      ...filter,
      doctorId,
      $or: [
        { appointmentDate: { $lt: currentDate } },
        { status: { $in: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED] } }
      ]
    })
      .sort(sort as any || { appointmentDate: -1, startTime: -1 })
      .populate(population)
      .select(projection as any);

    return appointments;
  }

  async findHistoryByPatient(patientId: string, query: string) {
    const { filter, sort, population, projection } = aqp(query);
    const currentDate = new Date();
    
    const appointments = await this.appointmentModel.find({
      ...filter,
      patientId,
      $or: [
        { appointmentDate: { $lt: currentDate } },
        { status: { $in: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED] } }
      ]
    })
      .sort(sort as any || { appointmentDate: -1, startTime: -1 })
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
    const apptDateRaw = appointmentDate instanceof Date ? appointmentDate : new Date(appointmentDate as any);
    if (!apptDateRaw || isNaN(apptDateRaw.getTime())) {
      throw new BadRequestException('appointmentDate không hợp lệ');
    }
    const normalizedDate = new Date(Date.UTC(apptDateRaw.getUTCFullYear(), apptDateRaw.getUTCMonth(), apptDateRaw.getUTCDate(), 0, 0, 0, 0));

    if (!appointmentTime || !this.isValidTimeString(appointmentTime)) {
      throw new BadRequestException('appointmentTime không hợp lệ (định dạng HH:MM)');
    }
    
    // Kiểm tra xem bác sĩ có lịch hẹn chính xác vào khung giờ này không
    const hasExactTimeOverlap = await this.hasExactTimeOverlap(
      appointment.doctorId.toString(),
      normalizedDate,
      appointmentTime
    );
    
    if (hasExactTimeOverlap) {
      throw new BadRequestException('Bác sĩ đã có lịch hẹn vào khung giờ này');
    }
    
    appointment.appointmentDate = normalizedDate;
    appointment.startTime = appointmentTime;
    // update endTime
    appointment.endTime = this.calculateEndTime(appointmentTime, appointment.duration || 30);
    appointment.status = AppointmentStatus.PENDING;

    await appointment.save();

    return appointment;
  }

  async cancel(id: string, reason: string) {
    // For patient-initiated cancellations, remove the appointment document entirely.
    const appointment = await this.appointmentModel.findByIdAndDelete(id);
    if (!appointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn');
    }
    return { message: 'Đã xóa lịch hẹn' };
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
  const startDate = new Date(Date.UTC(sd.getUTCFullYear(), sd.getUTCMonth(), sd.getUTCDate(), 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(sd.getUTCFullYear(), sd.getUTCMonth(), sd.getUTCDate(), 23, 59, 59, 999));
    
    const appointments = await this.appointmentModel.find({
      ...filter,
      appointmentDate: { $gte: startDate, $lte: endDate }
    })
      .sort(sort as any || { startTime: 1 })
      .populate(population)
      .select(projection as any);

    return appointments;
  }

  async findByDateRange(startDate: string, endDate: string, query: string) {
    const { filter, sort, population, projection } = aqp(query);
  const s = new Date(startDate);
  const start = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate(), 0, 0, 0, 0));
  const e = new Date(endDate);
  const end = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate(), 23, 59, 59, 999));
    
    const appointments = await this.appointmentModel.find({
      ...filter,
      appointmentDate: { $gte: start, $lte: end }
    })
      .sort(sort as any || { appointmentDate: 1, startTime: 1 })
      .populate(population)
      .select(projection as any);

    return appointments;
  }

  async findByMonth(year: number, month: number, query: string) {
    const { filter, sort, population, projection } = aqp(query);
    
    // Tạo ngày đầu tháng và cuối tháng
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const lastDay = new Date(Date.UTC(year, month, 0));
  const endDate = new Date(Date.UTC(year, month - 1, lastDay.getUTCDate(), 23, 59, 59, 999));
    
    const appointments = await this.appointmentModel.find({
      ...filter,
      appointmentDate: { $gte: startDate, $lte: endDate }
    })
      .sort(sort as any || { appointmentDate: 1, startTime: 1 })
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

    return appointment;
  }

  async confirmAppointment(id: string) {
    const appointment = await this.appointmentModel.findById(id);

    if (!appointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn');
    }

    if (appointment.status !== AppointmentStatus.PENDING) {
      throw new BadRequestException('Chỉ có thể xác nhận lịch hẹn đang chờ');
    }

    appointment.status = AppointmentStatus.CONFIRMED;

    await appointment.save();

    return appointment;
  }

  async completeAppointment(id: string) {
    const appointment = await this.appointmentModel.findById(id);

    if (!appointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn');
    }

    if (appointment.status !== AppointmentStatus.CONFIRMED &&
      appointment.status !== AppointmentStatus.IN_PROGRESS) {
      throw new BadRequestException('Chỉ có thể hoàn thành lịch hẹn đã xác nhận hoặc đang tiến hành');
    }

    appointment.status = AppointmentStatus.COMPLETED;

    await appointment.save();

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

  async rescheduleAppointment(id: string, updateAppointmentDto: UpdateAppointmentDto) {
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
    const newApptDate = newData.appointmentDate instanceof Date ? newData.appointmentDate : new Date(newData.appointmentDate);
    if (!newApptDate || isNaN(newApptDate.getTime())) {
      throw new BadRequestException('appointmentDate không hợp lệ cho lịch mới');
    }
    newData.appointmentDate = new Date(Date.UTC(newApptDate.getUTCFullYear(), newApptDate.getUTCMonth(), newApptDate.getUTCDate(), 0, 0, 0, 0));

    const newStart = newData.startTime || appointment.startTime;
    if (!newStart || !this.isValidTimeString(newStart)) {
      throw new BadRequestException('startTime không hợp lệ cho lịch mới');
    }
    newData.startTime = newStart;
    newData.endTime = newData.endTime || this.calculateEndTime(newStart, Number(newData.duration) || appointment.duration || 30);

    // Kiểm tra xem bác sĩ có lịch hẹn chính xác vào khung giờ này không
    // Chỉ kiểm tra trùng khớp chính xác khung giờ, không chặn các khung giờ liền kề
    const hasExactTimeOverlap = await this.hasExactTimeOverlap(
      appointment.doctorId.toString(),
      newData.appointmentDate,
      newData.startTime
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

    return newAppointment;
  }

  async getAvailableSlots(doctorId: string, date: string) {
    // Kiểm tra tham số đầu vào
    if (!doctorId || !date) {
      throw new BadRequestException('Thiếu thông tin bác sĩ hoặc ngày');
    }

    // Tạo đối tượng Date từ chuỗi ngày
  const sd = new Date(date);
  const selectedDate = new Date(Date.UTC(sd.getUTCFullYear(), sd.getUTCMonth(), sd.getUTCDate(), 0, 0, 0, 0));
  // Tạo ngày kết thúc (cuối ngày)
  const endDate = new Date(Date.UTC(sd.getUTCFullYear(), sd.getUTCMonth(), sd.getUTCDate(), 23, 59, 59, 999));

    // Lấy danh sách các lịch hẹn của bác sĩ trong ngày đã chọn (theo appointmentDate)
    const appointments = await this.appointmentModel.find({
      doctorId,
      appointmentDate: { $gte: selectedDate, $lte: endDate },
      status: { $nin: [AppointmentStatus.CANCELLED] },
    }).sort({ startTime: 1 }).lean();

    // Danh sách các khung giờ làm việc (8:00 - 17:00, mỗi khung 30 phút)
    const workingHours = [];
    const startHour = 8;
    const endHour = 17;
    const slotDuration = 30; // 30 phút

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        workingHours.push(timeString as never);
      }
    }

    // Danh sách các khung giờ đã có lịch hẹn
    // Chỉ đánh dấu chính xác khung giờ đã đặt, không ảnh hưởng đến các khung giờ liền kề
    const unavailableSet = new Set<string>();
    for (const appt of appointments) {
      const ap = appt as any;
      const apptStart = ap.startTime || ap.appointmentTime || ap.time; // 'HH:MM'
      if (!apptStart || !this.isValidTimeString(apptStart)) {
        // skip malformed legacy entries without a proper start time
        continue;
      }
      
      // Chỉ đánh dấu chính xác khung giờ bắt đầu của lịch hẹn
      // Tìm khung giờ làm việc tương ứng với thời gian bắt đầu của lịch hẹn
      const matchingSlot = workingHours.find(slot => slot === apptStart);
      if (matchingSlot) {
        unavailableSet.add(matchingSlot);
      }
    }

    const unavailableSlots = Array.from(unavailableSet).sort();

    // Danh sách các khung giờ còn trống
    const availableSlots = workingHours.filter(time => !unavailableSlots.includes(time));

    return {
      availableSlots,
      unavailableSlots,
      date: selectedDate.toISOString().split('T')[0],
    };
  }
}