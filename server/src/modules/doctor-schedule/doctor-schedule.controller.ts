import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { DoctorScheduleService } from './doctor-schedule.service';
import { UpdateDoctorScheduleDto } from './dto/update-doctor-schedule.dto';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { Public } from 'src/decorator/public.decorator';
import { ResponseMessage } from 'src/decorator/customize';

@Controller('doctor-schedule')
export class DoctorScheduleController {
  constructor(private readonly doctorScheduleService: DoctorScheduleService) {}

  /**
   * Get doctor's working schedule
   * GET /api/v1/doctor-schedule/:doctorId
   */
  @Get(':doctorId')
  @Public()
  @ResponseMessage('Lấy lịch làm việc của bác sĩ thành công')
  async getSchedule(@Param('doctorId') doctorId: string) {
    return this.doctorScheduleService.getSchedule(doctorId);
  }

  /**
   * Update doctor's working schedule (authenticated doctor only)
   * PUT /api/v1/doctor-schedule
   */
  @Put()
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Cập nhật lịch làm việc thành công')
  async updateSchedule(
    @Request() req: { user: { _id: string } },
    @Body() updateDto: UpdateDoctorScheduleDto,
  ) {
    const doctorId = req.user._id;
    return this.doctorScheduleService.updateSchedule(doctorId, updateDto);
  }

  /**
   * Remove a specific blocked time
   * DELETE /api/v1/doctor-schedule/blocked-time/:blockedTimeId
   */
  @Delete('blocked-time/:blockedTimeId')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Xóa lịch nghỉ thành công')
  async removeBlockedTime(
    @Request() req: { user: { _id: string } },
    @Param('blockedTimeId') blockedTimeId: string,
  ) {
    const doctorId = req.user._id;
    return this.doctorScheduleService.removeBlockedTime(
      doctorId,
      blockedTimeId,
    );
  }

  /**
   * Get available slots for a specific date
   * GET /api/v1/doctor-schedule/:doctorId/available-slots?date=2025-11-27
   */
  @Get(':doctorId/available-slots')
  @Public()
  @ResponseMessage('Lấy danh sách khung giờ trống thành công')
  async getAvailableSlots(
    @Param('doctorId') doctorId: string,
    @Query('date') date: string,
  ) {
    return this.doctorScheduleService.getAvailableSlots(doctorId, date);
  }
}
