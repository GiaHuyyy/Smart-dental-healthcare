import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import BookingStepModal from "@/components/appointments/BookingStepModal";
import FollowUpSuggestions from "@/components/appointments/FollowUpSuggestions";
import { AppHeader } from "@/components/layout/AppHeader";
import { PolicyButton, PolicyModal } from "@/components/policy";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/contexts/auth-context";
import { useThemeColors } from "@/hooks/use-theme-colors";
import paymentService from "@/services/paymentService";
import { realtimeAppointmentService } from "@/services/realtimeAppointmentService";
import { apiRequest, formatApiError } from "@/utils/api";

type Doctor = {
  _id?: string;
  id?: string;
  fullName?: string;
  name?: string;
  specialty?: string;
};

type AppointmentDisplay = {
  id: string;
  title: string;
  doctorName: string;
  dateLabel: string;
  timeLabel: string;
  location: string;
  isVirtual: boolean;
  statusLabel: string;
  statusVariant: keyof typeof STATUS_STYLES;
  canCancel?: boolean;
  raw: Record<string, unknown>;
  sortKey: number;
};

const MINIMUM_LEAD_MS = 2 * 60 * 60 * 1000;

// Time slots are now generated dynamically based on duration and booked slots

const STATUS_STYLES = {
  pending: { text: "#b45309", background: "#fef3c7" },
  confirmed: { text: "#1d4ed8", background: "#dbeafe" },
  completed: { text: "#047857", background: "#d1fae5" },
  cancelled: { text: "#6b7280", background: "#e5e7eb" },
} as const;

function normalizeTimeString(value?: string | null): string | null {
  if (!value) return null;
  const match = value.match(/(\d{1,2}:\d{2})/);
  if (!match) return null;
  const [hh, mm] = match[1].split(":");
  return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
}

