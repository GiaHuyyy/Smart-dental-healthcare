"use client";

import { BookingFormData, ConsultType } from "@/types/appointment";
import {
  AlertCircle,
  Building2,
  Calendar,
  Clock,
  CreditCard,
  Home,
  Mail,
  Phone,
  User,
  Video,
  Wallet,
  Brain,
  Sparkles,
  RotateCcw,
  Image as ImageIcon,
} from "lucide-react";
import React, { useState } from "react";
import { useAppSelector } from "@/store/hooks";
import Image from "next/image";
import { toast } from "sonner";

interface BookingFormProps {
  bookingData: Partial<BookingFormData>;
  onSubmit: (data: BookingFormData) => void;
}

export default function BookingForm({ bookingData, onSubmit }: BookingFormProps) {
  // Get AI chat data from Redux
  const appointmentDataFromAI = useAppSelector((state) => state.appointment.appointmentData);

  const [formData, setFormData] = useState<BookingFormData>({
    doctorId: bookingData?.doctorId || "",
    appointmentDate: bookingData?.appointmentDate || "",
    startTime: bookingData?.startTime || "",
    consultType: bookingData?.consultType || ConsultType.ON_SITE,
    bookForSelf: true,
    paymentMethod: "later",
    paymentAmount: 200000,
    ...bookingData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof BookingFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Function to restore AI data to form
  const handleRestoreAIData = () => {
    if (appointmentDataFromAI?.symptoms) {
      handleInputChange("chiefComplaint", appointmentDataFromAI.symptoms);
      if (appointmentDataFromAI.notes) {
        handleInputChange("notes", appointmentDataFromAI.notes);
      }
      toast.success("✅ Đã khôi phục thông tin từ AI!");
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

  const formSections = (
    <>
      {/* AI Data Summary - Show if coming from AI chat */}
      {appointmentDataFromAI && appointmentDataFromAI.symptoms && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-600">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">Thông tin từ tư vấn AI</h3>
                  <Sparkles className="w-5 h-5 text-blue-600" />
                </div>
                <button
                  type="button"
                  onClick={handleRestoreAIData}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <RotateCcw className="w-4 h-4" />
                  Lấy lại thông tin
                </button>
              </div>

              {appointmentDataFromAI.symptoms && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700 mb-1">Triệu chứng:</p>
                  <p className="text-sm text-gray-900 bg-white rounded-lg p-3 border border-blue-100">
                    {appointmentDataFromAI.symptoms}
                  </p>
                </div>
              )}

              {appointmentDataFromAI.urgency && appointmentDataFromAI.urgency !== "low" && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700 mb-1">Mức độ khẩn cấp:</p>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      appointmentDataFromAI.urgency === "high"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {appointmentDataFromAI.urgency === "high" ? "⚠️ Cao" : "⚡ Trung bình"}
                  </span>
                </div>
              )}

              {/* Display uploaded images */}
              {(appointmentDataFromAI.uploadedImage || appointmentDataFromAI.imageUrl) && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <ImageIcon className="w-4 h-4 text-gray-700" />
                    <p className="text-sm font-medium text-gray-700">Hình ảnh X-quang:</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <div className="relative w-full max-w-md mx-auto">
                      <Image
                        src={appointmentDataFromAI.uploadedImage || appointmentDataFromAI.imageUrl || ""}
                        alt="X-ray đã tải lên"
                        width={500}
                        height={500}
                        className="w-full h-auto rounded-lg shadow-md object-contain"
                        unoptimized
                      />
                    </div>
                  </div>
                </div>
              )}

              {appointmentDataFromAI.hasImageAnalysis && (
                <div className="flex items-center gap-2 text-sm text-blue-700 font-medium">
                  <AlertCircle className="w-4 h-4" />
                  <span>Đã phân tích hình ảnh X-quang</span>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-3 italic">
                💡 Thông tin này được tổng hợp từ cuộc trò chuyện với AI tư vấn
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Consult Type Selection */}
      <div className="healthcare-card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hình thức khám</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="relative cursor-pointer">
            <input
              type="radio"
              name="consultType"
              checked={formData.consultType === ConsultType.TELEVISIT}
              onChange={() => handleInputChange("consultType", ConsultType.TELEVISIT)}
              className="peer sr-only"
            />
            <div className="p-4 border-2 border-gray-300 rounded-lg peer-checked:border-primary peer-checked:bg-primary/5 transition-all hover:border-primary/50">
              <div className="flex flex-col items-center gap-2 text-center">
                <Video className="w-6 h-6 text-primary" />
                <span className="font-medium text-sm">Tư vấn từ xa</span>
                <span className="text-xs text-gray-500">Video call online</span>
              </div>
            </div>
          </label>

          <label className="relative cursor-pointer">
            <input
              type="radio"
              name="consultType"
              checked={formData.consultType === ConsultType.ON_SITE}
              onChange={() => handleInputChange("consultType", ConsultType.ON_SITE)}
              className="peer sr-only"
            />
            <div className="p-4 border-2 border-gray-300 rounded-lg peer-checked:border-primary peer-checked:bg-primary/5 transition-all hover:border-primary/50">
              <div className="flex flex-col items-center gap-2 text-center">
                <Building2 className="w-6 h-6 text-primary" />
                <span className="font-medium text-sm">Khám tại phòng khám</span>
                <span className="text-xs text-gray-500">Đến phòng khám</span>
              </div>
            </div>
          </label>

          <label className="relative cursor-pointer">
            <input
              type="radio"
              name="consultType"
              checked={formData.consultType === ConsultType.HOME_VISIT}
              onChange={() => handleInputChange("consultType", ConsultType.HOME_VISIT)}
              className="peer sr-only"
            />
            <div className="p-4 border-2 border-gray-300 rounded-lg peer-checked:border-primary peer-checked:bg-primary/5 transition-all hover:border-primary/50">
              <div className="flex flex-col items-center gap-2 text-center">
                <Home className="w-6 h-6 text-primary" />
                <span className="font-medium text-sm">Khám tại nhà</span>
                <span className="text-xs text-gray-500">Bác sĩ đến tận nơi</span>
              </div>
            </div>
          </label>
        </div>
      </div>

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
            <div className="cursor-pointer p-4 border-2 border-gray-300 rounded-lg peer-checked:border-primary peer-checked:bg-primary/5 transition-all">
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
            <div className="cursor-pointer p-4 border-2 border-gray-300 rounded-lg peer-checked:border-primary peer-checked:bg-primary/5 transition-all">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" />
                <span className="font-medium">Người khác</span>
              </div>
            </div>
          </label>
        </div>
      </div>

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
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary ${
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
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary ${
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
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary ${
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
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary ${
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
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary ${
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
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary ${
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
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary ${
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
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary ${
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

      {/* Payment Method Selection */}
      <div className="healthcare-card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          Phương thức thanh toán
        </h3>
        <div className="space-y-3">
          {/* MoMo Payment */}
          <label className="relative cursor-pointer block">
            <input
              type="radio"
              name="paymentMethod"
              value="momo"
              checked={formData.paymentMethod === "momo"}
              onChange={(e) => handleInputChange("paymentMethod", e.target.value)}
              className="peer sr-only"
            />
            <div className="p-4 border-2 border-gray-300 rounded-lg peer-checked:border-pink-500 peer-checked:bg-pink-50 transition-all hover:border-pink-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-pink-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shrink-0">
                  M
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">Thanh toán MoMo</div>
                  <div className="text-sm text-gray-600">Thanh toán trực tuyến qua ví MoMo</div>
                  <div className="text-sm font-medium text-pink-600 mt-1">
                    {formData.paymentAmount?.toLocaleString("vi-VN")} đ
                  </div>
                </div>
                <div className="shrink-0">
                  {formData.paymentMethod === "momo" && (
                    <div className="w-6 h-6 bg-pink-600 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </label>

          {/* Cash Payment */}
          <label className="relative cursor-pointer block">
            <input
              type="radio"
              name="paymentMethod"
              value="cash"
              checked={formData.paymentMethod === "cash"}
              onChange={(e) => handleInputChange("paymentMethod", e.target.value)}
              className="peer sr-only"
            />
            <div className="p-4 border-2 border-gray-300 rounded-lg peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all hover:border-blue-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">Thanh toán tại phòng khám</div>
                  <div className="text-sm text-gray-600">Thanh toán trực tiếp khi đến khám</div>
                </div>
                <div className="shrink-0">
                  {formData.paymentMethod === "cash" && (
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </label>

          {/* Later Payment */}
          <label className="relative cursor-pointer block">
            <input
              type="radio"
              name="paymentMethod"
              value="later"
              checked={formData.paymentMethod === "later"}
              onChange={(e) => handleInputChange("paymentMethod", e.target.value)}
              className="peer sr-only"
            />
            <div className="p-4 border-2 border-gray-300 rounded-lg peer-checked:border-green-500 peer-checked:bg-green-50 transition-all hover:border-green-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">Thanh toán sau</div>
                  <div className="text-sm text-gray-600">Đặt lịch trước, thanh toán sau khi khám xong</div>
                </div>
                <div className="shrink-0">
                  {formData.paymentMethod === "later" && (
                    <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </label>

          {/* MoMo Info */}
          {formData.paymentMethod === "momo" && (
            <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-pink-600 shrink-0 mt-0.5" />
                <div className="text-sm text-pink-800">
                  <p className="font-medium mb-1">Lưu ý về thanh toán MoMo:</p>
                  <ul className="list-disc list-inside space-y-1 text-pink-700">
                    <li>Bạn sẽ được chuyển đến trang thanh toán MoMo</li>
                    <li>Lịch hẹn sẽ được tạo sau khi thanh toán thành công</li>
                    <li>Nếu thanh toán thất bại, lịch hẹn sẽ không được tạo</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="healthcare-card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin bổ sung</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lý do khám (tùy chọn)</label>
            <textarea
              value={formData.chiefComplaint || ""}
              onChange={(e) => handleInputChange("chiefComplaint", e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              placeholder="Mô tả triệu chứng hoặc lý do bạn muốn đặt lịch hẹn..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú (tùy chọn)</label>
            <textarea
              value={formData.notes || ""}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              placeholder="Bất kỳ thông tin bổ sung nào..."
            />
          </div>
        </div>
      </div>
    </>
  );

  return (
    <form id="booking-form" onSubmit={handleSubmit} className="space-y-6">
      {formSections}
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
