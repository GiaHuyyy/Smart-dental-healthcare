"use client";

import { useAppointment } from "@/contexts/AppointmentContext";
import { useGlobalSocket } from "@/contexts/GlobalSocketContext";
import appointmentService from "@/services/appointmentService";
import { Appointment, AppointmentStatus, ConsultType } from "@/types/appointment";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Home,
  MapPin,
  MessageCircle,
  MoreVertical,
  User,
  Video,
  X,
  XCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import RescheduleWithBillingModal from "@/components/appointments/RescheduleWithBillingModal";
import CancelWithBillingModal from "@/components/appointments/CancelWithBillingModal";
import FollowUpSuggestions from "@/components/appointments/FollowUpSuggestions";

// Helper function to check if appointment is past the consultation time + 15 minutes
const isAppointmentPastConsultation = (appointment: Appointment): boolean => {
  try {
    // Parse appointment date and time
    const appointmentDate = new Date(appointment.appointmentDate);
    const [hours, minutes] = appointment.startTime.split(":").map(Number);

    // Set the appointment time
    appointmentDate.setHours(hours, minutes, 0, 0);

    // Add 15 minutes to consultation start time
    const consultationEndTime = new Date(appointmentDate.getTime() + 15 * 60 * 1000);

    // Check if current time is past consultation + 15 minutes
    const now = new Date();
    return now > consultationEndTime;
  } catch (error) {
    console.error("Error checking appointment time:", error);
    return false;
  }
};

function MyAppointmentsContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const { isConnected } = useGlobalSocket();
  const { registerAppointmentCallback, unregisterAppointmentCallback } = useAppointment();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "follow-up" | AppointmentStatus>("all");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<Appointment | null>(null);
  const [startFilterDate, setStartFilterDate] = useState<string>("");
  const [endFilterDate, setEndFilterDate] = useState<string>("");

  // Memoized fetch function to prevent re-creation on every render
  const fetchAppointments = useCallback(async () => {
    // Guard: Check if session and user exist
    if (!session?.user) {
      console.warn("⚠️ Cannot fetch appointments: session or user not available");
      return;
    }

    setLoading(true);
    try {
      const userId = (session?.user as { _id?: string })._id;
      if (!userId) {
        toast.error("Vui lòng đăng nhập");
        router.push("/auth/signin");
        return;
      }

      // Call API to get patient appointments
      const accessToken = (session as { accessToken?: string })?.accessToken;
      const result = await appointmentService.getPatientAppointments(userId, {}, accessToken);

      if (!result.success) {
        throw new Error(result.error || "Không thể tải danh sách lịch hẹn");
      }

      setAppointments(result.data || []);
    } catch (error) {
      console.error("❌ Error fetching appointments:", error);
      toast.error("Không thể tải danh sách lịch hẹn");
    } finally {
      setLoading(false);
    }
  }, [session, router]);

  // Auto-open detail modal from URL parameter (from dashboard click)
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      const filterParam = params.get("filter");
      if (filterParam === "follow-up") {
        setFilter("follow-up" as AppointmentStatus);
      }

      // If there's a specific appointment to view
      const appointmentId = params.get("appointmentId");
      if (appointmentId && appointments.length > 0) {
        const apt = appointments.find((a) => a._id === appointmentId);
        if (apt) {
          handleViewDetail(apt);
        }
      }
    } catch {
      // ignore malformed URL or other errors
    }
    // run when appointments update (so we can open detail when data is loaded)
  }, [appointments]);

  useEffect(() => {
    if (!session?.user) return;
    fetchAppointments();
  }, [session, fetchAppointments]);

  // Register this page's refresh callback with global socket
  useEffect(() => {
    registerAppointmentCallback(fetchAppointments);
    console.log("✅ Patient my-appointments registered with global socket");

    return () => {
      unregisterAppointmentCallback();
      console.log("🔇 Patient my-appointments unregistered from global socket");
    };
  }, [registerAppointmentCallback, unregisterAppointmentCallback, fetchAppointments]);

  // Socket connection status indicator (optional)
  useEffect(() => {
    if (isConnected) {
      console.log("✅ Patient my-appointments connected to global socket");
    }
  }, [isConnected]);

  const handleCancelAppointment = async () => {
    if (!selectedAppointment || !cancelReason.trim()) {
      toast.error("Vui lòng nhập lý do hủy lịch");
      return;
    }

    setActionLoading(true);
    try {
      const accessToken = (session as { accessToken?: string })?.accessToken;
      const result = await appointmentService.cancelAppointment(
        selectedAppointment._id!,
        cancelReason,
        accessToken,
        "patient" // Specify that patient is cancelling
      );

      if (!result.success) {
        throw new Error(result.error || "Không thể hủy lịch hẹn");
      }

      toast.success("Đã hủy lịch hẹn thành công");
      setCancelDialogOpen(false);
      setCancelReason("");
      setSelectedAppointment(null);
      fetchAppointments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể hủy lịch hẹn");
    } finally {
      setActionLoading(false);
    }
  };

  const handleContactDoctor = async (appointment: Appointment) => {
    const doctorId = typeof appointment.doctorId === "string" ? appointment.doctorId : appointment.doctorId?._id;

    if (!doctorId) {
      toast.error("Không tìm thấy thông tin bác sĩ");
      return;
    }

    try {
      // Store doctor info in localStorage for chat page to pick up
      const payload = {
        doctorId,
        doctorName: appointment.doctor?.fullName,
        openConversation: true, // Signal to open the conversation immediately
      };

      try {
        localStorage.setItem("newConversation", JSON.stringify(payload));
      } catch (storageErr) {
        console.error("Failed to save to localStorage", storageErr);
      }

      // Navigate to chat page
      router.push(`/patient/chat?newConversation=true&doctorId=${doctorId}`);

      toast.success("Đang mở cuộc hội thoại", {
        description: `Mở chat với ${appointment.doctor?.fullName || "bác sĩ"}`,
      });
    } catch (error) {
      console.error("Failed to open chat:", error);
      toast.error("Không thể mở chat", { description: "Vui lòng thử lại" });
    }
  };

  const handleViewDetail = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDetailDialogOpen(true);
  };

  const handleOpenCancelDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setCancelDialogOpen(true);
  };

  const handleOpenRescheduleDialog = (appointment: Appointment) => {
    setAppointmentToReschedule(appointment);
    setRescheduleDialogOpen(true);
  };

  const getStatusIcon = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.CONFIRMED:
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case AppointmentStatus.CANCELLED:
        return <XCircle className="w-5 h-5 text-red-600" />;
      case AppointmentStatus.PENDING:
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case AppointmentStatus.COMPLETED:
        return <CheckCircle className="w-5 h-5 text-primary" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusText = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.CONFIRMED:
        return "Đã xác nhận";
      case AppointmentStatus.CANCELLED:
        return "Đã hủy";
      case AppointmentStatus.PENDING:
        return "Chờ xác nhận";
      case AppointmentStatus.COMPLETED:
        return "Hoàn thành";
      case AppointmentStatus.IN_PROGRESS:
        return "Đang khám";
      case AppointmentStatus.NO_SHOW:
        return "Không đến";
      default:
        return status;
    }
  };

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.CONFIRMED:
        return "bg-green-100 text-green-700 border-green-200";
      case AppointmentStatus.CANCELLED:
        return "bg-red-100 text-red-700 border-red-200";
      case AppointmentStatus.PENDING:
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case AppointmentStatus.COMPLETED:
        return "bg-primary/10 text-primary border-primary/20";
      case AppointmentStatus.IN_PROGRESS:
        return "bg-primary/10 text-primary border-primary/20";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getConsultTypeIcon = (type?: ConsultType | string) => {
    // Handle both ConsultType enum and appointmentType string
    const consultType =
      typeof type === "string" && !Object.values(ConsultType).includes(type as ConsultType)
        ? ConsultType.ON_SITE // Default
        : (type as ConsultType);

    switch (consultType) {
      case ConsultType.TELEVISIT:
        return <Video className="w-4 h-4" />;
      case ConsultType.ON_SITE:
        return <Building2 className="w-4 h-4" />;
      case ConsultType.HOME_VISIT:
        return <Home className="w-4 h-4" />;
      default:
        return <Building2 className="w-4 h-4" />;
    }
  };

  const getConsultTypeText = (type?: ConsultType | string) => {
    // Handle both ConsultType enum and appointmentType string from server
    if (typeof type === "string") {
      // If it's Vietnamese text from server
      if (type.includes("từ xa")) return "Tư vấn từ xa";
      if (type.includes("tại nhà")) return "Khám tại nhà";
      if (type.includes("phòng khám")) return "Khám tại phòng khám";
    }

    const consultType =
      typeof type === "string" && !Object.values(ConsultType).includes(type as ConsultType)
        ? ConsultType.ON_SITE
        : (type as ConsultType);

    switch (consultType) {
      case ConsultType.TELEVISIT:
        return "Tư vấn từ xa";
      case ConsultType.ON_SITE:
        return "Khám tại phòng khám";
      case ConsultType.HOME_VISIT:
        return "Khám tại nhà";
      default:
        return typeof type === "string" ? type : "Khám tại phòng khám";
    }
  };

  // Filter appointments by status and date
  const filteredAppointments = appointments.filter((apt) => {
    // Filter by status
    const statusMatch = filter === "all" || apt.status === filter;

    // Filter by date range
    if (startFilterDate && endFilterDate && statusMatch) {
      // Both dates selected - filter by range
      const aptDate = new Date(apt.appointmentDate);
      const start = new Date(startFilterDate);
      const end = new Date(endFilterDate);

      // Set time to start of day for comparison
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      aptDate.setHours(0, 0, 0, 0);

      return aptDate >= start && aptDate <= end;
    } else if (startFilterDate && statusMatch) {
      // Only start date - filter by single date
      const aptDate = new Date(apt.appointmentDate);
      const filterDate = new Date(startFilterDate);

      return (
        aptDate.getFullYear() === filterDate.getFullYear() &&
        aptDate.getMonth() === filterDate.getMonth() &&
        aptDate.getDate() === filterDate.getDate()
      );
    }

    return statusMatch;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Lịch hẹn của tôi</h1>
          <p className="text-gray-600">Quản lý và theo dõi các lịch hẹn khám bệnh của bạn</p>
        </div>
        {/* Header with socket status */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push("/patient/appointments")}
            className="flex cursor-pointer items-center gap-2 text-gray-600 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Quay lại</span>
          </button>

          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                isConnected ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
              <span>{isConnected ? "Đang kết nối" : "Ngoại tuyến"}</span>
            </div>
          </div>
        </div>

        {/* Filter Tabs and Calendar */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col gap-4">
            {/* Calendar Filter */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Từ</span>
              <input
                type="date"
                value={startFilterDate}
                onChange={(e) => setStartFilterDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <span className="text-sm font-medium text-gray-700">đến</span>
              <input
                type="date"
                value={endFilterDate}
                onChange={(e) => setEndFilterDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <button
                onClick={() => {
                  setStartFilterDate("");
                  setEndFilterDate("");
                }}
                disabled={!startFilterDate && !endFilterDate}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Xóa
              </button>
            </div>

            {/* Status Tabs */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === "all" ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setFilter(AppointmentStatus.PENDING)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === AppointmentStatus.PENDING ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Chờ xác nhận
              </button>
              <button
                onClick={() => setFilter(AppointmentStatus.CONFIRMED)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === AppointmentStatus.CONFIRMED ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Đã xác nhận
              </button>
              <button
                onClick={() => setFilter(AppointmentStatus.COMPLETED)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === AppointmentStatus.COMPLETED ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Hoàn thành
              </button>
              <button
                onClick={() => setFilter(AppointmentStatus.CANCELLED)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === AppointmentStatus.CANCELLED ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Đã hủy
              </button>
              <button
                onClick={() => setFilter("follow-up" as AppointmentStatus)}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  filter === "follow-up" ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Clock className="w-4 h-4" />
                Lịch tái khám
              </button>
            </div>
          </div>
        </div>

        {/* Appointments List hoặc Follow-Up Suggestions based on filter */}
        {filter === "follow-up" ? (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-primary" />
              Đề xuất tái khám
            </h2>
            <FollowUpSuggestions />
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Chưa có lịch hẹn</h3>
            <p className="text-gray-600 mb-6">
              {filter === "all"
                ? "Bạn chưa có lịch hẹn nào. Hãy đặt lịch khám ngay!"
                : `Không có lịch hẹn nào ${getStatusText(filter as AppointmentStatus).toLowerCase()}`}
            </p>
            <button
              onClick={() => router.push("/patient/appointments")}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Đặt lịch khám
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredAppointments.map((appointment) => (
              <div
                key={appointment._id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Doctor Avatar */}
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {appointment.doctor?.profileImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={appointment.doctor.profileImage}
                            alt={appointment.doctor.fullName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-8 h-8 text-primary" />
                        )}
                      </div>

                      {/* Appointment Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {appointment.doctor?.fullName || "Bác sĩ"}
                        </h3>
                        <p className="text-sm text-primary mb-2">{appointment.doctor?.specialty || "Nha khoa"}</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>
                              {new Date(appointment.appointmentDate).toLocaleDateString("vi-VN", {
                                weekday: "short",
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span>{appointment.startTime}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            {getConsultTypeIcon(appointment.consultType || appointment.appointmentType)}
                            <span>{getConsultTypeText(appointment.consultType || appointment.appointmentType)}</span>
                          </div>
                          {appointment.doctor?.clinicAddress && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="truncate">{appointment.doctor.clinicAddress}</span>
                            </div>
                          )}
                        </div>

                        {appointment.chiefComplaint && (
                          <div className="flex items-start gap-2 text-sm text-gray-600 mb-3">
                            <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{appointment.chiefComplaint}</span>
                          </div>
                        )}

                        {/* Payment Status */}
                        {appointment.consultationFee && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2 text-sm">
                                <DollarSign className="w-4 h-4 text-gray-400" />
                                <span className="font-medium text-gray-700">
                                  {new Intl.NumberFormat("vi-VN", {
                                    style: "currency",
                                    currency: "VND",
                                    minimumFractionDigits: 0,
                                  }).format(appointment.consultationFee)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-gray-400" />
                                <span
                                  className={`text-xs font-medium px-2 py-1 rounded ${
                                    appointment.paymentStatus === "paid"
                                      ? "bg-green-100 text-green-700"
                                      : appointment.paymentStatus === "refunded"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-yellow-100 text-yellow-700"
                                  }`}
                                >
                                  {appointment.paymentStatus === "paid"
                                    ? "Đã thanh toán"
                                    : appointment.paymentStatus === "refunded"
                                    ? "Đã hoàn tiền"
                                    : "Chưa thanh toán"}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2 ml-4">
                      <span
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 ${getStatusColor(
                          appointment.status
                        )}`}
                      >
                        {getStatusIcon(appointment.status)}
                        {getStatusText(appointment.status)}
                      </span>
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <MoreVertical className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-gray-100">
                    {/* Check if appointment is past consultation time + 15 minutes */}
                    {appointment.status === AppointmentStatus.CONFIRMED &&
                    isAppointmentPastConsultation(appointment) ? (
                      <div className="flex flex-col gap-3">
                        <p className="text-sm italic text-gray-600">
                          Lịch này đã hoàn thành, vui lòng yêu cầu bác sĩ lên đơn điều trị!
                        </p>
                        <div className="flex items-center justify-between gap-3">
                          <button
                            onClick={() => handleContactDoctor(appointment)}
                            className=" px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2"
                          >
                            <MessageCircle className="w-4 h-4" />
                            Liên hệ bác sĩ
                          </button>
                          <button
                            onClick={() => handleViewDetail(appointment)}
                            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                          >
                            Chi tiết
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1">
                          {appointment.status === AppointmentStatus.PENDING && (
                            <>
                              <button
                                onClick={() => handleOpenCancelDialog(appointment)}
                                className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
                              >
                                Hủy lịch
                              </button>
                              <button
                                onClick={() => handleOpenRescheduleDialog(appointment)}
                                className="px-4 py-2 text-sm border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors font-medium"
                              >
                                Đổi lịch
                              </button>
                            </>
                          )}
                          {appointment.status === AppointmentStatus.CONFIRMED && (
                            <>
                              <button className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium">
                                Tham gia khám
                              </button>
                              <button
                                onClick={() => handleOpenCancelDialog(appointment)}
                                className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
                              >
                                Hủy lịch
                              </button>
                              <button
                                onClick={() => handleOpenRescheduleDialog(appointment)}
                                className="px-4 py-2 text-sm border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors font-medium"
                              >
                                Đổi lịch
                              </button>
                            </>
                          )}
                          {appointment.status === AppointmentStatus.COMPLETED && (
                            <button className="px-4 py-2 text-sm border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors font-medium">
                              Xem kết quả
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => handleViewDetail(appointment)}
                          className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                          Chi tiết
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      {cancelDialogOpen && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Xác nhận hủy lịch</h3>
              <button
                onClick={() => {
                  setCancelDialogOpen(false);
                  setCancelReason("");
                  setSelectedAppointment(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Bạn có chắc chắn muốn hủy lịch hẹn với <strong>{selectedAppointment.doctor?.fullName}</strong> vào{" "}
                <strong>
                  {new Date(selectedAppointment.appointmentDate).toLocaleDateString("vi-VN")} lúc{" "}
                  {selectedAppointment.startTime}
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
                  setCancelReason("");
                  setSelectedAppointment(null);
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                disabled={actionLoading}
              >
                Đóng
              </button>
              <button
                onClick={handleCancelAppointment}
                disabled={!cancelReason.trim() || actionLoading}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? "Đang hủy..." : "Xác nhận hủy"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      {detailDialogOpen && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full my-8">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-semibold text-gray-900">Chi tiết lịch hẹn</h3>
                <button
                  onClick={() => {
                    setDetailDialogOpen(false);
                    setSelectedAppointment(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Doctor Info */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {selectedAppointment.doctor?.profileImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedAppointment.doctor.profileImage}
                      alt={selectedAppointment.doctor.fullName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">
                    {selectedAppointment.doctor?.fullName || "Bác sĩ"}
                  </h4>
                  <p className="text-sm text-primary mb-2">{selectedAppointment.doctor?.specialty || "Nha khoa"}</p>
                  {selectedAppointment.doctor?.clinicName && (
                    <p className="text-sm text-gray-600">{selectedAppointment.doctor.clinicName}</p>
                  )}
                </div>
                <span
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 ${getStatusColor(
                    selectedAppointment.status
                  )}`}
                >
                  {getStatusIcon(selectedAppointment.status)}
                  {getStatusText(selectedAppointment.status)}
                </span>
              </div>

              {/* Appointment Details */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Thông tin lịch hẩn</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500">Ngày khám</p>
                      <p className="font-medium text-gray-900">
                        {new Date(selectedAppointment.appointmentDate).toLocaleDateString("vi-VN", {
                          weekday: "long",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500">Giờ khám</p>
                      <p className="font-medium text-gray-900">
                        {selectedAppointment.startTime} - {selectedAppointment.endTime}
                        {selectedAppointment.duration && (
                          <span className="text-sm text-gray-500 ml-1">({selectedAppointment.duration} phút)</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    {getConsultTypeIcon(selectedAppointment.consultType || selectedAppointment.appointmentType)}
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Hình thức khám</p>
                      <p className="font-medium text-gray-900">
                        {getConsultTypeText(selectedAppointment.consultType || selectedAppointment.appointmentType)}
                      </p>
                    </div>
                  </div>
                  {selectedAppointment.doctor?.clinicAddress && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-500">Địa điểm</p>
                        <p className="font-medium text-gray-900">{selectedAppointment.doctor.clinicAddress}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Patient Info */}
              {selectedAppointment.patient && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Thông tin bệnh nhân</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-500">Họ và tên</p>
                        <p className="font-medium text-gray-900">{selectedAppointment.patient.fullName}</p>
                      </div>
                    </div>
                    {selectedAppointment.patient.phone && (
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-500">Số điện thoại</p>
                          <p className="font-medium text-gray-900">{selectedAppointment.patient.phone}</p>
                        </div>
                      </div>
                    )}
                    {selectedAppointment.patient.email && (
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="font-medium text-gray-900">{selectedAppointment.patient.email}</p>
                        </div>
                      </div>
                    )}
                    {selectedAppointment.patient.dateOfBirth && (
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-500">Ngày sinh</p>
                          <p className="font-medium text-gray-900">
                            {new Date(selectedAppointment.patient.dateOfBirth).toLocaleDateString("vi-VN")}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Booking Info */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Thông tin đặt lịch</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedAppointment.bookingId && (
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-500">Mã đặt lịch</p>
                        <p className="font-medium text-gray-900 font-mono">{selectedAppointment.bookingId}</p>
                      </div>
                    </div>
                  )}
                  {selectedAppointment.createdAt && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-500">Thời gian đặt</p>
                        <p className="font-medium text-gray-900">
                          {new Date(selectedAppointment.createdAt).toLocaleString("vi-VN")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Price Info - Add if available from doctor */}
              {selectedAppointment.doctor?.consultationFee && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Chi phí</h4>
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Phí tư vấn</span>
                      <span className="text-xl font-bold text-primary">
                        {selectedAppointment.doctor.consultationFee.toLocaleString("vi-VN")} đ
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedAppointment.notes && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Ghi chú</h4>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-700">{selectedAppointment.notes}</p>
                  </div>
                </div>
              )}

              {/* Cancellation Info */}
              {selectedAppointment.status === AppointmentStatus.CANCELLED && selectedAppointment.cancellationReason && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Lý do hủy</h4>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-gray-700">{selectedAppointment.cancellationReason}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 rounded-b-2xl">
              <button
                onClick={() => {
                  setDetailDialogOpen(false);
                  setSelectedAppointment(null);
                }}
                className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal - Using new billing modal */}
      {rescheduleDialogOpen && appointmentToReschedule && (
        <RescheduleWithBillingModal
          isOpen={rescheduleDialogOpen}
          onClose={() => {
            setRescheduleDialogOpen(false);
            setAppointmentToReschedule(null);
          }}
          appointment={appointmentToReschedule}
          onSuccess={() => {
            setRescheduleDialogOpen(false);
            setAppointmentToReschedule(null);
            fetchAppointments();
          }}
        />
      )}

      {/* Cancel Modal - Using new billing modal */}
      {cancelDialogOpen && selectedAppointment && (
        <CancelWithBillingModal
          isOpen={cancelDialogOpen}
          onClose={() => {
            setCancelDialogOpen(false);
            setSelectedAppointment(null);
            setCancelReason("");
          }}
          appointment={selectedAppointment}
          userRole="patient"
          onSuccess={() => {
            setCancelDialogOpen(false);
            setSelectedAppointment(null);
            setCancelReason("");
            fetchAppointments();
          }}
        />
      )}
    </div>
  );
}

export default function MyAppointmentsPage() {
  return <MyAppointmentsContent />;
}
