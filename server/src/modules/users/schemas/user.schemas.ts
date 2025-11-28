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

  // Avatar URL from Cloudinary
  @Prop()
  avatarUrl: string;

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

  // License certificate image URL from Cloudinary
  @Prop()
  licenseImageUrl: string;

  @Prop()
  experienceYears: number;

  // Qualifications/Degrees (e.g., "Bác sĩ Y khoa, Thạc sĩ Nha khoa")
  @Prop()
  qualifications: string;

  // Professional services offered (comma-separated or array)
  @Prop({ type: [String], default: [] })
  services: string[];

  // Work address (different from personal address)
  @Prop()
  workAddress: string;

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
