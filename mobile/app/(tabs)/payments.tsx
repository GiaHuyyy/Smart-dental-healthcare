import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    AlertTriangle,
    Banknote,
    CircleCheck,
    CircleDollarSign,
    CircleSlash2,
    CreditCard,
    FileText,
    HandCoins,
    Receipt,
    RefreshCw,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { apiRequest, formatApiError } from '@/utils/api';

type PopulatedUser = {
  _id?: string;
  fullName?: string;
  email?: string;
};

type Payment = {
  _id?: string;
  patientId?: PopulatedUser | string;
  doctorId?: PopulatedUser | string;
  amount?: number;
  status?: 'pending' | 'completed' | 'failed' | 'refunded' | string;
  type?: 'appointment' | 'treatment' | 'medicine' | 'other' | string;
  paymentDate?: string | Date | null;
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
  createdAt?: string | Date | null;
};

type StatusFilter = 'all' | 'pending' | 'completed' | 'failed' | 'refunded';
type TypeFilter = 'all' | 'appointment' | 'treatment' | 'medicine' | 'other';

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'pending', label: 'Chờ thanh toán' },
  { id: 'completed', label: 'Đã thanh toán' },
  { id: 'failed', label: 'Thất bại' },
  { id: 'refunded', label: 'Đã hoàn' },
];

const TYPE_OPTIONS: { id: TypeFilter; label: string }[] = [
  { id: 'all', label: 'Mọi loại' },
  { id: 'appointment', label: 'Lịch hẹn' },
  { id: 'treatment', label: 'Điều trị' },
  { id: 'medicine', label: 'Thuốc' },
  { id: 'other', label: 'Khác' },
];

const STATUS_BADGES: Record<string, { label: string; color: string; background: string; icon: React.ComponentType<any> }> = {
  pending: { label: 'Chờ thanh toán', color: '#b45309', background: '#fef3c7', icon: AlertTriangle },
  completed: { label: 'Đã thanh toán', color: '#047857', background: '#d1fae5', icon: CircleCheck },
  failed: { label: 'Thanh toán thất bại', color: '#b91c1c', background: '#fee2e2', icon: CircleSlash2 },
  refunded: { label: 'Đã hoàn tiền', color: '#2563eb', background: '#dbeafe', icon: RefreshCw },
};

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
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
  if (!date) return '—';
  return date.toLocaleDateString('vi-VN');
}

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

function formatCurrency(value?: number | null): string {
  if (value === undefined || value === null) return '—';
  return currencyFormatter.format(value);
}

function extractUserName(user: Payment['doctorId'] | Payment['patientId']): string {
  if (!user) return 'Smart Dental';
  if (typeof user === 'string') return user;
  return user.fullName ?? user.email ?? 'Smart Dental';
}

function PaymentBadge({ status }: { status?: string }) {
  const normalized = (status ?? '').toLowerCase();
  const badge = STATUS_BADGES[normalized] ?? {
    label: 'Đang xử lý',
    color: '#334155',
    background: '#e2e8f0',
    icon: AlertTriangle,
  };
  const Icon = badge.icon;
  return (
    <View className="self-start flex-row items-center space-x-1 rounded-full px-3 py-1" style={{ backgroundColor: badge.background }}>
      <Icon color={badge.color} size={14} />
      <Text className="text-xs font-semibold" style={{ color: badge.color }}>
        {badge.label}
      </Text>
    </View>
  );
}

