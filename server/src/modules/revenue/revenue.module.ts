import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schemas';
import { RevenueController } from './revenue.controller';
import { RevenueGateway } from './revenue.gateway';
import { RevenueService } from './revenue.service';
import { Revenue, RevenueSchema } from './schemas/revenue.schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Revenue.name, schema: RevenueSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
  ],
  controllers: [RevenueController],
  providers: [RevenueService, RevenueGateway],
  exports: [RevenueService, RevenueGateway],
})
export class RevenueModule {}
