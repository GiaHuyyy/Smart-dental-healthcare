import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Appointment, AppointmentSchema } from '../appointments/schemas/appointment.schemas';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment, PaymentSchema } from './schemas/payment.schemas';
import { MoMoService } from './services/momo.service';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, MoMoService],
  exports: [PaymentsService, MoMoService],
})
export class PaymentsModule {}