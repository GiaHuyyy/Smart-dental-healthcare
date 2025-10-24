import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { Public } from 'src/decorator/customize';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentsService } from './payments.service';
import { MoMoCallbackData } from './services/momo.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Public()
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

  /**
   * Tạo thanh toán MoMo cho appointment
   * POST /api/v1/payments/momo/create
   */
  @Post('momo/create')
  @Public()
  createMomoPayment(
    @Body()
    body: {
      appointmentId: string;
      patientId: string;
      doctorId: string;
      amount: number;
      orderInfo?: string;
    },
  ) {
    return this.paymentsService.createMomoPayment(body);
  }

  /**
   * Tạo thanh toán MoMo từ payment đã tồn tại (dùng cho trang payments)
   * POST /api/v1/payments/momo/create-from-payment/:paymentId
   */
  @Post('momo/create-from-payment/:paymentId')
  @Public()
  createMomoPaymentFromExisting(@Param('paymentId') paymentId: string) {
    return this.paymentsService.createMomoPaymentFromExisting(paymentId);
  }

  /**
   * Callback từ MoMo (IPN - Instant Payment Notification)
   * POST /api/v1/payments/momo/callback
   */
  @Post('momo/callback')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleMomoCallback(@Body() callbackData: MoMoCallbackData) {
    const result = await this.paymentsService.handleMomoCallback(callbackData);
    // MoMo expects 204 No Content for successful callback
    return result;
  }

  /**
   * Test endpoint để tạo revenue thủ công (chỉ để debug)
   * POST /api/v1/payments/test-revenue/:paymentId
   */
  @Post('test-revenue/:paymentId')
  @HttpCode(HttpStatus.OK)
  async testCreateRevenue(@Param('paymentId') paymentId: string) {
    return await this.paymentsService.testCreateRevenue(paymentId);
  }

  /**
   * Endpoint để kiểm tra và tạo revenue cho payment đã completed
   * POST /api/v1/payments/ensure-revenue/:paymentId
   */
  @Post('ensure-revenue/:paymentId')
  @Public()
  @HttpCode(HttpStatus.OK)
  async ensureRevenue(@Param('paymentId') paymentId: string) {
    return await this.paymentsService.ensureRevenueForPayment(paymentId);
  }

  /**
   * DEVELOPMENT ONLY: Simulate callback để test locally
   * POST /api/v1/payments/simulate-callback/:orderId
   */
  @Post('simulate-callback/:orderId')
  @Public()
  @HttpCode(HttpStatus.OK)
  async simulateCallback(
    @Param('orderId') orderId: string,
    @Body() body?: { resultCode?: number }
  ) {
    return await this.paymentsService.simulateMoMoCallback(orderId, body?.resultCode || 0);
  }

  /**
   * Query payment status từ MoMo
   * GET /api/v1/payments/momo/query/:orderId
   */
  @Get('momo/query/:orderId')
  @Public()
  queryMomoPayment(@Param('orderId') orderId: string) {
    return this.paymentsService.queryMomoPayment(orderId);
  }

  @Get()
  @Public()
  findAll(
    @Query() query: string,
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
  ) {
    return this.paymentsService.findAll(query, +current, +pageSize);
  }

  @Get('patient/:patientId')
  @Public()
  findByPatient(@Param('patientId') patientId: string) {
    return this.paymentsService.findByPatient(patientId);
  }

  @Get('doctor/:doctorId')
  @Public()
  findByDoctor(@Param('doctorId') doctorId: string) {
    return this.paymentsService.findByDoctor(doctorId);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Patch(':id')
  @Public()
  update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentsService.update(id, updatePaymentDto);
  }

  @Delete(':id')
  @Public()
  remove(@Param('id') id: string) {
    return this.paymentsService.remove(id);
  }
}
