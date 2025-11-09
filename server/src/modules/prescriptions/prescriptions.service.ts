import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { Prescription, PrescriptionDocument } from './schemas/prescription.schema';

@Injectable()
export class PrescriptionsService {
  constructor(
    @InjectModel(Prescription.name)
    private prescriptionModel: Model<PrescriptionDocument>,
  ) {}

  async create(createPrescriptionDto: CreatePrescriptionDto): Promise<Prescription> {
    // Nếu không có doctorId, tạo một doctorId mặc định hoặc để null
    const prescriptionData = {
      ...createPrescriptionDto,
      doctorId: createPrescriptionDto.doctorId || '000000000000000000000000' // ObjectId mặc định
    };
    
    const newPrescription = new this.prescriptionModel(prescriptionData);
    return newPrescription.save();
  }

  async findAll(query: any): Promise<Prescription[]> {
    const limit = Number(query.limit) || 10;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * limit;

    // Remove pagination keys from filter
    const { limit: _l, page: _p, ...rest } = query;
    const filter = { ...rest };

    return this.prescriptionModel
      .find(filter)
      .limit(limit)
      .skip(skip)
      .sort({ prescriptionDate: -1 })
      .populate('patientId', 'fullName email phone')
      .populate('doctorId', 'fullName email specialty')
      .populate('medicalRecordId')
      .exec();
  }

  async findOne(id: string): Promise<Prescription> {
    // validate ObjectId first to avoid Mongoose CastError
    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('id không hợp lệ');
    }

    const prescription = await this.prescriptionModel
      .findById(id)
      .populate('patientId', 'fullName email phone')
      .populate('doctorId', 'fullName email specialty')
      .populate('medicalRecordId')
      .populate('dispensedBy', 'fullName')
      .exec();

    if (!prescription) {
      throw new NotFoundException(`Không tìm thấy đơn thuốc với ID: ${id}`);
    }

    return prescription;
  }

  async update(id: string, updatePrescriptionDto: UpdatePrescriptionDto): Promise<Prescription> {
    const updatedPrescription = await this.prescriptionModel
      .findByIdAndUpdate(id, updatePrescriptionDto, { new: true })
      .exec();

    if (!updatedPrescription) {
      throw new NotFoundException(`Không tìm thấy đơn thuốc với ID: ${id}`);
    }

    return updatedPrescription;
  }

  async remove(id: string): Promise<Prescription> {
    const deletedPrescription = await this.prescriptionModel.findByIdAndDelete(id).exec();

    if (!deletedPrescription) {
      throw new NotFoundException(`Không tìm thấy đơn thuốc với ID: ${id}`);
    }

    return deletedPrescription;
  }

  async findByPatient(patientId: string, query: any): Promise<Prescription[]> {
    const limit = Number(query.limit) || 10;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * limit;

    // Nếu không có patientId, trả về tất cả đơn thuốc
    const filter = patientId ? { patientId } : {};

    return this.prescriptionModel
      .find(filter)
      .limit(limit)
      .skip(skip)
      .sort({ prescriptionDate: -1 })
      .populate('doctorId', 'fullName email specialty')
      .populate('medicalRecordId')
      .exec();
  }

  async findByDoctor(doctorId: string, query: any): Promise<Prescription[]> {
    const limit = Number(query.limit) || 10;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * limit;

    // Nếu không có doctorId, trả về tất cả đơn thuốc
    const filter = doctorId ? { doctorId } : {};

    return this.prescriptionModel
      .find(filter)
      .limit(limit)
      .skip(skip)
      .sort({ prescriptionDate: -1 })
      .populate('patientId', 'fullName email phone')
      .populate('medicalRecordId')
      .exec();
  }

  async markAsDispensed(id: string, dispensedBy?: string): Promise<Prescription> {
    const prescription = await this.prescriptionModel.findById(id).exec();
    
    if (!prescription) {
      throw new NotFoundException(`Không tìm thấy đơn thuốc với ID: ${id}`);
    }

    prescription.isDispensed = true;
    prescription.dispensedDate = new Date();
    if (dispensedBy) {
      prescription.dispensedBy = dispensedBy as any;
    }

    return prescription.save();
  }

  async getPrescriptionStats(doctorId?: string): Promise<any> {
    const filter = doctorId ? { doctorId } : {};
    
    const total = await this.prescriptionModel.countDocuments(filter);
    const active = await this.prescriptionModel.countDocuments({ ...filter, status: 'active' });
    const dispensed = await this.prescriptionModel.countDocuments({ ...filter, isDispensed: true });
    const pending = await this.prescriptionModel.countDocuments({ ...filter, isDispensed: false });

    return {
      total,
      active,
      dispensed,
      pending,
    };
  }

  async getPatientPrescriptionHistory(patientId: string, query: any): Promise<any> {
    try {
      const { current = 1, pageSize = 10, status } = query;
      
      const filter: any = { patientId };
      
      if (status && status !== 'all') {
        if (status === 'dispensed') {
          filter.isDispensed = true;
        } else if (status === 'pending') {
          filter.isDispensed = false;
        }
      }

      const skip = (current - 1) * pageSize;
      const totalItems = await this.prescriptionModel.countDocuments(filter);
      const totalPages = Math.ceil(totalItems / pageSize);

      const prescriptions = await this.prescriptionModel
        .find(filter)
        .populate('doctorId', 'fullName specialty')
        .populate('medicalRecordId')
        .sort({ prescriptionDate: -1 })
        .skip(skip)
        .limit(pageSize)
        .exec();

      return {
        success: true,
        data: {
          prescriptions,
          pagination: {
            current: +current,
            pageSize: +pageSize,
            totalItems,
            totalPages
          }
        },
        message: 'Lấy lịch sử đơn thuốc thành công'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy lịch sử đơn thuốc'
      };
    }
  }

  async getPatientRecentPrescriptions(patientId: string, limit: number = 5): Promise<any> {
    try {
      const prescriptions = await this.prescriptionModel
        .find({ patientId })
        .populate('doctorId', 'fullName specialty')
        .populate('medicalRecordId')
        .sort({ prescriptionDate: -1 })
        .limit(limit)
        .exec();

      return {
        success: true,
        data: prescriptions,
        message: 'Lấy đơn thuốc gần đây thành công'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy đơn thuốc gần đây'
      };
    }
  }
}
