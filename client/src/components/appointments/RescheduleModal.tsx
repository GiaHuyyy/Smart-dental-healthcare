"use client";

import { Appointment, Doctor } from "@/types/appointment";
import { X } from "lucide-react";
import TimeSlotPicker from "./TimeSlotPicker";
import { useState } from "react";
import { ConsultType } from "@/types/appointment";

interface RescheduleModalProps {
  appointment: Appointment; // Keep for future use
  doctor: Doctor;
  onClose: () => void;
  onConfirm: (newDate: string, newTime: string, newEndTime: string) => void;
}

export default function RescheduleModal({ doctor, onClose, onConfirm }: RescheduleModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedEndTime, setSelectedEndTime] = useState<string>("");

  const handleSelectSlot = (date: string, time: string, _type: ConsultType, endTime: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setSelectedEndTime(endTime);
  };

  const handleConfirm = () => {
    if (!selectedDate || !selectedTime || !selectedEndTime) {
      return;
    }
    onConfirm(selectedDate, selectedTime, selectedEndTime);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full my-8">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-semibold text-gray-900">Thay đổi lịch khám</h3>
            <p className="text-sm text-gray-500 mt-1">Chọn ngày giờ mới cho lịch hẹn với {doctor.fullName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="p-6">
          <TimeSlotPicker doctor={doctor} onSelectSlot={handleSelectSlot} />
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 rounded-b-2xl">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedDate || !selectedTime}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Xác nhận thay đổi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
