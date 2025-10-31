"use client";

import { useState, useEffect } from "react";
import { differenceInMinutes } from "date-fns";
import appointmentService from "@/services/appointmentService";
import { Appointment } from "@/types/appointment";
import { X, AlertTriangle } from "lucide-react";

interface CancelWithBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
  onSuccess: () => void;
  userRole: "patient" | "doctor";
}

export default function CancelWithBillingModal({
  isOpen,
  onClose,
  appointment,
  onSuccess,
  userRole,
}: CancelWithBillingModalProps) {
  const [reason, setReason] = useState("");
  const [doctorReason, setDoctorReason] = useState<"emergency" | "patient_late" | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showWarning, setShowWarning] = useState(false);
  const [feeAmount, setFeeAmount] = useState(0);

  useEffect(() => {
    if (isOpen && appointment && userRole === "patient") {
      // Check if within 30 minutes for patient cancellation
      const appointmentDateTime = new Date(appointment.appointmentDate);
      const [hours, minutes] = appointment.startTime.split(":");
      appointmentDateTime.setHours(parseInt(hours), parseInt(minutes));

      const minutesUntil = differenceInMinutes(appointmentDateTime, new Date());
      const isNearTime = minutesUntil < 30 && minutesUntil > 0;

      setShowWarning(isNearTime);
      setFeeAmount(isNearTime ? 100000 : 0);
    }
  }, [isOpen, appointment, userRole]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      setError("Vui lòng nhập lý do hủy lịch");
      return;
    }

    if (userRole === "doctor" && !doctorReason) {
      setError("Vui lòng chọn lý do hủy");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (!appointment._id) {
        throw new Error("ID lịch hẹn không hợp lệ");
      }

      const result = await appointmentService.cancelWithBilling(appointment._id, {
        reason,
        cancelledBy: userRole,
        doctorReason: doctorReason || undefined,
      });

      if (result.success) {
        let message = "Hủy lịch thành công!";

        if (result.data?.feeCharged) {
          message += `\nPhí đặt chỗ: ${result.data.feeAmount.toLocaleString("vi-VN")} VND`;
        }

        if (result.data?.refundIssued) {
          message += "\nPhí khám đã được hoàn lại.";
        }

        if (result.data?.voucherCreated) {
          message += "\nĐã tạo voucher giảm giá 5% cho bệnh nhân!";
        }

        alert(message);
        onSuccess();
        onClose();
      } else {
        setError(result.error || "Hủy lịch thất bại");
      }
    } catch (err) {
      setError("Có lỗi xảy ra khi hủy lịch");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Get display name based on user role
  const displayName =
    userRole === "doctor"
      ? typeof appointment.patientId === "object"
        ? appointment.patientId.fullName
        : "bệnh nhân"
      : typeof appointment.doctor === "object"
      ? appointment.doctor.fullName
      : "bác sĩ";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Xác nhận hủy lịch</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="mb-6">
          {/* Warning for near-time cancellation (Patient only) */}
          {userRole === "patient" && showWarning && (
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-400 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-bold text-red-900 text-lg mb-2">⚠️ Hủy lịch cận giờ</h4>
                  <div className="space-y-2 text-sm text-red-800">
                    <p>
                      Hủy lúc này sẽ bị trừ{" "}
                      <strong className="text-red-900">{feeAmount.toLocaleString("vi-VN")} VND</strong> phí giữ chỗ.
                    </p>
                    <div className="pl-4 border-l-2 border-red-300 space-y-1">
                      <p>• Hệ thống sẽ tạo bill mới cho bác sĩ cộng tiền phí này</p>
                      <p>• Hệ thống sẽ tạo bill mới trừ tiền phí này từ tài khoản của bạn</p>
                    </div>
                    <p className="mt-2">
                      <strong className="text-green-800">✓ Bạn sẽ được hoàn 100% phí khám</strong> (nếu đã thanh toán,
                      hệ thống sẽ tạo bill mới cộng tiền khám lại cho bạn)
                    </p>
                    <p className="mt-2 font-medium text-red-900">Bạn có chắc chắn muốn tiếp tục?</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info for normal cancellation (>= 30 minutes) */}
          {userRole === "patient" && !showWarning && (
            <div className="mb-4 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 flex items-center justify-center bg-green-500 rounded-full text-white font-bold flex-shrink-0 mt-0.5">
                  ✓
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-green-900 text-lg mb-2">Hủy lịch an toàn</h4>
                  <div className="space-y-2 text-sm text-green-800">
                    <p>
                      <strong className="text-green-900">✓ Bạn sẽ được hoàn 100% phí khám</strong>
                    </p>
                    <p className="pl-4 border-l-2 border-green-300">
                      Nếu đã thanh toán, hệ thống sẽ tạo bill mới cộng tiền khám lại cho bạn
                    </p>
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

          <p className="text-gray-600 mb-4">
            Bạn có chắc chắn muốn hủy lịch hẹn với <strong>{displayName}</strong> vào{" "}
            <strong>
              {new Date(appointment.appointmentDate).toLocaleDateString("vi-VN")} lúc {appointment.startTime}
            </strong>
            ?
          </p>

          {/* Doctor reason selection */}
          {userRole === "doctor" && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loại hủy <span className="text-red-500">*</span>
              </label>
              <select
                value={doctorReason}
                onChange={(e) => setDoctorReason(e.target.value as "emergency" | "patient_late" | "")}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Chọn lý do hủy</option>
                <option value="emergency">Khẩn cấp của bác sĩ (tạo voucher 5% cho bệnh nhân)</option>
                <option value="patient_late">Bệnh nhân đến muộn (tính phí bệnh nhân)</option>
              </select>

              {doctorReason === "emergency" && (
                <p className="mt-2 text-sm text-green-700 bg-green-50 p-2 rounded">
                  ✓ Bệnh nhân sẽ nhận voucher giảm giá 5% cho lần khám tiếp theo
                </p>
              )}

              {doctorReason === "patient_late" && (
                <p className="mt-2 text-sm text-orange-700 bg-orange-50 p-2 rounded">
                  ⚠ Bệnh nhân sẽ bị tính phí đặt chỗ 100,000 VND
                </p>
              )}
            </div>
          )}

          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lý do hủy <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Vui lòng cho biết lý do bạn muốn hủy lịch hẹn này..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            rows={4}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            disabled={loading}
          >
            Đóng
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason.trim() || loading || (userRole === "doctor" && !doctorReason)}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Đang hủy..." : "Xác nhận hủy"}
          </button>
        </div>
      </div>
    </div>
  );
}
