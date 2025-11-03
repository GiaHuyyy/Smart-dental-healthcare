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
  phone?: string;
  specialty?: string;
};

type MedicalRecordProcedure = {
  name?: string;
  description?: string;
  status?: string;
  date?: string;
};

type MedicalRecordMedication = {
  name?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
};

type MedicalRecord = {
  _id?: string;
  recordDate?: string | Date | null;
  chiefComplaint?: string;
  diagnosis?: string;
  treatmentPlan?: string;
  status?: string;
  isFollowUpRequired?: boolean;
  followUpDate?: string | Date | null;
  followUpTime?: string | null;
  notes?: string;
  procedures?: MedicalRecordProcedure[];
  medications?: MedicalRecordMedication[];
  doctorId?: PopulatedUser | string | null;
  appointmentId?: string | { _id?: string } | null;
};

type PatientRecordStats = {
  totalRecords?: number;
  completedRecords?: number;
  pendingRecords?: number;
  followUpRecords?: number;
  latestRecord?: MedicalRecord | null;
};

type StatusFilter = 'all' | 'active' | 'pending' | 'completed' | 'cancelled';

type StatusStyle = {
  label: string;
  color: string;
  background: string;
};

const STATUS_STYLES: Record<string, StatusStyle> = {
  active: { label: 'Đang điều trị', color: '#1d4ed8', background: '#dbeafe' },
  pending: { label: 'Chờ xử lý', color: '#b45309', background: '#fef3c7' },
  completed: { label: 'Hoàn thành', color: '#047857', background: '#d1fae5' },
  cancelled: { label: 'Đã hủy', color: '#6b7280', background: '#e5e7eb' },
};

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'active', label: 'Đang điều trị' },
  { id: 'pending', label: 'Chờ xử lý' },
  { id: 'completed', label: 'Hoàn thành' },
  { id: 'cancelled', label: 'Đã hủy' },
];

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function formatDate(value?: string | Date | null): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('vi-VN');
}

