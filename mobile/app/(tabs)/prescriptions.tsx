import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    AlertTriangle,
    CheckCircle2,
    ClipboardList,
    Info,
    Pill,
    PillBottle,
    Printer,
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

type PopulatedDoctor = {
  _id?: string;
  fullName?: string;
  specialty?: string;
  email?: string;
};

type PopulatedRecord = {
  _id?: string;
  chiefComplaint?: string;
};

type PrescriptionMedication = {
  name?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  quantity?: number;
  unit?: string;
};

type Prescription = {
  _id?: string;
  diagnosis?: string;
  instructions?: string;
  notes?: string;
  prescriptionDate?: string | Date | null;
  doctorId?: PopulatedDoctor | string | null;
  medicalRecordId?: PopulatedRecord | string | null;
  medications?: PrescriptionMedication[];
  status?: string;
  isDispensed?: boolean;
  dispensedDate?: string | Date | null;
  isFollowUpRequired?: boolean;
  followUpDate?: string | Date | null;
};

type FilterOption = 'all' | 'pending' | 'dispensed' | 'followup';

const FILTER_OPTIONS: { id: FilterOption; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'pending', label: 'Chờ phát thuốc' },
  { id: 'dispensed', label: 'Đã phát' },
  { id: 'followup', label: 'Cần tái khám' },
];

const STATUS_BADGES: Record<string, { label: string; color: string; background: string }> = {
  active: { label: 'Hiệu lực', color: '#1d4ed8', background: '#dbeafe' },
  pending: { label: 'Chờ xử lý', color: '#b45309', background: '#fef3c7' },
  completed: { label: 'Hoàn tất', color: '#047857', background: '#d1fae5' },
  expired: { label: 'Hết hạn', color: '#6b7280', background: '#e5e7eb' },
};

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

function extractDoctorName(doctor: Prescription['doctorId']): string {
  if (!doctor) return 'Bác sĩ Smart Dental';
  if (typeof doctor === 'string') return doctor;
  return doctor.fullName ?? doctor.email ?? 'Bác sĩ Smart Dental';
}

function extractRecordSummary(record: Prescription['medicalRecordId']): string {
  if (!record) return 'Hồ sơ nha khoa';
  if (typeof record === 'string') return record;
  return record.chiefComplaint ?? 'Hồ sơ nha khoa';
}

function PrescriptionBadge({ text, color, background }: { text: string; color: string; background: string }) {
  return (
    <View className="self-start rounded-full px-3 py-1" style={{ backgroundColor: background }}>
      <Text className="text-xs font-semibold" style={{ color }}>
        {text}
      </Text>
    </View>
  );
}

