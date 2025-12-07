/**
 * Patient Detail Modal
 * Modal hiển thị chi tiết thông tin bệnh nhân với progressive loading
 */
import { Colors } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Linking,
    Modal,
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface Patient {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female';
  address?: string;
  isActive: boolean;
  createdAt: string;
}

interface Appointment {
  _id: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  appointmentType?: string;
  status: string;
  duration?: number;
}

interface Prescription {
  _id: string;
  createdAt: string;
  patientId?: any;
  doctorId?: any;
  appointmentId?: any;
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  diagnosis?: string;
  notes?: string;
  status?: string;
}

interface MedicalRecord {
  _id: string;
  createdAt: string;
  patientId?: any;
  doctorId?: any;
  recordDate?: string;
  chiefComplaint?: string;
  diagnosis?: string;
  treatmentPlan?: string;
  procedures?: Array<{
    name: string;
    description?: string;
    date?: string;
    cost?: number;
  }>;
  medications?: string[];
  notes?: string;
  status?: string;
}

interface PatientStats {
  appointments: Appointment[];
  prescriptions: Prescription[];
  medicalRecords: MedicalRecord[];
  lastVisitDate?: string;
  nextAppointment?: Appointment;
  paymentStats: {
    totalPaid: number;
    paid: number;
    unpaid: number;
  };
}

interface PatientDetailModalProps {
  visible: boolean;
  onClose: () => void;
  patientId: string;
  token: string;
}

type TabType = 'overview' | 'appointments' | 'medical-records';

