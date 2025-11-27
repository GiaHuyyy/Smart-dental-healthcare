import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DoctorScheduleController } from './doctor-schedule.controller';
import { DoctorScheduleService } from './doctor-schedule.service';
import {
  DoctorSchedule,
  DoctorScheduleSchema,
} from './schemas/doctor-schedule.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DoctorSchedule.name, schema: DoctorScheduleSchema },
    ]),
  ],
  controllers: [DoctorScheduleController],
  providers: [DoctorScheduleService],
  exports: [DoctorScheduleService],
})
export class DoctorScheduleModule {}
