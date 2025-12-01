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
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const meds = ensureArray<PrescriptionMedication>(medications);
  if (meds.length === 0) return null;
  return (
    <View className="mt-4 space-y-3">
      {meds.map((med, index) => (
        <View
          key={`${med.name ?? index}-${index}`}
          className="rounded-2xl p-3"
          style={{ backgroundColor: Colors.primary[50], borderWidth: 1, borderColor: Colors.primary[100] }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>
                {med.name ?? 'Thuốc'}
              </Text>
              <Text className="mt-1 text-xs" style={{ color: theme.text.secondary }}>
                {[med.dosage, med.frequency, med.duration].filter(Boolean).join(' • ') || 'Liều dùng theo chỉ định'}
              </Text>
            </View>
            <View
              className="items-center justify-center rounded-2xl px-3 py-2"
              style={{ backgroundColor: theme.card }}
            >
              <Ionicons name="medkit-outline" size={18} color={Colors.primary[600]} />
            </View>
          </View>
          {med.instructions ? (
            <Text className="mt-2 text-xs" style={{ color: theme.text.secondary }}>
              {med.instructions}
            </Text>
          ) : null}
          {typeof med.quantity === 'number' && med.unit ? (
            <Text className="mt-2 text-xs font-semibold" style={{ color: Colors.primary[700] }}>
              Số lượng: {med.quantity} {med.unit}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function PrescriptionCard({ prescription }: { prescription: Prescription }) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const statusKey = (prescription.status ?? '').toLowerCase();
  const badge = STATUS_BADGES[statusKey] ?? { label: 'Đang xử lý', color: '#0f172a', background: '#e2e8f0' };
  const dispensed = Boolean(prescription.isDispensed);

  return (
    <Card shadow="md" className="p-5">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-base font-semibold" style={{ color: theme.text.primary }}>
            Đơn thuốc ngày {formatDate(prescription.prescriptionDate)}
          </Text>
          <Text className="mt-1 text-xs" style={{ color: theme.text.secondary }}>
            Bác sĩ: {extractDoctorName(prescription.doctorId)}
          </Text>
          <Text className="mt-1 text-xs" style={{ color: theme.text.secondary, opacity: 0.7 }}>
            Liên kết hồ sơ: {extractRecordSummary(prescription.medicalRecordId)}
          </Text>
        </View>
        <View className="items-end space-y-2">
          <PrescriptionBadge text={badge.label} color={badge.color} background={badge.background} />
          {dispensed ? (
            <PrescriptionBadge text="Đã phát thuốc" color={Colors.success[700]} background={Colors.success[50]} />
          ) : (
            <PrescriptionBadge text="Chưa phát thuốc" color={Colors.warning[700]} background={Colors.warning[50]} />
          )}
        </View>
      </View>

      {prescription.diagnosis ? (
        <View className="mt-4 flex-row items-start space-x-3">
          <Ionicons name="clipboard-outline" size={18} color={Colors.primary[600]} />
          <View className="flex-1">
            <Text className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.text.secondary }}>
              Chẩn đoán
            </Text>
            <Text className="mt-1 text-sm" style={{ color: theme.text.primary }}>
              {prescription.diagnosis}
            </Text>
          </View>
        </View>
      ) : null}

      <MedicationsList medications={prescription.medications} />

      {prescription.instructions ? (
        <View
          className="mt-4 rounded-2xl p-4"
          style={{ backgroundColor: Colors.primary[50], borderWidth: 1, borderColor: Colors.primary[100] }}
        >
          <Text className="text-xs font-semibold uppercase tracking-wide" style={{ color: Colors.primary[600] }}>
            Hướng dẫn
          </Text>
          <Text className="mt-2 text-sm" style={{ color: theme.text.primary }}>
            {prescription.instructions}
          </Text>
        </View>
      ) : null}

      {prescription.notes ? (
        <View
          className="mt-3 rounded-2xl p-3"
          style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}
        >
          <Text className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.text.secondary }}>
            Ghi chú
          </Text>
          <Text className="mt-2 text-xs" style={{ color: theme.text.secondary }}>
            {prescription.notes}
          </Text>
        </View>
      ) : null}

      {prescription.isFollowUpRequired && prescription.followUpDate ? (
        <View
          className="mt-4 rounded-2xl p-4"
          style={{ backgroundColor: Colors.warning[50], borderWidth: 1, borderColor: Colors.warning[100] }}
        >
          <View className="flex-row items-center space-x-2">
            <Ionicons name="time-outline" size={18} color={Colors.warning[700]} />
            <Text className="text-sm font-semibold" style={{ color: Colors.warning[700] }}>
              Nhắc nhở tái khám
            </Text>
          </View>
          <Text className="mt-2 text-xs" style={{ color: Colors.warning[700] }}>
            Ngày tái khám đề xuất: {formatDate(prescription.followUpDate)}
          </Text>
        </View>
      ) : null}

      {dispensed && prescription.dispensedDate ? (
        <View
          className="mt-4 rounded-2xl p-3"
          style={{ backgroundColor: Colors.success[50], borderWidth: 1, borderColor: Colors.success[100] }}
        >
          <View className="flex-row items-center space-x-2">
            <Ionicons name="checkmark-circle-outline" size={16} color={Colors.success[700]} />
            <Text className="text-xs font-semibold" style={{ color: Colors.success[700] }}>
              Đã phát thuốc ngày {formatDate(prescription.dispensedDate)}
            </Text>
          </View>
        </View>
      ) : null}
    </Card>
  );
}

export default function PrescriptionsScreen() {
  const router = useRouter();
  const { session, isAuthenticated, isHydrating } = useAuth();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const patientId = session?.user?._id ?? '';
  const token = session?.token ?? '';

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [showPolicyModal, setShowPolicyModal] = useState(false);

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
          `/prescriptions/patient-prescriptions?patientId=${patientId}&limit=50`,
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
      <>
        <AppHeader 
          title="Đơn thuốc" 
          showNotification 
          showAvatar 
          rightComponent={<PolicyButton onPress={() => setShowPolicyModal(true)} />}
        />
        <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: theme.background }}>
          <Card shadow="md" className="w-full max-w-md p-6 items-center">
            <Ionicons name="medical-outline" size={36} color={Colors.primary[600]} />
            <Text className="mt-4 text-xl font-semibold" style={{ color: theme.text.primary }}>
              Đăng nhập để xem đơn thuốc
            </Text>
            <Text className="mt-2 text-sm text-center" style={{ color: theme.text.secondary }}>
              Bạn cần đăng nhập để truy cập danh sách đơn thuốc và hướng dẫn sử dụng thuốc của mình.
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
        title="Đơn thuốc" 
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
        <View className="space-y-6">
          {/* Header Card */}
          <Card shadow="md" className="p-6">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <View
                  className="h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: Colors.primary[600] }}
                >
                  <Ionicons name="medical-outline" size={28} color="#ffffff" />
                </View>
                <Text className="mt-5 text-2xl font-semibold" style={{ color: theme.text.primary }}>
                  Quản lý đơn thuốc
                </Text>
                <Text className="mt-2 text-sm" style={{ color: theme.text.secondary }}>
                  Xem liều dùng, theo dõi trạng thái phát thuốc và nhận nhắc nhở tái khám từ bác sĩ.
                </Text>
              </View>
              <View className="w-28 space-y-3">
                <View className="rounded-2xl px-3 py-2" style={{ backgroundColor: Colors.primary[50] }}>
                  <Text className="text-[11px] font-semibold" style={{ color: Colors.primary[600] }}>
                    Đơn thuốc
                  </Text>
                  <Text className="text-lg font-bold" style={{ color: Colors.primary[700] }}>
                    {stats.total}
                  </Text>
                </View>
                <View className="rounded-2xl px-3 py-2" style={{ backgroundColor: Colors.success[50] }}>
                  <Text className="text-[11px] font-semibold" style={{ color: Colors.success[600] }}>
                    Đã phát
                  </Text>
                  <Text className="text-lg font-bold" style={{ color: Colors.success[700] }}>
                    {stats.dispensed}
                  </Text>
                </View>
              </View>
            </View>

            <View className="mt-6 space-y-3">
              <View
                className="rounded-2xl p-3"
                style={{ backgroundColor: Colors.primary[50], borderWidth: 1, borderColor: Colors.primary[100] }}
              >
                <TextInput
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  placeholder="Tìm theo thuốc, bác sĩ hoặc chẩn đoán..."
                  placeholderTextColor={theme.text.secondary}
                  className="text-sm"
                  style={{ color: theme.text.primary }}
                />
              </View>
              <View className="flex-row flex-wrap gap-3">
                {FILTER_OPTIONS.map((option) => {
                  const active = option.id === activeFilter;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() => setActiveFilter(option.id)}
                      className="rounded-2xl px-4 py-2"
                      style={{
                        borderWidth: 1,
                        borderColor: active ? Colors.primary[600] : Colors.primary[100],
                        backgroundColor: active ? Colors.primary[600] : theme.card,
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
            </View>
          </Card>

          {/* Stats Cards */}
          <View className="flex-row flex-wrap gap-4">
            <View className="w-full flex-1" style={{ minWidth: '48%' }}>
              <Card shadow="md" className="h-full p-4">
                <View className="flex-row items-center space-x-3">
                  <View
                    className="h-12 w-12 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: Colors.success[50] }}
                  >
                    <Ionicons name="checkmark-circle-outline" size={20} color={Colors.success[700]} />
                  </View>
                  <View>
                    <Text className="text-xs font-semibold" style={{ color: theme.text.secondary }}>
                      Đã phát thuốc
                    </Text>
                    <Text className="text-xl font-bold" style={{ color: theme.text.primary }}>
                      {stats.dispensed}
                    </Text>
                  </View>
                </View>
                <Text className="mt-3 text-xs" style={{ color: theme.text.secondary }}>
                  Số đơn thuốc đã được phát đủ liều
                </Text>
              </Card>
            </View>
            <View className="w-full flex-1" style={{ minWidth: '48%' }}>
              <Card shadow="md" className="h-full p-4">
                <View className="flex-row items-center space-x-3">
                  <View
                    className="h-12 w-12 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: Colors.warning[50] }}
                  >
                    <Ionicons name="alert-circle-outline" size={20} color={Colors.warning[700]} />
                  </View>
                  <View>
                    <Text className="text-xs font-semibold" style={{ color: theme.text.secondary }}>
                      Chờ phát thuốc
                    </Text>
                    <Text className="text-xl font-bold" style={{ color: theme.text.primary }}>
                      {stats.pending}
                    </Text>
                  </View>
                </View>
                <Text className="mt-3 text-xs" style={{ color: theme.text.secondary }}>
                  Cần đến phòng khám để nhận thuốc
                </Text>
              </Card>
            </View>
            <View className="w-full flex-1" style={{ minWidth: '48%' }}>
              <Card shadow="md" className="h-full p-4">
                <View className="flex-row items-center space-x-3">
                  <View
                    className="h-12 w-12 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: Colors.primary[50] }}
                  >
                    <Ionicons name="information-circle-outline" size={20} color={Colors.primary[600]} />
                  </View>
                  <View>
                    <Text className="text-xs font-semibold" style={{ color: theme.text.secondary }}>
                      Nhắc tái khám
                    </Text>
                    <Text className="text-xl font-bold" style={{ color: theme.text.primary }}>
                      {stats.followUps}
                    </Text>
                  </View>
                </View>
                <Text className="mt-3 text-xs" style={{ color: theme.text.secondary }}>
                  Đơn thuốc có yêu cầu tái khám
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
          {loading && prescriptions.length === 0 ? (
            <Card shadow="md" className="items-center justify-center p-8">
              <ActivityIndicator color={Colors.primary[600]} />
              <Text className="mt-3 text-sm" style={{ color: theme.text.secondary }}>
                Đang tải danh sách đơn thuốc...
              </Text>
            </Card>
          ) : filteredPrescriptions.length === 0 ? (
            <Card shadow="md" className="items-center justify-center p-8">
              <View
                className="rounded-full p-4"
                style={{ backgroundColor: Colors.primary[50] }}
              >
                <Ionicons name="medical-outline" size={28} color={Colors.primary[600]} />
              </View>
              <Text className="mt-3 text-sm font-semibold" style={{ color: Colors.primary[700] }}>
                Chưa có đơn thuốc nào phù hợp
              </Text>
              <Text className="mt-1 text-xs text-center" style={{ color: theme.text.secondary }}>
                Kiểm tra bộ lọc hoặc liên hệ bác sĩ để được kê đơn mới.
              </Text>
            </Card>
          ) : (
            <View className="space-y-5">
              {filteredPrescriptions.map((item) => (
                <PrescriptionCard key={item._id ?? `${item.prescriptionDate}-${extractDoctorName(item.doctorId)}`} prescription={item} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <PolicyModal visible={showPolicyModal} onClose={() => setShowPolicyModal(false)} />
    </>
  );
}
