"use client";

import { BookingFormData, ConsultType } from "@/types/appointment";
import voucherService, { Voucher } from "@/services/voucherService";
import walletService from "@/services/walletService";
import {
  AlertCircle,
  Calendar,
  Clock,
  CreditCard,
  Mail,
  Phone,
  User,
  Wallet,
  Brain,
  Sparkles,
  Tag,
  Check,
  ChevronDown,
  X,
  Gift,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import AIAnalysisSummary from "./AIAnalysisSummary";

interface BookingFormProps {
  bookingData: Partial<BookingFormData>;
  onSubmit: (data: BookingFormData) => void;
}

export default function BookingForm({ bookingData, onSubmit }: BookingFormProps) {
  // Get AI chat data from Redux
  const appointmentDataFromAI = useAppSelector((state) => state.appointment.appointmentData);
  const { data: session } = useSession();

  const [formData, setFormData] = useState<BookingFormData>({
    doctorId: bookingData?.doctorId || "",
    appointmentDate: bookingData?.appointmentDate || "",
    startTime: bookingData?.startTime || "",
    consultType: bookingData?.consultType || ConsultType.ON_SITE,
    bookForSelf: true,
    paymentMethod: "later",
    paymentAmount: 200000,
    voucherCode: "",
    discountAmount: 0,
    ...bookingData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [applyingVoucher, setApplyingVoucher] = useState(false);
  const [voucherApplied, setVoucherApplied] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Voucher states
  const [availableVouchers, setAvailableVouchers] = useState<Voucher[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [showVoucherDropdown, setShowVoucherDropdown] = useState(false);
  const [originalPaymentAmount, setOriginalPaymentAmount] = useState<number>(bookingData?.paymentAmount || 200000);

  // Fetch available vouchers on mount
  useEffect(() => {
    const fetchVouchers = async () => {
      const accessToken = (session as { access_token?: string })?.access_token;
      if (!accessToken) return;

      setLoadingVouchers(true);
      try {
        const result = await voucherService.getMyVouchers(accessToken);
        if (result.success && result.data) {
          // Filter only valid, unused vouchers
          const validVouchers = result.data.filter((v) => !v.isUsed && !voucherService.isExpired(v));
          setAvailableVouchers(validVouchers);
        }
      } catch (error) {
        console.error("Failed to fetch vouchers:", error);
      } finally {
        setLoadingVouchers(false);
      }
    };

    fetchVouchers();
  }, [session]);

  // Track original payment amount
  useEffect(() => {
    if (bookingData?.paymentAmount && !voucherApplied) {
      setOriginalPaymentAmount(bookingData.paymentAmount);
    }
  }, [bookingData?.paymentAmount, voucherApplied]);

  // Fetch wallet balance on component mount
  useEffect(() => {
    const fetchWalletBalance = async () => {
      const accessToken = (session as { access_token?: string })?.access_token;
      if (!accessToken) return;

      setLoadingBalance(true);
      try {
        const result = await walletService.getBalance(accessToken);
        if (result.success && result.data) {
          setWalletBalance(result.data.balance);
        }
      } catch {
        // Silently fail - wallet balance is not critical
      } finally {
        setLoadingBalance(false);
      }
    };

    fetchWalletBalance();
  }, [session]);

  const handleInputChange = (field: keyof BookingFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
    // Reset voucher when code changes
    if (field === "voucherCode") {
      setVoucherApplied(false);
      setFormData((prev) => ({ ...prev, discountAmount: 0 }));
    }
  };

  // Apply voucher
  const handleApplyVoucher = async () => {
    if (!formData.voucherCode?.trim()) {
      toast.error("Vui lòng nhập mã voucher");
      return;
    }

    setApplyingVoucher(true);
    try {
      const accessToken = (session as { access_token?: string })?.access_token;
      const result = await voucherService.applyVoucher(
        formData.voucherCode,
        formData.paymentAmount || 200000,
        accessToken
      );

      if (result.success && result.data) {
        const discount = (formData.paymentAmount || 200000) - result.data.discountedAmount;
        setFormData((prev) => ({
          ...prev,
          discountAmount: discount,
          paymentAmount: result.data!.discountedAmount,
          voucherId: result.data!.voucherId, // Save voucherId for appointment creation
        }));
        setVoucherApplied(true);
        setShowVoucherDropdown(false);
        toast.success(`✅ Giảm giá ${discount.toLocaleString()}đ!`);
      } else {
        toast.error(result.error || "Không thể áp dụng voucher");
      }
    } catch (error) {
      toast.error("Có lỗi xảy ra khi áp dụng voucher");
    } finally {
      setApplyingVoucher(false);
    }
  };

  // Select voucher from dropdown
  const handleSelectVoucher = (voucher: Voucher) => {
    setFormData((prev) => ({ ...prev, voucherCode: voucher.code }));
    setShowVoucherDropdown(false);
  };

  // Cancel applied voucher
  const handleCancelVoucher = () => {
    setFormData((prev) => ({
      ...prev,
      voucherCode: "",
      discountAmount: 0,
      paymentAmount: originalPaymentAmount,
      voucherId: undefined,
    }));
    setVoucherApplied(false);
    toast.info("Đã hủy áp dụng voucher");
  };

  // Function to use AI data in appointment
  const handleRestoreAIData = () => {
    if (!appointmentDataFromAI) {
      toast.error("Không có thông tin AI để sử dụng");
      return;
    }

    // Set flag to include AI data when submitting
    setFormData((prev) => ({
      ...prev,
      includeAIData: true,
      aiAnalysisData: {
        symptoms: appointmentDataFromAI.symptoms,
        uploadedImage: appointmentDataFromAI.uploadedImage || appointmentDataFromAI.imageUrl,
        analysisResult: appointmentDataFromAI.analysisResult,
        urgency: appointmentDataFromAI.urgency,
        hasImageAnalysis: appointmentDataFromAI.hasImageAnalysis,
      },
    }));

    toast.success("✅ Đã đánh dấu để lưu thông tin AI vào cuộc hẹn");
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
                  disabled={formData.includeAIData}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                    formData.includeAIData
                      ? "bg-green-600 text-white cursor-default"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {formData.includeAIData ? (
                    <>
                      <Check className="w-4 h-4" />
                      Đã lưu thông tin AI
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Sử dụng thông tin từ AI
                    </>
                  )}
                </button>
              </div>

              {appointmentDataFromAI.symptoms && (
                <div className="mb-3">
                  <label htmlFor="ai-symptoms" className="text-sm font-medium text-gray-700 mb-1 block">
                    Triệu chứng: <span className="text-xs text-gray-500">(Có thể chỉnh sửa)</span>
                  </label>
                  <textarea
                    id="ai-symptoms"
                    value={formData.symptoms || appointmentDataFromAI.symptoms}
                    onChange={(e) => handleInputChange("symptoms", e.target.value)}
                    rows={3}
                    className="w-full text-sm text-gray-900 bg-white rounded-lg p-3 border border-blue-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-y"
                    placeholder="Nhập triệu chứng của bạn..."
                  />
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

              {/* Display AI Analysis with Image */}
              {appointmentDataFromAI.analysisResult && (
                <AIAnalysisSummary
                  analysisResult={appointmentDataFromAI.analysisResult}
                  uploadedImage={appointmentDataFromAI.uploadedImage || appointmentDataFromAI.imageUrl}
                />
              )}

              <p className="text-xs text-gray-500 mt-3 italic">
                💡 Thông tin này được tổng hợp từ cuộc trò chuyện với AI tư vấn
              </p>
            </div>
          </div>
        </div>
      )}

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

      {/* Voucher Section */}
      <div className="healthcare-card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Tag className="w-5 h-5 text-primary" />
          Mã giảm giá
        </h3>
        <div className="space-y-3">
          {/* Voucher Input and Select */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={formData.voucherCode || ""}
                onChange={(e) => handleInputChange("voucherCode", e.target.value)}
                placeholder="Nhập hoặc chọn mã voucher"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent pr-10"
                disabled={voucherApplied}
              />
              {/* Dropdown toggle button */}
              {!voucherApplied && availableVouchers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowVoucherDropdown(!showVoucherDropdown)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${showVoucherDropdown ? "rotate-180" : ""}`}
                  />
                </button>
              )}

              {/* Voucher Dropdown */}
              {showVoucherDropdown && !voucherApplied && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                  {loadingVouchers ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                      Đang tải...
                    </div>
                  ) : availableVouchers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <Gift className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                      Bạn chưa có voucher nào
                    </div>
                  ) : (
                    availableVouchers.map((voucher) => (
                      <button
                        key={voucher._id}
                        type="button"
                        onClick={() => handleSelectVoucher(voucher)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-mono font-semibold text-gray-900">{voucher.code}</div>
                          <div className="text-xs text-gray-500">
                            {voucherService.getReasonText(voucher.reason)} • Giảm{" "}
                            {voucherService.formatDiscount(voucher)}
                          </div>
                        </div>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          {voucherService.formatDiscount(voucher)}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Apply or Cancel button */}
            {voucherApplied ? (
              <button
                type="button"
                onClick={handleCancelVoucher}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Hủy áp dụng
              </button>
            ) : (
              <button
                type="button"
                onClick={handleApplyVoucher}
                disabled={applyingVoucher || !formData.voucherCode?.trim()}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {applyingVoucher ? "Đang xử lý..." : "Áp dụng"}
              </button>
            )}
          </div>

          {/* Applied voucher info */}
          {voucherApplied && formData.discountAmount && formData.discountAmount > 0 && (
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700 font-medium">
                  Đã áp dụng mã: <span className="font-mono">{formData.voucherCode}</span>
                </span>
              </div>
              <span className="text-sm font-bold text-green-700">
                -{formData.discountAmount.toLocaleString("vi-VN")} ₫
              </span>
            </div>
          )}

          {/* Available vouchers hint */}
          {!voucherApplied && availableVouchers.length > 0 && (
            <p className="text-sm text-primary flex items-center gap-1">
              <Gift className="w-4 h-4" />
              Bạn có {availableVouchers.length} voucher khả dụng. Click vào mũi tên để chọn.
            </p>
          )}

          <p className="text-sm text-gray-500">
            Bạn có thể nhận voucher giảm giá 5% khi bác sĩ đề xuất lịch tái khám hoặc khi bác sĩ hủy lịch khẩn cấp
          </p>
        </div>
      </div>

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

          {/* Wallet Payment */}
          <label className="relative cursor-pointer block">
            <input
              type="radio"
              name="paymentMethod"
              value="wallet"
              checked={formData.paymentMethod === "wallet"}
              onChange={(e) => handleInputChange("paymentMethod", e.target.value)}
              className="peer sr-only"
              disabled={walletBalance < (formData.paymentAmount || 0)}
            />
            <div
              className={`p-4 border-2 rounded-lg transition-all ${
                walletBalance < (formData.paymentAmount || 0)
                  ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                  : "border-gray-300 peer-checked:border-purple-500 peer-checked:bg-purple-50 hover:border-purple-300"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                    walletBalance < (formData.paymentAmount || 0) ? "bg-gray-400" : "bg-purple-600"
                  }`}
                >
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">Thanh toán bằng ví</div>
                  <div className="text-sm text-gray-600">
                    {loadingBalance ? "Đang tải..." : `Số dư: ${walletBalance.toLocaleString("vi-VN")} đ`}
                  </div>
                  {walletBalance < (formData.paymentAmount || 0) && (
                    <div className="text-xs text-red-600 mt-1">Số dư không đủ</div>
                  )}
                </div>
                <div className="shrink-0">
                  {formData.paymentMethod === "wallet" && walletBalance >= (formData.paymentAmount || 0) && (
                    <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
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
