import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    Share,
    Text,
    TextInput,
    TouchableOpacity,
    View
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

type DiagnosisGroup = {
  diagnosis?: string;
  treatmentPlans?: string[];
};

type MedicalRecord = {
  _id?: string;
  recordDate?: string | Date | null;
  chiefComplaint?: string;
  chiefComplaints?: string[];
  diagnosis?: string;
  diagnosisGroups?: DiagnosisGroup[];
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
  parentRecordId?: string | { _id?: string } | null;
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

function RecordCard({ 
  record, 
  onViewDetail,
  isChild = false,
  childIndex,
  hasChildren = false,
  isExpanded = false,
  onToggleExpand,
}: { 
  record: MedicalRecord; 
  onViewDetail?: (record: MedicalRecord) => void;
  isChild?: boolean;
  childIndex?: number;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const followUpRequired = Boolean(record.isFollowUpRequired && record.followUpDate);
  
  return (
    <Card shadow="sm" className="p-4" style={isChild ? { 
      marginLeft: 20, 
      borderLeftWidth: 3, 
      borderLeftColor: Colors.warning[300],
      backgroundColor: Colors.warning[50]
    } : undefined}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <View className="flex-row items-center gap-2">
            {hasChildren && !isChild ? (
              <TouchableOpacity
                onPress={onToggleExpand}
                className="h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: Colors.primary[600] }}
              >
                <Ionicons 
                  name={isExpanded ? "chevron-down" : "chevron-forward"} 
                  size={24} 
                  color="#ffffff" 
                />
              </TouchableOpacity>
            ) : (
              <View
                className="h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: isChild ? Colors.warning[100] : Colors.primary[100] }}
              >
                <Ionicons 
                  name={isChild ? "return-down-forward" : "medical-outline"} 
                  size={20} 
                  color={isChild ? Colors.warning[700] : Colors.primary[600]} 
                />
              </View>
            )}
            <View className="flex-1">
              <View className="flex-row items-center gap-2 flex-wrap">
                <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>
                  {isChild ? `Tái khám ${childIndex}` : `Khám ${formatDate(record.recordDate)}`}
                </Text>
                {hasChildren && (
                  <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: Colors.primary[600] }}>
                    <Text className="text-[10px] font-semibold text-white">
                      📋 Có tái khám
                    </Text>
                  </View>
                )}
                {isChild && (
                  <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: Colors.warning[600] }}>
                    <Text className="text-[10px] font-semibold text-white">
                      🔄 Tái khám
                    </Text>
                  </View>
                )}
              </View>
              <Text className="mt-0.5 text-[10px]" style={{ color: theme.text.secondary }}>
                BS: {extractDoctorName(record.doctorId)}
              </Text>
            </View>
          </View>
        </View>
        <RecordStatusPill status={record.status} />
      </View>

      {/* Show expand instruction for parent with children */}
      {hasChildren && !isChild && !isExpanded && (
        <View 
          className="mt-3 rounded-xl p-2.5 flex-row items-center gap-2"
          style={{ backgroundColor: Colors.primary[100] }}
        >
          <Ionicons name="information-circle" size={16} color={Colors.primary[700]} />
          <Text className="text-xs font-medium flex-1" style={{ color: Colors.primary[700] }}>
            Nhấn nút mũi tên để xem các lần tái khám
          </Text>
        </View>
      )}

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
        
        {/* Diagnosis Groups (priority) or fallback to diagnosis */}
        {record.diagnosisGroups && record.diagnosisGroups.length > 0 ? (
          <View className="flex-row items-start gap-2">
            <Ionicons name="clipboard-outline" size={16} color={Colors.primary[600]} />
            <View className="flex-1">
              <Text className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: theme.text.secondary }}>
                Chẩn đoán
              </Text>
              <View className="mt-1 space-y-1">
                {record.diagnosisGroups.map((group, idx) => (
                  <View key={idx} className="rounded-lg p-2" style={{ backgroundColor: Colors.primary[50] }}>
                    <Text className="text-xs font-semibold" style={{ color: theme.text.primary }}>
                      • {group.diagnosis}
                    </Text>
                    {group.treatmentPlans && group.treatmentPlans.length > 0 && (
                      <View className="mt-1 ml-2">
                        {group.treatmentPlans.map((plan, planIdx) => (
                          <Text 
                            key={planIdx} 
                            className="text-[10px]" 
                            style={{ color: theme.text.secondary }}
                          >
                            → {plan}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : record.diagnosis ? (
          <View className="flex-row items-start gap-2">
            <Ionicons name="clipboard-outline" size={16} color={Colors.primary[600]} />
            <View className="flex-1">
              <Text className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: theme.text.secondary }}>
                Chẩn đoán
              </Text>
              <Text className="mt-0.5 text-xs" style={{ color: theme.text.primary }}>
                {record.diagnosis}
              </Text>
            </View>
          </View>
        ) : (
          <View className="flex-row items-start gap-2">
            <Ionicons name="clipboard-outline" size={16} color={Colors.error[500]} />
            <View className="flex-1">
              <Text className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: theme.text.secondary }}>
                Chẩn đoán
              </Text>
              <Text className="mt-0.5 text-xs italic" style={{ color: Colors.error[500] }}>
                Chưa có chẩn đoán
              </Text>
            </View>
          </View>
        )}

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
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<'all' | 'treated' | 'followUp'>('all');
  const [selectedStatFilter, setSelectedStatFilter] = useState<'total' | 'completed' | 'pending' | 'followup' | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const buildSelectedRecordText = useCallback(() => {
    if (!selectedRecord) return '';
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

    if (selectedRecord.diagnosisGroups && selectedRecord.diagnosisGroups.length > 0) {
      content += `CHẨN ĐOÁN (${selectedRecord.diagnosisGroups.length} nhóm)\n`;
      selectedRecord.diagnosisGroups.forEach((group, index) => {
        content += `${index + 1}. ${group.diagnosis}\n`;
        if (group.treatmentPlans && group.treatmentPlans.length > 0) {
          content += `   Phương pháp điều trị:\n`;
          group.treatmentPlans.forEach((plan) => {
            content += `   → ${plan}\n`;
          });
        }
      });
      content += `\n`;
    } else if (selectedRecord.diagnosis) {
      content += `CHẨN ĐOÁN\n${selectedRecord.diagnosis}\n\n`;
    }

    if (selectedRecord.treatmentPlan) {
      content += `KẾ HOẠCH ĐIỀU TRỊ\n${selectedRecord.treatmentPlan}\n\n`;
    }

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

    if (selectedRecord.procedures && selectedRecord.procedures.length > 0) {
      content += `THỦ THUẬT ĐÃ THỰC HIỆN (${selectedRecord.procedures.length})\n`;
      selectedRecord.procedures.forEach((proc, index) => {
        content += `${index + 1}. ${proc.name ?? 'Thủ thuật'}\n`;
        if (proc.description) content += `   Mô tả: ${proc.description}\n`;
        if (proc.date) content += `   Ngày: ${formatDate(proc.date)}\n`;
        if (proc.cost) {
          const cost = typeof proc.cost === 'number'
            ? proc.cost.toLocaleString('vi-VN')
            : Number(proc.cost)?.toLocaleString('vi-VN') || (proc.cost as string);
          content += `   Chi phí: ${cost} VNĐ\n`;
        }
        if (proc.status) content += `   Trạng thái: ${proc.status}\n`;
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
    content += `Smart Dental Healthcare\n`;
    content += `Ngày in: ${new Date().toLocaleString('vi-VN')}\n`;
    return content;
  }, [selectedRecord]);

  const handleShareSelectedRecord = useCallback(async () => {
    if (!selectedRecord) return;
    try {
      const content = buildSelectedRecordText();
      await Share.share({
        message: content,
        title: `Hồ sơ điều trị - ${formatDate(selectedRecord.recordDate)}`,
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Lỗi', 'Không thể chia sẻ hồ sơ. Vui lòng thử lại sau.');
    }
  }, [buildSelectedRecordText, selectedRecord]);

  const handlePrintSelectedRecord = useCallback(() => {
    if (Platform.OS === 'web') {
      try {
        window.print?.();
      } catch (error) {
        console.error('Web print error:', error);
        Alert.alert('Lỗi', 'Không thể in trên trình duyệt.');
      }
    } else {
      Alert.alert(
        'In hồ sơ',
        'Tính năng in chưa hỗ trợ trên thiết bị di động. Vui lòng sử dụng nút Chia sẻ để gửi hoặc lưu hồ sơ.',
        [
          { text: 'Chia sẻ', onPress: () => void handleShareSelectedRecord() },
          { text: 'Đóng', style: 'cancel' },
        ]
      );
    }
  }, [handleShareSelectedRecord]);

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
        // Fetch records first (critical)
        const recordsResponse = await apiRequest<MedicalRecord[] | { data: MedicalRecord[] }>(`/api/v1/medical-records/patient/${patientId}`, {
          token,
          abortSignal: signal,
        });

        // Handle both array and object with data property
        let recordsData: MedicalRecord[];
        if (Array.isArray(recordsResponse.data)) {
          recordsData = recordsResponse.data;
        } else if (recordsResponse.data && typeof recordsResponse.data === 'object' && 'data' in recordsResponse.data) {
          recordsData = ensureArray<MedicalRecord>((recordsResponse.data as any).data);
        } else {
          recordsData = ensureArray<MedicalRecord>(recordsResponse.data);
        }
        
        console.log('📋 Fetched records count:', recordsData.length);
        
        // Debug: Log first record to check diagnosis field
        if (recordsData.length > 0) {
          console.log('📋 First medical record:', {
            id: recordsData[0]._id,
            recordDate: recordsData[0].recordDate,
            chiefComplaint: recordsData[0].chiefComplaint,
            diagnosis: recordsData[0].diagnosis,
            diagnosisGroups: recordsData[0].diagnosisGroups,
            treatmentPlan: recordsData[0].treatmentPlan,
            parentRecordId: recordsData[0].parentRecordId,
          });
        }
        
        setRecords(recordsData);
        setErrorMessage(null);

        // Try to fetch stats (optional, non-blocking)
        try {
          const statsResponse = await apiRequest<PatientRecordStats>(`/api/v1/medical-records/statistics/patient?patientId=${patientId}`, {
            token,
            abortSignal: signal,
          });
          setStats(statsResponse.data ?? null);
        } catch (statsError) {
          console.log('⚠️ Stats API failed, will calculate from records:', formatApiError(statsError));
          setStats(null); // Will be calculated in quickStats useMemo
        }
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        console.error('❌ Error loading medical records:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          status: (error as any)?.status,
          details: (error as any)?.details,
        });
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

  // Use records directly as items, build hierarchy
  const { parentRecords, childRecordsMap } = useMemo(() => {
    const parents: MedicalRecord[] = [];
    const childrenMap = new Map<string, MedicalRecord[]>();

    records.forEach((record) => {
      const parentId = typeof record.parentRecordId === 'string' 
        ? record.parentRecordId 
        : record.parentRecordId?._id;

      if (parentId) {
        // This is a child record (follow-up)
        if (!childrenMap.has(parentId)) {
          childrenMap.set(parentId, []);
        }
        childrenMap.get(parentId)!.push(record);
      } else {
        // This is a parent record
        parents.push(record);
      }
    });

    // Sort children by date (oldest first)
    childrenMap.forEach((children) => {
      children.sort((a, b) => {
        const dateA = a.recordDate ? new Date(a.recordDate).getTime() : 0;
        const dateB = b.recordDate ? new Date(b.recordDate).getTime() : 0;
        return dateA - dateB;
      });
    });

    // Sort parents by date (newest first)
    parents.sort((a, b) => {
      const dateA = a.recordDate ? new Date(a.recordDate).getTime() : 0;
      const dateB = b.recordDate ? new Date(b.recordDate).getTime() : 0;
      return dateB - dateA;
    });

    return { parentRecords: parents, childRecordsMap: childrenMap };
  }, [records]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    
    // Get all records (flatten hierarchy for filtering)
    const allRecords: MedicalRecord[] = [];
    parentRecords.forEach(parent => {
      allRecords.push(parent);
      const children = childRecordsMap.get(parent._id ?? '') || [];
      allRecords.push(...children);
    });
    
    return allRecords.filter((record) => {
      // Apply status filter
      if (statusFilter === 'treated') {
        if (record.isFollowUpRequired) return false;
      } else if (statusFilter === 'followUp') {
        if (!record.isFollowUpRequired) return false;
      }
      
      // Apply stat filter
      if (selectedStatFilter) {
        if (selectedStatFilter === 'completed') {
          const status = (record.status ?? '').trim().toLowerCase();
          if (status !== 'completed') return false;
        } else if (selectedStatFilter === 'pending') {
          const status = (record.status ?? '').trim().toLowerCase();
          if (status !== 'pending') return false;
        } else if (selectedStatFilter === 'followup') {
          if (!record.isFollowUpRequired) return false;
        }
      }
      
      // Apply date filter
      if (startDate && !endDate) {
        // Only start date - filter exact date
        if (!record.recordDate) return false;
        const recordDate = new Date(record.recordDate);
        recordDate.setHours(0, 0, 0, 0);
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (recordDate.getTime() !== start.getTime()) return false;
      } else if (!startDate && endDate) {
        // Only end date - filter exact date
        if (!record.recordDate) return false;
        const recordDate = new Date(record.recordDate);
        recordDate.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);
        if (recordDate.getTime() !== end.getTime()) return false;
      } else if (startDate && endDate) {
        // Both dates - filter range
        if (!record.recordDate) return false;
        const recordDate = new Date(record.recordDate);
        recordDate.setHours(0, 0, 0, 0);
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);
        if (recordDate < start || recordDate > end) return false;
      }
      
      // Apply search term
      if (term) {
        const doctorName = extractDoctorName(record.doctorId).toLowerCase();
        const haystack = [
          record.chiefComplaint, 
          record.diagnosis, 
          record.treatmentPlan, 
          doctorName
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      
      return true;
    });
  }, [parentRecords, childRecordsMap, searchTerm, selectedStatFilter, statusFilter, startDate, endDate]);

  const toggleExpand = useCallback((recordId: string) => {
    setExpandedRecords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setStartDate(undefined);
    setEndDate(undefined);
    setStatusFilter('all');
    setSelectedStatFilter(null);
  }, []);

  const handleViewRecordDetail = useCallback((record: MedicalRecord) => {
    if (!record._id) return;
    setSelectedRecord(record);
    setShowDetailModal(true);
  }, []);

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

          {/* Date & Status Filters */}
          <Card shadow="sm" className="p-3 space-y-3">
            {/* Date Filter Row */}
            <View className="flex-row items-center gap-2">
              <Ionicons name="calendar-outline" size={16} color={Colors.primary[600]} />
              <Text className="text-xs font-semibold" style={{ color: theme.text.secondary }}>
                Từ
              </Text>
              <TouchableOpacity
                className="flex-1 rounded-xl p-2"
                style={{ backgroundColor: Colors.primary[50], borderWidth: 1, borderColor: Colors.primary[100] }}
                onPress={() => setShowDatePicker('start')}
              >
                <Text className="text-xs" style={{ color: startDate ? theme.text.primary : theme.text.secondary }}>
                  {startDate ? formatDate(startDate) : 'Chọn ngày'}
                </Text>
              </TouchableOpacity>
              <Text className="text-xs font-semibold" style={{ color: theme.text.secondary }}>
                đến
              </Text>
              <TouchableOpacity
                className="flex-1 rounded-xl p-2"
                style={{ backgroundColor: Colors.primary[50], borderWidth: 1, borderColor: Colors.primary[100] }}
                onPress={() => setShowDatePicker('end')}
              >
                <Text className="text-xs" style={{ color: endDate ? theme.text.primary : theme.text.secondary }}>
                  {endDate ? formatDate(endDate) : 'Chọn ngày'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Status Filter Buttons */}
            <View className="flex-row gap-2">
              <TouchableOpacity
                className="flex-1 rounded-xl px-3 py-2"
                style={{ 
                  backgroundColor: statusFilter === 'all' ? Colors.primary[600] : Colors.primary[50],
                  borderWidth: 1,
                  borderColor: statusFilter === 'all' ? Colors.primary[600] : Colors.primary[100]
                }}
                onPress={() => setStatusFilter('all')}
              >
                <Text 
                  className="text-xs font-semibold text-center" 
                  style={{ color: statusFilter === 'all' ? '#ffffff' : Colors.primary[600] }}
                >
                  Tất cả
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 rounded-xl px-3 py-2"
                style={{ 
                  backgroundColor: statusFilter === 'treated' ? Colors.success[600] : Colors.success[50],
                  borderWidth: 1,
                  borderColor: statusFilter === 'treated' ? Colors.success[600] : Colors.success[100]
                }}
                onPress={() => setStatusFilter('treated')}
              >
                <Text 
                  className="text-xs font-semibold text-center" 
                  style={{ color: statusFilter === 'treated' ? '#ffffff' : Colors.success[700] }}
                >
                  Đã điều trị
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 rounded-xl px-3 py-2"
                style={{ 
                  backgroundColor: statusFilter === 'followUp' ? Colors.warning[600] : Colors.warning[50],
                  borderWidth: 1,
                  borderColor: statusFilter === 'followUp' ? Colors.warning[600] : Colors.warning[100]
                }}
                onPress={() => setStatusFilter('followUp')}
              >
                <Text 
                  className="text-xs font-semibold text-center" 
                  style={{ color: statusFilter === 'followUp' ? '#ffffff' : Colors.warning[700] }}
                >
                  Tái khám
                </Text>
              </TouchableOpacity>
            </View>

            {/* Clear Filters Button */}
            {(searchTerm || startDate || endDate || statusFilter !== 'all' || selectedStatFilter) && (
              <TouchableOpacity
                className="rounded-xl py-2"
                style={{ backgroundColor: Colors.error[50], borderWidth: 1, borderColor: Colors.error[100] }}
                onPress={clearFilters}
              >
                <Text className="text-xs font-semibold text-center" style={{ color: Colors.error[700] }}>
                  Xóa bộ lọc
                </Text>
              </TouchableOpacity>
            )}
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
              {(() => {
                // Build filtered parent records with their children
                const filteredIds = new Set(filteredItems.map(r => r._id));
                const visibleParents = parentRecords.filter(parent => 
                  filteredIds.has(parent._id) || 
                  (childRecordsMap.get(parent._id ?? '') || []).some(child => filteredIds.has(child._id))
                );

                return visibleParents.map((parent) => {
                  const children = childRecordsMap.get(parent._id ?? '') || [];
                  const visibleChildren = children.filter(child => filteredIds.has(child._id));
                  const hasChildren = visibleChildren.length > 0;
                  const isExpanded = expandedRecords.has(parent._id ?? '');
                  const showParent = filteredIds.has(parent._id);

                  return (
                    <View key={parent._id ?? `parent-${parent.recordDate}`} className="space-y-2">
                      {/* Parent Record */}
                      {showParent && (
                        <RecordCard 
                          record={parent}
                          onViewDetail={handleViewRecordDetail}
                          hasChildren={hasChildren}
                          isExpanded={isExpanded}
                          onToggleExpand={() => toggleExpand(parent._id ?? '')}
                        />
                      )}

                      {/* Child Records - Show when expanded */}
                      {hasChildren && isExpanded && visibleChildren.map((child, index) => (
                        <RecordCard 
                          key={child._id ?? `child-${child.recordDate}-${index}`}
                          record={child}
                          onViewDetail={handleViewRecordDetail}
                          isChild={true}
                          childIndex={index + 1}
                        />
                      ))}
                    </View>
                  );
                });
              })()}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal
            visible={true}
            transparent
            animationType="slide"
            onRequestClose={() => setShowDatePicker(null)}
          >
            <TouchableOpacity 
              className="flex-1 bg-black/50 justify-end"
              activeOpacity={1}
              onPress={() => setShowDatePicker(null)}
            >
              <View 
                className="bg-white rounded-t-3xl p-4"
                onStartShouldSetResponder={() => true}
              >
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                    {showDatePicker === 'start' ? 'Chọn ngày bắt đầu' : 'Chọn ngày kết thúc'}
                  </Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(null)}>
                    <Ionicons name="close" size={24} color={theme.text.primary} />
                  </TouchableOpacity>
                </View>
                
                <DateTimePicker
                  value={showDatePicker === 'start' ? (startDate || new Date()) : (endDate || new Date())}
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (event.type === 'set' && selectedDate) {
                      if (showDatePicker === 'start') {
                        setStartDate(selectedDate);
                      } else {
                        setEndDate(selectedDate);
                      }
                    }
                  }}
                  locale="vi-VN"
                />

                <View className="flex-row gap-2 mt-4">
                  <TouchableOpacity
                    className="flex-1 rounded-xl py-3"
                    style={{ backgroundColor: Colors.error[50] }}
                    onPress={() => {
                      if (showDatePicker === 'start') {
                        setStartDate(undefined);
                      } else {
                        setEndDate(undefined);
                      }
                      setShowDatePicker(null);
                    }}
                  >
                    <Text className="text-center text-sm font-semibold" style={{ color: Colors.error[700] }}>
                      Xóa
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 rounded-xl py-3"
                    style={{ backgroundColor: Colors.primary[600] }}
                    onPress={() => setShowDatePicker(null)}
                  >
                    <Text className="text-center text-sm font-semibold text-white">
                      Xong
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>
        ) : (
          // Android uses native date picker
          <DateTimePicker
            value={showDatePicker === 'start' ? (startDate || new Date()) : (endDate || new Date())}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(null);
              if (event.type === 'set' && selectedDate) {
                if (showDatePicker === 'start') {
                  setStartDate(selectedDate);
                } else {
                  setEndDate(selectedDate);
                }
              }
            }}
          />
        )
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRecord && (
        <Modal
          visible={true}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowDetailModal(false);
            setSelectedRecord(null);
          }}
        >
          <View className="flex-1 bg-black/50">
            <TouchableOpacity 
              className="flex-1"
              activeOpacity={1}
              onPress={() => {
                setShowDetailModal(false);
                setSelectedRecord(null);
              }}
            />
            <View 
              className="bg-white rounded-t-3xl"
              style={{ 
                maxHeight: '85%',
                backgroundColor: theme.card,
              }}
            >
              {/* Modal Header */}
              <View 
                className="flex-row items-center justify-between p-4 border-b"
                style={{ borderBottomColor: theme.border }}
              >
                <View className="flex-1">
                  <Text className="text-lg font-bold" style={{ color: theme.text.primary }}>
                    Chi tiết hồ sơ điều trị
                  </Text>
                  <Text className="text-xs mt-0.5" style={{ color: theme.text.secondary }}>
                    {formatDateTime(selectedRecord.recordDate)}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity
                    onPress={handleShareSelectedRecord}
                    className="h-8 w-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: Colors.primary[100] }}
                  >
                    <Ionicons name="share-social-outline" size={18} color={Colors.primary[700]} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handlePrintSelectedRecord}
                    className="h-8 w-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: Colors.primary[100] }}
                  >
                    <Ionicons name="print-outline" size={18} color={Colors.primary[700]} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setShowDetailModal(false);
                      setSelectedRecord(null);
                    }}
                    className="h-8 w-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: Colors.error[100] }}
                  >
                    <Ionicons name="close" size={20} color={Colors.error[700]} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Modal Content */}
              <ScrollView 
                className="flex-1"
                contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}
              >
                <View className="space-y-4">
                  {/* Doctor Info */}
                  <Card className="p-3" style={{ backgroundColor: Colors.primary[50] }}>
                    <View className="flex-row items-center gap-2 mb-2">
                      <Ionicons name="person" size={16} color={Colors.primary[700]} />
                      <Text className="text-sm font-semibold" style={{ color: Colors.primary[700] }}>
                        Thông tin bác sĩ
                      </Text>
                    </View>
                    <Text className="text-sm font-medium" style={{ color: theme.text.primary }}>
                      {extractDoctorName(selectedRecord.doctorId)}
                    </Text>
                    {typeof selectedRecord.doctorId === 'object' && selectedRecord.doctorId?.specialty && (
                      <Text className="text-xs mt-1" style={{ color: theme.text.secondary }}>
                        {selectedRecord.doctorId.specialty}
                      </Text>
                    )}
                  </Card>

                  {/* Chief Complaint */}
                  {selectedRecord.chiefComplaint && (
                    <Card className="p-3" style={{ backgroundColor: Colors.warning[50] }}>
                      <View className="flex-row items-center gap-2 mb-2">
                        <Ionicons name="alert-circle" size={16} color={Colors.warning[700]} />
                        <Text className="text-sm font-semibold" style={{ color: Colors.warning[700] }}>
                          Lý do khám
                        </Text>
                      </View>
                      <Text className="text-sm" style={{ color: theme.text.primary }}>
                        {selectedRecord.chiefComplaint}
                      </Text>
                    </Card>
                  )}

                  {/* Diagnosis Groups or Diagnosis */}
                  {selectedRecord.diagnosisGroups && selectedRecord.diagnosisGroups.length > 0 ? (
                    <View className="space-y-2">
                      <View className="flex-row items-center gap-2 mb-1">
                        <Ionicons name="clipboard" size={16} color={Colors.primary[700]} />
                        <Text className="text-sm font-semibold" style={{ color: Colors.primary[700] }}>
                          Chẩn đoán
                        </Text>
                      </View>
                      {selectedRecord.diagnosisGroups.map((group, index) => (
                        <Card 
                          key={index}
                          className="p-3" 
                          style={{ 
                            backgroundColor: Colors.primary[50],
                            borderLeftWidth: 3,
                            borderLeftColor: Colors.primary[600]
                          }}
                        >
                          <View className="flex-row items-start gap-2">
                            <View 
                              className="h-5 w-5 rounded-full items-center justify-center"
                              style={{ backgroundColor: Colors.primary[600] }}
                            >
                              <Text className="text-[10px] font-bold text-white">
                                {index + 1}
                              </Text>
                            </View>
                            <View className="flex-1">
                              <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>
                                {group.diagnosis}
                              </Text>
                              {group.treatmentPlans && group.treatmentPlans.length > 0 && (
                                <View className="mt-2 space-y-1">
                                  <Text className="text-xs font-medium" style={{ color: theme.text.secondary }}>
                                    Phương pháp điều trị:
                                  </Text>
                                  {group.treatmentPlans.map((plan, planIdx) => (
                                    <Text 
                                      key={planIdx} 
                                      className="text-xs ml-2"
                                      style={{ color: theme.text.primary }}
                                    >
                                      • {plan}
                                    </Text>
                                  ))}
                                </View>
                              )}
                            </View>
                          </View>
                        </Card>
                      ))}
                    </View>
                  ) : selectedRecord.diagnosis ? (
                    <Card className="p-3" style={{ 
                      backgroundColor: Colors.primary[50],
                      borderLeftWidth: 3,
                      borderLeftColor: Colors.primary[600]
                    }}>
                      <View className="flex-row items-center gap-2 mb-2">
                        <Ionicons name="clipboard" size={16} color={Colors.primary[700]} />
                        <Text className="text-sm font-semibold" style={{ color: Colors.primary[700] }}>
                          Chẩn đoán
                        </Text>
                      </View>
                      <Text className="text-sm" style={{ color: theme.text.primary }}>
                        {selectedRecord.diagnosis}
                      </Text>
                    </Card>
                  ) : null}

                  {/* Treatment Plan */}
                  {selectedRecord.treatmentPlan && (
                    <Card className="p-3" style={{ backgroundColor: Colors.success[50] }}>
                      <View className="flex-row items-center gap-2 mb-2">
                        <Ionicons name="checkmark-circle" size={16} color={Colors.success[700]} />
                        <Text className="text-sm font-semibold" style={{ color: Colors.success[700] }}>
                          Kế hoạch điều trị
                        </Text>
                      </View>
                      <Text className="text-sm" style={{ color: theme.text.primary }}>
                        {selectedRecord.treatmentPlan}
                      </Text>
                    </Card>
                  )}

                  {/* Medications */}
                  {(() => {
                    let meds: (MedicalRecordMedication | string)[] = [];
                    if (selectedRecord.detailedMedications && selectedRecord.detailedMedications.length > 0) {
                      meds = selectedRecord.detailedMedications;
                    } else if (selectedRecord.medications && selectedRecord.medications.length > 0) {
                      meds = selectedRecord.medications;
                    }
                    
                    if (meds.length === 0) return null;
                    
                    return (
                      <View className="space-y-2">
                        <View className="flex-row items-center gap-2">
                          <Ionicons name="medkit" size={16} color={Colors.success[700]} />
                          <Text className="text-sm font-semibold" style={{ color: Colors.success[700] }}>
                            Thuốc kê đơn ({meds.length})
                          </Text>
                        </View>
                        {meds.map((med, index) => {
                          if (typeof med === 'string') {
                            return (
                              <Card key={index} className="p-3" style={{ backgroundColor: Colors.success[50] }}>
                                <Text className="text-sm font-medium" style={{ color: theme.text.primary }}>
                                  {index + 1}. {med}
                                </Text>
                              </Card>
                            );
                          }
                          const medObj = med as MedicalRecordMedication;
                          return (
                            <Card key={index} className="p-3" style={{ backgroundColor: Colors.success[50] }}>
                              <Text className="text-sm font-semibold mb-1" style={{ color: theme.text.primary }}>
                                {index + 1}. {medObj.name}
                              </Text>
                              {(medObj.dosage || medObj.frequency || medObj.duration) && (
                                <Text className="text-xs" style={{ color: theme.text.secondary }}>
                                  {[medObj.dosage, medObj.frequency, medObj.duration].filter(Boolean).join(' • ')}
                                </Text>
                              )}
                              {medObj.instructions && (
                                <Text className="text-xs mt-1 italic" style={{ color: theme.text.secondary }}>
                                  💊 {medObj.instructions}
                                </Text>
                              )}
                            </Card>
                          );
                        })}
                      </View>
                    );
                  })()}

                  {/* Procedures */}
                  {selectedRecord.procedures && selectedRecord.procedures.length > 0 && (
                    <View className="space-y-2">
                      <View className="flex-row items-center gap-2">
                        <Ionicons name="build" size={16} color={Colors.primary[700]} />
                        <Text className="text-sm font-semibold" style={{ color: Colors.primary[700] }}>
                          Thủ thuật ({selectedRecord.procedures.length})
                        </Text>
                      </View>
                      {selectedRecord.procedures.map((proc, index) => (
                        <Card key={index} className="p-3">
                          <Text className="text-sm font-semibold mb-1" style={{ color: theme.text.primary }}>
                            {index + 1}. {proc.name ?? 'Thủ thuật'}
                          </Text>
                          {proc.description && (
                            <Text className="text-xs mb-1" style={{ color: theme.text.secondary }}>
                              {proc.description}
                            </Text>
                          )}
                          <View className="flex-row items-center justify-between mt-1">
                            {proc.date && (
                              <Text className="text-xs" style={{ color: theme.text.secondary }}>
                                {formatDate(proc.date)}
                              </Text>
                            )}
                            {proc.cost && (
                              <Text className="text-xs font-semibold" style={{ color: Colors.primary[700] }}>
                                {typeof proc.cost === 'number' 
                                  ? proc.cost.toLocaleString('vi-VN')
                                  : proc.cost} VNĐ
                              </Text>
                            )}
                          </View>
                        </Card>
                      ))}
                    </View>
                  )}

                  {/* Notes */}
                  {selectedRecord.notes && (
                    <Card className="p-3" style={{ backgroundColor: Colors.warning[50] }}>
                      <View className="flex-row items-center gap-2 mb-2">
                        <Ionicons name="document-text" size={16} color={Colors.warning[700]} />
                        <Text className="text-sm font-semibold" style={{ color: Colors.warning[700] }}>
                          Ghi chú
                        </Text>
                      </View>
                      <Text className="text-sm" style={{ color: theme.text.primary }}>
                        {selectedRecord.notes}
                      </Text>
                    </Card>
                  )}

                  {/* Follow Up */}
                  {selectedRecord.isFollowUpRequired && selectedRecord.followUpDate && (
                    <Card className="p-3" style={{ 
                      backgroundColor: Colors.error[50],
                      borderWidth: 1,
                      borderColor: Colors.error[200]
                    }}>
                      <View className="flex-row items-center gap-2 mb-2">
                        <Ionicons name="time" size={16} color={Colors.error[700]} />
                        <Text className="text-sm font-semibold" style={{ color: Colors.error[700] }}>
                          Lịch tái khám
                        </Text>
                      </View>
                      <Text className="text-sm font-medium" style={{ color: theme.text.primary }}>
                        {formatDate(selectedRecord.followUpDate)} {selectedRecord.followUpTime ? `• ${selectedRecord.followUpTime}` : ''}
                      </Text>
                    </Card>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      <PolicyModal visible={showPolicyModal} onClose={() => setShowPolicyModal(false)} />
    </>
  );
}
