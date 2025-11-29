import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  DoctorProfile,
  DoctorProfileSchema,
} from './schemas/doctor-profile.schema';
import { DoctorProfileService } from './doctor-profile.service';
import { DoctorProfileController } from './doctor-profile.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DoctorProfile.name, schema: DoctorProfileSchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [DoctorProfileController],
  providers: [DoctorProfileService],
  exports: [DoctorProfileService],
})
export class DoctorProfileModule {}
