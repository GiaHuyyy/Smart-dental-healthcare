"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Map, List, Calendar } from "lucide-react";
import { toast } from "sonner";
import SearchDoctors from "@/components/appointments/SearchDoctors";
import DoctorList from "@/components/appointments/DoctorList";
import TimeSlotPicker from "@/components/appointments/TimeSlotPicker";
import BookingForm from "@/components/appointments/BookingForm";
import AppointmentConfirmationComponent from "@/components/appointments/AppointmentConfirmation";
import { Doctor, SearchFilters, BookingFormData, AppointmentConfirmation, ConsultType } from "@/types/appointment";

type BookingStep = "search" | "timeslot" | "details" | "confirmation";

export default function PatientAppointmentsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [step, setStep] = useState<BookingStep>("search");
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

  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    // Open modal for TimeSlotPicker
  };

  const handleBookAppointment = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    // Open modal for TimeSlotPicker
  };

  const handleTimeSlotSelect = (date: string, time: string, consultType: ConsultType) => {
    if (!selectedDoctor) return;

    setBookingData({
      doctorId: selectedDoctor._id || selectedDoctor.id || "",
      appointmentDate: date,
      startTime: time,
      consultType,
    });
    setStep("details");
  };

  const handleBookingSubmit = async (formData: BookingFormData) => {
    const userId = (session?.user as { _id?: string })._id;
    if (!userId) {
      toast.error("Vui lòng đăng nhập để đặt lịch");
      router.push("/auth/signin");
      return;
    }

    try {
      const payload = {
        ...formData,
        patientId: userId,
        status: "pending",
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create appointment");
      }

      const result = await res.json();
      const appointment = result?.data || result;

      // Create confirmation
      const confirmationData: AppointmentConfirmation = {
        appointment: {
          ...appointment,
          doctor: selectedDoctor,
        },
        doctor: selectedDoctor!,
        bookingId: appointment._id || appointment.id || `BK${Date.now()}`,
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

      setConfirmation(confirmationData);
      setStep("confirmation");
      toast.success("Đặt lịch thành công!");
    } catch (error: unknown) {
      console.error("Booking error:", error);
      const errorMessage = error instanceof Error ? error.message : "Không thể đặt lịch";
      toast.error(errorMessage);
    }
  };

  const handleReschedule = () => {
    setStep("search");
    setConfirmation(null);
    // Keep selectedDoctor so TimeSlotPicker remains visible
  };

  const handleCloseConfirmation = () => {
    router.push("/patient/appointments/my-appointments");
  };

  const handleBackToSearch = () => {
    setStep("search");
    setSelectedDoctor(null);
    setBookingData({});
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="healthcare-card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Tìm kiếm và đặt lịch hẹn</h1>
              <p className="text-gray-600">
                {step === "search" && "Tìm bác sĩ nha khoa và chọn thời gian khám phù hợp"}
                {step === "details" && "Điền thông tin chi tiết"}
                {step === "confirmation" && "Lịch hẹn đã được xác nhận"}
              </p>
            </div>

            {/* Step Indicator */}
            <div className="hidden md:flex items-center gap-2">
              <StepIndicator
                step={1}
                label="Chọn bác sĩ & giờ"
                active={step === "search"}
                completed={step !== "search"}
              />
              <div className="w-8 h-0.5 bg-gray-300" />
              <StepIndicator
                step={2}
                label="Chi tiết"
                active={step === "details"}
                completed={step === "confirmation"}
              />
              <div className="w-8 h-0.5 bg-gray-300" />
              <StepIndicator step={3} label="Xác nhận" active={step === "confirmation"} completed={false} />
            </div>
          </div>
        </div>

        {/* Main Content */}
        {step === "search" && (
          <>
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

            {/* TimeSlot Picker Modal */}
            {selectedDoctor && (
              <div
                className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in"
                onClick={() => setSelectedDoctor(null)}
              >
                <div
                  className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto shadow-2xl animate-scale-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <TimeSlotPicker
                    doctor={selectedDoctor}
                    onClose={() => setSelectedDoctor(null)}
                    onSelectSlot={handleTimeSlotSelect}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Booking Form */}
        {step === "details" && selectedDoctor && (
          <div className="healthcare-card p-6">
            <BookingForm initialData={bookingData} onSubmit={handleBookingSubmit} onCancel={handleBackToSearch} />
          </div>
        )}

        {/* Confirmation */}
        {step === "confirmation" && confirmation && (
          <AppointmentConfirmationComponent
            confirmation={confirmation}
            onClose={handleCloseConfirmation}
            onReschedule={handleReschedule}
            onDownloadReceipt={() => {
              window.open(confirmation.receiptUrl, "_blank");
            }}
          />
        )}
      </div>
    </div>
  );
}

// Step Indicator Component
function StepIndicator({
  step,
  label,
  active,
  completed,
}: {
  step: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
          active ? "text-white" : completed ? "bg-green-600 text-white" : "bg-gray-200 text-gray-600"
        }`}
        style={active ? { backgroundColor: "var(--color-primary)" } : {}}
      >
        {completed ? "✓" : step}
      </div>
      <span
        className={`text-xs mt-1 ${active ? "font-medium" : "text-gray-600"}`}
        style={active ? { color: "var(--color-primary)" } : {}}
      >
        {label}
      </span>
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
    location: doctor.clinicAddress || "",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
