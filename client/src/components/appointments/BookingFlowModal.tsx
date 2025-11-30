"use client";

import paymentService from "@/services/paymentService";
import { AppointmentConfirmation, BookingFormData, ConsultType, Doctor } from "@/types/appointment";
import { calculateConsultationFee, formatFee } from "@/utils/consultationFees";
import {
  Building2,
  Calendar as CalendarIcon,
  Check,
  Clock,
  FileText,
  Home,
  MapPin,
  User,
  Video,
  X,
  UserCircle2
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import BookingForm from "./BookingForm";
import TimeSlotPicker from "./TimeSlotPicker";
import { toast } from "sonner";

export type BookingFlowStep = "time-slot" | "details" | "confirmation";

interface BookingFlowModalProps {
  doctor: Doctor;
  step: BookingFlowStep;
  bookingData: Partial<BookingFormData>;
  confirmation?: AppointmentConfirmation | null;
  onClose: () => void;
  onSelectSlot: (date: string, time: string, consultType: ConsultType, endTime: string) => void;
  onDetailsSubmit: (data: BookingFormData) => void; // Step 2: Save form data and go to step 3
  onConfirmBooking: () => void; // Step 3: Actually create the appointment
  onBackToTimeSlot: () => void;
  onContinue?: () => void;
}

const stepsDefinition: Array<{
  id: BookingFlowStep;
  label: string;
}> = [
  {
    id: "time-slot",
    label: "Chi tiết lịch hẹn",
  },
  {
    id: "details",
    label: "Thông tin bệnh nhân",
  },
  {
    id: "confirmation",
    label: "Xác nhận & Thanh toán",
  },
];

export default function BookingFlowModal({
  doctor,
  step,
  bookingData,
  confirmation,
  onClose,
  onSelectSlot,
  onDetailsSubmit,
  onConfirmBooking,
  onBackToTimeSlot,
  onContinue,
}: BookingFlowModalProps) {
  const { data: session } = useSession();
  const currentIndex = useMemo(() => stepsDefinition.findIndex((item) => item.id === step), [step]);

  const handlePayWithMomo = async () => {
    if (!confirmation?.appointment || !doctor) {
      toast.error("Thông tin đặt lịch chưa đầy đủ");
      return;
    }

    try {
      console.log("🔄 Starting MoMo payment...", { confirmation, doctor });

      const token = (session as any)?.access_token || (session as any)?.accessToken;
      const appointment = confirmation.appointment;

      // Get consultation fee from doctor or appointment
      const amount = appointment.consultationFee || doctor.consultationFee || 50000;

      const payload = {
        appointmentId: appointment._id || appointment.id || "",
        patientId: (appointment.patientId as any)?._id || (appointment.patientId as any) || "",
        doctorId: doctor._id || (doctor as any).id || "",
        amount: amount,
        orderInfo: `Thanh toán lịch khám với ${doctor.fullName}`,
      };

      console.log("💳 MoMo payload:", payload);

      if (!payload.appointmentId || !payload.patientId || !payload.doctorId || !payload.amount) {
        toast.error("Thiếu thông tin cần thiết để thanh toán");
        console.error("Missing required fields:", payload);
        return;
      }

      const result = await paymentService.createMoMoPayment(payload, token);
      console.log("✅ MoMo response:", result);

      // Handle both old and new response formats
      const payUrl =
        result?.data?.payUrl || result?.momo?.payUrl || result?.momo?.deeplink || result?.momo?.deeplinkMiniApp;

      if (payUrl) {
        console.log("🚀 Redirecting to MoMo:", payUrl);
        window.location.href = payUrl;
      } else {
        console.error("❌ No payUrl in MoMo response:", result);
        toast.error(result?.message || "Không nhận được đường dẫn thanh toán từ MoMo");
      }
    } catch (e: any) {
      console.error("❌ MoMo payment error:", e);
      toast.error(e?.message || "Tạo thanh toán MoMo thất bại");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[92vh] flex overflow-hidden">
        {/* Sidebar - Fixed */}
        <aside className="w-[280px] bg-white border-r border-gray-200 p-6 flex flex-col flex-shrink-0">
          <h1 className="text-lg font-semibold text-gray-900 mb-8">Đặt lịch khám</h1>
          <div className="flex-1">
            <ol className="space-y-0">
              {stepsDefinition.map((item, index) => {
                const status = index < currentIndex ? "completed" : index === currentIndex ? "current" : "upcoming";
                const isLast = index === stepsDefinition.length - 1;

                return (
                  <li key={item.id} className="relative">
                    <div className="flex items-start gap-3 pb-8">
                      <div className="relative flex flex-col items-center">
                        <span
                          className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-semibold flex-shrink-0 z-10 ${
                            status === "completed"
                              ? "bg-green-500 text-white"
                              : status === "current"
                              ? "bg-primary text-white"
                              : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          {status === "completed" ? <Check className="w-5 h-5" /> : index + 1}
                        </span>
                        {!isLast && (
                          <div
                            className={`absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-full ${
                              status === "completed" ? "bg-green-500" : "bg-gray-200"
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex-1 pt-2">
                        <p
                          className={`text-sm font-medium mb-2 ${
                            status === "current"
                              ? "text-primary"
                              : status === "completed"
                              ? "text-gray-900"
                              : "text-gray-400"
                          }`}
                        >
                          {item.label}
                        </p>

                        {/* Show appointment details under first step when selected */}
                        {item.id === "time-slot" && status === "completed" && bookingData.appointmentDate && (
                          <div className="space-y-2 text-xs text-gray-600 mt-3">
                            {/* Step 1: Show only time + price */}
                            {step === "time-slot" && (
                              <>
                                <div className="flex items-start gap-2">
                                  <CalendarIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <span className="leading-relaxed">
                                    {new Date(bookingData.appointmentDate).toLocaleDateString("vi-VN", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                    })}{" "}
                                    lúc {bookingData.startTime}
                                  </span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-gray-400 mt-0.5">₫</span>
                                  <span className="leading-relaxed font-medium">
                                    {formatFee(
                                      bookingData.paymentAmount ||
                                        calculateConsultationFee(
                                          bookingData.consultType || ConsultType.ON_SITE,
                                          doctor.consultationFee
                                        )
                                    )}
                                  </span>
                                </div>
                              </>
                            )}

                            {/* Step 2: Show full step 1 details + consultation type */}
                            {step === "details" && (
                              <>
                                {bookingData.consultType && (
                                  <div className="flex items-start gap-2">
                                    {bookingData.consultType === ConsultType.TELEVISIT && (
                                      <Video className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    )}
                                    {bookingData.consultType === ConsultType.ON_SITE && (
                                      <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    )}
                                    {bookingData.consultType === ConsultType.HOME_VISIT && (
                                      <Home className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    )}
                                    <span className="leading-relaxed">
                                      {bookingData.consultType === ConsultType.TELEVISIT && "Tư vấn từ xa"}
                                      {bookingData.consultType === ConsultType.ON_SITE && "Khám tại phòng khám"}
                                      {bookingData.consultType === ConsultType.HOME_VISIT && "Khám tại nhà"}
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-start gap-2">
                                  <CalendarIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <span className="leading-relaxed">
                                    {new Date(bookingData.appointmentDate).toLocaleDateString("vi-VN", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                    })}{" "}
                                    lúc {bookingData.startTime}
                                  </span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-gray-400 mt-0.5">₫</span>
                                  <span className="leading-relaxed font-medium">
                                    {formatFee(
                                      bookingData.paymentAmount ||
                                        calculateConsultationFee(
                                          bookingData.consultType || ConsultType.ON_SITE,
                                          doctor.consultationFee
                                        )
                                    )}
                                  </span>
                                </div>
                              </>
                            )}

                            {/* Step 3: Show everything including form details */}
                            {step === "confirmation" && (
                              <>
                                {bookingData.consultType && (
                                  <div className="flex items-start gap-2">
                                    {bookingData.consultType === ConsultType.TELEVISIT && (
                                      <Video className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    )}
                                    {bookingData.consultType === ConsultType.ON_SITE && (
                                      <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    )}
                                    {bookingData.consultType === ConsultType.HOME_VISIT && (
                                      <Home className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    )}
                                    <span className="leading-relaxed">
                                      {bookingData.consultType === ConsultType.TELEVISIT && "Tư vấn từ xa"}
                                      {bookingData.consultType === ConsultType.ON_SITE && "Khám tại phòng khám"}
                                      {bookingData.consultType === ConsultType.HOME_VISIT && "Khám tại nhà"}
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-start gap-2">
                                  <CalendarIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <span className="leading-relaxed">
                                    {new Date(bookingData.appointmentDate).toLocaleDateString("vi-VN", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                    })}{" "}
                                    lúc {bookingData.startTime}
                                  </span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-gray-400 mt-0.5">₫</span>
                                  <span className="leading-relaxed font-medium">
                                    {formatFee(
                                      bookingData.paymentAmount ||
                                        calculateConsultationFee(
                                          bookingData.consultType || ConsultType.ON_SITE,
                                          doctor.consultationFee
                                        )
                                    )}
                                  </span>
                                </div>
                                {(bookingData.patientFirstName || bookingData.patientLastName) && (
                                  <div className="flex items-start gap-2">
                                    <UserCircle2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <span className="leading-relaxed">
                                      {[bookingData.patientFirstName, bookingData.patientLastName]
                                        .filter(Boolean)
                                        .join(" ")}
                                    </span>
                                  </div>
                                )}
                                {bookingData.chiefComplaint && (
                                  <div className="flex items-start gap-2">
                                    <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <span className="leading-relaxed line-clamp-2">{bookingData.chiefComplaint}</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header - Fixed */}
          <div className="flex-shrink-0 px-6 pt-6 pb-5 border-b border-gray-200 bg-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full text-gray-400 hover:text-gray-600 transition"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
            <DoctorHeader
              doctor={doctor}
              selectedConsultType={bookingData.consultType}
              paymentAmount={bookingData.paymentAmount}
            />
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {step === "time-slot" && (
              <TimeSlotPicker
                doctor={doctor}
                onSelectSlot={onSelectSlot}
                onConsultTypeChange={(consultType) => {
                  // Update consultType immediately when user clicks
                  onSelectSlot(
                    bookingData.appointmentDate || "",
                    bookingData.startTime || "",
                    consultType,
                    bookingData.endTime || ""
                  );
                }}
              />
            )}

            {step === "details" && (
              <div className="space-y-6">
                {/* <BookingOverviewCard bookingData={bookingData} /> */}
                <BookingForm bookingData={bookingData} onSubmit={onDetailsSubmit} />
              </div>
            )}

            {step === "confirmation" && (
              <div className="space-y-6">
                {confirmation ? (
                  <div className="space-y-6">
                    <AppointmentConfirmationContent confirmation={confirmation} />
                    {/* MoMo Payment Button - Only show if NOT paid with wallet */}
                    {bookingData.paymentMethod !== "wallet" && (
                      <div className="bg-pink-50 border border-pink-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Thanh toán phí khám</h3>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">
                              Phí khám:{" "}
                              <span className="font-semibold text-pink-600">
                                {formatFee(
                                  confirmation.appointment.consultationFee ||
                                    calculateConsultationFee(
                                      bookingData.consultType || ConsultType.ON_SITE,
                                      doctor.consultationFee
                                    )
                                )}
                              </span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Thanh toán qua MoMo để hoàn tất đặt lịch</p>
                          </div>
                          <button
                            type="button"
                            onClick={handlePayWithMomo}
                            className="px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium flex items-center gap-2"
                          >
                            <span>💳</span>
                            Thanh toán MoMo
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Xác nhận thông tin đặt lịch</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bác sĩ:</span>
                        <span className="font-medium">{doctor.fullName}</span>
                      </div>
                      {bookingData.appointmentDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Ngày khám:</span>
                          <span className="font-medium">
                            {new Date(bookingData.appointmentDate).toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      )}
                      {bookingData.startTime && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Giờ khám:</span>
                          <span className="font-medium">{bookingData.startTime}</span>
                        </div>
                      )}
                      {bookingData.consultType && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Hình thức:</span>
                          <span className="font-medium">
                            {bookingData.consultType === ConsultType.TELEVISIT && "Tư vấn từ xa"}
                            {bookingData.consultType === ConsultType.ON_SITE && "Khám tại phòng khám"}
                            {bookingData.consultType === ConsultType.HOME_VISIT && "Khám tại nhà"}
                          </span>
                        </div>
                      )}
                      {/* Fee Section */}
                      <div className="pt-3 border-t border-blue-200 space-y-2">
                        {bookingData.discountAmount && bookingData.discountAmount > 0 ? (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Phí khám gốc:</span>
                              <span className="text-gray-500 line-through">
                                {formatFee(
                                  calculateConsultationFee(
                                    bookingData.consultType || ConsultType.ON_SITE,
                                    doctor.consultationFee
                                  )
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Giảm giá (voucher):</span>
                              <span className="text-green-600 font-medium">
                                - {formatFee(bookingData.discountAmount)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-900 font-semibold">Tổng thanh toán:</span>
                              <span className="font-semibold text-primary text-lg">
                                {formatFee(bookingData.paymentAmount || 0)}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Phí khám:</span>
                            <span className="font-semibold text-primary">
                              {formatFee(
                                calculateConsultationFee(
                                  bookingData.consultType || ConsultType.ON_SITE,
                                  doctor.consultationFee
                                )
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Payment Method Info */}
                      {bookingData.paymentMethod && (
                        <div className="flex justify-between pt-3 border-t border-blue-200">
                          <span className="text-gray-600">Thanh toán:</span>
                          <div className="flex items-center gap-2">
                            {bookingData.paymentMethod === "momo" && (
                              <>
                                <div className="w-6 h-6 bg-pink-600 rounded flex items-center justify-center text-white text-xs font-bold">
                                  M
                                </div>
                                <span className="font-medium text-pink-600">MoMo</span>
                              </>
                            )}
                            {bookingData.paymentMethod === "cash" && (
                              <>
                                <svg
                                  className="w-5 h-5 text-blue-600"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                                  />
                                </svg>
                                <span className="font-medium text-blue-600">Tại phòng khám</span>
                              </>
                            )}
                            {bookingData.paymentMethod === "later" && (
                              <>
                                <svg
                                  className="w-5 h-5 text-green-600"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <span className="font-medium text-green-600">Thanh toán sau</span>
                              </>
                            )}
                            {bookingData.paymentMethod === "wallet" && (
                              <>
                                <svg
                                  className="w-5 h-5 text-purple-600"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                                  />
                                </svg>
                                <span className="font-medium text-purple-600">Thanh toán bằng ví</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Wallet Warning */}
                      {bookingData.paymentMethod === "wallet" && (
                        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <svg
                              className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <div className="text-xs text-purple-800">
                              <p className="font-medium mb-1">Thanh toán bằng ví:</p>
                              <p>Số tiền sẽ được trừ trực tiếp từ số dư ví của bạn sau khi xác nhận đặt lịch.</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* MoMo Warning */}
                      {bookingData.paymentMethod === "momo" && (
                        <div className="mt-4 p-3 bg-pink-50 border border-pink-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <svg
                              className="w-5 h-5 text-pink-600 flex-shrink-0 mt-0.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <div className="text-xs text-pink-800">
                              <p className="font-medium mb-1">Thanh toán MoMo:</p>
                              <p>
                                Bạn sẽ được chuyển đến trang MoMo để thanh toán{" "}
                                <strong>
                                  {formatFee(
                                    bookingData.paymentAmount ||
                                      calculateConsultationFee(
                                        bookingData.consultType || ConsultType.ON_SITE,
                                        doctor.consultationFee
                                      )
                                  )}
                                </strong>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer - Fixed */}
          <div className="flex-shrink-0 border-t border-gray-200 bg-white px-6 py-4">
            {step === "time-slot" && (
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Hủy
                </button>
                {bookingData.startTime ? (
                  <button
                    onClick={onContinue}
                    className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center gap-2"
                  >
                    Tiếp tục
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const contentArea = document.querySelector(".overflow-y-auto");
                      contentArea?.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="px-6 py-3 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-medium flex items-center gap-2"
                  >
                    <CalendarIcon className="w-5 h-5" />
                    Chọn ngày và giờ khám bệnh
                  </button>
                )}
              </div>
            )}

            {step === "details" && (
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={onBackToTimeSlot}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  form="booking-form"
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  Tiếp tục
                </button>
              </div>
            )}

            {step === "confirmation" && (
              <div className="flex items-center justify-between gap-4">
                {!confirmation ? (
                  <>
                    <button
                      onClick={onBackToTimeSlot}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Quay lại
                    </button>
                    {bookingData.paymentMethod === "momo" ? (
                      <button
                        type="button"
                        onClick={onConfirmBooking}
                        className="px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium flex items-center gap-2"
                      >
                        <div className="w-5 h-5 bg-white rounded flex items-center justify-center text-pink-600 text-xs font-bold">
                          M
                        </div>
                        Thanh toán với MoMo
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onConfirmBooking}
                        className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                      >
                        Xác nhận đặt lịch
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={onClose}
                    className="ml-auto px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                  >
                    Hoàn tất
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DoctorHeader({
  doctor,
  selectedConsultType,
}: {
  doctor: Doctor;
  selectedConsultType?: ConsultType;
  paymentAmount?: number; // Keep for interface compatibility but not used
}) {
  // Fallback values if not provided
  const experienceYears = doctor.experienceYears || 5;
  const rating = doctor.rating || 4.5;
  // Always show original consultation fee in header, not discounted price
  const consultationFee = calculateConsultationFee(selectedConsultType || ConsultType.ON_SITE, doctor.consultationFee);

  return (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0">
        {doctor.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={doctor.avatarUrl} alt={doctor.fullName} className="w-full h-full object-cover" />
        ) : (
          <User className="w-6 h-6 text-primary-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-semibold text-gray-900">{doctor.fullName}</h2>
        <div className="flex items-center gap-2 text-sm text-gray-600 mt-0.5">
          {doctor.specialty && (
            <span className="inline-flex items-center gap-1 text-primary">
              <Building2 className="w-3.5 h-3.5" />
              {doctor.specialty}
            </span>
          )}
          <span className="text-gray-400">•</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            {experienceYears} yr
          </span>
          <span className="text-gray-400">•</span>
          <span className="inline-flex items-center gap-1">
            <span className="text-yellow-500">★</span>
            {rating.toFixed(1)}
          </span>
          <span className="text-gray-400">•</span>
          <span className="inline-flex items-center gap-1 font-semibold text-primary">
            <span>₫</span>
            {consultationFee.toLocaleString("vi-VN")}
          </span>
        </div>
        {doctor.address && (
          <div className="flex items-start gap-1.5 text-xs text-gray-500 mt-1">
            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-gray-400" />
            <span className="line-clamp-1">{doctor.address}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function AppointmentConfirmationContent({ confirmation }: { confirmation: AppointmentConfirmation }) {
  const { appointment, doctor, bookingId, confirmationMessage, instructions, calendarLinks } = confirmation;

  // Fallback for consultation fee (in VND)
  const consultationFee = doctor?.consultationFee || 200000;

  const handleAddToGoogleCalendar = () => {
    if (calendarLinks?.google) {
      window.open(calendarLinks.google, "_blank");
    }
  };

  const handleDownloadICS = () => {
    if (calendarLinks?.ics) {
      window.open(calendarLinks.ics, "_blank");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-100">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Đặt lịch thành công!</h2>
          <p className="text-gray-600">{confirmationMessage}</p>
          <div className="mt-4 inline-flex items-center px-4 py-2 bg-white rounded-lg shadow-sm">
            <span className="text-sm text-gray-600">Mã đặt lịch:</span>
            <span className="ml-2 font-mono font-semibold text-gray-900">#{bookingId}</span>
          </div>
        </div>
      </div>

      {/* Appointment Details */}
      <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Chi tiết lịch hẹn</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Ngày khám</p>
              <p className="font-semibold text-gray-900">{formatDate(appointment.appointmentDate)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Giờ khám</p>
              <p className="font-semibold text-gray-900">{appointment.startTime}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-primary/10">
          <div className="flex items-center gap-2 text-sm">
            <span className="px-3 py-1 bg-primary/10 text-primary-700 rounded-full font-medium">
              {appointment.consultType === "televisit" && "Tư vấn từ xa"}
              {appointment.consultType === "on-site" && "Khám tại phòng khám"}
              {appointment.consultType === "home-visit" && "Khám tại nhà"}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm text-gray-600 font-medium">Chi phí khám:</span>
            <span className="text-2xl font-bold text-primary">
              {(appointment.paymentAmount || consultationFee || 200000).toLocaleString("vi-VN")}₫
            </span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      {instructions && instructions.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Hướng dẫn cần lưu ý</h3>
          <ul className="space-y-2">
            {instructions.map((instruction, index) => (
              <li key={index} className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{instruction}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Calendar Links */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Thêm vào lịch</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleAddToGoogleCalendar}
            className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-all"
          >
            <CalendarIcon className="w-5 h-5" />
            <span className="font-medium">Google Calendar</span>
          </button>
          <button
            onClick={handleDownloadICS}
            className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-all"
          >
            <MapPin className="w-5 h-5" />
            <span className="font-medium">iOS Calendar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
