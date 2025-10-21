"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { X, Calendar, Clock, User, Mail, Phone, MapPin, Plus, Download, CalendarDays, CheckCircle } from "lucide-react";
import { useGlobalSocket } from "@/contexts/GlobalSocketContext";
import { useAppointment } from "@/contexts/AppointmentContext";
import DoctorCalendar from "@/components/Calendar/DoctorCalendar";
import { View } from "react-big-calendar";
import Image from "next/image";
import { toast } from "sonner";
import appointmentService from "@/services/appointmentService";
import TreatmentModal from "@/components/appointments/TreatmentModal";

// Appointment type
interface Appointment {
  _id?: string;
  id: string;
  patientId?: string | { _id: string }; // Can be string or populated object
  patientName: string;
  patientAvatar: string;
  date: string;
  startTime: string;
  endTime: string;
  visitType: string;
  reason: string;
  status: string;
  gender: string;
  location: string;
  email?: string;
  phone?: string;
}

// Session type with accessToken
interface ExtendedSession {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  accessToken?: string;
  expires: string;
}

function DoctorScheduleContent() {
  const { data: session } = useSession();
  const { isConnected } = useGlobalSocket();
  const { registerAppointmentCallback, unregisterAppointmentCallback } = useAppointment();
  const searchParams = useSearchParams();

  const [view, setView] = useState<View>("week");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [selectedTab, setSelectedTab] = useState<"all" | "pending" | "confirmed" | "cancelled" | "completed">("all");
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Treatment modal states
  const [treatmentModalOpen, setTreatmentModalOpen] = useState(false);
  const [currentTreatmentAppointment, setCurrentTreatmentAppointment] = useState<Appointment | null>(null);
  const [isSubmittingTreatment, setIsSubmittingTreatment] = useState(false);

  // Fetch appointments from API
  const fetchAppointments = useCallback(async () => {
    const userId = (session?.user as { _id?: string })?._id;
    if (!userId) return;

    try {
      setLoading(true);
      const accessToken = (session as ExtendedSession).accessToken;
      const result = await appointmentService.getDoctorAppointments(userId, {}, accessToken);

      if (result.success && result.data) {
        // Transform API data to match our Appointment interface
        const transformedData: Appointment[] = result.data
          .filter((apt) => apt._id) // Only include appointments with valid _id
          .map((apt) => ({
            _id: apt._id!,
            id: apt._id!,
            patientName: (apt.patientId as { fullName?: string })?.fullName || "N/A",
            patientAvatar:
              (apt.patientId as { avatar?: string; fullName?: string })?.avatar ||
              `https://ui-avatars.com/api/?name=${
                (apt.patientId as { fullName?: string })?.fullName || "Patient"
              }&background=random`,
            date: new Date(apt.appointmentDate).toISOString().split("T")[0],
            startTime: apt.startTime || "08:00",
            endTime: apt.endTime || "09:00",
            visitType: apt.appointmentType === "home_visit" ? "Home Visit" : "Clinic Visit",
            reason: apt.notes || "Không có ghi chú",
            status: apt.status,
            gender: (apt.patientId as { gender?: string })?.gender || "N/A",
            location: (apt.patientId as { address?: string })?.address || "N/A",
            email: (apt.patientId as { email?: string })?.email,
            phone: (apt.patientId as { phone?: string })?.phone,
          }));

        setAppointments(transformedData);
      } else {
        toast.error(result.error || "Không thể tải danh sách lịch hẹn");
      }
    } catch (error) {
      console.error("Fetch appointments error:", error);
      toast.error("Lỗi khi tải danh sách lịch hẹn");
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Initial fetch
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Register this page's refresh callback with global socket
  useEffect(() => {
    registerAppointmentCallback(fetchAppointments);
    console.log("✅ Doctor schedule registered with global socket");

    return () => {
      unregisterAppointmentCallback();
      console.log("🔇 Doctor schedule unregistered from global socket");
    };
  }, [registerAppointmentCallback, unregisterAppointmentCallback, fetchAppointments]);

  // Socket connection status indicator (optional)
  useEffect(() => {
    if (isConnected) {
      console.log("✅ Doctor schedule connected to global socket");
    }
  }, [isConnected]);

  // Handle appointmentId from URL params (from dashboard click)
  useEffect(() => {
    const appointmentId = searchParams.get("appointmentId");

    if (appointmentId && appointments.length > 0 && !detailModalOpen) {
      // Find the appointment by ID
      const appointment = appointments.find((apt) => apt._id === appointmentId || apt.id === appointmentId);

      if (appointment) {
        setSelectedAppointment(appointment);
        setDetailModalOpen(true);

        // Remove the appointmentId from URL to prevent reopening on refresh
        window.history.replaceState({}, "", "/doctor/schedule");
      }
    }
  }, [searchParams, appointments, detailModalOpen]);

  // Filter appointments based on selected tab (for LIST view - shows ALL including cancelled)
  // Filter appointments for LIST view - shows all including cancelled
  const getFilteredAppointments = () => {
    if (selectedTab === "all") {
      return appointments;
    }
    return appointments.filter((apt) => apt.status === selectedTab);
  };

  // Filter appointments for CALENDAR view
  // Exclude cancelled ONLY when viewing "all" or other tabs (to avoid overlap)
  // Include cancelled when specifically viewing "Đã hủy" tab
  const getCalendarAppointments = () => {
    const filtered = getFilteredAppointments();

    // If user is viewing "Đã hủy" tab, show cancelled appointments on calendar
    if (selectedTab === "cancelled") {
      return filtered;
    }

    // For other tabs, exclude cancelled appointments to keep calendar clean
    return filtered.filter((apt) => apt.status !== "cancelled");
  };

  const filteredAppointments = getFilteredAppointments(); // For list view
  const calendarAppointments = getCalendarAppointments(); // For calendar view

  // Handle stat card click
  const handleStatCardClick = (status: "all" | "pending" | "confirmed" | "cancelled" | "completed") => {
    setSelectedTab(status);
    setViewMode("list");
  };

  // Handle confirm appointment
  const handleConfirmAppointment = async (appointmentId: string) => {
    if (!session || actionLoading) return;

    try {
      setActionLoading(true);
      const accessToken = (session as ExtendedSession).accessToken;
      const result = await appointmentService.confirmAppointment(appointmentId, accessToken);

      if (result.success) {
        toast.success("Đã xác nhận lịch hẹn");
        // Update local state
        setAppointments((prev) =>
          prev.map((apt) => (apt.id === appointmentId ? { ...apt, status: "confirmed" } : apt))
        );
      } else {
        toast.error(result.error || "Không thể xác nhận lịch hẹn");
      }
    } catch (error) {
      console.error("Confirm appointment error:", error);
      toast.error("Lỗi khi xác nhận lịch hẹn");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle complete appointment
  const handleCompleteAppointment = async (appointmentId: string) => {
    if (!session || actionLoading) return;

    try {
      setActionLoading(true);
      const accessToken = (session as ExtendedSession).accessToken;
      const result = await appointmentService.completeAppointment(appointmentId, accessToken);

      if (result.success) {
        toast.success("Đã hoàn thành lịch hẹn");
        // Update local state
        setAppointments((prev) =>
          prev.map((apt) => (apt.id === appointmentId ? { ...apt, status: "completed" } : apt))
        );
      } else {
        toast.error(result.error || "Không thể hoàn thành lịch hẹn");
      }
    } catch (error) {
      console.error("Complete appointment error:", error);
      toast.error("Lỗi khi hoàn thành lịch hẹn");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle cancel appointment
  const handleCancelAppointment = async (appointmentId: string, reason: string = "Bác sĩ hủy lịch hẹn") => {
    if (!session || actionLoading) return;

    try {
      setActionLoading(true);
      const accessToken = (session as ExtendedSession).accessToken;
      const result = await appointmentService.cancelAppointment(
        appointmentId,
        reason,
        accessToken,
        "doctor" // Specify that doctor is cancelling
      );

      if (result.success) {
        toast.success("Đã hủy lịch hẹn");
        // Refresh appointments to reflect changes
        await fetchAppointments();
        if (detailModalOpen && selectedAppointment?.id === appointmentId) {
          setDetailModalOpen(false);
          setSelectedAppointment(null);
        }
        // Close cancel dialog
        setCancelDialogOpen(false);
        setAppointmentToCancel(null);
        setCancelReason("");
      } else {
        toast.error(result.error || "Không thể hủy lịch hẹn");
      }
    } catch (error) {
      console.error("Cancel appointment error:", error);
      toast.error("Có lỗi xảy ra khi hủy lịch hẹn");
    } finally {
      setActionLoading(false);
    }
  };

  // Open cancel dialog
  const openCancelDialog = (appointmentId: string) => {
    const appointment = appointments.find((apt) => apt.id === appointmentId || apt._id === appointmentId);
    setAppointmentToCancel(appointment || null);
    setCancelReason("");
    setCancelDialogOpen(true);
  };

  // Confirm cancel with reason
  const confirmCancel = () => {
    if (!appointmentToCancel) return;
    if (!cancelReason.trim()) {
      toast.error("Vui lòng nhập lý do hủy");
      return;
    }
    handleCancelAppointment(appointmentToCancel._id || appointmentToCancel.id, cancelReason);
  };

  // Treatment modal handlers
  const startTreatment = async (appointment: Appointment) => {
    try {
      // Fetch full appointment details to get patientId
      const accessToken = (session as ExtendedSession).accessToken;
      const appointmentId = appointment._id || appointment.id;

      const fullAppointment = await appointmentService.getAppointmentById(appointmentId, accessToken);

      if (fullAppointment.success && fullAppointment.data) {
        // Store the full appointment data with patientId
        const extendedAppointment: Appointment = {
          ...appointment,
          patientId: fullAppointment.data.patientId,
        };
        setCurrentTreatmentAppointment(extendedAppointment);
        setTreatmentModalOpen(true);
      } else {
        toast.error("Không thể tải thông tin bệnh nhân");
      }
    } catch (error) {
      console.error("Error fetching appointment details:", error);
      toast.error("Có lỗi xảy ra khi tải thông tin bệnh nhân");
    }
  };

  const closeTreatmentModal = () => {
    setTreatmentModalOpen(false);
    setCurrentTreatmentAppointment(null);
  };

  const handleTreatmentSubmit = async (formData: {
    chiefComplaints: string[];
    presentIllness: string;
    physicalExamination: string;
    diagnosisGroups: Array<{
      diagnosis: string;
      treatmentPlans: string[];
    }>;
    medications: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions: string;
    }>;
    notes: string;
  }) => {
    if (!currentTreatmentAppointment || !session) return;

    try {
      setIsSubmittingTreatment(true);
      const accessToken = (session as ExtendedSession).accessToken;
      const userId = (session?.user as { _id?: string })?._id;

      // 1. Create medical record
      // Extract patientId - it can be a string or an object with _id
      let patientId: string;
      const rawPatientId = currentTreatmentAppointment.patientId;

      console.log("🔍 Raw Patient ID:", rawPatientId);

      if (typeof rawPatientId === "object" && rawPatientId?._id) {
        patientId = rawPatientId._id;
      } else if (typeof rawPatientId === "string") {
        patientId = rawPatientId;
      } else {
        throw new Error("Không tìm thấy thông tin bệnh nhân");
      }

      const medicalRecordPayload = {
        patientId: patientId,
        doctorId: userId,
        recordDate: new Date().toISOString(),
        appointmentId: currentTreatmentAppointment._id || currentTreatmentAppointment.id,
        chiefComplaints: formData.chiefComplaints,
        presentIllness: formData.presentIllness,
        physicalExamination: formData.physicalExamination,
        diagnosisGroups: formData.diagnosisGroups,
        detailedMedications: formData.medications,
        notes: formData.notes,
        status: "active",
      };

      const medicalRecordResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081"}/api/v1/medical-records`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(medicalRecordPayload),
        }
      );

      if (!medicalRecordResponse.ok) {
        const errorData = await medicalRecordResponse.json();
        console.error("❌ Medical Record Error:", errorData);
        throw new Error("Failed to create medical record");
      }

      const medicalRecord = await medicalRecordResponse.json();

      // 2. Create prescription if there are medications
      if (formData.medications.length > 0) {
        // Transform medications to include required fields
        const prescriptionMedications = formData.medications.map((med) => ({
          name: med.name,
          dosage: med.dosage || "Chưa xác định",
          frequency: med.frequency || "Theo chỉ định",
          duration: med.duration || "Theo chỉ định",
          instructions: med.instructions || "Theo hướng dẫn bác sĩ",
          quantity: 1, // Default quantity
          unit: "hộp", // Default unit
        }));

        const prescriptionPayload = {
          patientId: patientId, // Use extracted patientId, not appointmentId
          doctorId: userId,
          medicalRecordId: medicalRecord._id || medicalRecord.id,
          prescriptionDate: new Date().toISOString(),
          diagnosis:
            formData.diagnosisGroups
              .filter((g) => g.diagnosis.trim())
              .map((g) => g.diagnosis)
              .join(", ") || "Chưa có chẩn đoán",
          medications: prescriptionMedications,
          notes: formData.notes,
        };

        console.log("📝 Prescription Payload:", JSON.stringify(prescriptionPayload, null, 2));

        const prescriptionResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081"}/api/v1/prescriptions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(prescriptionPayload),
          }
        );

        if (!prescriptionResponse.ok) {
          const errorData = await prescriptionResponse.json();
          console.error("❌ Prescription Error:", errorData);
          throw new Error("Failed to create prescription");
        }
      }

      // 3. Complete appointment
      await handleCompleteAppointment(currentTreatmentAppointment._id || currentTreatmentAppointment.id);

      toast.success("Đã lưu hồ sơ khám bệnh và hoàn thành lịch hẹn");
      closeTreatmentModal();

      // Refresh appointments
      await fetchAppointments();
    } catch (error) {
      console.error("Treatment submission error:", error);
      toast.error("Có lỗi xảy ra khi lưu hồ sơ khám bệnh");
    } finally {
      setIsSubmittingTreatment(false);
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    try {
      // Get filtered appointments
      const dataToExport = getFilteredAppointments();

      if (dataToExport.length === 0) {
        toast.error("Không có dữ liệu để xuất");
        return;
      }

      // Create CSV content
      const headers = [
        "Mã lịch",
        "Bệnh nhân",
        "Ngày",
        "Giờ bắt đầu",
        "Giờ kết thúc",
        "Trạng thái",
        "Loại khám",
        "Lý do",
      ];
      const rows = dataToExport.map((apt) => [
        apt.id,
        apt.patientName,
        apt.date,
        apt.startTime,
        apt.endTime,
        apt.status === "pending"
          ? "Chờ xác nhận"
          : apt.status === "confirmed"
          ? "Đã xác nhận"
          : apt.status === "completed"
          ? "Hoàn thành"
          : apt.status === "cancelled"
          ? "Đã hủy"
          : apt.status,
        apt.visitType || "",
        apt.reason || "",
      ]);

      const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");

      // Add BOM for UTF-8 support in Excel
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

      // Check if File System Access API is available
      if ("showSaveFilePicker" in window) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: `lich-hen-${new Date().toISOString().split("T")[0]}.csv`,
            types: [
              {
                description: "CSV Files",
                accept: { "text/csv": [".csv"] },
              },
            ],
          });

          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();

          toast.success("Đã xuất file Excel thành công");
        } catch (err) {
          // User cancelled or error occurred
          if (err instanceof Error && err.name !== "AbortError") {
            console.error("Save file error:", err);
            toast.error("Có lỗi xảy ra khi lưu file");
          }
        }
      } else {
        // Fallback for browsers that don't support File System Access API
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `lich-hen-${new Date().toISOString().split("T")[0]}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success("Đã xuất file Excel thành công");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Có lỗi xảy ra khi xuất file");
    }
  };

  // Handle event selection
  const handleSelectEvent = (event: { id: string }) => {
    const appointment = appointments.find((apt) => apt.id === event.id);
    if (appointment) {
      setSelectedAppointment(appointment);
      setDetailModalOpen(true);
    }
  };

  // Handle slot selection (for creating new appointment)
  const handleSelectSlot = (slotInfo: { start: Date; end: Date; action: string }) => {
    console.log("Selected slot:", slotInfo);
    // TODO: Open new appointment modal
  };

  // Handle view change
  const handleViewChange = (newView: View) => {
    setView(newView);
  };

  if (!session) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Calendar className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Lịch Hẹn</h1>
                <p className="text-sm text-gray-500">Quản lý lịch hẹn của bạn</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Socket status */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-400"}`} />
                <span className="text-sm text-gray-600">{isConnected ? "Đang kết nối" : "Ngoại tuyến"}</span>
              </div>

              {/* Action buttons */}
              <button
                onClick={handleExportExcel}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Xuất Excel
              </button>

              <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Thêm Lịch Hẹn
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <button
            onClick={() => handleStatCardClick("all")}
            className={`bg-white rounded-lg p-4 border-2 transition-all hover:shadow-md text-left ${
              selectedTab === "all" ? "border-primary shadow-md" : "border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng lịch hẹn</p>
                <p className="text-2xl font-bold text-gray-900">{appointments.length}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
            </div>
          </button>

          <button
            onClick={() => handleStatCardClick("pending")}
            className={`bg-white rounded-lg p-4 border-2 transition-all hover:shadow-md text-left ${
              selectedTab === "pending" ? "border-yellow-500 shadow-md" : "border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Chờ xác nhận</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {appointments.filter((a) => a.status === "pending").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </button>

          <button
            onClick={() => handleStatCardClick("confirmed")}
            className={`bg-white rounded-lg p-4 border-2 transition-all hover:shadow-md text-left ${
              selectedTab === "confirmed" ? "border-green-500 shadow-md" : "border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đã xác nhận</p>
                <p className="text-2xl font-bold text-green-600">
                  {appointments.filter((a) => a.status === "confirmed").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </button>

          <button
            onClick={() => handleStatCardClick("completed")}
            className={`bg-white rounded-lg p-4 border-2 transition-all hover:shadow-md text-left ${
              selectedTab === "completed" ? "border-primary shadow-md" : "border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đã hoàn thành</p>
                <p className="text-2xl font-bold text-primary">
                  {appointments.filter((a) => a.status === "completed").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
            </div>
          </button>

          <button
            onClick={() => handleStatCardClick("cancelled")}
            className={`bg-white rounded-lg p-4 border-2 transition-all hover:shadow-md text-left ${
              selectedTab === "cancelled" ? "border-red-500 shadow-md" : "border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đã hủy</p>
                <p className="text-2xl font-bold text-red-600">
                  {appointments.filter((a) => a.status === "cancelled").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <X className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </button>
        </div>

        {/* View Toggle */}
        {viewMode === "list" && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {selectedTab === "all" && "Tất cả lịch hẹn"}
              {selectedTab === "pending" && "Chờ xác nhận"}
              {selectedTab === "confirmed" && "Đã xác nhận"}
              {selectedTab === "cancelled" && "Đã hủy"}
              {selectedTab === "completed" && "Đã hoàn thành"}
            </h2>
            <button
              onClick={() => {
                setViewMode("calendar");
              }}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-2"
            >
              <CalendarDays className="w-4 h-4" />
              Xem lịch
            </button>
          </div>
        )}

        {/* Calendar or List View */}
        {viewMode === "calendar" ? (
          <DoctorCalendar
            appointments={calendarAppointments}
            view={view}
            onViewChange={handleViewChange}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
          />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* List Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-700">
                <div className="col-span-3">Bệnh nhân</div>
                <div className="col-span-2">Ngày hẹn</div>
                <div className="col-span-2">Giờ</div>
                <div className="col-span-2">Lý do</div>
                <div className="col-span-1">Loại</div>
                <div className="col-span-2 text-center">Thao tác</div>
              </div>
            </div>

            {/* List Body */}
            <div className="divide-y divide-gray-200">
              {filteredAppointments.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Không có lịch hẹn nào</p>
                </div>
              ) : (
                filteredAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedAppointment(apt);
                      setDetailModalOpen(true);
                    }}
                  >
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Patient Info */}
                      <div className="col-span-3 flex items-center gap-3">
                        <Image
                          src={apt.patientAvatar}
                          alt={apt.patientName}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                        <div>
                          <p className="font-medium text-gray-900">{apt.patientName}</p>
                          <p className="text-sm text-gray-500">
                            {apt.gender} • {apt.location}
                          </p>
                        </div>
                      </div>

                      {/* Date */}
                      <div className="col-span-2">
                        <p className="text-sm text-gray-900">{new Date(apt.date).toLocaleDateString("vi-VN")}</p>
                      </div>

                      {/* Time */}
                      <div className="col-span-2">
                        <p className="text-sm text-gray-900">
                          {apt.startTime} - {apt.endTime}
                        </p>
                      </div>

                      {/* Reason */}
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600 truncate">{apt.reason}</p>
                      </div>

                      {/* Visit Type */}
                      <div className="col-span-1">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            apt.visitType === "Home Visit"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {apt.visitType === "Home Visit" ? "Tại nhà" : "Phòng khám"}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="col-span-2 flex items-center justify-center gap-2">
                        {apt.status === "pending" && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConfirmAppointment(apt._id || apt.id);
                              }}
                              disabled={actionLoading}
                              className="px-3 py-1 bg-primary text-white rounded text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading ? "..." : "Xác nhận"}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openCancelDialog(apt._id || apt.id);
                              }}
                              disabled={actionLoading}
                              className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading ? "..." : "Hủy"}
                            </button>
                          </>
                        )}
                        {apt.status === "confirmed" && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startTreatment(apt);
                              }}
                              disabled={actionLoading}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading ? "..." : "Điều Trị"}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openCancelDialog(apt._id || apt.id);
                              }}
                              disabled={actionLoading}
                              className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading ? "..." : "Hủy"}
                            </button>
                          </>
                        )}
                        {apt.status === "completed" && (
                          <span className="text-sm text-green-600 font-medium">Đã hoàn thành</span>
                        )}
                        {apt.status === "cancelled" && <span className="text-sm text-red-600 font-medium">Đã hủy</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailModalOpen && selectedAppointment && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Chi Tiết Lịch Hẹn</h2>
              <button onClick={() => setDetailModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Patient info */}
              <div className="flex items-center gap-4">
                <Image
                  src={selectedAppointment.patientAvatar}
                  alt={selectedAppointment.patientName}
                  width={64}
                  height={64}
                  className="rounded-full"
                />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedAppointment.patientName}</h3>
                  <p className="text-sm text-gray-600">
                    {selectedAppointment.gender} • {selectedAppointment.location}
                  </p>
                </div>
              </div>

              {/* Appointment details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Ngày hẹn</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedAppointment.date).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Thời gian</p>
                    <p className="font-medium text-gray-900">
                      {selectedAppointment.startTime} - {selectedAppointment.endTime}
                    </p>
                  </div>
                </div>

                {selectedAppointment.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium text-gray-900">{selectedAppointment.email}</p>
                    </div>
                  </div>
                )}

                {selectedAppointment.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Điện thoại</p>
                      <p className="font-medium text-gray-900">{selectedAppointment.phone}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Loại khám</p>
                    <p className="font-medium text-gray-900">
                      {selectedAppointment.visitType === "Clinic Visit" ? "Khám tại phòng" : "Khám tại nhà"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 rounded-full mt-0.5 ${
                      selectedAppointment.status === "confirmed"
                        ? "bg-green-500"
                        : selectedAppointment.status === "pending"
                        ? "bg-yellow-500"
                        : selectedAppointment.status === "cancelled"
                        ? "bg-red-500"
                        : "bg-blue-500"
                    }`}
                  />
                  <div>
                    <p className="text-sm text-gray-600">Trạng thái</p>
                    <p className="font-medium text-gray-900">
                      {selectedAppointment.status === "confirmed"
                        ? "Đã xác nhận"
                        : selectedAppointment.status === "pending"
                        ? "Chờ xác nhận"
                        : selectedAppointment.status === "cancelled"
                        ? "Đã hủy"
                        : "Hoàn thành"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div>
                <p className="text-sm text-gray-600 mb-2">Lý do khám</p>
                <p className="text-gray-900 bg-gray-50 rounded-lg p-4">{selectedAppointment.reason}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                {selectedAppointment.status === "pending" && (
                  <button
                    onClick={() => {
                      handleConfirmAppointment(selectedAppointment._id || selectedAppointment.id);
                      setDetailModalOpen(false);
                    }}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? "Đang xử lý..." : "Xác Nhận"}
                  </button>
                )}
                {selectedAppointment.status === "confirmed" && (
                  <button
                    onClick={() => {
                      startTreatment(selectedAppointment);
                      setDetailModalOpen(false);
                    }}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? "Đang xử lý..." : "Điều Trị"}
                  </button>
                )}
                {(selectedAppointment.status === "pending" || selectedAppointment.status === "confirmed") && (
                  <button
                    onClick={() => {
                      openCancelDialog(selectedAppointment._id || selectedAppointment.id);
                      setDetailModalOpen(false);
                    }}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? "Đang xử lý..." : "Hủy Lịch Hẹn"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Appointment Dialog */}
      {cancelDialogOpen && appointmentToCancel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Xác nhận hủy lịch</h3>
              <button
                onClick={() => {
                  setCancelDialogOpen(false);
                  setAppointmentToCancel(null);
                  setCancelReason("");
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Bạn có chắc chắn muốn hủy lịch hẹn với <strong>{appointmentToCancel.patientName}</strong> vào{" "}
                <strong>
                  {new Date(appointmentToCancel.date).toLocaleDateString("vi-VN")} lúc {appointmentToCancel.startTime}
                </strong>
                ?
              </p>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lý do hủy <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Vui lòng cho biết lý do bạn muốn hủy lịch hẹn này..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCancelDialogOpen(false);
                  setAppointmentToCancel(null);
                  setCancelReason("");
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                disabled={actionLoading}
              >
                Đóng
              </button>
              <button
                onClick={confirmCancel}
                disabled={!cancelReason.trim() || actionLoading}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? "Đang hủy..." : "Xác nhận hủy"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Treatment Modal */}
      <TreatmentModal
        isOpen={treatmentModalOpen}
        onClose={closeTreatmentModal}
        appointment={currentTreatmentAppointment}
        onSubmit={handleTreatmentSubmit}
        isSubmitting={isSubmittingTreatment}
        accessToken={(session as ExtendedSession)?.accessToken}
      />
    </div>
  );
}

export default function DoctorSchedulePage() {
  return <DoctorScheduleContent />;
}
