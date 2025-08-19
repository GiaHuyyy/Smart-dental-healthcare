import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Public } from 'src/decorator/customize';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Public()
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

  @Get()
  @Public()
  findAll(
    @Query() query: string,
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
  ) {
    return this.paymentsService.findAll(query, +current, +pageSize);
  }

  @Get('patient/:patientId')
  @Public()
  findByPatient(@Param('patientId') patientId: string) {
    return this.paymentsService.findByPatient(patientId);
  }

  @Get('doctor/:doctorId')
  @Public()
  findByDoctor(@Param('doctorId') doctorId: string) {
    return this.paymentsService.findByDoctor(doctorId);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Patch(':id')
  @Public()
  update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentsService.update(id, updatePaymentDto);
  }

  @Delete(':id')
  @Public()
  remove(@Param('id') id: string) {
    return this.paymentsService.remove(id);
  }
}