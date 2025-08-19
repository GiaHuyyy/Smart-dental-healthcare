import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { Report, ReportDocument } from './schemas/report.schemas';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
  ) {}

  async create(createReportDto: CreateReportDto): Promise<Report> {
    try {
      const createdReport = new this.reportModel(createReportDto);
      return await createdReport.save();
    } catch (error) {
      throw new BadRequestException('Không thể tạo báo cáo: ' + error.message);
    }
  }

  async findAll(page = 1, limit = 10, status?: string): Promise<{ data: Report[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const filter: any = {};
    
    if (status) {
      filter.status = status;
    }

    const [data, total] = await Promise.all([
      this.reportModel.find(filter)
        .skip(skip)
        .limit(limit)
        .populate('userId', 'fullName email')
        .populate('assignedTo', 'fullName email')
        .populate('participants', 'fullName email')
        .exec(),
      this.reportModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findByUser(userId: string, page = 1, limit = 10): Promise<{ data: Report[]; total: number; page: number; limit: number }> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('ID người dùng không hợp lệ');
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.reportModel.find({ userId })
        .skip(skip)
        .limit(limit)
        .populate('assignedTo', 'fullName email')
        .populate('participants', 'fullName email')
        .exec(),
      this.reportModel.countDocuments({ userId }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findByAssignee(assignedTo: string, page = 1, limit = 10): Promise<{ data: Report[]; total: number; page: number; limit: number }> {
    if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
      throw new BadRequestException('ID người được giao không hợp lệ');
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.reportModel.find({ assignedTo })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'fullName email')
        .populate('participants', 'fullName email')
        .exec(),
      this.reportModel.countDocuments({ assignedTo }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<Report> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID báo cáo không hợp lệ');
    }

    const report = await this.reportModel.findById(id)
      .populate('userId', 'fullName email')
      .populate('assignedTo', 'fullName email')
      .populate('participants', 'fullName email')
      .exec();

    if (!report) {
      throw new NotFoundException('Không tìm thấy báo cáo');
    }

    return report;
  }

  async update(id: string, updateReportDto: UpdateReportDto): Promise<Report> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID báo cáo không hợp lệ');
    }

    // Nếu trạng thái được cập nhật thành 'resolved', thêm thời gian giải quyết
    if (updateReportDto.status === 'resolved' && !updateReportDto['resolvedAt']) {
      updateReportDto['resolvedAt'] = new Date();
    }

    const updatedReport = await this.reportModel.findByIdAndUpdate(
      id,
      { $set: updateReportDto },
      { new: true },
    );

    if (!updatedReport) {
      throw new NotFoundException('Không tìm thấy báo cáo');
    }

    return updatedReport;
  }

  async assignReport(id: string, assignedTo: string): Promise<Report> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID báo cáo không hợp lệ');
    }

    if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
      throw new BadRequestException('ID người được giao không hợp lệ');
    }

    const updatedReport = await this.reportModel.findByIdAndUpdate(
      id,
      { 
        $set: { 
          assignedTo,
          status: 'in_progress' 
        } 
      },
      { new: true },
    );

    if (!updatedReport) {
      throw new NotFoundException('Không tìm thấy báo cáo');
    }

    return updatedReport;
  }

  async resolveReport(id: string, resolution: string): Promise<Report> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID báo cáo không hợp lệ');
    }

    const updatedReport = await this.reportModel.findByIdAndUpdate(
      id,
      { 
        $set: { 
          resolution,
          status: 'resolved',
          resolvedAt: new Date() 
        } 
      },
      { new: true },
    );

    if (!updatedReport) {
      throw new NotFoundException('Không tìm thấy báo cáo');
    }

    return updatedReport;
  }

  async addParticipant(id: string, participantId: string): Promise<Report> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID báo cáo không hợp lệ');
    }

    if (!mongoose.Types.ObjectId.isValid(participantId)) {
      throw new BadRequestException('ID người tham gia không hợp lệ');
    }

    const updatedReport = await this.reportModel.findByIdAndUpdate(
      id,
      { $addToSet: { participants: participantId } },
      { new: true },
    );

    if (!updatedReport) {
      throw new NotFoundException('Không tìm thấy báo cáo');
    }

    return updatedReport;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID báo cáo không hợp lệ');
    }

    const result = await this.reportModel.deleteOne({ _id: id }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('Không tìm thấy báo cáo');
    }

    return { deleted: true };
  }
}