function addMinutesToTime(time: string, minutes: number): string {
  const [hour, minute] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hour || 0, (minute || 0) + minutes, 0, 0);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function dateFromInput(input: string): Date {
  const [year, month, day] = input.split("-").map(Number);
  return new Date(year || 0, (month || 1) - 1, day || 1, 0, 0, 0, 0);
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatVietnameseDate(input: string): string {
  const date = dateFromInput(input);
  return date.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function combineDateAndTime(dateString: string, timeString?: string | null): Date | null {
  if (!dateString) return null;
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return null;
  let hour = 0;
  let minute = 0;
  if (timeString) {
    const [h, m] = timeString.split(":").map(Number);
    if (!Number.isNaN(h)) hour = h;
    if (!Number.isNaN(m)) minute = m;
  }
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function getAppointmentDateRaw(appointment: Record<string, any>): string | null {
  const raw = appointment.appointmentDate ?? appointment.date ?? appointment.startDate;
  if (!raw) return null;
  const asDate = new Date(raw);
  if (Number.isNaN(asDate.getTime())) return null;
  return asDate.toISOString().slice(0, 10);
}

function getAppointmentDateTime(appointment: Record<string, any>): Date | null {
  const dateString = getAppointmentDateRaw(appointment);
  const timeString = normalizeTimeString(appointment.startTime ?? appointment.time ?? appointment.appointmentTime);
  if (!dateString) return null;
  return combineDateAndTime(dateString, timeString);
}

function extractDoctorName(appointment: Record<string, any>): string {
  // Try different paths where doctor name might be
  // Backend populates into doctorId field (when populated), otherwise it's just the ID string
  const doctor = appointment.doctorId || appointment.doctor;

  // If doctor is an object (populated), get fullName
  if (doctor && typeof doctor === "object") {
    return doctor.fullName ?? doctor.name ?? "Bác sĩ Smart Dental";
  }

  // Fallback to other fields if doctorId wasn't populated
  return (
    appointment.doctorName ?? appointment.doctorFullName ?? appointment.doctorInfo?.fullName ?? "Bác sĩ Smart Dental"
  );
}

function extractLocation(appointment: Record<string, any>): string {
  // Backend populates into doctorId field
  const doctor = appointment.doctorId || appointment.doctor;

  // If doctor is an object (populated), get clinic address
  if (doctor && typeof doctor === "object") {
    return doctor.clinicAddress ?? doctor.address ?? doctor.clinicName ?? "Phòng khám Smart Dental";
  }

  // Fallback to appointment-level fields
  return (
    appointment.location ??
    appointment.clinicLocation ??
    appointment.address ??
    appointment.clinic ??
    "Phòng khám Smart Dental"
  );
}

function extractTitle(appointment: Record<string, any>): string {
  // Try to get doctor specialty first, then fall back to appointment type
  const doctor = appointment.doctorId || appointment.doctor;

  // If doctor is an object (populated), get specialty
  if (doctor && typeof doctor === "object") {
    const specialty = doctor.specialty || doctor.specialization;
    if (specialty) {
      return specialty;
    }
  }

  // If no specialty, use chief complaint or appointment type
  return appointment.chiefComplaint ?? appointment.appointmentType ?? appointment.title ?? "Lịch hẹn nha khoa";
}

function isVirtualMode(type?: string, location?: string): boolean {
  const typeText = (type ?? "").toLowerCase();
  if (typeText.includes("trực tuyến") || typeText.includes("online") || typeText.includes("tư vấn")) {
    return true;
  }
  const locationText = (location ?? "").toLowerCase();
  return locationText.includes("video") || locationText.includes("online") || locationText.includes("zoom");
}

function mapStatus(status?: string): { label: string; variant: keyof typeof STATUS_STYLES; canCancel: boolean } {
  const normalized = (status ?? "").toLowerCase();
  if (normalized.includes("confirm")) {
    return { label: "Đã xác nhận", variant: "confirmed", canCancel: true };
  }
  if (normalized.includes("complete")) {
    return { label: "Đã hoàn thành", variant: "completed", canCancel: false };
  }
  if (normalized.includes("cancel")) {
    return { label: "Đã hủy", variant: "cancelled", canCancel: false };
  }
  return { label: "Đang chờ xác nhận", variant: "pending", canCancel: true };
}

function buildAppointmentDisplay(appointment: Record<string, any>): AppointmentDisplay {
  // Debug log to see doctor structure
  console.log("🔍 Appointment doctor data:", {
    doctor: appointment.doctor,
    doctorId: appointment.doctorId,
    doctorName: appointment.doctorName,
    doctorFullName: appointment.doctorFullName,
  });

  const dateString = getAppointmentDateRaw(appointment);
  const startTime = normalizeTimeString(appointment.startTime ?? appointment.time ?? appointment.appointmentTime);
  const endTime = normalizeTimeString(appointment.endTime ?? appointment.finishTime ?? appointment.expectedEndTime);
  const timeLabel = startTime ? (endTime ? `${startTime} - ${endTime}` : startTime) : "—";
  const { label: statusLabel, variant, canCancel } = mapStatus(appointment.status);
  const doctorName = extractDoctorName(appointment);
  const location = extractLocation(appointment);
  const title = extractTitle(appointment);
  const isVirtual = isVirtualMode(appointment.appointmentType, location);
  const dateTime = getAppointmentDateTime(appointment);
  const id = (
    appointment._id ??
    appointment.id ??
    `${doctorName}-${startTime ?? "time"}-${dateString ?? Date.now()}`
  ).toString();

  return {
    id,
    title,
    doctorName,
    dateLabel: dateString ? formatVietnameseDate(dateString) : "—",
    timeLabel,
    location,
    isVirtual,
    statusLabel,
    statusVariant: variant,
    canCancel,
    raw: appointment,
    sortKey: dateTime ? dateTime.getTime() : Number.MAX_SAFE_INTEGER,
  };
}

function AppointmentStatusPill({ label, variant }: { label: string; variant: keyof typeof STATUS_STYLES }) {
  const style = STATUS_STYLES[variant];
  return (
    <View className="self-start rounded-full px-3 py-1" style={{ backgroundColor: style.background }}>
      <Text className="text-xs font-semibold" style={{ color: style.text }}>
        {label}
      </Text>
    </View>
  );
}

function AppointmentCard({
  appointment,
  onCancel,
  onChat,
  cancelling,
}: {
  appointment: AppointmentDisplay;
  onCancel: (item: AppointmentDisplay) => void;
  onChat: (item: AppointmentDisplay) => void;
  cancelling: boolean;
}) {
  const theme = useThemeColors();

  return (
    <Card shadow="md" className="mb-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-base font-semibold" style={{ color: theme.text.primary }}>
            {appointment.title}
          </Text>
          <Text className="mt-1 text-sm" style={{ color: theme.text.secondary }}>
            {appointment.doctorName}
          </Text>
        </View>
        <Badge variant={appointment.isVirtual ? "success" : "primary"} size="sm">
          {appointment.isVirtual ? "Trực tuyến" : "Tại phòng khám"}
        </Badge>
      </View>

      <View style={{ marginTop: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="calendar-outline" size={18} color={Colors.primary[600]} />
          <Text className="text-sm font-medium" style={{ color: theme.text.primary, marginLeft: 12 }}>
            {appointment.dateLabel} • {appointment.timeLabel}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
          <Ionicons name="location-outline" size={18} color={Colors.primary[600]} />
          <Text className="flex-1 text-sm" style={{ color: theme.text.secondary, marginLeft: 12 }}>
            {appointment.location}
          </Text>
        </View>
        <View style={{ marginTop: 12 }}>
          <AppointmentStatusPill label={appointment.statusLabel} variant={appointment.statusVariant} />
        </View>
      </View>

      {/* Action Buttons - Only show if appointment can be cancelled */}
      {appointment.canCancel !== false && (
        <View style={{ marginTop: 20, flexDirection: "row" }}>
          <TouchableOpacity
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              paddingVertical: 12,
              backgroundColor: Colors.primary[50],
              borderWidth: 1,
              borderColor: Colors.primary[200],
              marginRight: 12,
            }}
            onPress={() => onChat(appointment)}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="chatbubble-outline" size={18} color={Colors.primary[600]} />
              <Text className="text-sm font-semibold" style={{ color: Colors.primary[700], marginLeft: 8 }}>
                Trao đổi
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              paddingVertical: 12,
              backgroundColor: Colors.error[50],
            }}
            onPress={() => onCancel(appointment)}
            disabled={cancelling}
          >
            {cancelling ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <ActivityIndicator color={Colors.error[600]} />
                <Text className="text-sm font-semibold" style={{ color: Colors.error[700], marginLeft: 8 }}>
                  Đang hủy...
                </Text>
              </View>
            ) : (
              <Text className="text-sm font-semibold" style={{ color: Colors.error[700] }}>
                Hủy lịch
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );
}

function HistoryCard({ appointment }: { appointment: AppointmentDisplay }) {
  const theme = useThemeColors();

  return (
    <Card shadow="sm" className="mb-3">
      <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>
        {appointment.title}
      </Text>
      <Text className="mt-1 text-xs" style={{ color: theme.text.secondary }}>
        {appointment.dateLabel} • {appointment.timeLabel}
      </Text>
      <Text className="mt-2 text-xs" style={{ color: theme.text.secondary }}>
        {appointment.doctorName}
      </Text>
      <View className="mt-3">
        <AppointmentStatusPill label={appointment.statusLabel} variant={appointment.statusVariant} />
      </View>
    </Card>
  );
}

function DoctorSelectModal({
  visible,
  doctors,
  selectedDoctorId,
  onClose,
  onSelect,
}: {
  visible: boolean;
  doctors: Doctor[];
  selectedDoctorId: string;
  onClose: () => void;
  onSelect: (doctorId: string) => void;
}) {
  const theme = useThemeColors();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
        <View
          style={{
            backgroundColor: theme.card,
            maxHeight: "70%",
            width: "92%",
            borderRadius: 24,
            padding: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          <View
            style={{ marginBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
          >
            <Text className="text-lg font-semibold" style={{ color: theme.text.primary }}>
              Chọn bác sĩ
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text className="text-sm font-medium" style={{ color: Colors.primary[600] }}>
                Đóng
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 384 }}>
            {doctors.map((doctor) => {
              const id = doctor._id ?? doctor.id ?? "";
              const isActive = id === selectedDoctorId;
              return (
                <TouchableOpacity
                  key={id}
                  style={{
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: isActive ? Colors.primary[500] : theme.border,
                    backgroundColor: isActive ? Colors.primary[50] : theme.card,
                  }}
                  onPress={() => {
                    onSelect(id);
                    onClose();
                  }}
                >
                  <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>
                    {doctor.fullName ?? doctor.name ?? "Bác sĩ"}
                  </Text>
                  {doctor.specialty && (
                    <Text style={{ marginTop: 4, fontSize: 12, color: theme.text.secondary }}>{doctor.specialty}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
            {doctors.length === 0 && (
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <Text className="text-sm text-slate-500">Không có bác sĩ nào khả dụng</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function AppointmentsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ doctorId?: string; doctorName?: string; autoOpenBooking?: string }>();
  const theme = useThemeColors();
  const { session, isAuthenticated, isHydrating } = useAuth();

  const patientId = session?.user?._id ?? "";
  const token = session?.token ?? "";

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [doctorModalVisible, setDoctorModalVisible] = useState(false);

  const [appointments, setAppointments] = useState<Record<string, any>[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<AppointmentDisplay | null>(null);

  // New booking flow states
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDoctorForBooking, setSelectedDoctorForBooking] = useState<Doctor | null>(null);
  
  // Follow-up suggestions states
  const [showFollowUpSection, setShowFollowUpSection] = useState(false);
  const [followUpCount, setFollowUpCount] = useState(0);
  
  // Filter tab state
  const [filterTab, setFilterTab] = useState<"upcoming" | "history" | "follow-up">("upcoming");

  // Payment loading modal states
  const [showPaymentLoadingModal, setShowPaymentLoadingModal] = useState(false);
  const [pendingPaymentInfo, setPendingPaymentInfo] = useState<{
    appointmentId: string;
    orderId?: string;
    timeout: ReturnType<typeof setTimeout>;
    pollingInterval?: ReturnType<typeof setInterval>;
  } | null>(null);

  const fetchDoctors = useCallback(async () => {
    if (!isAuthenticated) return;
    setDoctorsLoading(true);
    try {
      const response = await apiRequest<any>("/users/doctors", { token });
      const payload = response.data as any;
      const list: Doctor[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.users)
          ? payload.users
          : Array.isArray(payload?.data)
            ? payload.data
            : [];
      setDoctors(list);
      setErrorMessage(null);
      if (list.length > 0) {
        const firstId = list[0]._id ?? list[0].id ?? "";
        setSelectedDoctorId((current) => current || firstId);
      }
    } catch (error) {
      console.warn("fetchDoctors failed", error);
      setDoctors([]);
      setErrorMessage((prev) => prev ?? "Không thể tải danh sách bác sĩ. Vui lòng thử lại sau.");
    } finally {
      setDoctorsLoading(false);
    }
  }, [isAuthenticated, token]);

  const fetchAppointments = useCallback(
    async (withSpinner = true) => {
      if (!patientId || !token) return;
      if (withSpinner) {
        setAppointmentsLoading(true);
      }
      try {
        const response = await apiRequest<any>(`/appointments/patient/${patientId}?populate=doctorId,patientId`, {
          token,
        });
        const payload = response.data as any;
        const list: Record<string, any>[] = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.results)
            ? payload.results
            : Array.isArray(payload?.data)
              ? payload.data
              : [];
        console.log("📋 Appointments data:", JSON.stringify(list[0], null, 2));
        setAppointments(list);
        setErrorMessage(null);
      } catch (error) {
        console.warn("fetchAppointments failed", error);
        setErrorMessage(formatApiError(error, "Không thể tải danh sách lịch hẹn."));
      } finally {
        if (withSpinner) {
          setAppointmentsLoading(false);
        }
      }
    },
    [patientId, token]
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    void fetchDoctors();
  }, [isAuthenticated, fetchDoctors]);

  // Auto-open booking modal when navigating from doctors page
  useEffect(() => {
    if (params.autoOpenBooking === "true" && params.doctorId && doctors.length > 0 && !showBookingModal) {
      const doctor = doctors.find((d) => (d._id ?? d.id) === params.doctorId);
      if (doctor) {
        setSelectedDoctorForBooking(doctor);
        setShowBookingModal(true);
        // Clear params to prevent reopening on subsequent renders
        router.setParams({ autoOpenBooking: undefined, doctorId: undefined, doctorName: undefined });
      }
    }
  }, [params.autoOpenBooking, params.doctorId, doctors, showBookingModal, router]);

  useFocusEffect(
    useCallback(() => {
      if (!patientId || !token) return;
      void fetchAppointments();
    }, [patientId, token, fetchAppointments])
  );

  const onRefresh = useCallback(async () => {
    if (!patientId || !token) return;
    setRefreshing(true);
    await fetchAppointments(false);
    setRefreshing(false);
  }, [fetchAppointments, patientId, token]);

  // Setup real-time appointment updates
  useEffect(() => {
    if (!patientId || !token) return;

    // Connect to appointment socket
    const connectSocket = async () => {
      try {
        await realtimeAppointmentService.connect(
          token,
          patientId,
          'patient'
        );
        console.log('✅ [Appointments] Connected to appointment socket');

        // Listen for new appointments (shouldn't happen for patient, but just in case)
        realtimeAppointmentService.on('appointment:new', (data) => {
          console.log('📅 [Appointments] New appointment:', data);
          fetchAppointments(false);
        });

        // Listen for appointment confirmations
        realtimeAppointmentService.on('appointment:confirmed', (data) => {
          console.log('✅ [Appointments] Appointment confirmed:', data);
          fetchAppointments(false);
        });

        // Listen for appointment cancellations
        realtimeAppointmentService.on('appointment:cancelled', (data) => {
          console.log('❌ [Appointments] Appointment cancelled:', data);
          fetchAppointments(false);
        });

        // Listen for appointment completions
        realtimeAppointmentService.on('appointment:completed', (data) => {
          console.log('✔️ [Appointments] Appointment completed:', data);
          fetchAppointments(false);
        });
      } catch (error) {
        console.error('❌ [Appointments] Socket connection error:', error);
      }
    };

    connectSocket();

    // Cleanup on unmount
    return () => {
      realtimeAppointmentService.disconnect();
    };
  }, [patientId, token, fetchAppointments]);

  const upcomingAndHistory = useMemo(() => {
    const now = new Date();
    const upcoming: AppointmentDisplay[] = [];
    const history: AppointmentDisplay[] = [];

    appointments.forEach((item) => {
      const display = buildAppointmentDisplay(item);
      const dateTime = getAppointmentDateTime(item);
      // Only show cancel button for upcoming appointments that are not completed or cancelled
      if (!dateTime || dateTime.getTime() >= now.getTime()) {
        // Upcoming appointments can be cancelled if status is pending or confirmed
        const status = (item.status || "").toLowerCase();
        display.canCancel = !status.includes("complete") && !status.includes("cancel") && !status.includes("paid");
        upcoming.push(display);
      } else {
        // Past appointments cannot be cancelled
        display.canCancel = false;
        history.push(display);
      }
    });

    upcoming.sort((a, b) => a.sortKey - b.sortKey);
    history.sort((a, b) => b.sortKey - a.sortKey);

    return { upcoming, history };
  }, [appointments]);

  // Handle payment timeout
  const handlePaymentTimeout = useCallback(
    async (appointmentId: string) => {
      try {
        console.warn("⏰ Payment timeout - cancelling appointment:", appointmentId);

        // Clear polling if exists
        if (pendingPaymentInfo?.pollingInterval) {
          clearInterval(pendingPaymentInfo.pollingInterval);
        }

        // Close loading modal
        setShowPaymentLoadingModal(false);
        setPendingPaymentInfo(null);

        // Cancel appointment due to timeout
        if (token) {
          await apiRequest(`/api/v1/appointments/${appointmentId}/cancel`, {
            method: "DELETE",
            token,
            body: {
              reason: "Thanh toán quá thời hạn - không nhận được xác nhận từ MoMo",
              cancelledBy: "patient",
            },
          });
        }

        Alert.alert(
          "Thanh toán quá thời hạn",
          "Chúng tôi không nhận được xác nhận thanh toán từ MoMo. Lịch hẹn đã được hủy. Vui lòng thử lại.",
          [{ text: "OK", onPress: () => fetchAppointments() }]
        );
      } catch (error: any) {
        console.error("❌ Failed to cancel appointment on timeout:", error);
      }
    },
    [token, fetchAppointments, pendingPaymentInfo]
  );

  // Handle MoMo payment callback via deep linking
  const handleMoMoCallback = useCallback(
    async (url: string) => {
      try {
        console.log("📱 MoMo callback received:", url);

        // Check if we're waiting for payment
        if (!showPaymentLoadingModal || !pendingPaymentInfo) {
          console.log("⚠️ No pending payment, ignoring callback...");
          return;
        }

        // Parse URL to extract query parameters
        try {
          // Extract query string from URL
          const urlParts = url.split("?");
          if (urlParts.length < 2) {
            console.log("⚠️ No query parameters in URL, ignoring...");
            return;
          }

          const queryString = urlParts[1];
          const params = new URLSearchParams(queryString);

          const orderId = params.get("orderId");
          const resultCode = params.get("resultCode");
          const message = params.get("message");

          // Only process if we have orderId and resultCode
          if (!orderId || !resultCode) {
            console.log("⚠️ Missing callback parameters, ignoring...");
            return;
          }

          // Clear timeout and polling
          if (pendingPaymentInfo.timeout) {
            clearTimeout(pendingPaymentInfo.timeout);
          }
          if (pendingPaymentInfo.pollingInterval) {
            clearInterval(pendingPaymentInfo.pollingInterval);
          }

          console.log("🔍 MoMo callback params:", { orderId, resultCode, message });

          // Close loading modal
          setShowPaymentLoadingModal(false);
          setPendingPaymentInfo(null);

          // resultCode = 0 means payment successful
          if (resultCode === "0") {
            console.log("✅ Payment successful, checking status...");

            if (!token) {
              console.warn("⚠️ No token available, cannot verify payment");
              return;
            }

            // Wait a bit for backend to process the callback
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Query payment status from backend
            try {
              const paymentStatus = await paymentService.checkPaymentStatus(orderId, token);
              console.log("💰 Payment status:", paymentStatus);

              // Check if payment is completed
              const payment = paymentStatus?.data?.payment || paymentStatus?.payment;
              const isCompleted =
                payment?.status === "completed" || payment?.status === "success" || paymentStatus?.success;

              if (isCompleted) {
                console.log("✅ Payment confirmed, appointment confirmed...");

                // Refresh appointments to show updated status
                await fetchAppointments();

                // Show success message
                Alert.alert(
                  "Thanh toán thành công!",
                  "Lịch hẹn của bạn đã được xác nhận. Doanh thu đã được ghi nhận.",
                  [{ text: "OK" }]
                );
              } else {
                console.warn("⚠️ Payment not completed yet:", payment?.status);

                // Cancel appointment if payment not completed
                try {
                  await apiRequest(`/api/v1/appointments/${pendingPaymentInfo.appointmentId}/cancel`, {
                    method: "DELETE",
                    token,
                    body: {
                      reason: "Thanh toán chưa được xác nhận hoàn tất",
                      cancelledBy: "patient",
                    },
                  });
                  await fetchAppointments();
                } catch (e) {
                  console.error("Failed to cancel appointment:", e);
                }

                Alert.alert(
                  "Thanh toán chưa hoàn tất",
                  "Thanh toán chưa được xác nhận hoàn tất. Lịch hẹn đã được hủy. Vui lòng thử lại.",
                  [{ text: "OK" }]
                );
              }
            } catch (error: any) {
              console.error("❌ Failed to check payment status:", error);
              Alert.alert(
                "Lỗi xác nhận thanh toán",
                "Không thể xác nhận trạng thái thanh toán. Vui lòng kiểm tra lại lịch hẹn của bạn.",
                [{ text: "OK", onPress: () => fetchAppointments() }]
              );
            }
          } else {
            // Payment failed or cancelled
            console.log("❌ Payment failed or cancelled:", { resultCode, message });

            // Cancel appointment due to payment failure
            try {
              await apiRequest(`/api/v1/appointments/${pendingPaymentInfo.appointmentId}/cancel`, {
                method: "DELETE",
                token,
                body: {
                  reason: "Thanh toán không thành công hoặc bị hủy",
                  cancelledBy: "patient",
                },
              });
              await fetchAppointments();
            } catch (e) {
              console.error("Failed to cancel appointment:", e);
            }

            Alert.alert(
              "Thanh toán không thành công",
              message || "Thanh toán không thành công hoặc bị hủy. Lịch hẹn đã được hủy. Vui lòng thử lại.",
              [{ text: "OK" }]
            );
          }
        } catch (parseError) {
          console.error("❌ Failed to parse callback URL:", parseError);
          setShowPaymentLoadingModal(false);
          setPendingPaymentInfo(null);
        }
      } catch (error: any) {
        console.error("❌ Error handling MoMo callback:", error);
        setShowPaymentLoadingModal(false);
        setPendingPaymentInfo(null);
      }
    },
    [token, fetchAppointments, showPaymentLoadingModal, pendingPaymentInfo]
  );

  // Set up deep linking listener
  useEffect(() => {
    // Handle initial URL (when app is opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleMoMoCallback(url);
      }
    });

    // Listen for deep link events (when app is already running)
    const subscription = Linking.addEventListener("url", (event) => {
      handleMoMoCallback(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleMoMoCallback]);

  const handleCancelAppointment = useCallback(
    (appointment: AppointmentDisplay) => {
      if (!token) {
        Alert.alert("Cần đăng nhập", "Vui lòng đăng nhập để hủy lịch.");
        return;
      }

      // Open cancel modal instead of simple Alert
      setAppointmentToCancel(appointment);
      setShowCancelModal(true);
    },
    [token]
  );

  const handleChatWithDoctor = useCallback(
    async (appointment: AppointmentDisplay) => {
      try {
        // Extract doctor info from appointment
        const rawDoctor = appointment.raw.doctorId || appointment.raw.doctor;
        let doctorId: string | undefined;
        let doctorName: string = appointment.doctorName;

        if (typeof rawDoctor === "string") {
          // doctorId is just the ID string (not populated)
          doctorId = rawDoctor;
        } else if (rawDoctor && typeof rawDoctor === "object") {
          // doctorId is populated with full doctor object
          doctorId = rawDoctor._id || rawDoctor.id;
          doctorName = rawDoctor.fullName || rawDoctor.name || doctorName;
        }

        if (!doctorId) {
          Alert.alert("Lỗi", "Không tìm thấy thông tin bác sĩ");
          return;
        }

        if (!session?.token || !session?.user?._id) {
          Alert.alert("Lỗi", "Vui lòng đăng nhập để tiếp tục");
          return;
        }

        // Try to find existing conversation with this doctor
        try {
          const userId = session.user._id;
          const userRole = session.user.role;

          const response = await apiRequest<any>(
            `/api/v1/realtime-chat/conversations?userId=${userId}&userRole=${userRole}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${session.token}`,
              },
            }
          );

          const conversations: any[] = Array.isArray(response.data) ? response.data : [];
          const existingConversation = conversations.find((conv) => (conv.doctorId?._id || conv.doctorId) === doctorId);

          const conversationId = existingConversation?._id;

          router.push({
            pathname: "/chat/[id]",
            params: {
              id: doctorId,
              name: doctorName,
              type: "doctor",
              ...(conversationId ? { conversationId } : {}),
            },
          });
        } catch (error) {
          console.warn("Failed to fetch conversations, navigating without conversationId:", error);
          // If fetch fails, still navigate but without conversationId
          // Chat screen will create/find conversation automatically
          router.push({
            pathname: "/chat/[id]",
            params: {
              id: doctorId,
              name: doctorName,
              type: "doctor",
            },
          });
        }
      } catch (error) {
        console.error("Error navigating to chat:", error);
        Alert.alert("Lỗi", "Không thể mở trang chat. Vui lòng thử lại.");
      }
    },
    [session, router]
  );

  const handleConfirmCancel = useCallback(
    async (reason: string) => {
      if (!appointmentToCancel || !token) {
        return;
      }

      setCancellingId(appointmentToCancel.id);
      try {
        await apiRequest(`/api/v1/appointments/${appointmentToCancel.id}/cancel`, {
          method: "DELETE",
          token,
          body: {
            reason: reason || "Hủy bởi bệnh nhân trên ứng dụng di động",
            cancelledBy: "patient",
          },
        });
        Alert.alert("Thành công", "Đã hủy lịch hẹn thành công");
        setShowCancelModal(false);
        setAppointmentToCancel(null);
        await fetchAppointments();
      } catch (error) {
        const message = formatApiError(error, "Không thể hủy lịch hẹn.");
        Alert.alert("Hủy lịch thất bại", message);
      } finally {
        setCancellingId(null);
      }
    },
    [appointmentToCancel, token, fetchAppointments]
  );

  // New booking flow handlers
  const handleOpenBookingModal = (doctor?: Doctor) => {
    if (!isAuthenticated || !patientId) {
      Alert.alert("Cần đăng nhập", "Vui lòng đăng nhập để đặt lịch hẹn.");
      return;
    }

    // Use selected doctor from form or passed doctor
    const doctorToBook = doctor || doctors.find((d) => (d._id ?? d.id) === selectedDoctorId);

    if (!doctorToBook) {
      Alert.alert("Thiếu thông tin", "Vui lòng chọn bác sĩ phụ trách.");
      return;
    }

    setSelectedDoctorForBooking(doctorToBook);
    setShowBookingModal(true);
  };

  const handleBookingConfirm = async (formData: any) => {
    if (!token || !patientId) {
      throw new Error("Vui lòng đăng nhập để đặt lịch");
    }

    try {
      // Validate required fields (same as client)
      if (!formData.startTime || !formData.appointmentDate || !formData.doctorId) {
        throw new Error("Vui lòng điền đầy đủ thông tin");
      }

      // Validate time format HH:MM
      const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
      if (!timeRegex.test(formData.startTime)) {
        throw new Error("Định dạng giờ không hợp lệ. Vui lòng chọn lại.");
      }

      // Step 1: Create appointment payload (same structure as client)
      // Calculate duration from startTime and endTime if available
      let duration = 30; // default
      if (formData.endTime && formData.startTime) {
        const [startHours, startMinutes] = formData.startTime.split(":").map(Number);
        const [endHours, endMinutes] = formData.endTime.split(":").map(Number);
        duration = endHours * 60 + endMinutes - (startHours * 60 + startMinutes);
      }

      const appointmentPayload = {
        patientId,
        doctorId: formData.doctorId,
        appointmentDate: formData.appointmentDate, // Already in ISO format from date picker
        startTime: formData.startTime,
        endTime: formData.endTime,
        duration,
        consultationFee: formData.paymentAmount,
        appointmentType:
          formData.consultType === "televisit"
            ? "Tư vấn từ xa"
            : formData.consultType === "home-visit"
              ? "Khám tại nhà"
              : "Khám tại phòng khám",
        notes: formData.chiefComplaint || "",
        status: formData.paymentMethod === "momo" ? "pending_payment" : "pending",
        // Add patient info if booking for someone else
        ...((!formData.bookForSelf && {
          patientFirstName: formData.patientFirstName,
          patientLastName: formData.patientLastName,
          patientDOB: formData.patientDOB,
          patientGender: formData.patientGender,
        }) ||
          {}),
        // Add voucher if applied
        ...(formData.voucherCode && { voucherCode: formData.voucherCode }),
        ...(formData.voucherId && { appliedVoucherId: formData.voucherId }),
      };

      // Create appointment
      const appointmentResponse = await apiRequest("/api/v1/appointments", {
        method: "POST",
        token,
        body: appointmentPayload,
      });

      const appointment = appointmentResponse.data || appointmentResponse;

      // Step 2: Handle payment based on method
      if (formData.paymentMethod === "momo") {
        // MoMo payment flow
        await handleMoMoPayment(appointment, formData);
      } else {
        // Cash or later payment - appointment created successfully
        Alert.alert(
          "Đặt lịch thành công",
          formData.paymentMethod === "cash"
            ? "Lịch hẹn của bạn đã được tạo. Vui lòng thanh toán tiền mặt khi đến khám."
            : "Lịch hẹn của bạn đã được tạo. Vui lòng chờ bác sĩ xác nhận.",
          [{ text: "OK", onPress: () => fetchAppointments() }]
        );
      }
    } catch (error: any) {
      console.error("Booking error:", error);
      throw error;
    }
  };

  const handleMoMoPayment = async (appointment: any, formData: any) => {
    try {
      if (!token || !patientId) {
        throw new Error("Thiếu thông tin người dùng");
      }

      const appointmentId = appointment._id || appointment.id;
      if (!appointmentId) {
        throw new Error("Không thể lấy ID lịch hẹn");
      }

      // Create MoMo payment (same as client)
      const paymentResponse = await paymentService.createMoMoPayment(
        {
          appointmentId,
          patientId,
          doctorId: formData.doctorId,
          amount: formData.paymentAmount,
          orderInfo: `Thanh toán lịch khám với ${selectedDoctorForBooking?.fullName || "bác sĩ"}`,
        },
        token
      );

      if (!paymentResponse.success || !paymentResponse.data?.payUrl) {
        // Cancel appointment if payment creation failed (same as client)
        try {
          await apiRequest(`/api/v1/appointments/${appointmentId}/cancel`, {
            method: "DELETE",
            token,
            body: { reason: "Không thể tạo thanh toán" },
          });
        } catch (e) {
          console.error("Failed to cancel appointment:", e);
        }

        throw new Error(paymentResponse.message || "Không thể tạo thanh toán MoMo");
      }

      const orderId = paymentResponse.data?.orderId;

      // Auto-open MoMo after short delay (like client web)
      // This will show loading modal and wait for callback
      setTimeout(async () => {
        try {
          await openMoMoPayment(paymentResponse.data!.payUrl, appointmentId, orderId);
        } catch (e) {
          console.error("Failed to auto-open MoMo:", e);
          // Cancel appointment if can't open MoMo
          try {
            await apiRequest(`/api/v1/appointments/${appointmentId}/cancel`, {
              method: "DELETE",
              token,
              body: {
                reason: "Không thể mở ứng dụng MoMo",
                cancelledBy: "patient",
              },
            });
          } catch (cancelError) {
            console.error("Failed to cancel appointment:", cancelError);
          }
          setShowPaymentLoadingModal(false);
          setPendingPaymentInfo(null);
        }
      }, 1500);
    } catch (error: any) {
      console.error("MoMo payment error:", error);
      Alert.alert("Lỗi thanh toán", error.message || "Không thể tạo thanh toán MoMo. Vui lòng thử lại.");
      throw error; // Re-throw to parent
    }
  };

  const openMoMoPayment = async (payUrl: string, appointmentId: string, orderId?: string) => {
    try {
      // Check if URL can be opened
      const supported = await Linking.canOpenURL(payUrl);
      if (supported) {
        // Set up pending payment info
        const timeout = setTimeout(
          () => {
            // Timeout after 10 minutes - cancel appointment if no callback received
            console.warn("⚠️ Payment timeout - no callback received after 10 minutes");
            handlePaymentTimeout(appointmentId);
          },
          10 * 60 * 1000
        ); // 10 minutes timeout

        // Start polling payment status if we have orderId
        let pollingInterval: ReturnType<typeof setInterval> | undefined;
        if (orderId && token) {
          // Set pending info first to have reference
          const pendingInfo: {
            appointmentId: string;
            orderId?: string;
            timeout: ReturnType<typeof setTimeout>;
            pollingInterval?: ReturnType<typeof setInterval>;
          } = {
            appointmentId,
            orderId,
            timeout,
          };

          pollingInterval = setInterval(async () => {
            try {
              console.log("🔄 Polling payment status and appointment...", { orderId, appointmentId });

              // Check payment status first
              let paymentCompleted = false;
              if (orderId) {
                try {
                  const paymentStatus = await paymentService.checkPaymentStatus(orderId!, token);
                  const payment = paymentStatus?.data?.payment || paymentStatus?.payment;
                  paymentCompleted =
                    payment?.status === "completed" || payment?.status === "success" || paymentStatus?.success;

                  if (paymentCompleted) {
                    console.log("✅ Payment completed detected!");
                  }
                } catch (error) {
                  console.warn("⚠️ Payment status check failed:", error);
                }
              }

              // Check appointment status and bill
              try {
                const appointmentResponse = await apiRequest(`/api/v1/appointments/${appointmentId}`, {
                  method: "GET",
                  token,
                });

                const appointment: any = appointmentResponse.data || appointmentResponse;
                console.log("📋 Appointment status:", appointment?.status);

                // Check if appointment has payment/bill
                const hasPayment = !!(appointment?.paymentId || appointment?.payment);
                const hasBill = !!(
                  appointment?.billId ||
                  appointment?.bill ||
                  (appointment?.bills && Array.isArray(appointment.bills) && appointment.bills.length > 0)
                );

                // Check if status is confirmed or has payment
                const appointmentStatus = appointment?.status || "";
                const isConfirmed =
                  appointmentStatus === "confirmed" || appointmentStatus === "paid" || appointmentStatus === "pending";

                // If payment completed OR appointment has bill/payment OR status is confirmed with payment
                if (paymentCompleted || hasPayment || hasBill || (isConfirmed && hasPayment)) {
                  console.log(
                    "✅ Bill/Payment detected! Payment:",
                    hasPayment,
                    "Bill:",
                    hasBill,
                    "Status:",
                    appointmentStatus
                  );

                  // Get current pending info to clear intervals
                  setPendingPaymentInfo((current) => {
                    if (current?.pollingInterval) {
                      clearInterval(current.pollingInterval);
                    }
                    if (current?.timeout) {
                      clearTimeout(current.timeout);
                    }
                    return null;
                  });

                  // Close modal
                  setShowPaymentLoadingModal(false);

                  // Refresh appointments
                  await fetchAppointments();

                  // Show success message
                  Alert.alert(
                    "Thanh toán thành công!",
                    "Lịch hẹn của bạn đã được xác nhận. Hóa đơn đã được tạo và doanh thu đã được ghi nhận.",
                    [{ text: "OK" }]
                  );

                  return; // Exit polling
                }
              } catch (error) {
                console.warn("⚠️ Appointment check failed:", error);
              }
            } catch (error) {
              console.error("❌ Polling error:", error);
            }
          }, 3000); // Poll every 3 seconds

          pendingInfo.pollingInterval = pollingInterval;
          setPendingPaymentInfo(pendingInfo);
        } else {
          // Even without orderId, we should poll appointment status to check for bill
          const pendingInfo: {
            appointmentId: string;
            orderId?: string;
            timeout: ReturnType<typeof setTimeout>;
            pollingInterval?: ReturnType<typeof setInterval>;
          } = {
            appointmentId,
            orderId,
            timeout,
          };

          // Poll appointment status to check for bill/payment
          const pollingInterval = setInterval(async () => {
            try {
              console.log("🔄 Polling appointment for bill/payment...", appointmentId);

              const appointmentResponse = await apiRequest(`/api/v1/appointments/${appointmentId}`, {
                method: "GET",
                token,
              });

              const appointment: any = appointmentResponse.data || appointmentResponse;

              // Check if appointment has payment/bill
              const hasPayment = !!(appointment?.paymentId || appointment?.payment);
              const hasBill = !!(
                appointment?.billId ||
                appointment?.bill ||
                (appointment?.bills && Array.isArray(appointment.bills) && appointment.bills.length > 0)
              );

              // Check if status is confirmed or has payment
              const appointmentStatus = appointment?.status || "";
              const isConfirmed =
                appointmentStatus === "confirmed" || appointmentStatus === "paid" || appointmentStatus === "pending";

              // If appointment has bill/payment OR status is confirmed with payment
              if (hasPayment || hasBill || (isConfirmed && hasPayment)) {
                console.log(
                  "✅ Bill/Payment detected! Payment:",
                  hasPayment,
                  "Bill:",
                  hasBill,
                  "Status:",
                  appointmentStatus
                );

                // Get current pending info to clear intervals
                setPendingPaymentInfo((current) => {
                  if (current?.pollingInterval) {
                    clearInterval(current.pollingInterval);
                  }
                  if (current?.timeout) {
                    clearTimeout(current.timeout);
                  }
                  return null;
                });

                // Close modal
                setShowPaymentLoadingModal(false);

                // Refresh appointments
                await fetchAppointments();

                // Show success message
                Alert.alert(
                  "Thanh toán thành công!",
                  "Lịch hẹn của bạn đã được xác nhận. Hóa đơn đã được tạo và doanh thu đã được ghi nhận.",
                  [{ text: "OK" }]
                );

                return; // Exit polling
              }
            } catch (error) {
              console.warn("⚠️ Appointment polling error:", error);
            }
          }, 3000); // Poll every 3 seconds

          pendingInfo.pollingInterval = pollingInterval;
          setPendingPaymentInfo(pendingInfo);
        }

        // Show loading modal
        setShowPaymentLoadingModal(true);

        // Open MoMo payment URL
        await Linking.openURL(payUrl);
      } else {
        Alert.alert("Lỗi", "Không thể mở ứng dụng MoMo. Vui lòng kiểm tra lại hoặc copy URL để mở thủ công.");
        console.log("MoMo Payment URL:", payUrl);

        // Cancel appointment if can't open MoMo
        try {
          await apiRequest(`/api/v1/appointments/${appointmentId}/cancel`, {
            method: "DELETE",
            token,
            body: { reason: "Không thể mở MoMo" },
          });
        } catch (e) {
          console.error("Failed to cancel appointment:", e);
        }
      }
    } catch (error: any) {
      console.error("Failed to open MoMo URL:", error);
      Alert.alert("Lỗi", "Không thể mở ứng dụng MoMo. Vui lòng thử lại.");

      // Cancel appointment if can't open MoMo
      try {
        await apiRequest(`/api/v1/appointments/${appointmentId}/cancel`, {
          method: "DELETE",
          token,
          body: {
            reason: "Lỗi khi mở MoMo",
            cancelledBy: "patient",
          },
        });
      } catch (e) {
        console.error("Failed to cancel appointment:", e);
      }
    }
  };

  const formDisabled = !isAuthenticated || isHydrating;

  return (
    <>
      <AppHeader
        title="Lịch hẹn"
        showNotification
        showAvatar
        rightComponent={<PolicyButton onPress={() => setShowPolicyModal(true)} />}
      />

      <ScrollView
        className="flex-1"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          isAuthenticated ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary[600]} />
          ) : undefined
        }
      >
        {/* Header Card */}
        <Card className="mb-6">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                Quản lý lịch hẹn
              </Text>
              <Text className="mt-2 text-sm" style={{ color: theme.text.secondary }}>
                Đặt lịch mới, xem trạng thái và chuẩn bị cho các buổi khám cùng Smart Dental.
              </Text>
            </View>
            <View
              className="items-center justify-center rounded-2xl p-4"
              style={{ backgroundColor: Colors.primary[100] }}
            >
              <Ionicons name="calendar" size={28} color={Colors.primary[600]} />
            </View>
          </View>
          {isAuthenticated ? (
            <View className="mt-4 rounded-2xl p-4" style={{ backgroundColor: Colors.primary[50] }}>
              <Text className="text-sm" style={{ color: Colors.primary[700] }}>
                Xin chào {session?.user?.fullName ?? session?.user?.email}, hãy chọn bác sĩ và thời gian phù hợp để đặt
                lịch khám.
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              className="mt-4 items-center justify-center rounded-2xl py-3"
              style={{ backgroundColor: Colors.primary[600] }}
              onPress={() => router.push("/(auth)/login" as const)}
            >
              <Text className="text-sm font-semibold text-white">Đăng nhập để đặt lịch</Text>
            </TouchableOpacity>
          )}
        </Card>

        {errorMessage && (
          <Card className="mb-6" style={{ backgroundColor: Colors.warning[50] }}>
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Ionicons name="warning" size={20} color={Colors.warning[600]} />
              <Text className="flex-1 text-sm font-semibold" style={{ color: Colors.warning[700] }}>
                {errorMessage}
              </Text>
            </View>
          </Card>
        )}

        {/* Filter Tabs */}
        <View className="mb-6">
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
          >
            <Pressable
              onPress={() => setFilterTab('upcoming')}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: filterTab === 'upcoming' ? Colors.primary[500] : theme.border,
                backgroundColor: filterTab === 'upcoming' ? Colors.primary[50] : theme.card,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons 
                  name="calendar-outline" 
                  size={16} 
                  color={filterTab === 'upcoming' ? Colors.primary[700] : theme.text.secondary} 
                />
                <Text 
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: filterTab === 'upcoming' ? Colors.primary[700] : theme.text.secondary,
                  }}
                >
                  Sắp tới
                </Text>
              </View>
            </Pressable>
            
            <Pressable
              onPress={() => setFilterTab('follow-up')}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: filterTab === 'follow-up' ? Colors.warning[500] : theme.border,
                backgroundColor: filterTab === 'follow-up' ? Colors.warning[50] : theme.card,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons 
                  name="alert-circle-outline" 
                  size={16} 
                  color={filterTab === 'follow-up' ? Colors.warning[700] : theme.text.secondary} 
                />
                <Text 
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: filterTab === 'follow-up' ? Colors.warning[700] : theme.text.secondary,
                  }}
                >
                  Cần tái khám
                </Text>
                {followUpCount > 0 && (
                  <Badge variant="warning" size="sm">
                    {followUpCount}
                  </Badge>
                )}
              </View>
            </Pressable>
            
            <Pressable
              onPress={() => setFilterTab('history')}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: filterTab === 'history' ? Colors.success[500] : theme.border,
                backgroundColor: filterTab === 'history' ? Colors.success[50] : theme.card,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons 
                  name="time-outline" 
                  size={16} 
                  color={filterTab === 'history' ? Colors.success[700] : theme.text.secondary} 
                />
                <Text 
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: filterTab === 'history' ? Colors.success[700] : theme.text.secondary,
                  }}
                >
                  Lịch sử
                </Text>
              </View>
            </Pressable>
          </ScrollView>
        </View>

        {/* Booking Form - Show only on 'upcoming' tab */}
        {filterTab === 'upcoming' && (
        <Card className="mb-6">
          <SectionHeader title="Đặt lịch mới" />
          <Text className="mt-2 text-sm" style={{ color: theme.text.secondary }}>
            Chọn bác sĩ và bắt đầu quy trình đặt lịch khám 3 bước đơn giản.
          </Text>

          <View className="mt-6" style={{ gap: 16 }}>
            {/* Doctor Selection */}
            <View>
              <Text
                className="mb-2 text-xs font-semibold uppercase tracking-wider"
                style={{ color: theme.text.secondary }}
              >
                Chọn bác sĩ
              </Text>
              <TouchableOpacity
                className="flex-row items-center justify-between rounded-2xl px-4 py-3"
                style={{
                  borderWidth: 1,
                  borderColor: formDisabled ? theme.border : Colors.primary[200],
                  backgroundColor: formDisabled ? theme.card : Colors.primary[50],
                }}
                onPress={() => setDoctorModalVisible(true)}
                disabled={formDisabled}
              >
                <View className="flex-1">
                  <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>
                    {doctors.find((doc) => (doc._id ?? doc.id) === selectedDoctorId)?.fullName ??
                      doctors.find((doc) => (doc._id ?? doc.id) === selectedDoctorId)?.name ??
                      "Chọn bác sĩ"}
                  </Text>
                  {selectedDoctorId && (
                    <Text className="mt-1 text-xs" style={{ color: theme.text.secondary }}>
                      {doctors.find((doc) => (doc._id ?? doc.id) === selectedDoctorId)?.specialty || "Chuyên khoa"}
                    </Text>
                  )}
                </View>
                {doctorsLoading ? (
                  <ActivityIndicator color={Colors.primary[600]} />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={Colors.primary[600]} />
                )}
              </TouchableOpacity>
            </View>

            {/* Book Appointment Button */}
            <TouchableOpacity
              className="items-center justify-center rounded-2xl py-4"
              style={{ backgroundColor: formDisabled ? theme.border : Colors.primary[500] }}
              onPress={() => handleOpenBookingModal()}
              disabled={formDisabled}
            >
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <Ionicons name="calendar" size={20} color="white" />
                <Text className="text-base font-semibold text-white">Bắt đầu đặt lịch</Text>
              </View>
            </TouchableOpacity>

            {/* Quick info */}
            <View className="flex-row items-start rounded-2xl p-3" style={{ gap: 8, backgroundColor: Colors.info[50] }}>
              <Ionicons name="information-circle" size={18} color={Colors.primary[600]} />
              <Text className="flex-1 text-xs" style={{ color: Colors.primary[700] }}>
                Sau khi chọn bác sĩ, bạn sẽ được hướng dẫn qua 3 bước: Chọn lịch → Điền thông tin → Xác nhận & Thanh
                toán
              </Text>
            </View>
          </View>
        </Card>
        )}
        
        {/* Follow-up Tab - Show FollowUpSuggestions (Always render to preload data) */}
        {isAuthenticated && (
          <View style={{ display: filterTab === 'follow-up' ? 'flex' : 'none' }}>
            <Card className="mb-6">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: Colors.warning[100],
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="calendar-outline" size={20} color={Colors.warning[700]} />
                </View>
                <Text className="text-base font-bold" style={{ color: theme.text.primary }}>
                  Đề xuất tái khám
                </Text>
              </View>
              <FollowUpSuggestions
                patientId={patientId}
                token={token}
                onCountChange={(count) => setFollowUpCount(count)}
                onSchedule={(suggestion) => {
                  // Handle scheduling from follow-up suggestion
                  const doctor = suggestion.doctorId;
                  setSelectedDoctorForBooking(doctor);
                  setShowBookingModal(true);
                  setFilterTab('upcoming'); // Switch back to upcoming tab
                }}
              />
            </Card>
          </View>
        )}
        
        {/* Upcoming Appointments - Show only on 'upcoming' tab */}
        {filterTab === 'upcoming' && (
        <Card className="mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <SectionHeader title="Lịch hẹn sắp tới" />
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.primary[600]} />
              <Text className="text-xs font-medium" style={{ color: Colors.primary[700] }}>
                Tự động làm mới
              </Text>
            </View>
          </View>
          {appointmentsLoading && !refreshing ? (
            <View className="items-center py-8">
              <ActivityIndicator color={Colors.primary[600]} />
            </View>
          ) : upcomingAndHistory.upcoming.length > 0 ? (
            <View style={{ gap: 16 }}>
              {upcomingAndHistory.upcoming.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onCancel={handleCancelAppointment}
                  onChat={handleChatWithDoctor}
                  cancelling={cancellingId === appointment.id}
                />
              ))}
            </View>
          ) : (
            <View
              className="items-center rounded-3xl p-6"
              style={{
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: Colors.primary[200],
                backgroundColor: Colors.primary[50],
              }}
            >
              <Ionicons name="calendar-outline" size={28} color={Colors.primary[600]} />
              <Text className="mt-3 text-sm font-semibold" style={{ color: Colors.primary[700] }}>
                Chưa có lịch hẹn nào sắp tới
              </Text>
              <Text className="mt-1 text-xs" style={{ color: Colors.primary[500] }}>
                Hãy đặt lịch mới để bắt đầu hành trình chăm sóc răng miệng.
              </Text>
            </View>
          )}
        </Card>
        )}

        {/* History - Show only on 'history' tab */}
        {filterTab === 'history' && (
        <Card className="mb-6">
          <SectionHeader title="Lịch sử khám" />
          {appointmentsLoading && !refreshing ? (
            <View className="items-center py-8">
              <ActivityIndicator color={Colors.primary[600]} />
            </View>
          ) : upcomingAndHistory.history.length > 0 ? (
            <View className="mt-4" style={{ gap: 12 }}>
              {upcomingAndHistory.history.map((appointment) => (
                <HistoryCard key={appointment.id} appointment={appointment} />
              ))}
            </View>
          ) : (
            <Text className="mt-4 text-sm" style={{ color: theme.text.secondary }}>
              Chưa có lịch sử khám nào. Khi bạn hoàn thành buổi khám, lịch sử sẽ xuất hiện tại đây
            </Text>
          )}
        </Card>
        )}
      </ScrollView>

      <DoctorSelectModal
        visible={doctorModalVisible}
        doctors={doctors}
        selectedDoctorId={selectedDoctorId}
        onClose={() => setDoctorModalVisible(false)}
        onSelect={(id) => setSelectedDoctorId(id)}
      />

      {/* Booking Step Modal */}
      <BookingStepModal
        visible={showBookingModal}
        onClose={() => {
          setShowBookingModal(false);
          setSelectedDoctorForBooking(null);
        }}
        doctor={selectedDoctorForBooking}
        onConfirm={handleBookingConfirm}
        availableTimes={[]}
        token={token}
      />

      <PolicyModal visible={showPolicyModal} onClose={() => setShowPolicyModal(false)} />

      {/* Cancel Appointment Modal */}
      <CancelAppointmentModal
        visible={showCancelModal}
        appointment={appointmentToCancel}
        loading={cancellingId !== null}
        onClose={() => {
          setShowCancelModal(false);
          setAppointmentToCancel(null);
        }}
        onConfirm={handleConfirmCancel}
      />

      {/* Payment Loading Modal */}
      <PaymentLoadingModal
        visible={showPaymentLoadingModal}
        onCancel={async () => {
          // User cancels payment waiting - cancel appointment
          if (pendingPaymentInfo && token) {
            try {
              // Clear timeout and polling
              if (pendingPaymentInfo.timeout) {
                clearTimeout(pendingPaymentInfo.timeout);
              }
              if (pendingPaymentInfo.pollingInterval) {
                clearInterval(pendingPaymentInfo.pollingInterval);
              }

              await apiRequest(`/api/v1/appointments/${pendingPaymentInfo.appointmentId}/cancel`, {
                method: "DELETE",
                token,
                body: {
                  reason: "Người dùng hủy đợi thanh toán",
                  cancelledBy: "patient",
                },
              });

              setShowPaymentLoadingModal(false);
              setPendingPaymentInfo(null);
              await fetchAppointments();

              Alert.alert("Đã hủy", "Lịch hẹn đã được hủy do người dùng hủy quá trình thanh toán.");
            } catch (error: any) {
              console.error("Failed to cancel appointment:", error);
              Alert.alert("Lỗi", "Không thể hủy lịch hẹn. Vui lòng thử lại.");
            }
          } else {
            setShowPaymentLoadingModal(false);
            setPendingPaymentInfo(null);
          }
        }}
      />
    </>
  );
}

