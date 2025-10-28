import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { VouchersService } from './vouchers.service';
import { JwtAuthGuard } from '../../auth/passport/jwt-auth.guard';

@Controller('vouchers')
@UseGuards(JwtAuthGuard)
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get('my-vouchers')
  async getMyVouchers(@Request() req: any) {
    const vouchers = await this.vouchersService.getPatientVouchers(
      req.user._id,
    );
    return {
      success: true,
      data: vouchers,
      message: 'Lấy danh sách voucher thành công',
    };
  }

  @Post('apply')
  async applyVoucher(
    @Request() req: any,
    @Body('voucherCode') voucherCode: string,
    @Body('amount') amount: number,
  ) {
    try {
      const result = await this.vouchersService.applyVoucher(
        voucherCode,
        req.user._id,
        amount,
      );
      return {
        success: true,
        data: result,
        message: 'Áp dụng voucher thành công',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể áp dụng voucher',
      };
    }
  }
}
