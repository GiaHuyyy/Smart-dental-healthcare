"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import appointmentService from "@/services/appointmentService";
import paymentService from "@/services/paymentService";
import type { FollowUpSuggestion } from "@/types/followUpSuggestion";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar, Clock, Gift, Stethoscope, FileText, X } from "lucide-react";
import BookingFlowModal, { BookingFlowStep } from "@/components/appointments/BookingFlowModal";
import type { BookingFormData, AppointmentConfirmation } from "@/types/appointment";
import { ConsultType, AppointmentStatus } from "@/types/appointment";
import { calculateConsultationFee } from "@/utils/consultationFees";
import { useGlobalSocket } from "@/contexts/GlobalSocketContext";

export default function FollowUpSuggestions() {
  const { data: session } = useSession();
  const router = useRouter();
  const { socket, isConnected } = useGlobalSocket();
  const [suggestions, setSuggestions] = useState<FollowUpSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSuggestion, setSelectedSuggestion] = useState<FollowUpSuggestion | null>(null);

  // Reject modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [suggestionToReject, setSuggestionToReject] = useState<FollowUpSuggestion | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  // Booking modal state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState<BookingFlowStep>("time-slot");
  const [bookingData, setBookingData] = useState<Partial<BookingFormData>>({});
  const [confirmation, setConfirmation] = useState<AppointmentConfirmation | null>(null);

  const loadSuggestions = useCallback(async () => {
    if (!session?.user?._id) return;

    try {
      setLoading(true);
      const response = await appointmentService.getFollowUpSuggestions(session.user._id, session.access_token);

      if (response.success && response.data) {
        setSuggestions(response.data.filter((s) => s.status === "pending"));
      } else {
        toast.error(response.error || "Không thể tải gợi ý tái khám");
      }
    } catch (error) {
      console.error("Failed to load follow-up suggestions:", error);
      toast.error("Không thể tải gợi ý tái khám");
    } finally {
      setLoading(false);
    }
  }, [session?.user?._id, session?.access_token]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  // Listen for notification:new events to reload suggestions when needed
  // (Toast is handled by NotificationContext globally)
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNotificationNew = (notification: any) => {
      console.log("📩 [FollowUpSuggestions] Received notification:", notification);

      // If it's a follow-up suggestion notification, reload suggestions
      if (notification.type === "FOLLOW_UP_SUGGESTION") {
        console.log("♻️ Reloading follow-up suggestions...");
        loadSuggestions();
      }
    };

    socket.on("notification:new", handleNotificationNew);

    return () => {
      socket.off("notification:new", handleNotificationNew);
    };
  }, [socket, isConnected, loadSuggestions]);

  const handleOpenRejectModal = (suggestion: FollowUpSuggestion) => {
    setSuggestionToReject(suggestion);
    setIsRejectModalOpen(true);
  };

  const handleCloseRejectModal = () => {
    setIsRejectModalOpen(false);
    setSuggestionToReject(null);
    setRejectReason("");
  };

  const handleConfirmReject = async () => {
    if (!suggestionToReject || !rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }

    setIsRejecting(true);
    try {
      const response = await appointmentService.rejectFollowUpSuggestion(suggestionToReject._id, session?.access_token);

      if (response.success) {
        toast.success("Đã từ chối lịch tái khám");
        handleCloseRejectModal();
        loadSuggestions();
      } else {
        toast.error(response.error || "Không thể từ chối lịch tái khám");
      }
    } catch (error) {
      console.error("Failed to reject suggestion:", error);
      toast.error("Không thể từ chối lịch tái khám");
    } finally {
      setIsRejecting(false);
    }
  };

  const handleSchedule = (suggestion: FollowUpSuggestion) => {
    setSelectedSuggestion(suggestion);

    // Initialize booking data with voucher if available
    setBookingData({
      doctorId: suggestion.doctorId._id,
      consultType: ConsultType.ON_SITE,
      chiefComplaint: suggestion.notes || "",
      ...(suggestion.voucherId && {
        voucherCode: suggestion.voucherId.code,
        voucherId: suggestion.voucherId._id,
      }),
    });

    setBookingStep("time-slot");
    setIsBookingModalOpen(true);
  };

  const handleTimeSlotSelect = (date: string, time: string, consultType: ConsultType, endTime: string) => {
    if (!selectedSuggestion) return;

    // Calculate consultation fee based on consult type
    const consultationFee = calculateConsultationFee(consultType, 200000);

    setBookingData((prev) => ({
      ...prev,
      doctorId: selectedSuggestion.doctorId._id,
      appointmentDate: date,
      startTime: time,
      endTime: endTime,
      consultType,
      paymentAmount: consultationFee,
    }));
  };

  const handleContinue = () => {
    setBookingStep("details");
  };

  const handleBackToTimeSlot = () => {
    setBookingStep("time-slot");
    setBookingData((prev) => ({
      doctorId: prev.doctorId,
      ...(prev.voucherCode && { voucherCode: prev.voucherCode }),
      ...(prev.voucherId && { voucherId: prev.voucherId }),
    }));
  };

  const handleDetailsSubmit = (formData: BookingFormData) => {
    setBookingData((prev) => ({
      ...prev,
      ...formData,
    }));
    setBookingStep("confirmation");
  };

  const handleConfirmBooking = async () => {
    const paymentMethod = bookingData.paymentMethod;

    if (paymentMethod === "momo") {
      await handleMoMoPayment();
    } else if (paymentMethod === "wallet") {
      await handleWalletPayment();
    } else {
      await handleBookingSubmit();
    }
  };

  const handleWalletPayment = async () => {
    const userId = (session?.user as { _id?: string })._id;
    if (!userId || !selectedSuggestion) {
      toast.error("Thông tin không đầy đủ");
      return;
    }

    const loadingToast = toast.loading("Đang xử lý thanh toán...");

    try {
      const dataToSubmit = bookingData as BookingFormData;

      if (!dataToSubmit.startTime || !dataToSubmit.appointmentDate || !dataToSubmit.doctorId) {
        toast.dismiss(loadingToast);
        toast.error("Vui lòng điền đầy đủ thông tin");
        return;
      }

      interface SessionWithToken {
        access_token?: string;
        accessToken?: string;
      }
      const accessToken = session?.access_token || (session as SessionWithToken)?.accessToken;

      if (!accessToken) {
        toast.dismiss(loadingToast);
        toast.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        router.push("/auth/signin");
        return;
      }

      toast.loading("Đang tạo lịch hẹn...", { id: loadingToast });

      let endTime = dataToSubmit.endTime;
      const duration = 30;

      if (!endTime) {
        const [hours, minutes] = dataToSubmit.startTime.split(":").map(Number);
        const totalMinutes = hours * 60 + minutes + duration;
        const endHours = Math.floor(totalMinutes / 60) % 24;
        const endMinutes = totalMinutes % 60;
        endTime = `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
      }

      const appointmentPayload = {
        patientId: userId,
        doctorId: dataToSubmit.doctorId,
        appointmentDate: dataToSubmit.appointmentDate,
        startTime: dataToSubmit.startTime,
        endTime: endTime,
        duration: duration,
        consultationFee: dataToSubmit.paymentAmount || calculateConsultationFee(dataToSubmit.consultType, 200000),
        appointmentType:
          dataToSubmit.consultType === ConsultType.TELEVISIT
            ? "Tư vấn từ xa"
            : dataToSubmit.consultType === ConsultType.HOME_VISIT
            ? "Khám tại nhà"
            : "Khám tại phòng khám",
        notes: dataToSubmit.chiefComplaint || "",
        status: AppointmentStatus.CONFIRMED,
        ...(dataToSubmit.voucherCode && { voucherCode: dataToSubmit.voucherCode }),
        ...(dataToSubmit.voucherId && { voucherId: dataToSubmit.voucherId }),
      };

      // Create appointment first
      const result = await appointmentService.createAppointment(appointmentPayload, accessToken);

      if (!result.success || !result.data) {
        toast.dismiss(loadingToast);
        toast.error(result.error || "Không thể tạo lịch hẹn");
        return;
      }

      const appointmentId = result.data._id || result.data.id;

      if (!appointmentId) {
        toast.dismiss(loadingToast);
        toast.error("Không thể lấy ID lịch hẹn");
        return;
      }

      // Update the follow-up suggestion status
      await appointmentService.markFollowUpAsScheduled(selectedSuggestion._id, appointmentId, accessToken);

      // Process wallet payment
      toast.loading("Đang xử lý thanh toán từ ví...", { id: loadingToast });

      const walletService = (await import("@/services/walletService")).default;
      const paymentResult = await walletService.payWithWallet(
        accessToken,
        appointmentId,
        dataToSubmit.paymentAmount || 200000
      );

      if (!paymentResult.success) {
        toast.dismiss(loadingToast);
        toast.error(paymentResult.error || "Thanh toán thất bại");
        // Optionally: Cancel the appointment here
        return;
      }

      toast.dismiss(loadingToast);
      toast.success(`Thanh toán thành công! Số dư mới: ${paymentResult.data?.newBalance.toLocaleString("vi-VN")}đ`);

      // Set confirmation and show success screen
      setConfirmation({
        appointment: {
          ...result.data,
          paymentAmount: result.data.paymentAmount || dataToSubmit.paymentAmount || result.data.consultationFee,
        },
        doctor: {
          _id: selectedSuggestion.doctorId._id,
          id: selectedSuggestion.doctorId._id,
          fullName: selectedSuggestion.doctorId.fullName,
          email: selectedSuggestion.doctorId.email,
          specialty: selectedSuggestion.doctorId.specialty || selectedSuggestion.doctorId.specialization || "",
          profileImage: selectedSuggestion.doctorId.profileImage,
          consultationFee: 200000,
          availableConsultTypes: [ConsultType.ON_SITE],
          experienceYears: 5,
          rating: 4.5,
        },
        bookingId: result.data._id || result.data.id || "",
        confirmationMessage: "Lịch tái khám đã được thanh toán thành công",
        instructions: [
          "Vui lòng đến đúng giờ hẹn",
          "Mang theo CMND/CCCD và sổ khám bệnh (nếu có)",
          "Đến trước 10 phút để làm thủ tục",
        ],
        calendarLinks: {
          google: "",
          ics: "",
        },
      });
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Wallet payment error:", error);
      toast.error(error instanceof Error ? error.message : "Không thể xử lý thanh toán");
    }
  };

  const handleMoMoPayment = async () => {
    const userId = (session?.user as { _id?: string })._id;
    if (!userId || !selectedSuggestion) {
      toast.error("Thông tin không đầy đủ");
      return;
    }

    const loadingToast = toast.loading("Đang xử lý thanh toán...");

    try {
      const dataToSubmit = bookingData as BookingFormData;

      if (!dataToSubmit.startTime || !dataToSubmit.appointmentDate || !dataToSubmit.doctorId) {
        toast.dismiss(loadingToast);
        toast.error("Vui lòng điền đầy đủ thông tin");
        return;
      }

      interface SessionWithToken {
        access_token?: string;
        accessToken?: string;
      }
      const accessToken = session?.access_token || (session as SessionWithToken)?.accessToken;

      if (!accessToken) {
        toast.dismiss(loadingToast);
        toast.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        router.push("/auth/signin");
        return;
      }

      toast.loading("Đang tạo lịch hẹn...", { id: loadingToast });

      let endTime = dataToSubmit.endTime;
      const duration = 30;

      if (!endTime) {
        const [hours, minutes] = dataToSubmit.startTime.split(":").map(Number);
        const totalMinutes = hours * 60 + minutes + duration;
        const endHours = Math.floor(totalMinutes / 60) % 24;
        const endMinutes = totalMinutes % 60;
        endTime = `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
      }

      const appointmentPayload = {
        patientId: userId,
        doctorId: dataToSubmit.doctorId,
        appointmentDate: dataToSubmit.appointmentDate,
        startTime: dataToSubmit.startTime,
        endTime: endTime,
        duration: duration,
        consultationFee: dataToSubmit.paymentAmount || calculateConsultationFee(dataToSubmit.consultType, 200000),
        appointmentType:
          dataToSubmit.consultType === ConsultType.TELEVISIT
            ? "Tư vấn từ xa"
            : dataToSubmit.consultType === ConsultType.HOME_VISIT
            ? "Khám tại nhà"
            : "Khám tại phòng khám",
        notes: dataToSubmit.chiefComplaint || "",
        status: AppointmentStatus.PENDING,
        ...(dataToSubmit.voucherCode && { voucherCode: dataToSubmit.voucherCode }),
        ...(dataToSubmit.voucherId && { voucherId: dataToSubmit.voucherId }),
      };

      const appointmentResult = await appointmentService.createAppointment(appointmentPayload, accessToken);

      if (!appointmentResult.success || !appointmentResult.data) {
        toast.dismiss(loadingToast);
        toast.error(appointmentResult.error || "Không thể tạo lịch hẹn. Vui lòng thử lại.");
        return;
      }

      const appointment = appointmentResult.data;

      toast.loading("Đang tạo thanh toán MoMo...", { id: loadingToast });

      const amount = dataToSubmit.paymentAmount || 200000;
      const appointmentId = appointment._id ?? appointment.id;

      if (!appointmentId) {
        toast.dismiss(loadingToast);
        toast.error("Không tìm thấy appointment id để tạo thanh toán.");
        return;
      }

      const paymentPayload = {
        appointmentId: appointmentId,
        patientId: userId,
        doctorId: selectedSuggestion.doctorId._id,
        amount: amount,
        orderInfo: `Thanh toán lịch tái khám với ${selectedSuggestion.doctorId.fullName}`,
      };

      const paymentResult = await paymentService.createMoMoPayment(paymentPayload, accessToken);

      if (!paymentResult.success || !paymentResult.data?.payUrl) {
        toast.dismiss(loadingToast);
        toast.error(paymentResult.message || "Không thể tạo thanh toán MoMo.");

        try {
          await appointmentService.cancelAppointment(appointmentId, "Không thể tạo thanh toán", accessToken);
        } catch (e) {
          console.error("Failed to cancel appointment:", e);
        }
        return;
      }

      toast.dismiss(loadingToast);
      toast.success("Đang chuyển đến MoMo...");

      const payUrl = paymentResult.data.payUrl;
      window.location.href = payUrl;
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("MoMo payment error:", error);
      toast.error(error instanceof Error ? error.message : "Không thể tạo thanh toán MoMo");
    }
  };

  const handleBookingSubmit = async () => {
    const userId = (session?.user as { _id?: string })._id;
    if (!userId || !selectedSuggestion) {
      toast.error("Thông tin không đầy đủ");
      return;
    }

    const loadingToast = toast.loading("Đang tạo lịch hẹn...");

    try {
      const dataToSubmit = bookingData as BookingFormData;

      if (!dataToSubmit.startTime || !dataToSubmit.appointmentDate || !dataToSubmit.doctorId) {
        toast.dismiss(loadingToast);
        toast.error("Vui lòng điền đầy đủ thông tin");
        return;
      }

      interface SessionWithToken {
        access_token?: string;
        accessToken?: string;
      }
      const accessToken = session?.access_token || (session as SessionWithToken)?.accessToken;

      if (!accessToken) {
        toast.dismiss(loadingToast);
        toast.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        router.push("/auth/signin");
        return;
      }

      let endTime = dataToSubmit.endTime;
      const duration = 30;

      if (!endTime) {
        const [hours, minutes] = dataToSubmit.startTime.split(":").map(Number);
        const totalMinutes = hours * 60 + minutes + duration;
        const endHours = Math.floor(totalMinutes / 60) % 24;
        const endMinutes = totalMinutes % 60;
        endTime = `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
      }

      const appointmentPayload = {
        patientId: userId,
        doctorId: dataToSubmit.doctorId,
        appointmentDate: dataToSubmit.appointmentDate,
        startTime: dataToSubmit.startTime,
        endTime: endTime,
        duration: duration,
        consultationFee: dataToSubmit.paymentAmount || calculateConsultationFee(dataToSubmit.consultType, 200000),
        appointmentType:
          dataToSubmit.consultType === ConsultType.TELEVISIT
            ? "Tư vấn từ xa"
            : dataToSubmit.consultType === ConsultType.HOME_VISIT
            ? "Khám tại nhà"
            : "Khám tại phòng khám",
        notes: dataToSubmit.chiefComplaint || "",
        status: AppointmentStatus.CONFIRMED,
        ...(dataToSubmit.voucherCode && { voucherCode: dataToSubmit.voucherCode }),
        ...(dataToSubmit.voucherId && { voucherId: dataToSubmit.voucherId }),
      };

      const result = await appointmentService.createAppointment(appointmentPayload, accessToken);

      if (result.success && result.data) {
        toast.dismiss(loadingToast);
        toast.success("Đặt lịch tái khám thành công!");

        // Update the follow-up suggestion status
        const appointmentId = result.data._id || result.data.id;
        if (appointmentId) {
          await appointmentService.markFollowUpAsScheduled(selectedSuggestion._id, appointmentId, accessToken);
        }

        // Set confirmation and show success screen
        setConfirmation({
          appointment: {
            ...result.data,
            // Ensure paymentAmount reflects the actual amount paid (with voucher applied)
            paymentAmount: result.data.paymentAmount || dataToSubmit.paymentAmount || result.data.consultationFee,
          },
          doctor: {
            _id: selectedSuggestion.doctorId._id,
            id: selectedSuggestion.doctorId._id,
            fullName: selectedSuggestion.doctorId.fullName,
            email: selectedSuggestion.doctorId.email,
            specialty: selectedSuggestion.doctorId.specialty || selectedSuggestion.doctorId.specialization || "",
            profileImage: selectedSuggestion.doctorId.profileImage,
            consultationFee: 200000,
            availableConsultTypes: [ConsultType.ON_SITE],
            experienceYears: 5,
            rating: 4.5,
          },
          bookingId: result.data._id || result.data.id || "",
          confirmationMessage: "Lịch tái khám của bạn đã được xác nhận",
          instructions: [
            "Vui lòng đến đúng giờ hẹn",
            "Mang theo CMND/CCCD và sổ khám bệnh (nếu có)",
            "Đến trước 10 phút để làm thủ tục",
          ],
          calendarLinks: {
            google: "",
            ics: "",
          },
        });

        // Stay at confirmation step - modal will show success screen when confirmation is set
        // No need to change step - the modal will render success screen automatically

        // DON'T reload suggestions immediately - it would close the modal
        // User will close modal manually after viewing confirmation
        // loadSuggestions(); // Commented out to prevent modal from closing
      } else {
        toast.dismiss(loadingToast);
        toast.error(result.error || "Không thể tạo lịch hẹn");
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Booking error:", error);
      toast.error(error instanceof Error ? error.message : "Không thể tạo lịch hẹn");
    }
  };

  const handleCloseBookingModal = () => {
    setIsBookingModalOpen(false);
    setSelectedSuggestion(null);
    setBookingStep("time-slot");
    setBookingData({});
    setConfirmation(null);
    // Reload suggestions when modal closes to update the list
    loadSuggestions();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="text-center text-gray-500">Đang tải...</div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Không có lịch tái khám nào</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion._id}
            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  {/* Doctor Avatar */}
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {suggestion.doctorId.profileImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={suggestion.doctorId.profileImage}
                        alt={suggestion.doctorId.fullName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <Stethoscope className="w-8 h-8 text-primary" />
                    )}
                  </div>

                  {/* Doctor Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {suggestion.doctorId.fullName || "Bác sĩ"}
                    </h3>
                    <p className="text-sm text-primary mb-2">
                      {suggestion.doctorId.specialty || suggestion.doctorId.specialization || "Nha khoa"}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      {/* Suggested Date */}
                      {suggestion.suggestedDate && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{format(new Date(suggestion.suggestedDate), "PPP", { locale: vi })}</span>
                        </div>
                      )}

                      {/* Suggested Time */}
                      {suggestion.suggestedTime && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{suggestion.suggestedTime}</span>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {suggestion.notes && (
                      <div className="flex items-start gap-2 text-sm text-gray-600 mb-3">
                        <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{suggestion.notes}</span>
                      </div>
                    )}

                    {/* Voucher */}
                    {suggestion.voucherId && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-sm">
                          <Gift className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-gray-700">Ưu đãi đặc biệt:</span>
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded border border-green-200">
                            {suggestion.voucherId.code}
                          </span>
                          <span className="text-xs font-medium px-2 py-0.5 bg-green-50 text-green-600 rounded">
                            -{suggestion.voucherId.discountPercentage}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2 ml-4">
                  <span className="px-3 py-1.5 rounded-full text-xs font-medium border bg-yellow-100 text-yellow-700 border-yellow-200">
                    Chờ xác nhận
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleSchedule(suggestion)}
                  className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  Đặt lịch ngay
                </button>
                <button
                  onClick={() => handleOpenRejectModal(suggestion)}
                  className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
                >
                  Từ chối
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Booking Flow Modal */}
      {isBookingModalOpen && selectedSuggestion && (
        <BookingFlowModal
          doctor={{
            _id: selectedSuggestion.doctorId._id,
            id: selectedSuggestion.doctorId._id,
            fullName: selectedSuggestion.doctorId.fullName,
            email: selectedSuggestion.doctorId.email,
            specialty: selectedSuggestion.doctorId.specialty || selectedSuggestion.doctorId.specialization || "",
            profileImage: selectedSuggestion.doctorId.profileImage,
            consultationFee: 200000,
            availableConsultTypes: [ConsultType.ON_SITE, ConsultType.TELEVISIT],
            experienceYears: 5,
            rating: 4.5,
          }}
          step={bookingStep}
          bookingData={bookingData}
          confirmation={confirmation}
          onClose={handleCloseBookingModal}
          onSelectSlot={handleTimeSlotSelect}
          onDetailsSubmit={handleDetailsSubmit}
          onConfirmBooking={handleConfirmBooking}
          onBackToTimeSlot={handleBackToTimeSlot}
          onContinue={handleContinue}
        />
      )}

      {/* Reject Confirmation Modal */}
      {isRejectModalOpen && suggestionToReject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Xác nhận từ chối</h3>
              <button
                onClick={handleCloseRejectModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isRejecting}
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Bạn có chắc chắn muốn từ chối lịch tái khám với{" "}
                <strong>Bác sĩ {suggestionToReject.doctorId.fullName}</strong>
                {suggestionToReject.suggestedDate && (
                  <>
                    {" "}
                    vào{" "}
                    <strong>
                      {format(new Date(suggestionToReject.suggestedDate), "PPP", { locale: vi })}
                      {suggestionToReject.suggestedTime && ` lúc ${suggestionToReject.suggestedTime}`}
                    </strong>
                  </>
                )}
                ?
              </p>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lý do từ chối <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Vui lòng cho biết lý do bạn muốn từ chối lịch tái khám này..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                rows={4}
                disabled={isRejecting}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCloseRejectModal}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                disabled={isRejecting}
              >
                Đóng
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={!rejectReason.trim() || isRejecting}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRejecting ? "Đang từ chối..." : "Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
