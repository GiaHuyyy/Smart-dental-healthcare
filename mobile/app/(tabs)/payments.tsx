import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { AppHeader } from '@/components/layout/AppHeader';
import { PolicyButton, PolicyModal } from '@/components/policy';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
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

const STATUS_BADGES: Record<string, { label: string; color: string; background: string; iconName: keyof typeof Ionicons.glyphMap }> = {
  pending: { label: 'Chờ thanh toán', color: Colors.warning[700], background: Colors.warning[50], iconName: 'alert-circle-outline' },
  completed: { label: 'Đã thanh toán', color: Colors.success[700], background: Colors.success[50], iconName: 'checkmark-circle-outline' },
  failed: { label: 'Thanh toán thất bại', color: Colors.error[700], background: Colors.error[50], iconName: 'close-circle-outline' },
  refunded: { label: 'Đã hoàn tiền', color: Colors.primary[600], background: Colors.primary[50], iconName: 'refresh-outline' },
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
    iconName: 'ellipse-outline' as const,
  };
  return (
    <View className="self-start flex-row items-center space-x-1 rounded-full px-3 py-1" style={{ backgroundColor: badge.background }}>
      <Ionicons name={badge.iconName} size={14} color={badge.color} />
      <Text className="text-xs font-semibold" style={{ color: badge.color }}>
        {badge.label}
      </Text>
    </View>
  );
}