// Payment Loading Modal Component
function PaymentLoadingModal({ visible, onCancel }: { visible: boolean; onCancel: () => void }) {
  const theme = useThemeColors();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/50 px-4">
        <View className="rounded-3xl shadow-2xl w-full max-w-md p-6" style={{ backgroundColor: theme.background }}>
          <View className="items-center" style={{ gap: 16 }}>
            {/* Loading Spinner */}
            <ActivityIndicator size="large" color={Colors.primary[600]} />

            {/* Title */}
            <Text className="text-xl font-bold text-center" style={{ color: theme.text.primary }}>
              Đang đợi thanh toán MoMo
            </Text>

            {/* Description */}
            <View className="items-center" style={{ gap: 8 }}>
              <Text className="text-sm text-center" style={{ color: theme.text.secondary }}>
                Vui lòng hoàn tất thanh toán trên ứng dụng MoMo.
              </Text>
              <Text className="text-xs text-center" style={{ color: theme.text.secondary }}>
                Lịch hẹn sẽ chỉ được xác nhận sau khi thanh toán thành công.
              </Text>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={onCancel}
              className="mt-4 px-6 py-3 rounded-2xl"
              style={{
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>
                Hủy đặt lịch
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Cancel Appointment Modal Component
function CancelAppointmentModal({
  visible,
  appointment,
  loading,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  appointment: AppointmentDisplay | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [cancelReason, setCancelReason] = useState("");
  const theme = useThemeColors();

  // Reset reason when modal opens/closes
  useEffect(() => {
    if (visible) {
      setCancelReason("");
    }
  }, [visible]);

  const handleSubmit = () => {
    if (!cancelReason.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập lý do hủy lịch hẹn");
      return;
    }
    onConfirm(cancelReason.trim());
  };

  if (!appointment) return null;

  // Check if cancellation is within 30 minutes (fee will be charged)
  const appointmentDateTime = getAppointmentDateTime(appointment.raw);
  const now = new Date();
  const minutesUntil = appointmentDateTime
    ? Math.floor((appointmentDateTime.getTime() - now.getTime()) / (1000 * 60))
    : Infinity;
  const isNearTime = minutesUntil < 30 && minutesUntil > 0;
  const feeAmount = isNearTime ? 100000 : 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/50 px-4">
        <View className="rounded-3xl shadow-2xl w-full max-w-md" style={{ backgroundColor: theme.background }}>
          {/* Header */}
          <View
            className="flex-row items-center justify-between border-b px-6 py-4"
            style={{ borderColor: theme.border }}
          >
            <Text className="text-xl font-bold" style={{ color: theme.text.primary }}>
              Xác nhận hủy lịch
            </Text>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <Ionicons name="close" size={24} color={theme.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView className="flex-1 px-6 py-4" showsVerticalScrollIndicator={false}>
            {/* Warning for near-time cancellation */}
            {isNearTime && (
              <View
                className="mb-4 rounded-2xl p-4"
                style={{ backgroundColor: Colors.warning[50], borderWidth: 2, borderColor: Colors.warning[500] }}
              >
                <View className="flex-row items-start" style={{ gap: 12 }}>
                  <Ionicons name="warning" size={24} color={Colors.warning[600]} />
                  <View className="flex-1">
                    <Text className="text-base font-bold mb-2" style={{ color: Colors.warning[700] }}>
                      ⚠️ Hủy lịch cận giờ
                    </Text>
                    <Text className="text-sm mb-2" style={{ color: Colors.warning[700] }}>
                      Hủy lúc này sẽ bị trừ <Text className="font-bold">{feeAmount.toLocaleString("vi-VN")} VND</Text>{" "}
                      phí giữ chỗ
                    </Text>
                    <Text className="text-xs mt-2 font-medium" style={{ color: Colors.warning[700] }}>
                      Bạn có chắc chắn muốn tiếp tục?
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Info for normal cancellation (>= 30 minutes) */}
            {!isNearTime && minutesUntil > 0 && (
              <View
                className="mb-4 rounded-2xl p-4"
                style={{ backgroundColor: Colors.success[50], borderWidth: 2, borderColor: Colors.success[500] }}
              >
                <View className="flex-row items-start" style={{ gap: 12 }}>
                  <Ionicons name="checkmark-circle" size={24} color={Colors.success[600]} />
                  <View className="flex-1">
                    <Text className="text-base font-bold mb-2" style={{ color: Colors.success[700] }}>
                      ✓ Hủy lịch an toàn
                    </Text>
                    <Text className="text-sm" style={{ color: Colors.success[700] }}>
                      <Text className="font-bold">✓ Bạn sẽ được hoàn 100% phí khám</Text>
                      {"\n"}
                      Nếu đã thanh toán, hệ thống sẽ tạo bill mới cộng tiền khám lại cho bạn
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Appointment Info */}
            <View
              className="mb-4 rounded-2xl p-4"
              style={{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}
            >
              <Text className="text-sm mb-3" style={{ color: theme.text.secondary }}>
                Bạn có chắc chắn muốn hủy lịch hẹn:
              </Text>
              <View style={{ gap: 8 }}>
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  <Ionicons name="person-outline" size={18} color={Colors.primary[600]} />
                  <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>
                    {appointment.doctorName}
                  </Text>
                </View>
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  <Ionicons name="calendar-outline" size={18} color={Colors.primary[600]} />
                  <Text className="text-sm" style={{ color: theme.text.secondary }}>
                    {appointment.dateLabel} • {appointment.timeLabel}
                  </Text>
                </View>
                {appointment.location && (
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    <Ionicons name="location-outline" size={18} color={Colors.primary[600]} />
                    <Text className="text-sm" style={{ color: theme.text.secondary }}>
                      {appointment.location}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Cancel Reason Input */}
            <View>
              <Text className="text-sm font-semibold mb-2" style={{ color: theme.text.primary }}>
                Lý do hủy <Text style={{ color: Colors.error[600] }}>*</Text>
              </Text>
              <TextInput
                value={cancelReason}
                onChangeText={setCancelReason}
                placeholder="Vui lòng cho biết lý do bạn muốn hủy lịch hẹn này..."
                multiline
                numberOfLines={4}
                className="rounded-2xl px-4 py-3"
                style={{
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                  color: theme.text.primary,
                  textAlignVertical: "top",
                  minHeight: 100,
                }}
                placeholderTextColor={theme.text.secondary}
                editable={!loading}
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View className="flex-row border-t px-6 py-4" style={{ gap: 12, borderColor: theme.border }}>
            <TouchableOpacity
              onPress={onClose}
              disabled={loading}
              className="flex-1 items-center justify-center rounded-2xl py-3"
              style={{
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                opacity: loading ? 0.5 : 1,
              }}
            >
              <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>
                Đóng
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading || !cancelReason.trim()}
              className="flex-1 items-center justify-center rounded-2xl py-3"
              style={{
                backgroundColor: loading || !cancelReason.trim() ? Colors.gray[400] : Colors.error[600],
              }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-sm font-semibold text-white">Xác nhận hủy</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
