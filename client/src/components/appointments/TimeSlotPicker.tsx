"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from "lucide-react";
import { Doctor, TimeSlot, ConsultType } from "@/types/appointment";

interface TimeSlotPickerProps {
  doctor: Doctor;
  onSelectSlot: (date: string, time: string, consultType: ConsultType) => void;
}

export default function TimeSlotPicker({ doctor, onSelectSlot }: TimeSlotPickerProps) {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedConsultType, setSelectedConsultType] = useState<ConsultType>(ConsultType.ON_SITE);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getMonday(new Date()));

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

  const timeSlotsByPeriod = useMemo(() => {
    if (!selectedDate) {
      return {
        morning: [] as TimeSlot[],
        afternoon: [] as TimeSlot[],
      };
    }

    const baseDate = new Date(`${selectedDate}T00:00:00`);

    const generateSlots = (startHour: number, endHour: number) => {
      const intervalMinutes = 30;
      const slots: TimeSlot[] = [];
      const current = new Date(baseDate);
      current.setHours(startHour, 0, 0, 0);

      const end = new Date(baseDate);
      end.setHours(endHour, 0, 0, 0);

      while (current < end) {
        const time = current.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        slots.push({
          time,
          available: Math.random() > 0.3,
          booked: false,
          selected: time === selectedTime,
        });

        current.setMinutes(current.getMinutes() + intervalMinutes);
      }

      return slots;
    };

    return {
      morning: generateSlots(8, 12),
      afternoon: generateSlots(13, 17),
    };
  }, [selectedDate, selectedTime]);

  const handleDateSelect = (date: Date) => {
    const dateStr = formatDate(date);
    setSelectedDate(dateStr);
    setSelectedTime(""); // Reset time when date changes
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    // Auto-trigger selection when both date and time are selected
    if (selectedDate) {
      onSelectSlot(selectedDate, time, selectedConsultType);
    }
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + (direction === "next" ? 7 : -7));
    setCurrentWeekStart(newStart);
    setSelectedDate("");
    setSelectedTime("");
  };

  // const renderHeader = () => (
  //   <div
  //     className={`flex items-start justify-between gap-4 ${
  //       embedded ? "px-6 pt-6 pb-6" : "sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl"
  //     }`}
  //   >
  //     <div className="flex items-start gap-4">
  //       <Image
  //         src={doctor.profileImage || "/api/placeholder/60/60"}
  //         alt={doctor.fullName}
  //         width={60}
  //         height={60}
  //         className="w-15 h-15 rounded-full object-cover"
  //       />
  //       <div>
  //         <h2 className="text-xl font-semibold text-gray-900">{doctor.fullName}</h2>
  //         <p className="text-primary font-medium">{doctor.specialty}</p>
  //         {doctor.clinicName && <p className="text-sm text-gray-600">{doctor.clinicName}</p>}
  //         {doctor.clinicAddress && <p className="text-sm text-gray-500 mt-1">{doctor.clinicAddress}</p>}
  //       </div>
  //     </div>
  //     {showCloseButton && (
  //       <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
  //         <X className="w-6 h-6 text-gray-600" />
  //       </button>
  //     )}
  //   </div>
  // );

  const renderContent = () => (
    <>
      {doctor.availableConsultTypes && doctor.availableConsultTypes.length > 1 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Loại tư vấn</label>
          <div className="flex gap-3">
            {doctor.availableConsultTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedConsultType(type as ConsultType)}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                  selectedConsultType === type
                    ? "border-primary bg-primary/5 text-primary-700"
                    : "border-gray-200 text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="font-medium">
                  {type === ConsultType.TELEVISIT && "Từ xa"}
                  {type === ConsultType.ON_SITE && "Tại phòng khám"}
                  {type === ConsultType.HOME_VISIT && "Khám tại nhà"}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

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
          {weekDates.map((date) => {
            const dateStr = formatDate(date);
            const isSelected = dateStr === selectedDate;
            const isToday = formatDate(new Date()) === dateStr;
            const isPast = date < new Date() && !isToday;

            return (
              <button
                key={dateStr}
                onClick={() => !isPast && handleDateSelect(date)}
                disabled={isPast}
                className={`p-3 rounded-lg text-center transition-all ${
                  isSelected
                    ? "bg-primary text-white shadow-md"
                    : isPast
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white border-2 border-gray-200 hover:border-primary/30"
                }`}
              >
                <div className="text-xs font-medium mb-1">{date.toLocaleDateString("vi-VN", { weekday: "short" })}</div>
                <div className="text-lg font-semibold">{date.getDate()}</div>
                <div className="text-xs">{date.toLocaleDateString("vi-VN", { month: "short" })}</div>
                {isToday && !isSelected && (
                  <div className="mt-1">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mx-auto" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Khung giờ khả dụng
          </h3>

          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Buổi sáng</h4>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {timeSlotsByPeriod.morning.map((slot) => (
                <TimeSlotButton
                  key={`${slot.time}-morning`}
                  slot={slot}
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
                  onClick={() => slot.available && handleTimeSelect(slot.time)}
                />
              ))}
              {timeSlotsByPeriod.afternoon.length === 0 && (
                <span className="col-span-full text-sm text-gray-500">Không có khung giờ phù hợp</span>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-4 text-sm">
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
              <span className="text-gray-600">Đã đặt</span>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return <div className="space-y-6">{renderContent()}</div>;
}

function TimeSlotButton({ slot, onClick }: { slot: TimeSlot; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={!slot.available || slot.booked}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        slot.selected
          ? "bg-primary text-white shadow-md"
          : slot.booked || !slot.available
          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
          : "bg-white border-2 border-gray-300 text-gray-700 hover:border-primary/30"
      }`}
    >
      {slot.time}
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
