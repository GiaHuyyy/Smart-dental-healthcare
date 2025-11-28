import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from 'src/decorator/customize';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto, UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Public()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Public()
  async findAll(
    @Query() query: string,
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
  ) {
    return this.usersService.findAll(query, +current, +pageSize);
  }

  @Get('patients')
  @Public()
  async findAllPatients() {
    // This endpoint is public; pass null as the `user` param so the service
    // does not mistake the query object for a user and incorrectly block access.
    return this.usersService.findAllPatients(null);
  }

  @Get('doctors')
  @Public()
  async findAllDoctors(@Query() query: any) {
    return this.usersService.findAllDoctors(query);
  }

  @Get('patients/stats')
  @Public()
  async getPatientStats(@Query('doctorId') doctorId?: string) {
    return this.usersService.getPatientStats(doctorId);
  }

  @Get('patients/search')
  @Public()
  async searchPatients(@Query() query: any) {
    return this.usersService.searchPatients(query);
  }

  @Get('patients/:id/details')
  @Public()
  async getPatientDetails(
    @Param('id') id: string,
    @Query('doctorId') doctorId?: string,
  ) {
    return this.usersService.getPatientDetails(id, doctorId);
  }

  @Get('patients/:id/appointments')
  @Public()
  async getPatientAppointments(@Param('id') id: string, @Query() query: any) {
    return this.usersService.getPatientAppointments(id, query);
  }

  @Get('patients/:id/prescriptions')
  @Public()
  async getPatientPrescriptions(@Param('id') id: string, @Query() query: any) {
    return this.usersService.getPatientPrescriptions(id, query);
  }

  @Get('patients/:id/medical-records')
  @Public()
  async getPatientMedicalRecords(@Param('id') id: string, @Query() query: any) {
    return this.usersService.getPatientMedicalRecords(id, query);
  }

  @Patch('activate-for-test')
  @Public()
  async activateForTest(@Body() body: { email: string }) {
    return this.usersService.activateForTest(body.email);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch()
  @Public()
  update(@Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(updateUserDto);
  }

  @Patch('change-password')
  @Public()
  changePassword(@Body() changePasswordDto: ChangePasswordDto) {
    return this.usersService.changePassword(changePasswordDto);
  }

  @Delete(':id')
  @Public()
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
