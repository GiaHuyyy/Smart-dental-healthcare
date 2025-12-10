import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { AppHeader } from "@/components/layout/AppHeader";
import { PolicyButton, PolicyModal } from "@/components/policy";
import { Card } from "@/components/ui/Card";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/contexts/auth-context";
import { useThemeColors } from "@/hooks/use-theme-colors";
import paymentService from "@/services/paymentService";
import walletService from "@/services/walletService";
import { apiRequest, formatApiError } from "@/utils/api";

// Enhanced types matching client structure
type Doctor = {
  _id: string;
  fullName: string;
  email?: string;
  specialty?: string;
  specialization?: string;
};

type Appointment = {
  _id: string;
  appointmentType: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  consultationFee?: number;
  status: string;
  paymentStatus?: "unpaid" | "paid" | "refunded";
  doctorId?: Doctor;
};

type PopulatedUser = {
  _id?: string;
  fullName?: string;
  email?: string;
};

type Payment = {
  _id?: string;
  patientId?: PopulatedUser | string;
  doctorId?: Doctor | string;
  refId?: Appointment | string;
  amount?: number;
  status?: "pending" | "completed" | "failed" | "refunded" | string;
  type?: "appointment" | "treatment" | "medicine" | "other" | string;
  billType?: "consultation_fee" | "refund" | "reservation_fee" | "cancellation_charge";
  paymentDate?: string | Date | null;
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

type Transaction = {
  _id: string;
  amount: number;
  createdAt: string;
  status: string;
  type: string;
};

type StatusFilter = "all" | "pending" | "completed" | "refunded";

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "pending", label: "Chờ thanh toán" },
  { id: "completed", label: "Đã thanh toán" },
  { id: "refunded", label: "Đã hoàn" },
];

const STATUS_BADGES: Record<
  string,
  { label: string; color: string; background: string; iconName: keyof typeof Ionicons.glyphMap }
> = {
  pending: {
    label: "Chờ thanh toán",
    color: Colors.warning[700],
    background: Colors.warning[50],
    iconName: "alert-circle-outline",
  },
  completed: {
    label: "Đã thanh toán",
    color: Colors.success[700],
    background: Colors.success[50],
    iconName: "checkmark-circle-outline",
  },
  failed: {
    label: "Thanh toán thất bại",
    color: Colors.error[700],
    background: Colors.error[50],
    iconName: "close-circle-outline",
  },
  refunded: {
    label: "Đã hoàn tiền",
    color: Colors.primary[600],
    background: Colors.primary[50],
    iconName: "refresh-outline",
  },
};

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function parseDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatDate(value?: string | Date | null): string {
  const date = parseDate(value);
  if (!date) return "—";
  return date.toLocaleDateString("vi-VN");
}

function formatDateTime(value?: string | Date | null): string {
  const date = parseDate(value);
  if (!date) return "—";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function formatCurrency(value?: number | null): string {
  if (value === undefined || value === null) return "—";
  return currencyFormatter.format(value);
}

function formatAmountWithSign(payment: Payment): string {
  const amount = payment.amount ?? 0;
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 0 }).format(absAmount);
  if (payment.billType === "refund") return `+${formatted} ₫`;
  return `-${formatted} ₫`;
}

function extractUserName(user: Payment["doctorId"] | Payment["patientId"]): string {
  if (!user) return "Smart Dental";
  if (typeof user === "string") return user;
  return user.fullName ?? user.email ?? "Smart Dental";
}

function getBillTypeLabel(billType?: string): string {
  switch (billType) {
    case "consultation_fee":
      return "Phí khám";
    case "refund":
      return "Hoàn tiền";
    case "reservation_fee":
      return "Phí giữ chỗ";
    case "cancellation_charge":
      return "Phí giữ chỗ";
    default:
      return "Thanh toán";
  }
}

function getPaymentMethodLabel(method?: string): string {
  switch (method) {
    case "momo":
      return "Ví MoMo";
    case "wallet_deduction":
      return "Ví điện tử";
    case "cash":
      return "Tiền mặt";
    case "card":
      return "Thẻ tín dụng";
    case "pending":
      return "Chưa thanh toán";
    default:
      return method || "Chưa xác định";
  }
}

function PaymentBadge({ status }: { status?: string }) {
  const normalized = (status ?? "").toLowerCase();
  const badge = STATUS_BADGES[normalized] ?? {
    label: "Đang xử lý",
    color: "#334155",
    background: "#e2e8f0",
    iconName: "ellipse-outline" as const,
  };
  return (
    <View
      className="self-start flex-row items-center rounded-full px-3 py-1"
      style={{ backgroundColor: badge.background, gap: 4 }}
    >
      <Ionicons name={badge.iconName} size={14} color={badge.color} />
      <Text className="text-xs font-semibold" style={{ color: badge.color }}>
        {badge.label}
      </Text>
    </View>
  );
}

