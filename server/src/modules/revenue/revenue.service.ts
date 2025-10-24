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
    this.logger.log(`   - RevenueGateway: ${this.revenueGateway ? 'Available' : 'NOT Available'}`);
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

      this.logger.log('✅ Payment found:', {
        paymentId: payment._id,
        status: payment.status,
        amount: payment.amount,
        doctorId: payment.doctorId,
        patientId: payment.patientId,
      });

      if (payment.status !== 'completed') {
        this.logger.error('❌ Payment not completed:', payment.status);
        throw new BadRequestException(`Thanh toán chưa hoàn thành (status: ${payment.status})`);
      }

      // Check if revenue already exists for this payment
      this.logger.log('🔍 Checking if revenue already exists...');
      const existingRevenue = await this.revenueModel.findOne({ paymentId }).exec();
      
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

      // Calculate platform fee (e.g., 5% of payment amount)
      const platformFeeRate = 0.05; // 5%
      const platformFee = Math.round(payment.amount * platformFeeRate);
      const netAmount = payment.amount - platformFee;

      this.logger.log('💵 Calculating revenue amounts:', {
        totalAmount: payment.amount,
        platformFeeRate: `${platformFeeRate * 100}%`,
        platformFee,
        netAmount,
      });

      // Create revenue record
      this.logger.log('💾 Creating revenue record in database...');
      const revenue = await this.revenueModel.create({
        doctorId: payment.doctorId,
        paymentId: payment._id,
        patientId: payment.patientId,
        amount: payment.amount,
        platformFee,
        netAmount,
        revenueDate: payment.paymentDate || new Date(),
        status: 'completed',
        refId: payment.refId,
        refModel: payment.refModel,
        type: payment.type || 'appointment',
        notes: `Doanh thu từ thanh toán #${payment._id}`,
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
      const doctorId = payment.doctorId.toString();
      
      this.logger.log('🔔 Preparing to emit socket event...');
      this.logger.log(`   - Doctor ID: ${doctorId}`);
      this.logger.log(`   - RevenueGateway available: ${!!this.revenueGateway}`);
      this.logger.log(`   - Gateway server available: ${!!this.revenueGateway?.server}`);
      
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
  async getDoctorRevenueSummary(doctorId: string, startDate?: Date, endDate?: Date) {
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
  ) {
    try {
      if (!mongoose.isValidObjectId(doctorId)) {
        throw new BadRequestException('ID bác sĩ không hợp lệ');
      }

      this.logger.log('📋 Getting revenues for doctor:', doctorId);

      const { filter, sort } = aqp(query);

      // Add doctorId to filter
      filter.doctorId = new mongoose.Types.ObjectId(doctorId);

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

      this.logger.log('📅 Date filter:', { startDate, endDate, period });

      // Get revenues for the list
      const totalItems = await this.revenueModel.countDocuments(filter);
      const totalPages = Math.ceil(totalItems / pageSize);
      const skip = (current - 1) * pageSize;

      const revenues = await this.revenueModel
        .find(filter)
        .limit(pageSize)
        .skip(skip)
        .sort(sort as any || { revenueDate: -1 })
        .populate('patientId', 'fullName email phone')
        .populate('paymentId', 'transactionId paymentMethod')
        .populate({
          path: 'refId',
          select: 'appointmentDate startTime endTime status appointmentType',
        })
        .exec();

      // Calculate summary statistics
      const summaryPipeline: any[] = [
        { $match: filter },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' }, // Tổng số tiền gốc
            totalPlatformFee: { $sum: '$platformFee' }, // Tổng phí nền tảng
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

      // Get revenue by type
      const revenueByTypePipeline: any[] = [
        { $match: filter },
        {
          $group: {
            _id: '$type',
            revenue: { $sum: '$netAmount' },
            count: { $sum: 1 },
          },
        },
      ];

      const revenueByTypeResult = await this.revenueModel.aggregate(revenueByTypePipeline);
      const revenueByType = revenueByTypeResult.map(item => ({
        type: item._id || 'appointment',
        revenue: item.revenue,
        count: item.count,
      }));

      // Get monthly revenue data
      const monthlyRevenuePipeline: any[] = [
        { 
          $match: {
            doctorId: new mongoose.Types.ObjectId(doctorId),
            status: { $in: ['completed', 'withdrawn'] },
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$revenueDate' },
              month: { $month: '$revenueDate' },
            },
            revenue: { $sum: '$netAmount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 }, // Last 12 months
      ];

      const monthlyRevenueResult = await this.revenueModel.aggregate(monthlyRevenuePipeline);
      const monthlyRevenue = monthlyRevenueResult.map(item => ({
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
          const revenue = await this.revenueModel.findOne({ paymentId: payment._id }).exec();
          const revenueObj = revenue ? revenue.toObject() : null;
          return {
            ...payment.toObject(),
            revenueAmount: revenue?.netAmount || 0,
            platformFee: revenue?.platformFee || 0,
            revenueRecorded: !!revenue,
            revenueRecordedAt: (revenueObj as any)?.createdAt,
          };
        })
      );

      this.logger.log(`✅ Found ${revenues.length} revenues with full statistics`);

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
        message: error.message || 'Có lỗi xảy ra khi lấy doanh thu theo thời gian',
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
        .sort(sort as any || { createdAt: -1 })
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
