import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment } from './schemas/payment.schemas';
import { User, UserDocument } from '../users/schemas/user.schemas';

export const RESERVATION_FEE_AMOUNT = 50000; // 50,000 VND

@Injectable()
export class BillingHelperService {
  private readonly logger = new Logger(BillingHelperService.name);

  constructor(
    @InjectModel(Payment.name)
    private paymentModel: Model<Payment>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  /**
   * Tạo bill phí đặt chỗ cho bác sĩ (bác sĩ nhận tiền)
   */
  async createReservationFeeForDoctor(
    doctorId: string,
    patientId: string,
    appointmentId: string,
  ): Promise<Payment> {
    return this.paymentModel.create({
      doctorId,
      patientId,
      amount: RESERVATION_FEE_AMOUNT,
      status: 'completed',
      type: 'appointment',
      billType: 'reservation_fee',
      refId: appointmentId,
      refModel: 'Appointment',
    });
  }

  /**
   * Tạo bill phí đặt chỗ cho bệnh nhân (bệnh nhân bị tính tiền)
   */
  async chargeReservationFeeFromPatient(
    patientId: string,
    doctorId: string,
    appointmentId: string,
  ): Promise<Payment> {
    return this.paymentModel.create({
      patientId,
      doctorId,
      amount: -RESERVATION_FEE_AMOUNT, // Số âm = bệnh nhân bị trừ tiền
      status: 'completed',
      type: 'appointment',
      billType: 'cancellation_charge',
      refId: appointmentId,
      refModel: 'Appointment',
    });
  }

  /**
   * Hoàn tiền phí khám cho bệnh nhân
   */
  async refundConsultationFee(
    originalPaymentId: string,
    originalAmount: number,
    patientId: string,
    doctorId: string,
    appointmentId: string,
  ): Promise<Payment> {
    // Ensure refund amount is always positive (patient receives money back)
    const refundAmount = Math.abs(originalAmount);

    this.logger.log(
      `💰 Creating refund bill: patientId=${patientId}, amount=${refundAmount}`,
    );

    // Create refund bill
    const refundBill = await this.paymentModel.create({
      patientId,
      doctorId,
      amount: refundAmount, // Always positive - patient receives money
      status: 'completed',
      type: 'appointment',
      billType: 'refund',
      paymentMethod: 'wallet_deduction',
      refundStatus: 'completed',
      relatedPaymentId: originalPaymentId,
      refId: appointmentId,
      refModel: 'Appointment',
    });

    // Add money back to patient's wallet
    try {
      const updatedUser = await this.userModel.findByIdAndUpdate(
        patientId,
        { $inc: { walletBalance: refundAmount } },
        { new: true },
      );

      this.logger.log(
        `✅ Refund completed: Added ${refundAmount} to patient wallet. New balance: ${updatedUser?.walletBalance}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to update patient wallet for refund:`,
        error,
      );
      // Don't throw - bill is created, wallet update can be retried
    }

    return refundBill;
  }

  /**
   * Tạo bill pending phí giữ chỗ cho bệnh nhân (chưa thanh toán)
   * Sử dụng khi bác sĩ hủy do bệnh nhân đến muộn hoặc bệnh nhân hủy/đổi lịch cận giờ
   */
  async createPendingReservationCharge(
    patientId: string,
    doctorId: string,
    appointmentId: string,
  ): Promise<Payment> {
    return this.paymentModel.create({
      patientId,
      doctorId,
      amount: -RESERVATION_FEE_AMOUNT, // Số âm - patient bị trừ tiền
      status: 'pending', // Chờ thanh toán
      paymentMethod: 'pending',
      type: 'appointment',
      billType: 'cancellation_charge', // Dùng enum có sẵn
      refId: appointmentId,
      refModel: 'Appointment',
      description: `Phí giữ chỗ - Lịch hẹn #${appointmentId}`,
    });
  }

  /**
   * Kiểm tra bệnh nhân đã thanh toán phí khám chưa
   */
  async hasExistingPayment(appointmentId: string): Promise<boolean> {
    const payment = await this.paymentModel.findOne({
      refId: appointmentId,
      refModel: 'Appointment',
      $or: [
        { billType: 'consultation_fee' }, // New format
        { type: 'appointment', billType: { $exists: false } }, // Old format (không có billType)
      ],
      status: 'completed',
    });
    return !!payment;
  }

  /**
   * Lấy payment gốc (phí khám) để hoàn tiền
   */
  async getOriginalPayment(appointmentId: string): Promise<Payment | null> {
    return this.paymentModel.findOne({
      refId: appointmentId,
      refModel: 'Appointment',
      $or: [
        { billType: 'consultation_fee' }, // New format
        { type: 'appointment', billType: { $exists: false } }, // Old format
      ],
      status: 'completed',
    });
  }

  /**
   * Xóa tất cả bill pending liên quan đến appointment khi hủy lịch
   * Áp dụng khi hủy lịch có payment method là "cash" hoặc "later"
   */
  async deletePendingBillsForAppointment(
    appointmentId: string,
  ): Promise<number> {
    const result = await this.paymentModel.deleteMany({
      refId: appointmentId,
      refModel: 'Appointment',
      status: 'pending',
    });

    return result.deletedCount;
  }

  /**
   * Xóa chỉ bill consultation_fee pending (không xóa cancellation_charge)
   * Dùng khi doctor hủy do patient_late, cần giữ lại bill phí giữ chỗ
   */
  async deletePendingConsultationFeeBills(
    appointmentId: string,
  ): Promise<number> {
    const result = await this.paymentModel.deleteMany({
      refId: appointmentId,
      refModel: 'Appointment',
      status: 'pending',
      billType: 'consultation_fee',
    });

    return result.deletedCount;
  }
}
