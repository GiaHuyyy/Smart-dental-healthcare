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
  specialty: string;

  @Prop()
  licenseNumber: string;

  @Prop({ default: true })
  agreeTerms: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
