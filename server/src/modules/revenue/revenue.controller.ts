import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from 'src/decorator/customize';
import { CreateRevenueDto } from './dto/create-revenue.dto';
import { UpdateRevenueDto } from './dto/update-revenue.dto';
import { RevenueService } from './revenue.service';

@Controller('revenue')
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  /**
   * Tạo revenue từ payment ID
   * POST /api/v1/revenue/from-payment/:paymentId
   */
  @Post('from-payment/:paymentId')
  @Public()
  createFromPayment(@Param('paymentId') paymentId: string) {
    return this.revenueService.createRevenueFromPayment(paymentId);
  }

  /**
   * Lấy tổng quan doanh thu của bác sĩ
   * GET /api/v1/revenue/doctor/:doctorId/summary
   */
  @Get('doctor/:doctorId/summary')
  @Public()
  getDoctorRevenueSummary(
    @Param('doctorId') doctorId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.revenueService.getDoctorRevenueSummary(doctorId, start, end);
  }

  /**
   * Lấy danh sách doanh thu của bác sĩ (có phân trang)
   * GET /api/v1/revenue/doctor/:doctorId
   */
  @Get('doctor/:doctorId')
  @Public()
  getDoctorRevenues(
    @Param('doctorId') doctorId: string,
    @Query() query: string,
    @Query('current') current?: string,
    @Query('pageSize') pageSize?: string,
    @Query('patientId') patientId?: string,
  ) {
    return this.revenueService.getDoctorRevenues(
      doctorId,
      query,
      current ? +current : 1,
      pageSize ? +pageSize : 10,
      patientId,
    );
  }

  /**
   * Lấy doanh thu theo khoảng thời gian
   * GET /api/v1/revenue/doctor/:doctorId/range
   */
  @Get('doctor/:doctorId/range')
  @Public()
  getRevenueByDateRange(
    @Param('doctorId') doctorId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('status') status?: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate và endDate là bắt buộc');
    }

    return this.revenueService.getRevenueByDateRange(
      doctorId,
      new Date(startDate),
      new Date(endDate),
      status,
    );
  }

  /**
   * Standard CRUD endpoints
   */
  @Post()
  @Public()
  create(@Body() createRevenueDto: CreateRevenueDto) {
    return this.revenueService.create(createRevenueDto);
  }

  @Get()
  @Public()
  findAll(
    @Query() query: string,
    @Query('current') current?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.revenueService.findAll(
      query,
      current ? +current : 1,
      pageSize ? +pageSize : 10,
    );
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.revenueService.findOne(id);
  }

  @Patch(':id')
  @Public()
  update(@Param('id') id: string, @Body() updateRevenueDto: UpdateRevenueDto) {
    return this.revenueService.update(id, updateRevenueDto);
  }

  @Delete(':id')
  @Public()
  remove(@Param('id') id: string) {
    return this.revenueService.remove(id);
  }
}
