import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Public } from 'src/decorator/customize';
import { JwtAuthGuard } from '../../auth/passport/jwt-auth.guard';
import { CreateWalletTransactionDto } from './dto/create-wallet-transaction.dto';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  // GET /api/v1/wallet/balance
  @Get('balance')
  @UseGuards(JwtAuthGuard)
  async getBalance(@Request() req: any) {
    const userId = req.user?.userId || req.user?._id;
    return this.walletService.getWalletBalance(userId);
  }

  // POST /api/v1/wallet/topup
  @Post('topup')
  @UseGuards(JwtAuthGuard)
  async topUp(
    @Request() req: any,
    @Body() createWalletTransactionDto: CreateWalletTransactionDto,
  ) {
    const userId = req.user?.userId || req.user?._id;
    return this.walletService.topUpWallet(userId, createWalletTransactionDto);
  }

  // GET /api/v1/wallet/history
  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getHistory(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user?.userId || req.user?._id;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.walletService.getTransactionHistory(userId, pageNum, limitNum);
  }

  // GET /api/v1/wallet/stats
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@Request() req: any) {
    const userId = req.user?.userId || req.user?._id;
    return this.walletService.getWalletStats(userId);
  }

  // POST /api/v1/wallet/pay-appointment - Pay for appointment using wallet
  @Post('pay-appointment')
  @UseGuards(JwtAuthGuard)
  async payForAppointment(
    @Request() req: any,
    @Body() body: { appointmentId: string; amount: number },
  ) {
    console.log(
      '🎯 ========== WALLET CONTROLLER: PAY-APPOINTMENT ENDPOINT HIT ==========',
    );
    console.log('   - Request user:', req.user);
    console.log('   - Body:', body);
    console.log('   - appointmentId:', body.appointmentId);
    console.log('   - amount:', body.amount);

    const userId = req.user?.userId || req.user?._id;
    console.log('   - Resolved userId:', userId);

    const result = await this.walletService.payForAppointment(
      userId,
      body.appointmentId,
      body.amount,
    );

    console.log(
      '   - Payment result:',
      result.success ? '✅ SUCCESS' : '❌ FAILED',
    );
    return result;
  }

  // POST /api/v1/wallet/pay-bill - Pay existing pending bill using wallet
  @Post('pay-bill')
  @UseGuards(JwtAuthGuard)
  async payBill(@Request() req: any, @Body() body: { billId: string }) {
    const userId = req.user?.userId || req.user?._id;
    return this.walletService.payPendingBill(userId, body.billId);
  }

  // POST /api/v1/wallet/momo/callback - Public endpoint cho MoMo callback
  @Post('momo/callback')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleMomoCallback(@Body() callbackData: any) {
    const logger = this.walletService['logger'];
    logger.log('🔔 ========== CALLBACK REACHED CONTROLLER ==========');
    logger.log('📦 Raw body:', JSON.stringify(callbackData, null, 2));

    const result = await this.walletService.handleMomoCallback(callbackData);
    logger.log('✅ Callback processed result:', result);

    return result;
  }

  // GET /api/v1/wallet/momo/query/:orderId - Query MoMo wallet payment status
  @Get('momo/query/:orderId')
  @Public()
  async queryMomoWalletPayment(@Param('orderId') orderId: string) {
    return this.walletService.queryMomoWalletPayment(orderId);
  }

  // TEST: GET endpoint để test callback URL
  @Get('test')
  @Public()
  test() {
    return { message: 'Wallet endpoint is working', timestamp: new Date() };
  }

  // TEST: Manual simulate callback để test logic
  @Post('test-callback')
  @Public()
  @HttpCode(HttpStatus.OK)
  async testCallback(
    @Body() body: { userId: string; amount: number; orderId?: string },
  ) {
    const logger = this.walletService['logger'];
    logger.log('🧪 ========== TEST CALLBACK ==========');

    // Simulate MoMo callback data
    const testCallbackData = {
      partnerCode: 'MOMO',
      orderId: body.orderId || `TEST_${Date.now()}`,
      requestId: `REQ_${Date.now()}`,
      amount: body.amount,
      orderInfo: 'Test nạp tiền',
      orderType: 'wallet_topup',
      transId: 123456789,
      resultCode: 0,
      message: 'Test success',
      payType: 'qr',
      responseTime: Date.now(),
      extraData: JSON.stringify({
        userId: body.userId,
        amount: body.amount,
        paymentMethod: 'momo',
        description: 'Test nạp tiền',
        type: 'wallet_topup',
      }),
      signature: 'test_signature',
    };

    logger.log('🧪 Test callback data:', testCallbackData);

    const result =
      await this.walletService.handleMomoCallback(testCallbackData);
    return result;
  }
}
