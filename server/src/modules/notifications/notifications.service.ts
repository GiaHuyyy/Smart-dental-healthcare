import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Notification } from './schemas/notification.schemas';
import mongoose, { Model } from 'mongoose';
import aqp from 'api-query-params';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
  ) {}

  async create(createNotificationDto: CreateNotificationDto) {
    try {
      const notification = await this.notificationModel.create(createNotificationDto);
      return {
        success: true,
        data: notification,
        message: 'Tạo thông báo thành công',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi tạo thông báo',
      };
    }
  }

  async findAll(query: string, current: number, pageSize: number) {
    try {
      const { filter, sort } = aqp(query);

      if (filter.current) delete filter.current;
      if (filter.pageSize) delete filter.pageSize;

      if (!current) current = 1;
      if (!pageSize) pageSize = 10;

      const totalItems = (await this.notificationModel.find(filter)).length;
      const totalPages = Math.ceil(totalItems / pageSize);
      const skip = (current - 1) * pageSize;

      const results = await this.notificationModel
        .find(filter)
        .limit(pageSize)
        .skip(skip)
        .sort(sort as any)
        .populate('userId', 'fullName email')
        .exec();

      return {
        success: true,
        data: { results, totalItems, totalPages, current, pageSize },
        message: 'Lấy danh sách thông báo thành công',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy danh sách thông báo',
      };
    }
  }

  async findByUser(userId: string) {
    try {
      if (!mongoose.isValidObjectId(userId)) {
        throw new BadRequestException('ID người dùng không hợp lệ');
      }

      const notifications = await this.notificationModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .populate('userId', 'fullName email')
        .exec();

      return {
        success: true,
        data: notifications,
        message: 'Lấy danh sách thông báo của người dùng thành công',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy danh sách thông báo của người dùng',
      };
    }
  }

  async findOne(id: string) {
    try {
      if (!mongoose.isValidObjectId(id)) {
        throw new BadRequestException('ID thông báo không hợp lệ');
      }

      const notification = await this.notificationModel
        .findById(id)
        .populate('userId', 'fullName email')
        .exec();

      if (!notification) {
        throw new BadRequestException('Không tìm thấy thông báo');
      }

      return {
        success: true,
        data: notification,
        message: 'Lấy thông tin thông báo thành công',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy thông tin thông báo',
      };
    }
  }

  async update(id: string, updateNotificationDto: UpdateNotificationDto) {
    try {
      if (!mongoose.isValidObjectId(id)) {
        throw new BadRequestException('ID thông báo không hợp lệ');
      }

      const notification = await this.notificationModel
        .findByIdAndUpdate(id, updateNotificationDto, { new: true })
        .exec();

      if (!notification) {
        throw new BadRequestException('Không tìm thấy thông báo');
      }

      return {
        success: true,
        data: notification,
        message: 'Cập nhật thông báo thành công',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi cập nhật thông báo',
      };
    }
  }

  async markAsRead(id: string) {
    try {
      if (!mongoose.isValidObjectId(id)) {
        throw new BadRequestException('ID thông báo không hợp lệ');
      }

      const notification = await this.notificationModel
        .findByIdAndUpdate(id, { isRead: true }, { new: true })
        .exec();

      if (!notification) {
        throw new BadRequestException('Không tìm thấy thông báo');
      }

      return {
        success: true,
        data: notification,
        message: 'Đánh dấu thông báo đã đọc thành công',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi đánh dấu thông báo đã đọc',
      };
    }
  }

  async markAllAsRead(userId: string) {
    try {
      if (!mongoose.isValidObjectId(userId)) {
        throw new BadRequestException('ID người dùng không hợp lệ');
      }

      await this.notificationModel
        .updateMany({ userId, isRead: false }, { isRead: true })
        .exec();

      return {
        success: true,
        message: 'Đánh dấu tất cả thông báo đã đọc thành công',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi đánh dấu tất cả thông báo đã đọc',
      };
    }
  }

  async remove(id: string) {
    try {
      if (!mongoose.isValidObjectId(id)) {
        throw new BadRequestException('ID thông báo không hợp lệ');
      }

      const notification = await this.notificationModel.findByIdAndDelete(id).exec();

      if (!notification) {
        throw new BadRequestException('Không tìm thấy thông báo');
      }

      return {
        success: true,
        message: 'Xóa thông báo thành công',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi xóa thông báo',
      };
    }
  }
}