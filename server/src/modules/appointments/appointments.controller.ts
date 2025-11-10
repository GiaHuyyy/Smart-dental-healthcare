import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Public, ResponseMessage } from 'src/decorator/customize';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentReminderService } from './appointment-reminder.service';
import { RescheduleWithBillingDto } from './dto/reschedule-with-billing.dto';
import { CancelWithBillingDto } from './dto/cancel-with-billing.dto';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly reminderService: AppointmentReminderService,
  ) {}

  @Post()
  @Public()
  @ResponseMessage('Tạo lịch hẹn thành công')
  create(@Body() createAppointmentDto: CreateAppointmentDto) {
    return this.appointmentsService.create(createAppointmentDto);
  }

  @Get()
  @Public()
  @ResponseMessage('Lấy danh sách lịch hẹn thành công')
  findAll(@Query() query: any) {
    return this.appointmentsService.findAll(query);
  }

  @Get('doctor/:doctorId/available-slots')
  @Public()
  @ResponseMessage('Lấy danh sách khung giờ trống của bác sĩ thành công')
  getAvailableSlots(
    @Param('doctorId') doctorId: string,
    @Query('date') date: string,
    @Query('duration') duration?: string,
  ) {
    const durationMinutes = duration ? parseInt(duration) : 30;
    return this.appointmentsService.getAvailableSlots(
      doctorId,
      date,
      durationMinutes,
    );
  }

  @Get('available-slots/:doctorId')
  @Public()
  @ResponseMessage('Lấy danh sách khung giờ trống của bác sĩ thành công')
  getAvailableSlotsAlt(
    @Param('doctorId') doctorId: string,
    @Query('date') date: string,
    @Query('duration') duration?: string,
  ) {
    const durationMinutes = duration ? parseInt(duration) : 30;
    return this.appointmentsService.getAvailableSlots(
      doctorId,
      date,
      durationMinutes,
    );
  }

  @Get(':id')
  @Public()
  @ResponseMessage('Lấy thông tin lịch hẹn thành công')
  findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Patch(':id')
  @Public()
  @ResponseMessage('Cập nhật lịch hẹn thành công')
  update(
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(id, updateAppointmentDto);
  }

  @Delete(':id')
  @Public()
  @ResponseMessage('Xóa lịch hẹn thành công')
  remove(@Param('id') id: string) {
    return this.appointmentsService.remove(id);
  }

  @Get('patient/:patientId')
  @Public()
  @ResponseMessage('Lấy danh sách lịch hẹn của bệnh nhân thành công')
  findByPatient(@Param('patientId') patientId: string, @Query() query: any) {
    return this.appointmentsService.findByPatient(patientId, query);
  }

  @Get('doctor/:doctorId')
  @Public()
  @ResponseMessage('Lấy danh sách lịch hẹn của bác sĩ thành công')
  findByDoctor(@Param('doctorId') doctorId: string, @Query() query: any) {
    return this.appointmentsService.findByDoctor(doctorId, query);
  }

  @Patch(':id/status')
  @Public()
  @ResponseMessage('Cập nhật trạng thái lịch hẹn thành công')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.appointmentsService.updateStatus(id, status);
  }

  @Patch(':id/reschedule')
  @Public()
  @ResponseMessage('Đổi lịch hẹn thành công')
  reschedule(
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.rescheduleAppointment(
      id,
      updateAppointmentDto,
    );
  }

  @Delete(':id/cancel')
  @Public()
  @ResponseMessage('Hủy lịch hẹn thành công')
  cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Body('cancelledBy') cancelledBy?: 'doctor' | 'patient',
  ) {
    return this.appointmentsService.cancel(id, reason, cancelledBy);
  }

  @Post(':id/confirm')
  @Public()
  @ResponseMessage('Xác nhận lịch hẹn thành công')
  confirm(@Param('id') id: string) {
    return this.appointmentsService.confirm(id);
  }

  @Post(':id/complete')
  @Public()
  @ResponseMessage('Hoàn thành lịch hẹn thành công')
  complete(@Param('id') id: string) {
    return this.appointmentsService.complete(id);
  }

  @Get('date/:date')
  @Public()
  @ResponseMessage('Lấy danh sách lịch hẹn theo ngày thành công')
  findByDate(@Param('date') date: string, @Query() query: any) {
    return this.appointmentsService.findByDate(date, query);
  }

  @Get('patient/:patientId/history')
  @Public()
  @ResponseMessage('Lấy lịch sử lịch hẹn của bệnh nhân thành công')
  getPatientAppointmentHistory(
    @Param('patientId') patientId: string,
    @Query() query: any,
  ) {
    return this.appointmentsService.getPatientAppointmentHistory(
      patientId,
      query,
    );
  }

  @Get('patient/:patientId/upcoming')
  @Public()
  @ResponseMessage('Lấy lịch hẹn sắp tới của bệnh nhân thành công')
  getPatientUpcomingAppointments(@Param('patientId') patientId: string) {
    return this.appointmentsService.getPatientUpcomingAppointments(patientId);
  }

  @Get('week/:startDate/:endDate')
  @Public()
  @ResponseMessage('Lấy danh sách lịch hẹn theo tuần thành công')
  findByWeek(
    @Param('startDate') startDate: string,
    @Param('endDate') endDate: string,
    @Query() query: any,
  ) {
    return this.appointmentsService.findByDateRange(startDate, endDate, query);
  }

  @Get('month/:year/:month')
  @ResponseMessage('Lấy danh sách lịch hẹn theo tháng thành công')
  findByMonth(
    @Param('year') year: string,
    @Param('month') month: string,
    @Query() query: any,
  ) {
    return this.appointmentsService.findByMonth(
      parseInt(year),
      parseInt(month),
      query,
    );
  }

  @Get('upcoming/doctor/:doctorId')
  @ResponseMessage('Lấy danh sách lịch hẹn sắp tới của bác sĩ thành công')
  findUpcomingByDoctor(
    @Param('doctorId') doctorId: string,
    @Query() query: any,
  ) {
    return this.appointmentsService.findUpcomingByDoctor(doctorId, query);
  }

  @Get('upcoming/patient/:patientId')
  @ResponseMessage('Lấy danh sách lịch hẹn sắp tới của bệnh nhân thành công')
  findUpcomingByPatient(
    @Param('patientId') patientId: string,
    @Query() query: any,
  ) {
    return this.appointmentsService.findUpcomingByPatient(patientId, query);
  }

  @Get('history/doctor/:doctorId')
  @ResponseMessage('Lấy lịch sử lịch hẹn của bác sĩ thành công')
  findHistoryByDoctor(
    @Param('doctorId') doctorId: string,
    @Query() query: any,
  ) {
    return this.appointmentsService.findHistoryByDoctor(doctorId, query);
  }

  @Get('history/patient/:patientId')
  @ResponseMessage('Lấy lịch sử lịch hẹn của bệnh nhân thành công')
  findHistoryByPatient(
    @Param('patientId') patientId: string,
    @Query() query: any,
  ) {
    return this.appointmentsService.findHistoryByPatient(patientId, query);
  }

  @Get('followup/doctor/:doctorId')
  @Public()
  @ResponseMessage('Lấy lộ trình tái khám của bác sĩ thành công')
  getFollowUpByDoctor(@Param('doctorId') doctorId: string) {
    return this.appointmentsService.getFollowUpByDoctor(doctorId);
  }

  @Get('followup/patient/:patientId')
  @Public()
  @ResponseMessage('Lấy lộ trình tái khám của bệnh nhân thành công')
  getFollowUpByPatient(@Param('patientId') patientId: string) {
    return this.appointmentsService.getFollowUpByPatient(patientId);
  }

  @Post(':id/test-reminder')
  @Public()
  @ResponseMessage('Gửi reminder thử nghiệm thành công')
  testReminder(@Param('id') appointmentId: string) {
    return this.reminderService.testReminder(appointmentId);
  }

  // ============= NEW BILLING ENDPOINTS =============

  @Patch(':id/reschedule-with-billing')
  @Public()
  @ResponseMessage('Đổi lịch hẹn thành công')
  rescheduleWithBilling(
    @Param('id') id: string,
    @Body() dto: RescheduleWithBillingDto,
  ) {
    return this.appointmentsService.rescheduleAppointmentWithBilling(
      id,
      {
        appointmentDate: new Date(dto.appointmentDate),
        startTime: dto.startTime,
        endTime: dto.endTime,
        duration: dto.duration,
        notes: dto.notes,
      },
      dto.userId,
    );
  }

  @Delete(':id/cancel-with-billing')
  @Public()
  @ResponseMessage('Hủy lịch hẹn thành công')
  cancelWithBilling(
    @Param('id') id: string,
    @Body() dto: CancelWithBillingDto,
  ) {
    return this.appointmentsService.cancelAppointmentWithBilling(
      id,
      dto.reason,
      dto.cancelledBy,
      dto.doctorReason,
    );
  }

  @Post('follow-up/create-suggestion')
  @Public()
  @ResponseMessage('Tạo đề xuất tái khám thành công')
  async createFollowUpSuggestion(@Body() dto: CreateFollowUpDto) {
    console.log('🔔 [Controller] Creating follow-up suggestion:', {
      parentAppointmentId: dto.parentAppointmentId,
      notes: dto.notes || '(no notes)',
    });

    const result = await this.appointmentsService.createFollowUpSuggestion(
      dto.parentAppointmentId,
      dto.notes || '',
    );

    console.log('✅ [Controller] Follow-up suggestion created:', {
      suggestionId: result.suggestion._id,
      parentAppointmentId: result.suggestion.parentAppointmentId,
      voucherId: (result.voucher as any)._id,
    });

    return result;
  }

  @Get('follow-up/suggestions/:patientId')
  @Public()
  @ResponseMessage('Lấy danh sách đề xuất tái khám thành công')
  async getFollowUpSuggestions(@Param('patientId') patientId: string) {
    return this.appointmentsService.getFollowUpSuggestions(patientId);
  }

  @Post('follow-up/:id/reject')
  @Public()
  @ResponseMessage('Từ chối đề xuất tái khám thành công')
  rejectFollowUpSuggestion(@Param('id') suggestionId: string) {
    return this.appointmentsService.rejectFollowUpSuggestion(suggestionId);
  }

  @Post('follow-up/:id/mark-scheduled')
  @Public()
  @ResponseMessage('Đánh dấu đề xuất đã được đặt lịch')
  markFollowUpAsScheduled(
    @Param('id') suggestionId: string,
    @Body('appointmentId') appointmentId: string,
  ) {
    return this.appointmentsService.markFollowUpSuggestionAsScheduled(
      suggestionId,
      appointmentId,
    );
  }

  @Post(':id/confirm-follow-up')
  @Public()
  @ResponseMessage('Xác nhận lịch tái khám thành công')
  confirmFollowUp(
    @Param('id') appointmentId: string,
    @Body('finalDate') finalDate: string,
    @Body('finalTime') finalTime: string,
  ) {
    return this.appointmentsService.confirmFollowUpAppointment(
      appointmentId,
      new Date(finalDate),
      finalTime,
    );
  }

  @Post(':id/reject-follow-up')
  @Public()
  @ResponseMessage('Từ chối lịch tái khám thành công')
  rejectFollowUpOld(@Param('id') appointmentId: string) {
    return this.appointmentsService.rejectFollowUpAppointment(appointmentId);
  }
}
