import { ResendService } from '../../mail/resend.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import aqp from 'api-query-params';
import dayjs from 'dayjs';
import mongoose, { Model } from 'mongoose';
import {
  CodeAuthDto,
  CreateAuthDto,
  ResetPasswordDto,
  VerifyResetCodeDto,
} from 'src/auth/dto/create-auth.dto';
import { comparePasswordHelper, hashPasswordHelper } from 'src/helpers/utils';
import { v4 as uuidv4 } from 'uuid';
import { AiChatHistoryService } from '../ai-chat-history/ai-chat-history.service';
import { Appointment } from '../appointments/schemas/appointment.schemas';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto, UpdateUserDto } from './dto/update-user.dto';
import { User } from './schemas/user.schemas';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Appointment.name) private appointmentModel: Model<Appointment>,
    private readonly resendService: ResendService,
    private readonly aiChatHistoryService: AiChatHistoryService,
  ) {}

  async isEmailExists(email: string) {
    const user = await this.userModel.exists({ email });
    if (user) return true;
    return false;
  }

  async create(createUserDto: CreateUserDto) {
    const { fullName, email, phone, password, dateOfBirth, gender, address } =
      createUserDto;

    // Check if email already exists
    const emailExists = await this.isEmailExists(email);
    if (emailExists) {
      throw new BadRequestException(
        'Email ' + email + '. Vui lòng sử dụng email khác.',
      );
    }

    // hash the password before saving
    const hashedPassword = await hashPasswordHelper(password);
    const user = await this.userModel.create({
      fullName,
      email,
      phone,
      password: hashedPassword,
      dateOfBirth,
      gender,
      address,
    });
    return {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      address: user.address,
    };
  }

  async findAll(query: string, current: number, pageSize: number) {
    const { filter, sort } = aqp(query);

    if (filter.current) delete filter.current;
    if (filter.pageSize) delete filter.pageSize;

    if (!current) current = 1;
    if (!pageSize) pageSize = 10;

    const totalItems = (await this.userModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const skip = (current - 1) * pageSize;

    const results = await this.userModel
      .find(filter)
      .limit(pageSize)
      .skip(skip)
      .sort(sort as any)
      .select('-password')
      .exec();
    return { results, totalPages };
  }

  findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID người dùng không hợp lệ');
    }
    return this.userModel.findById(id).select('-password').exec();
  }

  async findByEmail(email: string) {
    return await this.userModel.findOne({ email }).exec();
  }

  async findByEmailAndRole(email: string, role: string) {
    return await this.userModel.findOne({ email, role }).exec();
  }

  async findAllPatients(user: any) {
    try {
      // Kiểm tra quyền, chỉ bác sĩ mới có thể xem danh sách bệnh nhân
      // Bỏ qua kiểm tra quyền nếu user là null (API test)
      if (user && user.role !== 'doctor') {
        throw new BadRequestException(
          'Bạn không có quyền truy cập danh sách bệnh nhân',
        );
      }

      // Lấy danh sách bệnh nhân (role = 'patient')
      const patients = await this.userModel
        .find({ role: 'patient' })
        .select('-password')
        .sort({ createdAt: -1 })
        .exec();

      return {
        success: true,
        data: patients,
        message: 'Lấy danh sách bệnh nhân thành công',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy danh sách bệnh nhân',
      };
    }
  }

  async findAllDoctors(query: any) {
    try {
      // Build filter object
      const filter: any = { role: 'doctor' };

      // Search by name, email, or specialty
      if (query?.search) {
        const searchRegex = new RegExp(query.search, 'i');
        filter.$or = [
          { fullName: searchRegex },
          { email: searchRegex },
          { specialty: searchRegex },
        ];
      }

      // Filter by specialty
      if (query?.specialty && query.specialty !== 'all') {
        filter.specialty = new RegExp(query.specialty, 'i');
      }

      // Filter by gender
      if (query?.gender && query.gender !== 'all') {
        filter.gender = query.gender;
      }

      // Filter by minimum experience
      if (query?.minExperience) {
        filter.experienceYears = { $gte: parseInt(query.minExperience) };
      }

      // Lấy danh sách bác sĩ với filters
      const doctors = await this.userModel
        .find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .exec();

      return {
        success: true,
        data: doctors,
        message: 'Lấy danh sách bác sĩ thành công',
      };
    } catch (error) {
      console.error('Error in findAllDoctors:', error);
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy danh sách bác sĩ',
      };
    }
  }

  async update(updateUserDto: UpdateUserDto) {
    return await this.userModel.updateOne(
      { _id: updateUserDto._id },
      { ...updateUserDto },
    );
  }

  async changePassword(changePasswordDto: ChangePasswordDto) {
    const { _id, currentPassword, newPassword } = changePasswordDto;

    // Find user by id
    const user = await this.userModel.findById(_id);
    if (!user) {
      throw new BadRequestException('Người dùng không tồn tại');
    }

    // Verify current password
    const isPasswordValid = await comparePasswordHelper(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }

    // Hash new password
    const hashedPassword = await hashPasswordHelper(newPassword);

    // Update password
    await this.userModel.updateOne({ _id }, { password: hashedPassword });

    return { message: 'Đổi mật khẩu thành công' };
  }

  async remove(id: string) {
    // check _id user
    if (mongoose.isValidObjectId(id)) {
      return this.userModel.deleteOne({ _id: id });
    } else {
      throw new BadRequestException('ID người dùng không hợp lệ');
    }
  }

  async handleRegister(createRegisterDto: CreateAuthDto) {
    const {
      email,
      password,
      fullName,
      role,
      gender,
      address,
      dateOfBirth,
      phone,
      specialty,
      licenseNumber,
      avatarUrl,
      licenseImageUrl,
      experienceYears,
      qualifications,
      services,
      workAddress,
      latitude,
      longitude,
    } = createRegisterDto;

    // Check if email already exists
    const emailExists = await this.isEmailExists(email);
    if (emailExists) {
      throw new BadRequestException(
        'Email ' + email + ' đã tồn tại. Vui lòng sử dụng email khác.',
      );
    }

    // hash the password before saving
    const hashedPassword = await hashPasswordHelper(password);
    const codeId = uuidv4();

    // Add "BS. " prefix for doctor's fullName if not already present
    let finalFullName = fullName;
    if (role === 'doctor' && !fullName.startsWith('BS. ')) {
      finalFullName = `BS. ${fullName}`;
    }

    // Build user data object
    const userData: any = {
      fullName: finalFullName,
      email,
      password: hashedPassword,
      role: role,
      gender,
      address,
      dateOfBirth,
      phone,
      isActive: false,
      codeId: codeId,
      codeExpired: dayjs().add(1, 'hour'),
    };

    // Add optional avatar
    if (avatarUrl) {
      userData.avatarUrl = avatarUrl;
    }

    // Add doctor-specific fields
    if (role === 'doctor') {
      if (specialty) userData.specialty = specialty;
      if (licenseNumber) userData.licenseNumber = licenseNumber;
      if (licenseImageUrl) userData.licenseImageUrl = licenseImageUrl;
      if (experienceYears) userData.experienceYears = experienceYears;
      if (qualifications) userData.qualifications = qualifications;
      if (services && services.length > 0) userData.services = services;
      if (workAddress) userData.workAddress = workAddress;
      if (latitude) userData.latitude = latitude;
      if (longitude) userData.longitude = longitude;
    }

    const user = await this.userModel.create(userData);

    // send email to user using Resend
    await this.resendService.sendEmail({
      to: email,
      subject: 'Kích hoạt tài khoản của bạn',
      html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">🏥 Smart Dental Healthcare</h1>
          <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Kích hoạt tài khoản</p>
        </div>
        <div style="padding: 30px 20px;">
          <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px;">Xin chào <strong>${finalFullName}</strong>,</p>
          <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px;">Cảm ơn bạn đã đăng ký tài khoản. Vui lòng sử dụng mã sau để kích hoạt:</p>
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; color: white; font-size: 32px; font-weight: bold; letter-spacing: 4px;">${codeId}</p>
          </div>
          <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px;">Mã này có hiệu lực trong 1 giờ.</p>
        </div>
        <div style="background: #f3f4f6; padding: 20px; text-align: center;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">Smart Dental Healthcare System</p>
        </div>
      </div>`,
    });

    return {
      _id: user._id,
    };
  }

  async handleCheckCode(checkCodeDto: CodeAuthDto) {
    const { id, code } = checkCodeDto;
    const user = await this.userModel.findOne({
      _id: id,
      codeId: code,
    });
    if (!user) {
      throw new BadRequestException(
        'Mã kích hoạt không hợp lệ hoặc người dùng không tồn tại',
      );
    }

    // check code expiration
    if (dayjs().isAfter(user.codeExpired)) {
      throw new BadRequestException('Mã kích hoạt đã hết hạn');
    } else {
      // Activate user account
      await this.userModel.updateOne(
        { _id: id },
        { isActive: true, codeId: null, codeExpired: null },
      );

      // Create AI chat session for patient after successful account activation
      if (user.role === 'patient') {
        try {
          await this.aiChatHistoryService.initializeUserSession(id);
          console.log(`Created AI chat session for patient: ${id}`);
        } catch (error) {
          console.error(
            `Failed to create AI chat session for patient ${id}:`,
            error,
          );
          // Don't throw error here, account activation should still succeed
        }
      }

      return {
        _id: user._id,
        message: 'Kích hoạt tài khoản thành công',
      };
    }
  }

  async activateForTest(email: string) {
    try {
      const user = await this.userModel.findOne({ email });
      if (!user) {
        throw new BadRequestException(
          'Không tìm thấy người dùng với email này',
        );
      }

      await this.userModel.updateOne(
        { email },
        { isActive: true, codeId: null, codeExpired: null },
      );

      return {
        success: true,
        message: 'Kích hoạt tài khoản thành công cho mục đích test',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi kích hoạt tài khoản',
      };
    }
  }

  async handleRetryCode(email: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new BadRequestException('Người dùng không tồn tại');
    }

    // Generate new activation code
    const codeId = uuidv4();
    await this.userModel.updateOne(
      {
        _id: user._id,
      },
      {
        codeId: codeId,
        codeExpired: dayjs().add(1, 'hour'),
      },
    );

    // Send email with new activation code
    await this.resendService.sendEmail({
      to: user.email,
      subject: 'Kích hoạt tài khoản của bạn',
      html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">🏥 Smart Dental Healthcare</h1>
          <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Kích hoạt tài khoản</p>
        </div>
        <div style="padding: 30px 20px;">
          <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px;">Xin chào <strong>${user.fullName}</strong>,</p>
          <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px;">Đây là mã kích hoạt mới của bạn:</p>
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; color: white; font-size: 32px; font-weight: bold; letter-spacing: 4px;">${codeId}</p>
          </div>
          <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px;">Mã này có hiệu lực trong 1 giờ.</p>
        </div>
        <div style="background: #f3f4f6; padding: 20px; text-align: center;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">Smart Dental Healthcare System</p>
        </div>
      </div>`,
    });

    return {
      _id: user._id,
      message: 'Mã kích hoạt mới đã được gửi đến email của bạn',
    };
  }

  async handleForgotPassword(email: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new BadRequestException('Không tìm thấy tài khoản với email này');
    }

    // Generate password reset code
    const codeId = uuidv4();
    await this.userModel.updateOne(
      { _id: user._id },
      {
        codeIdPassword: codeId,
        codeExpiredPassword: dayjs().add(1, 'hour'),
      },
    );

    // Send password reset email
    await this.resendService.sendEmail({
      to: user.email,
      subject: 'Đặt lại mật khẩu tài khoản của bạn',
      html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">🔐 Đặt lại mật khẩu</h1>
        </div>
        <div style="padding: 30px 20px;">
          <p style="margin: 0 0 20px 0; color: #111827; font-size: 16px;">Xin chào <strong>${user.fullName}</strong>,</p>
          <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px;">Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng sử dụng mã sau:</p>
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; color: white; font-size: 32px; font-weight: bold; letter-spacing: 4px;">${codeId}</p>
          </div>
          <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px;">Mã này có hiệu lực trong 1 giờ. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
        </div>
        <div style="background: #f3f4f6; padding: 20px; text-align: center;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">Smart Dental Healthcare System</p>
        </div>
      </div>`,
    });

    return {
      _id: user._id,
      message: 'Mã đặt lại mật khẩu đã được gửi đến email của bạn',
    };
  }

  async handleVerifyResetCode(verifyResetCodeDto: VerifyResetCodeDto) {
    const { id, code } = verifyResetCodeDto;

    const user = await this.userModel.findOne({
      _id: id,
      codeIdPassword: code,
    });

    if (!user) {
      throw new BadRequestException(
        'Mã đặt lại mật khẩu không hợp lệ hoặc người dùng không tồn tại',
      );
    }

    // Check code expiration
    if (dayjs().isAfter(user.codeExpiredPassword)) {
      throw new BadRequestException('Mã đặt lại mật khẩu đã hết hạn');
    }

    return {
      message: 'Mã đặt lại mật khẩu hợp lệ',
    };
  }

  async handleResetPassword(resetPasswordDto: ResetPasswordDto) {
    const { id, code, newPassword } = resetPasswordDto;
    const user = await this.userModel.findOne({
      _id: id,
      codeIdPassword: code,
    });

    if (!user) {
      throw new BadRequestException(
        'Mã đặt lại mật khẩu không hợp lệ hoặc người dùng không tồn tại',
      );
    }

    // Check code expiration
    if (dayjs().isAfter(user.codeExpiredPassword)) {
      throw new BadRequestException('Mã đặt lại mật khẩu đã hết hạn');
    }

    // Hash new password and update user
    const hashedPassword = await hashPasswordHelper(newPassword);
    await this.userModel.updateOne(
      { _id: id },
      {
        password: hashedPassword,
        codeIdPassword: null,
        codeExpiredPassword: null,
      },
    );

    return {
      message: 'Đặt lại mật khẩu thành công',
    };
  }

  async findDoctors() {
    return await this.userModel
      .find({
        role: 'doctor',
        isActive: true,
      })
      .select('fullName email specialty phone avatarUrl')
      .exec();
  }

  async getPatientStats(doctorId?: string) {
    try {
      // Nếu có doctorId, chỉ lấy bệnh nhân có lịch hẹn completed với bác sĩ đó
      if (doctorId) {
        // Lấy danh sách patientId có lịch hẹn completed với bác sĩ này
        const completedAppointments = (await this.appointmentModel
          .find({
            doctorId: new mongoose.Types.ObjectId(doctorId),
            status: 'completed',
          })
          .distinct('patientId')) as unknown as string[];

        const patientIds = completedAppointments.map(
          (id: string) => new mongoose.Types.ObjectId(id),
        );

        const totalPatients = patientIds.length;

        const activePatients = await this.userModel.countDocuments({
          _id: { $in: patientIds },
          role: 'patient',
          isActive: true,
        });

        // Lấy số bệnh nhân mới trong tháng này (có lịch hẹn completed đầu tiên trong tháng này)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        // Tìm những bệnh nhân có lịch hẹn completed đầu tiên trong tháng này
        const newPatientsThisMonth = await this.appointmentModel.aggregate([
          {
            $match: {
              doctorId: new mongoose.Types.ObjectId(doctorId),
              status: 'completed',
            },
          },
          {
            $group: {
              _id: '$patientId',
              firstCompletedDate: { $min: '$appointmentDate' },
            },
          },
          {
            $match: {
              firstCompletedDate: { $gte: startOfMonth },
            },
          },
          {
            $count: 'count',
          },
        ]);

        return {
          success: true,
          data: {
            totalPatients,
            activePatients,
            newPatientsThisMonth: newPatientsThisMonth[0]?.count || 0,
            inactivePatients: totalPatients - activePatients,
          },
          message: 'Lấy thống kê bệnh nhân thành công',
        };
      }

      // Nếu không có doctorId, lấy tất cả bệnh nhân (cho admin)
      const totalPatients = await this.userModel.countDocuments({
        role: 'patient',
      });
      const activePatients = await this.userModel.countDocuments({
        role: 'patient',
        isActive: true,
      });

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const newPatientsThisMonth = await this.userModel.countDocuments({
        role: 'patient',
        createdAt: { $gte: startOfMonth },
      });

      return {
        success: true,
        data: {
          totalPatients,
          activePatients,
          newPatientsThisMonth,
          inactivePatients: totalPatients - activePatients,
        },
        message: 'Lấy thống kê bệnh nhân thành công',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy thống kê bệnh nhân',
      };
    }
  }

  async searchPatients(query: any) {
    try {
      const { search, status, current = 1, pageSize = 10, doctorId } = query;

      let patientIds: mongoose.Types.ObjectId[] | null = null;

      // Nếu có doctorId, chỉ lấy bệnh nhân có lịch hẹn completed với bác sĩ đó
      if (doctorId) {
        const completedAppointments = (await this.appointmentModel
          .find({
            doctorId: new mongoose.Types.ObjectId(doctorId),
            status: 'completed',
          })
          .distinct('patientId')) as unknown as string[];

        patientIds = completedAppointments.map(
          (id: string) => new mongoose.Types.ObjectId(id),
        );

        // Nếu không có bệnh nhân nào, trả về rỗng
        if (patientIds.length === 0) {
          return {
            success: true,
            data: {
              patients: [],
              pagination: {
                current: +current,
                pageSize: +pageSize,
                totalItems: 0,
                totalPages: 0,
              },
            },
            message: 'Chưa có bệnh nhân nào',
          };
        }
      }

      const filter: any = { role: 'patient' };

      // Filter theo patientIds nếu có doctorId
      if (patientIds) {
        filter._id = { $in: patientIds };
      }

      if (search) {
        filter.$or = [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
        ];
      }

      if (status && status !== 'all') {
        if (status === 'active') {
          filter.isActive = true;
        } else if (status === 'inactive') {
          filter.isActive = false;
        }
      }

      const skip = (current - 1) * pageSize;
      const totalItems = await this.userModel.countDocuments(filter);
      const totalPages = Math.ceil(totalItems / pageSize);

      const patients = await this.userModel
        .find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .exec();

      return {
        success: true,
        data: {
          patients,
          pagination: {
            current: +current,
            pageSize: +pageSize,
            totalItems,
            totalPages,
          },
        },
        message: 'Tìm kiếm bệnh nhân thành công',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi tìm kiếm bệnh nhân',
      };
    }
  }

  async getPatientDetails(patientId: string, doctorId?: string) {
    try {
      const patient = await this.userModel
        .findById(patientId)
        .select('-password')
        .exec();

      if (!patient || patient.role !== 'patient') {
        return {
          success: false,
          message: 'Không tìm thấy bệnh nhân',
        };
      }

      return {
        success: true,
        data: patient,
        message: 'Lấy thông tin bệnh nhân thành công',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi lấy thông tin bệnh nhân',
      };
    }
  }

  async getPatientAppointments(patientId: string, query: any) {
    try {
      // Đây sẽ được implement trong appointments service
      // Tạm thời trả về thông báo
      return {
        success: true,
        data: [],
        message: 'API này sẽ được implement trong appointments service',
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.message || 'Có lỗi xảy ra khi lấy lịch hẹn của bệnh nhân',
      };
    }
  }

  async getPatientPrescriptions(patientId: string, query: any) {
    try {
      // Đây sẽ được implement trong prescriptions service
      // Tạm thời trả về thông báo
      return {
        success: true,
        data: [],
        message: 'API này sẽ được implement trong prescriptions service',
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.message || 'Có lỗi xảy ra khi lấy đơn thuốc của bệnh nhân',
      };
    }
  }

  async getPatientMedicalRecords(patientId: string, query: any) {
    try {
      // Đây sẽ được implement trong medical-records service
      // Tạm thời trả về thông báo
      return {
        success: true,
        data: [],
        message: 'API này sẽ được implement trong medical-records service',
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.message || 'Có lỗi xảy ra khi lấy hồ sơ bệnh án của bệnh nhân',
      };
    }
  }
}
