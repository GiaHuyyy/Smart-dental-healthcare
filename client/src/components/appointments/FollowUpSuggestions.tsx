"use client";

import { useEffect, useState, useCallback } from "react";
import appointmentService from "@/services/appointmentService";
import { Appointment, AppointmentStatus } from "@/types/appointment";
import { useSession } from "next-auth/react";
import { Calendar, Clock, Gift, User } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export default function FollowUpSuggestions() {
  const { data: session } = useSession();
  const [suggestions, setSuggestions] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSuggestions = useCallback(async () => {
    try {
      if (!session?.user?._id) return;

      const result = await appointmentService.getFollowUpSuggestions(session.user._id);

      if (result.success && result.data) {
        setSuggestions(result.data);
      }
    } catch (error) {
      console.error("Load follow-up suggestions error:", error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?._id]);

  useEffect(() => {
    if (session?.user?._id) {
      loadSuggestions();
    }
  }, [session?.user?._id, loadSuggestions]);

  const handleAccept = async (appointmentId: string) => {
    try {
      // Update appointment status to confirmed
      const result = await appointmentService.updateAppointmentStatus(appointmentId, AppointmentStatus.CONFIRMED);

      if (result.success) {
        alert("Đã xác nhận lịch tái khám!");
        loadSuggestions();
      } else {
        alert("Có lỗi xảy ra khi xác nhận lịch");
      }
    } catch (error) {
      console.error("Accept follow-up error:", error);
      alert("Có lỗi xảy ra");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Chưa có đề xuất tái khám nào</p>
        <p className="text-sm text-gray-500 mt-1">Bác sĩ sẽ tạo đề xuất tái khám sau khi hoàn tất điều trị</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Đề xuất tái khám</h3>
        <span className="text-sm text-gray-500">{suggestions.length} đề xuất</span>
      </div>

      <div className="grid gap-4">
        {suggestions.map((appointment) => {
          const doctor = typeof appointment.doctorId === "object" && appointment.doctorId ? appointment.doctorId : null;

          return (
            <div
              key={appointment._id}
              className="border-2 border-green-200 rounded-xl p-5 bg-gradient-to-br from-green-50 to-blue-50"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full">
                      Giảm giá 5%
                    </span>
                  </div>

                  <h4 className="font-bold text-lg text-gray-900">Lịch tái khám</h4>
                </div>
              </div>

              {doctor && (
                <div className="flex items-center gap-2 mb-3 text-gray-700">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">{doctor.fullName}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    {format(new Date(appointment.appointmentDate), "dd/MM/yyyy", {
                      locale: vi,
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-gray-700">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{appointment.startTime}</span>
                </div>
              </div>

              {appointment.notes && (
                <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Lý do tái khám</p>
                  <p className="text-sm text-gray-700">{appointment.notes}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => appointment._id && handleAccept(appointment._id)}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                >
                  ✓ Xác nhận tái khám
                </button>
                <button className="px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors">
                  Đổi lịch
                </button>
              </div>

              <p className="text-xs text-center text-gray-500 mt-3">
                💰 Mã voucher giảm giá 5% đã được gửi vào email của bạn
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
