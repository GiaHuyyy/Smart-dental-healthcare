import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './schemas/user.schemas';
import mongoose, { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { hashPasswordHelper } from 'src/helpers/utils';
import aqp from 'api-query-params';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

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
        'Email đã tồn tại: ' + email + '. Vui lòng sử dụng email khác.',
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
    return this.userModel.findById(id).select('-password').exec();
  }

  async findByEmail(email: string) {
    return await this.userModel.findOne({ email }).exec();
  }

  async update(updateUserDto: UpdateUserDto) {
    return await this.userModel.updateOne(
      { _id: updateUserDto._id },
      { ...updateUserDto },
    );
  }

  async remove(id: string) {
    // check _id user
    if (mongoose.isValidObjectId(id)) {
      return this.userModel.deleteOne({ _id: id });
    } else {
      throw new BadRequestException('ID người dùng không hợp lệ');
    }
  }
}
