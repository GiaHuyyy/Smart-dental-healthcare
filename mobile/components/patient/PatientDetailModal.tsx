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

type TabType = 'overview' | 'appointments' | 'prescriptions' | 'medical-records';

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
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [stats, setStats] = useState<PatientStats>({
    appointments: [],
    prescriptions: [],
    medicalRecords: [],
    paymentStats: { totalPaid: 0, paid: 0, unpaid: 0 },
  });
  
  // State cho modal chi tiết
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [selectedMedicalRecord, setSelectedMedicalRecord] = useState<MedicalRecord | null>(null);
  const [prescriptionModalVisible, setPrescriptionModalVisible] = useState(false);
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

      // Fetch prescriptions
      const fetchPrescriptions = async () => {
        try {
          setPrescriptionsLoading(true);
          const prescriptionsRes = await fetch(`${API_URL}/prescriptions/patient/${patientId}/recent?limit=100`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const prescriptionsData = await prescriptionsRes.json();
          const prescriptions = Array.isArray(prescriptionsData)
            ? prescriptionsData
            : (prescriptionsData?.data || prescriptionsData?.prescriptions || []);

          setStats(prev => ({
            ...prev,
            prescriptions: Array.isArray(prescriptions) ? prescriptions : [],
          }));
          console.log('✅ [PatientDetail] Prescriptions loaded:', prescriptions?.length || 0);
        } catch (error) {
          console.error('❌ [PatientDetail] Prescriptions error:', error);
        } finally {
          setPrescriptionsLoading(false);
        }
      };

      // Fetch medical records
      const fetchRecords = async () => {
        try {
          setRecordsLoading(true);
          const recordsRes = await fetch(`${API_URL}/medical-records/patient/records?patientId=${patientId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          let medicalRecordsData = [];
          if (recordsRes.ok) {
            medicalRecordsData = await recordsRes.json();
          } else {
            console.warn('⚠️ [PatientDetail] Medical records endpoint not found (404)');
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
      
      // Load appointments and prescriptions in parallel
      Promise.all([fetchAppointments(), fetchPrescriptions()]);
      
      // Delay medical records slightly
      setTimeout(() => {
        fetchRecords();
      }, 300);

    } catch (error) {
      console.error('❌ [PatientDetail] Error:', error);
      setPatientLoading(false);
      setAppointmentsLoading(false);
      setPrescriptionsLoading(false);
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
    { id: 'appointments' as TabType, label: 'Lịch hẹn', icon: 'calendar-outline' },
    { id: 'prescriptions' as TabType, label: 'Đơn thuốc', icon: 'medical-outline' },
    { id: 'medical-records' as TabType, label: 'Hồ sơ', icon: 'document-text-outline' },
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
        <View className="flex-1 bg-gray-50">
          {/* Header */}
          <View className="px-4 pt-4 pb-3 border-b border-gray-200 bg-white">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center flex-1 gap-3">
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
                  <View className="items-center gap-1">
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
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="p-4">
              {/* TAB: OVERVIEW */}
              {activeTab === 'overview' && (
                <View className="gap-3">
                  {/* Quick Stats */}
                  {appointmentsLoading || prescriptionsLoading || recordsLoading ? (
                    <View className="flex-row gap-3">
                      <View className="flex-1">
                        <SkeletonBox width="100%" height={80} />
                      </View>
                      <View className="flex-1">
                        <SkeletonBox width="100%" height={80} />
                      </View>
                      <View className="flex-1">
                        <SkeletonBox width="100%" height={80} />
                      </View>
                    </View>
                  ) : (
                    <View className="flex-row gap-3">
                      <View className="flex-1 rounded-xl p-4 items-center" style={{ backgroundColor: Colors.primary[50] }}>
                        <Text className="text-xs text-gray-600 mb-1">Lịch hẹn</Text>
                        <Text className="text-2xl font-bold" style={{ color: Colors.primary[700] }}>
                          {stats.appointments.length}
                        </Text>
                      </View>
                      <View className="flex-1 rounded-xl p-4 items-center" style={{ backgroundColor: Colors.success[50] }}>
                        <Text className="text-xs text-gray-600 mb-1">Đơn thuốc</Text>
                        <Text className="text-2xl font-bold" style={{ color: Colors.success[700] }}>
                          {stats.prescriptions.length}
                        </Text>
                      </View>
                      <View className="flex-1 rounded-xl p-4 items-center" style={{ backgroundColor: Colors.warning[50] }}>
                        <Text className="text-xs text-gray-600 mb-1">Hồ sơ</Text>
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
                      <View className="gap-3">
                        <View className="flex-row items-center gap-3">
                          <View className="w-8 h-8 rounded-lg items-center justify-center bg-gray-50">
                            <Ionicons name="mail-outline" size={16} color={Colors.gray[600]} />
                          </View>
                          <Text className="text-sm text-gray-900 flex-1" numberOfLines={1}>
                            {patient.email}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-3">
                          <View className="w-8 h-8 rounded-lg items-center justify-center bg-gray-50">
                            <Ionicons name="call-outline" size={16} color={Colors.gray[600]} />
                          </View>
                          <Pressable
                            onPress={() => handleCall(patient.phone)}
                            className="flex-row items-center gap-2 active:opacity-70"
                          >
                            <Text className="text-sm font-medium" style={{ color: Colors.primary[600] }}>
                              {patient.phone}
                            </Text>
                            <Ionicons name="open-outline" size={14} color={Colors.primary[600]} />
                          </Pressable>
                        </View>
                        {patient.address && (
                          <View className="flex-row gap-3">
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
                      <View className="gap-2.5">
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
                          <View className="flex-row items-center gap-2">
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
                      <View className="flex-row items-center gap-3">
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
                      <View className="gap-2.5">
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
                <View className="gap-2.5">
                  {appointmentsLoading ? (
                    <>
                      <SkeletonBox width="100%" height={90} />
                      <SkeletonBox width="100%" height={90} />
                      <SkeletonBox width="100%" height={90} />
                    </>
                  ) : stats.appointments.length === 0 ? (
                    <View className="py-20 items-center">
                      <Ionicons name="calendar-outline" size={48} color={Colors.gray[300]} />
                      <Text className="text-sm text-gray-500 mt-3">Chưa có lịch hẹn</Text>
                    </View>
                  ) : (
                    stats.appointments.map((appointment) => (
                      <View
                        key={appointment._id}
                        className="rounded-xl p-4 bg-white border border-gray-100 flex-row items-center gap-3"
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

              {/* TAB: PRESCRIPTIONS */}
              {activeTab === 'prescriptions' && (
                <View className="gap-2.5">
                  {prescriptionsLoading ? (
                    <>
                      <SkeletonBox width="100%" height={120} />
                      <SkeletonBox width="100%" height={120} />
                      <SkeletonBox width="100%" height={120} />
                    </>
                  ) : stats.prescriptions.length === 0 ? (
                    <View className="py-20 items-center">
                      <Ionicons name="medical-outline" size={48} color={Colors.gray[300]} />
                      <Text className="text-sm text-gray-500 mt-3">Chưa có đơn thuốc</Text>
                    </View>
                  ) : (
                    stats.prescriptions.map((prescription, index) => (
                      <TouchableOpacity
                        key={prescription._id}
                        className="rounded-xl p-4 bg-white border border-gray-100 flex-row items-center gap-3"
                        onPress={() => {
                          setSelectedPrescription(prescription);
                          setPrescriptionModalVisible(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <View 
                          className="w-12 h-12 rounded-xl items-center justify-center"
                          style={{ backgroundColor: Colors.success[100] }}
                        >
                          <Ionicons name="medical" size={20} color={Colors.success[600]} />
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-gray-900">Đơn thuốc #{index + 1}</Text>
                          <Text className="text-xs text-gray-600 mt-0.5">
                            Ngày kê: {formatDate(prescription.createdAt)}
                          </Text>
                          
                          {prescription.diagnosis && (
                            <View className="mt-1.5 px-2 py-1 rounded-md" style={{ backgroundColor: Colors.primary[50] }}>
                              <Text className="text-xs text-gray-700" numberOfLines={1}>
                                <Text className="font-semibold">Chẩn đoán: </Text>
                                {prescription.diagnosis}
                              </Text>
                            </View>
                          )}
                          
                          {prescription.medications && prescription.medications.length > 0 && (
                            <View className="mt-1.5">
                              <View className="flex-row items-center gap-1">
                                <View 
                                  className="w-1 h-1 rounded-full" 
                                  style={{ backgroundColor: Colors.success[600] }}
                                />
                                <Text className="text-xs text-gray-700 flex-1" numberOfLines={1}>
                                  {prescription.medications[0].name}
                                </Text>
                              </View>
                              {prescription.medications.length > 1 && (
                                <Text className="text-xs mt-0.5" style={{ color: Colors.success[600] }}>
                                  +{prescription.medications.length - 1} thuốc khác
                                </Text>
                              )}
                            </View>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={Colors.gray[400]} />
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}

              {/* TAB: MEDICAL RECORDS */}
              {activeTab === 'medical-records' && (
                <View className="gap-2.5">
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
                    stats.medicalRecords.map((record, index) => (
                      <TouchableOpacity
                        key={record._id}
                        className="rounded-xl p-4 bg-white border border-gray-100 flex-row items-center gap-3"
                        onPress={() => {
                          setSelectedMedicalRecord(record);
                          setMedicalRecordModalVisible(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <View 
                          className="w-12 h-12 rounded-xl items-center justify-center"
                          style={{ backgroundColor: Colors.warning[100] }}
                        >
                          <Ionicons name="document-text" size={20} color={Colors.warning[600]} />
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-gray-900">Hồ sơ #{index + 1}</Text>
                          <Text className="text-xs text-gray-600 mt-0.5">
                            Ngày tạo: {formatDate(record.createdAt)}
                          </Text>
                          
                          {record.chiefComplaint && (
                            <View className="mt-1.5">
                              <Text className="text-xs text-gray-500" numberOfLines={1}>
                                <Text className="font-semibold">Lý do: </Text>
                                {record.chiefComplaint}
                              </Text>
                            </View>
                          )}
                          
                          {record.diagnosis && (
                            <View className="mt-1.5 px-2 py-1 rounded-md" style={{ backgroundColor: Colors.warning[50] }}>
                              <Text className="text-xs font-semibold" style={{ color: Colors.warning[700] }} numberOfLines={1}>
                                {record.diagnosis}
                              </Text>
                            </View>
                          )}
                          
                          {record.procedures && record.procedures.length > 0 && (
                            <View className="flex-row items-center gap-1 mt-1.5">
                              <Ionicons name="medical" size={12} color={Colors.primary[600]} />
                              <Text className="text-xs" style={{ color: Colors.primary[600] }}>
                                {record.procedures.length} thủ thuật
                              </Text>
                            </View>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={Colors.gray[400]} />
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Prescription Detail Modal */}
      {selectedPrescription && (
        <Modal
          visible={prescriptionModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setPrescriptionModalVisible(false)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl" style={{ maxHeight: '80%' }}>
              <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-900">Chi tiết đơn thuốc</Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    Ngày kê: {formatDate(selectedPrescription.createdAt)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setPrescriptionModalVisible(false)}
                  className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
                >
                  <Ionicons name="close" size={20} color={Colors.gray[700]} />
                </Pressable>
              </View>

              <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
                {selectedPrescription.diagnosis && (
                  <View className="mb-4">
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                      Chẩn đoán
                    </Text>
                    <View className="rounded-xl p-3 bg-gray-50">
                      <Text className="text-sm text-gray-900">{selectedPrescription.diagnosis}</Text>
                    </View>
                  </View>
                )}

                {selectedPrescription.medications && selectedPrescription.medications.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                      Danh sách thuốc ({selectedPrescription.medications.length})
                    </Text>
                    <View className="gap-2">
                      {selectedPrescription.medications.map((med, index) => (
                        <View key={index} className="rounded-xl p-3 bg-white border border-gray-100">
                          <View className="flex-row items-start gap-2 mb-2">
                            <View 
                              className="w-6 h-6 rounded-full items-center justify-center mt-0.5"
                              style={{ backgroundColor: Colors.success[100] }}
                            >
                              <Text className="text-xs font-bold" style={{ color: Colors.success[700] }}>
                                {index + 1}
                              </Text>
                            </View>
                            <View className="flex-1">
                              <Text className="text-sm font-semibold text-gray-900">{med.name}</Text>
                              <Text className="text-xs text-gray-600 mt-1">Liều lượng: {med.dosage}</Text>
                            </View>
                          </View>
                          <View className="pl-8 gap-1">
                            <Text className="text-xs text-gray-600">
                              <Text className="font-semibold">Tần suất: </Text>{med.frequency}
                            </Text>
                            <Text className="text-xs text-gray-600">
                              <Text className="font-semibold">Thời gian: </Text>{med.duration}
                            </Text>
                            {med.instructions && (
                              <Text className="text-xs text-gray-600 mt-1">
                                <Text className="font-semibold">Hướng dẫn: </Text>{med.instructions}
                              </Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {selectedPrescription.notes && (
                  <View className="mb-4">
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                      Ghi chú
                    </Text>
                    <View className="rounded-xl p-3 bg-gray-50">
                      <Text className="text-sm text-gray-900">{selectedPrescription.notes}</Text>
                    </View>
                  </View>
                )}

                {selectedPrescription.status && (
                  <View className="mb-4">
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                      Trạng thái
                    </Text>
                    <View 
                      className="inline-flex self-start px-3 py-1.5 rounded-full"
                      style={{ 
                        backgroundColor: selectedPrescription.status === 'dispensed' 
                          ? Colors.success[100] 
                          : Colors.warning[100] 
                      }}
                    >
                      <Text 
                        className="text-xs font-semibold"
                        style={{ 
                          color: selectedPrescription.status === 'dispensed' 
                            ? Colors.success[700] 
                            : Colors.warning[700] 
                        }}
                      >
                        {selectedPrescription.status === 'dispensed' ? 'Đã cấp phát' : 'Chưa cấp phát'}
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Medical Record Detail Modal */}
      {selectedMedicalRecord && (
        <Modal
          visible={medicalRecordModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setMedicalRecordModalVisible(false)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl" style={{ maxHeight: '80%' }}>
              <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-900">Chi tiết hồ sơ bệnh án</Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    Ngày khám: {selectedMedicalRecord.recordDate 
                      ? formatDate(selectedMedicalRecord.recordDate) 
                      : formatDate(selectedMedicalRecord.createdAt)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setMedicalRecordModalVisible(false)}
                  className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
                >
                  <Ionicons name="close" size={20} color={Colors.gray[700]} />
                </Pressable>
              </View>

              <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
                {selectedMedicalRecord.chiefComplaint && (
                  <View className="mb-4">
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                      Lý do khám
                    </Text>
                    <View className="rounded-xl p-3 bg-gray-50">
                      <Text className="text-sm text-gray-900">{selectedMedicalRecord.chiefComplaint}</Text>
                    </View>
                  </View>
                )}

                {selectedMedicalRecord.diagnosis && (
                  <View className="mb-4">
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                      Chẩn đoán
                    </Text>
                    <View className="rounded-xl p-3 bg-blue-50">
                      <Text className="text-sm font-semibold text-blue-900">
                        {selectedMedicalRecord.diagnosis}
                      </Text>
                    </View>
                  </View>
                )}

                {selectedMedicalRecord.treatmentPlan && (
                  <View className="mb-4">
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                      Kế hoạch điều trị
                    </Text>
                    <View className="rounded-xl p-3 bg-gray-50">
                      <Text className="text-sm text-gray-900">{selectedMedicalRecord.treatmentPlan}</Text>
                    </View>
                  </View>
                )}

                {selectedMedicalRecord.procedures && selectedMedicalRecord.procedures.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                      Thủ thuật đã thực hiện ({selectedMedicalRecord.procedures.length})
                    </Text>
                    <View className="gap-2">
                      {selectedMedicalRecord.procedures.map((proc, index) => (
                        <View key={index} className="rounded-xl p-3 bg-white border border-gray-100">
                          <View className="flex-row items-start gap-2">
                            <View 
                              className="w-6 h-6 rounded-full items-center justify-center mt-0.5"
                              style={{ backgroundColor: Colors.primary[100] }}
                            >
                              <Ionicons name="medical" size={14} color={Colors.primary[700]} />
                            </View>
                            <View className="flex-1">
                              <Text className="text-sm font-semibold text-gray-900">{proc.name}</Text>
                              {proc.description && (
                                <Text className="text-xs text-gray-600 mt-1">{proc.description}</Text>
                              )}
                              {proc.cost && (
                                <Text className="text-xs font-semibold mt-1" style={{ color: Colors.success[600] }}>
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

                {selectedMedicalRecord.medications && selectedMedicalRecord.medications.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                      Thuốc đã kê ({selectedMedicalRecord.medications.length})
                    </Text>
                    <View className="rounded-xl p-3 bg-gray-50">
                      {selectedMedicalRecord.medications.map((med, index) => (
                        <View key={index} className="flex-row items-center gap-2 mb-1">
                          <View 
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: Colors.success[600] }}
                          />
                          <Text className="text-sm text-gray-900">{med}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {selectedMedicalRecord.notes && (
                  <View className="mb-4">
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                      Ghi chú
                    </Text>
                    <View className="rounded-xl p-3 bg-gray-50">
                      <Text className="text-sm text-gray-900">{selectedMedicalRecord.notes}</Text>
                    </View>
                  </View>
                )}

                {selectedMedicalRecord.status && (
                  <View className="mb-4">
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                      Trạng thái
                    </Text>
                    <View 
                      className="inline-flex self-start px-3 py-1.5 rounded-full"
                      style={{ 
                        backgroundColor: selectedMedicalRecord.status === 'completed' 
                          ? Colors.success[100] 
                          : Colors.warning[100] 
                      }}
                    >
                      <Text 
                        className="text-xs font-semibold"
                        style={{ 
                          color: selectedMedicalRecord.status === 'completed' 
                            ? Colors.success[700] 
                            : Colors.warning[700] 
                        }}
                      >
                        {selectedMedicalRecord.status === 'completed' ? 'Hoàn thành' : 'Đang điều trị'}
                      </Text>
                    </View>
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
