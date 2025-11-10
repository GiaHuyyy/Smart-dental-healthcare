import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';
import {
  MedicalRecord,
  MedicalRecordDocument,
} from './schemas/medical-record.schemas';
import { AppointmentsService } from '../appointments/appointments.service';
import { CreateAppointmentDto } from '../appointments/dto/create-appointment.dto';
import { AppointmentStatus } from '../appointments/schemas/appointment.schemas';

@Injectable()
export class MedicalRecordsService {
  constructor(
    @InjectModel(MedicalRecord.name)
    private medicalRecordModel: Model<MedicalRecordDocument>,
    private readonly appointmentsService: AppointmentsService,
  ) {}

  async create(
    createMedicalRecordDto: CreateMedicalRecordDto,
  ): Promise<MedicalRecord> {
    console.log(
      '📝 Creating medical record with data:',
      JSON.stringify(createMedicalRecordDto, null, 2),
    );

    // Process and normalize the data for backward compatibility
    const processedData = this.processCreateData(createMedicalRecordDto);

    console.log('📝 Processed data:', JSON.stringify(processedData, null, 2));

    const newRecord = new this.medicalRecordModel(processedData);
    const savedRecord = await newRecord.save();

    console.log('✅ Medical record created successfully:', savedRecord._id);
    return savedRecord;
  }

  private processCreateData(dto: CreateMedicalRecordDto): any {
    const processedData = { ...dto };

    // Ensure chiefComplaint exists (backward compatibility)
    if (
      !processedData.chiefComplaint &&
      processedData.chiefComplaints &&
      processedData.chiefComplaints.length > 0
    ) {
      processedData.chiefComplaint = processedData.chiefComplaints.join(', ');
    }

    // Ensure diagnosis exists (backward compatibility)
    if (
      !processedData.diagnosis &&
      processedData.diagnoses &&
      processedData.diagnoses.length > 0
    ) {
      processedData.diagnosis = processedData.diagnoses.join(', ');
    }

    // Ensure treatmentPlan exists (backward compatibility)
    if (
      !processedData.treatmentPlan &&
      processedData.treatmentPlans &&
      processedData.treatmentPlans.length > 0
    ) {
      processedData.treatmentPlan = processedData.treatmentPlans.join(', ');
    }

    // Process medications - prefer detailed but fallback to simple
    if (
      !processedData.medications &&
      processedData.detailedMedications &&
      processedData.detailedMedications.length > 0
    ) {
      processedData.medications = processedData.detailedMedications.map(
        (med: any) => med.name,
      );
    }

    return processedData;
  }

  async findAll(query: any): Promise<MedicalRecord[]> {
    const limit = Number(query.limit) || 10;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * limit;

    // Remove pagination keys from filter
    const { limit: _l, page: _p, ...rest } = query;
    const filter = { ...rest };

    return this.medicalRecordModel
      .find(filter)
      .limit(limit)
      .skip(skip)
      .sort({ recordDate: -1 })
      .populate('patientId', 'fullName email phone')
      .populate('doctorId', 'fullName email specialty')
      .exec();
  }

  async findOne(id: string): Promise<MedicalRecord> {
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      throw new NotFoundException(`Không tìm thấy hồ sơ bệnh án với ID: ${id}`);
    }
    const record = await this.medicalRecordModel
      .findById(id)
      .populate('patientId', 'fullName email phone')
      .populate('doctorId', 'fullName email specialty')
      .populate('appointmentId')
      .exec();

    if (!record) {
      throw new NotFoundException(`Không tìm thấy hồ sơ bệnh án với ID: ${id}`);
    }

