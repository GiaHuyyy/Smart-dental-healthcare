import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { Public, ResponseMessage } from 'src/decorator/customize';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';
import { MedicalRecordsService } from './medical-records.service';

@Controller('medical-records')
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Post()
  @Public()
  @ResponseMessage('Tạo hồ sơ bệnh án thành công')
  create(@Body() createMedicalRecordDto: CreateMedicalRecordDto) {
    return this.medicalRecordsService.create(createMedicalRecordDto);
  }

  @Get()
  @Public()
  @ResponseMessage('Lấy danh sách hồ sơ bệnh án thành công')
  findAll(@Query() query: any) {
    return this.medicalRecordsService.findAll(query);
  }

  @Get(':id')
  @Public()
  @ResponseMessage('Lấy thông tin hồ sơ bệnh án thành công')
  findOne(@Param('id') id: string) {
    return this.medicalRecordsService.findOne(id);
  }

  @Patch(':id')
  @Public()
  @ResponseMessage('Cập nhật hồ sơ bệnh án thành công')
  update(@Param('id') id: string, @Body() updateMedicalRecordDto: UpdateMedicalRecordDto) {
    return this.medicalRecordsService.update(id, updateMedicalRecordDto);
  }

  @Put(':id')
  @Public()
  @ResponseMessage('Cập nhật hồ sơ bệnh án thành công')
  updatePut(@Param('id') id: string, @Body() updateMedicalRecordDto: UpdateMedicalRecordDto) {
    return this.medicalRecordsService.update(id, updateMedicalRecordDto);
  }

  @Delete(':id')
  @Public()
  @ResponseMessage('Xóa hồ sơ bệnh án thành công')
  remove(@Param('id') id: string) {
    return this.medicalRecordsService.remove(id);
  }

  @Get('patient/records')
  @Public()
  @ResponseMessage('Lấy danh sách hồ sơ bệnh án của bệnh nhân thành công')
  findByPatient(@Query() query: any) {
    const patientId = query.patientId;
    if (!patientId) {
      // Trả về tất cả hồ sơ nếu không có patientId
      return this.medicalRecordsService.findAll(query);
    }
    return this.medicalRecordsService.findByPatient(patientId, query);
  }

  @Get('doctor/records')
  @Public()
  @ResponseMessage('Lấy danh sách hồ sơ bệnh án của bác sĩ thành công')
  findByDoctor(@Query() query: any) {
    const doctorId = query.doctorId;
    if (!doctorId) {
      // Trả về tất cả hồ sơ nếu không có doctorId
      return this.medicalRecordsService.findAll(query);
    }
    return this.medicalRecordsService.findByDoctor(doctorId, query);
  }

  @Post(':id/procedures')
  @Public()
  @ResponseMessage('Thêm thủ thuật vào hồ sơ bệnh án thành công')
  addProcedure(@Param('id') id: string, @Body() procedure: any) {
    return this.medicalRecordsService.addProcedure(id, procedure);
  }

  @Patch(':id/dental-chart')
  @Public()
  @ResponseMessage('Cập nhật sơ đồ răng thành công')
  updateDentalChart(@Param('id') id: string, @Body() dentalChartItem: any) {
    return this.medicalRecordsService.updateDentalChart(id, dentalChartItem);
  }

  @Patch(':id/follow-up')
  @Public()
  @ResponseMessage('Đặt lịch tái khám thành công')
  scheduleFollowUp(@Param('id') id: string, @Body('followUpDate') followUpDate: Date) {
    return this.medicalRecordsService.scheduleFollowUp(id, followUpDate);
  }

  @Post(':id/attachments')
  @Public()
  @ResponseMessage('Thêm tệp đính kèm thành công')
  addAttachment(@Param('id') id: string, @Body() attachment: any) {
    return this.medicalRecordsService.addAttachment(id, attachment);
  }

  @Delete(':id/attachments/:attachmentId')
  @Public()
  @ResponseMessage('Xóa tệp đính kèm thành công')
  removeAttachment(@Param('id') id: string, @Param('attachmentId') attachmentId: string) {
    return this.medicalRecordsService.removeAttachment(id, attachmentId);
  }

  @Get('search/records')
  @Public()
  @ResponseMessage('Tìm kiếm hồ sơ bệnh án thành công')
  searchMedicalRecords(@Query() query: any) {
    return this.medicalRecordsService.searchMedicalRecords(query);
  }

  @Get('statistics/doctor')
  @Public()
  @ResponseMessage('Lấy thống kê hồ sơ bệnh án của bác sĩ thành công')
  getDoctorStatistics(@Query() query: any) {
    const doctorId = query.doctorId;
    if (!doctorId) {
      // Trả về thống kê tổng quát nếu không có doctorId
      return this.medicalRecordsService.getDoctorStatistics('general', query);
    }
    return this.medicalRecordsService.getDoctorStatistics(doctorId, query);
  }

  @Get('statistics/patient')
  @Public()
  @ResponseMessage('Lấy thống kê hồ sơ bệnh án của bệnh nhân thành công')
  getPatientStatistics(@Query() query: any) {
    const patientId = query.patientId;
    if (!patientId) {
      // Trả về thống kê tổng quát nếu không có patientId
      return this.medicalRecordsService.getPatientStatistics('general');
    }
    return this.medicalRecordsService.getPatientStatistics(patientId);
  }

  @Post(':id/export')
  @Public()
  @ResponseMessage('Xuất hồ sơ bệnh án thành công')
  exportMedicalRecord(@Param('id') id: string, @Body() exportOptions: any) {
    return this.medicalRecordsService.exportMedicalRecord(id, exportOptions);
  }

  // Thêm endpoint để lấy hồ sơ theo appointment
  @Get('appointment/:appointmentId')
  @Public()
  @ResponseMessage('Lấy hồ sơ bệnh án theo lịch hẹn thành công')
  findByAppointment(@Param('appointmentId') appointmentId: string) {
    return this.medicalRecordsService.findByAppointment(appointmentId);
  }

  // Thêm endpoint để lấy hồ sơ cần tái khám
  @Get('follow-up/required')
  @Public()
  @ResponseMessage('Lấy danh sách hồ sơ cần tái khám thành công')
  getFollowUpRecords(@Query() query: any) {
    return this.medicalRecordsService.getFollowUpRecords(query);
  }
}