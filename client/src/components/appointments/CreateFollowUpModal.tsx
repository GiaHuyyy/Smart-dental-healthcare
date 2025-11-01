"use client";

import { useState } from "react";
import { format, addDays } from "date-fns";
import appointmentService from "@/services/appointmentService";
import { Appointment } from "@/types/appointment";
import { X, Gift } from "lucide-react";
import { toast } from "sonner";

interface CreateFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
  onSuccess: () => void;
}

export default function CreateFollowUpModal({ isOpen, onClose, appointment, onSuccess }: CreateFollowUpModalProps) {
  const [suggestedDate, setSuggestedDate] = useState(
    format(addDays(new Date(), 7), "yyyy-MM-dd") // Default 7 days later
  );
  const [suggestedTime, setSuggestedTime] = useState("09:00");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!appointment._id) {
        throw new Error("ID lịch hẹn không hợp lệ");
      }

      const result = await appointmentService.createFollowUpSuggestion({
        parentAppointmentId: appointment._id,
        suggestedDate,
        suggestedTime,
        notes,
      });

      if (result.success) {
        toast.success(`Tạo đề xuất tái khám thành công!\nMã voucher: ${result.data?.voucher.code}\nGiảm giá: 5%`);
        onSuccess();
        onClose();
      } else {
        setError(result.error || "Tạo đề xuất thất bại");
      }
    } catch (err) {
      setError("Có lỗi xảy ra khi tạo đề xuất");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <Gift className="w-6 h-6" />
            Tạo đề xuất tái khám
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Gift className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-800">Ưu đãi tái khám</p>
                <p className="text-sm text-green-700 mt-1">
                  Bệnh nhân sẽ tự động nhận voucher giảm giá <strong className="text-green-900">5%</strong> khi bạn tạo
                  đề xuất tái khám.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Bệnh nhân</p>
              <p className="text-sm font-medium text-gray-900">
                {typeof appointment.patientId === "object" && appointment.patientId !== null
                  ? appointment.patientId.fullName || "N/A"
                  : "N/A"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Ngày đề xuất <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={suggestedDate}
                onChange={(e) => setSuggestedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                min={format(addDays(new Date(), 1), "yyyy-MM-dd")}
              />
              <p className="text-xs text-gray-500 mt-1">Ngày tái khám nên sau ít nhất 1 ngày</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Giờ đề xuất <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={suggestedTime}
                onChange={(e) => setSuggestedTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Lý do và hướng dẫn <span className="text-red-500">*</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="VD: Tái khám kiểm tra sau điều trị, theo dõi diễn biến..."
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
            )}

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>📧 Thông báo:</strong> Bệnh nhân sẽ nhận được thông báo qua email và app với mã voucher giảm giá
                5%.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                disabled={loading}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-colors"
                disabled={loading}
              >
                {loading ? "Đang tạo..." : "Tạo đề xuất"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
