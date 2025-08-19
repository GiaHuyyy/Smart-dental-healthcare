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
    const newRecord = new this.medicalRecordModel(createMedicalRecordDto);
    return newRecord.save();
  }

  async findAll(query: any): Promise<MedicalRecord[]> {
    const { limit = 10, page = 1, ...rest } = query;
    const skip = (page - 1) * limit;
    
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
    const { limit = 10, page = 1 } = query;
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
    const { limit = 10, page = 1 } = query;
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

  async scheduleFollowUp(id: string, followUpDate: Date): Promise<MedicalRecord> {
    const record = await this.medicalRecordModel.findById(id).exec();

    if (!record) {
      throw new NotFoundException(`Không tìm thấy hồ sơ bệnh án với ID: ${id}`);
    }

    record.isFollowUpRequired = true;
    record.followUpDate = followUpDate;

    return record.save();
  }
}