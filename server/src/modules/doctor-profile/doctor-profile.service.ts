import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  DoctorProfile,
  DoctorProfileDocument,
} from './schemas/doctor-profile.schema';
import {
  CreateDoctorProfileDto,
  UpdateDoctorProfileDto,
} from './dto/doctor-profile.dto';

@Injectable()
export class DoctorProfileService {
  constructor(
    @InjectModel(DoctorProfile.name)
    private doctorProfileModel: Model<DoctorProfileDocument>,
  ) {}

  // Get doctor profile by doctor ID
  async getByDoctorId(doctorId: string): Promise<DoctorProfileDocument | null> {
    return this.doctorProfileModel
      .findOne({ doctorId: new Types.ObjectId(doctorId) })
      .exec();
  }

  // Create or update doctor profile (upsert)
  async upsert(
    doctorId: string,
    dto: CreateDoctorProfileDto | UpdateDoctorProfileDto,
  ): Promise<DoctorProfileDocument> {
    const existingProfile = await this.getByDoctorId(doctorId);

    if (existingProfile) {
      // Update existing profile
      const updated = await this.doctorProfileModel
        .findOneAndUpdate(
          { doctorId: new Types.ObjectId(doctorId) },
          { $set: dto },
          { new: true },
        )
        .exec();
      return updated!;
    } else {
      // Create new profile
      const newProfile = new this.doctorProfileModel({
        doctorId: new Types.ObjectId(doctorId),
        ...dto,
      });
      return newProfile.save();
    }
  }

  // Update only bio
  async updateBio(
    doctorId: string,
    bio: string,
  ): Promise<DoctorProfileDocument> {
    return this.upsert(doctorId, { bio });
  }

  // Update only working hours
  async updateWorkingHours(
    doctorId: string,
    workingHours: { day: string; time: string }[],
  ): Promise<DoctorProfileDocument> {
    return this.upsert(doctorId, { workingHours });
  }

  // Update clinic info
  async updateClinicInfo(
    doctorId: string,
    clinicName?: string,
    clinicDescription?: string,
  ): Promise<DoctorProfileDocument> {
    return this.upsert(doctorId, { clinicName, clinicDescription });
  }

  // Add clinic image
  async addClinicImage(
    doctorId: string,
    imageUrl: string,
    caption?: string,
  ): Promise<DoctorProfileDocument | null> {
    const profile = await this.getByDoctorId(doctorId);

    if (!profile) {
      // Create new profile with the image
      return this.upsert(doctorId, {
        clinicImages: [{ url: imageUrl, caption, order: 0 }],
      });
    }

    // Add to existing images
    const newOrder = profile.clinicImages?.length || 0;
    return this.doctorProfileModel
      .findOneAndUpdate(
        { doctorId: new Types.ObjectId(doctorId) },
        {
          $push: {
            clinicImages: { url: imageUrl, caption, order: newOrder },
          },
        },
        { new: true },
      )
      .exec();
  }

  // Remove clinic image
  async removeClinicImage(
    doctorId: string,
    imageUrl: string,
  ): Promise<DoctorProfileDocument | null> {
    return this.doctorProfileModel
      .findOneAndUpdate(
        { doctorId: new Types.ObjectId(doctorId) },
        {
          $pull: { clinicImages: { url: imageUrl } },
        },
        { new: true },
      )
      .exec();
  }

  // Update clinic images order
  async updateClinicImagesOrder(
    doctorId: string,
    images: { url: string; caption?: string; order: number }[],
  ): Promise<DoctorProfileDocument> {
    return this.upsert(doctorId, { clinicImages: images });
  }

  // Delete doctor profile
  async delete(doctorId: string): Promise<void> {
    await this.doctorProfileModel
      .deleteOne({ doctorId: new Types.ObjectId(doctorId) })
      .exec();
  }
}
