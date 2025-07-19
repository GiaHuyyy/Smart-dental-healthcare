import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  // @Prop({ required: true })
  fullName: string;

  @Prop({ required: true, unique: true })
  email: string;

  // @Prop({ required: true })
  phone: string;

  // @Prop({ required: true })
  password: string;

  // @Prop({ required: true })
  dateOfBirth: Date;

  // @Prop({ required: true })
  gender: string;

  // @Prop({ required: true })
  address: string;

  @Prop()
  avatar: string;

  @Prop({ default: 'PATIENT' })
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
  specialty: string;

  @Prop()
  licenseNumber: string;

  @Prop({ default: false })
  agreeTerms: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
