"use client";

import { ConsultType, Doctor, TimeSlot } from "@/types/appointment";
import { calculateConsultationFee, formatFee } from "@/utils/consultationFees";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  CalendarOff,
} from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";

// Doctor schedule types
interface DoctorDaySchedule {
  dayKey: string;
  dayName: string;
  dayIndex: number;
  isWorking: boolean;
  timeSlots: { time: string; isWorking: boolean }[];
}

interface BlockedTime {
  id: string;
  startDate: string;
  endDate: string;
  type: "full_day" | "time_range";
  startTime?: string;
  endTime?: string;
  reason?: string;
}

interface DoctorScheduleData {
  weeklySchedule: DoctorDaySchedule[];
  blockedTimes: BlockedTime[];
}

interface TimeSlotPickerProps {
  doctor: Doctor;
  onSelectSlot: (date: string, time: string, consultType: ConsultType, endTime: string) => void;
  onConsultTypeChange?: (consultType: ConsultType) => void;
}

export default function TimeSlotPicker({ doctor, onSelectSlot, onConsultTypeChange }: TimeSlotPickerProps) {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedEndTime, setSelectedEndTime] = useState<string>("");
  const [selectedConsultType, setSelectedConsultType] = useState<ConsultType>(ConsultType.ON_SITE);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getMonday(new Date()));
  const [duration, setDuration] = useState<30 | 60>(30);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Doctor schedule states
  const [doctorSchedule, setDoctorSchedule] = useState<DoctorScheduleData | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [availableSlotsBySchedule, setAvailableSlotsBySchedule] = useState<{ time: string; available: boolean }[]>([]);

  // Fetch doctor's working schedule (weekly + blocked times)
  useEffect(() => {
    if (!doctor._id) return;

    const fetchDoctorSchedule = async () => {
      setScheduleLoading(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/doctor-schedule/${doctor._id}`);

        if (!response.ok) {
          throw new Error("Failed to fetch doctor schedule");
        }

        const result = await response.json();
        const scheduleData = result.data || result;
        setDoctorSchedule(scheduleData);
      } catch (error) {
        console.error("Error fetching doctor schedule:", error);
        // Use default schedule if fetch fails
        setDoctorSchedule(null);
      } finally {
        setScheduleLoading(false);
      }
    };

    fetchDoctorSchedule();
  }, [doctor._id]);

  // Check if a date is a working day based on doctor's schedule
  const isWorkingDay = useCallback(
    (date: Date): boolean => {
      if (!doctorSchedule) return true; // Default: all days are working

      const dayIndex = date.getDay(); // 0 = Sunday, 1 = Monday, ...
      const dayConfig = doctorSchedule.weeklySchedule.find((day) => day.dayIndex === dayIndex);

      if (!dayConfig || !dayConfig.isWorking) return false;

      // Check if date falls within any full_day blocked time
      const dateStr = formatDate(date);
      const isFullDayBlocked = doctorSchedule.blockedTimes.some((bt) => {
        if (bt.type !== "full_day") return false;
        const startDate = bt.startDate.split("T")[0];
        const endDate = bt.endDate.split("T")[0];
        return dateStr >= startDate && dateStr <= endDate;
      });

      return !isFullDayBlocked;
    },
    [doctorSchedule]
  );

  // Get blocked time reason for a date (if any)
  const getBlockedReason = useCallback(
    (date: Date): string | null => {
      if (!doctorSchedule) return null;

      const dayIndex = date.getDay();
      const dayConfig = doctorSchedule.weeklySchedule.find((day) => day.dayIndex === dayIndex);

      if (!dayConfig || !dayConfig.isWorking) {
        return "Bác sĩ nghỉ";
      }

      const dateStr = formatDate(date);
      const blockedTime = doctorSchedule.blockedTimes.find((bt) => {
        if (bt.type !== "full_day") return false;
        const startDate = bt.startDate.split("T")[0];
        const endDate = bt.endDate.split("T")[0];
        return dateStr >= startDate && dateStr <= endDate;
      });

      return blockedTime?.reason || (blockedTime ? "Bác sĩ bận" : null);
    },
    [doctorSchedule]
  );

  // Generate available dates for the next 7 days
  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentWeekStart]);

  // Fetch booked slots when date or duration changes
  useEffect(() => {
    if (!selectedDate || !doctor._id) {
      setBookedSlots([]);
      setAvailableSlotsBySchedule([]);
      return;
    }

    const fetchSlotsData = async () => {
      setLoading(true);
      try {
        // Fetch both: booked appointments AND doctor's schedule-based availability
        const [appointmentsRes, scheduleRes] = await Promise.all([
          fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/doctor/${doctor._id}/available-slots?date=${selectedDate}&duration=${duration}`
          ),
          fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/doctor-schedule/${doctor._id}/available-slots?date=${selectedDate}`
          ),
        ]);

        // Process booked appointments
        if (appointmentsRes.ok) {
          const appointmentsData = await appointmentsRes.json();
          const bookedSlotsArray = appointmentsData.bookedSlots || [];
          setBookedSlots(bookedSlotsArray);
        } else {
          setBookedSlots([]);
        }

        // Process doctor's schedule-based availability
        if (scheduleRes.ok) {
          const scheduleData = await scheduleRes.json();
          const availableSlots = scheduleData.data || scheduleData || [];
          setAvailableSlotsBySchedule(availableSlots);
        } else {
          setAvailableSlotsBySchedule([]);
        }
      } catch (error) {
        console.error("Error fetching slots data:", error);
        toast.error("Không thể tải lịch trống của bác sĩ");
        setBookedSlots([]);
        setAvailableSlotsBySchedule([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSlotsData();
  }, [selectedDate, doctor._id, duration]);

  // Calculate end time based on start time and duration
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
  };

  const timeSlotsByPeriod = useMemo(() => {
    if (!selectedDate) {
      return {
        morning: [] as TimeSlot[],
        afternoon: [] as TimeSlot[],
      };
    }

    const now = new Date();
    const selectedDateObj = new Date(`${selectedDate}T00:00:00`);
    const isToday = formatDate(now) === selectedDate;

    // Minimum booking lead time: 1 hour (60 minutes)
    const MINIMUM_LEAD_TIME_MINUTES = 60;

    const generateSlots = (startHour: number, endHour: number) => {
      const intervalMinutes = duration;
      const slots: TimeSlot[] = [];
      const current = new Date(selectedDateObj);
      current.setHours(startHour, 0, 0, 0);

      const end = new Date(selectedDateObj);
      end.setHours(endHour, 0, 0, 0);

      while (current < end) {
        const hours = current.getHours();
        const minutes = current.getMinutes();

        // Format time as HH:MM (24h format)
        const time = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
        const endTime = calculateEndTime(time, duration);

        // Check if end time exceeds working hours
        const [endHours] = endTime.split(":").map(Number);
        if (endHours > 17 || (endHours === 17 && minutes > 0)) {
          break;
        }

        // Check if time is valid (not in the past + minimum lead time)
        let isPast = false;
        if (isToday) {
          const slotDateTime = new Date(selectedDateObj);
          slotDateTime.setHours(hours, minutes, 0, 0);

          // Calculate time difference in minutes
          const timeDifferenceMs = slotDateTime.getTime() - now.getTime();
          const timeDifferenceMinutes = timeDifferenceMs / (1000 * 60);

          // Slot is invalid if it's in the past OR less than 1 hour from now
          isPast = timeDifferenceMinutes < MINIMUM_LEAD_TIME_MINUTES;
        }

        // Check if slot is booked (from appointments)
        const isBooked = bookedSlots.includes(time);

        // Check if slot is blocked by doctor's schedule
        let isBlockedBySchedule = false;
        if (availableSlotsBySchedule.length > 0) {
          const scheduleSlot = availableSlotsBySchedule.find((s) => s.time === time);
          if (scheduleSlot && !scheduleSlot.available) {
            isBlockedBySchedule = true;
          }
        }

        slots.push({
          time,
          available: !isPast && !isBooked && !isBlockedBySchedule,
          booked: isBooked || isBlockedBySchedule,
          selected: time === selectedTime,
        });

        current.setMinutes(current.getMinutes() + intervalMinutes);
      }

      return slots;
    };

    return {
      morning: generateSlots(8, 12), // 8:00 - 11:30
      afternoon: generateSlots(13, 17), // 13:00 - 16:30
    };
  }, [selectedDate, selectedTime, duration, bookedSlots, availableSlotsBySchedule]);

  const handleDateSelect = (date: Date) => {
    const dateStr = formatDate(date);
    setSelectedDate(dateStr);
    setSelectedTime(""); // Reset time when date changes
    setSelectedEndTime("");
  };

  const handleTimeSelect = (time: string) => {
    const endTime = calculateEndTime(time, duration);
    setSelectedTime(time);
    setSelectedEndTime(endTime);

    // Call onSelectSlot immediately to update parent state
    if (selectedDate) {
      onSelectSlot(selectedDate, time, selectedConsultType, endTime);
    }
  };

  const handleDurationChange = (newDuration: 30 | 60) => {
    setDuration(newDuration);
    setSelectedTime(""); // Reset time when duration changes
    setSelectedEndTime("");
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + (direction === "next" ? 7 : -7));
    setCurrentWeekStart(newStart);
    setSelectedDate("");
    setSelectedTime("");
    setSelectedEndTime("");
  };

  const renderContent = () => (
    <>
      {/* Always show all consult types */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Hình thức khám</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[ConsultType.TELEVISIT, ConsultType.ON_SITE, ConsultType.HOME_VISIT].map((type) => {
            const isDisabled = type === ConsultType.TELEVISIT;
            return (
              <button
                key={type}
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  if (!isDisabled) {
                    setSelectedConsultType(type as ConsultType);
                    onConsultTypeChange?.(type as ConsultType);
                  }
                }}
                className={`flex-1 px-4 py-4 rounded-xl border-2 transition-all ${
                  isDisabled
                    ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                    : selectedConsultType === type
                    ? "border-primary bg-primary/10 text-primary-700 shadow-md"
                    : "border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                <div className="space-y-2">
                  <div className="font-semibold flex items-center justify-center gap-2">
                    {type === ConsultType.TELEVISIT && "Tư vấn từ xa"}
                    {type === ConsultType.ON_SITE && "Khám tại phòng khám"}
                    {type === ConsultType.HOME_VISIT && "Khám tại nhà"}
                    {/* {isDisabled && (
                      <span className="text-xs bg-gray-300 text-gray-600 px-2 py-0.5 rounded">Sắp ra mắt</span>
                    )} */}
                  </div>
                  <div className="text-xs text-gray-500">
                    {type === ConsultType.TELEVISIT && "Video call online"}
                    {type === ConsultType.ON_SITE && "Đến phòng khám"}
                    {type === ConsultType.HOME_VISIT && "Bác sĩ đến tận nơi"}
                  </div>
                  <div
                    className={`text-sm font-bold ${
                      isDisabled ? "text-gray-400" : selectedConsultType === type ? "text-primary" : "text-gray-900"
                    }`}
                  >
                    {formatFee(calculateConsultationFee(type as ConsultType, doctor.consultationFee))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Duration Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Thời gian khám</label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => handleDurationChange(30)}
            className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
              duration === 30
                ? "border-primary bg-primary/5 text-primary-700"
                : "border-gray-200 text-gray-700 hover:border-gray-300"
            }`}
          >
            <Clock className="w-5 h-5 mx-auto mb-1" />
            <div className="font-medium">30 phút</div>
          </button>
          <button
            type="button"
            onClick={() => handleDurationChange(60)}
            className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
              duration === 60
                ? "border-primary bg-primary/5 text-primary-700"
                : "border-gray-200 text-gray-700 hover:border-gray-300"
            }`}
          >
            <Clock className="w-5 h-5 mx-auto mb-1" />
            <div className="font-medium">1 giờ</div>
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Chọn ngày & giờ khám
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => navigateWeek("prev")}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              disabled={currentWeekStart <= getMonday(new Date())}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigateWeek("next")}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {scheduleLoading ? (
            <div className="col-span-7 flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="ml-2 text-sm text-gray-500">Đang tải lịch bác sĩ...</span>
            </div>
          ) : (
            weekDates.map((date) => {
              const dateStr = formatDate(date);
              const isSelected = dateStr === selectedDate;
              const isToday = formatDate(new Date()) === dateStr;
              const isPast = date < new Date() && !isToday;
              const isDoctorOff = !isWorkingDay(date);
              const blockedReason = getBlockedReason(date);
              const isDisabled = isPast || isDoctorOff;

              return (
                <button
                  key={dateStr}
                  onClick={() => !isDisabled && handleDateSelect(date)}
                  disabled={isDisabled}
                  title={blockedReason || undefined}
                  className={`p-3 rounded-lg text-center transition-all relative ${
                    isSelected
                      ? "bg-primary text-white shadow-md"
                      : isDisabled
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white border-2 border-gray-200 hover:border-primary/30"
                  }`}
                >
                  <div className="text-xs font-medium mb-1">
                    {date.toLocaleDateString("vi-VN", { weekday: "short" })}
                  </div>
                  <div className="text-lg font-semibold">{date.getDate()}</div>
                  <div className="text-xs">{date.toLocaleDateString("vi-VN", { month: "short" })}</div>
                  {isToday && !isSelected && !isDisabled && (
                    <div className="mt-1">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mx-auto" />
                    </div>
                  )}
                  {isDoctorOff && !isPast && (
                    <div className="absolute top-1 right-1">
                      <CalendarOff className="w-3 h-3 text-red-400" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {selectedDate && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Khung giờ khả dụng ({duration} phút)
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-gray-600">Đang tải lịch trống...</span>
            </div>
          ) : timeSlotsByPeriod.morning.every((s) => !s.available) &&
            timeSlotsByPeriod.afternoon.every((s) => !s.available) ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800">
                <CalendarOff className="w-5 h-5" />
                <span className="font-medium">Bác sĩ không có lịch trống vào ngày này</span>
              </div>
              <p className="mt-2 text-sm text-amber-700">
                Vui lòng chọn ngày khác hoặc liên hệ phòng khám để được hỗ trợ.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Buổi sáng</h4>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {timeSlotsByPeriod.morning.map((slot) => (
                    <TimeSlotButton
                      key={`${slot.time}-morning`}
                      slot={slot}
                      duration={duration}
                      onClick={() => slot.available && handleTimeSelect(slot.time)}
                    />
                  ))}
                  {timeSlotsByPeriod.morning.length === 0 && (
                    <span className="col-span-full text-sm text-gray-500">Không có khung giờ phù hợp</span>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Buổi chiều</h4>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {timeSlotsByPeriod.afternoon.map((slot) => (
                    <TimeSlotButton
                      key={`${slot.time}-afternoon`}
                      slot={slot}
                      duration={duration}
                      onClick={() => slot.available && handleTimeSelect(slot.time)}
                    />
                  ))}
                  {timeSlotsByPeriod.afternoon.length === 0 && (
                    <span className="col-span-full text-sm text-gray-500">Không có khung giờ phù hợp</span>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-primary rounded" />
                  <span className="text-gray-600">Đã chọn</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-300 rounded" />
                  <span className="text-gray-600">Khả dụng</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-200 rounded" />
                  <span className="text-gray-600">Đã đặt/Bận</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarOff className="w-4 h-4 text-red-400" />
                  <span className="text-gray-600">Bác sĩ nghỉ</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Selected Time Display */}
      {selectedTime && selectedEndTime && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">
                Đã chọn: {selectedTime} - {selectedEndTime}
              </p>
              <p className="text-xs text-green-600 mt-1">
                Ngày:{" "}
                {new Date(selectedDate).toLocaleDateString("vi-VN", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return <div className="space-y-6">{renderContent()}</div>;
}

function TimeSlotButton({ slot, onClick, duration }: { slot: TimeSlot; onClick: () => void; duration: number }) {
  // Calculate end time for display
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
  };

  const endTime = calculateEndTime(slot.time, duration);

  return (
    <button
      onClick={onClick}
      disabled={!slot.available || slot.booked}
      className={`px-2 py-2 rounded-lg text-xs font-medium transition-all ${
        slot.selected
          ? "bg-primary text-white shadow-md"
          : slot.booked || !slot.available
          ? "bg-gray-200 text-gray-400 cursor-not-allowed line-through"
          : "bg-white border-2 border-gray-300 text-gray-700 hover:border-primary/30"
      }`}
    >
      <div>{slot.time}</div>
      <div className="text-[10px] opacity-75">{endTime}</div>
    </button>
  );
}

// Helper functions
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}
