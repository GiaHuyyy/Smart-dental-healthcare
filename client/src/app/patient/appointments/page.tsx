"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Map, List, Calendar } from "lucide-react";
import { toast } from "sonner";
import appointmentService from "@/services/appointmentService";
import SearchDoctors from "@/components/appointments/SearchDoctors";
import DoctorList from "@/components/appointments/DoctorList";
import BookingFlowModal, { BookingFlowStep } from "@/components/appointments/BookingFlowModal";
import { Doctor, SearchFilters, BookingFormData, AppointmentConfirmation, ConsultType } from "@/types/appointment";

export default function PatientAppointmentsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [viewMode, setViewMode] = useState<"list" | "map">("map");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    searchQuery: searchParams.get("q") || "",
    specialty: searchParams.get("specialty") || "",
    gender: "all",
    consultType: "all",
    availability: "all",
  });

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

  const handleTimeSlotSelect = (date: string, time: string, consultType: ConsultType) => {
    if (!selectedDoctor) return;

    setBookingData((prev) => ({
      ...prev,
      doctorId: selectedDoctor._id || selectedDoctor.id || "",
      appointmentDate: date,
      startTime: time,
      consultType,
    }));
    setBookingStep("details");
  };

  const handleBookingSubmit = async (formData: BookingFormData) => {
    const userId = (session?.user as { _id?: string })._id;
    if (!userId) {
      toast.error("Vui lòng đăng nhập để đặt lịch");
      router.push("/auth/signin");
      return;
    }

    try {
      // Validate required fields
      if (!formData.startTime || !formData.appointmentDate || !formData.doctorId) {
        toast.error("Vui lòng điền đầy đủ thông tin");
        return;
      }

      // Validate time format HH:MM
      const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
      if (!timeRegex.test(formData.startTime)) {
        toast.error("Giờ khám không hợp lệ. Vui lòng chọn lại");
        return;
      }

      // Calculate duration (default 30 minutes)
      const duration = 30;

      // Calculate end time properly
      const [hours, minutes] = formData.startTime.split(":").map(Number);
      const totalMinutes = hours * 60 + minutes + duration;
      const endHours = Math.floor(totalMinutes / 60) % 24;
      const endMinutes = totalMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;

      // Prepare payload
      const payload = {
        patientId: userId,
        doctorId: formData.doctorId,
        appointmentDate: formData.appointmentDate,
        startTime: formData.startTime,
        endTime: endTime,
        duration: duration,
        consultationFee: selectedDoctor?.consultationFee || 0,
        appointmentType:
          formData.consultType === ConsultType.TELEVISIT
            ? "Tư vấn từ xa"
            : formData.consultType === ConsultType.HOME_VISIT
            ? "Khám tại nhà"
            : "Khám tại phòng khám",
        notes: formData.chiefComplaint || "",
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
        ...formData,
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

  const handleReschedule = () => {
    setConfirmation(null);
    setBookingData((prev) => ({
      ...prev,
      appointmentDate: undefined,
      startTime: undefined,
    }));
    setBookingStep("time-slot");
  };

  const handleCloseConfirmation = () => {
    resetBookingFlow();
    router.push("/patient/appointments/my-appointments");
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
          onSubmitDetails={handleBookingSubmit}
          onBackToTimeSlot={() => setBookingStep("time-slot")}
          onReschedule={handleReschedule}
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
