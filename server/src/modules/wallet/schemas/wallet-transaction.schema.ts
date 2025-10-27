import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WalletTransactionDocument = HydratedDocument<WalletTransaction>;

@Schema({ timestamps: true })
export class WalletTransaction {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, enum: ['topup', 'withdrawal', 'payment', 'refund'] })
  type: string;

  @Prop({ required: true, enum: ['pending', 'completed', 'failed', 'cancelled'] })
  status: string;

  @Prop()
  paymentMethod: string;

  @Prop()
  transactionId: string;

  @Prop()
  description: string;

  @Prop()
  notes: string;
}

export const WalletTransactionSchema = SchemaFactory.createForClass(WalletTransaction);

