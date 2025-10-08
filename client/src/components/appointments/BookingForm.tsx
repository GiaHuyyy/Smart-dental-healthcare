"use client";

import React, { useState } from "react";
import { User, Calendar, Phone, Mail, AlertCircle } from "lucide-react";
import { BookingFormData, ConsultType } from "@/types/appointment";

interface BookingFormProps {
  initialData?: Partial<BookingFormData>;
  onSubmit: (data: BookingFormData) => void;
  onCancel: () => void;
}

export default function BookingForm({ initialData, onSubmit, onCancel }: BookingFormProps) {
  const [formData, setFormData] = useState<BookingFormData>({
    doctorId: initialData?.doctorId || "",
    appointmentDate: initialData?.appointmentDate || "",
    startTime: initialData?.startTime || "",
    consultType: initialData?.consultType || ConsultType.ON_SITE,
    bookForSelf: true,
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof BookingFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.bookForSelf) {
      if (!formData.patientFirstName?.trim()) {
        newErrors.patientFirstName = "Vui lòng nhập tên bệnh nhân";
      }
      if (!formData.patientLastName?.trim()) {
        newErrors.patientLastName = "Vui lòng nhập họ bệnh nhân";
      }
      if (!formData.patientDOB) {
        newErrors.patientDOB = "Vui lòng nhập ngày sinh";
      }
      if (!formData.patientGender) {
        newErrors.patientGender = "Vui lòng chọn giới tính";
      }

      // Guardian details required for minors
      const age = formData.patientDOB ? calculateAge(formData.patientDOB) : 0;
      if (age < 18) {
        if (!formData.guardianName?.trim()) {
          newErrors.guardianName = "Vui lòng nhập tên người giám hộ";
        }
        if (!formData.guardianPhone?.trim()) {
          newErrors.guardianPhone = "Vui lòng nhập số điện thoại người giám hộ";
        }
        if (!formData.guardianEmail?.trim()) {
          newErrors.guardianEmail = "Vui lòng nhập email người giám hộ";
        }
        if (!formData.guardianRelationship?.trim()) {
          newErrors.guardianRelationship = "Vui lòng nhập mối quan hệ";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const isMinor = formData.patientDOB ? calculateAge(formData.patientDOB) < 18 : false;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Book For Selection */}
      <div className="healthcare-card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Đặt lịch cho</h3>
        <div className="flex gap-4">
          <label className="flex-1 relative">
            <input
              type="radio"
              name="bookFor"
              checked={formData.bookForSelf}
              onChange={() => handleInputChange("bookForSelf", true)}
              className="peer sr-only"
            />
            <div className="cursor-pointer p-4 border-2 border-gray-300 rounded-lg peer-checked:border-blue-600 peer-checked:bg-blue-50 transition-all">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" />
                <span className="font-medium">Bản thân</span>
              </div>
            </div>
          </label>
          <label className="flex-1 relative">
            <input
              type="radio"
              name="bookFor"
              checked={!formData.bookForSelf}
              onChange={() => handleInputChange("bookForSelf", false)}
              className="peer sr-only"
            />
            <div className="cursor-pointer p-4 border-2 border-gray-300 rounded-lg peer-checked:border-blue-600 peer-checked:bg-blue-50 transition-all">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" />
                <span className="font-medium">Người khác</span>
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Patient Details - Show only if booking for someone else */}
      {!formData.bookForSelf && (
        <div className="healthcare-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin bệnh nhân</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Họ bệnh nhân <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.patientLastName || ""}
                onChange={(e) => handleInputChange("patientLastName", e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.patientLastName ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Nguyễn"
              />
              {errors.patientLastName && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.patientLastName}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên bệnh nhân <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.patientFirstName || ""}
                onChange={(e) => handleInputChange("patientFirstName", e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.patientFirstName ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Văn A"
              />
              {errors.patientFirstName && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.patientFirstName}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày sinh <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={formData.patientDOB || ""}
                  onChange={(e) => handleInputChange("patientDOB", e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.patientDOB ? "border-red-500" : "border-gray-300"
                  }`}
                />
              </div>
              {errors.patientDOB && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.patientDOB}
                </p>
              )}
              {formData.patientDOB && (
                <p className="mt-1 text-xs text-gray-600">Tuổi: {calculateAge(formData.patientDOB)} tuổi</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Giới tính <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.patientGender || ""}
                onChange={(e) => handleInputChange("patientGender", e.target.value as "male" | "female" | "other")}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.patientGender ? "border-red-500" : "border-gray-300"
                }`}
              >
                <option value="">Chọn giới tính</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
              {errors.patientGender && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.patientGender}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Guardian Details - Show only for minors */}
      {!formData.bookForSelf && isMinor && (
        <div className="healthcare-card p-6 border-2 border-yellow-200 bg-yellow-50">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900">Thông tin người giám hộ (Bệnh nhân dưới 18 tuổi)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Họ tên người giám hộ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.guardianName || ""}
                onChange={(e) => handleInputChange("guardianName", e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.guardianName ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Nguyễn Văn B"
              />
              {errors.guardianName && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.guardianName}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mối quan hệ <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.guardianRelationship || ""}
                onChange={(e) => handleInputChange("guardianRelationship", e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.guardianRelationship ? "border-red-500" : "border-gray-300"
                }`}
              >
                <option value="">Chọn mối quan hệ</option>
                <option value="Father">Bố</option>
                <option value="Mother">Mẹ</option>
                <option value="Guardian">Người giám hộ</option>
                <option value="Other">Khác</option>
              </select>
              {errors.guardianRelationship && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.guardianRelationship}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={formData.guardianPhone || ""}
                  onChange={(e) => handleInputChange("guardianPhone", e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.guardianPhone ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="(123) 456-7890"
                />
              </div>
              {errors.guardianPhone && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.guardianPhone}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.guardianEmail || ""}
                  onChange={(e) => handleInputChange("guardianEmail", e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.guardianEmail ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="email@example.com"
                />
              </div>
              {errors.guardianEmail && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.guardianEmail}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Additional Notes */}
      <div className="healthcare-card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin bổ sung</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lý do khám (tùy chọn)</label>
            <textarea
              value={formData.chiefComplaint || ""}
              onChange={(e) => handleInputChange("chiefComplaint", e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Mô tả triệu chứng hoặc lý do bạn muốn đặt lịch hẹn..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú (tùy chọn)</label>
            <textarea
              value={formData.notes || ""}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Bất kỳ thông tin bổ sung nào..."
            />
          </div>
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="flex gap-4 sticky bottom-0 bg-white p-4 border-t border-gray-200 -mx-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          Quay lại
        </button>
        <button
          type="submit"
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Xác nhận đặt lịch
        </button>
      </div>
    </form>
  );
}

function calculateAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
