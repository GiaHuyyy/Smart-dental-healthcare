import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment } from './schemas/payment.schemas';
import { User, UserDocument } from '../users/schemas/user.schemas';
import { Revenue } from '../revenue/schemas/revenue.schemas';
import { RevenueService } from '../revenue/revenue.service';
import { PaymentGateway } from './payment.gateway';
import { RevenueGateway } from '../revenue/revenue.gateway';

export const RESERVATION_FEE_AMOUNT = 50000; // 50,000 VND

@Injectable()
export class BillingHelperService {
  private readonly logger = new Logger(BillingHelperService.name);

  constructor(
    @InjectModel(Payment.name)
    private paymentModel: Model<Payment>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Revenue.name)
    private revenueModel: Model<Revenue>,
    @Inject(forwardRef(() => RevenueService))
    private readonly revenueService: RevenueService,
    @Inject(forwardRef(() => PaymentGateway))
    private readonly paymentGateway: PaymentGateway,
    @Inject(forwardRef(() => RevenueGateway))
    private readonly revenueGateway: RevenueGateway,
  ) {}

  /**
   * Tạo bill phí đặt chỗ cho bác sĩ (bác sĩ nhận tiền)
   */
  async createReservationFeeForDoctor(
    doctorId: string,
    patientId: string,
    appointmentId: string,
  ): Promise<Payment> {
    // Calculate platform fee (5%)
    const platformFee = -Math.round(RESERVATION_FEE_AMOUNT * 0.05);
    const netAmount = RESERVATION_FEE_AMOUNT + platformFee;

    // Create patient payment bill
    const payment = await this.paymentModel.create({
      doctorId,
      patientId,
      amount: RESERVATION_FEE_AMOUNT,
      status: 'completed',
      type: 'appointment',
      billType: 'reservation_fee',
      refId: appointmentId,
      refModel: 'Appointment',
    });

    // Create revenue record in revenues collection
    try {
      this.logger.log('💰 Creating revenue record for reservation fee...');

      await this.revenueModel.create({
        doctorId,
        patientId,
        paymentId: payment._id,
        amount: RESERVATION_FEE_AMOUNT,
        platformFee,
        netAmount,
        revenueDate: new Date(),
        status: 'completed',
        refId: appointmentId,
        refModel: 'Appointment',
        type: 'appointment',
        notes: `Doanh thu phí đặt chỗ từ lịch hẹn #${appointmentId}`,
      });

      this.logger.log('✅ Reservation fee revenue created successfully');
    } catch (error) {
      this.logger.error('❌ Error creating reservation fee revenue:', error);
    }

    return payment;
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
      `💰 Creating refund bill: patientId=${patientId}, refundAmount=${refundAmount}`,
    );

    // 🔍 Find the original revenue to get netAmount (actual amount doctor received after platform fee)
    let doctorNetAmount = refundAmount; // Default: same as refund (in case revenue not found)

    try {
      const originalRevenue = await this.revenueModel.findOne({
        paymentId: originalPaymentId,
        doctorId,
        status: 'completed',
      });

      if (originalRevenue) {
        // Doctor only received netAmount (after 5% platform fee deduction)
        doctorNetAmount = Math.abs(originalRevenue.netAmount);
        this.logger.log(
          `✅ Found original revenue: amount=${originalRevenue.amount}, platformFee=${originalRevenue.platformFee}, netAmount=${doctorNetAmount}`,
        );
      } else {
        this.logger.warn(
          `⚠️ Original revenue not found for payment ${originalPaymentId}, using refundAmount as doctorNetAmount`,
        );
      }
    } catch (error) {
      this.logger.error('❌ Error finding original revenue:', error);
      // Continue with refundAmount as fallback
    }

    this.logger.log(
      `💵 Refund calculation: Patient receives ${refundAmount}, Doctor pays back ${doctorNetAmount}`,
    );

    // Create refund bill
    const refundBill = await this.paymentModel.create({
      patientId,
      doctorId,
      amount: refundAmount, // Always positive - patient receives FULL money back
      status: 'completed',
      type: 'appointment',
      billType: 'refund',
      paymentMethod: 'wallet_deduction',
      refundStatus: 'completed',
      relatedPaymentId: originalPaymentId,
      refId: appointmentId,
      refModel: 'Appointment',
    });

    // Add money back to patient's wallet (FULL amount)
    try {
      const updatedPatient = await this.userModel.findByIdAndUpdate(
        patientId,
        { $inc: { walletBalance: refundAmount } },
        { new: true },
      );

      this.logger.log(
        `✅ Patient refund completed: Added ${refundAmount} to patient wallet. New balance: ${updatedPatient?.walletBalance}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to update patient wallet for refund:`,
        error,
      );
      // Don't throw - bill is created, wallet update can be retried
    }

    // Subtract money from doctor's wallet (NET amount only - what doctor actually received)
    try {
      const updatedDoctor = await this.userModel.findByIdAndUpdate(
        doctorId,
        { $inc: { walletBalance: -doctorNetAmount } },
        { new: true },
      );

      this.logger.log(
        `✅ Doctor refund deduction: Subtracted ${doctorNetAmount} from doctor wallet (netAmount). New balance: ${updatedDoctor?.walletBalance}`,
      );
    } catch (error) {
      this.logger.error(`❌ Failed to update doctor wallet for refund:`, error);
      // Don't throw - bill is created, wallet update can be retried
    }

    // Create NEGATIVE revenue record for doctor (doctor loses money)
    let negativeRevenue;
    try {
      this.logger.log(
        '💸 Creating negative revenue record for doctor refund...',
      );

      // Refund KHÔNG tính phí platformFee
      // Doctor chỉ mất số tiền netAmount đã nhận (không phải full refundAmount)
      negativeRevenue = await this.revenueModel.create({
        patientId,
        doctorId,
        paymentId: refundBill._id,
        amount: -doctorNetAmount, // ÂM - doctor mất số tiền đã thực nhận
        platformFee: 0, // KHÔNG tính phí khi refund
        netAmount: -doctorNetAmount, // ÂM - doctor mất netAmount (không phải full amount)
        revenueDate: new Date(),
        status: 'completed',
        type: 'appointment',
        refId: appointmentId,
        refModel: 'Appointment',
        notes: `Hoàn tiền cho bệnh nhân - Trừ doanh thu netAmount (Payment #${originalPaymentId})`,
      });

      this.logger.log(
        `✅ Refund revenue record created: amount=${-doctorNetAmount}, netAmount=${-doctorNetAmount}`,
      );
    } catch (error) {
      this.logger.error('❌ Error creating refund revenue record:', error);
      // Don't throw - refund is already processed
    }

    // 🔔 Emit realtime event to patient (payment)
    try {
      const populatedBill = await this.paymentModel
        .findById(refundBill._id)
        .populate('doctorId', 'fullName email')
        .exec();

      this.paymentGateway.emitNewPayment(patientId, populatedBill);
      this.logger.log(
        `✅ Refund payment event emitted to patient ${patientId}`,
      );
    } catch (error) {
      this.logger.error('❌ Error emitting refund payment event:', error);
    }

    // 🔔 Emit realtime event to doctor (revenue)
    if (negativeRevenue) {
      try {
        const populatedRevenue = await this.revenueModel
          .findById(negativeRevenue._id)
          .populate('patientId', 'fullName email phone')
          .exec();

        this.revenueGateway.emitNewRevenue(doctorId, populatedRevenue);
        this.logger.log(
          `✅ Refund revenue event emitted to doctor ${doctorId}`,
        );
      } catch (error) {
        this.logger.error('❌ Error emitting refund revenue event:', error);
      }
    }

    return refundBill;
  }

  /**
   * Tạo bill pending phí giữ chỗ cho bệnh nhân (chưa thanh toán)
   * Sử dụng khi bác sĩ hủy do bệnh nhân đến muộn hoặc bệnh nhân hủy/đổi lịch cận giờ
   * TẠO CẢ PAYMENT (bill bệnh nhân) VÀ REVENUE (bill bác sĩ)
   */
  async createPendingReservationCharge(
    patientId: string,
    doctorId: string,
    appointmentId: string,
  ): Promise<Payment> {
    this.logger.log(
      `💰 Creating pending reservation charge: patientId=${patientId}, doctorId=${doctorId}, appointmentId=${appointmentId}`,
    );

    // 1. Tạo Payment (bill bệnh nhân)
    const payment = await this.paymentModel.create({
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

    this.logger.log(
      `✅ Payment created: ${payment._id.toString()}, amount: ${payment.amount}`,
    );

    // 2. Tạo Revenue (bill bác sĩ) - PENDING, tính 5% phí platform
    let createdRevenue;
    try {
      const amount = Math.abs(RESERVATION_FEE_AMOUNT);
      const platformFee = -Math.round(amount * 0.05); // -2,500đ (5%)
      const netAmount = amount + platformFee; // 50,000 + (-2,500) = 47,500đ

      createdRevenue = await this.revenueModel.create({
        patientId,
        doctorId,
        paymentId: payment._id, // Link đến payment
        amount, // DƯƠNG - bác sĩ nhận tiền
        platformFee, // ÂM - phí bị trừ 5%
        netAmount, // DƯƠNG - thực nhận sau trừ phí
        revenueDate: new Date(), // 🆕 Required field
        status: 'pending', // Chờ thanh toán
        type: 'appointment',
        refId: appointmentId,
        refModel: 'Appointment',
        notes: `Phí giữ chỗ - Chờ thanh toán (Payment #${payment._id.toString()})`,
      });

      this.logger.log(
        `✅ Revenue created: ${createdRevenue._id.toString()}, netAmount: ${createdRevenue.netAmount}`,
      );
    } catch (error) {
      this.logger.error('❌ Error creating revenue record:', error);
      // Don't throw - payment is already created
    }

    // 🔔 Emit realtime event to patient (payment)
    try {
      const populatedPayment = await this.paymentModel
        .findById(payment._id)
        .populate('doctorId', 'fullName email')
        .exec();

      this.paymentGateway.emitNewPayment(patientId, populatedPayment);
      this.logger.log(
        `✅ Cancellation charge payment event emitted to patient ${patientId}`,
      );
    } catch (error) {
      this.logger.error('❌ Error emitting cancellation charge event:', error);
    }

    // 🔔 Emit realtime event to doctor (revenue)
    if (createdRevenue) {
      try {
        const populatedRevenue = await this.revenueModel
          .findById(createdRevenue._id)
          .populate('patientId', 'fullName email phone')
          .exec();

        this.revenueGateway.emitNewRevenue(doctorId, populatedRevenue);
        this.logger.log(
          `✅ Cancellation charge revenue event emitted to doctor ${doctorId}`,
        );
      } catch (error) {
        this.logger.error(
          '❌ Error emitting cancellation charge revenue event:',
          error,
        );
      }
    }

    return payment;
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
   * XÓA CẢ PAYMENT (bill bệnh nhân) VÀ REVENUE (bill bác sĩ)
   */
  async deletePendingBillsForAppointment(
    appointmentId: string,
  ): Promise<number> {
    // Lấy danh sách pending payments trước khi xóa (để emit event)
    const pendingPayments = await this.paymentModel
      .find({
        refId: appointmentId,
        refModel: 'Appointment',
        status: 'pending',
      })
      .select('_id patientId')
      .exec();

    // Lấy danh sách pending revenues trước khi xóa (để emit event)
    const pendingRevenues = await this.revenueModel
      .find({
        refId: appointmentId,
        refModel: 'Appointment',
        status: 'pending',
      })
      .select('_id doctorId')
      .exec();

    // Xóa Payment (bill bệnh nhân)
    const paymentResult = await this.paymentModel.deleteMany({
      refId: appointmentId,
      refModel: 'Appointment',
      status: 'pending',
    });

    this.logger.log(
      `🗑️ Deleted ${paymentResult.deletedCount} pending payment bills for appointment ${appointmentId}`,
    );

    // Xóa Revenue (bill bác sĩ) - CHỈ XÓA PENDING
    const revenueResult = await this.revenueModel.deleteMany({
      refId: appointmentId,
      refModel: 'Appointment',
      status: 'pending',
    });

    this.logger.log(
      `🗑️ Deleted ${revenueResult.deletedCount} pending revenue records for appointment ${appointmentId}`,
    );

    // 🔔 Emit realtime delete events to patients
    for (const payment of pendingPayments) {
      try {
        let patientId: string;
        if (typeof payment.patientId === 'string') {
          patientId = payment.patientId;
        } else if ((payment.patientId as any)?._id) {
          patientId = (payment.patientId as any)._id.toString();
        } else {
          continue; // Skip if patientId is invalid
        }

        this.paymentGateway.emitPaymentDelete(
          patientId,
          payment._id.toString(),
        );
        this.logger.log(
          `✅ Payment delete event emitted to patient ${patientId}`,
        );
      } catch (error) {
        this.logger.error('❌ Error emitting payment delete event:', error);
      }
    }

    // 🔔 Emit realtime delete events to doctors
    for (const revenue of pendingRevenues) {
      try {
        let doctorId: string;
        if (typeof revenue.doctorId === 'string') {
          doctorId = revenue.doctorId;
        } else if ((revenue.doctorId as any)?._id) {
          doctorId = (revenue.doctorId as any)._id.toString();
        } else {
          continue; // Skip if doctorId is invalid
        }

        this.revenueGateway.emitRevenueDelete(doctorId, revenue._id.toString());
        this.logger.log(
          `✅ Revenue delete event emitted to doctor ${doctorId}`,
        );
      } catch (error) {
        this.logger.error('❌ Error emitting revenue delete event:', error);
      }
    }

    return paymentResult.deletedCount + revenueResult.deletedCount;
  }

  /**
   * Xóa chỉ bill consultation_fee pending (không xóa cancellation_charge)
   * Dùng khi doctor hủy do patient_late, cần giữ lại bill phí giữ chỗ
   * XÓA CẢ PAYMENT VÀ REVENUE VÀ EMIT SOCKET EVENTS
   */
  async deletePendingConsultationFeeBills(
    appointmentId: string,
  ): Promise<number> {
    // 🔍 Lấy danh sách pending payments trước khi xóa (để emit event)
    const pendingPayments = await this.paymentModel
      .find({
        refId: appointmentId,
        refModel: 'Appointment',
        status: 'pending',
        billType: 'consultation_fee',
      })
      .select('_id patientId')
      .exec();

    this.logger.log(
      `🔍 Found ${pendingPayments.length} pending consultation_fee payments for appointment ${appointmentId}`,
    );

    // 🔍 Lấy danh sách pending revenues trước khi xóa (để emit event)
    // Strategy: Xóa TẤT CẢ pending revenues của appointment này (trừ cancellation_charge)
    // Cách phân biệt: Cancellation_charge revenue được tạo CÙNG LÚC với cancellation_charge payment
    // Vì chúng ta tạo cancellation_charge TRƯỚC KHI gọi method này, nên cần exclude nó

    // Get all cancellation_charge payments (just created, should not delete their revenues)
    const cancellationChargePayments = await this.paymentModel
      .find({
        refId: appointmentId,
        refModel: 'Appointment',
        status: 'pending',
        billType: 'cancellation_charge',
      })
      .select('_id')
      .exec();

    const cancellationChargePaymentIds = cancellationChargePayments.map(
      (p) => p._id,
    );

    this.logger.log(
      `🔍 Found ${cancellationChargePayments.length} cancellation_charge payments to exclude`,
    );

    // Get pending revenues (exclude cancellation_charge revenues)
    const revenueQueryFilter = {
      refId: appointmentId,
      refModel: 'Appointment',
      status: 'pending',
      type: 'appointment',
      ...(cancellationChargePaymentIds.length > 0 && {
        paymentId: { $nin: cancellationChargePaymentIds },
      }),
    };

    const pendingRevenues = await this.revenueModel
      .find(revenueQueryFilter)
      .select('_id doctorId')
      .exec();

    this.logger.log(
      `🔍 Found ${pendingRevenues.length} pending revenues to delete (excluding cancellation_charge)`,
    );

    // Xóa Payment consultation_fee pending
    const paymentResult = await this.paymentModel.deleteMany({
      refId: appointmentId,
      refModel: 'Appointment',
      status: 'pending',
      billType: 'consultation_fee',
    });

    this.logger.log(
      `🗑️ Deleted ${paymentResult.deletedCount} pending consultation_fee payment bills for appointment ${appointmentId}`,
    );

    // Xóa Revenue pending (exclude cancellation_charge)
    const revenueDeleteFilter = {
      refId: appointmentId,
      refModel: 'Appointment',
      status: 'pending',
      type: 'appointment',
      ...(cancellationChargePaymentIds.length > 0 && {
        paymentId: { $nin: cancellationChargePaymentIds },
      }),
    };

    const revenueResult =
      await this.revenueModel.deleteMany(revenueDeleteFilter);

    this.logger.log(
      `🗑️ Deleted ${revenueResult.deletedCount} pending revenue records for appointment ${appointmentId}`,
    );

    // 🔔 Emit realtime delete events to patients
    for (const payment of pendingPayments) {
      try {
        let patientId: string;
        if (typeof payment.patientId === 'string') {
          patientId = payment.patientId;
        } else if ((payment.patientId as any)?._id) {
          patientId = (payment.patientId as any)._id.toString();
        } else {
          continue; // Skip if patientId is invalid
        }

        this.paymentGateway.emitPaymentDelete(
          patientId,
          payment._id.toString(),
        );
        this.logger.log(
          `✅ Consultation fee payment delete event emitted to patient ${patientId}`,
        );
      } catch (error) {
        this.logger.error(
          '❌ Error emitting consultation fee payment delete event:',
          error,
        );
      }
    }

    // � Emit realtime delete events to doctors
    for (const revenue of pendingRevenues) {
      try {
        let doctorId: string;
        if (typeof revenue.doctorId === 'string') {
          doctorId = revenue.doctorId;
        } else if ((revenue.doctorId as any)?._id) {
          doctorId = (revenue.doctorId as any)._id.toString();
        } else {
          continue; // Skip if doctorId is invalid
        }

        this.revenueGateway.emitRevenueDelete(doctorId, revenue._id.toString());
        this.logger.log(
          `✅ Consultation fee revenue delete event emitted to doctor ${doctorId}`,
        );
      } catch (error) {
        this.logger.error(
          '❌ Error emitting consultation fee revenue delete event:',
          error,
        );
      }
    }

    return paymentResult.deletedCount + revenueResult.deletedCount;
  }
}
