import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Appointment,
  AppointmentSchema,
} from '../appointments/schemas/appointment.schemas';
import { User, UserSchema } from '../users/schemas/user.schemas';
import { NotificationsModule } from '../notifications/notifications.module';
import { RevenueModule } from '../revenue/revenue.module';
import { VouchersModule } from '../vouchers/vouchers.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment, PaymentSchema } from './schemas/payment.schemas';
import { MoMoService } from './services/momo.service';
import { BillingHelperService } from './billing-helper.service';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Appointment.name, schema: AppointmentSchema },
      { name: User.name, schema: UserSchema },
    ]),
    NotificationsModule,
    forwardRef(() => RevenueModule),
    VouchersModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, MoMoService, BillingHelperService],
  exports: [PaymentsService, MoMoService, BillingHelperService],
})
export class PaymentsModule {}