function formatDateTime(value?: string | Date | null, fallback = '—'): string {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return `${date.toLocaleDateString('vi-VN')} • ${date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function extractDoctorName(doctor: MedicalRecord['doctorId']): string {
  if (!doctor) return 'Bác sĩ Smart Dental';
  if (typeof doctor === 'string') return doctor;
  return doctor.fullName ?? doctor.email ?? 'Bác sĩ Smart Dental';
}

function RecordStatusPill({ status }: { status?: string }) {
  const normalized = (status ?? '').toLowerCase();
  const style = STATUS_STYLES[normalized] ?? {
    label: 'Đang cập nhật',
    color: '#0f172a',
    background: '#e2e8f0',
  };
  return (
    <View className="self-start rounded-full px-3 py-1" style={{ backgroundColor: style.background }}>
      <Text className="text-xs font-semibold" style={{ color: style.color }}>
        {style.label}
      </Text>
    </View>
  );
}

function ProceduresPreview({ procedures }: { procedures?: MedicalRecordProcedure[] }) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const items = ensureArray<MedicalRecordProcedure>(procedures).slice(0, 3);
  if (items.length === 0) return null;
  return (
    <View className="mt-4 space-y-2">
      <Text className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.text.secondary }}>
        Thủ thuật chính
      </Text>
      {items.map((item, index) => (
        <View
          key={`${item.name ?? index}-${index}`}
          className="rounded-2xl p-3"
          style={{ backgroundColor: Colors.primary[50], borderWidth: 1, borderColor: Colors.primary[100] }}
        >
          <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>
            {item.name ?? 'Thủ thuật nha khoa'}
          </Text>
          {item.description ? (
            <Text className="mt-1 text-xs" style={{ color: theme.text.secondary }}>
              {item.description}
            </Text>
          ) : null}
          {item.status ? (
            <View className="mt-2 flex-row items-center space-x-2">
              <Ionicons name="checkmark-done-outline" size={14} color={Colors.primary[600]} />
              <Text className="text-xs font-medium" style={{ color: Colors.primary[700] }}>
                {item.status}
              </Text>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function MedicationsPreview({ medications }: { medications?: MedicalRecordMedication[] }) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const meds = ensureArray<MedicalRecordMedication>(medications).slice(0, 2);
  if (meds.length === 0) return null;
  return (
    <View
      className="mt-4 rounded-2xl p-3"
      style={{ backgroundColor: Colors.success[50], borderWidth: 1, borderColor: Colors.success[100] }}
    >
      <View className="flex-row items-center space-x-2">
        <Ionicons name="medkit-outline" size={16} color={Colors.success[700]} />
        <Text className="text-xs font-semibold uppercase tracking-wide" style={{ color: Colors.success[700] }}>
          Thuốc kê đơn
        </Text>
      </View>
      <View className="mt-3 space-y-2">
        {meds.map((med, index) => (
          <View
            key={`${med.name ?? index}-${index}`}
            className="rounded-xl p-3"
            style={{ backgroundColor: theme.card }}
          >
            <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>
              {med.name ?? 'Thuốc'}
            </Text>
            <Text className="text-xs" style={{ color: theme.text.secondary }}>
              {med.dosage ? `${med.dosage}` : ''}
              {med.frequency ? ` • ${med.frequency}` : ''}
              {med.duration ? ` • ${med.duration}` : ''}
            </Text>
            {med.instructions ? (
              <Text className="mt-1 text-xs" style={{ color: theme.text.secondary }}>
                {med.instructions}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function RecordCard({ record }: { record: MedicalRecord }) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const followUpRequired = Boolean(record.isFollowUpRequired && record.followUpDate);
  return (
    <Card shadow="md" className="p-5">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <View className="flex-row items-center space-x-3">
            <View
              className="h-12 w-12 items-center justify-center rounded-2xl"
              style={{ backgroundColor: Colors.primary[100] }}
            >
              <Ionicons name="medical-outline" size={24} color={Colors.primary[600]} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold" style={{ color: theme.text.primary }}>
                Khám ngày {formatDate(record.recordDate)}
              </Text>
              <Text className="mt-1 text-xs" style={{ color: theme.text.secondary }}>
                Bác sĩ: {extractDoctorName(record.doctorId)}
              </Text>
            </View>
          </View>
        </View>
        <RecordStatusPill status={record.status} />
      </View>

      <View className="mt-5 space-y-3">
        {record.chiefComplaint ? (
          <View className="flex-row items-start space-x-3">
            <Ionicons name="alert-circle-outline" size={18} color={Colors.warning[600]} />
            <View className="flex-1">
              <Text className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.text.secondary }}>
                Triệu chứng chính
              </Text>
              <Text className="mt-1 text-sm" style={{ color: theme.text.primary }}>
                {record.chiefComplaint}
              </Text>
            </View>
          </View>
        ) : null}
        {record.diagnosis ? (
          <View className="flex-row items-start space-x-3">
            <Ionicons name="clipboard-outline" size={18} color={Colors.primary[600]} />
            <View className="flex-1">
              <Text className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.text.secondary }}>
                Chẩn đoán
              </Text>
              <Text className="mt-1 text-sm" style={{ color: theme.text.primary }}>
                {record.diagnosis}
              </Text>
            </View>
          </View>
        ) : null}
        {record.treatmentPlan ? (
          <View className="flex-row items-start space-x-3">
            <Ionicons name="checkmark-circle-outline" size={18} color={Colors.success[600]} />
            <View className="flex-1">
              <Text className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.text.secondary }}>
                Kế hoạch điều trị
              </Text>
              <Text className="mt-1 text-sm" style={{ color: theme.text.primary }}>
                {record.treatmentPlan}
              </Text>
            </View>
          </View>
        ) : null}
        {record.notes ? (
          <View className="flex-row items-start space-x-3">
            <Ionicons name="document-text-outline" size={18} color={theme.text.secondary} />
            <View className="flex-1">
              <Text className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.text.secondary }}>
                Ghi chú
              </Text>
              <Text className="mt-1 text-sm" style={{ color: theme.text.primary }}>
                {record.notes}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {followUpRequired ? (
        <View
          className="mt-5 rounded-2xl p-4"
          style={{ backgroundColor: Colors.warning[50], borderWidth: 1, borderColor: Colors.warning[100] }}
        >
          <View className="flex-row items-center space-x-2">
            <Ionicons name="time-outline" size={18} color={Colors.warning[700]} />
            <Text className="text-sm font-semibold" style={{ color: Colors.warning[700] }}>
              Cần tái khám
            </Text>
          </View>
          <Text className="mt-2 text-xs" style={{ color: Colors.warning[700] }}>
            Lịch hẹn tái khám đề xuất: {formatDate(record.followUpDate)} {record.followUpTime ? `• ${record.followUpTime}` : ''}
          </Text>
        </View>
      ) : null}

      <ProceduresPreview procedures={record.procedures} />
      <MedicationsPreview medications={record.medications} />
    </Card>
  );
}

export default function RecordsScreen() {
  const router = useRouter();
  const { session, isAuthenticated, isHydrating } = useAuth();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const patientId = session?.user?._id ?? '';
  const token = session?.token ?? '';

  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [stats, setStats] = useState<PatientRecordStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [followUpOnly, setFollowUpOnly] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  const loadRecords = useCallback(
    async ({ viaRefresh = false, signal }: { viaRefresh?: boolean; signal?: AbortSignal } = {}) => {
      if (!patientId || !token) {
        setRecords([]);
        setStats(null);
        return;
      }

      if (viaRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const [recordsResponse, statsResponse] = await Promise.all([
          apiRequest<MedicalRecord[]>(`/api/v1/medical-records/patient/records?patientId=${patientId}`, {
            token,
            abortSignal: signal,
          }),
          apiRequest<PatientRecordStats>(`/api/v1/medical-records/statistics/patient?patientId=${patientId}`, {
            token,
            abortSignal: signal,
          }),
        ]);

        setRecords(ensureArray<MedicalRecord>(recordsResponse.data));
        setStats(statsResponse.data ?? null);
        setErrorMessage(null);
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        setRecords([]);
        setStats(null);
        setErrorMessage(formatApiError(error, 'Không thể tải hồ sơ bệnh án.'));
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
      void loadRecords({ signal: controller.signal });
      return () => {
        controller.abort();
      };
    }, [patientId, token, loadRecords]),
  );

  const handleRefresh = useCallback(() => {
    if (!patientId || !token) return;
    void loadRecords({ viaRefresh: true });
  }, [patientId, token, loadRecords]);

  const filteredRecords = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return records.filter((record) => {
      const status = (record.status ?? '').toLowerCase();
      if (statusFilter !== 'all' && status !== statusFilter) {
        return false;
      }
      if (followUpOnly && !record.isFollowUpRequired) {
        return false;
      }
      if (!term) {
        return true;
      }
      const doctorName = extractDoctorName(record.doctorId).toLowerCase();
      const haystack = [record.chiefComplaint, record.diagnosis, record.treatmentPlan, doctorName].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [records, searchTerm, statusFilter, followUpOnly]);

  const quickStats = useMemo(() => {
    const total = stats?.totalRecords ?? records.length;
    const completed = stats?.completedRecords ?? records.filter((item) => (item.status ?? '').toLowerCase() === 'completed').length;
    const pending = stats?.pendingRecords ?? records.filter((item) => (item.status ?? '').toLowerCase() === 'pending').length;
    const followUps = stats?.followUpRecords ?? records.filter((item) => item.isFollowUpRequired).length;
    return [
      {
        id: 'total',
        label: 'Tổng hồ sơ',
        value: total,
        description: 'Lịch sử khám của bạn',
        background: Colors.primary[50],
        color: Colors.primary[600],
        icon: 'document-text-outline' as const,
      },
      {
        id: 'completed',
        label: 'Đã hoàn thành',
        value: completed,
        description: 'Điều trị hoàn tất',
        background: Colors.success[50],
        color: Colors.success[700],
        icon: 'checkmark-circle-outline' as const,
      },
      {
        id: 'pending',
        label: 'Đang chờ',
        value: pending,
        description: 'Đang xử lý',
        background: Colors.warning[50],
        color: Colors.warning[700],
        icon: 'pulse-outline' as const,
      },
      {
        id: 'followup',
        label: 'Cần tái khám',
        value: followUps,
        description: 'Theo dõi sát sao',
        background: Colors.error[50],
        color: Colors.error[600],
        icon: 'time-outline' as const,
      },
    ];
  }, [stats, records]);

  const latestRecord = useMemo(() => {
    if (stats?.latestRecord) {
      return stats.latestRecord;
    }
    return records[0];
  }, [stats, records]);

  if (!isHydrating && !isAuthenticated) {
    return (
      <>
        <AppHeader 
          title="Hồ sơ bệnh án" 
          showNotification 
          showAvatar 
          notificationCount={0}
          rightComponent={<PolicyButton onPress={() => setShowPolicyModal(true)} />}
        />
        <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: theme.background }}>
          <Card shadow="md" className="w-full max-w-md p-6 items-center">
            <Ionicons name="calendar-outline" size={36} color={Colors.primary[600]} />
            <Text className="mt-4 text-xl font-semibold" style={{ color: theme.text.primary }}>
              Đăng nhập để xem hồ sơ
            </Text>
            <Text className="mt-2 text-sm text-center" style={{ color: theme.text.secondary }}>
              Vui lòng đăng nhập để truy cập toàn bộ lịch sử khám và hồ sơ điều trị của bạn.
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
        title="Hồ sơ bệnh án" 
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
          {/* Header Card */}
          <Card shadow="md" className="p-6">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <View
                  className="h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: Colors.primary[600] }}
                >
                  <Ionicons name="clipboard-outline" size={28} color="#ffffff" />
                </View>
                <Text className="mt-5 text-2xl font-semibold" style={{ color: theme.text.primary }}>
                  Hồ sơ bệnh án
                </Text>
                <Text className="mt-2 text-sm" style={{ color: theme.text.secondary }}>
                  Theo dõi toàn bộ lịch sử khám, điều trị và kế hoạch tái khám của bạn tại Smart Dental.
                </Text>
              </View>
              <View className="w-28 space-y-3">
                <View className="rounded-2xl px-3 py-2" style={{ backgroundColor: Colors.primary[50] }}>
                  <Text className="text-[11px] font-semibold" style={{ color: Colors.primary[600] }}>
                    Hồ sơ
                  </Text>
                  <Text className="text-lg font-bold" style={{ color: Colors.primary[700] }}>
                    {records.length}
                  </Text>
                </View>
                <View className="rounded-2xl px-3 py-2" style={{ backgroundColor: Colors.success[50] }}>
                  <Text className="text-[11px] font-semibold" style={{ color: Colors.success[600] }}>
                    Tái khám
                  </Text>
                  <Text className="text-lg font-bold" style={{ color: Colors.success[700] }}>
                    {records.filter((item) => item.isFollowUpRequired).length}
                  </Text>
                </View>
              </View>
            </View>

            {latestRecord ? (
              <View
                className="mt-6 rounded-2xl p-4"
                style={{ backgroundColor: Colors.primary[50], borderWidth: 1, borderColor: Colors.primary[100] }}
              >
                <View className="flex-row items-center space-x-2">
                  <Ionicons name="medical-outline" size={18} color={Colors.primary[600]} />
                  <Text className="text-sm font-semibold" style={{ color: Colors.primary[700] }}>
                    Lần khám gần nhất
                  </Text>
                </View>
                <Text className="mt-2 text-sm" style={{ color: theme.text.primary }}>
                  {formatDateTime(latestRecord.recordDate)} • {extractDoctorName(latestRecord.doctorId)}
                </Text>
              </View>
            ) : null}
          </Card>

          {/* Quick Stats */}
          <View className="flex-row flex-wrap gap-4">
            {quickStats.map(({ id, label, value, description, background, color, icon }) => (
              <View key={id} className="w-full flex-1" style={{ minWidth: '48%' }}>
                <Card shadow="md" className="h-full p-4">
                  <View className="flex-row items-center space-x-3">
                    <View
                      className="h-12 w-12 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: background }}
                    >
                      <Ionicons name={icon} size={22} color={color} />
                    </View>
                    <View>
                      <Text className="text-xs font-semibold" style={{ color: theme.text.secondary }}>
                        {label}
                      </Text>
                      <Text className="text-xl font-bold" style={{ color: theme.text.primary }}>
                        {value}
                      </Text>
                    </View>
                  </View>
                  <Text className="mt-3 text-xs" style={{ color: theme.text.secondary }}>
                    {description}
                  </Text>
                </Card>
              </View>
            ))}
          </View>

          {/* Filter Card */}
          <Card shadow="md" className="p-6">
            <Text className="text-lg font-semibold" style={{ color: theme.text.primary }}>
              Bộ lọc hồ sơ
            </Text>
            <View className="mt-4 space-y-4">
              <View
                className="rounded-2xl p-3"
                style={{ backgroundColor: Colors.primary[50], borderWidth: 1, borderColor: Colors.primary[100] }}
              >
                <TextInput
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  placeholder="Tìm theo triệu chứng, chẩn đoán hoặc tên bác sĩ..."
                  placeholderTextColor={theme.text.secondary}
                  className="text-sm"
                  style={{ color: theme.text.primary }}
                />
              </View>

              <View className="flex-row flex-wrap gap-3">
                {STATUS_FILTERS.map((option) => {
                  const isActive = statusFilter === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() => setStatusFilter(option.id)}
                      className="rounded-2xl px-4 py-2"
                      style={{
                        borderWidth: 1,
                        borderColor: isActive ? Colors.primary[600] : Colors.primary[100],
                        backgroundColor: isActive ? Colors.primary[600] : theme.card,
                      }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: isActive ? '#ffffff' : Colors.primary[700] }}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                onPress={() => setFollowUpOnly((prev) => !prev)}
                className="flex-row items-center justify-between rounded-2xl px-4 py-3"
                style={{
                  borderWidth: 1,
                  borderColor: followUpOnly ? Colors.success[600] : theme.border,
                  backgroundColor: followUpOnly ? Colors.success[50] : theme.card,
                }}
              >
                <View className="flex-row items-center space-x-3">
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={followUpOnly ? Colors.success[700] : theme.text.secondary}
                  />
                  <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>
                    Chỉ hiển thị hồ sơ cần tái khám
                  </Text>
                </View>
                <View
                  className="h-5 w-5 items-center justify-center rounded-full"
                  style={{ backgroundColor: followUpOnly ? Colors.success[600] : theme.border }}
                >
                  <Text className="text-[10px] font-bold text-white">{followUpOnly ? '✓' : ''}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </Card>

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
          {loading && records.length === 0 ? (
            <Card shadow="md" className="items-center justify-center p-8">
              <ActivityIndicator color={Colors.primary[600]} />
              <Text className="mt-3 text-sm" style={{ color: theme.text.secondary }}>
                Đang tải hồ sơ bệnh án...
              </Text>
            </Card>
          ) : filteredRecords.length === 0 ? (
            <Card shadow="md" className="items-center justify-center p-8">
              <View
                className="rounded-full p-4"
                style={{ backgroundColor: Colors.primary[50] }}
              >
                <Ionicons name="layers-outline" size={28} color={Colors.primary[600]} />
              </View>
              <Text className="mt-3 text-sm font-semibold" style={{ color: Colors.primary[700] }}>
                Chưa có hồ sơ phù hợp
              </Text>
              <Text className="mt-1 text-xs text-center" style={{ color: theme.text.secondary }}>
                Thử thay đổi bộ lọc hoặc đặt lịch khám mới để tạo thêm hồ sơ.
              </Text>
            </Card>
          ) : (
            <View className="space-y-5">
              {filteredRecords.map((record) => (
                <RecordCard key={record._id ?? `${record.recordDate}-${extractDoctorName(record.doctorId)}`} record={record} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <PolicyModal visible={showPolicyModal} onClose={() => setShowPolicyModal(false)} />
    </>
  );
}