function PaymentCard({
  payment,
  onPayNow,
  theme,
}: {
  payment: Payment;
  onPayNow: (p: Payment) => void;
  theme: ReturnType<typeof useThemeColors>;
}) {
  // Determine amount color - green for refund (+), red for charge (-)
  const isRefund = payment.billType === "refund";
  const amountColor = isRefund ? Colors.success[600] : Colors.error[600];

  return (
    <Card shadow="md" className="p-5">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-base font-semibold" style={{ color: amountColor }}>
            {formatAmountWithSign(payment)}
          </Text>
          <Text className="mt-1 text-xs" style={{ color: theme.text.secondary }}>
            {payment.billType === "refund"
              ? "Hoàn tiền khám"
              : typeof payment.refId === "object"
                ? payment.refId?.appointmentType
                : (payment.type ?? "Thanh toán")}
          </Text>
          <View className="mt-2">
            <PaymentBadge status={payment.status} />
          </View>
        </View>
      </View>

      <View
        className="mt-4 rounded-2xl p-4"
        style={{ backgroundColor: Colors.primary[50], borderWidth: 1, borderColor: Colors.primary[100] }}
      >
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <Ionicons name="card-outline" size={18} color={Colors.primary[600]} />
          <Text className="text-sm font-semibold" style={{ color: Colors.primary[700] }}>
            Thông tin thanh toán
          </Text>
        </View>
        <View className="mt-3">
          <Text className="text-xs" style={{ color: theme.text.secondary }}>
            Bác sĩ:{" "}
            {typeof payment.refId === "object" && payment.refId?.doctorId?.fullName
              ? payment.refId.doctorId.fullName
              : extractUserName(payment.doctorId)}
          </Text>
          <Text className="mt-1 text-xs" style={{ color: theme.text.secondary }}>
            Ngày khám:{" "}
            {typeof payment.refId === "object" && payment.refId?.appointmentDate
              ? formatDate(payment.refId.appointmentDate)
              : formatDate(payment.createdAt)}
          </Text>
          {typeof payment.refId === "object" && payment.refId?.startTime ? (
            <Text className="mt-1 text-xs" style={{ color: theme.text.secondary }}>
              Giờ khám: {payment.refId.startTime}
            </Text>
          ) : null}
          {payment.paymentMethod ? (
            <Text className="mt-1 text-xs" style={{ color: theme.text.secondary }}>
              Phương thức: {getPaymentMethodLabel(payment.paymentMethod)}
            </Text>
          ) : null}
          {payment.billType ? (
            <Text className="mt-1 text-xs" style={{ color: theme.text.secondary }}>
              Loại giao dịch: {getBillTypeLabel(payment.billType)}
            </Text>
          ) : null}
          <Text className="mt-1 text-xs" style={{ color: theme.text.secondary }}>
            Tạo lúc: {formatDateTime(payment.createdAt)}
          </Text>
          {payment.status !== "pending" ? (
            <Text className="mt-1 text-xs" style={{ color: theme.text.secondary }}>
              Cập nhật: {formatDateTime(payment.updatedAt)}
            </Text>
          ) : null}
          {payment.transactionId ? (
            <Text className="mt-1 text-xs" style={{ color: theme.text.secondary }}>
              Mã giao dịch: {payment.transactionId}
            </Text>
          ) : null}
        </View>
      </View>

      {payment.notes ? (
        <View
          className="mt-3 rounded-2xl p-3"
          style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}
        >
          <Text className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.text.secondary }}>
            Ghi chú
          </Text>
          <Text className="mt-1 text-xs" style={{ color: theme.text.secondary }}>
            {payment.notes}
          </Text>
        </View>
      ) : null}

      {(payment.status === "pending" || payment.status === "failed") && (
        <TouchableOpacity
          className="mt-4 items-center justify-center rounded-2xl py-3"
          style={{ backgroundColor: payment.status === "pending" ? Colors.primary[600] : Colors.error[600] }}
          onPress={() => onPayNow(payment)}
        >
          <View className="flex-row items-center">
            <Ionicons
              name={payment.status === "pending" ? "wallet-outline" : "refresh-outline"}
              size={18}
              color="#ffffff"
            />
            <Text className="ml-2 text-sm font-semibold text-white">
              {payment.status === "pending" ? "Thanh toán ngay" : "Thử lại thanh toán"}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </Card>
  );
}

