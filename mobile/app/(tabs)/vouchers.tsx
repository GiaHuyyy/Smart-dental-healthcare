import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Clipboard,
    RefreshControl,
    ScrollView,
    Text,
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

type Voucher = {
  _id?: string;
  patientId?: string;
  code?: string;
  type?: 'percentage' | 'fixed';
  value?: number;
  reason?: 'doctor_cancellation' | 'follow_up';
  expiresAt?: string | Date;
  isUsed?: boolean;
  usedAt?: string | Date | null;
  relatedAppointmentId?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

const REASON_LABELS: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  doctor_cancellation: { 
    label: 'Bác sĩ hủy lịch', 
    icon: 'calendar-outline', 
    color: Colors.warning[700], 
    bg: Colors.warning[50] 
  },
  follow_up: { 
    label: 'Ưu đãi tái khám', 
    icon: 'heart-outline', 
    color: Colors.primary[700], 
    bg: Colors.primary[50] 
  },
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

function formatDiscount(voucher: Voucher): string {
  if (voucher.type === 'percentage') {
    return `${voucher.value ?? 0}%`;
  }
  return `${(voucher.value ?? 0).toLocaleString('vi-VN')} VNĐ`;
}

function isExpired(voucher: Voucher): boolean {
  const date = parseDate(voucher.expiresAt);
  if (!date) return false;
  return date.getTime() < Date.now();
}

function VoucherCard({ voucher, onCopy }: { voucher: Voucher; onCopy: (code: string) => void }) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const expired = isExpired(voucher);
  const used = voucher.isUsed ?? false;
  const code = voucher.code ?? 'N/A';
  const discount = formatDiscount(voucher);
  const reason = voucher.reason ?? 'follow_up';
  const reasonData = REASON_LABELS[reason] ?? REASON_LABELS.follow_up;

  // Card states
  const cardBg = expired 
    ? theme.surface 
    : used 
      ? Colors.success[50] 
      : Colors.primary[50];
  
  const borderColor = expired 
    ? theme.border 
    : used 
      ? Colors.success[200] 
      : Colors.primary[200];

  return (
    <Card 
      shadow="md" 
      className="p-4"
      style={{ 
        backgroundColor: cardBg,
        borderWidth: 2,
        borderColor,
        opacity: expired ? 0.6 : 1,
      }}
    >
      {/* Header */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <View
            className="h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: reasonData.bg }}
          >
            <Ionicons name={reasonData.icon} size={16} color={reasonData.color} />
          </View>
          <View
            className="rounded-full px-2.5 py-1"
            style={{ backgroundColor: reasonData.bg }}
          >
            <Text className="text-xs font-semibold" style={{ color: reasonData.color }}>
              {reasonData.label}
            </Text>
          </View>
        </View>

        {/* Status Badge */}
        {used ? (
          <View className="flex-row items-center gap-1 rounded-full px-2.5 py-1" style={{ backgroundColor: Colors.success[100] }}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.success[700]} />
            <Text className="text-xs font-semibold" style={{ color: Colors.success[700] }}>
              Đã dùng
            </Text>
          </View>
        ) : expired ? (
          <View className="flex-row items-center gap-1 rounded-full px-2.5 py-1" style={{ backgroundColor: theme.border }}>
            <Ionicons name="close-circle" size={14} color={theme.text.secondary} />
            <Text className="text-xs font-semibold" style={{ color: theme.text.secondary }}>
              Hết hạn
            </Text>
          </View>
        ) : null}
      </View>

      {/* Discount Display */}
      <View className="mb-4">
        <Text className="text-3xl font-bold" style={{ color: theme.text.primary }}>
          {discount}
        </Text>
        <Text className="text-xs mt-1" style={{ color: theme.text.secondary }}>
          Giảm giá
        </Text>
      </View>

      {/* Code Section - Clickable */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onCopy(code)}
        className="mb-3 rounded-xl border-2 border-dashed p-3"
        style={{ 
          borderColor: used || expired ? theme.border : Colors.primary[300],
          backgroundColor: theme.card,
        }}
        disabled={used || expired}
      >
        <Text className="text-xs mb-1" style={{ color: theme.text.secondary }}>
          Mã voucher
        </Text>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-mono font-bold" style={{ color: theme.text.primary }}>
            {code}
          </Text>
          {!used && !expired && (
            <Text className="text-xs font-semibold" style={{ color: Colors.primary[700] }}>
              Copy
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Footer Info */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="calendar-outline" size={12} color={theme.text.secondary} />
          <Text className="text-xs" style={{ color: theme.text.secondary }}>
            HSD: {formatDate(voucher.expiresAt)}
          </Text>
        </View>

        {used && voucher.usedAt && (
          <Text className="text-xs" style={{ color: theme.text.secondary }}>
            Dùng: {formatDate(voucher.usedAt)}
          </Text>
        )}
      </View>
    </Card>
  );
}

export default function VouchersScreen() {
  const router = useRouter();
  const { session, isAuthenticated, isHydrating } = useAuth();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const token = session?.token ?? '';

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  const loadVouchers = useCallback(
    async ({ viaRefresh = false, signal }: { viaRefresh?: boolean; signal?: AbortSignal } = {}) => {
      if (!token) {
        setVouchers([]);
        return;
      }

      if (viaRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await apiRequest<Voucher[]>(`/api/v1/vouchers/my-vouchers`, {
          token,
          abortSignal: signal,
        });
        setVouchers(ensureArray<Voucher>(response.data));
        setErrorMessage(null);
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        setVouchers([]);
        setErrorMessage(formatApiError(error, 'Không thể tải danh sách voucher.'));
      } finally {
        if (viaRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [token],
  );

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      const controller = new AbortController();
      void loadVouchers({ signal: controller.signal });
      return () => controller.abort();
    }, [token, loadVouchers]),
  );

  const handleRefresh = useCallback(() => {
    if (!token) return;
    void loadVouchers({ viaRefresh: true });
  }, [token, loadVouchers]);

  const handleCopyCode = useCallback((code: string) => {
    Clipboard.setString(code);
    Alert.alert('Đã sao chép', `Mã voucher "${code}" đã được sao chép vào clipboard!`);
  }, []);

  const stats = useMemo(() => {
    const total = vouchers.length;
    const available = vouchers.filter((v) => !v.isUsed && !isExpired(v)).length;
    const used = vouchers.filter((v) => v.isUsed).length;
    const expired = vouchers.filter((v) => !v.isUsed && isExpired(v)).length;

    return { total, available, used, expired };
  }, [vouchers]);

  const sortedVouchers = useMemo(() => {
    // Sort: available first, then used, then expired
    return [...vouchers].sort((a, b) => {
      const aUsed = a.isUsed ?? false;
      const bUsed = b.isUsed ?? false;
      const aExpired = isExpired(a);
      const bExpired = isExpired(b);

      // Available vouchers first
      if (!aUsed && !aExpired && (bUsed || bExpired)) return -1;
      if ((aUsed || aExpired) && !bUsed && !bExpired) return 1;

      // Then used vouchers
      if (aUsed && !bUsed && !bExpired) return -1;
      if (!aUsed && !aExpired && bUsed) return 1;

      // Sort by expiry date (soonest first for available)
      const aDate = parseDate(a.expiresAt);
      const bDate = parseDate(b.expiresAt);
      if (aDate && bDate) {
        return aDate.getTime() - bDate.getTime();
      }

      return 0;
    });
  }, [vouchers]);

  if (!isHydrating && !isAuthenticated) {
    return (
      <>
        <AppHeader 
          title="Voucher của tôi" 
          showNotification 
          showAvatar 
          rightComponent={<PolicyButton onPress={() => setShowPolicyModal(true)} />}
        />
        <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: theme.background }}>
          <Card shadow="md" className="w-full max-w-md p-6 items-center">
            <Ionicons name="pricetag-outline" size={36} color={Colors.primary[600]} />
            <Text className="mt-4 text-xl font-semibold" style={{ color: theme.text.primary }}>
              Đăng nhập để xem voucher
            </Text>
            <Text className="mt-2 text-sm text-center" style={{ color: theme.text.secondary }}>
              Vui lòng đăng nhập để truy cập các voucher giảm giá của bạn.
            </Text>
            <TouchableOpacity
              className="mt-6 w-full items-center justify-center rounded-2xl py-3"
              style={{ backgroundColor: Colors.primary[600] }}
              onPress={() => router.push('/(auth)/login' as const)}
            >
              <Text className="text-sm font-semibold text-white">Đăng nhập</Text>
            </TouchableOpacity>
          </Card>
        </View>

        <PolicyModal visible={showPolicyModal} onClose={() => setShowPolicyModal(false)} />
      </>
    );
  }

  return (
    <>
      <AppHeader 
        title="Voucher của tôi" 
        showNotification 
        showAvatar 
        rightComponent={<PolicyButton onPress={() => setShowPolicyModal(true)} />}
      />
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80, paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          isAuthenticated ? (
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary[600]} />
          ) : undefined
        }
      >
        <View className="space-y-6">
          {/* Header Card */}
          <Card className="p-6">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <View 
                  className="h-14 w-14 items-center justify-center rounded-2xl mb-4"
                  style={{ backgroundColor: Colors.primary[600] }}
                >
                  <Ionicons name="pricetag" size={28} color="#ffffff" />
                </View>
                <Text className="text-2xl font-semibold" style={{ color: theme.text.primary }}>
                  Voucher của tôi
                </Text>
                <Text className="mt-2 text-sm" style={{ color: theme.text.secondary }}>
                  Quản lý và sử dụng các voucher giảm giá của bạn
                </Text>
              </View>
              <View className="space-y-2">
                <View className="rounded-2xl px-3 py-2" style={{ backgroundColor: Colors.primary[50] }}>
                  <Text className="text-xs font-semibold" style={{ color: Colors.primary[600] }}>
                    Tổng số
                  </Text>
                  <Text className="text-xl font-bold" style={{ color: Colors.primary[700] }}>
                    {stats.total}
                  </Text>
                </View>
              </View>
            </View>
          </Card>

          {/* Quick Stats */}
          <View className="flex-row flex-wrap gap-3">
            <View className="flex-1" style={{ minWidth: '48%' }}>
              <Card className="p-4">
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="checkmark-circle-outline" size={20} color={Colors.success[600]} />
                  <Text className="text-xs font-semibold" style={{ color: theme.text.secondary }}>
                    Khả dụng
                  </Text>
                </View>
                <Text className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                  {stats.available}
                </Text>
              </Card>
            </View>
            <View className="flex-1" style={{ minWidth: '48%' }}>
              <Card className="p-4">
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="checkmark-done-outline" size={20} color={Colors.primary[600]} />
                  <Text className="text-xs font-semibold" style={{ color: theme.text.secondary }}>
                    Đã dùng
                  </Text>
                </View>
                <Text className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                  {stats.used}
                </Text>
              </Card>
            </View>
          </View>

          {/* Error Message */}
          {errorMessage ? (
            <Card
              shadow="md"
              className="p-4"
              style={{ backgroundColor: Colors.warning[50], borderWidth: 1, borderColor: Colors.warning[100] }}
            >
              <View className="flex-row items-center space-x-2">
                <Ionicons name="alert-circle-outline" size={18} color={Colors.warning[700]} />
                <Text className="flex-1 text-sm font-semibold" style={{ color: Colors.warning[700] }}>
                  {errorMessage}
                </Text>
              </View>
            </Card>
          ) : null}

          {/* Content */}
          {loading && vouchers.length === 0 ? (
            <Card shadow="md" className="items-center justify-center p-8">
              <ActivityIndicator color={Colors.primary[600]} />
              <Text className="mt-3 text-sm" style={{ color: theme.text.secondary }}>
                Đang tải voucher...
              </Text>
            </Card>
          ) : sortedVouchers.length === 0 ? (
            <Card shadow="md" className="items-center justify-center p-8">
              <View
                className="rounded-full p-4"
                style={{ backgroundColor: Colors.primary[50] }}
              >
                <Ionicons name="pricetag-outline" size={28} color={Colors.primary[600]} />
              </View>
              <Text className="mt-3 text-sm font-semibold" style={{ color: Colors.primary[700] }}>
                Bạn chưa có voucher nào
              </Text>
              <Text className="mt-1 text-xs text-center" style={{ color: theme.text.secondary }}>
                Voucher sẽ được tặng khi bác sĩ tạo đề xuất tái khám hoặc hủy lịch khẩn cấp
              </Text>
            </Card>
          ) : (
            <View className="space-y-4">
              {sortedVouchers.map((voucher) => (
                <VoucherCard 
                  key={voucher._id ?? `${voucher.code}-${voucher.createdAt}`} 
                  voucher={voucher}
                  onCopy={handleCopyCode}
                />
              ))}
            </View>
          )}

          {/* Usage Instructions */}
          <Card className="p-5" style={{ backgroundColor: Colors.primary[50], borderWidth: 1, borderColor: Colors.primary[100] }}>
            <View className="flex-row items-center gap-2 mb-3">
              <Text className="text-xl">💡</Text>
              <Text className="text-base font-semibold" style={{ color: Colors.primary[700] }}>
                Hướng dẫn sử dụng voucher
              </Text>
            </View>
            <View className="space-y-2">
              <View className="flex-row items-start gap-2">
                <Text className="font-bold" style={{ color: Colors.primary[700] }}>1.</Text>
                <Text className="flex-1 text-sm" style={{ color: Colors.primary[700] }}>
                  Click vào mã voucher để sao chép vào clipboard
                </Text>
              </View>
              <View className="flex-row items-start gap-2">
                <Text className="font-bold" style={{ color: Colors.primary[700] }}>2.</Text>
                <Text className="flex-1 text-sm" style={{ color: Colors.primary[700] }}>
                  Khi đặt lịch khám hoặc thanh toán, dán mã voucher vào ô "Mã giảm giá"
                </Text>
              </View>
              <View className="flex-row items-start gap-2">
                <Text className="font-bold" style={{ color: Colors.primary[700] }}>3.</Text>
                <Text className="flex-1 text-sm" style={{ color: Colors.primary[700] }}>
                  Voucher sẽ được áp dụng tự động và giảm trừ vào tổng số tiền
                </Text>
              </View>
              <View className="flex-row items-start gap-2">
                <Text className="font-bold" style={{ color: Colors.primary[700] }}>4.</Text>
                <Text className="flex-1 text-sm" style={{ color: Colors.primary[700] }}>
                  Mỗi voucher chỉ được sử dụng một lần và có thời hạn sử dụng
                </Text>
              </View>
            </View>
          </Card>

          {/* How to get vouchers */}
          <Card className="p-5" style={{ backgroundColor: Colors.success[50], borderWidth: 1, borderColor: Colors.success[100] }}>
            <View className="flex-row items-center gap-2 mb-3">
              <Text className="text-xl">🎁</Text>
              <Text className="text-base font-semibold" style={{ color: Colors.success[700] }}>
                Cách nhận voucher
              </Text>
            </View>
            <View className="space-y-2">
              <View className="flex-row items-start gap-2">
                <Text style={{ color: Colors.success[700] }}>•</Text>
                <Text className="flex-1 text-sm" style={{ color: Colors.success[700] }}>
                  <Text className="font-semibold">Bác sĩ hủy lịch khẩn cấp:</Text> Nhận voucher giảm giá 5% cho lần khám tiếp theo
                </Text>
              </View>
              <View className="flex-row items-start gap-2">
                <Text style={{ color: Colors.success[700] }}>•</Text>
                <Text className="flex-1 text-sm" style={{ color: Colors.success[700] }}>
                  <Text className="font-semibold">Lịch tái khám:</Text> Khi bác sĩ tạo đề xuất tái khám, bạn nhận voucher giảm giá 5%
                </Text>
              </View>
              <View className="flex-row items-start gap-2">
                <Text style={{ color: Colors.success[700] }}>•</Text>
                <Text className="flex-1 text-sm" style={{ color: Colors.success[700] }}>
                  <Text className="font-semibold">Chương trình khuyến mãi:</Text> Theo dõi email và thông báo để không bỏ lỡ voucher đặc biệt
                </Text>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>

      <PolicyModal visible={showPolicyModal} onClose={() => setShowPolicyModal(false)} />
    </>
  );
}