function PaymentCard({ payment }: { payment: Payment }) {
  return (
    <View className="rounded-3xl border border-white/70 bg-white/95 p-5 shadow-lg shadow-blue-100">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-base font-semibold text-slate-900">
            {formatCurrency(payment.amount)}
          </Text>
          <Text className="mt-1 text-xs text-slate-500">Loại: {payment.type ?? 'Khác'}</Text>
          <Text className="mt-1 text-xs text-slate-400">
            Bác sĩ phụ trách: {extractUserName(payment.doctorId)}
          </Text>
        </View>
        <PaymentBadge status={payment.status} />
      </View>

      <View className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
        <View className="flex-row items-center space-x-2">
          <CreditCard color="#1d4ed8" size={18} />
          <Text className="text-sm font-semibold text-blue-700">Thông tin thanh toán</Text>
        </View>
        <View className="mt-3 space-y-2">
          <Text className="text-xs text-slate-600">
            Ngày thanh toán: {formatDate(payment.paymentDate ?? payment.createdAt)}
          </Text>
          <Text className="text-xs text-slate-600">Phương thức: {payment.paymentMethod ?? 'Đang cập nhật'}</Text>
          {payment.transactionId ? (
            <Text className="text-xs text-slate-600">Mã giao dịch: {payment.transactionId}</Text>
          ) : null}
        </View>
      </View>

      {payment.notes ? (
        <View className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
          <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ghi chú</Text>
          <Text className="mt-1 text-xs text-slate-600">{payment.notes}</Text>
        </View>
      ) : null}

      <View className="mt-5 flex-row space-x-3">
        <TouchableOpacity
          className="flex-1 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 py-3"
          onPress={() =>
            Alert.alert(
              'Yêu cầu hoá đơn',
              'Hóa đơn chi tiết sẽ được gửi qua email trong vòng 24 giờ. Vui lòng liên hệ phòng khám nếu cần gấp.',
            )
          }
        >
          <View className="flex-row items-center space-x-2">
            <Receipt color="#1d4ed8" size={18} />
            <Text className="text-sm font-semibold text-blue-700">Nhận hoá đơn</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 items-center justify-center rounded-2xl bg-blue-600 py-3"
          onPress={() =>
            Alert.alert(
              'Cần hỗ trợ?',
              'Đội ngũ chăm sóc khách hàng sẽ hỗ trợ bạn kiểm tra thanh toán trong thời gian sớm nhất.',
            )
          }
        >
          <View className="flex-row items-center space-x-2">
            <HandCoins color="#ffffff" size={18} />
            <Text className="text-sm font-semibold text-white">Liên hệ hỗ trợ</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PaymentsScreen() {
  const router = useRouter();
  const { session, isAuthenticated, isHydrating } = useAuth();

  const patientId = session?.user?._id ?? '';
  const token = session?.token ?? '';

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

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
        const response = await apiRequest<Payment[]>(`/api/v1/payments/patient/${patientId}`, {
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
        setErrorMessage(formatApiError(error, 'Không thể tải lịch sử thanh toán.'));
      } finally {
        if (viaRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [patientId, token],
  );

  useFocusEffect(
    useCallback(() => {
      if (!patientId || !token) return;
      const controller = new AbortController();
      void loadPayments({ signal: controller.signal });
      return () => controller.abort();
    }, [patientId, token, loadPayments]),
  );

  const handleRefresh = useCallback(() => {
    if (!patientId || !token) return;
    void loadPayments({ viaRefresh: true });
  }, [patientId, token, loadPayments]);

  const stats = useMemo(() => {
    const totalsByStatus = payments.reduce(
      (acc, payment) => {
        const status = (payment.status ?? 'other').toLowerCase();
        acc.countByStatus[status] = (acc.countByStatus[status] ?? 0) + 1;
        const amount = payment.amount ?? 0;
        acc.amountByStatus[status] = (acc.amountByStatus[status] ?? 0) + amount;
        acc.totalAmount += amount;
        if ((payment.status ?? '').toLowerCase() !== 'completed') {
          acc.outstanding += amount;
        }
        const date = parseDate(payment.paymentDate ?? payment.createdAt);
        if (date && (!acc.latestDate || date.getTime() > acc.latestDate.getTime())) {
          acc.latestDate = date;
        }
        return acc;
      },
      {
        totalAmount: 0,
        outstanding: 0,
        latestDate: null as Date | null,
        countByStatus: {} as Record<string, number>,
        amountByStatus: {} as Record<string, number>,
      },
    );

    return {
      totalAmount: totalsByStatus.totalAmount,
      outstanding: totalsByStatus.outstanding,
      latestDate: totalsByStatus.latestDate,
      completedCount: totalsByStatus.countByStatus.completed ?? 0,
      pendingCount: totalsByStatus.countByStatus.pending ?? 0,
    };
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return payments.filter((payment) => {
      const status = (payment.status ?? '').toLowerCase();
      const type = (payment.type ?? '').toLowerCase();

      if (statusFilter !== 'all' && status !== statusFilter) {
        return false;
      }
      if (typeFilter !== 'all' && type !== typeFilter) {
        return false;
      }
      if (!term) {
        return true;
      }
      const doctorName = extractUserName(payment.doctorId).toLowerCase();
      const notes = (payment.notes ?? '').toLowerCase();
      const transactionId = (payment.transactionId ?? '').toLowerCase();
      return doctorName.includes(term) || notes.includes(term) || transactionId.includes(term);
    });
  }, [payments, statusFilter, typeFilter, searchTerm]);

  if (!isHydrating && !isAuthenticated) {
    return (
      <LinearGradient colors={['#eef2ff', '#e0f2fe', '#fff']} className="flex-1">
        <SafeAreaView className="flex-1 items-center justify-center px-6">
          <View className="w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-6 text-center shadow-lg shadow-blue-100">
            <Banknote color="#1d4ed8" size={36} className="self-center" />
            <Text className="mt-4 text-xl font-semibold text-slate-900">Đăng nhập để xem thanh toán</Text>
            <Text className="mt-2 text-sm text-slate-500">
              Truy cập lịch sử thanh toán, hoá đơn và số dư ngay khi bạn đăng nhập tài khoản.
            </Text>
            <TouchableOpacity
              className="mt-6 items-center justify-center rounded-2xl bg-blue-600 py-3"
              onPress={() => router.push('/(auth)/login' as const)}
            >
              <Text className="text-sm font-semibold text-white">Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#eef2ff', '#e0f2fe', '#fff']} className="flex-1">
      <SafeAreaView className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48, paddingTop: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            isAuthenticated ? (
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1d4ed8" />
            ) : undefined
          }
        >
          <View className="space-y-6">
            <View className="rounded-3xl border border-white/70 bg-white/95 p-6 shadow-lg shadow-blue-100">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-4">
                  <View className="h-14 w-14 items-center justify-center rounded-2xl bg-blue-600">
                    <CircleDollarSign color="#ffffff" size={28} />
                  </View>
                  <Text className="mt-5 text-2xl font-semibold text-slate-900">Quản lý thanh toán</Text>
                  <Text className="mt-2 text-sm text-slate-600">
                    Theo dõi các khoản chi phí điều trị, tình trạng thanh toán và yêu cầu hoá đơn chỉ trong vài bước.
                  </Text>
                </View>
                <View className="w-28 space-y-3">
                  <View className="rounded-2xl bg-blue-50 px-3 py-2">
                    <Text className="text-[11px] font-semibold text-blue-600">Số đơn</Text>
                    <Text className="text-lg font-bold text-blue-700">{payments.length}</Text>
                  </View>
                  <View className="rounded-2xl bg-emerald-50 px-3 py-2">
                    <Text className="text-[11px] font-semibold text-emerald-600">Đã thanh toán</Text>
                    <Text className="text-lg font-bold text-emerald-700">{stats.completedCount}</Text>
                  </View>
                </View>
              </View>

              <View className="mt-6 space-y-3">
                <View className="rounded-2xl border border-blue-100 bg-blue-50/80 p-3">
                  <TextInput
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    placeholder="Tìm theo bác sĩ, ghi chú hoặc mã giao dịch..."
                    placeholderTextColor="#94a3b8"
                    className="text-sm text-slate-900"
                  />
                </View>

                <View className="flex-row flex-wrap gap-3">
                  {STATUS_OPTIONS.map((option) => {
                    const active = option.id === statusFilter;
                    return (
                      <TouchableOpacity
                        key={option.id}
                        onPress={() => setStatusFilter(option.id)}
                        className={`rounded-2xl border px-4 py-2 ${
                          active ? 'border-blue-600 bg-blue-600' : 'border-blue-100 bg-white'
                        }`}
                      >
                        <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-blue-700'}`}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View className="flex-row flex-wrap gap-3">
                  {TYPE_OPTIONS.map((option) => {
                    const active = option.id === typeFilter;
                    return (
                      <TouchableOpacity
                        key={option.id}
                        onPress={() => setTypeFilter(option.id)}
                        className={`rounded-2xl border px-4 py-2 ${
                          active ? 'border-emerald-500 bg-emerald-100/80' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <Text className={`text-xs font-semibold ${active ? 'text-emerald-700' : 'text-slate-600'}`}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            <View className="flex-row flex-wrap gap-4">
              <View className="w-full flex-1" style={{ minWidth: '48%' }}>
                <View className="h-full rounded-3xl border border-white/70 bg-white/95 p-4 shadow-lg shadow-blue-100">
                  <View className="flex-row items-center space-x-3">
                    <CircleDollarSign color="#047857" size={20} />
                    <View>
                      <Text className="text-xs font-semibold text-slate-500">Tổng chi phí</Text>
                      <Text className="text-lg font-bold text-slate-900">{formatCurrency(stats.totalAmount)}</Text>
                    </View>
                  </View>
                  <Text className="mt-3 text-xs text-slate-500">Tổng số tiền đã phát sinh trong tài khoản của bạn.</Text>
                </View>
              </View>
              <View className="w-full flex-1" style={{ minWidth: '48%' }}>
                <View className="h-full rounded-3xl border border-white/70 bg-white/95 p-4 shadow-lg shadow-blue-100">
                  <View className="flex-row items-center space-x-3">
                    <HandCoins color="#b45309" size={20} />
                    <View>
                      <Text className="text-xs font-semibold text-slate-500">Chưa thanh toán</Text>
                      <Text className="text-lg font-bold text-slate-900">{formatCurrency(stats.outstanding)}</Text>
                    </View>
                  </View>
                  <Text className="mt-3 text-xs text-slate-500">Bao gồm các khoản đang chờ xử lý hoặc thất bại.</Text>
                </View>
              </View>
              <View className="w-full flex-1" style={{ minWidth: '48%' }}>
                <View className="h-full rounded-3xl border border-white/70 bg-white/95 p-4 shadow-lg shadow-blue-100">
                  <View className="flex-row items-center space-x-3">
                    <FileText color="#1d4ed8" size={20} />
                    <View>
                      <Text className="text-xs font-semibold text-slate-500">Thanh toán gần nhất</Text>
                      <Text className="text-lg font-bold text-slate-900">{formatDate(stats.latestDate)}</Text>
                    </View>
                  </View>
                  <Text className="mt-3 text-xs text-slate-500">Ngày cập nhật gần nhất cho lịch sử thanh toán của bạn.</Text>
                </View>
              </View>
            </View>

            {errorMessage ? (
              <View className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                <View className="flex-row items-center space-x-2">
                  <AlertTriangle color="#b45309" size={18} />
                  <Text className="flex-1 text-sm font-semibold text-amber-800">{errorMessage}</Text>
                </View>
              </View>
            ) : null}

            {loading && payments.length === 0 ? (
              <View className="items-center justify-center rounded-3xl border border-white/70 bg-white/95 p-8">
                <ActivityIndicator color="#1d4ed8" />
                <Text className="mt-3 text-sm text-slate-500">Đang tải lịch sử thanh toán...</Text>
              </View>
            ) : filteredPayments.length === 0 ? (
              <View className="items-center justify-center rounded-3xl border border-dashed border-blue-200 bg-blue-50/70 p-8 text-center">
                <CreditCard color="#1d4ed8" size={28} />
                <Text className="mt-3 text-sm font-semibold text-blue-700">Chưa có khoản thanh toán phù hợp</Text>
                <Text className="mt-1 text-xs text-blue-500">Thử điều chỉnh bộ lọc hoặc liên hệ phòng khám để biết thêm chi tiết.</Text>
              </View>
            ) : (
              <View className="space-y-5">
                {filteredPayments.map((payment) => (
                  <PaymentCard key={payment._id ?? `${payment.transactionId}-${payment.createdAt}`} payment={payment} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
