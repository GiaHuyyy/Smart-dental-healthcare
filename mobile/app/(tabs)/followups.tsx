import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    AlarmClock,
    AlertTriangle,
    CalendarClock,
    CalendarRange,
    ClipboardCheck,
    Home,
    RefreshCw,
    Stethoscope,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { apiRequest, formatApiError } from '@/utils/api';

type FollowUpWindow = 'oneMonth' | 'threeMonths' | 'sixMonths';

type FollowUpDoctor = {
  _id?: string;
  fullName?: string;
  specialty?: string | null;
};

type FollowUpItem = {
  doctor: FollowUpDoctor;
  lastAppointmentDate?: string | Date | null;
  followUps?: Partial<Record<FollowUpWindow, string | Date | null>>;
};

type StatusBadge = {
  label: string;
  color: string;
  background: string;
};

const WINDOW_CONFIG: { key: FollowUpWindow; label: string; accent: string }[] = [
  { key: 'oneMonth', label: '1 tháng', accent: '#1d4ed8' },
  { key: 'threeMonths', label: '3 tháng', accent: '#2563eb' },
  { key: 'sixMonths', label: '6 tháng', accent: '#1e40af' },
];

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

function statusFor(dateValue?: string | Date | null): StatusBadge {
  const date = parseDate(dateValue);
  if (!date) {
    return { label: 'Chưa lên lịch', color: '#64748b', background: '#e2e8f0' };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) {
    return { label: 'Quá hạn', color: '#b91c1c', background: '#fee2e2' };
  }
  if (diffDays <= 7) {
    return { label: 'Sắp đến', color: '#b45309', background: '#fef3c7' };
  }
  if (diffDays <= 30) {
    return { label: 'Trong tháng', color: '#1d4ed8', background: '#dbeafe' };
  }
  return { label: 'Đã sắp xếp', color: '#047857', background: '#dcfce7' };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function FollowUpBadge({ badge }: { badge: StatusBadge }) {
  return (
    <View className="self-start rounded-full px-3 py-1" style={{ backgroundColor: badge.background }}>
      <Text className="text-xs font-semibold" style={{ color: badge.color }}>
        {badge.label}
      </Text>
    </View>
  );
}

function FollowUpCard({ item, onBook }: { item: FollowUpItem; onBook: (doctor: FollowUpDoctor) => void }) {
  return (
    <View className="rounded-3xl border border-white/70 bg-white/95 p-5 shadow-lg shadow-blue-100">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-base font-semibold text-slate-900">{item.doctor.fullName ?? 'Bác sĩ Smart Dental'}</Text>
          <Text className="mt-1 text-xs text-slate-500">Chuyên khoa: {item.doctor.specialty ?? 'Đang cập nhật'}</Text>
          <Text className="mt-1 text-xs text-slate-400">
            Lần khám gần nhất: {formatDate(item.lastAppointmentDate)}
          </Text>
        </View>
        <View className="items-end">
          <FollowUpBadge badge={statusFor(item.followUps?.oneMonth)} />
        </View>
      </View>

      <View className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
        <View className="flex-row items-center space-x-2">
          <CalendarClock color="#1d4ed8" size={18} />
          <Text className="text-sm font-semibold text-blue-700">Lịch tái khám đề xuất</Text>
        </View>
        <View className="mt-3 space-y-3">
          {WINDOW_CONFIG.map(({ key, label, accent }) => {
            const date = item.followUps?.[key] ?? null;
            const badge = statusFor(date);
            return (
              <View key={key} className="rounded-2xl bg-white/80 p-3">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</Text>
                    <Text className="mt-1 text-sm font-semibold text-slate-900">{formatDate(date)}</Text>
                  </View>
                  <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: `${accent}1A` }}>
                    <CalendarRange color={accent} size={20} />
                  </View>
                </View>
                <View className="mt-2">
                  <FollowUpBadge badge={badge} />
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View className="mt-5 flex-row space-x-3">
        <TouchableOpacity
          className="flex-1 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 py-3"
          onPress={() => onBook(item.doctor)}
        >
          <View className="flex-row items-center space-x-2">
            <Stethoscope color="#1d4ed8" size={18} />
            <Text className="text-sm font-semibold text-blue-700">Đặt lịch tái khám</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          className="items-center justify-center rounded-2xl border border-slate-200 bg-white px-5"
          onPress={() =>
            Alert.alert(
              'Ghi chú tái khám',
              'Bạn có thể ghi chú lại để chuẩn bị trước cho buổi tái khám. Chức năng ghi chú chuyên sâu sẽ sớm có mặt.',
            )
          }
        >
          <ClipboardCheck color="#1d4ed8" size={18} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function FollowupsScreen() {
  const router = useRouter();
  const { session, isAuthenticated, isHydrating } = useAuth();

  const patientId = session?.user?._id ?? '';
  const token = session?.token ?? '';

  const [items, setItems] = useState<FollowUpItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadFollowUps = useCallback(
    async ({ viaRefresh = false, signal }: { viaRefresh?: boolean; signal?: AbortSignal } = {}) => {
      if (!patientId || !token) {
        setItems([]);
        return;
      }

      if (viaRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await apiRequest<FollowUpItem[]>(`/api/v1/appointments/followup/patient/${patientId}`, {
          token,
          abortSignal: signal,
        });
        setItems(ensureArray<FollowUpItem>(response.data));
        setErrorMessage(null);
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        setItems([]);
        setErrorMessage(formatApiError(error, 'Không thể tải lộ trình tái khám.'));
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
      void loadFollowUps({ signal: controller.signal });
      return () => controller.abort();
    }, [patientId, token, loadFollowUps]),
  );

  const handleRefresh = useCallback(() => {
    if (!patientId || !token) return;
    void loadFollowUps({ viaRefresh: true });
  }, [patientId, token, loadFollowUps]);

  const summary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const flatDates = ensureArray<FollowUpItem>(items)
      .flatMap((item) => WINDOW_CONFIG.map((cfg) => parseDate(item.followUps?.[cfg.key])))
      .filter((date): date is Date => Boolean(date));

    const upcoming = flatDates.filter((date) => date.getTime() >= today.getTime());
    const overdue = flatDates.filter((date) => date.getTime() < today.getTime());

    const nextDate = upcoming.sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

    return {
      totalDoctors: items.length,
      nextDate,
      overdueCount: overdue.length,
      upcomingCount: upcoming.length,
    };
  }, [items]);

  const navigateToAppointments = useCallback(
    (doctor: FollowUpDoctor) => {
      Alert.alert(
        'Chuyển tới đặt lịch',
        `Bạn sẽ được chuyển tới màn hình đặt lịch. Hãy chọn lại bác sĩ ${doctor.fullName ?? ''} và thời gian phù hợp.`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Tiếp tục',
            style: 'default',
            onPress: () => router.push('/(tabs)/appointments' as const),
          },
        ],
      );
    },
    [router],
  );

  if (!isHydrating && !isAuthenticated) {
    return (
      <LinearGradient colors={['#eef2ff', '#e0f2fe', '#fff']} className="flex-1">
        <SafeAreaView className="flex-1 items-center justify-center px-6">
          <View className="w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-6 text-center shadow-lg shadow-blue-100">
            <AlarmClock color="#1d4ed8" size={36} className="self-center" />
            <Text className="mt-4 text-xl font-semibold text-slate-900">Đăng nhập để xem lộ trình tái khám</Text>
            <Text className="mt-2 text-sm text-slate-500">
              Bạn cần đăng nhập để xem các đề xuất tái khám theo từng bác sĩ và nhận nhắc nhở tự động.
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
                    <CalendarClock color="#ffffff" size={28} />
                  </View>
                  <Text className="mt-5 text-2xl font-semibold text-slate-900">Lộ trình tái khám</Text>
                  <Text className="mt-2 text-sm text-slate-600">
                    Theo dõi lịch tái khám được đề xuất dựa trên các buổi khám đã hoàn thành cùng bác sĩ.
                  </Text>
                </View>
                <View className="w-28 space-y-3">
                  <View className="rounded-2xl bg-blue-50 px-3 py-2">
                    <Text className="text-[11px] font-semibold text-blue-600">Bác sĩ</Text>
                    <Text className="text-lg font-bold text-blue-700">{summary.totalDoctors}</Text>
                  </View>
                  <View className="rounded-2xl bg-amber-50 px-3 py-2">
                    <Text className="text-[11px] font-semibold text-amber-600">Quá hạn</Text>
                    <Text className="text-lg font-bold text-amber-700">{summary.overdueCount}</Text>
                  </View>
                </View>
              </View>

              <View className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
                <View className="flex-row items-center space-x-2">
                  <Home color="#1d4ed8" size={18} />
                  <Text className="text-sm font-semibold text-blue-700">Lịch tái khám sắp tới</Text>
                </View>
                <Text className="mt-2 text-xs text-slate-600">
                  {summary.nextDate
                    ? `Lịch đề xuất gần nhất: ${formatDate(summary.nextDate)}`
                    : 'Chưa có lịch tái khám nào được đề xuất trong thời gian tới.'}
                </Text>
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

            {loading && items.length === 0 ? (
              <View className="items-center justify-center rounded-3xl border border-white/70 bg-white/95 p-8">
                <ActivityIndicator color="#1d4ed8" />
                <Text className="mt-3 text-sm text-slate-500">Đang tải lộ trình tái khám...</Text>
              </View>
            ) : items.length === 0 ? (
              <View className="items-center justify-center rounded-3xl border border-dashed border-blue-200 bg-blue-50/70 p-8 text-center">
                <CalendarClock color="#1d4ed8" size={28} />
                <Text className="mt-3 text-sm font-semibold text-blue-700">Chưa có đề xuất tái khám</Text>
                <Text className="mt-1 text-xs text-blue-500">
                  Khi bạn hoàn thành buổi khám, hệ thống sẽ tự động đề xuất lịch tái khám phù hợp.
                </Text>
              </View>
            ) : (
              <View className="space-y-5">
                {items.map((item) => (
                  <FollowUpCard key={item.doctor._id ?? item.doctor.fullName ?? Math.random().toString(36)} item={item} onBook={navigateToAppointments} />
                ))}
              </View>
            )}

            <TouchableOpacity
              className="flex-row items-center justify-center rounded-3xl border border-blue-200 bg-white py-3"
              onPress={handleRefresh}
            >
              <RefreshCw color="#1d4ed8" size={18} />
              <Text className="ml-2 text-sm font-semibold text-blue-700">Làm mới đề xuất</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
