"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { getSession } from "next-auth/react";
import { toast } from "sonner";

interface CreateFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Can be either medical record or appointment
  medicalRecord?: {
    _id: string;
    recordDate: string;
    appointmentId?: string | { _id: string };
  };
  appointment?: {
    _id?: string;
    id: string;
    date: string;
  };
  patientName: string;
  onSuccess?: () => void;
}

export default function CreateFollowUpModal({
  isOpen,
  onClose,
  medicalRecord,
  appointment,
  patientName,
  onSuccess,
}: CreateFollowUpModalProps) {
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    // Extract appointmentId - either from medicalRecord or appointment
    let appointmentId: string | undefined;

    if (medicalRecord && medicalRecord.appointmentId) {
      appointmentId =
        typeof medicalRecord.appointmentId === "string" ? medicalRecord.appointmentId : medicalRecord.appointmentId._id;
    } else if (appointment) {
      appointmentId = appointment._id || appointment.id;
    }

    if (!appointmentId) {
      toast.error("Không tìm thấy appointment ID");
      return;
    }

    if (!notes.trim()) {
      toast.error("Vui lòng nhập ghi chú tái khám");
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await getSession();
      const token = (session as { access_token?: string })?.access_token;

      const payload = {
        parentAppointmentId: appointmentId,
        notes: notes,
      };

      const apiUrl = `${
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081"
      }/api/v1/appointments/follow-up/create-suggestion`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Không thể tạo đề xuất tái khám");
      }

      toast.success("Đã gửi đề xuất tái khám cho bệnh nhân");

      // Reset form
      setNotes("");

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }

      // Close modal
      onClose();
    } catch (error) {
      console.error("Error creating follow-up:", error);
      toast.error(error instanceof Error ? error.message : "Không thể tạo đề xuất tái khám");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setNotes("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Đề xuất tái khám</h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600" disabled={isSubmitting}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bệnh nhân</label>
            <input
              type="text"
              value={patientName}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hồ sơ khám</label>
            <input
              type="text"
              value={
                medicalRecord
                  ? `Khám ngày ${new Date(medicalRecord.recordDate).toLocaleDateString("vi-VN")}`
                  : appointment
                  ? `Hẹn ngày ${new Date(appointment.date).toLocaleDateString("vi-VN")}`
                  : ""
              }
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ghi chú tái khám <span className="text-red-500">*</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Lý do tái khám, lời dặn cho bệnh nhân..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-sm text-green-700">
              🎁 Bệnh nhân sẽ tự động nhận <strong>voucher giảm giá 5%</strong> khi đề xuất được tạo
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !notes.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Đang gửi..." : "Gửi đề xuất"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
