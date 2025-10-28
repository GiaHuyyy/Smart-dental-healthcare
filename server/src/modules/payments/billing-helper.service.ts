import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment } from './schemas/payment.schemas';

export const RESERVATION_FEE_AMOUNT = 100000; // 100,000 VND

@Injectable()
export class BillingHelperService {
  constructor(
    @InjectModel(Payment.name)
    private paymentModel: Model<Payment>,
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
    return this.paymentModel.create({
      patientId,
      doctorId,
      amount: originalAmount, // Hoàn lại số tiền gốc
      status: 'completed',
      type: 'appointment',
      billType: 'refund',
      refundStatus: 'completed',
      relatedPaymentId: originalPaymentId,
      refId: appointmentId,
      refModel: 'Appointment',
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
}
