"use client";

import { Star, X } from "lucide-react";
import { useState } from "react";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorName: string;
  doctorId: string;
  appointmentId: string;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  initialRating?: number;
  initialComment?: string;
  isEditing?: boolean;
  warningMessage?: string;
}

export default function ReviewModal({
  isOpen,
  onClose,
  doctorName,
  doctorId,
  appointmentId,
  onSubmit,
  initialRating = 5,
  initialComment = "",
  isEditing = false,
  warningMessage,
}: ReviewModalProps) {
  const [rating, setRating] = useState(initialRating);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState(initialComment);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!comment.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(rating, comment.trim());
      // Reset form
      setRating(5);
      setComment("");
      onClose();
    } catch (error) {
      console.error("Review submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingLabel = (value: number) => {
    switch (value) {
      case 1:
        return "Rất không hài lòng";
      case 2:
        return "Không hài lòng";
      case 3:
        return "Trung bình";
      case 4:
        return "Hài lòng";
      case 5:
        return "Rất hài lòng";
      default:
        return "";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {isEditing ? "Chỉnh sửa đánh giá" : "Đánh giá bác sĩ"}
            </h3>
            <p className="text-sm text-gray-600 mt-1">{doctorName}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Warning Message for Edit */}
        {isEditing && warningMessage && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className="text-sm text-amber-900 font-medium">{warningMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Star Rating */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-3">Đánh giá của bạn</label>
            <div className="flex items-center justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  disabled={isSubmitting}
                  className="p-2 transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      star <= (hoveredRating || rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-sm font-medium text-gray-700">{getRatingLabel(hoveredRating || rating)}</p>
          </div>

          {/* Comment */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Nhận xét chi tiết <span className="text-red-500">*</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Chia sẻ trải nghiệm của bạn về bác sĩ..."
              required
              disabled={isSubmitting}
              rows={5}
              maxLength={500}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none disabled:bg-gray-50 disabled:text-gray-500"
            />
            <p className="text-right text-xs text-gray-500 mt-1">{comment.length}/500</p>
          </div>

          {/* Info Box */}
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className="text-xs text-blue-900">
                Đánh giá của bạn sẽ giúp bệnh nhân khác có thêm thông tin khi lựa chọn bác sĩ.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!comment.trim() || isSubmitting}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (isEditing ? "Đang cập nhật..." : "Đang gửi...") : (isEditing ? "Cập nhật đánh giá" : "Gửi đánh giá")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
