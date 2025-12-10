import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DoctorSchedule,
  DoctorScheduleDocument,
} from './schemas/doctor-schedule.schema';
import { UpdateDoctorScheduleDto } from './dto/update-doctor-schedule.dto';

// Default time slots (08:00 - 17:00, 30min intervals)
const generateDefaultTimeSlots = (): { time: string; isWorking: boolean }[] => {
  const slots: { time: string; isWorking: boolean }[] = [];
  for (let hour = 8; hour < 17; hour++) {
    slots.push({
      time: `${hour.toString().padStart(2, '0')}:00`,
      isWorking: true,
    });
    slots.push({
      time: `${hour.toString().padStart(2, '0')}:30`,
      isWorking: true,
    });
  }
  slots.push({ time: '17:00', isWorking: true });
  return slots;
};

// Default weekly schedule
const getDefaultWeeklySchedule = () => [
  {
    dayKey: 'monday',
    dayName: 'Thứ 2',
    dayIndex: 1,
    isWorking: true,
    timeSlots: generateDefaultTimeSlots(),
  },
  {
    dayKey: 'tuesday',
    dayName: 'Thứ 3',
    dayIndex: 2,
    isWorking: true,
    timeSlots: generateDefaultTimeSlots(),
  },
  {
    dayKey: 'wednesday',
    dayName: 'Thứ 4',
    dayIndex: 3,
    isWorking: true,
    timeSlots: generateDefaultTimeSlots(),
  },
  {
    dayKey: 'thursday',
    dayName: 'Thứ 5',
    dayIndex: 4,
    isWorking: true,
    timeSlots: generateDefaultTimeSlots(),
  },
  {
    dayKey: 'friday',
    dayName: 'Thứ 6',
    dayIndex: 5,
    isWorking: true,
    timeSlots: generateDefaultTimeSlots(),
  },
  {
    dayKey: 'saturday',
    dayName: 'Thứ 7',
    dayIndex: 6,
    isWorking: true,
    timeSlots: generateDefaultTimeSlots(),
  },
  {
    dayKey: 'sunday',
    dayName: 'Chủ Nhật',
    dayIndex: 0,
    isWorking: true,
    timeSlots: generateDefaultTimeSlots(),
  },
];

@Injectable()
export class DoctorScheduleService {
  constructor(
    @InjectModel(DoctorSchedule.name)
    private doctorScheduleModel: Model<DoctorScheduleDocument>,
  ) {}

  /**
   * Get doctor schedule by doctorId
   * If not exists, create default schedule
   */
  async getSchedule(doctorId: string): Promise<DoctorSchedule> {
    let schedule = await this.doctorScheduleModel.findOne({ doctorId }).exec();

    if (!schedule) {
      // Create default schedule
      schedule = await this.doctorScheduleModel.create({
        doctorId,
        weeklySchedule: getDefaultWeeklySchedule(),
        blockedTimes: [],
      });
    }

    return schedule;
  }

  /**
   * Update doctor schedule (weekly schedule + blocked times)
   */
  async updateSchedule(
    doctorId: string,
    updateDto: UpdateDoctorScheduleDto,
  ): Promise<DoctorSchedule> {
    const schedule = await this.doctorScheduleModel
      .findOneAndUpdate(
        { doctorId },
        {
          $set: {
            weeklySchedule: updateDto.weeklySchedule,
            blockedTimes: updateDto.blockedTimes || [],
          },
        },
        { new: true, upsert: true },
      )
      .exec();
    return schedule;
  }

  /**
   * Add a blocked time
   */
  async addBlockedTime(
    doctorId: string,
    blockedTime: NonNullable<UpdateDoctorScheduleDto['blockedTimes']>[0],
  ): Promise<DoctorSchedule> {
    const schedule = await this.doctorScheduleModel
      .findOneAndUpdate(
        { doctorId },
        { $push: { blockedTimes: blockedTime } },
        { new: true, upsert: true },
      )
      .exec();

    return schedule;
  }

  /**
   * Remove a blocked time by id
   */
  async removeBlockedTime(
    doctorId: string,
    blockedTimeId: string,
  ): Promise<DoctorSchedule> {
    const schedule = await this.doctorScheduleModel
      .findOneAndUpdate(
        { doctorId },
        { $pull: { blockedTimes: { id: blockedTimeId } } },
        { new: true },
      )
      .exec();

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    return schedule;
  }

  /**
   * Get available slots for a specific date
   * This checks both weekly schedule and blocked times
   */
  async getAvailableSlots(
    doctorId: string,
    date: string,
  ): Promise<{ time: string; available: boolean }[]> {
    const schedule = await this.getSchedule(doctorId);

    // Parse date as local time to avoid timezone issues
    // date format: "2025-12-11" -> parse as local midnight, not UTC
    const targetDate = new Date(`${date}T00:00:00`);
    const dayIndex = targetDate.getDay(); // 0 = Sunday, 1 = Monday, ...

    // Find the day config
    const dayConfig = schedule.weeklySchedule.find(
      (day) => day.dayIndex === dayIndex,
    );

    if (!dayConfig || !dayConfig.isWorking) {
      // Doctor doesn't work on this day
      return [];
    }

    // Check blocked times for this date
    // Compare using date strings to avoid timezone issues
    const targetDateStr = date; // "2025-12-11" format
    const blockedOnDate = schedule.blockedTimes.filter((bt) => {
      const startDateStr = bt.startDate.split('T')[0];
      const endDateStr = bt.endDate.split('T')[0];
      return targetDateStr >= startDateStr && targetDateStr <= endDateStr;
    });

    // Build available slots
    const slots = dayConfig.timeSlots.map((slot) => {
      let available = slot.isWorking;

      // Check against blocked times
      for (const blocked of blockedOnDate) {
        if (blocked.type === 'full_day') {
          available = false;
          break;
        } else if (
          blocked.type === 'time_range' &&
          blocked.startTime &&
          blocked.endTime
        ) {
          // Check if slot time falls within blocked range
          const slotTime = slot.time;
          if (slotTime >= blocked.startTime && slotTime < blocked.endTime) {
            available = false;
            break;
          }
        }
      }

      return { time: slot.time, available };
    });

    return slots;
  }
}
