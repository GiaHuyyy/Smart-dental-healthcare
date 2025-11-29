import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/passport/jwt-auth.guard';
import { DoctorProfileService } from './doctor-profile.service';
import { UpdateDoctorProfileDto } from './dto/doctor-profile.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('doctor-profile')
export class DoctorProfileController {
  constructor(
    private readonly doctorProfileService: DoctorProfileService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private getUserId(req: any): string {
    return String(req.user?.userId || req.user?._id || '');
  }

  // Get current doctor's profile
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyProfile(@Request() req: any) {
    const doctorId = this.getUserId(req);
    const profile = await this.doctorProfileService.getByDoctorId(doctorId);
    return { data: profile };
  }

  // Get doctor profile by ID (public)
  @Get(':doctorId')
  async getProfile(@Param('doctorId') doctorId: string) {
    const profile = await this.doctorProfileService.getByDoctorId(doctorId);
    return { data: profile };
  }

  // Update current doctor's profile
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMyProfile(
    @Request() req: any,
    @Body() updateDto: UpdateDoctorProfileDto,
  ) {
    const doctorId = this.getUserId(req);
    const profile = await this.doctorProfileService.upsert(doctorId, updateDto);
    return { data: profile, message: 'Cập nhật thành công' };
  }

  // Update only bio
  @UseGuards(JwtAuthGuard)
  @Patch('me/bio')
  async updateBio(@Request() req: any, @Body('bio') bio: string) {
    const doctorId = this.getUserId(req);
    const profile = await this.doctorProfileService.updateBio(doctorId, bio);
    return { data: profile, message: 'Cập nhật giới thiệu thành công' };
  }

  // Update only working hours
  @UseGuards(JwtAuthGuard)
  @Patch('me/working-hours')
  async updateWorkingHours(
    @Request() req: any,
    @Body('workingHours') workingHours: { day: string; time: string }[],
  ) {
    const doctorId = this.getUserId(req);
    const profile = await this.doctorProfileService.updateWorkingHours(
      doctorId,
      workingHours,
    );
    return { data: profile, message: 'Cập nhật thời gian làm việc thành công' };
  }

  // Upload clinic image
  @UseGuards(JwtAuthGuard)
  @Post('me/clinic-images')
  @UseInterceptors(FileInterceptor('image'))
  async uploadClinicImage(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('caption') caption?: string,
  ) {
    const doctorId = this.getUserId(req);

    // Upload to Cloudinary
    const uploadResult = await this.cloudinaryService.uploadImage(file);
    const imageUrl = uploadResult.url;

    // Add to profile
    const profile = await this.doctorProfileService.addClinicImage(
      doctorId,
      imageUrl,
      caption,
    );

    return {
      data: profile,
      imageUrl,
      message: 'Tải ảnh phòng khám thành công',
    };
  }

  // Remove clinic image
  @UseGuards(JwtAuthGuard)
  @Delete('me/clinic-images')
  async removeClinicImage(
    @Request() req: any,
    @Body('imageUrl') imageUrl: string,
  ) {
    const doctorId = this.getUserId(req);

    // Remove from Cloudinary (extract public_id from URL)
    try {
      const publicId = this.extractPublicIdFromUrl(imageUrl);
      if (publicId) {
        await this.cloudinaryService.deleteImage(publicId);
      }
    } catch (error) {
      console.warn('Failed to delete image from Cloudinary:', error);
    }

    // Remove from profile
    const profile = await this.doctorProfileService.removeClinicImage(
      doctorId,
      imageUrl,
    );

    return { data: profile, message: 'Xóa ảnh phòng khám thành công' };
  }

  // Helper to extract public_id from Cloudinary URL
  private extractPublicIdFromUrl(url: string): string | null {
    try {
      const regex = /\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i;
      const match = url.match(regex);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }
}
