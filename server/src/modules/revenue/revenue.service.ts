import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import aqp from 'api-query-params';
import mongoose, { Model } from 'mongoose';
import { Payment } from '../payments/schemas/payment.schemas';
import { CreateRevenueDto } from './dto/create-revenue.dto';
import { UpdateRevenueDto } from './dto/update-revenue.dto';
import { RevenueGateway } from './revenue.gateway';
import { Revenue } from './schemas/revenue.schemas';

@Injectable()
export class RevenueService {
  private readonly logger = new Logger(RevenueService.name);

  constructor(
    @InjectModel(Revenue.name) private revenueModel: Model<Revenue>,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    private readonly revenueGateway: RevenueGateway,
  ) {
    this.logger.log('✅ RevenueService initialized');
    this.logger.log(
      `   - RevenueGateway: ${this.revenueGateway ? 'Available' : 'NOT Available'}`,
    );
  }

  /**
   * Tạo revenue record từ payment đã completed
   * Được gọi tự động khi payment status = completed
   */
  async createRevenueFromPayment(paymentId: string) {
    this.logger.log('💰 ========== CREATE REVENUE FROM PAYMENT ==========');
    this.logger.log('� Payment ID:', paymentId);

    try {
      // Validate paymentId
      if (!paymentId || !mongoose.Types.ObjectId.isValid(paymentId)) {
        throw new BadRequestException('Payment ID không hợp lệ');
      }

      // Check if payment exists
      this.logger.log('🔍 Finding payment in database...');
      const payment = await this.paymentModel
        .findById(paymentId)
        .populate('doctorId', 'fullName email')
        .populate('patientId', 'fullName email')
        .exec();

      if (!payment) {
        this.logger.error('❌ Payment not found:', paymentId);
        throw new BadRequestException('Không tìm thấy thanh toán');
      }

      if (payment.status !== 'completed') {
        this.logger.error('❌ Payment not completed:', payment.status);
        throw new BadRequestException(
          `Thanh toán chưa hoàn thành (status: ${payment.status})`,
        );
      }

      // Check if revenue already exists for this payment
      this.logger.log('🔍 Checking if revenue already exists...');
      const existingRevenue = await this.revenueModel
        .findOne({ paymentId })
        .exec();

      if (existingRevenue) {
        this.logger.warn('⚠️ Revenue already exists for payment:', paymentId);
        this.logger.log('📊 Existing revenue:', {
          revenueId: existingRevenue._id,
          doctorId: existingRevenue.doctorId,
          amount: existingRevenue.amount,
          status: existingRevenue.status,
        });

        return {
          success: true,
          data: existingRevenue,
          message: 'Doanh thu đã tồn tại cho thanh toán này',
        };
      }

      // FIXED: Xử lý payment amount có thể âm (cancellation_charge)
      // Doctor NHẬN TIỀN nên revenue phải DƯƠNG
      // Ví dụ: payment.amount = -50000 (patient bị trừ) → revenue = +50000 (doctor nhận)
      const absoluteAmount = Math.abs(payment.amount);

      // Calculate platform fee (ÂM trong database, 5% of absolute amount)
      // EXCEPTION: Refund bills do NOT charge platform fee (doctor is returning money)
      let platformFee = 0;
      let platformFeeRate = 0;

      if (payment.billType === 'refund') {
        // Bill hoàn tiền - KHÔNG tính phí (bác sĩ đang trả lại tiền)
        this.logger.log('💸 Refund detected - NO platform fee');
        platformFee = 0;
        platformFeeRate = 0;
      } else {
        // Tất cả bill khác (consultation_fee, cancellation_charge, reservation_fee) - TRỪ 5%
        this.logger.log('💰 Regular revenue - applying 5% platform fee');
        platformFeeRate = 0.05; // 5%
        platformFee = -Math.round(absoluteAmount * platformFeeRate); // ÂM
      }

      const netAmount = absoluteAmount + platformFee; // amount + (-platformFee)

      this.logger.log('💵 Calculating revenue amounts:', {
        originalPaymentAmount: payment.amount,
        billType: payment.billType,
        absoluteAmount,
        platformFeeRate: `${platformFeeRate * 100}%`,
        platformFee, // ÂM hoặc 0
        netAmount,
      });

      // Create revenue record
      // amount: DƯƠNG, platformFee: ÂM, netAmount: DƯƠNG
      this.logger.log('💾 Creating revenue record in database...');
      const revenue = await this.revenueModel.create({
        doctorId: payment.doctorId,
        paymentId: payment._id,
        patientId: payment.patientId,
        amount: absoluteAmount, // DƯƠNG - doctor nhận tiền
        platformFee, // ÂM - phí bị trừ
        netAmount, // DƯƠNG - thực nhận
        revenueDate: payment.paymentDate || new Date(),
        status: 'completed',
        refId: payment.refId,
        refModel: payment.refModel,
        type: payment.type || 'appointment',
        notes: `Doanh thu từ thanh toán #${payment._id.toString()}`,
      });

      this.logger.log('✅ Revenue created successfully in database:', {
        revenueId: revenue._id,
        doctorId: payment.doctorId,
        amount: payment.amount,
        netAmount,
        platformFee,
      });

      // Populate revenue trước khi emit
      this.logger.log('🔄 Populating revenue data...');
      const populatedRevenue = await this.revenueModel
        .findById(revenue._id)
        .populate('patientId', 'fullName email phone')
        .populate('paymentId', 'transactionId paymentMethod')
        .exec();

      // Emit realtime event cho bác sĩ
      const doctorId =
        typeof payment.doctorId === 'string'
          ? payment.doctorId
          : (payment.doctorId as any)?._id?.toString() ||
            payment.doctorId.toString();

      this.logger.log('🔔 Preparing to emit socket event...');
      this.logger.log(`   - Doctor ID: ${doctorId}`);
      this.logger.log(
        `   - RevenueGateway available: ${!!this.revenueGateway}`,
      );
      this.logger.log(
        `   - Gateway server available: ${!!this.revenueGateway?.server}`,
      );

      if (!this.revenueGateway) {
        this.logger.error('❌ RevenueGateway is not available!');
      } else if (!this.revenueGateway.server) {
        this.logger.error('❌ RevenueGateway.server is not available!');
      } else {
        this.revenueGateway.emitNewRevenue(doctorId, populatedRevenue);
        this.logger.log('✅ Socket event emitted successfully');
      }

      this.logger.log('✅ ========== REVENUE CREATION SUCCESSFUL ==========');

      return {
        success: true,
        data: populatedRevenue,
        message: 'Tạo doanh thu thành công',
      };
    } catch (error) {
      this.logger.error('❌ ========== REVENUE CREATION FAILED ==========');
      this.logger.error('❌ Error:', error.message);
      this.logger.error('❌ Stack:', error.stack);

      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi tạo doanh thu',
        error: error.stack,
      };
    }
  }

  /**
   * Tạo revenue record ÂM khi refund (trừ tiền bác sĩ)
   * Payment của refund có amount DƯƠNG (patient nhận tiền)
   * Nhưng revenue của doctor phải ÂM (doctor bị trừ tiền)
   */
  async createRevenueForRefund(refundPaymentId: string) {
    this.logger.log('💸 ========== CREATE REVENUE FOR REFUND ==========');
    this.logger.log('📋 Refund Payment ID:', refundPaymentId);

    try {
      // Validate paymentId
      if (
        !refundPaymentId ||
        !mongoose.Types.ObjectId.isValid(refundPaymentId)
      ) {
        throw new BadRequestException('Payment ID không hợp lệ');
      }

      // Get refund payment
      const refundPayment = await this.paymentModel
        .findById(refundPaymentId)
        .populate('doctorId', 'fullName email')
        .populate('patientId', 'fullName email')
        .exec();

      if (!refundPayment) {
        throw new BadRequestException('Không tìm thấy refund payment');
      }

      if (refundPayment.billType !== 'refund') {
        throw new BadRequestException('Payment không phải là refund');
      }

      // Check if revenue already exists
      const existingRevenue = await this.revenueModel
        .findOne({ paymentId: refundPaymentId })
        .exec();
      if (existingRevenue) {
        this.logger.warn(
          '⚠️ Revenue already exists for refund:',
          refundPaymentId,
        );
        return {
          success: true,
          data: existingRevenue,
          message: 'Revenue đã tồn tại cho refund này',
        };
      }

      // Calculate negative revenue (doctor loses money)
      // REFUND KHÔNG BỊ TRỪ PHÍ - Doctor mất đúng số tiền đã nhận
      // refundPayment.amount is POSITIVE (patient receives money)
      // We need to create NEGATIVE revenue (doctor loses money)
      const refundAmount = Math.abs(refundPayment.amount);
      const platformFeeRefund = 0; // KHÔNG TRỪ PHÍ cho refund
      const netAmountRefund = -refundAmount; // ÂM - doctor mất hết số tiền gốc

      this.logger.log('💵 Calculating negative revenue for doctor:', {
        refundAmount: -refundAmount, // ÂM
        platformFeeRefund, // = 0 (KHÔNG TRỪ PHÍ)
        netAmountRefund, // ÂM
      });

      // Create negative revenue record
      // Refund KHÔNG tính phí platformFee
      const revenue = await this.revenueModel.create({
        doctorId: refundPayment.doctorId,
        paymentId: refundPayment._id,
        patientId: refundPayment.patientId,
        amount: -refundAmount, // ÂM - doctor loses money
        platformFee: platformFeeRefund, // = 0 - KHÔNG TRỪ PHÍ
        netAmount: netAmountRefund, // ÂM - doctor mất hết
        revenueDate: new Date(),
        status: 'completed',
        refId: refundPayment.refId,
        refModel: refundPayment.refModel,
        type: refundPayment.type || 'appointment',
        notes: `Hoàn tiền cho bệnh nhân - Trừ doanh thu (Refund #${refundPayment._id.toString()})`,
      });

      this.logger.log('✅ Negative revenue created for refund:', {
        revenueId: revenue._id,
        doctorId: refundPayment.doctorId,
        amount: revenue.amount, // Negative
        netAmount: revenue.netAmount, // Negative
      });

      // Populate revenue
      const populatedRevenue = await this.revenueModel
        .findById(revenue._id)
        .populate('patientId', 'fullName email phone')
        .populate('paymentId', 'transactionId paymentMethod')
        .exec();

      // Emit realtime event
      const doctorId =
        typeof refundPayment.doctorId === 'string'
          ? refundPayment.doctorId
          : (refundPayment.doctorId as any)?._id?.toString();
      if (this.revenueGateway?.server && doctorId) {
        this.revenueGateway.emitRevenueUpdate(doctorId, populatedRevenue);
        this.logger.log('✅ Refund revenue socket event emitted');
      }

      this.logger.log(
        '✅ ========== REFUND REVENUE CREATION SUCCESSFUL ==========',
      );

      return {
        success: true,
        data: populatedRevenue,
        message: 'Tạo revenue âm cho refund thành công',
      };
    } catch (error) {
      this.logger.error(
        '❌ ========== REFUND REVENUE CREATION FAILED ==========',
      );
      this.logger.error('❌ Error:', error.message);
      this.logger.error('❌ Stack:', error.stack);

      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi tạo revenue cho refund',
        error: error.stack,
      };
    }
  }

  /**
   * Lấy revenue theo paymentId
   */
  async getRevenueByPaymentId(paymentId: string) {
    try {
      const revenue = await this.revenueModel.findOne({ paymentId }).exec();
      return revenue;
    } catch (error) {
      this.logger.error('❌ Get revenue by payment ID failed:', error);
      return null;
    }
  }

  /**
   * Lấy tổng doanh thu của bác sĩ
   */
  async getDoctorRevenueSummary(
    doctorId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    try {
      if (!mongoose.isValidObjectId(doctorId)) {
        throw new BadRequestException('ID bác sĩ không hợp lệ');
      }

      this.logger.log('📊 Getting revenue summary for doctor:', doctorId);

      const filter: any = { doctorId };

      if (startDate || endDate) {
        filter.revenueDate = {};
        if (startDate) filter.revenueDate.$gte = startDate;
        if (endDate) filter.revenueDate.$lte = endDate;
      }

      // Aggregate revenue data
      const summary = await this.revenueModel.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$status',
            totalAmount: { $sum: '$amount' },
            totalPlatformFee: { $sum: '$platformFee' },
            totalNetAmount: { $sum: '$netAmount' },
            count: { $sum: 1 },
          },
        },
      ]);

      // Calculate totals across all statuses
      const totals = {
        totalRevenue: 0,
        totalPlatformFee: 0,
        totalNetRevenue: 0,
        totalTransactions: 0,
        byStatus: {} as any,
      };

      summary.forEach((item) => {
        totals.totalRevenue += item.totalAmount;
        totals.totalPlatformFee += item.totalPlatformFee;
        totals.totalNetRevenue += item.totalNetAmount;
        totals.totalTransactions += item.count;
        totals.byStatus[item._id] = {
          amount: item.totalAmount,
          platformFee: item.totalPlatformFee,
          netAmount: item.totalNetAmount,
          count: item.count,
        };
      });

      // Get monthly revenue trend (last 12 months)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const monthlyTrend = await this.revenueModel.aggregate([
        {
          $match: {
            doctorId: new mongoose.Types.ObjectId(doctorId),
            revenueDate: { $gte: twelveMonthsAgo },
            status: { $in: ['completed', 'withdrawn'] },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$revenueDate' },
              month: { $month: '$revenueDate' },
            },
            totalAmount: { $sum: '$amount' },
            totalNetAmount: { $sum: '$netAmount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]);

      this.logger.log('✅ Revenue summary calculated');

      return {
        success: true,
        data: {
          summary: totals,
          monthlyTrend,
          period: {
            startDate,
            endDate,
          },
        },
        message: 'Lấy tổng quan doanh thu thành công',
      };
    } catch (error) {
      this.logger.error('❌ Get revenue summary failed:', error);
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy tổng quan doanh thu',
      };
    }
  }

  /**
   * Lấy danh sách doanh thu của bác sĩ với thống kê đầy đủ
   */
  async getDoctorRevenues(
    doctorId: string,
    query: string,
    current: number = 1,
    pageSize: number = 10,
    patientId?: string,
  ) {
    try {
      if (!mongoose.isValidObjectId(doctorId)) {
        throw new BadRequestException('ID bác sĩ không hợp lệ');
      }

      this.logger.log('📋 Getting revenues for doctor:', doctorId);
      if (patientId) {
        this.logger.log('🔍 Filtering by patient:', patientId);
      }

      const { filter, sort } = aqp(query);

      // Add doctorId to filter
      filter.doctorId = new mongoose.Types.ObjectId(doctorId);

      // Add patientId to filter if provided
      if (patientId && mongoose.isValidObjectId(patientId)) {
        filter.patientId = new mongoose.Types.ObjectId(patientId);
      }

      if (filter.current) delete filter.current;
      if (filter.pageSize) delete filter.pageSize;

      // Handle period filter from query params
      const period = filter.period || 'month';
      delete filter.period;

      let startDate: Date | undefined;
      let endDate: Date = new Date();

      // Handle custom date range
      if (filter.startDate && filter.endDate) {
        startDate = new Date(filter.startDate);
        endDate = new Date(filter.endDate);
        delete filter.startDate;
        delete filter.endDate;
      } else {
        // Calculate date range based on period
        switch (period) {
          case 'today':
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
          case 'week':
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
            break;
          case 'month':
            startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 1);
            break;
          case 'year':
            startDate = new Date();
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
          case 'all':
            startDate = undefined;
            break;
          default:
            startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 1);
        }
      }

      // Add date filter
      if (startDate) {
        filter.revenueDate = { $gte: startDate, $lte: endDate };
      }

      // Query từ REVENUES collection (bảng riêng cho bác sĩ)
      const revenueFilter: any = {
        doctorId: filter.doctorId,
        status: filter.status || { $in: ['pending', 'completed'] },
      };

      // Add date filter nếu có
      if (startDate) {
        revenueFilter['revenueDate'] = { $gte: startDate, $lte: endDate };
      }

      // Get revenues from revenues collection
      const totalItems = await this.revenueModel.countDocuments(revenueFilter);
      const totalPages = Math.ceil(totalItems / pageSize);
      const skip = (current - 1) * pageSize;

      const revenues = await this.revenueModel
        .find(revenueFilter)
        .limit(pageSize)
        .skip(skip)
        .sort((sort as any) || { revenueDate: -1 })
        .populate('patientId', 'fullName email phone')
        .populate({
          path: 'refId',
          select: 'appointmentDate startTime endTime status appointmentType',
        })
        .exec();

      this.logger.log(`✅ Found ${revenues.length} revenue records for doctor`);

      // Calculate summary statistics from revenues
      const summaryPipeline: any[] = [
        { $match: revenueFilter },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' }, // Tổng số tiền gốc
            totalPlatformFee: { $sum: '$platformFee' }, // Tổng phí nền tảng (âm)
            totalRevenue: { $sum: '$netAmount' }, // Tổng thực nhận (sau trừ phí)
            totalAppointments: { $sum: 1 },
            averageRevenue: { $avg: '$netAmount' },
          },
        },
      ];

      const summaryResult = await this.revenueModel.aggregate(summaryPipeline);
      const summary = summaryResult[0] || {
        totalAmount: 0,
        totalPlatformFee: 0,
        totalRevenue: 0,
        totalAppointments: 0,
        averageRevenue: 0,
      };

      // Get revenue by type from revenues
      const revenueByTypePipeline: any[] = [
        { $match: revenueFilter },
        {
          $group: {
            _id: '$type',
            revenue: { $sum: '$netAmount' },
            count: { $sum: 1 },
          },
        },
      ];

      const revenueByTypeResult = await this.revenueModel.aggregate(
        revenueByTypePipeline,
      );
      const revenueByType = revenueByTypeResult.map((item) => ({
        type: item._id || 'appointment',
        revenue: item.revenue,
        count: item.count,
      }));

      // Get monthly revenue data from payments
      const monthlyRevenuePipeline: any[] = [
        {
          $match: {
            doctorId: new mongoose.Types.ObjectId(doctorId),
            status: { $in: ['completed', 'pending'] },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            revenue: { $sum: '$netAmount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 }, // Last 12 months
      ];

      const monthlyRevenueResult = await this.paymentModel.aggregate(
        monthlyRevenuePipeline,
      );
      const monthlyRevenue = monthlyRevenueResult.map((item) => ({
        year: item._id.year,
        month: item._id.month,
        revenue: item.revenue,
        count: item.count,
      }));

      // Get recent transactions (payments with revenue info)
      const payments = await this.paymentModel
        .find({
          doctorId: new mongoose.Types.ObjectId(doctorId),
          status: 'completed',
          ...(startDate && { paymentDate: { $gte: startDate, $lte: endDate } }),
        })
        .limit(20)
        .sort({ paymentDate: -1 })
        .populate('patientId', 'fullName email phone')
        .populate('doctorId', 'fullName email')
        .populate({
          path: 'refId',
          select: 'appointmentDate startTime endTime appointmentType',
        })
        .exec();

      // Add revenue info to payments
      const paymentsWithRevenue = await Promise.all(
        payments.map(async (payment) => {
          const revenue = await this.revenueModel
            .findOne({ paymentId: payment._id })
            .exec();
          const revenueObj = revenue ? revenue.toObject() : null;
          return {
            ...payment.toObject(),
            revenueAmount: revenue?.netAmount || 0,
            platformFee: revenue?.platformFee || 0,
            revenueRecorded: !!revenue,
            revenueRecordedAt: (revenueObj as any)?.createdAt,
          };
        }),
      );

      return {
        success: true,
        data: {
          summary: {
            totalAmount: summary.totalAmount || 0,
            totalPlatformFee: summary.totalPlatformFee || 0,
            totalRevenue: summary.totalRevenue || 0,
            totalAppointments: summary.totalAppointments || 0,
            averageRevenue: summary.averageRevenue || 0,
            period: period,
          },
          revenueByType,
          monthlyRevenue,
          recentTransactions: paymentsWithRevenue,
          results: revenues,
          totalItems,
          totalPages,
          current,
          pageSize,
        },
        message: 'Lấy danh sách doanh thu thành công',
      };
    } catch (error) {
      this.logger.error('❌ Get doctor revenues failed:', error);
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy danh sách doanh thu',
      };
    }
  }

  /**
   * Lấy doanh thu theo khoảng thời gian
   */
  async getRevenueByDateRange(
    doctorId: string,
    startDate: Date,
    endDate: Date,
    status?: string,
  ) {
    try {
      if (!mongoose.isValidObjectId(doctorId)) {
        throw new BadRequestException('ID bác sĩ không hợp lệ');
      }

      const filter: any = {
        doctorId: new mongoose.Types.ObjectId(doctorId),
        revenueDate: {
          $gte: startDate,
          $lte: endDate,
        },
      };

      if (status) {
        filter.status = status;
      }

      const revenues = await this.revenueModel
        .find(filter)
        .sort({ revenueDate: -1 })
        .populate('patientId', 'fullName email')
        .populate('paymentId', 'transactionId paymentMethod')
        .exec();

      // Calculate summary
      const summary = revenues.reduce(
        (acc, revenue) => {
          acc.totalAmount += revenue.amount;
          acc.totalPlatformFee += revenue.platformFee;
          acc.totalNetAmount += revenue.netAmount;
          acc.count += 1;
          return acc;
        },
        { totalAmount: 0, totalPlatformFee: 0, totalNetAmount: 0, count: 0 },
      );

      return {
        success: true,
        data: {
          revenues,
          summary,
          period: { startDate, endDate },
        },
        message: 'Lấy doanh thu theo khoảng thời gian thành công',
      };
    } catch (error) {
      this.logger.error('❌ Get revenue by date range failed:', error);
      return {
        success: false,
        message:
          error.message || 'Có lỗi xảy ra khi lấy doanh thu theo thời gian',
      };
    }
  }

  /**
   * Standard CRUD methods
   */
  async create(createRevenueDto: CreateRevenueDto) {
    try {
      const revenue = await this.revenueModel.create(createRevenueDto);
      return {
        success: true,
        data: revenue,
        message: 'Tạo doanh thu thành công',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi tạo doanh thu',
      };
    }
  }

  async findAll(query: string, current: number = 1, pageSize: number = 10) {
    try {
      const { filter, sort } = aqp(query);

      if (filter.current) delete filter.current;
      if (filter.pageSize) delete filter.pageSize;

      const totalItems = await this.revenueModel.countDocuments(filter);
      const totalPages = Math.ceil(totalItems / pageSize);
      const skip = (current - 1) * pageSize;

      const results = await this.revenueModel
        .find(filter)
        .limit(pageSize)
        .skip(skip)
        .sort((sort as any) || { createdAt: -1 })
        .populate('doctorId', 'fullName email')
        .populate('patientId', 'fullName email')
        .populate('paymentId')
        .exec();

      return {
        success: true,
        data: { results, totalItems, totalPages, current, pageSize },
        message: 'Lấy danh sách doanh thu thành công',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy danh sách doanh thu',
      };
    }
  }

  async findOne(id: string) {
    try {
      if (!mongoose.isValidObjectId(id)) {
        throw new BadRequestException('ID không hợp lệ');
      }

      const revenue = await this.revenueModel
        .findById(id)
        .populate('doctorId', 'fullName email')
        .populate('patientId', 'fullName email')
        .populate('paymentId')
        .exec();

      if (!revenue) {
        throw new BadRequestException('Không tìm thấy doanh thu');
      }

      return {
        success: true,
        data: revenue,
        message: 'Lấy thông tin doanh thu thành công',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy thông tin doanh thu',
      };
    }
  }

  async update(id: string, updateRevenueDto: UpdateRevenueDto) {
    try {
      if (!mongoose.isValidObjectId(id)) {
        throw new BadRequestException('ID không hợp lệ');
      }

      const revenue = await this.revenueModel
        .findByIdAndUpdate(id, updateRevenueDto, { new: true })
        .exec();

      if (!revenue) {
        throw new BadRequestException('Không tìm thấy doanh thu');
      }

      return {
        success: true,
        data: revenue,
        message: 'Cập nhật doanh thu thành công',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi cập nhật doanh thu',
      };
    }
  }

  async remove(id: string) {
    try {
      if (!mongoose.isValidObjectId(id)) {
        throw new BadRequestException('ID không hợp lệ');
      }

      const revenue = await this.revenueModel.findByIdAndDelete(id).exec();

      if (!revenue) {
        throw new BadRequestException('Không tìm thấy doanh thu');
      }

      return {
        success: true,
        message: 'Xóa doanh thu thành công',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi xóa doanh thu',
      };
    }
  }
}
