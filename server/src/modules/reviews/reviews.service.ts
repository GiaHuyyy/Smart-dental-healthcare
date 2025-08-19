import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Review, ReviewDocument } from './schemas/review.schemas';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
  ) {}

  async create(createReviewDto: CreateReviewDto): Promise<Review> {
    try {
      const createdReview = new this.reviewModel(createReviewDto);
      return await createdReview.save();
    } catch (error) {
      throw new BadRequestException('Không thể tạo đánh giá: ' + error.message);
    }
  }

  async findAll(page = 1, limit = 10): Promise<{ data: Review[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.reviewModel.find().skip(skip).limit(limit).populate('patientId', 'fullName email').populate('doctorId', 'fullName email').exec(),
      this.reviewModel.countDocuments(),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findByDoctor(doctorId: string, page = 1, limit = 10): Promise<{ data: Review[]; total: number; page: number; limit: number }> {
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      throw new BadRequestException('ID bác sĩ không hợp lệ');
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.reviewModel.find({ doctorId }).skip(skip).limit(limit).populate('patientId', 'fullName email').exec(),
      this.reviewModel.countDocuments({ doctorId }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findByPatient(patientId: string, page = 1, limit = 10): Promise<{ data: Review[]; total: number; page: number; limit: number }> {
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      throw new BadRequestException('ID bệnh nhân không hợp lệ');
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.reviewModel.find({ patientId }).skip(skip).limit(limit).populate('doctorId', 'fullName email').exec(),
      this.reviewModel.countDocuments({ patientId }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<Review> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID đánh giá không hợp lệ');
    }

    const review = await this.reviewModel.findById(id)
      .populate('patientId', 'fullName email')
      .populate('doctorId', 'fullName email')
      .exec();

    if (!review) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    return review;
  }

  async update(id: string, updateReviewDto: UpdateReviewDto): Promise<Review> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID đánh giá không hợp lệ');
    }

    const updatedReview = await this.reviewModel.findByIdAndUpdate(
      id,
      { $set: updateReviewDto },
      { new: true },
    );

    if (!updatedReview) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    return updatedReview;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID đánh giá không hợp lệ');
    }

    const result = await this.reviewModel.deleteOne({ _id: id }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    return { deleted: true };
  }

  async getDoctorRating(doctorId: string): Promise<{ averageRating: number; totalReviews: number }> {
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      throw new BadRequestException('ID bác sĩ không hợp lệ');
    }

    const result = await this.reviewModel.aggregate([
      { $match: { doctorId: new mongoose.Types.ObjectId(doctorId) } },
      { $group: { _id: null, averageRating: { $avg: '$rating' }, totalReviews: { $sum: 1 } } },
    ]).exec();

    if (result.length === 0) {
      return { averageRating: 0, totalReviews: 0 };
    }

    return {
      averageRating: parseFloat(result[0].averageRating.toFixed(1)),
      totalReviews: result[0].totalReviews,
    };
  }
}