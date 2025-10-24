import { BadRequestException, Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import aqp from 'api-query-params';
import mongoose, { Model } from 'mongoose';
import { Appointment } from '../appointments/schemas/appointment.schemas';
import { NotificationGateway } from '../notifications/notification.gateway';
import { RevenueService } from '../revenue/revenue.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Payment } from './schemas/payment.schemas';
import { MoMoCallbackData, MoMoService } from './services/momo.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @InjectModel(Appointment.name) private appointmentModel: Model<Appointment>,
    private readonly momoService: MoMoService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => RevenueService))
    private readonly revenueService: RevenueService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  /**
   * Tạo thanh toán MoMo cho appointment
   */
  async createMomoPayment(payload: {
    appointmentId: string;
    patientId: string;
    doctorId: string;
    amount: number;
    orderInfo?: string;
  }) {
    try {
      const { appointmentId, patientId, doctorId, amount, orderInfo } = payload;

      // Generate unique orderId
      const orderId = `APT_${appointmentId}_${Date.now()}`;

      // Get URLs from config
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:3000';
      const backendUrl =
        this.configService.get<string>('BACKEND_URL') ||
        'http://localhost:8081';

      const returnUrl = `${frontendUrl}/patient/appointments/payment-result`;
      const notifyUrl = `${backendUrl}/api/v1/payments/momo/callback`;

      // Create payment record in DB (pending)
      const payment = await this.paymentModel.create({
        patientId: new mongoose.Types.ObjectId(patientId),
        doctorId: new mongoose.Types.ObjectId(doctorId),
        amount,
        status: 'pending',
        type: 'appointment',
        refId: new mongoose.Types.ObjectId(appointmentId),
        refModel: 'Appointment',
        paymentMethod: 'momo',
        transactionId: orderId,
        notes: orderInfo || 'Thanh toán lịch khám',
      });

      // Create MoMo payment request
      const momoResponse = await this.momoService.createPayment({
        orderId,
        amount,
        orderInfo: orderInfo || `Thanh toán lịch khám #${appointmentId}`,
        returnUrl,
        notifyUrl,
        extraData: JSON.stringify({
          paymentId: payment._id.toString(),
          appointmentId,
        }),
      });

      this.logger.log('MoMo payment created:', {
        orderId,
        payUrl: momoResponse.payUrl,
      });

      return {
        success: true,
        data: {
          paymentId: payment._id,
          orderId,
          payUrl: momoResponse.payUrl,
          deeplink: momoResponse.deeplink,
          qrCodeUrl: momoResponse.qrCodeUrl,
        },
        message: 'Khởi tạo thanh toán MoMo thành công',
      };
    } catch (error) {
      this.logger.error('Create MoMo payment failed:', error);
      return {
        success: false,
        message: error.message || 'Tạo thanh toán MoMo thất bại',
      };
    }
  }

  /**
   * Tạo thanh toán MoMo từ payment record đã tồn tại (dùng cho trang payments)
   */
  async createMomoPaymentFromExisting(paymentId: string) {
    try {
      this.logger.log(
        '🔄 Creating MoMo payment from existing payment:',
        paymentId,
      );

      // Get existing payment
      const payment = await this.paymentModel
        .findById(paymentId)
        .populate('refId')
        .populate('doctorId')
        .populate('patientId');

      if (!payment) {
        throw new BadRequestException('Không tìm thấy thanh toán');
      }

      if (payment.status === 'completed') {
        throw new BadRequestException('Thanh toán này đã hoàn tất');
      }

      // Generate new orderId for this payment attempt
      const orderId = `PAY_${paymentId}_${Date.now()}`;

      // Get URLs from config
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:3000';
      const backendUrl =
        this.configService.get<string>('BACKEND_URL') ||
        'http://localhost:8081';

      const returnUrl = `${frontendUrl}/patient/appointments/payment-result`;
      const notifyUrl = `${backendUrl}/api/v1/payments/momo/callback`;

      // Extract appointment info
      const appointmentId = payment.refId
        ? typeof payment.refId === 'object'
          ? (payment.refId as any)._id
          : payment.refId
        : null;

      // Update payment with new transactionId
      payment.transactionId = orderId;
      payment.paymentMethod = 'momo';
      payment.status = 'pending'; // Reset to pending for new payment attempt
      await payment.save();

      // Create MoMo payment request
      const momoResponse = await this.momoService.createPayment({
        orderId,
        amount: payment.amount,
        orderInfo: payment.notes || `Thanh toán #${paymentId}`,
        returnUrl,
        notifyUrl,
        extraData: JSON.stringify({
          paymentId: payment._id.toString(),
          appointmentId: appointmentId?.toString(),
        }),
      });

      this.logger.log('✅ MoMo payment URL created for existing payment:', {
        paymentId,
        orderId,
        payUrl: momoResponse.payUrl,
      });

      return {
        success: true,
        data: {
          paymentId: payment._id,
          orderId,
          payUrl: momoResponse.payUrl,
          deeplink: momoResponse.deeplink,
          qrCodeUrl: momoResponse.qrCodeUrl,
        },
        message: 'Khởi tạo thanh toán MoMo thành công',
      };
    } catch (error) {
      this.logger.error('❌ Create MoMo payment from existing failed:', error);
      return {
        success: false,
        message: error.message || 'Tạo thanh toán MoMo thất bại',
      };
    }
  }

  /**
   * Xử lý callback từ MoMo (IPN)
   */
  async handleMomoCallback(callbackData: MoMoCallbackData) {
    try {
      this.logger.log('🔔 ========== MOMO CALLBACK RECEIVED ==========');
      this.logger.log(
        '📦 Callback data:',
        JSON.stringify(callbackData, null, 2),
      );

      // Verify signature
      const isValidSignature =
        this.momoService.verifyCallbackSignature(callbackData);
      if (!isValidSignature) {
        this.logger.error('Invalid MoMo callback signature');
        return {
          success: false,
          message: 'Invalid signature',
        };
      }

      // Parse extraData to get paymentId
      let paymentId: string | undefined;
      let appointmentId: string | undefined;

      try {
        const extraData = JSON.parse(callbackData.extraData || '{}');
        paymentId = extraData.paymentId;
        appointmentId = extraData.appointmentId;
      } catch (error) {
        this.logger.error('Failed to parse extraData:', error);
        // Fallback: find payment by transactionId
        const payment = await this.paymentModel.findOne({
          transactionId: callbackData.orderId,
        });
        if (payment) {
          paymentId = payment._id.toString();
          const refId = payment.refId as any;
          appointmentId =
            refId?._id?.toString() ||
            (typeof payment.refId === 'string'
              ? payment.refId
              : payment.refId?.toString());
        }
      }

      if (!paymentId) {
        this.logger.error('Payment not found:', callbackData.orderId);
        return {
          success: false,
          message: 'Payment not found',
        };
      }

      // Update payment status based on resultCode
      const { resultCode, transId, message } = callbackData;
      const status = resultCode === 0 ? 'completed' : 'failed';

      const updatedPayment = await this.paymentModel.findByIdAndUpdate(
        paymentId,
        {
          status,
          paymentDate: new Date(),
          transactionId: transId?.toString() || callbackData.orderId,
          notes: `${message} (resultCode: ${resultCode})`,
        },
        { new: true },
      );

      if (!updatedPayment) {
        this.logger.error('Failed to update payment:', paymentId);
        return {
          success: false,
          message: 'Failed to update payment',
        };
      }

      this.logger.log('✅ ========== PAYMENT UPDATED ==========');
      this.logger.log('💾 Payment details:', {
        paymentId,
        status,
        resultCode,
        appointmentId,
        transactionId: transId,
      });

      // Tự động tạo revenue khi payment completed
      if (status === 'completed') {
        this.logger.log('💰 ========== STARTING REVENUE CREATION ==========');
        this.logger.log('🔍 Payment details for revenue creation:', {
          paymentId,
          doctorId: updatedPayment.doctorId,
          patientId: updatedPayment.patientId,
          amount: updatedPayment.amount,
          status: updatedPayment.status,
          type: updatedPayment.type,
        });
        
        try {
          // CRITICAL: Đảm bảo revenue được tạo trước khi tiếp tục
          const revenueResult = await this.revenueService.createRevenueFromPayment(paymentId);
          
          this.logger.log('💰 Revenue creation result:', {
            success: revenueResult.success,
            message: revenueResult.message,
            revenueId: revenueResult.data?._id,
          });

          if (!revenueResult.success) {
            this.logger.error('❌ CRITICAL: Revenue creation failed but payment is completed!');
            this.logger.error('❌ This will cause data inconsistency!');
            this.logger.error('❌ Error:', revenueResult.message);
            
            // TODO: Implement retry mechanism or queue for failed revenue creation
            // For now, just log the error but don't fail the callback
          }

          // Gửi thông báo cho bác sĩ về doanh thu mới (chỉ khi revenue được tạo thành công)
          if (revenueResult.success && revenueResult.data) {
            this.logger.log('📤 Sending notification to doctor...');
            
            const doctorId = updatedPayment.doctorId.toString();
            const revenue = revenueResult.data;

            // Lấy thông tin patient để hiển thị trong thông báo
            const populatedPayment = await this.paymentModel
              .findById(paymentId)
              .populate('patientId', 'fullName')
              .populate('refId')
              .exec();

            const patientName = (populatedPayment?.patientId as any)?.fullName || 'Bệnh nhân';
            const formattedAmount = new Intl.NumberFormat('vi-VN', {
              style: 'currency',
              currency: 'VND',
            }).format(revenue.amount);

            // Gửi thông báo realtime cho bác sĩ
            await this.notificationGateway.sendNotificationToUser(
              doctorId,
              {
                title: '💰 Doanh thu mới',
                message: `Bạn đã nhận được ${formattedAmount} từ thanh toán của ${patientName}`,
                type: 'revenue',
                data: {
                  revenueId: revenue._id,
                  paymentId: paymentId,
                  appointmentId: appointmentId,
                  amount: revenue.amount,
                  netAmount: revenue.netAmount,
                  platformFee: revenue.platformFee,
                },
                linkTo: `/doctor/revenue`,
                icon: 'wallet',
              },
              true, // emit socket event
            );

            this.logger.log('✅ Notification sent to doctor:', doctorId);
            this.logger.log('✅ ========== REVENUE CREATION COMPLETED ==========');
          }
        } catch (error) {
          this.logger.error('❌ ========== REVENUE CREATION FAILED ==========');
          this.logger.error('❌ Error message:', error.message);
          this.logger.error('❌ Error stack:', error.stack);
          this.logger.error('❌ Payment ID:', paymentId);
          this.logger.error('❌ Doctor ID:', updatedPayment.doctorId);
          
          // IMPORTANT: Don't fail the MoMo callback even if revenue creation fails
          // The payment status is already updated, we can retry revenue creation later
        }
      }

      // Update appointment status if payment successful
      if (status === 'completed' && appointmentId) {
        try {
          const appointment =
            await this.appointmentModel.findById(appointmentId);

          if (!appointment) {
            this.logger.error('Appointment not found:', appointmentId);
          } else {
            // Only update if appointment is in pending_payment or pending status
            if (['pending_payment', 'pending'].includes(appointment.status)) {
              await this.appointmentModel.findByIdAndUpdate(appointmentId, {
                status: 'confirmed',
                paymentStatus: 'paid',
                paymentId: updatedPayment._id,
              });

              this.logger.log('✅ ========== APPOINTMENT CONFIRMED ==========');
              this.logger.log('📅 Appointment updated:', {
                appointmentId,
                previousStatus: appointment.status,
                newStatus: 'confirmed',
                paymentStatus: 'paid',
              });

              // TODO: Send notification to patient & doctor
            } else {
              this.logger.warn(
                'Appointment status not eligible for confirmation:',
                {
                  appointmentId,
                  currentStatus: appointment.status,
                },
              );
            }
          }
        } catch (error) {
          this.logger.error('Failed to update appointment:', error);
          // Don't fail the callback if appointment update fails
        }
      } else if (status === 'failed' && appointmentId) {
        // If payment failed, mark appointment as cancelled
        try {
          const appointment =
            await this.appointmentModel.findById(appointmentId);

          if (appointment && appointment.status === 'pending_payment') {
            await this.appointmentModel.findByIdAndUpdate(appointmentId, {
              status: 'cancelled',
              cancellationReason: 'Thanh toán thất bại hoặc bị hủy',
              paymentStatus: 'unpaid',
            });

            this.logger.log(
              'Appointment cancelled due to failed payment:',
              appointmentId,
            );
          }
        } catch (error) {
          this.logger.error(
            'Failed to cancel appointment after failed payment:',
            error,
          );
        }
      }

      return {
        success: true,
        data: updatedPayment,
        message: 'Callback processed successfully',
      };
    } catch (error) {
      this.logger.error('Handle MoMo callback failed:', error);
      return {
        success: false,
        message: error.message || 'Failed to process callback',
      };
    }
  }

  /**
   * Query payment status from MoMo and update if needed
   */
  async queryMomoPayment(orderId: string) {
    try {
      this.logger.log('🔍 ========== QUERYING PAYMENT STATUS ==========');
      this.logger.log('📝 Order ID:', orderId);

      // Try to find payment by transactionId
      let payment = await this.paymentModel
        .findOne({
          transactionId: orderId,
        })
        .populate('refId');

      // If not found, try to extract appointmentId from orderId (format: APT_{appointmentId}_{timestamp})
      if (!payment && orderId.startsWith('APT_')) {
        this.logger.log('🔍 Trying to find by appointment ID from orderId...');
        const parts = orderId.split('_');
        if (parts.length >= 2) {
          const appointmentId = parts[1]; // APT_68fa749e..._1761244318717 -> 68fa749e...
          this.logger.log('🔍 Searching for appointment:', appointmentId);
          
          // Find payment by appointment reference
          payment = await this.paymentModel
            .findOne({
              refId: appointmentId,
              refModel: 'Appointment',
            })
            .populate('refId')
            .sort({ createdAt: -1 }); // Get latest payment for this appointment
          
          if (payment) {
            this.logger.log('✅ Found payment by appointment ID:', payment._id);
          }
        }
      }

      // If still not found, try searching by similar transactionId pattern
      if (!payment) {
        this.logger.log('🔍 Trying to find by transaction ID pattern...');
        
        // Try to find payment with transactionId starting with PAY_ for the same reference
        if (orderId.startsWith('APT_')) {
          const parts = orderId.split('_');
          if (parts.length >= 2) {
            const appointmentId = parts[1];
            
            payment = await this.paymentModel
              .findOne({
                refId: appointmentId,
                refModel: 'Appointment',
                paymentMethod: 'momo',
              })
              .populate('refId')
              .sort({ createdAt: -1 });
            
            if (payment) {
              this.logger.log('✅ Found payment by appointment reference:', payment._id);
            }
          }
        }
      }

      if (!payment) {
        this.logger.error('❌ Payment not found for orderId:', orderId);
        this.logger.error('   Tried: transactionId match, appointmentId extraction, pattern matching');
        throw new BadRequestException('Không tìm thấy thanh toán');
      }

      this.logger.log('💾 Found payment:', {
        paymentId: payment._id,
        transactionId: payment.transactionId,
        status: payment.status,
        amount: payment.amount,
      });

      // Query MoMo for latest status
      const requestId = `QUERY_${orderId}_${Date.now()}`;
      const momoResponse = await this.momoService.queryTransaction(
        orderId,
        requestId,
      );

      this.logger.log('📊 MoMo response:', momoResponse);

      // Update payment if MoMo says it's completed but our DB says pending
      if (momoResponse.resultCode === 0 && payment.status === 'pending') {
        this.logger.log('🔄 Updating payment status to completed...');

        payment.status = 'completed';
        payment.paymentDate = new Date();
        if (momoResponse.transId) {
          payment.transactionId = momoResponse.transId.toString();
        }
        await payment.save();

        this.logger.log('✅ Payment status updated to completed');

        // 🔥 CRITICAL: Create revenue for the completed payment
        this.logger.log('💰 Creating revenue for completed payment...');
        try {
          const revenueResult = await this.revenueService.createRevenueFromPayment(
            payment._id.toString()
          );
          
          this.logger.log('💰 Revenue creation result:', {
            success: revenueResult.success,
            message: revenueResult.message,
            revenueId: revenueResult.data?._id,
          });

          if (!revenueResult.success) {
            this.logger.error('❌ CRITICAL: Revenue creation failed!');
            this.logger.error('❌ Error:', revenueResult.message);
          }

          // Send notification to doctor about new revenue
          if (revenueResult.success && revenueResult.data) {
            const doctorId = payment.doctorId.toString();
            const revenue = revenueResult.data;

            const populatedPayment = await this.paymentModel
              .findById(payment._id)
              .populate('patientId', 'fullName')
              .exec();

            const patientName = (populatedPayment?.patientId as any)?.fullName || 'Bệnh nhân';
            const formattedAmount = new Intl.NumberFormat('vi-VN', {
              style: 'currency',
              currency: 'VND',
            }).format(revenue.amount);

            await this.notificationGateway.sendNotificationToUser(
              doctorId,
              {
                title: '💰 Doanh thu mới',
                message: `Bạn đã nhận được ${formattedAmount} từ thanh toán của ${patientName}`,
                type: 'revenue',
                data: {
                  revenueId: revenue._id,
                  paymentId: payment._id,
                  amount: revenue.amount,
                  netAmount: revenue.netAmount,
                  platformFee: revenue.platformFee,
                },
                linkTo: `/doctor/revenue`,
                icon: 'wallet',
              },
              true,
            );

            this.logger.log('✅ Notification sent to doctor:', doctorId);
          }
        } catch (error) {
          this.logger.error('❌ Failed to create revenue in queryMomoPayment:', error);
          // Don't fail the query if revenue creation fails
        }

        // Also update appointment
        const appointmentId = (payment.refId as any)?._id || payment.refId;
        if (appointmentId) {
          await this.appointmentModel.findByIdAndUpdate(appointmentId, {
            status: 'confirmed',
            paymentStatus: 'paid',
            paymentId: payment._id,
          });

          this.logger.log('✅ Appointment confirmed via query:', appointmentId);
        }
      }

      // Re-fetch to get updated data
      const updatedPayment = await this.paymentModel
        .findById(payment._id)
        .populate('refId')
        .populate('doctorId', 'fullName')
        .populate('patientId', 'fullName');

      return {
        success: true,
        data: {
          payment: updatedPayment,
          momoStatus: momoResponse,
        },
        message: 'Truy vấn trạng thái thanh toán thành công',
      };
    } catch (error) {
      this.logger.error('❌ Query MoMo payment failed:', error);
      return {
        success: false,
        message: error.message || 'Truy vấn thanh toán thất bại',
      };
    }
  }

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

      this.logger.log('📋 Fetching payments for patient:', patientId);

      const payments = await this.paymentModel
        .find({ patientId })
        .sort({ createdAt: -1 })
        .populate('patientId', 'fullName email phone')
        .populate('doctorId', 'fullName email specialty specialization')
        .populate({
          path: 'refId',
          model: 'Appointment',
          select:
            'appointmentType appointmentDate startTime endTime consultationFee status paymentStatus',
          populate: {
            path: 'doctorId',
            select: 'fullName specialty specialization',
          },
        })
        .exec();

      this.logger.log(`✅ Found ${payments.length} payments`);

      // Debug first payment to verify populate
      if (payments.length > 0) {
        this.logger.log('📦 Sample payment:', {
          id: payments[0]._id,
          refId: payments[0].refId ? 'populated' : 'NOT POPULATED',
          doctorId: payments[0].doctorId ? 'populated' : 'NOT POPULATED',
        });
      }

      return {
        success: true,
        data: payments,
        message: 'Lấy danh sách thanh toán của bệnh nhân thành công',
      };
    } catch (error) {
      this.logger.error('❌ findByPatient error:', error);
      return {
        success: false,
        message:
          error.message ||
          'Có lỗi xảy ra khi lấy danh sách thanh toán của bệnh nhân',
      };
    }
  }

  async findByDoctor(doctorId: string) {
    try {
      if (!mongoose.isValidObjectId(doctorId)) {
        throw new BadRequestException('ID bác sĩ không hợp lệ');
      }

      this.logger.log('📋 Fetching payments for doctor:', doctorId);

      const payments = await this.paymentModel
        .find({ doctorId })
        .sort({ createdAt: -1 })
        .populate('patientId', 'fullName email phone')
        .populate('doctorId', 'fullName email specialty specialization')
        .populate({
          path: 'refId',
          model: 'Appointment',
          select:
            'appointmentType appointmentDate startTime endTime consultationFee status paymentStatus',
          populate: {
            path: 'patientId',
            select: 'fullName email phone',
          },
        })
        .exec();

      this.logger.log(`✅ Found ${payments.length} payments for doctor`);

      return {
        success: true,
        data: payments,
        message: 'Lấy danh sách thanh toán của bác sĩ thành công',
      };
    } catch (error) {
      this.logger.error('❌ findByDoctor error:', error);
      return {
        success: false,
        message:
          error.message ||
          'Có lỗi xảy ra khi lấy danh sách thanh toán của bác sĩ',
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

  /**
   * Test method để tạo revenue thủ công (chỉ để debug)
   */
  async testCreateRevenue(paymentId: string) {
    try {
      this.logger.log('🧪 Testing revenue creation for payment:', paymentId);
      
      // Check if payment exists
      const payment = await this.paymentModel.findById(paymentId).exec();
      if (!payment) {
        return {
          success: false,
          message: 'Payment not found',
        };
      }
      
      this.logger.log('📋 Payment details:', {
        _id: payment._id,
        status: payment.status,
        amount: payment.amount,
        doctorId: payment.doctorId,
        patientId: payment.patientId,
        type: payment.type
      });
      
      // Try to create revenue
      const result = await this.revenueService.createRevenueFromPayment(paymentId);
      this.logger.log('💰 Revenue creation result:', result);
      
      return result;
    } catch (error) {
      this.logger.error('❌ Test revenue creation failed:', error);
      return {
        success: false,
        message: error.message || 'Failed to create revenue',
        error: error.stack
      };
    }
  }

  /**
   * Đảm bảo revenue được tạo cho payment đã completed
   */
  async ensureRevenueForPayment(paymentId: string) {
    try {
      this.logger.log('🔍 Ensuring revenue for payment:', paymentId);
      
      // Check if payment exists and is completed
      const payment = await this.paymentModel.findById(paymentId).exec();
      if (!payment) {
        return {
          success: false,
          message: 'Payment not found',
        };
      }
      
      if (payment.status !== 'completed') {
        return {
          success: false,
          message: `Payment status is ${payment.status}, not completed`,
        };
      }
      
      // Check if revenue already exists
      const existingRevenue = await this.revenueService.getRevenueByPaymentId(paymentId);
      if (existingRevenue) {
        return {
          success: true,
          message: 'Revenue already exists',
          data: existingRevenue,
        };
      }
      
      // Create revenue
      const result = await this.revenueService.createRevenueFromPayment(paymentId);
      this.logger.log('✅ Revenue ensured for payment:', paymentId);
      
      return result;
    } catch (error) {
      this.logger.error('❌ Ensure revenue failed:', error);
      return {
        success: false,
        message: error.message || 'Failed to ensure revenue',
        error: error.stack
      };
    }
  }

  /**
   * DEVELOPMENT ONLY: Simulate MoMo callback for testing locally
   */
  async simulateMoMoCallback(orderId: string, resultCode: number = 0) {
    try {
      this.logger.log('🧪 ========== SIMULATING MOMO CALLBACK ==========');
      this.logger.log('📦 Order ID:', orderId);
      this.logger.log('📊 Result Code:', resultCode);

      // Find payment by transactionId (orderId)
      const payment = await this.paymentModel.findOne({ transactionId: orderId }).exec();
      
      if (!payment) {
        this.logger.error('❌ Payment not found for orderId:', orderId);
        return {
          success: false,
          message: 'Payment not found',
        };
      }

      this.logger.log('💳 Payment found:', {
        paymentId: payment._id,
        status: payment.status,
        amount: payment.amount,
      });

      // Simulate callback data
      const callbackData: MoMoCallbackData = {
        partnerCode: this.configService.get<string>('MOMO_PARTNER_CODE') || 'MOMO',
        orderId: orderId,
        requestId: `SIM_REQ_${Date.now()}`,
        amount: payment.amount,
        orderInfo: payment.notes || 'Simulated payment',
        orderType: 'momo_wallet',
        transId: Date.now(),
        resultCode: resultCode,
        message: resultCode === 0 ? 'Successful.' : 'Failed.',
        payType: 'qr',
        responseTime: Date.now(),
        extraData: JSON.stringify({
          paymentId: payment._id.toString(),
          appointmentId: payment.refId?.toString(),
        }),
        signature: 'simulated_signature',
      };

      this.logger.log('📤 Calling handleMomoCallback with simulated data...');
      
      // Call the actual callback handler
      const result = await this.handleMomoCallback(callbackData);
      
      this.logger.log('✅ Simulation completed:', result);
      
      return {
        success: true,
        message: 'Callback simulated successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error('❌ Simulate callback failed:', error);
      return {
        success: false,
        message: error.message || 'Failed to simulate callback',
        error: error.stack,
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
