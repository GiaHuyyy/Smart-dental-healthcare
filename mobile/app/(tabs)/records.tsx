import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    Share,
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
  cost?: number | string;
};

type MedicalRecordMedication = {
  name?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
};

type DentalChartEntry = {
  toothNumber?: number;
  condition?: string;
  treatment?: string;
  notes?: string;
};

type VitalSigns = {
  bloodPressure?: string;
  heartRate?: number;
  temperature?: number;
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
  medications?: MedicalRecordMedication[] | string[];
  detailedMedications?: MedicalRecordMedication[];
  dentalChart?: DentalChartEntry[];
  vitalSigns?: VitalSigns;
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

function MedicationsPreview({ medications, detailedMedications }: { medications?: MedicalRecordMedication[] | string[]; detailedMedications?: MedicalRecordMedication[] }) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  // Use detailedMedications if available, otherwise process medications
  let meds: (MedicalRecordMedication | string)[] = [];
  
  if (detailedMedications && detailedMedications.length > 0) {
    meds = detailedMedications;
  } else if (medications && medications.length > 0) {
    // Check if medications is string array or object array
    const firstItem = medications[0];
    if (typeof firstItem === 'string') {
      meds = medications as string[];
    } else {
      meds = medications as MedicalRecordMedication[];
    }
  }
  
  if (meds.length === 0) return null;
  
  const displayMeds = meds.slice(0, 2);
  
  return (
    <View
      className="mt-3 rounded-xl p-2.5"
      style={{ backgroundColor: Colors.success[50], borderWidth: 1, borderColor: Colors.success[100] }}
    >
      <View className="flex-row items-center gap-1.5">
        <Ionicons name="medkit-outline" size={14} color={Colors.success[700]} />
        <Text className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: Colors.success[700] }}>
          Thuốc kê đơn
        </Text>
      </View>
      <View className="mt-2 space-y-1.5">
        {displayMeds.map((med, index) => {
          // Handle string medications
          if (typeof med === 'string') {
            return (
              <View
                key={`${med}-${index}`}
                className="rounded-lg p-2"
                style={{ backgroundColor: theme.card }}
              >
                <Text className="text-xs font-semibold" style={{ color: theme.text.primary }}>
                  {med}
                </Text>
              </View>
            );
          }
          
          // Handle object medications
          const medObj = med as MedicalRecordMedication;
          return (
            <View
              key={`${medObj.name ?? index}-${index}`}
              className="rounded-lg p-2"
              style={{ backgroundColor: theme.card }}
            >
              <Text className="text-xs font-semibold" style={{ color: theme.text.primary }}>
                {medObj.name ?? 'Thuốc'}
              </Text>
              {(medObj.dosage || medObj.frequency || medObj.duration) && (
                <Text className="text-[10px] mt-0.5" style={{ color: theme.text.secondary }}>
                  {[medObj.dosage, medObj.frequency, medObj.duration].filter(Boolean).join(' • ') || 'Liều dùng theo chỉ định'}
                </Text>
              )}
            </View>
          );
        })}
        {meds.length > 2 && (
          <Text className="text-[10px] mt-1.5" style={{ color: theme.text.secondary }}>
            ...và {meds.length - 2} thuốc khác
          </Text>
        )}
      </View>
    </View>
  );
}