export default function PatientDetailModal({
  visible,
  onClose,
  patientId,
  token,
}: PatientDetailModalProps) {
  const theme = Colors.light;

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [patientLoading, setPatientLoading] = useState(true);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [stats, setStats] = useState<PatientStats>({
    appointments: [],
    prescriptions: [],
    medicalRecords: [],
    paymentStats: { totalPaid: 0, paid: 0, unpaid: 0 },
  });
  
  // State cho modal chi tiết hồ sơ
  const [selectedMedicalRecord, setSelectedMedicalRecord] = useState<MedicalRecord | null>(null);
  const [medicalRecordModalVisible, setMedicalRecordModalVisible] = useState(false);

  useEffect(() => {
    if (visible && patientId) {
      fetchPatientData();
    }
  }, [visible, patientId]);

  const fetchPatientData = async () => {
    try {
      const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.51.8:8081';
      const API_URL = BASE_URL.endsWith('/api/v1') ? BASE_URL : `${BASE_URL}/api/v1`;
      console.log('🔍 [PatientDetail] Fetching data for:', patientId);

      // Fetch patient info first (most important)
      const fetchPatient = async () => {
        try {
          setPatientLoading(true);
          const patientRes = await fetch(`${API_URL}/users/${patientId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const patientData = await patientRes.json();
          setPatient(patientData);
          console.log('✅ [PatientDetail] Patient loaded:', patientData?.fullName);
        } catch (error) {
          console.error('❌ [PatientDetail] Patient error:', error);
        } finally {
          setPatientLoading(false);
        }
      };

      // Fetch appointments
      const fetchAppointments = async () => {
        try {
          setAppointmentsLoading(true);
          const appointmentsRes = await fetch(`${API_URL}/appointments/patient/${patientId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const appointmentsData = await appointmentsRes.json();
          const appointments = Array.isArray(appointmentsData) 
            ? appointmentsData 
            : (appointmentsData?.data || appointmentsData?.appointments || []);

          // Calculate stats from appointments
          const lastVisit = Array.isArray(appointments) ? appointments
            .filter((a: Appointment) => a.status === 'completed')
            .sort((a: Appointment, b: Appointment) =>
              new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()
            )[0] : undefined;

          const nextAppointment = Array.isArray(appointments) ? appointments
            .filter((a: Appointment) =>
              ['pending', 'confirmed'].includes(a.status) &&
              new Date(a.appointmentDate) >= new Date()
            )
            .sort((a: Appointment, b: Appointment) =>
              new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()
            )[0] : undefined;

          const paid = Array.isArray(appointments) 
            ? appointments.filter((a: Appointment) => a.status === 'completed').length 
            : 0;
          const unpaid = Array.isArray(appointments)
            ? appointments.filter((a: Appointment) => a.status === 'pending').length
            : 0;

          setStats(prev => ({
            ...prev,
            appointments: Array.isArray(appointments) ? appointments : [],
            lastVisitDate: lastVisit?.appointmentDate,
            nextAppointment,
            paymentStats: {
              totalPaid: paid * 500000,
              paid,
              unpaid,
            },
          }));
          console.log('✅ [PatientDetail] Appointments loaded:', appointments?.length || 0);
        } catch (error) {
          console.error('❌ [PatientDetail] Appointments error:', error);
        } finally {
          setAppointmentsLoading(false);
        }
      };

      // Fetch medical records
      const fetchRecords = async () => {
        try {
          setRecordsLoading(true);
          
          // Use /medical-records/patient/:patientId instead of query param to avoid 500 error
          const recordsRes = await fetch(`${API_URL}/medical-records/patient/${patientId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          let medicalRecordsData = [];
          if (recordsRes.ok) {
            medicalRecordsData = await recordsRes.json();
          } else {
            const errorText = await recordsRes.text();
            console.warn(`⚠️ [PatientDetail] Medical records error (${recordsRes.status}):`, errorText);
          }

          const medicalRecords = Array.isArray(medicalRecordsData)
            ? medicalRecordsData
            : (medicalRecordsData?.data || medicalRecordsData?.records || []);

          setStats(prev => ({
            ...prev,
            medicalRecords: Array.isArray(medicalRecords) ? medicalRecords : [],
          }));
          console.log('✅ [PatientDetail] Medical records loaded:', medicalRecords?.length || 0);
        } catch (error) {
          console.error('❌ [PatientDetail] Medical records error:', error);
        } finally {
          setRecordsLoading(false);
        }
      };

      // Progressive loading: patient first, then parallel fetch other data
      await fetchPatient();
      
      // Load appointments in parallel
      Promise.all([fetchAppointments()]);
      
      // Delay medical records slightly
      setTimeout(() => {
        fetchRecords();
      }, 300);

    } catch (error) {
      console.error('❌ [PatientDetail] Error:', error);
      setPatientLoading(false);
      setAppointmentsLoading(false);
      setRecordsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? Colors.success[500] : Colors.gray[400];
  };

  const getAppointmentStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return Colors.primary[600];
      case 'completed':
        return Colors.success[500];
      case 'cancelled':
        return Colors.error[500];
      default:
        return Colors.warning[500];
    }
  };

  const getAppointmentStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Đã xác nhận';
      case 'completed':
        return 'Hoàn thành';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return 'Chờ xác nhận';
    }
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  // Skeleton component for loading states
  const SkeletonBox = ({ width, height }: { width: number | string; height: number }) => (
    <View
      className="rounded-lg"
      style={
        {
          width,
          height,
          backgroundColor: Colors.gray[200],
          opacity: 0.6,
        } as any
      }
    />
  );

  const tabs = [
    { id: 'overview' as TabType, label: 'Tổng quan', icon: 'person-outline' },
    { id: 'appointments' as TabType, label: 'Lịch khám', icon: 'calendar-outline' },
    { id: 'medical-records' as TabType, label: 'Hồ sơ bệnh án', icon: 'document-text-outline' },
  ];

  if (!visible) return null;

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={{ flex: 1, backgroundColor: Colors.gray[50] }}>
          {/* Header */}
          <View className="px-4 pt-4 pb-3 border-b border-gray-200 bg-white">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center flex-1" style={{ gap: 12 }}>
                <View
                  className="w-12 h-12 rounded-full items-center justify-center"
                  style={{ backgroundColor: Colors.primary[100] }}
                >
                  <Text className="text-lg font-bold" style={{ color: Colors.primary[700] }}>
                    {patient?.fullName?.charAt(0).toUpperCase() || 'P'}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
                    {patient?.fullName || 'Đang tải...'}
                  </Text>
                  {patient?.dateOfBirth && patient?.gender && (
                    <Text className="text-sm text-gray-500 mt-0.5">
                      {calculateAge(patient.dateOfBirth)} tuổi - {patient.gender === 'male' ? 'Nam' : 'Nữ'}
                    </Text>
                  )}
                </View>
              </View>
              <Pressable
                onPress={onClose}
                className="w-9 h-9 items-center justify-center rounded-full bg-gray-100 active:opacity-70"
              >
                <Ionicons name="close" size={22} color={Colors.gray[700]} />
              </Pressable>
            </View>

            {/* Tabs */}
            <View className="flex-row border-b border-gray-100">
              {tabs.map((tab) => (
                <Pressable
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  className="flex-1 pb-2.5 border-b-2"
                  style={{
                    borderBottomColor: activeTab === tab.id ? Colors.primary[600] : 'transparent',
                  }}
                >
                  <View className="items-center" style={{ gap: 4 }}>
                    <Ionicons
                      name={tab.icon as any}
                      size={18}
                      color={activeTab === tab.id ? Colors.primary[600] : Colors.gray[400]}
                    />
                    <Text
                      className="text-[11px] font-medium"
                      style={{
                        color: activeTab === tab.id ? Colors.primary[600] : Colors.gray[500],
                      }}
                    >
                      {tab.label}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Content */}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View className="p-4">
              {/* TAB: OVERVIEW */}
              {activeTab === 'overview' && (
                <View style={{ gap: 12 }}>
                  {/* Quick Stats */}
                  {appointmentsLoading || recordsLoading ? (
                    <View className="flex-row" style={{ gap: 12 }}>
                      <View className="flex-1">
                        <SkeletonBox width="100%" height={80} />
                      </View>
                      <View className="flex-1">
                        <SkeletonBox width="100%" height={80} />
                      </View>
                    </View>
                  ) : (
                    <View className="flex-row" style={{ gap: 12 }}>
                      <View className="flex-1 rounded-xl p-4 items-center" style={{ backgroundColor: Colors.primary[50] }}>
                        <Text className="text-xs text-gray-600 mb-1">Lịch khám</Text>
                        <Text className="text-2xl font-bold" style={{ color: Colors.primary[700] }}>
                          {stats.appointments.length}
                        </Text>
                      </View>
                      <View className="flex-1 rounded-xl p-4 items-center" style={{ backgroundColor: Colors.warning[50] }}>
                        <Text className="text-xs text-gray-600 mb-1">Hồ sơ bệnh án</Text>
                        <Text className="text-2xl font-bold" style={{ color: Colors.warning[700] }}>
                          {stats.medicalRecords.length}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Contact Info */}
                  {patientLoading ? (
                    <SkeletonBox width="100%" height={140} />
                  ) : patient ? (
                    <View className="rounded-xl p-4 bg-white border border-gray-100">
                      <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Thông tin liên hệ</Text>
                      <View style={{ gap: 12 }}>
                        <View className="flex-row items-center" style={{ gap: 12 }}>
                          <View className="w-8 h-8 rounded-lg items-center justify-center bg-gray-50">
                            <Ionicons name="mail-outline" size={16} color={Colors.gray[600]} />
                          </View>
                          <Text className="text-sm text-gray-900 flex-1" numberOfLines={1}>
                            {patient.email}
                          </Text>
                        </View>
                        <View className="flex-row items-center" style={{ gap: 12 }}>
                          <View className="w-8 h-8 rounded-lg items-center justify-center bg-gray-50">
                            <Ionicons name="call-outline" size={16} color={Colors.gray[600]} />
                          </View>
                          <Pressable
                            onPress={() => handleCall(patient.phone)}
                            className="flex-row items-center active:opacity-70"
                            style={{ gap: 8 }}
                          >
                            <Text className="text-sm font-medium" style={{ color: Colors.primary[600] }}>
                              {patient.phone}
                            </Text>
                            <Ionicons name="open-outline" size={14} color={Colors.primary[600]} />
                          </Pressable>
                        </View>
                        {patient.address && (
                          <View className="flex-row" style={{ gap: 12 }}>
                            <View className="w-8 h-8 rounded-lg items-center justify-center bg-gray-50">
                              <Ionicons name="location-outline" size={16} color={Colors.gray[600]} />
                            </View>
                            <Text className="text-sm text-gray-900 flex-1">{patient.address}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ) : null}

                  {/* Personal Info */}
                  {patientLoading ? (
                    <SkeletonBox width="100%" height={140} />
                  ) : patient ? (
                    <View className="rounded-xl p-4 bg-white border border-gray-100">
                      <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Thông tin cá nhân</Text>
                      <View style={{ gap: 10 }}>
                        <View className="flex-row justify-between items-center">
                          <Text className="text-sm text-gray-600">Ngày sinh</Text>
                          <Text className="text-sm font-semibold text-gray-900">
                            {patient.dateOfBirth ? formatDate(patient.dateOfBirth) : 'Chưa cập nhật'}
                          </Text>
                        </View>
                        <View className="h-px bg-gray-100" />
                        <View className="flex-row justify-between items-center">
                          <Text className="text-sm text-gray-600">Giới tính</Text>
                          <Text className="text-sm font-semibold text-gray-900">
                            {patient.gender === 'male' ? 'Nam' : patient.gender === 'female' ? 'Nữ' : 'Chưa cập nhật'}
                          </Text>
                        </View>
                        <View className="h-px bg-gray-100" />
                        <View className="flex-row justify-between items-center">
                          <Text className="text-sm text-gray-600">Trạng thái</Text>
                          <View className="flex-row items-center" style={{ gap: 8 }}>
                            <View
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: getStatusColor(patient.isActive) }}
                            />
                            <Text className="text-sm font-semibold text-gray-900">
                              {patient.isActive ? 'Hoạt động' : 'Không hoạt động'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ) : null}

                  {/* Next Appointment */}
                  {appointmentsLoading ? (
                    <SkeletonBox width="100%" height={120} />
                  ) : stats.nextAppointment ? (
                    <View className="rounded-xl p-4 bg-white border border-gray-100">
                      <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide">Lịch hẹn sắp tới</Text>
                        <View
                          className="px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: getAppointmentStatusColor(stats.nextAppointment.status) }}
                        >
                          <Text className="text-xs font-semibold text-white">
                            {getAppointmentStatusText(stats.nextAppointment.status)}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row items-center" style={{ gap: 12 }}>
                        <View 
                          className="w-12 h-12 rounded-xl items-center justify-center"
                          style={{ backgroundColor: Colors.primary[100] }}
                        >
                          <Ionicons name="calendar" size={20} color={Colors.primary[600]} />
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-bold text-gray-900">
                            {formatDate(stats.nextAppointment.appointmentDate)}
                          </Text>
                          <Text className="text-xs text-gray-600 mt-0.5">
                            {stats.nextAppointment.startTime}
                            {stats.nextAppointment.endTime && <Text> - {stats.nextAppointment.endTime}</Text>}
                            {stats.nextAppointment.appointmentType && (
                              <Text> - {stats.nextAppointment.appointmentType}</Text>
                            )}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : null}

                  {/* Medical Stats */}
                  {appointmentsLoading ? (
                    <SkeletonBox width="100%" height={180} />
                  ) : (
                    <View className="rounded-xl p-4 bg-white border border-gray-100">
                      <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Thống kê</Text>
                      <View style={{ gap: 10 }}>
                        <View className="flex-row justify-between items-center">
                          <Text className="text-sm text-gray-600">Lần khám gần nhất</Text>
                          <Text className="text-sm font-semibold text-gray-900">
                            {stats.lastVisitDate ? formatDate(stats.lastVisitDate) : 'Chưa có'}
                          </Text>
                        </View>
                        <View className="h-px bg-gray-100" />
                        <View className="flex-row justify-between items-center">
                          <Text className="text-sm text-gray-600">Tổng thanh toán</Text>
                          <Text className="text-sm font-semibold" style={{ color: Colors.success[600] }}>
                            {stats.paymentStats.totalPaid.toLocaleString('vi-VN')} đ
                          </Text>
                        </View>
                        <View className="h-px bg-gray-100" />
                        <View className="flex-row justify-between items-center">
                          <Text className="text-sm text-gray-600">Lượt thanh toán</Text>
                          <Text className="text-sm font-semibold text-gray-900">
                            {stats.paymentStats.paid} lượt
                          </Text>
                        </View>
                        {stats.paymentStats.unpaid > 0 && (
                          <>
                            <View className="h-px bg-gray-100" />
                            <View className="flex-row justify-between items-center">
                              <Text className="text-sm text-gray-600">Chưa thanh toán</Text>
                              <Text className="text-sm font-semibold" style={{ color: Colors.error[600] }}>
                                {stats.paymentStats.unpaid} lượt
                              </Text>
                            </View>
                          </>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* TAB: APPOINTMENTS */}
              {activeTab === 'appointments' && (
                <View style={{ gap: 10 }}>
                  {appointmentsLoading ? (
                    <>
                      <SkeletonBox width="100%" height={90} />
                      <SkeletonBox width="100%" height={90} />
                      <SkeletonBox width="100%" height={90} />
                    </>
                  ) : stats.appointments.length === 0 ? (
                    <View className="py-20 items-center">
                      <Ionicons name="calendar-outline" size={48} color={Colors.gray[300]} />
                      <Text className="text-sm text-gray-500 mt-3">Chưa có lịch khám</Text>
                    </View>
                  ) : (
                    stats.appointments.map((appointment) => (
                      <View
                        key={appointment._id}
                        className="rounded-xl p-4 bg-white border border-gray-100 flex-row items-center"
                        style={{ gap: 12 }}
                      >
                        <View
                          className="w-14 h-14 rounded-xl items-center justify-center"
                          style={{ backgroundColor: getAppointmentStatusColor(appointment.status) + '20' }}
                        >
                          <Text className="text-xs font-semibold" style={{ color: getAppointmentStatusColor(appointment.status) }}>
                            {appointment.startTime?.split(':').slice(0, 2).join(':')}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-gray-900">
                            {formatDate(appointment.appointmentDate)}
                          </Text>
                          <Text className="text-xs text-gray-600 mt-0.5">
                            {appointment.appointmentType || 'Khám tổng quát'}
                          </Text>
                          {appointment.duration && (
                            <Text className="text-xs text-gray-500 mt-0.5">
                              Thời gian: {appointment.duration} phút
                            </Text>
                          )}
                        </View>
                        <View
                          className="px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: getAppointmentStatusColor(appointment.status) }}
                        >
                          <Text className="text-[10px] font-semibold text-white">
                            {getAppointmentStatusText(appointment.status)}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* TAB: MEDICAL RECORDS */}
              {activeTab === 'medical-records' && (
                <View style={{ gap: 10 }}>
                  {recordsLoading ? (
                    <>
                      <SkeletonBox width="100%" height={120} />
                      <SkeletonBox width="100%" height={120} />
                      <SkeletonBox width="100%" height={120} />
                    </>
                  ) : stats.medicalRecords.length === 0 ? (
                    <View className="py-20 items-center">
                      <Ionicons name="document-text-outline" size={48} color={Colors.gray[300]} />
                      <Text className="text-sm text-gray-500 mt-3">Chưa có hồ sơ bệnh án</Text>
                    </View>
                  ) : (
                    (() => {
                      // Build hierarchy: separate parent and child records
                      const parentRecords: any[] = [];
                      const childRecordsMap = new Map<string, any[]>();

                      stats.medicalRecords.forEach((record) => {
                        const parentId = typeof record.parentRecordId === 'string' 
                          ? record.parentRecordId 
                          : record.parentRecordId?._id;

                        if (parentId) {
                          if (!childRecordsMap.has(parentId)) {
                            childRecordsMap.set(parentId, []);
                          }
                          childRecordsMap.get(parentId)!.push(record);
                        } else {
                          parentRecords.push(record);
                        }
                      });

                      // Sort parents by date (newest first)
                      parentRecords.sort((a, b) => 
                        new Date(b.recordDate || b.createdAt).getTime() - 
                        new Date(a.recordDate || a.createdAt).getTime()
                      );

                      return parentRecords.map((record) => {
                        const childRecords = childRecordsMap.get(record._id) || [];
                        const hasChildren = childRecords.length > 0;

                        return (
                          <View key={record._id}>
                            {/* Parent Record */}
                            <TouchableOpacity
                              className="rounded-xl p-3 bg-white border border-gray-200"
                              style={hasChildren ? { borderColor: Colors.primary[200] } : {}}
                              onPress={() => {
                                setSelectedMedicalRecord(record);
                                setMedicalRecordModalVisible(true);
                              }}
                              activeOpacity={0.7}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                                <View 
                                  style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 8,
                                    backgroundColor: hasChildren ? Colors.primary[100] : Colors.warning[100],
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <Ionicons 
                                    name="document-text" 
                                    size={18} 
                                    color={hasChildren ? Colors.primary[600] : Colors.warning[600]} 
                                  />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <Text className="text-sm font-bold text-gray-900">
                                      {formatDate(record.recordDate || record.createdAt)}
                                    </Text>
                                    {hasChildren && (
                                      <View style={{ backgroundColor: Colors.primary[600], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                        <Text className="text-[10px] font-bold text-white">
                                          📋 Hồ sơ gốc ({childRecords.length})
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                  {record.doctorId && (
                                    <Text className="text-xs text-gray-600" numberOfLines={1}>
                                      BS. {record.doctorId.fullName}
                                    </Text>
                                  )}
                                </View>
                              </View>

                              {/* Chief Complaint */}
                              {record.chiefComplaint && (
                                <View style={{ backgroundColor: Colors.warning[50], borderRadius: 6, padding: 8, marginBottom: 6 }}>
                                  <Text className="text-[10px] font-bold text-gray-500 uppercase mb-1">Triệu chứng</Text>
                                  <Text className="text-xs text-gray-700" numberOfLines={2}>
                                    {record.chiefComplaint}
                                  </Text>
                                </View>
                              )}

                              {/* Diagnosis */}
                              {(record.diagnosisGroups || record.diagnosis) && (
                                <View style={{ backgroundColor: Colors.primary[50], borderRadius: 6, padding: 8 }}>
                                  <Text className="text-[10px] font-bold text-gray-500 uppercase mb-1">Chẩn đoán</Text>
                                  {record.diagnosisGroups && record.diagnosisGroups.length > 0 ? (
                                    <View>
                                      {record.diagnosisGroups.slice(0, 2).map((group: any, idx: number) => (
                                        <Text key={idx} className="text-xs text-gray-700" numberOfLines={1}>
                                          • {group.diagnosis}
                                        </Text>
                                      ))}
                                      {record.diagnosisGroups.length > 2 && (
                                        <Text className="text-xs text-gray-500 mt-1">
                                          +{record.diagnosisGroups.length - 2} khác
                                        </Text>
                                      )}
                                    </View>
                                  ) : (
                                    <Text className="text-xs text-gray-700" numberOfLines={2}>
                                      {record.diagnosis}
                                    </Text>
                                  )}
                                </View>
                              )}

                              {/* Follow-up indicator */}
                              {record.isFollowUpRequired && record.followUpDate && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, backgroundColor: Colors.info[50], paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                  <Ionicons name="calendar" size={12} color={Colors.info[600]} />
                                  <Text className="text-xs" style={{ color: Colors.info[600] }}>
                                    Tái khám: {formatDate(record.followUpDate)}
                                  </Text>
                                </View>
                              )}
                            </TouchableOpacity>

                            {/* Child Records (Follow-ups) */}
                            {hasChildren && childRecords.map((childRecord: any, childIndex: number) => (
                              <TouchableOpacity
                                key={childRecord._id}
                                style={{
                                  marginLeft: 16,
                                  marginTop: 8,
                                  borderRadius: 12,
                                  padding: 12,
                                  backgroundColor: Colors.warning[50],
                                  borderWidth: 1,
                                  borderColor: Colors.warning[100]
                                }}
                                onPress={() => {
                                  setSelectedMedicalRecord(childRecord);
                                  setMedicalRecordModalVisible(true);
                                }}
                                activeOpacity={0.7}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                                  <View style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: Colors.warning[100], alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="return-down-forward" size={16} color={Colors.warning[700]} />
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                      <Text className="text-sm font-bold text-gray-900">
                                        {formatDate(childRecord.recordDate || childRecord.createdAt)}
                                      </Text>
                                      <View style={{ backgroundColor: Colors.warning[600], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                        <Text className="text-[10px] font-bold text-white">
                                          🔄 Tái khám {childIndex + 1}
                                        </Text>
                                      </View>
                                    </View>
                                    {childRecord.doctorId && (
                                      <Text className="text-xs text-gray-600" numberOfLines={1}>
                                        BS. {childRecord.doctorId.fullName}
                                      </Text>
                                    )}
                                    {childRecord.chiefComplaint && (
                                      <Text className="text-xs text-gray-600 mt-2" numberOfLines={2}>
                                        {childRecord.chiefComplaint}
                                      </Text>
                                    )}
                                  </View>
                                </View>
                              </TouchableOpacity>
                            ))}
                          </View>
                        );
                      });
                    })()
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Medical Record Detail Modal */}
      {selectedMedicalRecord && (
        <Modal
          visible={medicalRecordModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setMedicalRecordModalVisible(false)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl" style={{ maxHeight: '90%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.gray[100] }}>
                <View style={{ flex: 1 }}>
                  <Text className="text-lg font-bold text-gray-900">Chi tiết hồ sơ bệnh án</Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    Ngày khám: {selectedMedicalRecord.recordDate 
                      ? formatDate(selectedMedicalRecord.recordDate) 
                      : formatDate(selectedMedicalRecord.createdAt)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setMedicalRecordModalVisible(false)}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.gray[100], alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="close" size={20} color={Colors.gray[700]} />
                </Pressable>
              </View>

              <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
                {/* Patient & Doctor Info */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {selectedMedicalRecord.patientId && (
                    <View style={{ flex: 1, backgroundColor: Colors.gray[50], borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.gray[200] }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <Ionicons name="person" size={14} color={Colors.primary[600]} />
                        <Text className="text-xs font-bold text-gray-900">Bệnh nhân</Text>
                      </View>
                      <Text className="text-sm font-semibold text-gray-900">
                        {selectedMedicalRecord.patientId.fullName || 'N/A'}
                      </Text>
                      {selectedMedicalRecord.patientId.phone && (
                        <Text className="text-xs text-gray-600 mt-1">
                          {selectedMedicalRecord.patientId.phone}
                        </Text>
                      )}
                    </View>
                  )}
                  {selectedMedicalRecord.doctorId && (
                    <View style={{ flex: 1, backgroundColor: Colors.gray[50], borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.gray[200] }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <Ionicons name="medkit" size={14} color={Colors.primary[600]} />
                        <Text className="text-xs font-bold text-gray-900">Bác sĩ</Text>
                      </View>
                      <Text className="text-sm font-semibold text-gray-900">
                        BS. {selectedMedicalRecord.doctorId.fullName}
                      </Text>
                      {selectedMedicalRecord.doctorId.specialty && (
                        <Text className="text-xs text-gray-600 mt-1">
                          {selectedMedicalRecord.doctorId.specialty}
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                {/* Chief Complaint */}
                {selectedMedicalRecord.chiefComplaint && (
                  <View style={{ marginBottom: 16 }}>
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                      Triệu chứng
                    </Text>
                    <View style={{ backgroundColor: Colors.warning[50], borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.warning[200] }}>
                      <Text className="text-sm text-gray-900">{selectedMedicalRecord.chiefComplaint}</Text>
                    </View>
                  </View>
                )}

                {/* Diagnosis Groups (NEW format) or fallback to diagnosis */}
                {selectedMedicalRecord.diagnosisGroups && selectedMedicalRecord.diagnosisGroups.length > 0 ? (
                  <View style={{ marginBottom: 16 }}>
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                      Chẩn đoán
                    </Text>
                    <View style={{ gap: 8 }}>
                      {selectedMedicalRecord.diagnosisGroups.map((group: any, index: number) => (
                        <View key={index} style={{ backgroundColor: 'white', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.primary[200] }}>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primary[100], alignItems: 'center', justifyContent: 'center' }}>
                              <Text className="text-xs font-bold" style={{ color: Colors.primary[700] }}>
                                {index + 1}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text className="text-sm font-bold text-gray-900 mb-2">
                                {group.diagnosis}
                              </Text>
                              {group.treatmentPlans && group.treatmentPlans.length > 0 && (
                                <View>
                                  <Text className="text-xs font-semibold text-gray-600 mb-1">Phương pháp điều trị:</Text>
                                  {group.treatmentPlans.map((plan: string, planIdx: number) => (
                                    <View key={planIdx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4 }}>
                                      <Text className="text-xs text-gray-600">• {plan}</Text>
                                    </View>
                                  ))}
                                </View>
                              )}
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : selectedMedicalRecord.diagnosis ? (
                  <View style={{ marginBottom: 16 }}>
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                      Chẩn đoán
                    </Text>
                    <View style={{ backgroundColor: Colors.primary[50], borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.primary[200] }}>
                      <Text className="text-sm font-semibold" style={{ color: Colors.primary[900] }}>
                        {selectedMedicalRecord.diagnosis}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Medications - Enhanced with detailedMedications */}
                {((selectedMedicalRecord.detailedMedications && selectedMedicalRecord.detailedMedications.length > 0) ||
                  (selectedMedicalRecord.medications && selectedMedicalRecord.medications.length > 0)) && (
                  <View style={{ marginBottom: 16 }}>
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                      Danh sách thuốc
                    </Text>
                    <View style={{ gap: 8 }}>
                      {selectedMedicalRecord.detailedMedications && selectedMedicalRecord.detailedMedications.length > 0 ? (
                        // NEW format: detailedMedications
                        selectedMedicalRecord.detailedMedications.map((med: any, index: number) => (
                          <View key={index} style={{ backgroundColor: 'white', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.info[100] }}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.info[100], alignItems: 'center', justifyContent: 'center' }}>
                                <Text className="text-xs font-bold" style={{ color: Colors.info[700] }}>
                                  #{index + 1}
                                </Text>
                              </View>
                              <Text className="text-sm font-bold text-gray-900 flex-1">{med.name}</Text>
                            </View>
                            <View style={{ gap: 6 }}>
                              <View style={{ flexDirection: 'row' }}>
                                <Text className="text-xs text-gray-500" style={{ width: 80 }}>Liều lượng:</Text>
                                <Text className="text-xs font-semibold text-gray-900 flex-1">{med.dosage}</Text>
                              </View>
                              <View style={{ flexDirection: 'row' }}>
                                <Text className="text-xs text-gray-500" style={{ width: 80 }}>Tần suất:</Text>
                                <Text className="text-xs font-semibold text-gray-900 flex-1">{med.frequency}</Text>
                              </View>
                              <View style={{ flexDirection: 'row' }}>
                                <Text className="text-xs text-gray-500" style={{ width: 80 }}>Thời gian:</Text>
                                <Text className="text-xs font-semibold text-gray-900 flex-1">{med.duration}</Text>
                              </View>
                              {med.instructions && (
                                <View style={{ backgroundColor: Colors.info[50], borderRadius: 6, padding: 8, marginTop: 4, borderWidth: 1, borderColor: Colors.info[100] }}>
                                  <Text className="text-xs" style={{ color: Colors.info[700] }}>
                                    💊 {med.instructions}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        ))
                      ) : (
                        // OLD format: simple medications list
                        <View style={{ backgroundColor: Colors.gray[50], borderRadius: 12, padding: 12 }}>
                          {selectedMedicalRecord.medications?.map((med: string, index: number) => (
                            <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success[600] }} />
                              <Text className="text-sm text-gray-900">{med}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Procedures */}
                {selectedMedicalRecord.procedures && selectedMedicalRecord.procedures.length > 0 && (
                  <View style={{ marginBottom: 16 }}>
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                      Thủ thuật đã thực hiện ({selectedMedicalRecord.procedures.length})
                    </Text>
                    <View style={{ gap: 8 }}>
                      {selectedMedicalRecord.procedures.map((proc: any, index: number) => (
                        <View key={index} style={{ backgroundColor: 'white', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.primary[200] }}>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primary[100], alignItems: 'center', justifyContent: 'center' }}>
                              <Ionicons name="medical" size={14} color={Colors.primary[700]} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text className="text-sm font-semibold text-gray-900">{proc.name}</Text>
                              {proc.description && (
                                <Text className="text-xs text-gray-600 mt-1">{proc.description}</Text>
                              )}
                              {proc.cost && (
                                <Text className="text-xs font-bold mt-2" style={{ color: Colors.success[600] }}>
                                  {proc.cost.toLocaleString('vi-VN')} đ
                                </Text>
                              )}
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Treatment Plan */}
                {selectedMedicalRecord.treatmentPlan && (
                  <View style={{ marginBottom: 16 }}>
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                      Kế hoạch điều trị
                    </Text>
                    <View style={{ backgroundColor: Colors.gray[50], borderRadius: 12, padding: 12 }}>
                      <Text className="text-sm text-gray-900">{selectedMedicalRecord.treatmentPlan}</Text>
                    </View>
                  </View>
                )}

                {/* Notes and Follow-up */}
                {(selectedMedicalRecord.notes || (selectedMedicalRecord.isFollowUpRequired && selectedMedicalRecord.followUpDate)) && (
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                    {selectedMedicalRecord.notes && (
                      <View style={{ flex: 1 }}>
                        <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                          Ghi chú
                        </Text>
                        <View style={{ backgroundColor: Colors.warning[50], borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.warning[100] }}>
                          <Text className="text-sm text-gray-900">{selectedMedicalRecord.notes}</Text>
                        </View>
                      </View>
                    )}

                    {selectedMedicalRecord.isFollowUpRequired && selectedMedicalRecord.followUpDate && (
                      <View style={{ flex: 1 }}>
                        <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                          Lịch tái khám
                        </Text>
                        <View style={{ backgroundColor: Colors.success[50], borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.success[100] }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="calendar" size={16} color={Colors.success[700]} />
                            <Text className="text-sm font-semibold" style={{ color: Colors.success[700] }}>
                              {formatDate(selectedMedicalRecord.followUpDate)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}