function MedicationsList({ medications }: { medications?: PrescriptionMedication[] }) {
  const meds = ensureArray<PrescriptionMedication>(medications);
  if (meds.length === 0) return null;
  return (
    <View className="mt-4 space-y-3">
      {meds.map((med, index) => (
        <View key={`${med.name ?? index}-${index}`} className="rounded-2xl border border-blue-100 bg-blue-50/80 p-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-sm font-semibold text-slate-900">{med.name ?? 'Thuốc'}</Text>
              <Text className="mt-1 text-xs text-slate-500">
                {[med.dosage, med.frequency, med.duration].filter(Boolean).join(' • ') || 'Liều dùng theo chỉ định'}
              </Text>
            </View>
            <View className="items-center justify-center rounded-2xl bg-white/80 px-3 py-2">
              <Pill color="#1d4ed8" size={18} />
            </View>
          </View>
          {med.instructions ? <Text className="mt-2 text-xs text-slate-600">{med.instructions}</Text> : null}
          {typeof med.quantity === 'number' && med.unit ? (
            <Text className="mt-2 text-xs font-semibold text-blue-700">
              Số lượng: {med.quantity} {med.unit}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function PrescriptionCard({ prescription }: { prescription: Prescription }) {
  const statusKey = (prescription.status ?? '').toLowerCase();
  const badge = STATUS_BADGES[statusKey] ?? { label: 'Đang xử lý', color: '#0f172a', background: '#e2e8f0' };
  const dispensed = Boolean(prescription.isDispensed);

  return (
    <View className="rounded-3xl border border-white/70 bg-white/95 p-5 shadow-lg shadow-blue-100">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-base font-semibold text-slate-900">Đơn thuốc ngày {formatDate(prescription.prescriptionDate)}</Text>
          <Text className="mt-1 text-xs text-slate-500">Bác sĩ: {extractDoctorName(prescription.doctorId)}</Text>
          <Text className="mt-1 text-xs text-slate-400">Liên kết hồ sơ: {extractRecordSummary(prescription.medicalRecordId)}</Text>
        </View>
        <View className="items-end space-y-2">
          <PrescriptionBadge text={badge.label} color={badge.color} background={badge.background} />
          {dispensed ? (
            <PrescriptionBadge text="Đã phát thuốc" color="#047857" background="#d1fae5" />
          ) : (
            <PrescriptionBadge text="Chưa phát thuốc" color="#b45309" background="#fef3c7" />
          )}
        </View>
      </View>

      {prescription.diagnosis ? (
        <View className="mt-4 flex-row items-start space-x-3">
          <ClipboardList color="#1d4ed8" size={18} />
          <View className="flex-1">
            <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chẩn đoán</Text>
            <Text className="mt-1 text-sm text-slate-700">{prescription.diagnosis}</Text>
          </View>
        </View>
      ) : null}

      <MedicationsList medications={prescription.medications} />

      {prescription.instructions ? (
        <View className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/80 p-4">
          <Text className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Hướng dẫn</Text>
          <Text className="mt-2 text-sm text-slate-700">{prescription.instructions}</Text>
        </View>
      ) : null}

      {prescription.notes ? (
        <View className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
          <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ghi chú</Text>
          <Text className="mt-2 text-xs text-slate-600">{prescription.notes}</Text>
        </View>
      ) : null}

      {prescription.isFollowUpRequired && prescription.followUpDate ? (
        <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/90 p-3">
          <Text className="text-xs font-semibold uppercase tracking-wide text-amber-600">Tái khám</Text>
          <Text className="mt-2 text-xs text-amber-700">Đề xuất tái khám vào {formatDate(prescription.followUpDate)}</Text>
        </View>
      ) : null}

      <View className="mt-5 flex-row space-x-3">
        <TouchableOpacity
          className="flex-1 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 py-3"
          onPress={() =>
            Alert.alert(
              'Tải đơn thuốc',
              'Chức năng tải đơn thuốc sẽ sớm có mặt. Trong lúc này, hãy liên hệ phòng khám để nhận bản sao.',
            )
          }
        >
          <View className="flex-row items-center space-x-2">
            <Printer color="#1d4ed8" size={18} />
            <Text className="text-sm font-semibold text-blue-700">Tải đơn thuốc</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 items-center justify-center rounded-2xl bg-blue-600 py-3"
          onPress={() =>
            Alert.alert(
              'Yêu cầu cấp lại thuốc',
              'Đội ngũ chăm sóc sẽ liên hệ với bạn sớm để hỗ trợ cấp lại thuốc.',
            )
          }
        >
          <View className="flex-row items-center space-x-2">
            <RefreshCw color="#ffffff" size={18} />
            <Text className="text-sm font-semibold text-white">Yêu cầu cấp lại</Text>
          </View>
        </TouchableOpacity>
      </View>

      {dispensed && prescription.dispensedDate ? (
        <Text className="mt-3 text-xs text-slate-400">Đã phát thuốc ngày {formatDate(prescription.dispensedDate)}</Text>
      ) : null}
    </View>
  );
}

export default function PrescriptionsScreen() {
  const router = useRouter();
  const { session, isAuthenticated, isHydrating } = useAuth();

  const patientId = session?.user?._id ?? '';
  const token = session?.token ?? '';

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');

  const loadPrescriptions = useCallback(
    async ({ viaRefresh = false, signal }: { viaRefresh?: boolean; signal?: AbortSignal } = {}) => {
      if (!patientId || !token) {
        setPrescriptions([]);
        return;
      }

      if (viaRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await apiRequest<Prescription[]>(
          `/api/v1/prescriptions/patient-prescriptions?patientId=${patientId}&limit=50`,
          { token, abortSignal: signal },
        );
        setPrescriptions(ensureArray<Prescription>(response.data));
        setErrorMessage(null);
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        setPrescriptions([]);
        setErrorMessage(formatApiError(error, 'Không thể tải đơn thuốc.'));
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
      void loadPrescriptions({ signal: controller.signal });
      return () => controller.abort();
    }, [patientId, token, loadPrescriptions]),
  );

  const handleRefresh = useCallback(() => {
    if (!patientId || !token) return;
    void loadPrescriptions({ viaRefresh: true });
  }, [patientId, token, loadPrescriptions]);

  const stats = useMemo(() => {
    const total = prescriptions.length;
    const dispensed = prescriptions.filter((item) => item.isDispensed).length;
    const pending = total - dispensed;
    const followUps = prescriptions.filter((item) => item.isFollowUpRequired).length;
    return {
      total,
      dispensed,
      pending,
      followUps,
    };
  }, [prescriptions]);

  const filteredPrescriptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return prescriptions.filter((item) => {
      if (activeFilter === 'pending' && item.isDispensed) {
        return false;
      }
      if (activeFilter === 'dispensed' && !item.isDispensed) {
        return false;
      }
      if (activeFilter === 'followup' && !item.isFollowUpRequired) {
        return false;
      }
      if (!term) {
        return true;
      }
      const doctor = extractDoctorName(item.doctorId).toLowerCase();
      const diagnosis = (item.diagnosis ?? '').toLowerCase();
      const meds = ensureArray<PrescriptionMedication>(item.medications)
        .map((med) => med.name ?? '')
        .join(' ')
        .toLowerCase();
      return doctor.includes(term) || diagnosis.includes(term) || meds.includes(term);
    });
  }, [prescriptions, activeFilter, searchTerm]);

  if (!isHydrating && !isAuthenticated) {
    return (
      <LinearGradient colors={['#eff6ff', '#e0f2fe', '#fff']} className="flex-1">
        <SafeAreaView className="flex-1 items-center justify-center px-6">
          <View className="w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-6 text-center shadow-lg shadow-blue-100">
            <PillBottle color="#1d4ed8" size={36} className="self-center" />
            <Text className="mt-4 text-xl font-semibold text-slate-900">Đăng nhập để xem đơn thuốc</Text>
            <Text className="mt-2 text-sm text-slate-500">
              Bạn cần đăng nhập để truy cập danh sách đơn thuốc và hướng dẫn sử dụng thuốc của mình.
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
    <LinearGradient colors={['#eff6ff', '#e0f2fe', '#fff']} className="flex-1">
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
                    <PillBottle color="#ffffff" size={28} />
                  </View>
                  <Text className="mt-5 text-2xl font-semibold text-slate-900">Quản lý đơn thuốc</Text>
                  <Text className="mt-2 text-sm text-slate-600">
                    Xem liều dùng, theo dõi trạng thái phát thuốc và nhận nhắc nhở tái khám từ bác sĩ.
                  </Text>
                </View>
                <View className="w-28 space-y-3">
                  <View className="rounded-2xl bg-blue-50 px-3 py-2">
                    <Text className="text-[11px] font-semibold text-blue-600">Đơn thuốc</Text>
                    <Text className="text-lg font-bold text-blue-700">{stats.total}</Text>
                  </View>
                  <View className="rounded-2xl bg-emerald-50 px-3 py-2">
                    <Text className="text-[11px] font-semibold text-emerald-600">Đã phát</Text>
                    <Text className="text-lg font-bold text-emerald-700">{stats.dispensed}</Text>
                  </View>
                </View>
              </View>

              <View className="mt-6 grid grid-cols-1 gap-3">
                <View className="rounded-2xl border border-blue-100 bg-blue-50/80 p-3">
                  <TextInput
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    placeholder="Tìm theo thuốc, bác sĩ hoặc chẩn đoán..."
                    placeholderTextColor="#94a3b8"
                    className="text-sm text-slate-900"
                  />
                </View>
                <View className="flex-row flex-wrap gap-3">
                  {FILTER_OPTIONS.map((option) => {
                    const active = option.id === activeFilter;
                    return (
                      <TouchableOpacity
                        key={option.id}
                        onPress={() => setActiveFilter(option.id)}
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
              </View>
            </View>

            <View className="flex-row flex-wrap gap-4">
              <View className="w-full flex-1" style={{ minWidth: '48%' }}>
                <View className="h-full rounded-3xl border border-white/70 bg-white/95 p-4 shadow-lg shadow-blue-100">
                  <View className="flex-row items-center space-x-3">
                    <CheckCircle2 color="#047857" size={20} />
                    <View>
                      <Text className="text-xs font-semibold text-slate-500">Đã phát thuốc</Text>
                      <Text className="text-xl font-bold text-slate-900">{stats.dispensed}</Text>
                    </View>
                  </View>
                  <Text className="mt-3 text-xs text-slate-500">Số đơn thuốc đã được phát đủ liều</Text>
                </View>
              </View>
              <View className="w-full flex-1" style={{ minWidth: '48%' }}>
                <View className="h-full rounded-3xl border border-white/70 bg-white/95 p-4 shadow-lg shadow-blue-100">
                  <View className="flex-row items-center space-x-3">
                    <AlertTriangle color="#b45309" size={20} />
                    <View>
                      <Text className="text-xs font-semibold text-slate-500">Chờ phát thuốc</Text>
                      <Text className="text-xl font-bold text-slate-900">{stats.pending}</Text>
                    </View>
                  </View>
                  <Text className="mt-3 text-xs text-slate-500">Cần đến phòng khám để nhận thuốc</Text>
                </View>
              </View>
              <View className="w-full flex-1" style={{ minWidth: '48%' }}>
                <View className="h-full rounded-3xl border border-white/70 bg-white/95 p-4 shadow-lg shadow-blue-100">
                  <View className="flex-row items-center space-x-3">
                    <Info color="#1d4ed8" size={20} />
                    <View>
                      <Text className="text-xs font-semibold text-slate-500">Nhắc tái khám</Text>
                      <Text className="text-xl font-bold text-slate-900">{stats.followUps}</Text>
                    </View>
                  </View>
                  <Text className="mt-3 text-xs text-slate-500">Đơn thuốc có yêu cầu tái khám</Text>
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

            {loading && prescriptions.length === 0 ? (
              <View className="items-center justify-center rounded-3xl border border-white/70 bg-white/95 p-8">
                <ActivityIndicator color="#1d4ed8" />
                <Text className="mt-3 text-sm text-slate-500">Đang tải danh sách đơn thuốc...</Text>
              </View>
            ) : filteredPrescriptions.length === 0 ? (
              <View className="items-center justify-center rounded-3xl border border-dashed border-blue-200 bg-blue-50/70 p-8 text-center">
                <PillBottle color="#1d4ed8" size={28} />
                <Text className="mt-3 text-sm font-semibold text-blue-700">Chưa có đơn thuốc nào phù hợp</Text>
                <Text className="mt-1 text-xs text-blue-500">Kiểm tra bộ lọc hoặc liên hệ bác sĩ để được kê đơn mới.</Text>
              </View>
            ) : (
              <View className="space-y-5">
                {filteredPrescriptions.map((item) => (
                  <PrescriptionCard key={item._id ?? `${item.prescriptionDate}-${extractDoctorName(item.doctorId)}`} prescription={item} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
