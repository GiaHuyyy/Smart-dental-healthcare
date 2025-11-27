"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  X,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  MapPin,
  Download,
  CalendarDays,
  CheckCircle,
  DollarSign,
  Search,
  Settings,
} from "lucide-react";
import { useGlobalSocket } from "@/contexts/GlobalSocketContext";
import { useAppointment } from "@/contexts/AppointmentContext";
import DoctorCalendar from "@/components/Calendar/DoctorCalendar";
import { View } from "react-big-calendar";
import Image from "next/image";
import { toast } from "sonner";
import appointmentService from "@/services/appointmentService";
import TreatmentModal from "@/components/appointments/TreatmentModal";
import CancelWithBillingModal from "@/components/appointments/CancelWithBillingModal";
import CreateFollowUpModal from "@/components/appointments/CreateFollowUpModal";
import AppointmentAIDataDisplay from "@/components/appointments/AppointmentAIDataDisplay";
import WorkingHoursModal from "@/components/appointments/WorkingHoursModal";

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
  createdAt?: string;
  followUpParentId?: string; // ID of parent appointment if this is a follow-up
  aiAnalysisData?: {
    symptoms?: string;
    uploadedImage?: string;
    analysisResult?: {
      analysis?: string;
      richContent?: {
        analysis?: string;
        sections?: Array<{
          heading: string;
          text?: string;
          bullets?: string[];
        }>;
        recommendations?: string[];
      };
    };
    urgency?: string;
    hasImageAnalysis?: boolean;
  };
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
  // Date filter state
  const [startFilterDate, setStartFilterDate] = useState<string>("");
  const [endFilterDate, setEndFilterDate] = useState<string>("");
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Treatment modal states
  const [treatmentModalOpen, setTreatmentModalOpen] = useState(false);
  const [currentTreatmentAppointment, setCurrentTreatmentAppointment] = useState<Appointment | null>(null);
  const [isSubmittingTreatment, setIsSubmittingTreatment] = useState(false);

  // Follow-up and billing modal states
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [appointmentForFollowUp, setAppointmentForFollowUp] = useState<Appointment | null>(null);

  // Payment modal states
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [pendingBill, setPendingBill] = useState<any>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Working hours modal state
  const [workingHoursModalOpen, setWorkingHoursModalOpen] = useState(false);

  // Fetch appointments from API
  const fetchAppointments = useCallback(async () => {
    const userId = (session?.user as { _id?: string })?._id;
    if (!userId) return;

    try {
      setLoading(true);
      const accessToken = (session as ExtendedSession).accessToken;
      const result = await appointmentService.getDoctorAppointments(userId, {}, accessToken);

      if (result.success && result.data) {
        // DEBUG: Log raw appointments to check followUpParentId
        const followUpAppointments = result.data.filter((apt: any) => apt.followUpParentId);
        if (followUpAppointments.length > 0) {
          console.log(
            `🔗 [Doctor Schedule] Found ${followUpAppointments.length} follow-up appointments:`,
            followUpAppointments.map((apt: any) => ({
              id: apt._id,
              patient: apt.patientId?.fullName,
              followUpParentId: apt.followUpParentId,
            }))
          );
        }

        // Transform API data to match our Appointment interface
        const transformedData: Appointment[] = result.data
          .filter((apt) => apt._id) // Only include appointments with valid _id
          .map((apt) => ({
            _id: apt._id!,
            id: apt._id!,
            patientId: apt.patientId,
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
            followUpParentId: (apt as any).followUpParentId, // CRITICAL: Include follow-up parent ID
            createdAt: apt.createdAt,
            aiAnalysisData: (apt as any).aiAnalysisData,
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

    return () => {
      unregisterAppointmentCallback();
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

  // Auto-switch calendar view based on date filter selection
  useEffect(() => {
    if (startFilterDate && endFilterDate) {
      // Both dates selected - calculate difference
      const start = new Date(startFilterDate);
      const end = new Date(endFilterDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // If range is <= 7 days, use week view, otherwise month view
      if (diffDays <= 7) {
        setView("week");
      } else {
        setView("month");
      }
      // Set calendar to show the start date
      setCalendarDate(start);
    } else if (startFilterDate) {
      // Only start date selected - switch to day view
      setView("day");
      // Set calendar to show the selected date
      setCalendarDate(new Date(startFilterDate));
    }
  }, [startFilterDate, endFilterDate]);

  // Filter appointments based on selected tab (for LIST view - shows ALL including cancelled)
  // Filter appointments for LIST view - shows all including cancelled
  const getFilteredAppointments = () => {
    let filtered = appointments;

    // Filter by status tab
    if (selectedTab !== "all") {
      filtered = filtered.filter((apt) => apt.status === selectedTab);
    }

    // Filter by search term (patient name, reason, phone)
    if (searchTerm) {
      filtered = filtered.filter(
        (apt) =>
          apt.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          apt.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          apt.phone?.includes(searchTerm)
      );
    }

    // Filter by date range
    if (startFilterDate && endFilterDate) {
      // Both dates selected - filter by range
      filtered = filtered.filter((apt) => {
        const aptDate = new Date(apt.date);
        const start = new Date(startFilterDate);
        const end = new Date(endFilterDate);
        return aptDate >= start && aptDate <= end;
      });
    } else if (startFilterDate) {
      // Only start date - filter by single date
      filtered = filtered.filter((apt) => apt.date === startFilterDate);
    }

    // Sort by createdAt descending (newest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date);
      const dateB = new Date(b.createdAt || b.date);
      return dateB.getTime() - dateA.getTime();
    });
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAppointments = filteredAppointments.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTab, startFilterDate, endFilterDate, searchTerm]);

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

  // Open cancel dialog
  const openCancelDialog = (appointmentId: string) => {
    const appointment = appointments.find((apt) => apt.id === appointmentId || apt._id === appointmentId);
    setAppointmentToCancel(appointment || null);
    setCancelReason("");
    setCancelDialogOpen(true);
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

      // Check if this is a follow-up appointment
      let parentRecordId = null;
      if (currentTreatmentAppointment.followUpParentId) {
        console.log("📋 This is a follow-up appointment, finding parent medical record...");
        console.log("🔍 Parent appointment ID:", currentTreatmentAppointment.followUpParentId);

        try {
          const queryUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/medical-records?appointmentId=${currentTreatmentAppointment.followUpParentId}`;
          console.log("🌐 Querying URL:", queryUrl);

          // Find medical record of parent appointment
          const parentMedicalRecordResponse = await fetch(queryUrl, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          console.log("📡 Response status:", parentMedicalRecordResponse.status);

          if (parentMedicalRecordResponse.ok) {
            const parentMedicalRecordData = await parentMedicalRecordResponse.json();
            console.log("📦 Full API response:", parentMedicalRecordData);

            // API returns array directly, not wrapped in data/results
            const parentRecords = Array.isArray(parentMedicalRecordData)
              ? parentMedicalRecordData
              : parentMedicalRecordData?.data || parentMedicalRecordData?.results || [];
            console.log("📋 Parent records found:", parentRecords.length);

            if (parentRecords.length > 0) {
              parentRecordId = parentRecords[0]._id;
              console.log("✅ Found parent medical record:", parentRecordId);
            } else {
              console.warn("⚠️ No medical records found for parent appointment");
            }
          } else {
            console.error("❌ API response not OK:", parentMedicalRecordResponse.statusText);
          }
        } catch (error) {
          console.error("❌ Failed to find parent medical record:", error);
          // Continue without parent record ID
        }
      }

      const medicalRecordPayload = {
        patientId: patientId,
        doctorId: userId,
        recordDate: new Date().toISOString(),
        appointmentId: currentTreatmentAppointment._id || currentTreatmentAppointment.id,
        parentRecordId: parentRecordId, // Link to parent medical record for follow-up
        chiefComplaints: formData.chiefComplaints,
        presentIllness: formData.presentIllness,
        physicalExamination: formData.physicalExamination,
        diagnosisGroups: formData.diagnosisGroups,
        detailedMedications: formData.medications,
        notes: formData.notes,
        status: "active",
      };

      console.log("📤 Sending medical record payload:", {
        appointmentId: medicalRecordPayload.appointmentId,
        parentRecordId: medicalRecordPayload.parentRecordId,
        hasParentRecord: !!parentRecordId,
      });

      const medicalRecordResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/medical-records`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(medicalRecordPayload),
      });

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

        const prescriptionResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/prescriptions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(prescriptionPayload),
        });

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
      // Check for pending bill if appointment is completed
      if (appointment.status === "completed") {
        checkPendingBill(appointment._id || appointment.id);
      }
    }
  };

  // Check for pending bill
  const checkPendingBill = async (appointmentId: string) => {
    try {
      const accessToken = (session as ExtendedSession).accessToken;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/payments/appointment/${appointmentId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        // Check if payment is pending
        if (result.success && result.data && result.data.status === "pending") {
          setPendingBill(result.data);
        } else {
          setPendingBill(null);
        }
      } else {
        setPendingBill(null);
      }
    } catch (error) {
      console.error("Error checking pending bill:", error);
      setPendingBill(null);
    }
  };

  // Handle payment confirmation
  const handlePaymentConfirm = async () => {
    if (!pendingBill || !session?.user?._id) return;

    setIsProcessingPayment(true);
    try {
      const accessToken = (session as ExtendedSession).accessToken;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/payments/${pendingBill._id}/mark-paid`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            doctorId: session.user._id,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Không thể xác nhận thanh toán");
      }

      toast.success("Đã xác nhận thanh toán thành công");
      setPendingBill(null);
      setPaymentModalOpen(false);
      fetchAppointments();
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Có lỗi xảy ra khi xử lý thanh toán");
    } finally {
      setIsProcessingPayment(false);
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

  // Handle calendar navigation
  const handleNavigate = (newDate: Date) => {
    setCalendarDate(newDate);
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
      {/* Header Card */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="space-y-4">
            {/* Title and Buttons Row */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Lịch Hẹn</h1>
                  <p className="text-sm text-gray-600">Quản lý lịch hẹn của bạn</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Action buttons */}
                <button
                  onClick={handleExportExcel}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Xuất Excel</span>
                </button>

                <button
                  onClick={() => setWorkingHoursModalOpen(true)}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Quản lý giờ làm việc</span>
                </button>
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col md:flex-row items-center gap-3">
              {/* Search Input */}
              <div className="relative flex-1 w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm bệnh nhân, lý do khám..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
                />
              </div>

              <span className="text-sm font-medium text-gray-700">Từ</span>
              <input
                type="date"
                value={startFilterDate}
                onChange={(e) => setStartFilterDate(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
              />
              <span className="text-sm font-medium text-gray-700">đến</span>
              <input
                type="date"
                value={endFilterDate}
                onChange={(e) => setEndFilterDate(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
              />
              <button
                onClick={() => {
                  setStartFilterDate("");
                  setEndFilterDate("");
                  setSearchTerm("");
                }}
                disabled={!startFilterDate && !endFilterDate && !searchTerm}
                className="px-4 py-2.5 text-sm bg-white text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium border border-gray-300"
              >
                Xóa
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
            date={calendarDate}
            onViewChange={handleViewChange}
            onNavigate={handleNavigate}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
          />
        ) : (
          <>
            {/* Pagination Controls - Above Table */}
            {totalPages > 1 && filteredAppointments.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 px-6 py-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Hiển thị {startIndex + 1} - {Math.min(endIndex, filteredAppointments.length)} trong tổng số{" "}
                    {filteredAppointments.length} lịch hẹn
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Trước
                    </button>
                    <div className="flex items-center gap-1">
                      {[...Array(totalPages)].map((_, index) => {
                        const pageNumber = index + 1;
                        if (
                          pageNumber === 1 ||
                          pageNumber === totalPages ||
                          (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={pageNumber}
                              onClick={() => setCurrentPage(pageNumber)}
                              className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                                currentPage === pageNumber ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"
                              }`}
                            >
                              {pageNumber}
                            </button>
                          );
                        } else if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                          return (
                            <span key={pageNumber} className="px-2 text-gray-400">
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Tiếp
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                  paginatedAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedAppointment(apt);
                        setDetailModalOpen(true);
                        // Check for pending bill if appointment is completed
                        if (apt.status === "completed") {
                          checkPendingBill(apt._id || apt.id);
                        }
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
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">{apt.patientName}</p>
                              {(apt as any).followUpParentId && (
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
                                  🔄
                                </span>
                              )}
                            </div>
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
                            <span className="text-sm text-primary font-medium">Đã hoàn thành</span>
                          )}
                          {apt.status === "cancelled" && (
                            <span className="text-sm text-red-600 font-medium">Đã hủy</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {detailModalOpen && selectedAppointment && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* Header - Fixed */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
              <h2 className="text-xl font-bold text-gray-900">
                {(selectedAppointment as any).followUpParentId ? "Chi Tiết Lịch Hẹn Tái Khám" : "Chi Tiết Lịch Hẹn"}
              </h2>
              <button onClick={() => setDetailModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
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

              {/* AI Analysis Data */}
              {selectedAppointment.aiAnalysisData && (
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                  <AppointmentAIDataDisplay aiData={selectedAppointment.aiAnalysisData} />
                </div>
              )}

              {/* Reason */}
              <div>
                <p className="text-sm text-gray-600 mb-2">Lý do khám</p>
                <p className="text-gray-900 bg-gray-50 rounded-lg p-4">{selectedAppointment.reason}</p>
              </div>
            </div>

            {/* Footer - Fixed Actions */}
            <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4 rounded-b-lg">
              <div className="flex items-center gap-3">
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
                {selectedAppointment.status === "completed" && (
                  <>
                    <button
                      onClick={() => {
                        setAppointmentForFollowUp(selectedAppointment);
                        setFollowUpModalOpen(true);
                        setDetailModalOpen(false);
                      }}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <CalendarDays className="w-4 h-4" />
                      Tạo đề xuất tái khám
                    </button>
                    {pendingBill && (
                      <button
                        onClick={() => {
                          setPaymentModalOpen(true);
                        }}
                        className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 flex items-center justify-center gap-2"
                      >
                        <DollarSign className="w-4 h-4" />
                        Thanh toán ({new Intl.NumberFormat("vi-VN").format(pendingBill.amount)}đ)
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Appointment Modal - Using new billing modal */}
      {cancelDialogOpen && appointmentToCancel && (
        <CancelWithBillingModal
          isOpen={cancelDialogOpen}
          onClose={() => {
            setCancelDialogOpen(false);
            setAppointmentToCancel(null);
            setCancelReason("");
          }}
          appointment={appointmentToCancel as any}
          userRole="doctor"
          onSuccess={() => {
            setCancelDialogOpen(false);
            setAppointmentToCancel(null);
            setCancelReason("");
            fetchAppointments();
          }}
        />
      )}

      {/* Follow-Up Modal - Create follow-up suggestion */}
      {followUpModalOpen && appointmentForFollowUp && (
        <CreateFollowUpModal
          isOpen={followUpModalOpen}
          onClose={() => {
            setFollowUpModalOpen(false);
            setAppointmentForFollowUp(null);
          }}
          appointment={appointmentForFollowUp}
          patientName={appointmentForFollowUp.patientName}
          onSuccess={() => {
            setFollowUpModalOpen(false);
            setAppointmentForFollowUp(null);
            // fetchAppointments();
          }}
        />
      )}

      {/* Payment Confirmation Modal */}
      {paymentModalOpen && pendingBill && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Xác nhận thanh toán</h2>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
                disabled={isProcessingPayment}
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Thông tin hóa đơn</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Mã hóa đơn:</span>
                    <span className="text-sm font-medium text-gray-900">{pendingBill._id?.slice(-8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Tổng tiền:</span>
                    <span className="text-lg font-bold text-primary">
                      {new Intl.NumberFormat("vi-VN").format(pendingBill.amount)}đ
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Trạng thái:</span>
                    <span className="text-sm font-medium text-yellow-600">Chờ thanh toán</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Bạn có chắc chắn muốn xác nhận thanh toán cho hóa đơn này? Hành động này sẽ:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-blue-700 list-disc list-inside">
                  <li>Đánh dấu hóa đơn đã thanh toán</li>
                  <li>Gửi thông báo cho bệnh nhân</li>
                  <li>Gửi email xác nhận</li>
                </ul>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setPaymentModalOpen(false)}
                  disabled={isProcessingPayment}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Hủy
                </button>
                <button
                  onClick={handlePaymentConfirm}
                  disabled={isProcessingPayment}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessingPayment ? "Đang xử lý..." : "Xác nhận thanh toán"}
                </button>
              </div>
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

      {/* Working Hours Modal */}
      <WorkingHoursModal
        isOpen={workingHoursModalOpen}
        onClose={() => setWorkingHoursModalOpen(false)}
        doctorId={(session?.user as { _id?: string })?._id}
        accessToken={(session as ExtendedSession)?.access_token}
      />
    </div>
  );
}

export default function DoctorSchedulePage() {
  return <DoctorScheduleContent />;
}
