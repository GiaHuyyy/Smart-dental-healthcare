import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Appointment, AppointmentSchema } from '../appointments/schemas/appointment.schemas';
import { NotificationsModule } from '../notifications/notifications.module';
import { RevenueModule } from '../revenue/revenue.module';
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
    NotificationsModule,
    forwardRef(() => RevenueModule),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, MoMoService],
  exports: [PaymentsService, MoMoService],
})
export class PaymentsModule {}