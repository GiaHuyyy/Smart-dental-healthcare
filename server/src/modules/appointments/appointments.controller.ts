import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Public, ResponseMessage } from 'src/decorator/customize';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

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

  @Get(':id')
  @Public()
  @ResponseMessage('Lấy thông tin lịch hẹn thành công')
  findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Patch(':id')
  @Public()
  @ResponseMessage('Cập nhật lịch hẹn thành công')
  update(@Param('id') id: string, @Body() updateAppointmentDto: UpdateAppointmentDto) {
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
  reschedule(@Param('id') id: string, @Body('appointmentDate') appointmentDate: Date, @Body('appointmentTime') appointmentTime: string) {
    return this.appointmentsService.reschedule(id, appointmentDate, appointmentTime);
  }

  @Delete(':id/cancel')
  @Public()
  @ResponseMessage('Hủy lịch hẹn thành công')
  cancel(@Param('id') id: string, @Body('reason') reason: string) {
    return this.appointmentsService.cancel(id, reason);
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
  getPatientAppointmentHistory(@Param('patientId') patientId: string, @Query() query: any) {
    return this.appointmentsService.getPatientAppointmentHistory(patientId, query);
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
  findByWeek(@Param('startDate') startDate: string, @Param('endDate') endDate: string, @Query() query: any) {
    return this.appointmentsService.findByDateRange(startDate, endDate, query);
  }

  @Get('month/:year/:month')
  @ResponseMessage('Lấy danh sách lịch hẹn theo tháng thành công')
  findByMonth(@Param('year') year: string, @Param('month') month: string, @Query() query: any) {
    return this.appointmentsService.findByMonth(parseInt(year), parseInt(month), query);
  }

  @Get('upcoming/doctor/:doctorId')
  @ResponseMessage('Lấy danh sách lịch hẹn sắp tới của bác sĩ thành công')
  findUpcomingByDoctor(@Param('doctorId') doctorId: string, @Query() query: any) {
    return this.appointmentsService.findUpcomingByDoctor(doctorId, query);
  }

  @Get('upcoming/patient/:patientId')
  @ResponseMessage('Lấy danh sách lịch hẹn sắp tới của bệnh nhân thành công')
  findUpcomingByPatient(@Param('patientId') patientId: string, @Query() query: any) {
    return this.appointmentsService.findUpcomingByPatient(patientId, query);
  }

  @Get('history/doctor/:doctorId')
  @ResponseMessage('Lấy lịch sử lịch hẹn của bác sĩ thành công')
  findHistoryByDoctor(@Param('doctorId') doctorId: string, @Query() query: any) {
    return this.appointmentsService.findHistoryByDoctor(doctorId, query);
  }

  @Get('history/patient/:patientId')
  @ResponseMessage('Lấy lịch sử lịch hẹn của bệnh nhân thành công')
  findHistoryByPatient(@Param('patientId') patientId: string, @Query() query: any) {
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
}