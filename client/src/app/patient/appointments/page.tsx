"use client";

import BookingFlowModal, { BookingFlowStep } from "@/components/appointments/BookingFlowModal";
import DoctorList from "@/components/appointments/DoctorList";
import SearchDoctors from "@/components/appointments/SearchDoctors";
import appointmentService from "@/services/appointmentService";
import paymentService from "@/services/paymentService";
import walletService from "@/services/walletService";
import {
  AppointmentConfirmation,
  AppointmentStatus,
  BookingFormData,
  ConsultType,
  Doctor,
  SearchFilters,
} from "@/types/appointment";
import { calculateConsultationFee } from "@/utils/consultationFees";
import { Calendar, List, Map } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppSelector } from "@/store/hooks";

export default function PatientAppointmentsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Get AI chat data from Redux
  const aiDoctor = useAppSelector((state) => state.appointment.selectedDoctor);
  const appointmentData = useAppSelector((state) => state.appointment.appointmentData);

  // State
  const [viewMode, setViewMode] = useState<"list" | "map">("map");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    searchQuery: "",
    specialty: "",
    gender: "all",
    consultType: "all",
    availability: "all",
  });

  // Read URL query params on mount (client-side) to avoid useSearchParams prerender bailout
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q") || "";
      const specialty = params.get("specialty") || "";
      setFilters((prev) => ({ ...prev, searchQuery: q, specialty }));
    } catch (e) {
      // ignore
    }
    // run only once on mount
  }, []);

  // Booking flow state
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState<BookingFlowStep>("time-slot");
  const [bookingData, setBookingData] = useState<Partial<BookingFormData>>({});
  const [confirmation, setConfirmation] = useState<AppointmentConfirmation | null>(null);

  // Load initial doctors on mount (without filters)
  useEffect(() => {
    if (!session?.user) return;
    fetchDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Auto-open modal when coming from AI chat
  useEffect(() => {
    if (typeof window === "undefined" || !session?.user) return;

    const params = new URLSearchParams(window.location.search);
    const fromAI = params.get("fromAI");

    console.log("🔍 AI Chat Auto-open Check:", {
      fromAI,
      hasAiDoctor: !!aiDoctor,
      hasAppointmentData: !!appointmentData,
      doctorsCount: doctors.length,
      loading,
    });

    // Wait until doctors are loaded before trying to match
    if (fromAI === "true" && aiDoctor && appointmentData && doctors.length > 0 && !loading) {
      console.log("🎯 Searching for doctor:", aiDoctor.fullName, "ID:", aiDoctor._id);

      // Find the matching doctor from the doctors list by ID or name
      const matchingDoctor = doctors.find(
        (doc) => doc._id === aiDoctor._id || doc.fullName.toLowerCase() === aiDoctor.fullName.toLowerCase()
      );

      console.log("✅ Doctor found:", matchingDoctor?.fullName);

      if (matchingDoctor) {
        setSelectedDoctor(matchingDoctor);
        setBookingData({
          doctorId: matchingDoctor._id,
          consultType: ConsultType.ON_SITE,
          // Pre-fill chief complaint with AI symptoms
          chiefComplaint: appointmentData.symptoms || "",
        });
        setBookingStep("time-slot");
        setIsBookingModalOpen(true);

        // Clean up URL after successful modal open
        window.history.replaceState(null, "", "/patient/appointments");
      } else {
        // If doctor not found in list after loading, show error
        toast.error(`Không tìm thấy bác sĩ ${aiDoctor.fullName}`);
        // Still clean up URL
        window.history.replaceState(null, "", "/patient/appointments");
      }
    }
  }, [session, aiDoctor, appointmentData, doctors, loading]);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.searchQuery) params.set("search", filters.searchQuery);
      if (filters.specialty && filters.specialty !== "all") params.set("specialty", filters.specialty);
      if (filters.gender && filters.gender !== "all") params.set("gender", filters.gender);
      if (filters.experienceRange && filters.experienceRange[0] > 0) {
        params.set("minExperience", filters.experienceRange[0].toString());
      }

      console.log("Fetch doctors with params:", params.toString());

      const url = `/api/users/doctors?${params.toString()}`;
      const res = await fetch(url, { method: "GET" });
      console.log("Fetch response:", res);
      if (!res.ok) throw new Error("Failed to fetch doctors");

      const data = await res.json();
      console.log("Fetch data:", data);
      const doctorList = data?.data || data?.users || data?.results || data || [];
      setDoctors(Array.isArray(doctorList) ? doctorList : []);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      toast.error("Không thể tải danh sách bác sĩ");
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchDoctors();
  };

  const handleDoctorSelect = (doctor: Doctor | null) => {
    setSelectedDoctor(doctor);
  };

  const handleBookAppointment = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setBookingData((prev) => ({
      ...prev,
      doctorId: doctor._id || doctor.id || "",
      consultType: prev.consultType || doctor.availableConsultTypes?.[0] || ConsultType.ON_SITE,
      appointmentDate: undefined,
      startTime: undefined,
    }));
    setConfirmation(null);
    setBookingStep("time-slot");
    setIsBookingModalOpen(true);
  };

  const handleTimeSlotSelect = (date: string, time: string, consultType: ConsultType, endTime: string) => {
    if (!selectedDoctor) return;

    // Calculate consultation fee based on consult type
    const consultationFee = calculateConsultationFee(consultType, selectedDoctor.consultationFee);

    setBookingData((prev) => ({
      ...prev,
      doctorId: selectedDoctor._id || selectedDoctor.id || "",
      appointmentDate: date,
      startTime: time,
      endTime: endTime,
      consultType,
      paymentAmount: consultationFee, // Set payment amount based on consult type
    }));
    // Don't auto-navigate to next step, wait for Continue button
  };

  const handleContinue = () => {
    // Navigate to next step when Continue button is clicked
    setBookingStep("details");
  };

  const handleBackToTimeSlot = () => {
    // Reset to step 1 and clear form data to force re-fetch of available slots
    setBookingStep("time-slot");
    setBookingData((prev) => ({
      doctorId: prev.doctorId, // Keep doctor ID
      // Clear all other data to force TimeSlotPicker to re-fetch
    }));
  };

  const handleDetailsSubmit = (formData: BookingFormData) => {
    // Step 2: Save form data to state and navigate to confirmation step
    setBookingData((prev) => ({
      ...prev,
      ...formData,
    }));
    setBookingStep("confirmation");
  };

  const handleConfirmBooking = async () => {
    // Step 3: Check payment method and handle accordingly
    const paymentMethod = bookingData.paymentMethod;

    if (paymentMethod === "momo") {
      await handleMoMoPayment();
    } else if (paymentMethod === "wallet") {
      await handleWalletPayment();
    } else {
      await handleBookingSubmit();
    }
  };

  const handleMoMoPayment = async () => {
    const userId = (session?.user as { _id?: string })._id;
    if (!userId || !selectedDoctor) {
      toast.error("Thông tin không đầy đủ");
      return;
    }

    const loadingToast = toast.loading("Đang xử lý thanh toán...");

    try {
      const dataToSubmit = bookingData as BookingFormData;

      // Validate required fields
      if (!dataToSubmit.startTime || !dataToSubmit.appointmentDate || !dataToSubmit.doctorId) {
        toast.dismiss(loadingToast);
        toast.error("Vui lòng điền đầy đủ thông tin");
        return;
      }

      // Get access token
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

      // Step 1: Create appointment with pending_payment status
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
        consultationFee:
          dataToSubmit.paymentAmount ||
          calculateConsultationFee(dataToSubmit.consultType, selectedDoctor?.consultationFee),
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

      // Step 2: Create MoMo payment
      toast.loading("Đang tạo thanh toán MoMo...", { id: loadingToast });

      const amount = dataToSubmit.paymentAmount || selectedDoctor.consultationFee || 200000;

      // Ensure we have required string IDs before creating payment
      const appointmentId = appointment._id ?? appointment.id;
      if (!appointmentId) {
        toast.dismiss(loadingToast);
        toast.error("Không tìm thấy appointment id để tạo thanh toán. Vui lòng thử lại.");
        return;
      }

      const doctorId =
        selectedDoctor?._id ??
        selectedDoctor?.id ??
        (appointment.doctor?._id as string | undefined) ??
        (appointment.doctor?.id as string | undefined);
      if (!doctorId) {
        toast.dismiss(loadingToast);
        toast.error("Không tìm thấy bác sĩ liên quan đến lịch hẹn. Vui lòng thử lại.");
        return;
      }

      const paymentPayload = {
        appointmentId: appointmentId,
        patientId: userId,
        doctorId: doctorId,
        amount: amount,
        orderInfo: `Thanh toán lịch khám với ${selectedDoctor?.fullName || appointment.doctor?.fullName || "bác sĩ"}`,
      };

      const paymentResult = await paymentService.createMoMoPayment(paymentPayload, accessToken);

      if (!paymentResult.success || !paymentResult.data?.payUrl) {
        toast.dismiss(loadingToast);
        toast.error(paymentResult.message || "Không thể tạo thanh toán MoMo. Vui lòng thử lại.");

        // Cancel the appointment since payment creation failed
        try {
          await appointmentService.cancelAppointment(appointmentId, "Không thể tạo thanh toán", accessToken);
        } catch (e) {
          console.error("Failed to cancel appointment:", e);
        }

        return;
      }

      // Step 3: Redirect to MoMo
      toast.success("Đang chuyển đến trang thanh toán MoMo...", {
        id: loadingToast,
        duration: 2000,
      });

      // Save appointment ID to localStorage for recovery
      localStorage.setItem(
        "pending_payment_appointment",
        JSON.stringify({
          appointmentId: appointment._id || appointment.id,
          timestamp: Date.now(),
        })
      );

      // Extract payUrl (we validated data presence above) and redirect after a short delay
      const payUrl = paymentResult.data!.payUrl;

      setTimeout(() => {
        window.location.href = payUrl;
      }, 1500);
    } catch (err: unknown) {
      toast.dismiss(loadingToast);
      console.error("MoMo payment error:", err);

      const errorMessage =
        (err as any)?.response?.data?.message ||
        (err instanceof Error ? err.message : "Có lỗi xảy ra khi tạo thanh toán. Vui lòng thử lại.");

      toast.error(errorMessage);
    }
  };

  const handleWalletPayment = async () => {
    const userId = (session?.user as { _id?: string })._id;
    const accessToken = (session as { access_token?: string })?.access_token;

    if (!userId || !selectedDoctor || !accessToken) {
      toast.error("Thông tin không đầy đủ");
      return;
    }

    const loadingToast = toast.loading("Đang xử lý thanh toán ví...");

    try {
      const dataToSubmit = bookingData as BookingFormData;

      // Validate required fields
      if (!dataToSubmit.startTime || !dataToSubmit.appointmentDate || !dataToSubmit.doctorId) {
        toast.dismiss(loadingToast);
        toast.error("Vui lòng điền đầy đủ thông tin");
        return;
      }

      // Calculate end time and duration
      let endTime = dataToSubmit.endTime;
      const duration = 30;

      if (!endTime) {
        const [hours, minutes] = dataToSubmit.startTime.split(":").map(Number);
        const totalMinutes = hours * 60 + minutes + duration;
        const endHours = Math.floor(totalMinutes / 60) % 24;
        const endMinutes = totalMinutes % 60;
        endTime = `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
      }

      // Step 1: Create appointment
      toast.loading("Đang tạo lịch hẹn...", { id: loadingToast });

      const appointmentPayload = {
        patientId: userId,
        doctorId: dataToSubmit.doctorId,
        appointmentDate: dataToSubmit.appointmentDate,
        startTime: dataToSubmit.startTime,
        endTime: endTime,
        duration: duration,
        consultationFee:
          dataToSubmit.paymentAmount ||
          calculateConsultationFee(dataToSubmit.consultType, selectedDoctor?.consultationFee),
        appointmentType:
          dataToSubmit.consultType === ConsultType.TELEVISIT
            ? "Tư vấn từ xa"
            : dataToSubmit.consultType === ConsultType.HOME_VISIT
            ? "Khám tại nhà"
            : "Khám tại phòng khám",
        notes: dataToSubmit.chiefComplaint || "",
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
      const appointmentId = appointment._id ?? appointment.id;

      if (!appointmentId) {
        toast.dismiss(loadingToast);
        toast.error("Không lấy được ID lịch hẹn");
        return;
      }

      const amount = dataToSubmit.paymentAmount || selectedDoctor.consultationFee || 200000;

      // Step 2: Pay with wallet
      toast.loading("Đang thanh toán bằng ví...", { id: loadingToast });

      const paymentResult = await walletService.payWithWallet(accessToken, appointmentId, amount);

      if (!paymentResult.success) {
        toast.dismiss(loadingToast);
        toast.error(paymentResult.error || "Thanh toán thất bại");
        return;
      }

      toast.dismiss(loadingToast);
      toast.success(`Thanh toán thành công! Số dư mới: ${paymentResult.data?.newBalance?.toLocaleString("vi-VN")}đ`);

      // Step 3: Show confirmation
      const confirmationData: AppointmentConfirmation = {
        appointment: {
          ...appointment,
          doctor: selectedDoctor || undefined,
        },
        doctor: selectedDoctor,
        bookingId: appointment._id || `BK${Date.now()}`,
        confirmationMessage: "Lịch hẹn của bạn đã được đặt thành công và đã thanh toán bằng ví!",
        instructions: [
          "Vui lòng đến trước 15 phút để làm thủ tục",
          "Mang theo CMND/CCCD và sổ khám bệnh (nếu có)",
          "Đến trước 10 phút để làm thủ tục",
        ],
        calendarLinks: {
          google: generateGoogleCalendarLink(appointment, selectedDoctor),
          ics: `/api/appointments/${appointment._id}/ics`,
        },
        receiptUrl: `/api/appointments/${appointment._id}/receipt`,
      };

      setBookingData((prev) => ({
        ...prev,
        ...dataToSubmit,
      }));
      setConfirmation(confirmationData);
      setBookingStep("confirmation");
      toast.success("Đặt lịch thành công!");
    } catch (error: unknown) {
      toast.dismiss(loadingToast);
      const errorMessage = error instanceof Error ? error.message : "Không thể xử lý thanh toán ví";
      toast.error(errorMessage);
    }
  };

  const handleBookingSubmit = async (formData?: BookingFormData) => {
    // If no formData provided (called from confirmation button), use existing bookingData
    const dataToSubmit = formData || (bookingData as BookingFormData);

    const userId = (session?.user as { _id?: string })._id;
    if (!userId) {
      toast.error("Vui lòng đăng nhập để đặt lịch");
      router.push("/auth/signin");
      return;
    }

    try {
      // Validate required fields
      if (!dataToSubmit.startTime || !dataToSubmit.appointmentDate || !dataToSubmit.doctorId) {
        toast.error("Vui lòng điền đầy đủ thông tin");
        return;
      }

      // Validate time format HH:MM
      const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
      if (!timeRegex.test(dataToSubmit.startTime)) {
        toast.error("Giờ khám không hợp lệ. Vui lòng chọn lại");
        return;
      }

      // Use endTime from dataToSubmit if available, otherwise calculate
      let endTime = dataToSubmit.endTime;
      let duration = 30; // default

      if (!endTime) {
        // Calculate end time (fallback)
        const [hours, minutes] = dataToSubmit.startTime.split(":").map(Number);
        const totalMinutes = hours * 60 + minutes + duration;
        const endHours = Math.floor(totalMinutes / 60) % 24;
        const endMinutes = totalMinutes % 60;
        endTime = `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
      } else {
        // Calculate duration from start and end times
        const [startHours, startMinutes] = dataToSubmit.startTime.split(":").map(Number);
        const [endHours, endMinutes] = endTime.split(":").map(Number);
        duration = endHours * 60 + endMinutes - (startHours * 60 + startMinutes);
      }

      // Prepare payload
      const payload = {
        patientId: userId,
        doctorId: dataToSubmit.doctorId,
        appointmentDate: dataToSubmit.appointmentDate,
        startTime: dataToSubmit.startTime,
        endTime: endTime,
        duration: duration,
        consultationFee:
          dataToSubmit.paymentAmount ||
          calculateConsultationFee(dataToSubmit.consultType, selectedDoctor?.consultationFee),
        appointmentType:
          dataToSubmit.consultType === ConsultType.TELEVISIT
            ? "Tư vấn từ xa"
            : dataToSubmit.consultType === ConsultType.HOME_VISIT
            ? "Khám tại nhà"
            : "Khám tại phòng khám",
        notes: dataToSubmit.chiefComplaint || "",
        paymentMethod: dataToSubmit.paymentMethod || "later", // Add payment method
        ...(dataToSubmit.voucherCode && { voucherCode: dataToSubmit.voucherCode }),
        ...(dataToSubmit.voucherId && { voucherId: dataToSubmit.voucherId }),
      };

      console.log("Booking payload:", payload); // Debug log

      // Call API to create appointment - get token from session
      interface SessionWithToken {
        access_token?: string;
        accessToken?: string;
      }
      const accessToken = session?.access_token || (session as SessionWithToken)?.accessToken;
      console.log("Access token:", accessToken ? "✅ Available" : "❌ Missing");

      const result = await appointmentService.createAppointment(payload, accessToken);
      console.log("API result:", result);

      if (!result.success || !result.data) {
        const errorMsg = result.error || "Không thể đặt lịch hẹn";
        console.error("API error details:", errorMsg);
        throw new Error(errorMsg);
      }

      const appointment = result.data;

      // Create confirmation
      const confirmationData: AppointmentConfirmation = {
        appointment: {
          ...appointment,
          doctor: selectedDoctor || undefined,
        },
        doctor: selectedDoctor!,
        bookingId: appointment._id || `BK${Date.now()}`,
        confirmationMessage: "Lịch hẹn của bạn đã được đặt thành công!",
        instructions: [
          "Đến phòng khám trước giờ hẹn 10-15 phút",
          "Mang theo giấy tờ tùy thân và bảo hiểm y tế (nếu có)",
          "Gặp bác sĩ để thảo luận về tình trạng sức khỏe và phương án điều trị",
          "Bác sĩ sẽ lên kế hoạch điều trị có thể bao gồm làm sạch, trám, nhổ răng hoặc các thủ thuật khác",
        ],
        calendarLinks: {
          google: generateGoogleCalendarLink(appointment, selectedDoctor!),
          ics: `/api/appointments/${appointment._id}/ics`,
        },
        receiptUrl: `/api/appointments/${appointment._id}/receipt`,
      };

      setBookingData((prev) => ({
        ...prev,
        ...dataToSubmit,
      }));
      setConfirmation(confirmationData);
      setBookingStep("confirmation");
      toast.success("Đặt lịch thành công!");
    } catch (error: unknown) {
      console.error("Booking error:", error);
      const errorMessage = error instanceof Error ? error.message : "Không thể đặt lịch";
      toast.error(errorMessage);
    }
  };

  const handleCloseConfirmation = () => {
    // Only reset booking flow, don't redirect
    // User requested to stay on the page after successful booking
    resetBookingFlow();
  };

  const resetBookingFlow = () => {
    setIsBookingModalOpen(false);
    setBookingStep("time-slot");
    setBookingData({});
    setConfirmation(null);
    setSelectedDoctor(null);
  };

  const handleModalClose = () => {
    if (bookingStep === "confirmation" && confirmation) {
      handleCloseConfirmation();
    } else {
      resetBookingFlow();
    }
  };

  // TODO: Uncomment when ready to implement receipt download
  // const handleDownloadReceipt = () => {
  //   const receiptUrl = confirmation?.receiptUrl;
  //   if (receiptUrl) {
  //     window.open(receiptUrl, "_blank", "noopener,noreferrer");
  //   }
  // };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="healthcare-card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Tìm kiếm và đặt lịch hẹn</h1>
              <p className="text-gray-600">Chọn bác sĩ phù hợp và hoàn tất đặt lịch chỉ trong vài bước.</p>
            </div>
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
              <span className="font-semibold text-gray-700">Quy trình:</span>
              <span>1. Chọn bác sĩ</span>
              <span>→</span>
              <span>2. Chọn giờ & điền thông tin</span>
              <span>→</span>
              <span>3. Xác nhận</span>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <SearchDoctors filters={filters} onFiltersChange={setFilters} onSearch={handleSearch} />

        {/* View Toggle */}
        <div className="healthcare-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("map")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  viewMode === "map"
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Map className="w-5 h-5" />
                Bản đồ
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  viewMode === "list"
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <List className="w-5 h-5" />
                Danh sách
              </button>
            </div>

            <button
              onClick={() => router.push("/patient/appointments/my-appointments")}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Calendar className="w-5 h-5" />
              Lịch hẹn của tôi
            </button>
          </div>
        </div>

        {/* Doctor List */}
        <DoctorList
          doctors={doctors}
          loading={loading}
          viewMode={viewMode}
          onDoctorSelect={handleDoctorSelect}
          onBookAppointment={handleBookAppointment}
          selectedDoctor={selectedDoctor}
        />
      </div>

      {isBookingModalOpen && selectedDoctor && (
        <BookingFlowModal
          doctor={selectedDoctor}
          step={bookingStep}
          bookingData={bookingData}
          confirmation={confirmation}
          onClose={handleModalClose}
          onSelectSlot={handleTimeSlotSelect}
          onDetailsSubmit={handleDetailsSubmit}
          onConfirmBooking={handleConfirmBooking}
          onBackToTimeSlot={handleBackToTimeSlot}
          onContinue={handleContinue}
        />
      )}
    </div>
  );
}

// Helper function to generate Google Calendar link
function generateGoogleCalendarLink(
  appointment: { appointmentDate: string; startTime: string },
  doctor: Doctor
): string {
  const date = new Date(appointment.appointmentDate);
  const [hours, minutes] = appointment.startTime.split(":");
  date.setHours(parseInt(hours), parseInt(minutes));

  const endDate = new Date(date);
  endDate.setMinutes(endDate.getMinutes() + 60); // Assume 1 hour appointment

  const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Lịch hẹn với ${doctor.fullName}`,
    dates: `${formatDate(date)}/${formatDate(endDate)}`,
    details: `Khám với ${doctor.fullName} - ${doctor.specialty}`,
    location: doctor.address || "",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
