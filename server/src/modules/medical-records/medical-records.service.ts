import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';
import { MedicalRecord, MedicalRecordDocument } from './schemas/medical-record.schemas';

@Injectable()
export class MedicalRecordsService {
  constructor(
    @InjectModel(MedicalRecord.name)
    private medicalRecordModel: Model<MedicalRecordDocument>,
  ) {}

  async create(createMedicalRecordDto: CreateMedicalRecordDto): Promise<MedicalRecord> {
    console.log('📝 Creating medical record with data:', JSON.stringify(createMedicalRecordDto, null, 2));
    
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
    if (!processedData.chiefComplaint && processedData.chiefComplaints && processedData.chiefComplaints.length > 0) {
      processedData.chiefComplaint = processedData.chiefComplaints.join(', ');
    }

    // Ensure diagnosis exists (backward compatibility)
    if (!processedData.diagnosis && processedData.diagnoses && processedData.diagnoses.length > 0) {
      processedData.diagnosis = processedData.diagnoses.join(', ');
    }

    // Ensure treatmentPlan exists (backward compatibility)
    if (!processedData.treatmentPlan && processedData.treatmentPlans && processedData.treatmentPlans.length > 0) {
      processedData.treatmentPlan = processedData.treatmentPlans.join(', ');
    }

    // Process medications - prefer detailed but fallback to simple
    if (!processedData.medications && processedData.detailedMedications && processedData.detailedMedications.length > 0) {
      processedData.medications = processedData.detailedMedications.map((med: any) => med.name);
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

  async update(id: string, updateMedicalRecordDto: UpdateMedicalRecordDto): Promise<MedicalRecord> {
    const updatedRecord = await this.medicalRecordModel
      .findByIdAndUpdate(id, updateMedicalRecordDto, { new: true })
      .exec();

    if (!updatedRecord) {
      throw new NotFoundException(`Không tìm thấy hồ sơ bệnh án với ID: ${id}`);
    }

    return updatedRecord;
  }

  async remove(id: string): Promise<MedicalRecord> {
    const deletedRecord = await this.medicalRecordModel.findByIdAndDelete(id).exec();

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
      .populate('doctorId', 'fullName email specialty')
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

  async updateDentalChart(id: string, dentalChartItem: any): Promise<MedicalRecord> {
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
    payload: { followUpDate?: Date | string | null; isFollowUpRequired?: boolean } | Date | string | null,
  ): Promise<MedicalRecord> {
    const record = await this.medicalRecordModel.findById(id).exec();

    if (!record) {
      throw new NotFoundException(`Không tìm thấy hồ sơ bệnh án với ID: ${id}`);
    }

    // Backwards-compatibility: allow direct Date/string payload
    let followUpDate: Date | null | undefined = undefined;
    let isFollowUpRequired: boolean | undefined = undefined;

    if (payload instanceof Date || typeof payload === 'string' || payload === null) {
      followUpDate = payload ? new Date(payload as any) : null;
      isFollowUpRequired = !!followUpDate;
    } else if (typeof payload === 'object' && payload !== null) {
      followUpDate = payload.followUpDate ? new Date(payload.followUpDate as any) : (payload.followUpDate === null ? null : undefined);
      isFollowUpRequired = typeof payload.isFollowUpRequired === 'boolean' ? payload.isFollowUpRequired : undefined;
    }

    // If explicit flag provided, use it. Otherwise infer from date presence.
    if (typeof isFollowUpRequired === 'boolean') {
      record.isFollowUpRequired = isFollowUpRequired;
    } else if (followUpDate !== undefined) {
      record.isFollowUpRequired = !!followUpDate;
    }

    // Update followUpDate according to provided value. If followUpDate === null, clear it.
    if (followUpDate === null) {
      // explicitly clear stored date
      (record as any).followUpDate = null;
    } else if (followUpDate !== undefined) {
      record.followUpDate = new Date(followUpDate as Date);
    }

    return record.save();
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

    const att = typeof attachment === 'string' ? { url: attachment } : attachment;
    record.attachments = record.attachments || [];
    record.attachments.push(att.url || att);
    return record.save();
  }

  async removeAttachment(id: string, attachmentId: string): Promise<MedicalRecord> {
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
      record.attachments = record.attachments.filter((att) => att !== attachmentId);
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
      const completedRecords = await this.medicalRecordModel.countDocuments({ status: 'completed' });
      const pendingRecords = await this.medicalRecordModel.countDocuments({ status: 'pending' });
      const followUpRecords = await this.medicalRecordModel.countDocuments({ isFollowUpRequired: true });

      return {
        totalRecords,
        completedRecords,
        pendingRecords,
        followUpRecords,
        completionRate: totalRecords > 0 ? (completedRecords / totalRecords) * 100 : 0,
        type: 'general'
      };
    }

    const { startDate, endDate } = query;
    const filter: any = { doctorId };
    
    if (startDate && endDate) {
      filter.recordDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const totalRecords = await this.medicalRecordModel.countDocuments(filter);
    const completedRecords = await this.medicalRecordModel.countDocuments({ ...filter, status: 'completed' });
    const pendingRecords = await this.medicalRecordModel.countDocuments({ ...filter, status: 'pending' });
    const followUpRecords = await this.medicalRecordModel.countDocuments({ ...filter, isFollowUpRequired: true });

    return {
      totalRecords,
      completedRecords,
      pendingRecords,
      followUpRecords,
      completionRate: totalRecords > 0 ? (completedRecords / totalRecords) * 100 : 0,
      type: 'specific',
      doctorId
    };
  }

  async getPatientStatistics(patientId: string): Promise<any> {
    // Nếu patientId là 'general', trả về thống kê tổng quát
    if (patientId === 'general') {
      const totalRecords = await this.medicalRecordModel.countDocuments({});
      const completedRecords = await this.medicalRecordModel.countDocuments({ status: 'completed' });
      const pendingRecords = await this.medicalRecordModel.countDocuments({ status: 'pending' });
      const followUpRecords = await this.medicalRecordModel.countDocuments({ isFollowUpRequired: true });

      return {
        totalRecords,
        completedRecords,
        pendingRecords,
        followUpRecords,
        type: 'general'
      };
    }

    const totalRecords = await this.medicalRecordModel.countDocuments({ patientId });
    const completedRecords = await this.medicalRecordModel.countDocuments({ patientId, status: 'completed' });
    const pendingRecords = await this.medicalRecordModel.countDocuments({ patientId, status: 'pending' });
    const followUpRecords = await this.medicalRecordModel.countDocuments({ patientId, isFollowUpRequired: true });

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
      patientId
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
      followUpDate: record.followUpDate
    };

    return {
      success: true,
      data: exportData,
      format: exportOptions.format || 'json'
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
            { notes: { $regex: trimmed, $options: 'i' } }
          ]
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
      followUpDate: { $exists: true, $ne: null }
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