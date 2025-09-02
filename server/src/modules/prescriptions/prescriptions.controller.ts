import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Request,
} from '@nestjs/common';
import { Public } from '../../decorator/customize';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { PrescriptionsService } from './prescriptions.service';

@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post()
  @Public()
  create(@Body() createPrescriptionDto: CreatePrescriptionDto) {
    return this.prescriptionsService.create(createPrescriptionDto);
  }

  @Get()
  @Public()
  findAll(@Query() query: any) {
    return this.prescriptionsService.findAll(query);
  }

  @Get('stats')
  @Public()
  getStats(@Query('doctorId') doctorId?: string) {
    return this.prescriptionsService.getPrescriptionStats(doctorId);
  }

  @Get('my-prescriptions')
  @Public()
  findMyPrescriptions(@Request() req, @Query() query: any) {
    // Khi public, có thể truyền doctorId qua query params
    let doctorId = req.user?.id || query.doctorId;
    if (typeof doctorId === 'string' && (!doctorId || doctorId === 'null')) {
      doctorId = undefined;
    }
    return this.prescriptionsService.findByDoctor(doctorId, query);
  }

  @Get('patient-prescriptions')
  @Public()
  findPatientPrescriptions(@Request() req, @Query() query: any) {
    // Khi public, có thể truyền patientId qua query params
    let patientId = req.user?.id || query.patientId;
    // normalize 'null' or empty strings
    if (typeof patientId === 'string' && (!patientId || patientId === 'null')) {
      patientId = undefined;
    }
    return this.prescriptionsService.findByPatient(patientId, query);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.prescriptionsService.findOne(id);
  }

  @Patch(':id')
  @Public()
  update(@Param('id') id: string, @Body() updatePrescriptionDto: UpdatePrescriptionDto) {
    return this.prescriptionsService.update(id, updatePrescriptionDto);
  }

  @Patch(':id/dispense')
  @Public()
  markAsDispensed(@Param('id') id: string, @Request() req, @Body() body: any) {
    // Khi public, có thể truyền dispensedBy qua body hoặc từ user
    const dispensedBy = req.user?.id || body.dispensedBy;
    return this.prescriptionsService.markAsDispensed(id, dispensedBy);
  }

  @Delete(':id')
  @Public()
  remove(@Param('id') id: string) {
    return this.prescriptionsService.remove(id);
  }

  @Get('patient/:patientId/history')
  @Public()
  getPatientPrescriptionHistory(@Param('patientId') patientId: string, @Query() query: any) {
    return this.prescriptionsService.getPatientPrescriptionHistory(patientId, query);
  }

  @Get('patient/:patientId/recent')
  @Public()
  getPatientRecentPrescriptions(@Param('patientId') patientId: string, @Query('limit') limit?: string) {
    return this.prescriptionsService.getPatientRecentPrescriptions(patientId, limit ? +limit : 5);
  }
}
