import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    Activity,
    AlertTriangle,
    Calendar,
    CheckCircle2,
    ClipboardList,
    FileText,
    Layers,
    ListChecks,
    Pill,
    Stethoscope,
    TimerReset,
} from 'lucide-react-native';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
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
  const items = ensureArray<MedicalRecordProcedure>(procedures).slice(0, 3);
  if (items.length === 0) return null;
  return (
    <View className="mt-4 space-y-2">
      <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Thủ thuật chính</Text>
      {items.map((item, index) => (
        <View key={`${item.name ?? index}-${index}`} className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3">
          <Text className="text-sm font-semibold text-slate-800">{item.name ?? 'Thủ thuật nha khoa'}</Text>
          {item.description ? <Text className="mt-1 text-xs text-slate-500">{item.description}</Text> : null}
          {item.status ? (
            <View className="mt-2 flex-row items-center space-x-2">
              <ListChecks color="#1d4ed8" size={14} />
              <Text className="text-xs font-medium text-blue-700">{item.status}</Text>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function MedicationsPreview({ medications }: { medications?: MedicalRecordMedication[] }) {
  const meds = ensureArray<MedicalRecordMedication>(medications).slice(0, 2);
  if (meds.length === 0) return null;
  return (
    <View className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-3">
      <View className="flex-row items-center space-x-2">
        <Pill color="#047857" size={16} />
        <Text className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Thuốc kê đơn</Text>
      </View>
      <View className="mt-3 space-y-2">
        {meds.map((med, index) => (
          <View key={`${med.name ?? index}-${index}`} className="rounded-xl bg-white/80 p-3">
            <Text className="text-sm font-semibold text-slate-800">{med.name ?? 'Thuốc'}</Text>
            <Text className="text-xs text-slate-500">
              {med.dosage ? `${med.dosage}` : ''}
              {med.frequency ? ` • ${med.frequency}` : ''}
              {med.duration ? ` • ${med.duration}` : ''}
            </Text>
            {med.instructions ? <Text className="mt-1 text-xs text-slate-500">{med.instructions}</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function RecordCard({ record }: { record: MedicalRecord }) {
  const followUpRequired = Boolean(record.isFollowUpRequired && record.followUpDate);
  return (
    <View className="rounded-3xl border border-white/70 bg-white/95 p-5 shadow-lg shadow-blue-100">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <View className="flex-row items-center space-x-3">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-blue-100">
              <Stethoscope color="#1d4ed8" size={24} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-slate-900">
                Khám ngày {formatDate(record.recordDate)}
              </Text>
              <Text className="mt-1 text-xs text-slate-500">Bác sĩ: {extractDoctorName(record.doctorId)}</Text>
            </View>
          </View>
        </View>
        <RecordStatusPill status={record.status} />
      </View>

      <View className="mt-5 space-y-3">
        {record.chiefComplaint ? (
          <View className="flex-row items-start space-x-3">
            <AlertTriangle color="#b45309" size={18} />
            <View className="flex-1">
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Triệu chứng chính</Text>
              <Text className="mt-1 text-sm text-slate-700">{record.chiefComplaint}</Text>
            </View>
          </View>
        ) : null}
        {record.diagnosis ? (
          <View className="flex-row items-start space-x-3">
            <ClipboardList color="#1d4ed8" size={18} />
            <View className="flex-1">
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chẩn đoán</Text>
              <Text className="mt-1 text-sm text-slate-700">{record.diagnosis}</Text>
            </View>
          </View>
        ) : null}
        {record.treatmentPlan ? (
          <View className="flex-row items-start space-x-3">
            <CheckCircle2 color="#047857" size={18} />
            <View className="flex-1">
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kế hoạch điều trị</Text>
              <Text className="mt-1 text-sm text-slate-700">{record.treatmentPlan}</Text>
            </View>
          </View>
        ) : null}
        {record.notes ? (
          <View className="flex-row items-start space-x-3">
            <FileText color="#0f172a" size={18} />
            <View className="flex-1">
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ghi chú</Text>
              <Text className="mt-1 text-sm text-slate-700">{record.notes}</Text>
            </View>
          </View>
        ) : null}
      </View>

      {followUpRequired ? (
        <View className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/90 p-4">
          <View className="flex-row items-center space-x-2">
            <TimerReset color="#b45309" size={18} />
            <Text className="text-sm font-semibold text-amber-800">Cần tái khám</Text>
          </View>
          <Text className="mt-2 text-xs text-amber-700">
            Lịch hẹn tái khám đề xuất: {formatDate(record.followUpDate)} {record.followUpTime ? `• ${record.followUpTime}` : ''}
          </Text>
        </View>
      ) : null}

      <ProceduresPreview procedures={record.procedures} />
      <MedicationsPreview medications={record.medications} />
    </View>
  );
}

export default function RecordsScreen() {
  const router = useRouter();
  const { session, isAuthenticated, isHydrating } = useAuth();
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
        background: '#dbeafe',
        color: '#1d4ed8',
        Icon: FileText,
      },
      {
        id: 'completed',
        label: 'Đã hoàn thành',
        value: completed,
        description: 'Điều trị hoàn tất',
        background: '#dcfce7',
        color: '#047857',
        Icon: CheckCircle2,
      },
      {
        id: 'pending',
        label: 'Đang chờ',
        value: pending,
        description: 'Đang xử lý',
        background: '#fef3c7',
        color: '#b45309',
        Icon: Activity,
      },
      {
        id: 'followup',
        label: 'Cần tái khám',
        value: followUps,
        description: 'Theo dõi sát sao',
        background: '#fee2e2',
        color: '#be123c',
        Icon: TimerReset,
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
      <LinearGradient colors={['#eef2ff', '#e0f2fe', '#fff']} className="flex-1">
        <SafeAreaView className="flex-1 items-center justify-center px-6">
          <View className="w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-6 text-center shadow-lg shadow-blue-100">
            <Calendar color="#1d4ed8" size={36} className="self-center" />
            <Text className="mt-4 text-xl font-semibold text-slate-900">Đăng nhập để xem hồ sơ</Text>
            <Text className="mt-2 text-sm text-slate-500">
              Vui lòng đăng nhập để truy cập toàn bộ lịch sử khám và hồ sơ điều trị của bạn.
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
                    <ClipboardList color="#ffffff" size={28} />
                  </View>
                  <Text className="mt-5 text-2xl font-semibold text-slate-900">Hồ sơ bệnh án</Text>
                  <Text className="mt-2 text-sm text-slate-600">
                    Theo dõi toàn bộ lịch sử khám, điều trị và kế hoạch tái khám của bạn tại Smart Dental.
                  </Text>
                </View>
                <View className="w-28 space-y-3">
                  <View className="rounded-2xl bg-blue-50 px-3 py-2">
                    <Text className="text-[11px] font-semibold text-blue-600">Hồ sơ</Text>
                    <Text className="text-lg font-bold text-blue-700">{records.length}</Text>
                  </View>
                  <View className="rounded-2xl bg-emerald-50 px-3 py-2">
                    <Text className="text-[11px] font-semibold text-emerald-600">Tái khám</Text>
                    <Text className="text-lg font-bold text-emerald-700">
                      {records.filter((item) => item.isFollowUpRequired).length}
                    </Text>
                  </View>
                </View>
              </View>

              {latestRecord ? (
                <View className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
                  <View className="flex-row items-center space-x-2">
                    <Stethoscope color="#1d4ed8" size={18} />
                    <Text className="text-sm font-semibold text-blue-700">Lần khám gần nhất</Text>
                  </View>
                  <Text className="mt-2 text-sm text-slate-700">
                    {formatDateTime(latestRecord.recordDate)} • {extractDoctorName(latestRecord.doctorId)}
                  </Text>
                </View>
              ) : null}
            </View>

            <View className="flex-row flex-wrap gap-4">
              {quickStats.map(({ id, label, value, description, background, color, Icon }) => (
                <View key={id} className="w-full flex-1" style={{ minWidth: '48%' }}>
                  <View className="h-full rounded-3xl border border-white/70 bg-white/95 p-4 shadow-md shadow-blue-100">
                    <View className="flex-row items-center space-x-3">
                      <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: background }}>
                        <Icon color={color} size={22} />
                      </View>
                      <View>
                        <Text className="text-xs font-semibold text-slate-500">{label}</Text>
                        <Text className="text-xl font-bold text-slate-900">{value}</Text>
                      </View>
                    </View>
                    <Text className="mt-3 text-xs text-slate-500">{description}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View className="rounded-3xl border border-white/70 bg-white/95 p-6 shadow-lg shadow-blue-100">
              <Text className="text-lg font-semibold text-slate-900">Bộ lọc hồ sơ</Text>
              <View className="mt-4 space-y-4">
                <View className="rounded-2xl border border-blue-100 bg-blue-50/80 p-3">
                  <TextInput
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    placeholder="Tìm theo triệu chứng, chẩn đoán hoặc tên bác sĩ..."
                    placeholderTextColor="#94a3b8"
                    className="text-sm text-slate-900"
                  />
                </View>

                <View className="flex-row flex-wrap gap-3">
                  {STATUS_FILTERS.map((option) => {
                    const isActive = statusFilter === option.id;
                    return (
                      <TouchableOpacity
                        key={option.id}
                        onPress={() => setStatusFilter(option.id)}
                        className={`rounded-2xl border px-4 py-2 ${
                          isActive ? 'border-blue-600 bg-blue-600' : 'border-blue-100 bg-white'
                        }`}
                      >
                        <Text className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-blue-700'}`}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  onPress={() => setFollowUpOnly((prev) => !prev)}
                  className={`flex-row items-center justify-between rounded-2xl border px-4 py-3 ${
                    followUpOnly ? 'border-emerald-500 bg-emerald-100/80' : 'border-slate-200 bg-white'
                  }`}
                >
                  <View className="flex-row items-center space-x-3">
                    <TimerReset color={followUpOnly ? '#047857' : '#94a3b8'} size={18} />
                    <Text className="text-sm font-semibold text-slate-800">Chỉ hiển thị hồ sơ cần tái khám</Text>
                  </View>
                  <View
                    className={`h-5 w-5 items-center justify-center rounded-full ${
                      followUpOnly ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  >
                    <Text className="text-[10px] font-bold text-white">{followUpOnly ? '✓' : ''}</Text>
                  </View>
                </TouchableOpacity>
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

            {loading && records.length === 0 ? (
              <View className="items-center justify-center rounded-3xl border border-white/70 bg-white/95 p-8">
                <ActivityIndicator color="#1d4ed8" />
                <Text className="mt-3 text-sm text-slate-500">Đang tải hồ sơ bệnh án...</Text>
              </View>
            ) : filteredRecords.length === 0 ? (
              <View className="items-center justify-center rounded-3xl border border-dashed border-blue-200 bg-blue-50/70 p-8 text-center">
                <Layers color="#1d4ed8" size={28} />
                <Text className="mt-3 text-sm font-semibold text-blue-700">Chưa có hồ sơ phù hợp</Text>
                <Text className="mt-1 text-xs text-blue-500">
                  Thử thay đổi bộ lọc hoặc đặt lịch khám mới để tạo thêm hồ sơ.
                </Text>
              </View>
            ) : (
              <View className="space-y-5">
                {filteredRecords.map((record) => (
                  <RecordCard key={record._id ?? `${record.recordDate}-${extractDoctorName(record.doctorId)}`} record={record} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