    return record;
  }

  async update(
    id: string,
    updateMedicalRecordDto: UpdateMedicalRecordDto,
  ): Promise<MedicalRecord> {
    const updatedRecord = await this.medicalRecordModel
      .findByIdAndUpdate(id, updateMedicalRecordDto, { new: true })
      .exec();

    if (!updatedRecord) {
      throw new NotFoundException(`Không tìm thấy hồ sơ bệnh án với ID: ${id}`);
    }

    return updatedRecord;
  }

  async remove(id: string): Promise<MedicalRecord> {
    const deletedRecord = await this.medicalRecordModel
      .findByIdAndDelete(id)
      .exec();

    if (!deletedRecord) {
      throw new NotFoundException(`Không tìm thấy hồ sơ bệnh án với ID: ${id}`);
    }

    return deletedRecord;
  }

  async findByPatient(patientId: string, query: any): Promise<MedicalRecord[]> {
    const limit = Number(query.limit) || 10;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * limit;

    return this.medicalRecordModel
      .find({ patientId })
      .limit(limit)
      .skip(skip)
      .sort({ recordDate: -1 })
      .populate(
        'patientId',
        'fullName email phone phoneNumber dateOfBirth gender',
      )
      .populate('doctorId', 'fullName email specialty phoneNumber')
      .populate('appointmentId')
      .exec();
  }

  async findByDoctor(doctorId: string, query: any): Promise<MedicalRecord[]> {
    const limit = Number(query.limit) || 10;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * limit;

    return this.medicalRecordModel
      .find({ doctorId })
      .limit(limit)
      .skip(skip)
      .sort({ recordDate: -1 })
      .populate('patientId', 'fullName email phone')
      .populate('appointmentId')
      .exec();
  }

  async addProcedure(id: string, procedure: any): Promise<MedicalRecord> {
    const record = await this.medicalRecordModel.findById(id).exec();

    if (!record) {
      throw new NotFoundException(`Không tìm thấy hồ sơ bệnh án với ID: ${id}`);
    }

    record.procedures.push(procedure);
    return record.save();
  }

  async updateDentalChart(
    id: string,
    dentalChartItem: any,
  ): Promise<MedicalRecord> {
    const record = await this.medicalRecordModel.findById(id).exec();

    if (!record) {
      throw new NotFoundException(`Không tìm thấy hồ sơ bệnh án với ID: ${id}`);
    }

    // Tìm và cập nhật hoặc thêm mới item trong dentalChart
    const existingItemIndex = record.dentalChart.findIndex(
      (item) => item.toothNumber === dentalChartItem.toothNumber,
    );

    if (existingItemIndex >= 0) {
      record.dentalChart[existingItemIndex] = {
        ...record.dentalChart[existingItemIndex],
        ...dentalChartItem,
      };
    } else {
      record.dentalChart.push(dentalChartItem);
    }

    return record.save();
  }

  async scheduleFollowUp(
    id: string,
    payload:
      | {
          followUpDate?: Date | string | null;
          followUpTime?: string | null;
          isFollowUpRequired?: boolean;
        }
      | Date
      | string
      | null,
  ): Promise<MedicalRecord> {
    const record = await this.medicalRecordModel.findById(id).exec();

    if (!record) {
      throw new NotFoundException(`Không tìm thấy hồ sơ bệnh án với ID: ${id}`);
    }

    let followUpDate: Date | null | undefined = undefined;
    let followUpTime: string | null | undefined = undefined;
    let isFollowUpRequired: boolean | undefined = undefined;

    if (
      payload instanceof Date ||
      typeof payload === 'string' ||
      payload === null
    ) {
      followUpDate = payload ? new Date(payload as any) : null;
      isFollowUpRequired = !!followUpDate;
    } else if (typeof payload === 'object' && payload !== null) {
      const {
        followUpDate: rawDate,
        followUpTime: rawTime,
        isFollowUpRequired: rawFlag,
      } = payload;
      if (rawDate !== undefined) {
        followUpDate = rawDate === null ? null : new Date(rawDate as any);
      }
      if (rawTime !== undefined) {
        followUpTime =
          rawTime === null ? null : this.normalizeTimeInput(rawTime);
      }
      if (typeof rawFlag === 'boolean') {
        isFollowUpRequired = rawFlag;
      }
    }

    // Infer flag from follow-up date when not explicitly provided
    if (typeof isFollowUpRequired === 'boolean') {
      record.isFollowUpRequired = isFollowUpRequired;
    } else if (followUpDate !== undefined) {
      record.isFollowUpRequired = !!followUpDate;
    }

    if (record.isFollowUpRequired && followUpDate === null) {
      throw new BadRequestException(
        'followUpDate không được bỏ trống khi yêu cầu tái khám',
      );
    }

    // Determine final follow-up time
    if (followUpTime === null) {
      record.followUpTime = null;
    } else if (followUpTime !== undefined) {
      record.followUpTime = followUpTime;
    } else if (record.isFollowUpRequired && !record.followUpTime) {
      record.followUpTime = '09:00';
    }

    // Update follow-up date (preserve combined time when present)
    if (followUpDate === null) {
      record.followUpDate = null;
    } else if (followUpDate !== undefined) {
      const finalTime = record.followUpTime || '09:00';
      record.followUpDate = this.combineDateAndTime(followUpDate, finalTime);
    }

    await this.syncFollowUpAppointment(record);

    return record.save();
  }

  private normalizeTimeInput(time?: string | null): string | undefined | null {
    if (time === undefined) return undefined;
    if (time === null) return null;
    const trimmed = time.trim();
    if (!trimmed) return undefined;
    const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      throw new BadRequestException(
        'followUpTime không hợp lệ (định dạng HH:MM)',
      );
    }
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      throw new BadRequestException(
        'followUpTime không hợp lệ (giờ hoặc phút vượt phạm vi)',
      );
    }
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  private combineDateAndTime(dateInput: Date, time: string): Date {
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('followUpDate không hợp lệ');
    }
    const [hours, minutes] = time.split(':').map((value) => Number(value));
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date;
  }

  private addMinutesToTime(time: string, minutesToAdd: number): string {
    const [hours, minutes] = time.split(':').map((value) => Number(value));
    const totalMinutes = (hours || 0) * 60 + (minutes || 0) + minutesToAdd;
    const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
    const finalHours = Math.floor(normalized / 60);
    const finalMinutes = normalized % 60;
    return `${finalHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
  }

  private async syncFollowUpAppointment(
    record: MedicalRecordDocument,
  ): Promise<void> {
    const wantsFollowUp = !!record.isFollowUpRequired && !!record.followUpDate;

    if (!wantsFollowUp) {
      if (record.followUpAppointmentId) {
        try {
          await this.appointmentsService.cancel(
            record.followUpAppointmentId.toString(),
            'Hủy lịch tái khám',
          );
        } catch (error) {
          // swallow cancellation errors to avoid blocking record update
          console.warn(
            '⚠️ Không thể hủy lịch tái khám:',
            error?.message || error,
          );
        }
        record.followUpAppointmentId = null;
        record.followUpDate = null;
        record.followUpTime = null;
        record.isFollowUpRequired = false;
      }
      return;
    }

    if (!record.followUpDate) {
      throw new BadRequestException('followUpDate không hợp lệ');
    }

    const startTime = record.followUpTime || '09:00';
    const appointmentDate = record.followUpDate;

    if (record.followUpAppointmentId) {
      await this.appointmentsService.reschedule(
        record.followUpAppointmentId.toString(),
        appointmentDate,
        startTime,
      );
      return;
    }

    const appointmentPayload: CreateAppointmentDto = {
      patientId: record.patientId.toString(),
      doctorId: record.doctorId.toString(),
      appointmentDate,
      startTime,
      endTime: this.addMinutesToTime(startTime, 30),
      duration: 30,
      appointmentType: 'Tái khám',
      notes: `Lịch tái khám cho hồ sơ bệnh án ${record._id.toString()}`,
      status: AppointmentStatus.PENDING,
      medicalRecordId: record._id.toString(),
    } as CreateAppointmentDto;

    const appointment =
      await this.appointmentsService.create(appointmentPayload);
    const appointmentIdRaw = appointment?._id;
    if (!appointmentIdRaw) {
      throw new BadRequestException(
        'Không thể tạo lịch tái khám: thiếu ID lịch hẹn',
      );
    }
    const normalizedAppointmentId =
      appointmentIdRaw instanceof mongoose.Types.ObjectId
        ? appointmentIdRaw
        : new mongoose.Types.ObjectId(String(appointmentIdRaw));
    record.followUpAppointmentId = normalizedAppointmentId;
  }

  async addAttachment(id: string, attachment: any): Promise<MedicalRecord> {
    const record = await this.medicalRecordModel.findById(id).exec();

    if (!record) {
      throw new NotFoundException(`Không tìm thấy hồ sơ bệnh án với ID: ${id}`);
    }

    // Accept either url string or object { url, filename }
    if (!attachment) {
      throw new NotFoundException('Attachment is required');
    }

    const att =
      typeof attachment === 'string' ? { url: attachment } : attachment;
    record.attachments = record.attachments || [];
    record.attachments.push(att.url || att);
    return record.save();
  }

  async removeAttachment(
    id: string,
    attachmentId: string,
  ): Promise<MedicalRecord> {
    const record = await this.medicalRecordModel.findById(id).exec();

    if (!record) {
      throw new NotFoundException(`Không tìm thấy hồ sơ bệnh án với ID: ${id}`);
    }

    // Allow removal by exact URL or by index string
    if (!record.attachments) record.attachments = [];
    const idx = Number(attachmentId);
    if (!Number.isNaN(idx)) {
      record.attachments.splice(idx, 1);
    } else {
      record.attachments = record.attachments.filter(
        (att) => att !== attachmentId,
      );
    }
    return record.save();
  }

  async updateStatus(id: string, status: string): Promise<MedicalRecord> {
    const record = await this.medicalRecordModel.findById(id).exec();

    if (!record) {
      throw new NotFoundException(`Không tìm thấy hồ sơ bệnh án với ID: ${id}`);
    }

    record.status = status;
    return record.save();
  }

  async getDoctorStatistics(doctorId: string, query: any): Promise<any> {
    // Nếu doctorId là 'general', trả về thống kê tổng quát
    if (doctorId === 'general') {
      const totalRecords = await this.medicalRecordModel.countDocuments({});
      const completedRecords = await this.medicalRecordModel.countDocuments({
        status: 'completed',
      });
      const pendingRecords = await this.medicalRecordModel.countDocuments({
        status: 'pending',
      });
      const followUpRecords = await this.medicalRecordModel.countDocuments({
        isFollowUpRequired: true,
      });

      return {
        totalRecords,
        completedRecords,
        pendingRecords,
        followUpRecords,
        completionRate:
          totalRecords > 0 ? (completedRecords / totalRecords) * 100 : 0,
        type: 'general',
      };
    }

    const { startDate, endDate } = query;
    const filter: any = { doctorId };

    if (startDate && endDate) {
      filter.recordDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const totalRecords = await this.medicalRecordModel.countDocuments(filter);
    const completedRecords = await this.medicalRecordModel.countDocuments({
      ...filter,
      status: 'completed',
    });
    const pendingRecords = await this.medicalRecordModel.countDocuments({
      ...filter,
      status: 'pending',
    });
    const followUpRecords = await this.medicalRecordModel.countDocuments({
      ...filter,
      isFollowUpRequired: true,
    });

    return {
      totalRecords,
      completedRecords,
      pendingRecords,
      followUpRecords,
      completionRate:
        totalRecords > 0 ? (completedRecords / totalRecords) * 100 : 0,
      type: 'specific',
      doctorId,
    };
  }

  async getPatientStatistics(patientId: string): Promise<any> {
    // Nếu patientId là 'general', trả về thống kê tổng quát
    if (patientId === 'general') {
      const totalRecords = await this.medicalRecordModel.countDocuments({});
      const completedRecords = await this.medicalRecordModel.countDocuments({
        status: 'completed',
      });
      const pendingRecords = await this.medicalRecordModel.countDocuments({
        status: 'pending',
      });
      const followUpRecords = await this.medicalRecordModel.countDocuments({
        isFollowUpRequired: true,
      });

      return {
        totalRecords,
        completedRecords,
        pendingRecords,
        followUpRecords,
        type: 'general',
      };
    }

    const totalRecords = await this.medicalRecordModel.countDocuments({
      patientId,
    });
    const completedRecords = await this.medicalRecordModel.countDocuments({
      patientId,
      status: 'completed',
    });
    const pendingRecords = await this.medicalRecordModel.countDocuments({
      patientId,
      status: 'pending',
    });
    const followUpRecords = await this.medicalRecordModel.countDocuments({
      patientId,
      isFollowUpRequired: true,
    });

    const latestRecord = await this.medicalRecordModel
      .findOne({ patientId })
      .sort({ recordDate: -1 })
      .populate('doctorId', 'fullName specialty')
      .exec();

    return {
      totalRecords,
      completedRecords,
      pendingRecords,
      followUpRecords,
      latestRecord,
      type: 'specific',
      patientId,
    };
  }

  async exportMedicalRecord(id: string, exportOptions: any): Promise<any> {
    const record = await this.findOne(id);

    // Tạo dữ liệu để xuất
    const exportData = {
      recordId: record._id.toString(),
      patientName: (record.patientId as any)?.['fullName'] || null,
      doctorName: (record.doctorId as any)?.['fullName'] || null,
      recordDate: record.recordDate,
      chiefComplaint: record.chiefComplaint,
      diagnosis: record.diagnosis,
      treatmentPlan: record.treatmentPlan,
      procedures: record.procedures,
      medications: record.medications,
      notes: record.notes,
      status: record.status,
      followUpDate: record.followUpDate,
    };

    return {
      success: true,
      data: exportData,
      format: exportOptions.format || 'json',
    };
  }

  async searchMedicalRecords(query: any): Promise<MedicalRecord[]> {
    const { search, limit = 10, page = 1 } = query;
    const skip = (page - 1) * limit;
    const trimmed = (search || '').trim();

    const searchFilter = trimmed
      ? {
          $or: [
            { chiefComplaint: { $regex: trimmed, $options: 'i' } },
            { diagnosis: { $regex: trimmed, $options: 'i' } },
            { treatmentPlan: { $regex: trimmed, $options: 'i' } },
            { notes: { $regex: trimmed, $options: 'i' } },
          ],
        }
      : {};

    return this.medicalRecordModel
      .find(searchFilter)
      .limit(Number(limit))
      .skip(Number(skip))
      .sort({ recordDate: -1 })
      .populate('patientId', 'fullName email phone')
      .populate('doctorId', 'fullName email specialty')
      .exec();
  }

  async findByAppointment(appointmentId: string): Promise<MedicalRecord[]> {
    return this.medicalRecordModel
      .find({ appointmentId })
      .populate('patientId', 'fullName email phone')
      .populate('doctorId', 'fullName email specialty')
      .populate('appointmentId')
      .sort({ recordDate: -1 })
      .exec();
  }

  async getFollowUpRecords(query: any): Promise<MedicalRecord[]> {
    const { limit = 10, page = 1, ...rest } = query;
    const skip = (page - 1) * limit;

    const filter = {
      ...rest,
      isFollowUpRequired: true,
      followUpDate: { $exists: true, $ne: null },
    };

    return this.medicalRecordModel
      .find(filter)
      .limit(limit)
      .skip(skip)
      .sort({ followUpDate: 1 })
      .populate('patientId', 'fullName email phone')
      .populate('doctorId', 'fullName email specialty')
      .exec();
  }
}
