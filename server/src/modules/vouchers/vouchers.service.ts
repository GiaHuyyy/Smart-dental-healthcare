import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Voucher, VoucherType, VoucherReason } from './schemas/voucher.schema';

@Injectable()
export class VouchersService {
  constructor(
    @InjectModel(Voucher.name)
    private voucherModel: Model<Voucher>,
  ) {}

  async createDoctorCancellationVoucher(
    patientId: string,
    appointmentId: string,
  ): Promise<Voucher> {
    const code = this.generateUniqueCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90); // Hết hạn sau 90 ngày

    return this.voucherModel.create({
      patientId,
      code,
      type: VoucherType.PERCENTAGE_DISCOUNT,
      value: 5,
      reason: VoucherReason.DOCTOR_CANCELLATION,
      expiresAt,
      relatedAppointmentId: appointmentId,
    });
  }

  async createFollowUpVoucher(
    patientId: string,
    parentAppointmentId: string,
  ): Promise<Voucher> {
    const code = this.generateUniqueCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    return this.voucherModel.create({
      patientId,
      code,
      type: VoucherType.PERCENTAGE_DISCOUNT,
      value: 5,
      reason: VoucherReason.FOLLOW_UP_DISCOUNT,
      expiresAt,
      relatedAppointmentId: parentAppointmentId,
    });
  }

  async applyVoucher(
    voucherCode: string,
    patientId: string,
    originalAmount: number,
  ): Promise<{
    discountedAmount: number;
    discountAmount: number;
    voucherId: string;
    voucherCode: string;
  }> {
    const voucher = await this.voucherModel.findOne({
      code: voucherCode,
      patientId,
    });

    if (!voucher) {
      throw new NotFoundException('Voucher không tồn tại');
    }

    if (voucher.isUsed) {
      throw new BadRequestException('Voucher đã được sử dụng');
    }

    const now = new Date();
    if (now > voucher.expiresAt) {
      throw new BadRequestException('Voucher đã hết hạn');
    }

    let discountAmount = 0;
    if (voucher.type === 'percentage') {
      discountAmount = (originalAmount * voucher.value) / 100;
    } else if (voucher.type === 'fixed') {
      discountAmount = voucher.value;
    }

    const discountedAmount = Math.max(0, originalAmount - discountAmount);

    // Don't mark as used yet - wait until appointment is confirmed/paid
    // Just return the discount info
    return {
      discountedAmount,
      discountAmount,
      voucherId: voucher._id.toString(),
      voucherCode: voucher.code,
    };
  }

  async markVoucherAsUsed(voucherId: string): Promise<void> {
    const voucher = await this.voucherModel.findById(voucherId);
    if (!voucher) {
      throw new NotFoundException('Không tìm thấy voucher');
    }

    voucher.isUsed = true;
    voucher.usedAt = new Date();
    await voucher.save();
  }

  async getPatientVouchers(patientId: string): Promise<Voucher[]> {
    return this.voucherModel
      .find({
        patientId,
        isUsed: false,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 });
  }

  private generateUniqueCode(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `DENTAL${timestamp}${random}`;
  }
}