export default function PaymentsScreen() {
  const router = useRouter();
  const { session, isAuthenticated, isHydrating } = useAuth();
  const theme = useThemeColors();

  const patientId = session?.user?._id ?? "";
  const token = session?.token ?? "";

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  // Date filters
  const [startFilterDate, setStartFilterDate] = useState<string>("");
  const [endFilterDate, setEndFilterDate] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"start" | "end">("start");
  const [tempDate, setTempDate] = useState<Date>(new Date());

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // Wallet modal & data
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletTransactions, setWalletTransactions] = useState<Transaction[]>([]);
  const [walletStats, setWalletStats] = useState({ totalTopUp: 0, successfulTransactions: 0 });
  const [showTopUpForm, setShowTopUpForm] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpLoading, setTopUpLoading] = useState(false);

  const loadPayments = useCallback(
    async ({ viaRefresh = false, signal }: { viaRefresh?: boolean; signal?: AbortSignal } = {}) => {
      if (!patientId || !token) {
        setPayments([]);
        return;
      }

      if (viaRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await apiRequest<Payment[]>(`/payments/patient/${patientId}`, {
          token,
          abortSignal: signal,
        });
        setPayments(ensureArray<Payment>(response.data));
        setErrorMessage(null);
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        setPayments([]);
        setErrorMessage(formatApiError(error, "Không thể tải lịch sử thanh toán."));
      } finally {
        if (viaRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [patientId, token]
  );

  useFocusEffect(
    useCallback(() => {
      if (!patientId || !token) return;
      const controller = new AbortController();
      void loadPayments({ signal: controller.signal });
      // Also fetch wallet balance silently
      void (async () => {
        try {
          console.log("🔍 Fetching wallet balance...");
          console.log("🔍 Token available:", !!token, "Length:", token.length);
          const res = await walletService.getBalance(token);
          console.log("🔍 Wallet balance response:", res);
          if (res?.success && res.data) {
            console.log("✅ Setting wallet balance:", res.data.balance);
            setWalletBalance(res.data.balance ?? 0);
          } else {
            console.warn("⚠️ Wallet balance fetch failed:", res?.message);
            // Keep balance at 0 or previous value, don't show error
          }
        } catch (e) {
          console.error("❌ Failed to fetch wallet balance:", e);
          // Silent failure - don't disrupt user experience
        }
      })();
      return () => controller.abort();
    }, [patientId, token, loadPayments])
  );

  const handleRefresh = useCallback(() => {
    if (!patientId || !token) return;
    void loadPayments({ viaRefresh: true });
  }, [patientId, token, loadPayments]);

  // Pay Now flow
  const handlePayNow = useCallback((p: Payment) => {
    setSelectedPayment(p);
    setShowPaymentModal(true);
  }, []);

  const handlePayWithWallet = useCallback(async () => {
    if (!selectedPayment?._id || !token) return;
    try {
      const res = await walletService.payPendingBill(token, selectedPayment._id);
      if (res.success) {
        Alert.alert("Thành công", res.message || "Thanh toán thành công");
        setShowPaymentModal(false);
        // Refresh payments and wallet balance
        void loadPayments();
        try {
          const bal = await walletService.getBalance(token);
          if (bal?.success && bal.data) {
            console.log("💰 Updated wallet balance after payment:", bal.data.balance);
            setWalletBalance(bal.data.balance ?? 0);
          }
        } catch (e) {
          console.error("❌ Failed to refresh wallet balance:", e);
        }
      } else {
        Alert.alert("Thất bại", res.error || "Không thể thanh toán");
      }
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thể thanh toán");
    }
  }, [selectedPayment?._id, token, loadPayments]);

  const handlePayWithMoMo = useCallback(async () => {
    if (!selectedPayment?._id || !token) return;
    try {
      const resp = await paymentService.createMoMoPaymentFromExisting(selectedPayment._id, token);
      if (resp.success && resp.data?.payUrl) {
        setShowPaymentModal(false);
        Linking.openURL(resp.data.payUrl);
      } else {
        Alert.alert("Không thể tạo thanh toán MoMo", resp.message || "Vui lòng thử lại.");
      }
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thể tạo thanh toán MoMo");
    }
  }, [selectedPayment?._id, token]);

  // Ensure wallet balance is fresh when opening payment modal
  useEffect(() => {
    if (!showPaymentModal || !token) return;
    (async () => {
      try {
        const bal = await walletService.getBalance(token);
        console.log("🔄 Payment modal wallet balance:", bal);
        if (bal?.success && bal.data) {
          setWalletBalance(bal.data.balance ?? 0);
        }
      } catch (e) {
        console.warn("⚠️ Could not refresh wallet balance for modal:", e);
      }
    })();
  }, [showPaymentModal, token]);

  const stats = useMemo(() => {
    const all = payments;
    const completedCharges = all.filter(
      (p) => (p.status ?? "").toLowerCase() === "completed" && p.billType !== "refund"
    );
    const completedTotal = completedCharges.reduce((sum, p) => sum + (p.amount ?? 0), 0);

    const pendingPayments = all.filter((p) => (p.status ?? "").toLowerCase() === "pending");
    const pendingTotal = pendingPayments.reduce((sum, p) => sum + (p.amount ?? 0), 0);

    const refundedPayments = all.filter((p) => p.billType === "refund");
    const refundedTotal = Math.abs(refundedPayments.reduce((sum, p) => sum + (p.amount ?? 0), 0));

    const totalSpending = completedTotal + pendingTotal + refundedTotal;

    const latestDate = all.reduce<Date | null>((acc, p) => {
      const d = parseDate(p.paymentDate ?? p.createdAt);
      if (!d) return acc;
      if (!acc || d.getTime() > acc.getTime()) return d;
      return acc;
    }, null);

    return {
      totalSpending,
      completedTotal,
      completedCount: completedCharges.length,
      pendingTotal,
      pendingCount: pendingPayments.length,
      refundedTotal,
      refundedCount: refundedPayments.length,
      latestDate,
    };
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return payments.filter((payment) => {
      const appointment = typeof payment.refId === "object" ? payment.refId : null;
      const doctor = typeof payment.doctorId === "object" ? payment.doctorId : null;

      const doctorName = appointment?.doctorId?.fullName || doctor?.fullName || "";
      const appointmentType = appointment?.appointmentType || "";
      const transactionId = payment.transactionId || "";
      const notes = payment.notes || "";

      const matchesSearch =
        term === "" ||
        doctorName.toLowerCase().includes(term) ||
        appointmentType.toLowerCase().includes(term) ||
        transactionId.toLowerCase().includes(term) ||
        notes.toLowerCase().includes(term);

      const status = (payment.status ?? "").toLowerCase();
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "refunded" && payment.billType === "refund") ||
        (statusFilter === "completed" && status === "completed" && payment.billType !== "refund") ||
        (statusFilter === "pending" && status === "pending");

      // Date filter
      let matchesDate = true;
      if (startFilterDate && endFilterDate) {
        const paymentDate = parseDate(payment.createdAt) ?? new Date(0);
        const start = new Date(startFilterDate);
        const end = new Date(endFilterDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        paymentDate.setHours(0, 0, 0, 0);
        matchesDate = paymentDate >= start && paymentDate <= end;
      } else if (startFilterDate) {
        const paymentDate = parseDate(payment.createdAt) ?? new Date(0);
        const filterDate = new Date(startFilterDate);
        matchesDate =
          paymentDate.getFullYear() === filterDate.getFullYear() &&
          paymentDate.getMonth() === filterDate.getMonth() &&
          paymentDate.getDate() === filterDate.getDate();
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [payments, statusFilter, searchTerm, startFilterDate, endFilterDate]);

  if (!isHydrating && !isAuthenticated) {
    return (
      <>
        <AppHeader
          title="Thanh toán"
          showNotification
          showAvatar
          rightComponent={<PolicyButton onPress={() => setShowPolicyModal(true)} />}
        />
        <ScrollView
          className="flex-1"
          style={{ backgroundColor: theme.background }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}
        >
          <Card className="w-full max-w-md p-6">
            <View className="items-center">
              <Ionicons name="wallet-outline" size={36} color={Colors.primary[600]} />
              <Text className="mt-4 text-xl font-semibold" style={{ color: theme.text.primary }}>
                Đăng nhập để xem thanh toán
              </Text>
              <Text className="mt-2 text-center text-sm" style={{ color: theme.text.secondary }}>
                Truy cập lịch sử thanh toán, hoá đơn và số dư ngay khi bạn đăng nhập tài khoản.
              </Text>
              <TouchableOpacity
                className="mt-6 w-full items-center justify-center rounded-2xl py-3"
                style={{ backgroundColor: Colors.primary[600] }}
                onPress={() => router.push("/(auth)/login" as const)}
              >
                <Text className="text-sm font-semibold text-white">Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </ScrollView>

        <PolicyModal visible={showPolicyModal} onClose={() => setShowPolicyModal(false)} />
      </>
    );
  }

  return (
    <>
      <AppHeader
        title="Thanh toán"
        showNotification
        showAvatar
        rightComponent={<PolicyButton onPress={() => setShowPolicyModal(true)} />}
      />
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48, paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          isAuthenticated ? (
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary[600]} />
          ) : undefined
        }
      >
        <View style={{ gap: 24 }}>
          <Card className="p-4">
            <View style={{ gap: 12 }}>
              <View
                className="rounded-2xl border p-3"
                style={{
                  borderColor: Colors.primary[100],
                  backgroundColor: `${Colors.primary[50]}CC`,
                }}
              >
                <TextInput
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  placeholder="Tìm theo bác sĩ, ghi chú hoặc mã giao dịch..."
                  placeholderTextColor="#94a3b8"
                  className="text-sm"
                  style={{ color: theme.text.primary }}
                />
              </View>

              <View className="flex-row items-center flex-wrap" style={{ gap: 12 }}>
                <TouchableOpacity
                  className="rounded-2xl border px-4 py-2"
                  style={{ borderColor: Colors.primary[100], backgroundColor: theme.surface }}
                  onPress={() => {
                    setDatePickerMode("start");
                    setTempDate(startFilterDate ? new Date(startFilterDate) : new Date());
                    setShowDatePicker(true);
                  }}
                >
                  <Text className="text-xs font-semibold" style={{ color: Colors.primary[500] }}>
                    Từ: {startFilterDate ? formatDate(startFilterDate) : "Chọn ngày"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="rounded-2xl border px-4 py-2"
                  style={{ borderColor: Colors.primary[100], backgroundColor: theme.surface }}
                  onPress={() => {
                    setDatePickerMode("end");
                    setTempDate(endFilterDate ? new Date(endFilterDate) : new Date());
                    setShowDatePicker(true);
                  }}
                >
                  <Text className="text-xs font-semibold" style={{ color: Colors.primary[500] }}>
                    Đến: {endFilterDate ? formatDate(endFilterDate) : "Chọn ngày"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="rounded-2xl border px-4 py-2"
                  style={{ borderColor: Colors.primary[100], backgroundColor: theme.surface }}
                  onPress={() => {
                    setStartFilterDate("");
                    setEndFilterDate("");
                    setSearchTerm("");
                  }}
                >
                  <Text className="text-xs font-semibold" style={{ color: Colors.primary[500] }}>
                    Xóa lọc
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
          {/* Stats Cards */}
          <View style={{ gap: 16 }}>
            <View className="flex-row flex-wrap" style={{ gap: 16 }}>
              <TouchableOpacity
                onPress={() => setStatusFilter("all")}
                className="flex-1 rounded-2xl border-2 p-4"
                style={{
                  borderColor: statusFilter === "all" ? Colors.error[500] : theme.border,
                  backgroundColor: theme.surface,
                  minWidth: 150,
                }}
              >
                <View
                  className="h-12 w-12 items-center justify-center rounded-xl mb-3"
                  style={{ backgroundColor: Colors.error[50] }}
                >
                  <Ionicons name="cash-outline" color={Colors.error[600]} size={22} />
                </View>
                <Text className="text-xs" style={{ color: theme.text.secondary }}>
                  Tổng chi tiêu
                </Text>
                <Text className="mt-1 text-xl font-bold" style={{ color: Colors.error[600] }}>
                  {formatCurrency(stats.totalSpending)}
                </Text>
                <Text className="mt-1 text-[11px]" style={{ color: theme.text.secondary }}>
                  {stats.completedCount + stats.pendingCount} giao dịch
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setStatusFilter("pending")}
                className="flex-1 rounded-2xl border-2 p-4"
                style={{
                  borderColor: statusFilter === "pending" ? Colors.warning[500] : theme.border,
                  backgroundColor: theme.surface,
                  minWidth: 150,
                }}
              >
                <View
                  className="h-12 w-12 items-center justify-center rounded-xl mb-3"
                  style={{ backgroundColor: Colors.warning[50] }}
                >
                  <Ionicons name="time-outline" color={Colors.warning[600]} size={22} />
                </View>
                <Text className="text-xs" style={{ color: theme.text.secondary }}>
                  Chờ thanh toán
                </Text>
                <Text className="mt-1 text-xl font-bold" style={{ color: Colors.warning[600] }}>
                  {formatCurrency(stats.pendingTotal)}
                </Text>
                <Text className="mt-1 text-[11px]" style={{ color: theme.text.secondary }}>
                  {stats.pendingCount} giao dịch
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap" style={{ gap: 16 }}>
              <TouchableOpacity
                onPress={() => setStatusFilter("completed")}
                className="flex-1 rounded-2xl border-2 p-4"
                style={{
                  borderColor: statusFilter === "completed" ? Colors.success[500] : theme.border,
                  backgroundColor: theme.surface,
                  minWidth: 150,
                }}
              >
                <View
                  className="h-12 w-12 items-center justify-center rounded-xl mb-3"
                  style={{ backgroundColor: Colors.success[50] }}
                >
                  <Ionicons name="checkmark-circle-outline" color={Colors.success[600]} size={22} />
                </View>
                <Text className="text-xs" style={{ color: theme.text.secondary }}>
                  Đã thanh toán
                </Text>
                <Text className="mt-1 text-xl font-bold" style={{ color: Colors.success[600] }}>
                  {formatCurrency(stats.completedTotal)}
                </Text>
                <Text className="mt-1 text-[11px]" style={{ color: theme.text.secondary }}>
                  {stats.completedCount} giao dịch
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setStatusFilter("refunded")}
                className="flex-1 rounded-2xl border-2 p-4"
                style={{
                  borderColor: statusFilter === "refunded" ? Colors.primary[500] : theme.border,
                  backgroundColor: theme.surface,
                  minWidth: 150,
                }}
              >
                <View
                  className="h-12 w-12 items-center justify-center rounded-xl mb-3"
                  style={{ backgroundColor: Colors.primary[50] }}
                >
                  <Ionicons name="refresh-outline" color={Colors.primary[600]} size={22} />
                </View>
                <Text className="text-xs" style={{ color: theme.text.secondary }}>
                  Đã hoàn tiền
                </Text>
                <Text className="mt-1 text-xl font-bold" style={{ color: Colors.primary[600] }}>
                  +{formatCurrency(stats.refundedTotal)}
                </Text>
                <Text className="mt-1 text-[11px]" style={{ color: theme.text.secondary }}>
                  {stats.refundedCount} giao dịch
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={async () => {
                if (!token) return;
                setShowWalletModal(true);
                try {
                  const [balanceRes, historyRes, statsRes] = await Promise.all([
                    walletService.getBalance(token),
                    walletService.getHistory(token),
                    walletService.getStats(token),
                  ]);
                  if (balanceRes?.success && balanceRes.data) {
                    console.log("🔍 Wallet modal balance:", balanceRes.data.balance);
                    setWalletBalance(balanceRes.data.balance ?? 0);
                  }
                  if ((historyRes as any)?.success && (historyRes as any).data) {
                    console.log("🔍 Wallet modal history:", (historyRes as any).data);
                    const tx = (historyRes as any).data.transactions;
                    setWalletTransactions(Array.isArray(tx) ? tx : []);
                  } else {
                    setWalletTransactions([]);
                  }
                  if ((statsRes as any)?.success && (statsRes as any).data) {
                    console.log("🔍 Wallet modal stats:", (statsRes as any).data);
                    setWalletStats((statsRes as any).data as any);
                  }
                } catch {}
              }}
              className="rounded-2xl border-2 p-4"
              style={{ borderColor: theme.border, backgroundColor: theme.surface }}
            >
              <View className="flex-row items-start justify-between">
                <View>
                  <Text className="text-xs" style={{ color: theme.text.secondary }}>
                    Ví của tôi
                  </Text>
                  <Text className="mt-1 text-2xl font-bold" style={{ color: Colors.primary[500] }}>
                    {formatCurrency(walletBalance)}
                  </Text>
                  <Text className="mt-1 text-[11px]" style={{ color: theme.text.secondary }}>
                    Nhấp để xem chi tiết ví
                  </Text>
                </View>
                <View
                  className="h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: Colors.primary[100] }}
                >
                  <Ionicons name="wallet-outline" color={Colors.primary[700]} size={22} />
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Pending alert */}
          {stats.pendingCount > 0 && (
            <View
              className="rounded-2xl border-2 p-4"
              style={{ borderColor: Colors.warning[100], backgroundColor: Colors.warning[50] }}
            >
              <View className="flex-row items-start">
                <View
                  className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: Colors.warning[100] }}
                >
                  <Ionicons name="alert-circle-outline" color={Colors.warning[600]} size={20} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold" style={{ color: Colors.warning[700] }}>
                    Bạn có {stats.pendingCount} thanh toán chờ xử lý
                  </Text>
                  <Text className="mt-1 text-xs" style={{ color: Colors.warning[600] }}>
                    Vui lòng hoàn tất thanh toán để xác nhận lịch hẹn. Nhấn "Thanh toán ngay" trong từng giao dịch.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {errorMessage ? (
            <View
              className="rounded-3xl border p-4"
              style={{
                borderColor: Colors.warning[100],
                backgroundColor: Colors.warning[50],
              }}
            >
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <Ionicons name="alert-circle-outline" size={18} color={Colors.warning[600]} />
                <Text className="flex-1 text-sm font-semibold" style={{ color: Colors.warning[700] }}>
                  {errorMessage}
                </Text>
              </View>
            </View>
          ) : null}

          {loading && payments.length === 0 ? (
            <Card className="items-center justify-center p-8">
              <ActivityIndicator color={Colors.primary[600]} />
              <Text className="mt-3 text-sm" style={{ color: theme.text.secondary }}>
                Đang tải lịch sử thanh toán...
              </Text>
            </Card>
          ) : filteredPayments.length === 0 ? (
            <View
              className="items-center justify-center rounded-3xl border border-dashed p-8 text-center"
              style={{
                borderColor: Colors.primary[200],
                backgroundColor: `${Colors.primary[50]}B3`,
              }}
            >
              <Ionicons name="card-outline" size={28} color={Colors.primary[600]} />
              <Text className="mt-3 text-sm font-semibold" style={{ color: Colors.primary[700] }}>
                Chưa có khoản thanh toán phù hợp
              </Text>
              <Text className="mt-1 text-xs" style={{ color: Colors.primary[500] }}>
                Thử điều chỉnh bộ lọc hoặc liên hệ phòng khám để biết thêm chi tiết.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 20 }}>
              {filteredPayments.map((payment) => (
                <PaymentCard
                  key={payment._id ?? `${payment.transactionId}-${payment.createdAt}`}
                  payment={payment}
                  onPayNow={handlePayNow}
                  theme={theme}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Payment Method Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.overlay }}>
          <View className="w-11/12 max-w-md rounded-2xl p-5" style={{ backgroundColor: theme.surface }}>
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-base font-semibold" style={{ color: theme.text.primary }}>
                Chọn phương thức
              </Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={20} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>
            {selectedPayment ? (
              <View className="mb-4">
                <Text className="text-xs" style={{ color: theme.text.secondary }}>
                  Số tiền: {formatCurrency(selectedPayment.amount || 0)}
                </Text>
                <Text className="mt-1 text-xs" style={{ color: theme.text.secondary }}>
                  Số dư ví: {formatCurrency(walletBalance)}
                </Text>
                {(selectedPayment.amount ?? 0) > walletBalance && (
                  <Text className="mt-2 text-xs" style={{ color: Colors.error[600] }}>
                    Số dư ví không đủ. Vui lòng nạp thêm để tiếp tục.
                  </Text>
                )}
              </View>
            ) : null}

            {/* Wallet option */}
            <TouchableOpacity
              className="mb-3 rounded-2xl py-3 items-center justify-center"
              style={{
                backgroundColor: (selectedPayment?.amount ?? 0) > walletBalance ? "#94a3b8" : Colors.primary[600],
                opacity: (selectedPayment?.amount ?? 0) > walletBalance ? 0.7 : 1,
              }}
              disabled={(selectedPayment?.amount ?? 0) > walletBalance}
              onPress={async () => {
                if ((selectedPayment?.amount ?? 0) > walletBalance) {
                  Alert.alert("Số dư không đủ", "Vui lòng nạp thêm tiền vào ví để thanh toán.");
                  return;
                }
                await handlePayWithWallet();
              }}
            >
              <View className="flex-row items-center">
                <Ionicons name="wallet-outline" color="#fff" size={18} />
                <Text className="ml-2 text-sm font-semibold text-white">Thanh toán bằng ví</Text>
              </View>
            </TouchableOpacity>

            {/* MoMo option */}
            <TouchableOpacity
              className="rounded-2xl border py-3 items-center justify-center"
              style={{ borderColor: Colors.primary[200] }}
              onPress={handlePayWithMoMo}
            >
              <View className="flex-row items-center">
                <Ionicons name="card-outline" color={Colors.primary[700]} size={18} />
                <Text className="ml-2 text-sm font-semibold" style={{ color: Colors.primary[700] }}>
                  Thanh toán qua MoMo
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Wallet Modal */}
      <Modal
        visible={showWalletModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWalletModal(false)}
      >
        <View className="flex-1" style={{ backgroundColor: "#00000066" }}>
          <View className="flex-1 mt-20 rounded-t-3xl" style={{ backgroundColor: theme.surface }}>
            {/* Header */}
            <View className="flex-row items-center justify-between p-5 border-b" style={{ borderColor: theme.border }}>
              <View className="flex-row items-center">
                <View
                  className="h-10 w-10 items-center justify-center rounded-xl mr-3"
                  style={{ backgroundColor: Colors.primary[100] }}
                >
                  <Ionicons name="wallet-outline" color={Colors.primary[700]} size={22} />
                </View>
                <Text className="text-xl font-bold" style={{ color: theme.text.primary }}>
                  Ví của tôi
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowWalletModal(false)}>
                <Ionicons name="close" size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Balance Card */}
            <View className="p-5">
              <View className="rounded-2xl p-5" style={{ backgroundColor: Colors.primary[600] }}>
                <Text className="text-xs text-white opacity-80">Số dư hiện tại</Text>
                <Text className="mt-2 text-3xl font-bold text-white">{formatCurrency(walletBalance)}</Text>
              </View>
            </View>

            {/* Transaction History */}
            <View className="flex-1 px-5">
              <Text className="text-sm font-bold mb-3" style={{ color: theme.text.primary }}>
                Lịch sử giao dịch
              </Text>
              <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                {walletTransactions && walletTransactions.length > 0 ? (
                  <View style={{ gap: 8, paddingBottom: 20 }}>
                    {walletTransactions.map((tx) => (
                      <View
                        key={tx._id}
                        className="rounded-2xl border p-4"
                        style={{ borderColor: theme.border, backgroundColor: "#fff" }}
                      >
                        <View className="flex-row items-start justify-between">
                          <View className="flex-1">
                            <View className="flex-row items-center">
                              <View
                                className="h-8 w-8 items-center justify-center rounded-lg mr-2"
                                style={{ backgroundColor: tx.type === "topup" ? Colors.success[50] : Colors.error[50] }}
                              >
                                <Ionicons
                                  name={tx.type === "topup" ? "arrow-down" : "arrow-up"}
                                  size={16}
                                  color={tx.type === "topup" ? Colors.success[600] : Colors.error[600]}
                                />
                              </View>
                              <View className="flex-1">
                                <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>
                                  {tx.type === "topup"
                                    ? "Nạp tiền"
                                    : tx.type === "payment"
                                      ? "Thanh toán"
                                      : "Giao dịch"}
                                </Text>
                                <Text className="text-xs" style={{ color: theme.text.secondary }}>
                                  {formatDate(tx.createdAt)}
                                </Text>
                              </View>
                            </View>
                          </View>
                          <View className="items-end">
                            <Text
                              className="text-base font-bold"
                              style={{ color: tx.type === "topup" ? Colors.success[600] : Colors.error[600] }}
                            >
                              {tx.type === "topup" ? "+" : "-"}
                              {formatCurrency(tx.amount)}
                            </Text>
                            <View
                              className="mt-1 rounded-full px-2 py-0.5"
                              style={{
                                backgroundColor: tx.status === "completed" ? Colors.success[50] : Colors.warning[50],
                              }}
                            >
                              <Text
                                className="text-[10px] font-semibold"
                                style={{ color: tx.status === "completed" ? Colors.success[700] : Colors.warning[700] }}
                              >
                                {tx.status === "completed" ? "Hoàn tất" : "Đang xử lý"}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View
                    className="rounded-2xl border-2 border-dashed p-6 items-center"
                    style={{ borderColor: Colors.primary[200] }}
                  >
                    <Ionicons name="receipt-outline" size={32} color={Colors.primary[400]} />
                    <Text className="mt-2 text-sm" style={{ color: theme.text.secondary }}>
                      Chưa có giao dịch nào
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
          <View className="flex-1 items-center justify-center" style={{ backgroundColor: "#00000066" }}>
            <View className="w-11/12 max-w-md rounded-2xl p-4" style={{ backgroundColor: theme.surface }}>
              <Text className="mb-2 text-sm font-semibold" style={{ color: theme.text.primary }}>
                {datePickerMode === "start" ? "Chọn ngày bắt đầu" : "Chọn ngày kết thúc"}
              </Text>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, date) => {
                  if (Platform.OS === "android") {
                    if (event.type === "set" && date) {
                      if (datePickerMode === "start") setStartFilterDate(date.toISOString());
                      else setEndFilterDate(date.toISOString());
                    }
                    setShowDatePicker(false);
                    return;
                  }
                  if (date) setTempDate(date);
                }}
              />
              {Platform.OS === "ios" && (
                <View className="mt-3 flex-row justify-end" style={{ gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(false)}
                    className="rounded-2xl px-4 py-2"
                    style={{ backgroundColor: theme.surface }}
                  >
                    <Text style={{ color: theme.text.secondary }}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      if (datePickerMode === "start") setStartFilterDate(tempDate.toISOString());
                      else setEndFilterDate(tempDate.toISOString());
                      setShowDatePicker(false);
                    }}
                    className="rounded-2xl px-4 py-2"
                    style={{ backgroundColor: Colors.primary[600] }}
                  >
                    <Text className="font-semibold text-white">Xong</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}

      <PolicyModal visible={showPolicyModal} onClose={() => setShowPolicyModal(false)} />
    </>
  );
}
