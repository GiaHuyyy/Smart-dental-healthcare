"use client";

import { useState, useEffect } from "react";
import { format, addDays, startOfDay } from "date-fns";
import { vi } from "date-fns/locale";
import appointmentService from "@/services/appointmentService";
import { useSession } from "next-auth/react";
import { Appointment } from "@/types/appointment";
import { X, Calendar, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ScheduleFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
  onSuccess: () => void;
}

export default function ScheduleFollowUpModal({ isOpen, onClose, appointment, onSuccess }: ScheduleFollowUpModalProps) {
  const { data: session } = useSession();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const doctor = typeof appointment.doctorId === "object" ? appointment.doctorId : null;

  // Initialize with suggested date/time if available
  useEffect(() => {
    if (appointment.suggestedFollowUpDate) {
      setSelectedDate(format(new Date(appointment.suggestedFollowUpDate), "yyyy-MM-dd"));
    } else {
      // Default to 7 days from now
      setSelectedDate(format(addDays(new Date(), 7), "yyyy-MM-dd"));
    }

    if (appointment.suggestedFollowUpTime) {
      setSelectedTime(appointment.suggestedFollowUpTime);
    }
  }, [appointment]);

  // Fetch available time slots when date changes
  useEffect(() => {
    if (selectedDate && doctor?._id) {
      fetchAvailableSlots(selectedDate, doctor._id);
    }
  }, [selectedDate, doctor?._id]);

  const fetchAvailableSlots = async (date: string, doctorId: string) => {
    setLoadingSlots(true);
    try {
      const result = await appointmentService.getAvailableSlots(doctorId, date);
      if (result.success && result.data) {
        setAvailableSlots(result.data);
      } else {
        // If API doesn't return slots, provide default slots
        const defaultSlots = [
          "08:00",
          "08:30",
          "09:00",
          "09:30",
          "10:00",
          "10:30",
          "11:00",
          "13:00",
          "13:30",
          "14:00",
          "14:30",
          "15:00",
          "15:30",
          "16:00",
        ];
        setAvailableSlots(defaultSlots);
      }
    } catch (error) {
      console.error("Error fetching slots:", error);
      // Provide default slots on error
      const defaultSlots = [
        "08:00",
        "08:30",
        "09:00",
        "09:30",
        "10:00",
        "10:30",
        "11:00",
        "13:00",
        "13:30",
        "14:00",
        "14:30",
        "15:00",
        "15:30",
        "16:00",
      ];
      setAvailableSlots(defaultSlots);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate || !selectedTime) {
      toast.error("Vui lòng chọn ngày và giờ khám");
      return;
    }

    if (!appointment._id) {
      toast.error("Không tìm thấy thông tin lịch hẹn");
      return;
    }

    setLoading(true);

    try {
      // Build appointment payload and create a new appointment, then mark the follow-up suggestion as scheduled
      const patientIdRaw = (appointment as any).patientId;
      const patientId =
        typeof patientIdRaw === "object" ? patientIdRaw?._id || patientIdRaw?.id || "" : (patientIdRaw as string) || "";

      if (!patientId) {
        toast.error("Không tìm thấy thông tin bệnh nhân");
        setLoading(false);
        return;
      }

      const doctorIdRaw = (appointment as any).doctorId;
      const doctorId =
        typeof doctorIdRaw === "object" ? doctorIdRaw?._id || doctorIdRaw?.id || "" : (doctorIdRaw as string) || "";

      if (!doctorId) {
        toast.error("Không tìm thấy thông tin bác sĩ");
        setLoading(false);
        return;
      }

      // Calculate end time (30 minutes duration)
      const [h, m] = selectedTime.split(":").map(Number);
      const totalMinutes = h * 60 + m + 30;
      const endH = Math.floor(totalMinutes / 60) % 24;
      const endM = totalMinutes % 60;
      const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

      const payload = {
        patientId,
        doctorId,
        appointmentDate: selectedDate,
        startTime: selectedTime,
        endTime: endTime,
        duration: 30,
        consultationFee: (doctor as any)?.consultationFee || 0,
        appointmentType: (appointment.appointmentType as string) || "Khám tái",
        notes: appointment.notes || "",
      };

      const accessToken = session?.access_token || (session as any)?.accessToken;

      const createResult = await appointmentService.createAppointment(payload, accessToken);

      if (!createResult.success || !createResult.data) {
        toast.error(createResult.error || "Không thể tạo lịch tái khám. Vui lòng thử lại.");
        setLoading(false);
        return;
      }

      const createdAppointmentId = createResult.data._id || (createResult.data as any).id;

      // Mark the follow-up suggestion as scheduled
      const markResult = await appointmentService.markFollowUpAsScheduled(
        appointment._id,
        createdAppointmentId,
        accessToken
      );

      if (markResult.success) {
        toast.success("Đã đặt lịch tái khám thành công!");
        onSuccess();
        onClose();
      } else {
        toast.error(markResult.error || "Không thể đánh dấu đề xuất là đã lên lịch");
      }
    } catch (error) {
      console.error("Schedule follow-up error:", error);
      toast.error("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!appointment._id) return;

    if (!confirm("Bạn có chắc chắn muốn từ chối đề xuất tái khám này?")) {
      return;
    }

    setLoading(true);

    try {
      const result = await appointmentService.rejectFollowUpSuggestion(appointment._id);

      if (result.success) {
        toast.success("Đã từ chối đề xuất tái khám");
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || "Không thể từ chối đề xuất");
      }
    } catch (error) {
      console.error("Reject follow-up error:", error);
      toast.error("Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Lên lịch tái khám
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors" disabled={loading}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Doctor Info */}
          {doctor && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Bác sĩ</p>
              <p className="text-sm font-medium text-gray-900">{doctor.fullName}</p>
              {doctor.specialty && <p className="text-xs text-gray-600 mt-1">{doctor.specialty}</p>}
            </div>
          )}

          {/* Discount Notice */}
          <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
            <p className="text-sm font-semibold text-green-800 mb-1">🎁 Ưu đãi giảm giá 5%</p>
            <p className="text-xs text-green-700">
              Lịch tái khám của bạn sẽ được giảm giá 5% khi xác nhận. Voucher giảm giá đã được gửi vào email.
            </p>
          </div>

          {/* Suggested Time Notice */}
          {(appointment.suggestedFollowUpDate || appointment.suggestedFollowUpTime) && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800 mb-1">Đề xuất từ bác sĩ</p>
                  <div className="text-xs text-blue-700 space-y-1">
                    {appointment.suggestedFollowUpDate && (
                      <p>
                        📅 Ngày:{" "}
                        {format(new Date(appointment.suggestedFollowUpDate), "dd/MM/yyyy (EEEE)", { locale: vi })}
                      </p>
                    )}
                    {appointment.suggestedFollowUpTime && <p>🕐 Giờ: {appointment.suggestedFollowUpTime}</p>}
                    <p className="italic mt-2">Bạn có thể chọn thời gian khác nếu muốn.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reason */}
          {appointment.notes && (
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Lý do tái khám</p>
              <p className="text-sm text-gray-700">{appointment.notes}</p>
            </div>
          )}

          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chọn ngày khám <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={format(startOfDay(new Date()), "yyyy-MM-dd")}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              required
              disabled={loading}
            />
          </div>

          {/* Time Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chọn giờ khám <span className="text-red-500">*</span>
            </label>

            {loadingSlots ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedTime === slot
                        ? "bg-primary text-white ring-2 ring-primary ring-offset-2"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    disabled={loading}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}

            {selectedTime && (
              <p className="text-xs text-gray-600 mt-2">
                <Clock className="w-3 h-3 inline mr-1" />
                Đã chọn: {selectedTime} (Thời gian khám: 30 phút)
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleReject}
              className="px-4 py-2.5 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              Từ chối
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !selectedDate || !selectedTime}
            >
              {loading ? "Đang xử lý..." : "Xác nhận đặt lịch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
