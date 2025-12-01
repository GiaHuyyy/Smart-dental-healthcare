import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    Share,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

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

export default function RecordDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const token = session?.token ?? '';

  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadRecord = useCallback(async () => {
    if (!id || !token) return;

    setLoading(true);
    try {
      const response = await apiRequest<MedicalRecord>(`/medical-records/${id}`, {
        token,
      });
      setRecord(response.data ?? null);
      setErrorMessage(null);
    } catch (error) {
      setRecord(null);
      setErrorMessage(formatApiError(error, 'Không thể tải chi tiết hồ sơ.'));
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    void loadRecord();
  }, [loadRecord]);

  const buildRecordText = useCallback(() => {
    if (!record) return '';
    let content = `HỒ SƠ ĐIỀU TRỊ\n`;
    content += `Ngày: ${formatDateTime(record.recordDate)}\n`;
    content += `═══════════════════════════════════════\n\n`;

    content += `THÔNG TIN BÁC SĨ\n`;
    content += `Họ và tên: ${extractDoctorName(record.doctorId)}\n`;
    if (typeof record.doctorId === 'object' && record.doctorId?.specialty) {
      content += `Chuyên khoa: ${record.doctorId.specialty}\n`;
    }
    content += `\n`;

    if (record.chiefComplaint) {
      content += `LÝ DO KHÁM\n${record.chiefComplaint}\n\n`;
    }

    // Diagnosis Groups or single diagnosis
    if (record.diagnosisGroups && record.diagnosisGroups.length > 0) {
      content += `CHẨN ĐOÁN (${record.diagnosisGroups.length} nhóm)\n`;
      record.diagnosisGroups.forEach((group, index) => {
        content += `${index + 1}. ${group.diagnosis}\n`;
        if (group.treatmentPlans && group.treatmentPlans.length > 0) {
          content += `   Phương pháp điều trị:\n`;
          group.treatmentPlans.forEach((plan) => {
            content += `   → ${plan}\n`;
          });
        }
      });
      content += `\n`;
    } else if (record.diagnosis) {
      content += `CHẨN ĐOÁN\n${record.diagnosis}\n\n`;
    }

    if (record.treatmentPlan) {
      content += `KẾ HOẠCH ĐIỀU TRỊ\n${record.treatmentPlan}\n\n`;
    }

    // Medications
    let meds: (MedicalRecordMedication | string)[] = [];
    if (record.detailedMedications && record.detailedMedications.length > 0) {
      meds = record.detailedMedications;
    } else if (record.medications && record.medications.length > 0) {
      const firstItem = record.medications[0];
      if (typeof firstItem === 'string') {
        meds = record.medications as string[];
      } else {
        meds = record.medications as MedicalRecordMedication[];
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
    if (record.procedures && record.procedures.length > 0) {
      content += `THỦ THUẬT ĐÃ THỰC HIỆN (${record.procedures.length})\n`;
      record.procedures.forEach((proc, index) => {
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

    if (record.notes) {
      content += `GHI CHÚ\n${record.notes}\n\n`;
    }

    if (record.isFollowUpRequired) {
      content += `THÔNG TIN TÁI KHÁM\n`;
      content += `Cần tái khám\n`;
      if (record.followUpDate) {
        content += `Ngày tái khám: ${formatDate(record.followUpDate)} ${record.followUpTime ? `• ${record.followUpTime}` : ''}\n`;
      }
      content += `\n`;
    }

    content += `═══════════════════════════════════════\n`;
    content += `Smart Dental Healthcare\n`;
    content += `Ngày in: ${new Date().toLocaleString('vi-VN')}\n`;
    return content;
  }, [record]);

  const handleShareRecord = useCallback(async () => {
    if (!record) return;
    try {
      const content = buildRecordText();
      await Share.share({
        message: content,
        title: `Hồ sơ điều trị - ${formatDate(record.recordDate)}`,
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Lỗi', 'Không thể chia sẻ hồ sơ. Vui lòng thử lại sau.');
    }
  }, [buildRecordText, record]);

  const handlePrintRecord = useCallback(() => {
    if (Platform.OS === 'web') {
      try {
        // On web, simply trigger browser print dialog
        // Optionally, could open a print-optimized route
        window.print?.();
      } catch (error) {
        console.error('Web print error:', error);
        Alert.alert('Lỗi', 'Không thể in trên trình duyệt.');
      }
    } else {
      // On native, inform user to use Share for exporting
      Alert.alert(
        'In hồ sơ',
        'Tính năng in chưa hỗ trợ trên thiết bị di động. Vui lòng sử dụng nút Chia sẻ để gửi hoặc lưu hồ sơ.',
        [
          { text: 'Chia sẻ', onPress: () => void handleShareRecord() },
          { text: 'Đóng', style: 'cancel' },
        ]
      );
    }
  }, [handleShareRecord]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
        <ActivityIndicator color={Colors.primary[600]} size="large" />
        <Text className="mt-4 text-sm" style={{ color: theme.text.secondary }}>
          Đang tải chi tiết...
        </Text>
      </View>
    );
  }

  if (errorMessage || !record) {
    return (
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        <View className="flex-row items-center justify-between p-4 border-b" style={{ borderBottomColor: theme.border }}>
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center gap-2"
          >
            <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
            <Text className="text-base font-semibold" style={{ color: theme.text.primary }}>
              Quay lại
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-1 items-center justify-center px-6">
          <Card className="w-full p-6 items-center">
            <Ionicons name="alert-circle-outline" size={48} color={Colors.error[500]} />
            <Text className="mt-4 text-lg font-semibold" style={{ color: theme.text.primary }}>
              Không thể tải hồ sơ
            </Text>
            <Text className="mt-2 text-sm text-center" style={{ color: theme.text.secondary }}>
              {errorMessage ?? 'Vui lòng thử lại sau.'}
            </Text>
            <TouchableOpacity
              className="mt-6 rounded-2xl px-6 py-3"
              style={{ backgroundColor: Colors.primary[600] }}
              onPress={() => void loadRecord()}
            >
              <Text className="text-sm font-semibold text-white">Thử lại</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 border-b" style={{ borderBottomColor: theme.border }}>
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center gap-2"
        >
          <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
          <View>
            <Text className="text-base font-semibold" style={{ color: theme.text.primary }}>
              Chi tiết hồ sơ điều trị
            </Text>
            <Text className="text-xs" style={{ color: theme.text.secondary }}>
              {formatDateTime(record.recordDate)}
            </Text>
          </View>
        </TouchableOpacity>

        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={handleShareRecord}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: Colors.primary[100] }}
          >
            <Ionicons name="share-social-outline" size={20} color={Colors.primary[700]} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handlePrintRecord}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: Colors.primary[100] }}
          >
            <Ionicons name="print-outline" size={20} color={Colors.primary[700]} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="space-y-6">
          {/* Doctor Info */}
          <Card className="p-4" style={{ backgroundColor: Colors.primary[50], borderWidth: 1, borderColor: Colors.primary[100] }}>
            <Text className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>
              Thông tin bác sĩ
            </Text>
            <View className="space-y-3">
              <View>
                <Text className="text-xs font-semibold mb-1" style={{ color: theme.text.secondary }}>
                  Họ và tên:
                </Text>
                <Text className="text-base font-medium" style={{ color: theme.text.primary }}>
                  {extractDoctorName(record.doctorId)}
                </Text>
              </View>
              {typeof record.doctorId === 'object' && record.doctorId?.specialty && (
                <View>
                  <Text className="text-xs font-semibold mb-1" style={{ color: theme.text.secondary }}>
                    Chuyên khoa:
                  </Text>
                  <Text className="text-base font-medium" style={{ color: theme.text.primary }}>
                    {record.doctorId.specialty}
                  </Text>
                </View>
              )}
            </View>
          </Card>

          {/* Vital Signs */}
          {record.vitalSigns && (
            <Card className="p-4">
              <Text className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>
                Dấu hiệu sinh tồn
              </Text>
              <View className="space-y-3">
                {record.vitalSigns.bloodPressure && (
                  <View>
                    <Text className="text-xs font-semibold mb-1" style={{ color: theme.text.secondary }}>
                      Huyết áp:
                    </Text>
                    <Text className="text-base font-medium" style={{ color: theme.text.primary }}>
                      {record.vitalSigns.bloodPressure}
                    </Text>
                  </View>
                )}
                {record.vitalSigns.heartRate && (
                  <View>
                    <Text className="text-xs font-semibold mb-1" style={{ color: theme.text.secondary }}>
                      Nhịp tim:
                    </Text>
                    <Text className="text-base font-medium" style={{ color: theme.text.primary }}>
                      {record.vitalSigns.heartRate} bpm
                    </Text>
                  </View>
                )}
                {record.vitalSigns.temperature && (
                  <View>
                    <Text className="text-xs font-semibold mb-1" style={{ color: theme.text.secondary }}>
                      Nhiệt độ:
                    </Text>
                    <Text className="text-base font-medium" style={{ color: theme.text.primary }}>
                      {record.vitalSigns.temperature}°C
                    </Text>
                  </View>
                )}
              </View>
            </Card>
          )}

          {/* Clinical Information */}
          <View className="space-y-4">
            <Text className="text-lg font-semibold" style={{ color: theme.text.primary }}>
              Thông tin lâm sàng
            </Text>

            {record.chiefComplaint && (
              <Card className="p-4" style={{ backgroundColor: Colors.primary[50] }}>
                <Text className="text-sm font-semibold mb-2" style={{ color: theme.text.primary }}>
                  Lý do khám
                </Text>
                <Text className="text-base" style={{ color: theme.text.primary }}>
                  {record.chiefComplaint}
                </Text>
              </Card>
            )}

            {/* Diagnosis - Support diagnosisGroups or fallback to diagnosis */}
            {record.diagnosisGroups && record.diagnosisGroups.length > 0 ? (
              <View className="space-y-3">
                <Text className="text-sm font-semibold" style={{ color: Colors.primary[700] }}>
                  Chẩn đoán
                </Text>
                {record.diagnosisGroups.map((group, index) => (
                  <Card 
                    key={index}
                    className="p-4" 
                    style={{ 
                      backgroundColor: Colors.primary[50], 
                      borderWidth: 1, 
                      borderColor: Colors.primary[100], 
                      borderLeftWidth: 4, 
                      borderLeftColor: Colors.primary[600] 
                    }}
                  >
                    <View className="flex-row items-start gap-2 mb-2">
                      <View 
                        className="h-6 w-6 rounded-full items-center justify-center"
                        style={{ backgroundColor: Colors.primary[100] }}
                      >
                        <Text className="text-xs font-bold" style={{ color: Colors.primary[700] }}>
                          {index + 1}
                        </Text>
                      </View>
                      <Text className="flex-1 text-base font-semibold" style={{ color: theme.text.primary }}>
                        {group.diagnosis}
                      </Text>
                    </View>
                    
                    {group.treatmentPlans && group.treatmentPlans.length > 0 && (
                      <View className="mt-2 ml-8">
                        <Text className="text-xs font-semibold mb-2" style={{ color: theme.text.secondary }}>
                          Phương pháp điều trị:
                        </Text>
                        {group.treatmentPlans.map((plan, planIndex) => (
                          <View key={planIndex} className="flex-row items-start gap-2 mb-1">
                            <Text className="text-base" style={{ color: Colors.primary[600] }}>•</Text>
                            <Text className="flex-1 text-sm" style={{ color: theme.text.primary }}>
                              {plan}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </Card>
                ))}
              </View>
            ) : (
              <Card className="p-4" style={{ 
                backgroundColor: Colors.primary[50], 
                borderWidth: 1, 
                borderColor: Colors.primary[100], 
                borderLeftWidth: 4, 
                borderLeftColor: Colors.primary[600] 
              }}>
                <Text className="text-sm font-semibold mb-2" style={{ color: Colors.primary[700] }}>
                  Chẩn đoán
                </Text>
                {record.diagnosis ? (
                  <Text className="text-base font-medium" style={{ color: theme.text.primary }}>
                    {record.diagnosis}
                  </Text>
                ) : (
                  <Text className="text-base italic" style={{ color: Colors.error[500] }}>
                    Chưa có chẩn đoán
                  </Text>
                )}
              </Card>
            )}

            {record.treatmentPlan && (
              <Card className="p-4" style={{ 
                backgroundColor: Colors.success[50], 
                borderWidth: 1, 
                borderColor: Colors.success[100] 
              }}>
                <Text className="text-sm font-semibold mb-2" style={{ color: Colors.success[700] }}>
                  Kế hoạch điều trị
                </Text>
                <Text className="text-base" style={{ color: theme.text.primary }}>
                  {record.treatmentPlan}
                </Text>
              </Card>
            )}
          </View>

          {/* Medications */}
          {(() => {
            let meds: (MedicalRecordMedication | string)[] = [];
            
            if (record.detailedMedications && record.detailedMedications.length > 0) {
              meds = record.detailedMedications;
            } else if (record.medications && record.medications.length > 0) {
              const firstItem = record.medications[0];
              if (typeof firstItem === 'string') {
                meds = record.medications as string[];
              } else {
                meds = record.medications as MedicalRecordMedication[];
              }
            }
            
            if (meds.length === 0) return null;
            
            return (
              <View className="space-y-4">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="medkit-outline" size={20} color={Colors.primary[600]} />
                  <Text className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                    Thuốc được kê ({meds.length})
                  </Text>
                </View>
                <View className="space-y-3">
                  {meds.map((med, index) => {
                    if (typeof med === 'string') {
                      return (
                        <Card key={`${med}-${index}`} className="p-4" style={{ backgroundColor: Colors.primary[50] }}>
                          <Text className="text-base font-semibold" style={{ color: theme.text.primary }}>
                            {med}
                          </Text>
                        </Card>
                      );
                    }
                    
                    const medObj = med as MedicalRecordMedication;
                    return (
                      <Card key={`${medObj.name ?? index}-${index}`} className="p-4" style={{ backgroundColor: Colors.primary[50] }}>
                        <Text className="text-base font-semibold mb-3" style={{ color: theme.text.primary }}>
                          {medObj.name ?? 'Thuốc'}
                        </Text>
                        <View className="space-y-2">
                          {medObj.dosage && (
                            <View>
                              <Text className="text-xs font-semibold" style={{ color: theme.text.secondary }}>
                                Liều lượng: {medObj.dosage}
                              </Text>
                            </View>
                          )}
                          {medObj.frequency && (
                            <View>
                              <Text className="text-xs font-semibold" style={{ color: theme.text.secondary }}>
                                Tần suất: {medObj.frequency}
                              </Text>
                            </View>
                          )}
                          {medObj.duration && (
                            <View>
                              <Text className="text-xs font-semibold" style={{ color: theme.text.secondary }}>
                                Thời gian: {medObj.duration}
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

          {/* Procedures */}
          {record.procedures && record.procedures.length > 0 && (
            <View className="space-y-4">
              <Text className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                Thủ thuật đã thực hiện ({record.procedures.length})
              </Text>
              <View className="space-y-3">
                {record.procedures.map((procedure, index) => (
                  <Card key={`${procedure.name ?? index}-${index}`} className="p-4">
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-base font-semibold flex-1 pr-3" style={{ color: theme.text.primary }}>
                        {procedure.name ?? 'Thủ thuật'}
                      </Text>
                      {procedure.cost && (
                        <Text className="text-sm font-semibold" style={{ color: Colors.primary[600] }}>
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
          {record.notes && (
            <Card className="p-4" style={{ backgroundColor: Colors.warning[50], borderWidth: 1, borderColor: Colors.warning[100] }}>
              <Text className="text-sm font-semibold mb-2" style={{ color: Colors.warning[700] }}>
                Ghi chú
              </Text>
              <Text className="text-base" style={{ color: theme.text.primary }}>
                {record.notes}
              </Text>
            </Card>
          )}

          {/* Follow-up */}
          {record.isFollowUpRequired && (
            <Card className="p-4" style={{ backgroundColor: Colors.error[50], borderWidth: 1, borderColor: Colors.error[100] }}>
              <View className="flex-row items-center gap-2 mb-2">
                <Ionicons name="alert-circle-outline" size={18} color={Colors.error[700]} />
                <Text className="text-sm font-semibold" style={{ color: Colors.error[700] }}>
                  Cần tái khám
                </Text>
              </View>
              {record.followUpDate && (
                <Text className="text-base mt-1" style={{ color: Colors.error[700] }}>
                  Ngày tái khám: {formatDate(record.followUpDate)} {record.followUpTime ? `• ${record.followUpTime}` : ''}
                </Text>
              )}
            </Card>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