function PaymentCard({ payment }: { payment: Payment }) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  return (
    <Card shadow="md" className="p-5">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-base font-semibold" style={{ color: theme.text.primary }}>
            {formatCurrency(payment.amount)}
          </Text>
          <Text className="mt-1 text-xs" style={{ color: theme.text.secondary }}>
            Loại: {payment.type ?? 'Khác'}
          </Text>
          <Text className="mt-1 text-xs" style={{ color: theme.text.secondary, opacity: 0.7 }}>
            Bác sĩ phụ trách: {extractUserName(payment.doctorId)}
          </Text>
        </View>
        <PaymentBadge status={payment.status} />
      </View>

      <View
        className="mt-4 rounded-2xl p-4"
        style={{ backgroundColor: Colors.primary[50], borderWidth: 1, borderColor: Colors.primary[100] }}
      >
        <View className="flex-row items-center space-x-2">
          <Ionicons name="card-outline" size={18} color={Colors.primary[600]} />
          <Text className="text-sm font-semibold" style={{ color: Colors.primary[700] }}>
            Thông tin thanh toán
          </Text>
        </View>
        <View className="mt-3 space-y-2">
          <Text className="text-xs" style={{ color: theme.text.secondary }}>
            Ngày thanh toán: {formatDate(payment.paymentDate ?? payment.createdAt)}
          </Text>
          <Text className="text-xs" style={{ color: theme.text.secondary }}>
            Phương thức: {payment.paymentMethod ?? 'Đang cập nhật'}
          </Text>
          {payment.transactionId ? (
            <Text className="text-xs" style={{ color: theme.text.secondary }}>
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
    </Card>
  );
}

export default function PaymentsScreen() {
  const router = useRouter();
  const { session, isAuthenticated, isHydrating } = useAuth();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const patientId = session?.user?._id ?? '';
  const token = session?.token ?? '';

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPolicyModal, setShowPolicyModal] = useState(false);

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
      <>
        <AppHeader 
          title="Thanh toán" 
          showNotification 
          showAvatar 
          notificationCount={0}
          rightComponent={<PolicyButton onPress={() => setShowPolicyModal(true)} />}
        />
        <ScrollView 
          className="flex-1"
          style={{ backgroundColor: theme.background }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}
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
                onPress={() => router.push('/(auth)/login' as const)}
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
        notificationCount={0}
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
        <View className="space-y-6">
          <Card className="p-6">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <View 
                  className="h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: Colors.primary[600] }}
                >
                  <Ionicons name="cash-outline" size={28} color="#ffffff" />
                </View>
                <Text className="mt-5 text-2xl font-semibold" style={{ color: theme.text.primary }}>
                  Quản lý thanh toán
                </Text>
                <Text className="mt-2 text-sm" style={{ color: theme.text.secondary }}>
                  Theo dõi các khoản chi phí điều trị, tình trạng thanh toán và yêu cầu hoá đơn chỉ trong vài bước.
                </Text>
              </View>
              <View className="w-28 space-y-3">
                <View className="rounded-2xl px-3 py-2" style={{ backgroundColor: Colors.primary[50] }}>
                  <Text className="text-[11px] font-semibold" style={{ color: Colors.primary[600] }}>
                    Số đơn
                  </Text>
                  <Text className="text-lg font-bold" style={{ color: Colors.primary[700] }}>
                    {payments.length}
                  </Text>
                </View>
                <View className="rounded-2xl px-3 py-2" style={{ backgroundColor: Colors.success[50] }}>
                  <Text className="text-[11px] font-semibold" style={{ color: Colors.success[600] }}>
                    Đã thanh toán
                  </Text>
                  <Text className="text-lg font-bold" style={{ color: Colors.success[700] }}>
                    {stats.completedCount}
                  </Text>
                </View>
              </View>
            </View>

            <View className="mt-6 space-y-3">
              <View 
                className="rounded-2xl border p-3"
                style={{ 
                  borderColor: Colors.primary[100],
                  backgroundColor: `${Colors.primary[50]}CC`
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

              <View className="flex-row flex-wrap gap-3">
                {STATUS_OPTIONS.map((option) => {
                  const active = option.id === statusFilter;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() => setStatusFilter(option.id)}
                      className="rounded-2xl border px-4 py-2"
                      style={{
                        borderColor: active ? Colors.primary[600] : Colors.primary[100],
                        backgroundColor: active ? Colors.primary[600] : '#ffffff'
                      }}
                    >
                      <Text 
                        className="text-xs font-semibold"
                        style={{ color: active ? '#ffffff' : Colors.primary[700] }}
                      >
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
                      className="rounded-2xl border px-4 py-2"
                      style={{
                        borderColor: active ? Colors.success[500] : '#e2e8f0',
                        backgroundColor: active ? `${Colors.success[100]}CC` : '#ffffff'
                      }}
                    >
                      <Text 
                        className="text-xs font-semibold"
                        style={{ color: active ? Colors.success[700] : '#475569' }}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Card>

          <View className="flex-row flex-wrap gap-4">
            <View className="w-full flex-1" style={{ minWidth: '48%' }}>
              <Card className="h-full p-4">
                <View className="flex-row items-center space-x-3">
                  <Ionicons name="cash-outline" size={20} color={Colors.success[600]} />
                  <View>
                    <Text className="text-xs font-semibold" style={{ color: theme.text.secondary }}>
                      Tổng chi phí
                    </Text>
                    <Text className="text-lg font-bold" style={{ color: theme.text.primary }}>
                      {formatCurrency(stats.totalAmount)}
                    </Text>
                  </View>
                </View>
                <Text className="mt-3 text-xs" style={{ color: theme.text.secondary }}>
                  Tổng số tiền đã phát sinh trong tài khoản của bạn.
                </Text>
              </Card>
            </View>
            <View className="w-full flex-1" style={{ minWidth: '48%' }}>
              <Card className="h-full p-4">
                <View className="flex-row items-center space-x-3">
                  <Ionicons name="hand-left-outline" size={20} color={Colors.warning[600]} />
                  <View>
                    <Text className="text-xs font-semibold" style={{ color: theme.text.secondary }}>
                      Chưa thanh toán
                    </Text>
                    <Text className="text-lg font-bold" style={{ color: theme.text.primary }}>
                      {formatCurrency(stats.outstanding)}
                    </Text>
                  </View>
                </View>
                <Text className="mt-3 text-xs" style={{ color: theme.text.secondary }}>
                  Bao gồm các khoản đang chờ xử lý hoặc thất bại.
                </Text>
              </Card>
            </View>
            <View className="w-full flex-1" style={{ minWidth: '48%' }}>
              <Card className="h-full p-4">
                <View className="flex-row items-center space-x-3">
                  <Ionicons name="document-text-outline" size={20} color={Colors.primary[600]} />
                  <View>
                    <Text className="text-xs font-semibold" style={{ color: theme.text.secondary }}>
                      Thanh toán gần nhất
                    </Text>
                    <Text className="text-lg font-bold" style={{ color: theme.text.primary }}>
                      {formatDate(stats.latestDate)}
                    </Text>
                  </View>
                </View>
                <Text className="mt-3 text-xs" style={{ color: theme.text.secondary }}>
                  Ngày cập nhật gần nhất cho lịch sử thanh toán của bạn.
                </Text>
              </Card>
            </View>
          </View>

          {errorMessage ? (
            <View 
              className="rounded-3xl border p-4"
              style={{ 
                borderColor: Colors.warning[100],
                backgroundColor: Colors.warning[50]
              }}
            >
              <View className="flex-row items-center space-x-2">
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
                backgroundColor: `${Colors.primary[50]}B3`
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
            <View className="space-y-5">
              {filteredPayments.map((payment) => (
                <PaymentCard key={payment._id ?? `${payment.transactionId}-${payment.createdAt}`} payment={payment} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <PolicyModal visible={showPolicyModal} onClose={() => setShowPolicyModal(false)} />
    </>
  );
}
