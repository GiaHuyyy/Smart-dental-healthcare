import { BadRequestException, Injectable } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Payment } from './schemas/payment.schemas';
import mongoose, { Model } from 'mongoose';
import aqp from 'api-query-params';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
  ) {}

  async create(createPaymentDto: CreatePaymentDto) {
    try {
      const payment = await this.paymentModel.create(createPaymentDto);
      return {
        success: true,
        data: payment,
        message: 'Tạo thanh toán thành công',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi tạo thanh toán',
      };
    }
  }

  async findAll(query: string, current: number, pageSize: number) {
    try {
      const { filter, sort } = aqp(query);

      if (filter.current) delete filter.current;
      if (filter.pageSize) delete filter.pageSize;

      if (!current) current = 1;
      if (!pageSize) pageSize = 10;

      const totalItems = (await this.paymentModel.find(filter)).length;
      const totalPages = Math.ceil(totalItems / pageSize);
      const skip = (current - 1) * pageSize;

      const results = await this.paymentModel
        .find(filter)
        .limit(pageSize)
        .skip(skip)
        .sort(sort as any)
        .populate('patientId', 'fullName email')
        .populate('doctorId', 'fullName email')
        .exec();

      return {
        success: true,
        data: { results, totalItems, totalPages, current, pageSize },
        message: 'Lấy danh sách thanh toán thành công',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy danh sách thanh toán',
      };
    }
  }

  async findByPatient(patientId: string) {
    try {
      if (!mongoose.isValidObjectId(patientId)) {
        throw new BadRequestException('ID bệnh nhân không hợp lệ');
      }

      const payments = await this.paymentModel
        .find({ patientId })
        .sort({ createdAt: -1 })
        .populate('patientId', 'fullName email')
        .populate('doctorId', 'fullName email')
        .exec();

      return {
        success: true,
        data: payments,
        message: 'Lấy danh sách thanh toán của bệnh nhân thành công',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy danh sách thanh toán của bệnh nhân',
      };
    }
  }

  async findByDoctor(doctorId: string) {
    try {
      if (!mongoose.isValidObjectId(doctorId)) {
        throw new BadRequestException('ID bác sĩ không hợp lệ');
      }

      const payments = await this.paymentModel
        .find({ doctorId })
        .sort({ createdAt: -1 })
        .populate('patientId', 'fullName email')
        .populate('doctorId', 'fullName email')
        .exec();

      return {
        success: true,
        data: payments,
        message: 'Lấy danh sách thanh toán của bác sĩ thành công',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy danh sách thanh toán của bác sĩ',
      };
    }
  }

  async findOne(id: string) {
    try {
      if (!mongoose.isValidObjectId(id)) {
        throw new BadRequestException('ID thanh toán không hợp lệ');
      }

      const payment = await this.paymentModel
        .findById(id)
        .populate('patientId', 'fullName email')
        .populate('doctorId', 'fullName email')
        .exec();

      if (!payment) {
        throw new BadRequestException('Không tìm thấy thanh toán');
      }

      return {
        success: true,
        data: payment,
        message: 'Lấy thông tin thanh toán thành công',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy thông tin thanh toán',
      };
    }
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto) {
    try {
      if (!mongoose.isValidObjectId(id)) {
        throw new BadRequestException('ID thanh toán không hợp lệ');
      }

      const payment = await this.paymentModel
        .findByIdAndUpdate(id, updatePaymentDto, { new: true })
        .exec();

      if (!payment) {
        throw new BadRequestException('Không tìm thấy thanh toán');
      }

      return {
        success: true,
        data: payment,
        message: 'Cập nhật thanh toán thành công',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi cập nhật thanh toán',
      };
    }
  }

  async remove(id: string) {
    try {
      if (!mongoose.isValidObjectId(id)) {
        throw new BadRequestException('ID thanh toán không hợp lệ');
      }

      const payment = await this.paymentModel.findByIdAndDelete(id).exec();

      if (!payment) {
        throw new BadRequestException('Không tìm thấy thanh toán');
      }

      return {
        success: true,
        message: 'Xóa thanh toán thành công',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi xóa thanh toán',
      };
    }
  }
}