function RecordCard({ record, onViewDetail }: { record: MedicalRecord; onViewDetail?: (record: MedicalRecord) => void }) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const followUpRequired = Boolean(record.isFollowUpRequired && record.followUpDate);
  return (
    <Card shadow="sm" className="p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <View className="flex-row items-center gap-2">
            <View
              className="h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: Colors.primary[100] }}
            >
              <Ionicons name="medical-outline" size={20} color={Colors.primary[600]} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>
                Khám {formatDate(record.recordDate)}
              </Text>
              <Text className="mt-0.5 text-[10px]" style={{ color: theme.text.secondary }}>
                BS: {extractDoctorName(record.doctorId)}
              </Text>
            </View>
          </View>
        </View>
        <RecordStatusPill status={record.status} />
      </View>

      <View className="mt-3 space-y-2">
        {record.chiefComplaint ? (
          <View className="flex-row items-start gap-2">
            <Ionicons name="alert-circle-outline" size={16} color={Colors.warning[600]} />
            <View className="flex-1">
              <Text className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: theme.text.secondary }}>
                Lý do khám
              </Text>
              <Text className="mt-0.5 text-xs" style={{ color: theme.text.primary }}>
                {record.chiefComplaint}
              </Text>
            </View>
          </View>
        ) : null}
        
        {/* Always show diagnosis section */}
        <View className="flex-row items-start gap-2">
          <Ionicons name="clipboard-outline" size={16} color={record.diagnosis ? Colors.primary[600] : Colors.error[500]} />
          <View className="flex-1">
            <Text className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: theme.text.secondary }}>
              Chẩn đoán
            </Text>
            {record.diagnosis ? (
              <Text className="mt-0.5 text-xs" style={{ color: theme.text.primary }}>
                {record.diagnosis}
              </Text>
            ) : (
              <Text className="mt-0.5 text-xs italic" style={{ color: Colors.error[500] }}>
                Chưa có chẩn đoán
              </Text>
            )}
          </View>
        </View>
        {record.treatmentPlan ? (
          <View className="flex-row items-start gap-2">
            <Ionicons name="checkmark-circle-outline" size={16} color={Colors.success[600]} />
            <View className="flex-1">
              <Text className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: theme.text.secondary }}>
                Điều trị
              </Text>
              <Text className="mt-0.5 text-xs" style={{ color: theme.text.primary }}>
                {record.treatmentPlan}
              </Text>
            </View>
          </View>
        ) : null}
        {record.notes ? (
          <View className="flex-row items-start gap-2">
            <Ionicons name="document-text-outline" size={16} color={theme.text.secondary} />
            <View className="flex-1">
              <Text className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: theme.text.secondary }}>
                Ghi chú
              </Text>
              <Text className="mt-0.5 text-xs" style={{ color: theme.text.primary }}>
                {record.notes}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {followUpRequired ? (
        <View
          className="mt-3 rounded-xl p-3"
          style={{ backgroundColor: Colors.warning[50], borderWidth: 1, borderColor: Colors.warning[100] }}
        >
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="time-outline" size={16} color={Colors.warning[700]} />
            <Text className="text-xs font-semibold" style={{ color: Colors.warning[700] }}>
              Cần tái khám
            </Text>
          </View>
          <Text className="mt-1.5 text-[10px]" style={{ color: Colors.warning[700] }}>
            {formatDate(record.followUpDate)} {record.followUpTime ? `• ${record.followUpTime}` : ''}
          </Text>
        </View>
      ) : null}

      <ProceduresPreview procedures={record.procedures} />
      <MedicationsPreview medications={record.medications} detailedMedications={record.detailedMedications} />

      {/* Action Button */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onViewDetail?.(record)}
        className="mt-3 rounded-xl py-2.5"
        style={{ backgroundColor: Colors.primary[600] }}
      >
        <View className="flex-row items-center justify-center gap-1.5">
          <Ionicons name="eye-outline" size={16} color="#ffffff" />
          <Text className="text-xs font-semibold text-white">Xem chi tiết</Text>
        </View>
      </TouchableOpacity>
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
  const userRole = session?.user?.role || 'patient'; // Get user role

  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [stats, setStats] = useState<PatientRecordStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatFilter, setSelectedStatFilter] = useState<'total' | 'completed' | 'pending' | 'followup' | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [showRecordDetail, setShowRecordDetail] = useState(false);
  
  // Edit diagnosis state
  const [isEditingDiagnosis, setIsEditingDiagnosis] = useState(false);
  const [editedDiagnosis, setEditedDiagnosis] = useState('');
  const [editedTreatmentPlan, setEditedTreatmentPlan] = useState('');
  const [isSavingDiagnosis, setIsSavingDiagnosis] = useState(false);

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

        const recordsData = ensureArray<MedicalRecord>(recordsResponse.data);
        
        // Debug: Log first record to check diagnosis field
        if (recordsData.length > 0) {
          console.log('📋 First medical record:', {
            id: recordsData[0]._id,
            recordDate: recordsData[0].recordDate,
            chiefComplaint: recordsData[0].chiefComplaint,
            diagnosis: recordsData[0].diagnosis,
            treatmentPlan: recordsData[0].treatmentPlan,
            hasComplaint: !!recordsData[0].chiefComplaint,
            hasDiagnosis: !!recordsData[0].diagnosis,
            hasTreatmentPlan: !!recordsData[0].treatmentPlan,
          });
        }
        
        setRecords(recordsData);
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

  // Use records directly as items
  const allItems = useMemo(() => {
    // Sort by date (most recent first)
    return [...records].sort((a, b) => {
      const dateA = a.recordDate;
      const dateB = b.recordDate;
      
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      
      const timestampA = new Date(dateA).getTime();
      const timestampB = new Date(dateB).getTime();
      return timestampB - timestampA; // Most recent first
    });
  }, [records]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    
    return allItems.filter((record) => {
      // Apply stat filter
      if (selectedStatFilter) {
        if (selectedStatFilter === 'total') {
          // Show all - no filter
        } else if (selectedStatFilter === 'completed') {
          const status = (record.status ?? '').trim().toLowerCase();
          if (status !== 'completed') {
            return false;
          }
        } else if (selectedStatFilter === 'pending') {
          const status = (record.status ?? '').trim().toLowerCase();
          if (status !== 'pending') {
            return false;
          }
        } else if (selectedStatFilter === 'followup') {
          if (!record.isFollowUpRequired) {
            return false;
          }
        }
      }
      
      // Apply search term
      if (!term) {
        return true;
      }
      
      const doctorName = extractDoctorName(record.doctorId).toLowerCase();
      const haystack = [record.chiefComplaint, record.diagnosis, record.treatmentPlan, doctorName].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [allItems, searchTerm, selectedStatFilter]);

  const handleViewRecordDetail = useCallback((record: MedicalRecord) => {
    setSelectedRecord(record);
    setShowRecordDetail(true);
  }, []);

  const handleCloseRecordDetail = useCallback(() => {
    setShowRecordDetail(false);
    setSelectedRecord(null);
    setIsEditingDiagnosis(false);
    setEditedDiagnosis('');
    setEditedTreatmentPlan('');
  }, []);

  const handleStartEditDiagnosis = useCallback(() => {
    if (selectedRecord) {
      setEditedDiagnosis(selectedRecord.diagnosis || '');
      setEditedTreatmentPlan(selectedRecord.treatmentPlan || '');
      setIsEditingDiagnosis(true);
    }
  }, [selectedRecord]);

  const handleCancelEditDiagnosis = useCallback(() => {
    setIsEditingDiagnosis(false);
    setEditedDiagnosis('');
    setEditedTreatmentPlan('');
  }, []);

  const handleSaveDiagnosis = useCallback(async () => {
    if (!selectedRecord?._id || !token) return;

    setIsSavingDiagnosis(true);
    try {
      const response = await apiRequest(
        `/api/v1/medical-records/${selectedRecord._id}`,
        {
          method: 'PATCH',
          token,
          body: {
            diagnosis: editedDiagnosis.trim(),
            treatmentPlan: editedTreatmentPlan.trim(),
          },
        }
      );

      // Update local state
      const updatedRecord = (response.data || response) as MedicalRecord;
      setRecords((prev) =>
        prev.map((r) => (r._id === selectedRecord._id ? { ...r, diagnosis: updatedRecord.diagnosis, treatmentPlan: updatedRecord.treatmentPlan } : r))
      );
      setSelectedRecord((prev) => (prev ? { ...prev, diagnosis: updatedRecord.diagnosis, treatmentPlan: updatedRecord.treatmentPlan } : null));
      
      setIsEditingDiagnosis(false);
      Alert.alert('Thành công', 'Đã cập nhật chẩn đoán và kế hoạch điều trị');
    } catch (error) {
      console.error('Error saving diagnosis:', error);
      Alert.alert('Lỗi', formatApiError(error, 'Không thể cập nhật chẩn đoán. Vui lòng thử lại sau.'));
    } finally {
      setIsSavingDiagnosis(false);
    }
  }, [selectedRecord, token, editedDiagnosis, editedTreatmentPlan]);

  const handlePrintRecord = useCallback(async () => {
    if (!selectedRecord) return;
    
    try {
      // Generate text content for sharing/printing
      let content = `HỒ SƠ ĐIỀU TRỊ\n`;
      content += `Ngày: ${formatDateTime(selectedRecord.recordDate)}\n`;
      content += `═══════════════════════════════════════\n\n`;
      
      content += `THÔNG TIN BÁC SĨ\n`;
      content += `Họ và tên: ${extractDoctorName(selectedRecord.doctorId)}\n`;
      if (typeof selectedRecord.doctorId === 'object' && selectedRecord.doctorId?.specialty) {
        content += `Chuyên khoa: ${selectedRecord.doctorId.specialty}\n`;
      }
      content += `\n`;
      
      if (selectedRecord.chiefComplaint) {
        content += `LÝ DO KHÁM\n${selectedRecord.chiefComplaint}\n\n`;
      }
      
      if (selectedRecord.diagnosis) {
        content += `CHẨN ĐOÁN\n${selectedRecord.diagnosis}\n\n`;
      }
      
      if (selectedRecord.treatmentPlan) {
        content += `KẾ HOẠCH ĐIỀU TRỊ\n${selectedRecord.treatmentPlan}\n\n`;
      }
      
      // Medications
      let meds: (MedicalRecordMedication | string)[] = [];
      if (selectedRecord.detailedMedications && selectedRecord.detailedMedications.length > 0) {
        meds = selectedRecord.detailedMedications;
      } else if (selectedRecord.medications && selectedRecord.medications.length > 0) {
        const firstItem = selectedRecord.medications[0];
        if (typeof firstItem === 'string') {
          meds = selectedRecord.medications as string[];
        } else {
          meds = selectedRecord.medications as MedicalRecordMedication[];
        }
      }
      
      if (meds.length > 0) {
        content += `THUỐC ĐƯỢC KÊ (${meds.length})\n`;
        meds.forEach((med, index) => {
          if (typeof med === 'string') {
            content += `${index + 1}. ${med}\n`;
          } else {
            const medObj = med as MedicalRecordMedication;
            content += `${index + 1}. ${medObj.name ?? 'Thuốc'}\n`;
            if (medObj.dosage) content += `   Liều lượng: ${medObj.dosage}\n`;
            if (medObj.frequency) content += `   Tần suất: ${medObj.frequency}\n`;
            if (medObj.duration) content += `   Thời gian: ${medObj.duration}\n`;
            if (medObj.instructions) content += `   Hướng dẫn: ${medObj.instructions}\n`;
          }
        });
        content += `\n`;
      }
      
      // Procedures
      if (selectedRecord.procedures && selectedRecord.procedures.length > 0) {
        content += `THỦ THUẬT ĐÃ THỰC HIỆN (${selectedRecord.procedures.length})\n`;
        selectedRecord.procedures.forEach((proc, index) => {
          content += `${index + 1}. ${proc.name ?? 'Thủ thuật'}\n`;
          if (proc.description) content += `   Mô tả: ${proc.description}\n`;
          if (proc.date) content += `   Ngày: ${formatDate(proc.date)}\n`;
          if (proc.cost) {
            const cost = typeof proc.cost === 'number' 
              ? proc.cost.toLocaleString('vi-VN')
              : Number(proc.cost)?.toLocaleString('vi-VN') || proc.cost;
            content += `   Chi phí: ${cost} VNĐ\n`;
          }
          if (proc.status) content += `   Trạng thái: ${proc.status}\n`;
        });
        content += `\n`;
      }
      
      // Dental Chart
      if (selectedRecord.dentalChart && selectedRecord.dentalChart.length > 0) {
        content += `SƠ ĐỒ RĂNG (${selectedRecord.dentalChart.length})\n`;
        selectedRecord.dentalChart.forEach((tooth, index) => {
          content += `Răng ${tooth.toothNumber ?? 'N/A'}: `;
          if (tooth.condition) content += `${tooth.condition} `;
          if (tooth.treatment) content += `- Điều trị: ${tooth.treatment} `;
          if (tooth.notes) content += `- Ghi chú: ${tooth.notes}`;
          content += `\n`;
        });
        content += `\n`;
      }
      
      if (selectedRecord.notes) {
        content += `GHI CHÚ\n${selectedRecord.notes}\n\n`;
      }
      
      if (selectedRecord.isFollowUpRequired) {
        content += `THÔNG TIN TÁI KHÁM\n`;
        content += `Cần tái khám\n`;
        if (selectedRecord.followUpDate) {
          content += `Ngày tái khám: ${formatDate(selectedRecord.followUpDate)} ${selectedRecord.followUpTime ? `• ${selectedRecord.followUpTime}` : ''}\n`;
        }
        content += `\n`;
      }
      
      content += `═══════════════════════════════════════\n`;
      content += `Hồ sơ được tạo bởi Smart Dental Healthcare\n`;
      content += `Ngày in: ${new Date().toLocaleString('vi-VN')}\n`;
      
      // Use Share API for mobile
      const result = await Share.share({
        message: content,
        title: `Hồ sơ điều trị - ${formatDate(selectedRecord.recordDate)}`,
      });
      
      if (result.action === Share.sharedAction) {
        // User shared successfully
      } else if (result.action === Share.dismissedAction) {
        // User dismissed
      }
    } catch (error) {
      console.error('Print/Share error:', error);
      Alert.alert('Lỗi', 'Không thể chia sẻ hóa đơn. Vui lòng thử lại sau.');
    }
  }, [selectedRecord]);

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
        rightComponent={<PolicyButton onPress={() => setShowPolicyModal(true)} />}
      />
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 80, paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          isAuthenticated ? (
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary[600]} />
          ) : undefined
        }
      >
        <View className="space-y-4">
          {/* Header Card */}
          <Card className="p-4">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <View className="flex-row items-center gap-2 mb-2">
                  <View
                    className="h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: Colors.primary[600] }}
                  >
                    <Ionicons name="clipboard-outline" size={20} color="#ffffff" />
                  </View>
                  <Text className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                    Hồ sơ bệnh án
                  </Text>
                </View>
                <Text className="text-xs leading-4" style={{ color: theme.text.secondary }}>
                  Theo dõi lịch sử khám bệnh và điều trị của bạn.
                </Text>
              </View>
              <View>
                <View className="rounded-xl px-2.5 py-1.5" style={{ backgroundColor: Colors.primary[50] }}>
                  <Text className="text-[10px] font-semibold" style={{ color: Colors.primary[600] }}>
                    Tổng số
                  </Text>
                  <Text className="text-base font-bold" style={{ color: Colors.primary[700] }}>
                    {records.length}
                  </Text>
                </View>
              </View>
            </View>

            {latestRecord ? (
              <View
                className="mt-3 rounded-xl p-3"
                style={{ backgroundColor: Colors.primary[50], borderWidth: 1, borderColor: Colors.primary[100] }}
              >
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="medical-outline" size={16} color={Colors.primary[600]} />
                  <Text className="text-xs font-semibold" style={{ color: Colors.primary[700] }}>
                    Lần khám gần nhất
                  </Text>
                </View>
                <Text className="mt-1.5 text-xs" style={{ color: theme.text.primary }}>
                  {formatDateTime(latestRecord.recordDate)} • {extractDoctorName(latestRecord.doctorId)}
                </Text>
              </View>
            ) : null}
          </Card>

          {/* Quick Stats - Clickable Filters */}
          <View className="flex-row flex-wrap gap-2">
            {quickStats.map(({ id, label, value, description, background, color, icon }) => {
              const isActive = selectedStatFilter === id;
              return (
                <TouchableOpacity
                  key={id}
                  className="flex-1"
                  style={{ minWidth: '48%' }}
                  onPress={() => setSelectedStatFilter(isActive ? null : (id as 'total' | 'completed' | 'pending' | 'followup'))}
                  activeOpacity={0.7}
                >
                  <Card 
                    shadow="sm" 
                    className="p-3"
                    style={{
                      borderWidth: isActive ? 2 : 1,
                      borderColor: isActive ? color : theme.border,
                      backgroundColor: isActive ? background : theme.card,
                    }}
                  >
                    <View className="flex-row items-center gap-2">
                      <View
                        className="h-9 w-9 items-center justify-center rounded-xl"
                        style={{ backgroundColor: isActive ? theme.card : background }}
                      >
                        <Ionicons name={icon} size={18} color={isActive ? color : color} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-[10px] font-semibold" style={{ color: isActive ? color : theme.text.secondary }}>
                          {label}
                        </Text>
                        <Text className="text-base font-bold" style={{ color: isActive ? color : theme.text.primary }}>
                          {value}
                        </Text>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Search Input */}
          <Card shadow="sm" className="p-3">
            <View className="flex-row items-center gap-2">
              <Ionicons name="search-outline" size={16} color={Colors.primary[600]} />
              <View
                className="flex-1 rounded-xl p-2"
                style={{ backgroundColor: Colors.primary[50], borderWidth: 1, borderColor: Colors.primary[100] }}
              >
                <TextInput
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  placeholder="Tìm kiếm..."
                  placeholderTextColor={theme.text.secondary}
                  className="text-xs"
                  style={{ color: theme.text.primary }}
                />
              </View>
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
                Đang tải dữ liệu...
              </Text>
            </Card>
          ) : filteredItems.length === 0 ? (
            <Card shadow="md" className="items-center justify-center p-8">
              <View
                className="rounded-full p-4"
                style={{ backgroundColor: Colors.primary[50] }}
              >
                <Ionicons name="layers-outline" size={28} color={Colors.primary[600]} />
              </View>
              <Text className="mt-3 text-sm font-semibold" style={{ color: Colors.primary[700] }}>
                Chưa có dữ liệu phù hợp
              </Text>
              <Text className="mt-1 text-xs text-center" style={{ color: theme.text.secondary }}>
                Thử thay đổi bộ lọc hoặc đặt lịch khám mới để tạo thêm hồ sơ.
              </Text>
            </Card>
          ) : (
            <View className="space-y-3">
              {filteredItems.map((record) => (
                <RecordCard 
                  key={record._id ?? `record-${record.recordDate}-${extractDoctorName(record.doctorId)}`} 
                  record={record}
                  onViewDetail={handleViewRecordDetail}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Record Detail Modal */}
      <Modal
        visible={showRecordDetail}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCloseRecordDetail}
      >
        <View className="flex-1 items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <View 
            className="w-full max-w-2xl rounded-3xl"
            style={{ 
              backgroundColor: theme.background,
              maxHeight: '90%',
            }}
          >
            {/* Modal Header */}
            <View className="flex-row items-center justify-between p-6 border-b" style={{ borderBottomColor: theme.border }}>
              <View className="flex-1">
                <Text className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                  Chi tiết hồ sơ điều trị
                </Text>
                <Text className="mt-1 text-sm" style={{ color: theme.text.secondary }}>
                  {selectedRecord?.recordDate ? formatDateTime(selectedRecord.recordDate) : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleCloseRecordDetail}
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: Colors.error[50] }}
              >
                <Ionicons name="close" size={24} color={Colors.error[600]} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              className="flex-1"
              contentContainerStyle={{ padding: 20, paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {selectedRecord && (
                <View className="space-y-6">
                  {/* Doctor Info */}
                  <Card className="p-4" style={{ backgroundColor: Colors.primary[50], borderWidth: 1, borderColor: Colors.primary[100] }}>
                    <Text className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>
                      Thông tin bác sĩ
                    </Text>
                    <View className="flex-row flex-wrap gap-4">
                      <View className="flex-1" style={{ minWidth: '48%' }}>
                        <Text className="text-xs font-semibold mb-1" style={{ color: theme.text.secondary }}>
                          Họ và tên:
                        </Text>
                        <Text className="text-base font-medium" style={{ color: theme.text.primary }}>
                          {extractDoctorName(selectedRecord.doctorId)}
                        </Text>
                      </View>
                      {typeof selectedRecord.doctorId === 'object' && selectedRecord.doctorId?.specialty && (
                        <View className="flex-1" style={{ minWidth: '48%' }}>
                          <Text className="text-xs font-semibold mb-1" style={{ color: theme.text.secondary }}>
                            Chuyên khoa:
                          </Text>
                          <Text className="text-base font-medium" style={{ color: theme.text.primary }}>
                            {selectedRecord.doctorId.specialty}
                          </Text>
                        </View>
                      )}
                    </View>
                  </Card>

                  {/* Vital Signs */}
                  {selectedRecord.vitalSigns && (
                    <Card className="p-4">
                      <Text className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>
                        Dấu hiệu sinh tồn
                      </Text>
                      <View className="flex-row flex-wrap gap-4">
                        {selectedRecord.vitalSigns.bloodPressure && (
                          <View className="flex-1" style={{ minWidth: '48%' }}>
                            <Text className="text-xs font-semibold mb-1" style={{ color: theme.text.secondary }}>
                              Huyết áp:
                            </Text>
                            <Text className="text-base font-medium" style={{ color: theme.text.primary }}>
                              {selectedRecord.vitalSigns.bloodPressure}
                            </Text>
                          </View>
                        )}
                        {selectedRecord.vitalSigns.heartRate && (
                          <View className="flex-1" style={{ minWidth: '48%' }}>
                            <Text className="text-xs font-semibold mb-1" style={{ color: theme.text.secondary }}>
                              Nhịp tim:
                            </Text>
                            <Text className="text-base font-medium" style={{ color: theme.text.primary }}>
                              {selectedRecord.vitalSigns.heartRate} bpm
                            </Text>
                          </View>
                        )}
                        {selectedRecord.vitalSigns.temperature && (
                          <View className="flex-1" style={{ minWidth: '48%' }}>
                            <Text className="text-xs font-semibold mb-1" style={{ color: theme.text.secondary }}>
                              Nhiệt độ:
                            </Text>
                            <Text className="text-base font-medium" style={{ color: theme.text.primary }}>
                              {selectedRecord.vitalSigns.temperature}°C
                            </Text>
                          </View>
                        )}
                      </View>
                    </Card>
                  )}

                  {/* Clinical Information */}
                  <View className="space-y-4">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                        Thông tin lâm sàng
                      </Text>
                      {/* Only show edit button for doctors */}
                      {!isEditingDiagnosis && userRole === 'doctor' && (
                        <TouchableOpacity
                          onPress={handleStartEditDiagnosis}
                          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg"
                          style={{ backgroundColor: Colors.primary[100] }}
                        >
                          <Ionicons name="create-outline" size={16} color={Colors.primary[700]} />
                          <Text className="text-xs font-semibold" style={{ color: Colors.primary[700] }}>
                            Chỉnh sửa
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Info for patients */}
                    {userRole !== 'doctor' && (
                      <Card className="p-3" style={{ backgroundColor: Colors.primary[50], borderWidth: 1, borderColor: Colors.primary[100] }}>
                        <View className="flex-row items-center gap-2">
                          <Ionicons name="information-circle-outline" size={16} color={Colors.primary[600]} />
                          <Text className="text-xs flex-1" style={{ color: Colors.primary[700] }}>
                            Chỉ bác sĩ mới có thể cập nhật chẩn đoán và kế hoạch điều trị
                          </Text>
                        </View>
                      </Card>
                    )}

                    {selectedRecord.chiefComplaint && (
                      <Card className="p-4" style={{ backgroundColor: Colors.primary[50] }}>
                        <Text className="text-sm font-semibold mb-2" style={{ color: theme.text.primary }}>
                          Lý do khám
                        </Text>
                        <Text className="text-base" style={{ color: theme.text.primary }}>
                          {selectedRecord.chiefComplaint}
                        </Text>
                      </Card>
                    )}

                    {/* Diagnosis - Editable */}
                    <Card className="p-4" style={{ 
                      backgroundColor: isEditingDiagnosis ? theme.card : Colors.primary[50], 
                      borderWidth: 1, 
                      borderColor: isEditingDiagnosis ? Colors.primary[300] : Colors.primary[100], 
                      borderLeftWidth: 4, 
                      borderLeftColor: Colors.primary[600] 
                    }}>
                      <Text className="text-sm font-semibold mb-2" style={{ color: Colors.primary[700] }}>
                        Chẩn đoán
                      </Text>
                      {isEditingDiagnosis ? (
                        <TextInput
                          value={editedDiagnosis}
                          onChangeText={setEditedDiagnosis}
                          placeholder="Nhập chẩn đoán..."
                          placeholderTextColor={theme.text.secondary}
                          multiline
                          numberOfLines={4}
                          className="text-base p-3 rounded-lg"
                          style={{ 
                            backgroundColor: theme.background, 
                            color: theme.text.primary,
                            borderWidth: 1,
                            borderColor: Colors.primary[200],
                            minHeight: 100,
                            textAlignVertical: 'top'
                          }}
                        />
                      ) : selectedRecord.diagnosis ? (
                        <Text className="text-base font-medium" style={{ color: theme.text.primary }}>
                          {selectedRecord.diagnosis}
                        </Text>
                      ) : (
                        <Text className="text-base italic" style={{ color: Colors.error[500] }}>
                          Chưa có chẩn đoán
                        </Text>
                      )}
                    </Card>

                    {/* Treatment Plan - Editable */}
                    <Card className="p-4" style={{ 
                      backgroundColor: isEditingDiagnosis ? theme.card : Colors.success[50], 
                      borderWidth: 1, 
                      borderColor: isEditingDiagnosis ? Colors.success[100] : Colors.success[100] 
                    }}>
                      <Text className="text-sm font-semibold mb-2" style={{ color: Colors.success[700] }}>
                        Kế hoạch điều trị
                      </Text>
                      {isEditingDiagnosis ? (
                        <TextInput
                          value={editedTreatmentPlan}
                          onChangeText={setEditedTreatmentPlan}
                          placeholder="Nhập kế hoạch điều trị..."
                          placeholderTextColor={theme.text.secondary}
                          multiline
                          numberOfLines={4}
                          className="text-base p-3 rounded-lg"
                          style={{ 
                            backgroundColor: theme.background, 
                            color: theme.text.primary,
                            borderWidth: 1,
                            borderColor: Colors.success[100],
                            minHeight: 100,
                            textAlignVertical: 'top'
                          }}
                        />
                      ) : selectedRecord.treatmentPlan ? (
                        <Text className="text-base" style={{ color: theme.text.primary }}>
                          {selectedRecord.treatmentPlan}
                        </Text>
                      ) : (
                        <Text className="text-base italic" style={{ color: Colors.error[500] }}>
                          Chưa có kế hoạch điều trị
                        </Text>
                      )}
                    </Card>

                    {/* Edit Actions */}
                    {isEditingDiagnosis && (
                      <View className="flex-row gap-3">
                        <TouchableOpacity
                          onPress={handleCancelEditDiagnosis}
                          className="flex-1 items-center justify-center rounded-2xl py-3"
                          style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}
                          disabled={isSavingDiagnosis}
                        >
                          <Text className="text-base font-semibold" style={{ color: theme.text.primary }}>
                            Hủy
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={handleSaveDiagnosis}
                          className="flex-1 items-center justify-center rounded-2xl py-3 flex-row gap-2"
                          style={{ backgroundColor: Colors.primary[600] }}
                          disabled={isSavingDiagnosis}
                        >
                          {isSavingDiagnosis ? (
                            <ActivityIndicator color="#ffffff" size="small" />
                          ) : (
                            <>
                              <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
                              <Text className="text-base font-semibold text-white">
                                Lưu
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* Medications */}
                  {(() => {
                    // Use detailedMedications if available, otherwise process medications
                    let meds: (MedicalRecordMedication | string)[] = [];
                    
                    if (selectedRecord.detailedMedications && selectedRecord.detailedMedications.length > 0) {
                      meds = selectedRecord.detailedMedications;
                    } else if (selectedRecord.medications && selectedRecord.medications.length > 0) {
                      // Check if medications is string array or object array
                      const firstItem = selectedRecord.medications[0];
                      if (typeof firstItem === 'string') {
                        meds = selectedRecord.medications as string[];
                      } else {
                        meds = selectedRecord.medications as MedicalRecordMedication[];
                      }
                    }
                    
                    if (meds.length === 0) return null;
                    
                    return (
                      <View className="space-y-4">
                        <View className="flex-row items-center space-x-2">
                          <Ionicons name="medkit-outline" size={20} color={Colors.primary[600]} />
                          <Text className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                            Thuốc được kê ({meds.length})
                          </Text>
                        </View>
                        <View className="space-y-3">
                          {meds.map((med, index) => {
                            // Handle string medications
                            if (typeof med === 'string') {
                              return (
                                <Card key={`${med}-${index}`} className="p-4" style={{ backgroundColor: Colors.primary[50], borderWidth: 1, borderColor: Colors.primary[100] }}>
                                  <Text className="text-base font-semibold" style={{ color: theme.text.primary }}>
                                    {med}
                                  </Text>
                                </Card>
                              );
                            }
                            
                            // Handle object medications
                            const medObj = med as MedicalRecordMedication;
                            return (
                              <Card key={`${medObj.name ?? index}-${index}`} className="p-4" style={{ backgroundColor: Colors.primary[50], borderWidth: 1, borderColor: Colors.primary[100] }}>
                                <Text className="text-base font-semibold mb-3" style={{ color: theme.text.primary }}>
                                  {medObj.name ?? 'Thuốc'}
                                </Text>
                                <View className="flex-row flex-wrap gap-4">
                                  {medObj.dosage && (
                                    <View className="flex-1" style={{ minWidth: '48%' }}>
                                      <Text className="text-xs font-semibold mb-1" style={{ color: theme.text.secondary }}>
                                        Liều lượng:
                                      </Text>
                                      <Text className="text-sm font-medium" style={{ color: theme.text.primary }}>
                                        {medObj.dosage}
                                      </Text>
                                    </View>
                                  )}
                                  {medObj.frequency && (
                                    <View className="flex-1" style={{ minWidth: '48%' }}>
                                      <Text className="text-xs font-semibold mb-1" style={{ color: theme.text.secondary }}>
                                        Tần suất:
                                      </Text>
                                      <Text className="text-sm font-medium" style={{ color: theme.text.primary }}>
                                        {medObj.frequency}
                                      </Text>
                                    </View>
                                  )}
                                  {medObj.duration && (
                                    <View className="flex-1" style={{ minWidth: '48%' }}>
                                      <Text className="text-xs font-semibold mb-1" style={{ color: theme.text.secondary }}>
                                        Thời gian:
                                      </Text>
                                      <Text className="text-sm font-medium" style={{ color: theme.text.primary }}>
                                        {medObj.duration}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                                {medObj.instructions && (
                                  <View className="mt-3 p-3 rounded-xl" style={{ backgroundColor: theme.card }}>
                                    <Text className="text-xs font-semibold mb-1" style={{ color: Colors.primary[700] }}>
                                      Hướng dẫn:
                                    </Text>
                                    <Text className="text-sm" style={{ color: theme.text.primary }}>
                                      {medObj.instructions}
                                    </Text>
                                  </View>
                                )}
                              </Card>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })()}

                  {/* Dental Chart */}
                  {selectedRecord.dentalChart && selectedRecord.dentalChart.length > 0 && (
                    <View className="space-y-4">
                      <Text className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                        Sơ đồ răng ({selectedRecord.dentalChart.length})
                      </Text>
                      <View className="flex-row flex-wrap gap-3">
                        {selectedRecord.dentalChart.map((tooth, index) => (
                          <Card key={`tooth-${tooth.toothNumber ?? index}-${index}`} className="p-4 flex-1" style={{ minWidth: '48%' }}>
                            <View className="flex-row items-center justify-between mb-2">
                              <Text className="text-base font-semibold" style={{ color: theme.text.primary }}>
                                Răng {tooth.toothNumber ?? 'N/A'}
                              </Text>
                              {tooth.condition && (
                                <View className="px-2 py-1 rounded-full" style={{ backgroundColor: Colors.warning[50] }}>
                                  <Text className="text-xs font-semibold" style={{ color: Colors.warning[700] }}>
                                    {tooth.condition}
                                  </Text>
                                </View>
                              )}
                            </View>
                            {tooth.treatment && (
                              <Text className="text-sm mb-1" style={{ color: theme.text.secondary }}>
                                <Text className="font-semibold">Điều trị: </Text>
                                {tooth.treatment}
                              </Text>
                            )}
                            {tooth.notes && (
                              <Text className="text-sm" style={{ color: theme.text.secondary }}>
                                <Text className="font-semibold">Ghi chú: </Text>
                                {tooth.notes}
                              </Text>
                            )}
                          </Card>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Procedures */}
                  {selectedRecord.procedures && selectedRecord.procedures.length > 0 && (
                    <View className="space-y-4">
                      <Text className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                        Thủ thuật đã thực hiện ({selectedRecord.procedures.length})
                      </Text>
                      <View className="space-y-3">
                        {selectedRecord.procedures.map((procedure, index) => (
                          <Card key={`${procedure.name ?? index}-${index}`} className="p-4">
                            <View className="flex-row items-center justify-between mb-2">
                              <Text className="text-base font-semibold" style={{ color: theme.text.primary }}>
                                {procedure.name ?? 'Thủ thuật'}
                              </Text>
                              {procedure.cost && (
                                <Text className="text-base font-semibold" style={{ color: Colors.primary[600] }}>
                                  {typeof procedure.cost === 'number' 
                                    ? `${procedure.cost.toLocaleString('vi-VN')} VNĐ`
                                    : `${Number(procedure.cost)?.toLocaleString('vi-VN') || procedure.cost} VNĐ`}
                                </Text>
                              )}
                            </View>
                            {procedure.description && (
                              <Text className="text-sm mb-2" style={{ color: theme.text.secondary }}>
                                {procedure.description}
                              </Text>
                            )}
                            <View className="flex-row items-center gap-4">
                              {procedure.date && (
                                <Text className="text-xs" style={{ color: theme.text.secondary }}>
                                  Ngày: {formatDate(procedure.date)}
                                </Text>
                              )}
                              {procedure.status && (
                                <View className="px-2 py-1 rounded-full" style={{ backgroundColor: Colors.primary[50] }}>
                                  <Text className="text-xs font-semibold" style={{ color: Colors.primary[700] }}>
                                    {procedure.status}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </Card>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Notes */}
                  {selectedRecord.notes && (
                    <Card className="p-4" style={{ backgroundColor: Colors.warning[50], borderWidth: 1, borderColor: Colors.warning[100] }}>
                      <Text className="text-sm font-semibold mb-2" style={{ color: Colors.warning[700] }}>
                        Ghi chú
                      </Text>
                      <Text className="text-base" style={{ color: theme.text.primary }}>
                        {selectedRecord.notes}
                      </Text>
                    </Card>
                  )}

                  {/* Follow-up */}
                  {selectedRecord.isFollowUpRequired && (
                    <Card className="p-4" style={{ backgroundColor: Colors.error[50], borderWidth: 1, borderColor: Colors.error[100] }}>
                      <View className="flex-row items-center space-x-2 mb-2">
                        <Ionicons name="alert-circle-outline" size={18} color={Colors.error[700]} />
                        <Text className="text-sm font-semibold" style={{ color: Colors.error[700] }}>
                          Cần tái khám
                        </Text>
                      </View>
                      {selectedRecord.followUpDate && (
                        <Text className="text-base mt-1" style={{ color: Colors.error[700] }}>
                          Ngày tái khám: {formatDate(selectedRecord.followUpDate)} {selectedRecord.followUpTime ? `• ${selectedRecord.followUpTime}` : ''}
                        </Text>
                      )}
                    </Card>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Modal Footer */}
            <View className="border-t p-6" style={{ borderTopColor: theme.border }}>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={handlePrintRecord}
                  className="flex-1 items-center justify-center rounded-2xl py-3 flex-row space-x-2"
                  style={{ backgroundColor: Colors.primary[600] }}
                >
                  <Ionicons name="print-outline" size={20} color="#ffffff" />
                  <Text className="text-base font-semibold text-white">
                    In hóa đơn
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCloseRecordDetail}
                  className="flex-1 items-center justify-center rounded-2xl py-3"
                  style={{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}
                >
                  <Text className="text-base font-semibold" style={{ color: theme.text.primary }}>
                    Đóng
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <PolicyModal visible={showPolicyModal} onClose={() => setShowPolicyModal(false)} />
    </>
  );
}
