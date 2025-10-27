import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  phone: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  dateOfBirth: Date;

  @Prop()
  gender: string;

  @Prop()
  address: string;

  @Prop()
  latitude: number;

  @Prop()
  longitude: number;

  @Prop()
  avatar: string;

  @Prop({ required: true })
  role: string; // e.g., 'patient', 'doctor', 'admin'

  @Prop({ default: 'LOCAL' })
  accountType: string; // e.g., 'personal', 'business'

  @Prop({ default: false })
  isActive: boolean;

  @Prop()
  codeId: string;

  @Prop()
  codeExpired: Date;

  @Prop()
  codeIdPassword: string;

  @Prop()
  codeExpiredPassword: Date;

  @Prop()
  specialty: string;

  @Prop()
  licenseNumber: string;

  @Prop()
  experienceYears: number;

  @Prop()
  rating: number;

  @Prop()
  consultationFee: number;

  @Prop()
  specialization: string;

  @Prop({ default: true })
  agreeTerms: boolean;

  @Prop({ default: 0 })
  walletBalance: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
