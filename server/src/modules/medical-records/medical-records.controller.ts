import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { MedicalRecordsService } from './medical-records.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';
import { JwtAuthGuard } from 'src/auth/passport/jwt-auth.guard';
import { Public, ResponseMessage } from 'src/decorator/customize';

@Controller('medical-records')
@UseGuards(JwtAuthGuard)
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
  @ResponseMessage('Cập nhật hồ sơ bệnh án thành công')
  update(@Param('id') id: string, @Body() updateMedicalRecordDto: UpdateMedicalRecordDto) {
    return this.medicalRecordsService.update(id, updateMedicalRecordDto);
  }

  @Delete(':id')
  @ResponseMessage('Xóa hồ sơ bệnh án thành công')
  remove(@Param('id') id: string) {
    return this.medicalRecordsService.remove(id);
  }

  @Get('patient/:patientId')
  @Public()
  @ResponseMessage('Lấy danh sách hồ sơ bệnh án của bệnh nhân thành công')
  findByPatient(@Param('patientId') patientId: string, @Query() query: any) {
    return this.medicalRecordsService.findByPatient(patientId, query);
  }

  @Get('doctor/:doctorId')
  @Public()
  @ResponseMessage('Lấy danh sách hồ sơ bệnh án của bác sĩ thành công')
  findByDoctor(@Param('doctorId') doctorId: string, @Query() query: any) {
    return this.medicalRecordsService.findByDoctor(doctorId, query);
  }

  @Post(':id/procedures')
  @ResponseMessage('Thêm thủ thuật vào hồ sơ bệnh án thành công')
  addProcedure(@Param('id') id: string, @Body() procedure: any) {
    return this.medicalRecordsService.addProcedure(id, procedure);
  }

  @Patch(':id/dental-chart')
  @ResponseMessage('Cập nhật sơ đồ răng thành công')
  updateDentalChart(@Param('id') id: string, @Body() dentalChartItem: any) {
    return this.medicalRecordsService.updateDentalChart(id, dentalChartItem);
  }

  @Patch(':id/follow-up')
  @ResponseMessage('Đặt lịch tái khám thành công')
  scheduleFollowUp(@Param('id') id: string, @Body('followUpDate') followUpDate: Date) {
    return this.medicalRecordsService.scheduleFollowUp(id, followUpDate);
  }
}