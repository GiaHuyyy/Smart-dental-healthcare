import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import aqp from 'api-query-params';
import mongoose, { Model } from 'mongoose';
import { Appointment } from '../appointments/schemas/appointment.schemas';
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
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const backendUrl = this.configService.get<string>('BACKEND_URL') || 'http://localhost:8081';
      
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
          appointmentId 
        }),
      });

      this.logger.log('MoMo payment created:', { orderId, payUrl: momoResponse.payUrl });

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
   * Xử lý callback từ MoMo (IPN)
   */
  async handleMomoCallback(callbackData: MoMoCallbackData) {
    try {
      this.logger.log('Received MoMo callback:', callbackData);

      // Verify signature
      const isValidSignature = this.momoService.verifyCallbackSignature(callbackData);
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
          transactionId: callbackData.orderId 
        });
        if (payment) {
          paymentId = payment._id.toString();
          appointmentId = payment.refId.toString();
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
        { new: true }
      );

      if (!updatedPayment) {
        this.logger.error('Failed to update payment:', paymentId);
        return {
          success: false,
          message: 'Failed to update payment',
        };
      }

      this.logger.log('Payment updated:', { 
        paymentId, 
        status, 
        resultCode,
        appointmentId 
      });

      // Update appointment status if payment successful
      if (status === 'completed' && appointmentId) {
        try {
          const appointment = await this.appointmentModel.findById(appointmentId);
          
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
              
              this.logger.log('Appointment confirmed after payment:', {
                appointmentId,
                previousStatus: appointment.status,
                newStatus: 'confirmed'
              });
              
              // TODO: Send notification to patient & doctor
            } else {
              this.logger.warn('Appointment status not eligible for confirmation:', {
                appointmentId,
                currentStatus: appointment.status
              });
            }
          }
        } catch (error) {
          this.logger.error('Failed to update appointment:', error);
          // Don't fail the callback if appointment update fails
        }
      } else if (status === 'failed' && appointmentId) {
        // If payment failed, mark appointment as cancelled
        try {
          const appointment = await this.appointmentModel.findById(appointmentId);
          
          if (appointment && appointment.status === 'pending_payment') {
            await this.appointmentModel.findByIdAndUpdate(appointmentId, {
              status: 'cancelled',
              cancellationReason: 'Thanh toán thất bại hoặc bị hủy',
              paymentStatus: 'unpaid',
            });
            
            this.logger.log('Appointment cancelled due to failed payment:', appointmentId);
          }
        } catch (error) {
          this.logger.error('Failed to cancel appointment after failed payment:', error);
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
   * Query payment status from MoMo
   */
  async queryMomoPayment(orderId: string) {
    try {
      const payment = await this.paymentModel.findOne({ 
        transactionId: orderId 
      });

      if (!payment) {
        throw new BadRequestException('Không tìm thấy thanh toán');
      }

      const requestId = `QUERY_${orderId}_${Date.now()}`;
      const momoResponse = await this.momoService.queryTransaction(orderId, requestId);

      return {
        success: true,
        data: {
          payment,
          momoStatus: momoResponse,
        },
        message: 'Truy vấn trạng thái thanh toán thành công',
      };
    } catch (error) {
      this.logger.error('Query MoMo payment failed:', error);
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