import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { AIFeedbackService } from './ai-feedback.service';
import {
  CreateAIFeedbackDto,
  UpdateAIFeedbackDto,
  QueryAIFeedbackDto,
} from './dto/ai-feedback.dto';
import { JwtAuthGuard } from '../../auth/passport/jwt-auth.guard';
import { Public } from 'src/decorator/customize';

@Controller('ai-feedback')
@UseGuards(JwtAuthGuard)
export class AIFeedbackController {
  constructor(private readonly aiFeedbackService: AIFeedbackService) {}

  /**
   * Tạo đánh giá mới (chỉ bác sĩ)
   */
  @Post()
  async create(@Request() req: any, @Body() dto: CreateAIFeedbackDto) {
    // Kiểm tra role doctor
    if (req.user.role !== 'doctor') {
      throw new ForbiddenException('Chỉ bác sĩ mới có thể đánh giá AI');
    }
    const doctorId = String(req.user._id || req.user.id);
    const doctorInfo = {
      specialty: req.user.specialty as string,
      experience: req.user.yearsOfExperience as number,
    };
    return await this.aiFeedbackService.create(doctorId, dto, doctorInfo);
  }

  /**
   * Cập nhật đánh giá (chỉ bác sĩ đã tạo)
   */
  @Put(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateAIFeedbackDto,
  ) {
    // Kiểm tra role doctor
    if (req.user.role !== 'doctor') {
      throw new ForbiddenException('Chỉ bác sĩ mới có thể cập nhật đánh giá');
    }
    const doctorId = String(req.user._id || req.user.id);
    return await this.aiFeedbackService.update(id, doctorId, dto);
  }

  /**
   * Kiểm tra xem appointment đã có feedback chưa (public)
   */
  @Public()
  @Get('appointment/:appointmentId/exists')
  async checkFeedbackExists(@Param('appointmentId') appointmentId: string) {
    const exists = await this.aiFeedbackService.checkExists(appointmentId);
    return { exists };
  }

  /**
   * Lấy đánh giá theo appointmentId
   */
  @Get('appointment/:appointmentId')
  async findByAppointmentId(@Param('appointmentId') appointmentId: string) {
    return await this.aiFeedbackService.findByAppointmentId(appointmentId);
  }

  /**
   * Lấy danh sách đánh giá (admin/doctor)
   */
  @Get()
  async findAll(@Request() req: any, @Query() query: QueryAIFeedbackDto) {
    // Kiểm tra role admin hoặc doctor
    if (!['admin', 'doctor'].includes(String(req.user.role))) {
      throw new ForbiddenException(
        'Chỉ admin hoặc bác sĩ mới có thể xem danh sách đánh giá',
      );
    }
    return await this.aiFeedbackService.findAll(query);
  }

  /**
   * Lấy thống kê (admin)
   */
  @Get('statistics')
  async getStatistics(@Request() req: any) {
    // Kiểm tra role admin
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Chỉ admin mới có thể xem thống kê');
    }
    return await this.aiFeedbackService.getStatistics();
  }

  /**
   * Lấy dữ liệu để export cho training (admin)
   */
  @Get('training-data')
  async getTrainingData(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('priority') priority?: 'high' | 'medium' | 'low',
    @Query('includeUsed') includeUsed?: string,
  ) {
    // Kiểm tra role admin
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Chỉ admin mới có thể lấy dữ liệu training');
    }
    return await this.aiFeedbackService.getTrainingData({
      limit: limit ? parseInt(limit) : undefined,
      priority,
      includeUsed: includeUsed === 'true',
    });
  }

  /**
   * Đánh dấu đã sử dụng cho training (admin)
   */
  @Post('mark-trained')
  async markAsUsedForTraining(
    @Request() req: any,
    @Body('feedbackIds') feedbackIds: string[],
  ) {
    // Kiểm tra role admin
    if (req.user.role !== 'admin') {
      throw new ForbiddenException(
        'Chỉ admin mới có thể đánh dấu dữ liệu training',
      );
    }
    return await this.aiFeedbackService.markAsUsedForTraining(feedbackIds);
  }

  /**
   * Xóa đánh giá (admin)
   */
  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    // Kiểm tra role admin
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Chỉ admin mới có thể xóa đánh giá');
    }
    await this.aiFeedbackService.delete(id);
    return { success: true, message: 'Đã xóa đánh giá' };
  }
}
