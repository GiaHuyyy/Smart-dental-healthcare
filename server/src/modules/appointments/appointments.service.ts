import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { Appointment, AppointmentStatus } from './schemas/appointment.schemas';
import aqp from 'api-query-params';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name) private appointmentModel: Model<Appointment>,
  ) { }

  async create(createAppointmentDto: CreateAppointmentDto) {
    try {
      // Kiểm tra xem bác sĩ có lịch trùng không
      const { doctorId, appointmentDate, startTime, endTime } = createAppointmentDto;

      const existingAppointment = await this.appointmentModel.findOne({
        doctorId,
        appointmentDate,
        $or: [
          { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
          { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
          { startTime: { $gte: startTime }, endTime: { $lte: endTime } },
        ],
        status: { $nin: [AppointmentStatus.CANCELLED] },
      });

      if (existingAppointment) {
        throw new BadRequestException('Bác sĩ đã có lịch hẹn trong khoảng thời gian này');
      }

      const appointment = await this.appointmentModel.create(createAppointmentDto);
      return appointment;
    } catch (error) {
      if (error.code === 11000 && error.keyPattern && error.keyPattern.doctorId && error.keyPattern.appointmentDate && (error.keyPattern.appointmentTime || error.keyPattern.startTime)) {
        throw new BadRequestException('Bác sĩ đã có lịch hẹn trong khoảng thời gian này');
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

    // Cập nhật thông tin lịch hẹn
    appointment.appointmentDate = appointmentDate;
    appointment.startTime = appointmentTime;
    appointment.status = AppointmentStatus.PENDING;

    await appointment.save();

    return appointment;
  }

  async cancel(id: string, reason: string) {
    return this.cancelAppointment(id, reason);
  }

  async confirm(id: string) {
    return this.confirmAppointment(id);
  }

  async complete(id: string) {
    return this.completeAppointment(id);
  }

  async findByDate(date: string, query: string) {
    const { filter, sort, population, projection } = aqp(query);
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
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
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
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
    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    
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

    // Tạo lịch hẹn mới với thông tin cập nhật
    const newAppointment = new this.appointmentModel({
      ...appointment.toObject(),
      ...updateAppointmentDto,
      _id: undefined,
      isRescheduled: true,
      previousAppointmentId: appointment._id,
      status: AppointmentStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

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
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);

    // Tạo ngày kết thúc (cuối ngày)
    const endDate = new Date(selectedDate);
    endDate.setHours(23, 59, 59, 999);

    // Lấy danh sách các lịch hẹn của bác sĩ trong ngày đã chọn
    const appointments = await this.appointmentModel.find({
      doctorId,
      startTime: { $gte: selectedDate, $lte: endDate },
      status: { $nin: [AppointmentStatus.CANCELLED] },
    }).sort({ startTime: 1 });

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
    const unavailableSlots = appointments.map(appointment => {
      const startTime = new Date(appointment.startTime);
      return `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`;
    });

    // Danh sách các khung giờ còn trống
    const availableSlots = workingHours.filter(time => !unavailableSlots.includes(time));

    return {
      availableSlots,
      unavailableSlots,
      date: selectedDate.toISOString().split('T')[0],
    };
  }
}