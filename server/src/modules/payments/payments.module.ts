import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Appointment,
  AppointmentSchema,
} from '../appointments/schemas/appointment.schemas';
import { User, UserSchema } from '../users/schemas/user.schemas';
import { Revenue, RevenueSchema } from '../revenue/schemas/revenue.schemas';
import { NotificationsModule } from '../notifications/notifications.module';
import { RevenueModule } from '../revenue/revenue.module';
import { VouchersModule } from '../vouchers/vouchers.module';
import { MailModule } from '../../mail/mail.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment, PaymentSchema } from './schemas/payment.schemas';
import { MoMoService } from './services/momo.service';
import { BillingHelperService } from './billing-helper.service';
import { PaymentGateway } from './payment.gateway';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Appointment.name, schema: AppointmentSchema },
      { name: User.name, schema: UserSchema },
      { name: Revenue.name, schema: RevenueSchema },
    ]),
    NotificationsModule,
    forwardRef(() => RevenueModule),
    VouchersModule,
    MailModule,
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    MoMoService,
    BillingHelperService,
    PaymentGateway,
  ],
  exports: [PaymentsService, MoMoService, BillingHelperService, PaymentGateway],
})
export class PaymentsModule {}
