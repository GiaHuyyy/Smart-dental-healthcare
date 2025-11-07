"use client";

import { useState, useEffect } from "react";
import { differenceInMinutes } from "date-fns";
import appointmentService from "@/services/appointmentService";
import { Appointment, Doctor, ConsultType } from "@/types/appointment";
import { useSession } from "next-auth/react";
import { X, AlertTriangle } from "lucide-react";
import TimeSlotPicker from "./TimeSlotPicker";
import { toast } from "sonner";

interface RescheduleWithBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
  onSuccess: () => void;
}

export default function RescheduleWithBillingModal({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}: RescheduleWithBillingModalProps) {
  const { data: session } = useSession();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedEndTime, setSelectedEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showWarning, setShowWarning] = useState(false);
  const [feeAmount, setFeeAmount] = useState(0);

  // Get doctor info from appointment
  const doctor = typeof appointment.doctorId === "object" ? (appointment.doctorId as Doctor) : null;

  useEffect(() => {
    if (isOpen && appointment) {
      // Check if within 30 minutes
      const appointmentDateTime = new Date(appointment.appointmentDate);
      const [hours, minutes] = appointment.startTime.split(":");
      appointmentDateTime.setHours(parseInt(hours), parseInt(minutes));

      const minutesUntil = differenceInMinutes(appointmentDateTime, new Date());
      const isNearTime = minutesUntil < 30 && minutesUntil > 0;

      setShowWarning(isNearTime);
      setFeeAmount(isNearTime ? 50000 : 0);
    }
  }, [isOpen, appointment]);

  if (!isOpen || !doctor) return null;

  const handleSelectSlot = (date: string, time: string, _type: ConsultType, endTime: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setSelectedEndTime(endTime);
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      setError("Vui lòng chọn ngày giờ mới");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (!appointment._id) {
        throw new Error("ID lịch hẹn không hợp lệ");
      }

      const result = await appointmentService.rescheduleWithBilling(appointment._id, {
        appointmentDate: selectedDate,
        startTime: selectedTime,
        endTime: selectedEndTime,
        duration: 30,
        userId: session?.user?._id || "",
        notes: "",
      });

      if (result.success) {
        toast.success(
          result.data?.feeCharged
            ? `Đổi lịch thành công! Phí đặt chỗ: ${result.data.feeAmount.toLocaleString("vi-VN")} VND`
            : "Đổi lịch thành công!"
        );
        onSuccess();
        onClose();
      } else {
        setError(result.error || "Đổi lịch thất bại");
      }
    } catch (err) {
      setError("Có lỗi xảy ra khi đổi lịch");
      console.error(err);
    } finally {
      setLoading(false);
    }
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
          {/* Warning for near-time reschedule */}
          {showWarning && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-400 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-bold text-red-900 text-lg mb-2">⚠️ Đổi lịch cận giờ</h4>
                  <div className="space-y-2 text-sm text-red-800">
                    <p>
                      Đổi lịch lúc này sẽ bị trừ{" "}
                      <strong className="text-red-900">{feeAmount.toLocaleString("vi-VN")} VND</strong> phí giữ chỗ.
                    </p>
                    <div className="pl-4 border-l-2 border-red-300 space-y-1">
                      <p>• Hệ thống sẽ tạo bill mới cho bác sĩ cộng tiền phí này</p>
                      <p>• Hệ thống sẽ tạo bill mới trừ tiền phí này từ tài khoản của bạn</p>
                    </div>
                    <p className="mt-2 font-medium">Bạn có chắc chắn muốn tiếp tục?</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

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
              onClick={handleSubmit}
              disabled={!selectedDate || !selectedTime || loading}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Đang xử lý..." : "Xác nhận thay đổi"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
