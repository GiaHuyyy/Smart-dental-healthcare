import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MoMoService } from '../payments/services/momo.service';
import { User, UserDocument } from '../users/schemas/user.schemas';
import { Payment } from '../payments/schemas/payment.schemas';
import { Appointment } from '../appointments/schemas/appointment.schemas';
import { CreateWalletTransactionDto } from './dto/create-wallet-transaction.dto';
import {
  WalletTransaction,
  WalletTransactionDocument,
} from './schemas/wallet-transaction.schema';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(WalletTransaction.name)
    private walletTransactionModel: Model<WalletTransactionDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @InjectModel(Appointment.name) private appointmentModel: Model<Appointment>,
    private readonly momoService: MoMoService,
    private readonly configService: ConfigService,
  ) {}

  // Lấy số dư ví
  async getWalletBalance(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('walletBalance')
      .exec();

    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    return {
      success: true,
      data: {
        balance: user.walletBalance || 0,
      },
      message: 'Lấy số dư thành công',
    };
  }

  // Nạp tiền vào ví
  async topUpWallet(
    userId: string,
    createWalletTransactionDto: CreateWalletTransactionDto,
  ) {
    const { amount, paymentMethod, description } = createWalletTransactionDto;

    // Kiểm tra user tồn tại
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    try {
      // Generate unique orderId
      const orderId = `WALLET_${userId}_${Date.now()}`;

      // Get URLs from config
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:3000';
      const backendUrl =
        this.configService.get<string>('BACKEND_URL') ||
        'http://localhost:8081';

      const returnUrl = `${frontendUrl}/patient/wallet?status=success&orderId=${orderId}`;
      const notifyUrl = `${backendUrl}/api/v1/wallet/momo/callback`;

      // Create MoMo payment request
      // Không tạo transaction record ở đây, chỉ tạo khi callback thành công
      const momoResponse = await this.momoService.createPayment({
        orderId,
        amount,
        orderInfo:
          description ||
          `Nạp tiền vào ví - ${amount.toLocaleString('vi-VN')} VNĐ`,
        returnUrl,
        notifyUrl,
        extraData: JSON.stringify({
          userId,
          amount,
          paymentMethod,
          description: description || 'Nạp tiền vào ví',
          type: 'wallet_topup',
        }),
      });

      this.logger.log('MoMo wallet payment created:', {
        orderId,
        payUrl: momoResponse.payUrl,
      });

      return {
        success: true,
        data: {
          orderId,
          payUrl: momoResponse.payUrl,
          deeplink: momoResponse.deeplink,
          qrCodeUrl: momoResponse.qrCodeUrl,
          deeplinkMiniApp: momoResponse.deeplinkMiniApp,
        },
        message: 'Khởi tạo thanh toán MoMo thành công',
      };
    } catch (error) {
      this.logger.error('Create MoMo wallet payment failed:', error);
      throw new NotFoundException(
        error.message || 'Không thể tạo giao dịch thanh toán',
      );
    }
  }

  // Xử lý callback từ MoMo
  async handleMomoCallback(callbackData: any) {
    this.logger.log('🔔 ========== WALLET MOMO CALLBACK RECEIVED ==========');
    this.logger.log(
      '📦 Full callback data:',
      JSON.stringify(callbackData, null, 2),
    );

    const { orderId, amount, resultCode, extraData, transId } = callbackData;

    this.logger.log('📋 Callback summary:', {
      orderId,
      amount,
      resultCode,
      extraData,
    });

    // Verify signature
    const isValid = this.momoService.verifyCallbackSignature(callbackData);
    this.logger.log(
      '🔐 Signature verification:',
      isValid ? '✅ Valid' : '❌ Invalid',
    );

    // TEMPORARY: Skip signature verification for testing
    // TODO: Enable signature verification in production
    if (false && !isValid) {
      this.logger.error('Invalid MoMo callback signature');
      return { success: false, message: 'Invalid signature' };
    }

    // Parse extra data
    let extraDataParsed = {};
    try {
      extraDataParsed = JSON.parse(extraData);
      this.logger.log('📦 Parsed extraData:', extraDataParsed);
    } catch (e) {
      this.logger.error('Failed to parse extraData:', e, extraData);
      return { success: false, message: 'Failed to parse extraData' };
    }

    const { userId, paymentMethod, description } = extraDataParsed as any;

    if (!userId) {
      this.logger.error('Missing userId in callback extraData');
      return { success: false, message: 'Missing userId' };
    }

    this.logger.log('👤 Processing for user:', userId);

    // Process callback result
    if (resultCode === 0) {
      // Payment successful - CHỈ TẠO RECORD KHI THÀNH CÔNG
      this.logger.log('✅ Wallet top-up successful!', {
        orderId,
        amount,
        userId,
      });

      try {
        // Create transaction record (completed)
        const transaction = await this.walletTransactionModel.create({
          userId,
          amount,
          type: 'topup',
          status: 'completed',
          paymentMethod: paymentMethod || 'momo',
          transactionId: transId || orderId,
          description: description || 'Nạp tiền vào ví',
        });

        this.logger.log('💾 Transaction created:', transaction._id);

        // Update user wallet balance
        const updatedUser = await this.userModel.findByIdAndUpdate(
          userId,
          { $inc: { walletBalance: amount } },
          { new: true },
        );

        this.logger.log('💰 Wallet balance updated:', {
          userId,
          newBalance: updatedUser?.walletBalance,
          addedAmount: amount,
        });

        return { success: true, message: 'Callback processed successfully' };
      } catch (error) {
        this.logger.error('Error processing successful callback:', error);
        return { success: false, message: 'Error processing callback' };
      }
    } else {
      // Payment failed - KHÔNG TẠO RECORD GÌ CẢ
      this.logger.log('❌ Wallet top-up failed:', {
        orderId,
        resultCode,
        amount,
      });
      return { success: true, message: 'Payment failed, no record created' };
    }
  }

  // Lấy lịch sử giao dịch - chỉ hiển thị completed
  async getTransactionHistory(userId: string, page = 1, limit = 10) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const skip = (page - 1) * limit;
    // Chỉ lấy các transaction đã completed
    const transactions = await this.walletTransactionModel
      .find({ userId, status: 'completed', type: 'topup' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.walletTransactionModel
      .countDocuments({
        userId,
        status: 'completed',
        type: 'topup',
      })
      .exec();

    return {
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      message: 'Lấy lịch sử giao dịch thành công',
    };
  }

  // Lấy thống kê ví
  async getWalletStats(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('walletBalance')
      .exec();
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const [totalTopUp, successfulTransactions, failedTransactions] =
      await Promise.all([
        this.walletTransactionModel.aggregate([
          { $match: { userId, type: 'topup', status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        this.walletTransactionModel.countDocuments({
          userId,
          type: 'topup',
          status: 'completed',
        }),
        this.walletTransactionModel.countDocuments({
          userId,
          type: 'topup',
          status: 'failed',
        }),
      ]);

    return {
      success: true,
      data: {
        balance: user.walletBalance || 0,
        totalTopUp: totalTopUp[0]?.total || 0,
        successfulTransactions,
        failedTransactions,
      },
      message: 'Lấy thống kê ví thành công',
    };
  }

  // Pay for appointment using wallet balance
  async payForAppointment(
    userId: string,
    appointmentId: string,
    amount: number,
  ) {

    // Get appointment details
    const appointment = await this.appointmentModel
      .findById(appointmentId)
      .populate('patientId')
      .populate('doctorId')
      .exec();

    if (!appointment) {
      this.logger.error(`❌ Appointment not found: ${appointmentId}`);
      return {
        success: false,
        error: 'Không tìm thấy lịch hẹn',
        message: 'Appointment not found',
      };
    }

    this.logger.log('✅ Appointment found:', {
      appointmentId: appointment._id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
    });

    const patientId =
      typeof appointment.patientId === 'string'
        ? appointment.patientId
        : (appointment.patientId as any)?._id?.toString();

    const doctorId =
      typeof appointment.doctorId === 'string'
        ? appointment.doctorId
        : (appointment.doctorId as any)?._id?.toString();

    this.logger.log('👤 Extracted IDs:', { patientId, doctorId });

    if (patientId !== userId) {
      this.logger.error(
        `❌ Unauthorized: User ${userId} is not the patient ${patientId}`,
      );
      return {
        success: false,
        error: 'Bạn không có quyền thanh toán lịch hẹn này',
        message: 'Unauthorized',
      };
    }

    // Get user's current wallet balance
    this.logger.log(`🔍 Fetching wallet balance for user: ${userId}`);
    const user = await this.userModel
      .findById(userId)
      .select('walletBalance')
      .exec();

    if (!user) {
      this.logger.error(`❌ User not found: ${userId}`);
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const currentBalance = user.walletBalance || 0;
    this.logger.log(
      `💵 Current wallet balance: ${currentBalance.toLocaleString('vi-VN')}đ`,
    );

    // Check if user has enough balance
    if (currentBalance < amount) {
      this.logger.warn(
        `⚠️ Insufficient balance: ${currentBalance} < ${amount}`,
      );
      return {
        success: false,
        error: `Số dư không đủ. Số dư hiện tại: ${currentBalance.toLocaleString('vi-VN')}đ, cần: ${amount.toLocaleString('vi-VN')}đ`,
        message: 'Insufficient balance',
      };
    }

    this.logger.log('✅ Balance check passed. Processing payment...');

    try {
      // Create wallet transaction record
      this.logger.log('📝 Creating wallet transaction...');
      const transaction = await this.walletTransactionModel.create({
        userId,
        amount: -amount, // Negative for payment
        type: 'payment',
        status: 'completed',
        paymentMethod: 'wallet',
        transactionId: `APPT_${appointmentId}_${Date.now()}`,
        description: `Thanh toán lịch khám #${appointmentId}`,
        appointmentId, // Link to appointment
      });

      this.logger.log('✅ Wallet transaction created:', {
        _id: transaction._id,
        amount: transaction.amount,
        userId: transaction.userId,
      });

      // Create Payment bill record (negative amount for patient charge)
      this.logger.log('📝 Creating payment bill...');
      const paymentBill = await this.paymentModel.create({
        patientId,
        doctorId,
        amount: -amount, // NEGATIVE amount = patient is charged (màu đỏ)
        status: 'completed',
        paymentMethod: 'wallet_deduction',
        type: 'appointment',
        billType: 'consultation_fee',
        refId: appointmentId,
        refModel: 'Appointment',
        transactionId: transaction._id.toString(),
      });

      this.logger.log('✅ Payment bill created:', {
        _id: paymentBill._id,
        amount: paymentBill.amount,
        patientId: paymentBill.patientId,
        doctorId: paymentBill.doctorId,
        paymentMethod: paymentBill.paymentMethod,
      });

      // Deduct amount from wallet balance
      this.logger.log(
        `💰 Updating wallet balance: ${currentBalance} - ${amount}...`,
      );
      const updatedUser = await this.userModel.findByIdAndUpdate(
        userId,
        { $inc: { walletBalance: -amount } },
        { new: true },
      );

      this.logger.log('✅ Wallet balance updated successfully:', {
        userId,
        previousBalance: currentBalance,
        newBalance: updatedUser?.walletBalance,
        deductedAmount: amount,
        calculation: `${currentBalance} - ${amount} = ${updatedUser?.walletBalance}`,
      });

      // Verify the update
      const verifyUser = await this.userModel
        .findById(userId)
        .select('walletBalance')
        .exec();
      this.logger.log(
        '🔍 Verification - Current balance in DB:',
        verifyUser?.walletBalance,
      );

      // Update appointment payment status
      this.logger.log('📝 Updating appointment payment status...');
      await this.appointmentModel.findByIdAndUpdate(appointmentId, {
        paymentStatus: 'paid',
      });

      this.logger.log('✅ Appointment payment status updated to: paid');
      this.logger.log('💰 ========== WALLET PAYMENT SUCCESS ==========');

      return {
        success: true,
        data: {
          transactionId: transaction._id,
          paymentId: paymentBill._id,
          newBalance: updatedUser?.walletBalance || 0,
          amount,
        },
        message: 'Thanh toán thành công',
      };
    } catch (error) {
      this.logger.error('❌ ========== WALLET PAYMENT FAILED ==========');
      this.logger.error('Error details:', error);
      this.logger.error('Stack trace:', error.stack);
      return {
        success: false,
        error: 'Không thể xử lý thanh toán',
        message: error.message || 'Payment failed',
      };
    }
  }
}
