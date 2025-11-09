import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsModule } from '../payments/payments.module';
import { RevenueModule } from '../revenue/revenue.module';
import { User, UserSchema } from '../users/schemas/user.schemas';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schemas';
import {
  Appointment,
  AppointmentSchema,
} from '../appointments/schemas/appointment.schemas';
import {
  WalletTransaction,
  WalletTransactionSchema,
} from './schemas/wallet-transaction.schema';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
    PaymentsModule,
    forwardRef(() => RevenueModule),
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
