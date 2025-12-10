/**
 * Doctor Schedule Screen
 * Lịch khám của bác sĩ - Giao diện đơn giản
 */

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';

import TreatmentModal from '@/components/appointments/TreatmentModal';
import { AppHeader } from '@/components/layout/AppHeader';
import PatientDetailModal from '@/components/patient/PatientDetailModal';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Appointment, AppointmentStatus } from '@/services/appointmentService';
import * as appointmentService from '@/services/appointmentService';

type TabStatus = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';
type ViewMode = 'list' | 'calendar';

export default function DoctorSchedule() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { session } = useAuth();
  const params = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedTab, setSelectedTab] = useState<TabStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [patientDetailModalVisible, setPatientDetailModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [treatmentModalVisible, setTreatmentModalVisible] = useState(false);
  const [appointmentForTreatment, setAppointmentForTreatment] = useState<Appointment | null>(null);
  
  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [calendarStartDate, setCalendarStartDate] = useState('');
  const [calendarEndDate, setCalendarEndDate] = useState('');
  
  // Date range filter states
  const [startFilterDate, setStartFilterDate] = useState('');
  const [endFilterDate, setEndFilterDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Fetch appointments
  const fetchAppointments = useCallback(async () => {
    if (!session?.user?._id || !session?.token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await appointmentService.getDoctorAppointments(
        session.user._id,
        session.token
      );

      if (result.success && result.data) {
        setAppointments(result.data);
      } else {
        Alert.alert('Lỗi', result.error || 'Không thể tải danh sách lịch hẹn');
      }
    } catch (error) {
      console.error('fetchAppointments error:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Handle appointmentId from params (from dashboard)
  useEffect(() => {
    if (params.id && appointments.length > 0 && !detailModalVisible) {
      const appointment = appointments.find((apt) => apt._id === params.id);
      if (appointment) {
        setSelectedAppointment(appointment);
        setDetailModalVisible(true);
      }
    }
  }, [params.id, appointments, detailModalVisible]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAppointments();
  }, [fetchAppointments]);

  // Filter appointments
  const getFilteredAppointments = () => {
    let filtered = appointments;

    // Filter by tab (status)
    if (selectedTab !== 'all') {
      filtered = filtered.filter((apt) => apt.status === selectedTab);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (apt) =>
          apt.patientId?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          apt.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          apt.patientId?.phone?.includes(searchTerm) ||
          apt.patientId?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by date range
    if (startFilterDate && endFilterDate) {
      filtered = filtered.filter((apt) => {
        const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
        return aptDate >= startFilterDate && aptDate <= endFilterDate;
      });
    } else if (startFilterDate) {
      filtered = filtered.filter((apt) => {
        const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
        return aptDate === startFilterDate;
      });
    }

    // Sort by date and time (nearest first)
    filtered.sort((a, b) => {
      const dateCompare = new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime();
      if (dateCompare !== 0) return dateCompare;
      const timeA = a.startTime || '00:00';
      const timeB = b.startTime || '00:00';
      return timeA.localeCompare(timeB);
    });

    return filtered;
  };

  const filteredAppointments = getFilteredAppointments();

  // Get appointments for selected date (calendar view)
  const getAppointmentsForDate = (date: string) => {
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
      return aptDate === date;
    });
  };

  // Get appointments for date range (calendar view)
  const getAppointmentsForDateRange = () => {
    if (!calendarStartDate && !calendarEndDate) {
      return appointments;
    }
    
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
      
      if (calendarStartDate && calendarEndDate) {
        return aptDate >= calendarStartDate && aptDate <= calendarEndDate;
      } else if (calendarStartDate) {
        return aptDate === calendarStartDate;
      }
      return true;
    });
  };

  // Get marked dates for calendar
  const getMarkedDates = () => {
    const marked: { [key: string]: { marked?: boolean; dotColor?: string; selectedColor?: string; selected?: boolean; startingDay?: boolean; endingDay?: boolean; color?: string; textColor?: string } } = {};
    
    appointments.forEach((apt) => {
      const dateStr = new Date(apt.appointmentDate).toISOString().split('T')[0];
      const color = apt.status === 'pending' ? Colors.warning[600] : 
                   apt.status === 'confirmed' ? Colors.success[600] : 
                   apt.status === 'completed' ? Colors.primary[600] : Colors.error[600];
      
      if (!marked[dateStr]) {
        marked[dateStr] = { marked: true, dotColor: color };
      }
    });

    // Mark selected range
    if (calendarStartDate && calendarEndDate) {
      const start = new Date(calendarStartDate);
      const end = new Date(calendarEndDate);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const isStart = dateStr === calendarStartDate;
        const isEnd = dateStr === calendarEndDate;
        
        marked[dateStr] = {
          ...marked[dateStr],
          selected: true,
          color: Colors.primary[600],
          textColor: '#ffffff',
          startingDay: isStart,
          endingDay: isEnd,
        };
      }
    } else if (calendarStartDate) {
      marked[calendarStartDate] = {
        ...marked[calendarStartDate],
        selected: true,
        selectedColor: Colors.primary[600],
        marked: true,
      };
    }

    return marked;
  };

  const selectedDateAppointments = calendarStartDate || calendarEndDate 
    ? getAppointmentsForDateRange()
    : getAppointmentsForDate(selectedDate);

  // Stats
  const stats = {
    all: appointments.length,
    pending: appointments.filter((a) => a.status === 'pending').length,
    confirmed: appointments.filter((a) => a.status === 'confirmed').length,
    completed: appointments.filter((a) => a.status === 'completed').length,
    cancelled: appointments.filter((a) => a.status === 'cancelled').length,
  };

  // Handle actions
  const handleConfirm = async (appointmentId: string) => {
    if (!session?.token || actionLoading) return;

    try {
      setActionLoading(true);
      const result = await appointmentService.confirmAppointment(appointmentId, session.token);

      if (result.success) {
        Alert.alert('Thành công', 'Đã xác nhận lịch hẹn');
        await fetchAppointments();
        setDetailModalVisible(false);
      } else {
        Alert.alert('Lỗi', result.error || 'Không thể xác nhận');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (appointmentId: string) => {
    if (!session?.token || actionLoading) return;

    try {
      setActionLoading(true);
      const result = await appointmentService.completeAppointment(appointmentId, session.token);

      if (result.success) {
        Alert.alert('Thành công', 'Đã hoàn thành lịch hẹn');
        await fetchAppointments();
        setDetailModalVisible(false);
      } else {
        Alert.alert('Lỗi', result.error || 'Không thể hoàn thành');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTreatment = (appointment: Appointment) => {
    setAppointmentForTreatment(appointment);
    setTreatmentModalVisible(true);
    setDetailModalVisible(false);
  };

  const handleTreatmentSubmit = async (formData: any) => {
    if (!session?.user?._id || !session?.token || !appointmentForTreatment) return;

    try {
      setActionLoading(true);

      // Get patient ID
      let patientId: string;
      const rawPatientId = appointmentForTreatment.patientId;
      if (typeof rawPatientId === 'object' && rawPatientId?._id) {
        patientId = rawPatientId._id;
      } else if (typeof rawPatientId === 'string') {
        patientId = rawPatientId;
      } else {
        throw new Error('Không tìm thấy thông tin bệnh nhân');
      }

      // Create medical record
      const medicalRecordPayload = {
        patientId: patientId,
        doctorId: session.user._id,
        recordDate: new Date().toISOString(),
        appointmentId: appointmentForTreatment._id,
        chiefComplaints: formData.chiefComplaints,
        presentIllness: formData.presentIllness,
        physicalExamination: formData.physicalExamination,
        diagnosisGroups: formData.diagnosisGroups,
        detailedMedications: formData.medications,
        notes: formData.notes,
        status: 'active',
      };

      const medicalRecordResponse = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1/medical-records`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify(medicalRecordPayload),
        }
      );

      if (!medicalRecordResponse.ok) {
        throw new Error('Không thể tạo hồ sơ bệnh án');
      }

      const medicalRecord = await medicalRecordResponse.json();

      // Create prescription if has medications
      if (formData.medications.length > 0) {
        const prescriptionMedications = formData.medications.map((med: any) => ({
          name: med.name,
          dosage: med.dosage || 'Chưa xác định',
          frequency: med.frequency || 'Theo chỉ định',
          duration: med.duration || 'Theo chỉ định',
          instructions: med.instructions || 'Theo hướng dẫn bác sĩ',
          quantity: 1,
          unit: 'hộp',
        }));

        const prescriptionPayload = {
          patientId: patientId,
          doctorId: session.user._id,
          medicalRecordId: medicalRecord._id || medicalRecord.id,
          prescriptionDate: new Date().toISOString(),
          diagnosis: formData.diagnosisGroups
            .filter((g: any) => g.diagnosis.trim())
            .map((g: any) => g.diagnosis)
            .join(', ') || 'Chưa có chẩn đoán',
          medications: prescriptionMedications,
          notes: formData.notes,
        };

        const prescriptionResponse = await fetch(
          `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1/prescriptions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.token}`,
            },
            body: JSON.stringify(prescriptionPayload),
          }
        );

        if (!prescriptionResponse.ok) {
          console.error('Không thể tạo đơn thuốc');
        }
      }

      // Complete appointment
      await handleComplete(appointmentForTreatment._id);

      // Create payment record (pending) then mark as paid to trigger revenue
      try {
        const amount = appointmentForTreatment.consultationFee || 500000;
        const paymentPayload = {
          patientId: patientId,
          doctorId: session.user._id,
          amount,
          status: 'pending',
          type: 'appointment',
          refId: appointmentForTreatment._id,
          refModel: 'Appointment',
          notes: `Khám bệnh - ${appointmentForTreatment.appointmentType}`,
        };

        const paymentResp = await fetch(
          `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1/payments`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.token}`,
            },
            body: JSON.stringify(paymentPayload),
          }
        );

        if (!paymentResp.ok) {
          console.error('Không thể tạo hóa đơn thanh toán');
        } else {
          const paymentData = await paymentResp.json();
          const paymentId = paymentData?.data?._id || paymentData?._id;
          if (paymentId) {
            // Mark payment as paid (cash) -> this triggers revenue creation on server
            const markPaidResp = await fetch(
              `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/v1/payments/${paymentId}/mark-paid`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session.token}`,
                },
                body: JSON.stringify({ doctorId: session.user._id }),
              }
            );
            if (!markPaidResp.ok) {
              console.error('Không thể xác nhận thanh toán, doanh thu chưa được tạo');
            } else {
              console.log('✅ Payment marked paid & revenue triggered');
            }
          } else {
            console.error('Không lấy được paymentId để tạo doanh thu');
          }
        }
      } catch (error) {
        console.error('Payment/revenue flow error:', error);
      }

      Alert.alert('Thành công', 'Đã lưu hồ sơ điều trị và hoàn thành lịch hẹn');
      setTreatmentModalVisible(false);
      setAppointmentForTreatment(null);
      await fetchAppointments();
    } catch (error) {
      console.error('Treatment submit error:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi lưu hồ sơ điều trị');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (appointmentId: string) => {
    Alert.alert(
      'Xác nhận hủy',
      'Bạn có chắc muốn hủy lịch hẹn này?',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Có',
          style: 'destructive',
          onPress: async () => {
            if (!session?.token || actionLoading) return;

            try {
              setActionLoading(true);
              const result = await appointmentService.cancelAppointment(
                appointmentId,
                session.token,
                'Bác sĩ hủy lịch hẹn',
                'doctor'
              );

              if (result.success) {
                Alert.alert('Thành công', 'Đã hủy lịch hẹn');
                await fetchAppointments();
                setDetailModalVisible(false);
              } else {
                Alert.alert('Lỗi', result.error || 'Không thể hủy');
              }
            } catch (error) {
              Alert.alert('Lỗi', 'Có lỗi xảy ra');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const getStatusBadgeVariant = (status: AppointmentStatus) => {
    switch (status) {
      case 'completed':
        return 'primary';
      case 'confirmed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'warning';
    }
  };

  const getStatusText = (status: AppointmentStatus) => {
    switch (status) {
      case 'completed':
        return 'Hoàn thành';
      case 'confirmed':
        return 'Đã xác nhận';
      case 'cancelled':
        return 'Đã hủy';
      case 'pending':
        return 'Chờ xử lý';
      case 'in-progress':
        return 'Đang khám';
      default:
        return status;
    }
  };

  return (
    <>
      <AppHeader title="Lịch khám" showNotification showAvatar />

      <ScrollView
        className="flex-1"
        style={{ backgroundColor: theme.background }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="p-4 pb-24">
          {/* Search Bar */}
          <View className="mb-4">
            <View
              className="flex-row items-center px-4 py-3 rounded-xl"
              style={{ backgroundColor: theme.card }}
            >
              <Ionicons name="search" size={20} color={Colors.gray[400]} />
              <TextInput
                className="flex-1 ml-3 text-base"
                placeholder="Tìm kiếm bệnh nhân..."
                value={searchTerm}
                onChangeText={setSearchTerm}
                style={{ color: theme.text.primary }}
                placeholderTextColor={Colors.gray[400]}
              />
              {searchTerm ? (
                <Pressable onPress={() => setSearchTerm('')}>
                  <Ionicons name="close-circle" size={20} color={Colors.gray[400]} />
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Stats Cards */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4 -mx-1"
          >
            {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as TabStatus[]).map(
              (tab) => {
                const count = stats[tab];
                const isSelected = selectedTab === tab;
                const colors = {
                  all: Colors.gray[600],
                  pending: Colors.warning[600],
                  confirmed: Colors.success[600],
                  completed: Colors.primary[600],
                  cancelled: Colors.error[600],
                };

                return (
                  <Pressable
                    key={tab}
                    onPress={() => setSelectedTab(tab)}
                    className="mx-1"
                  >
                    <Card
                      className="items-center justify-center px-4 py-3"
                      style={{
                        backgroundColor: isSelected ? colors[tab] : theme.card,
                        borderWidth: isSelected ? 0 : 1,
                        borderColor: Colors.gray[200],
                        minWidth: 100,
                      }}
                    >
                      <Text
                        className="text-2xl font-bold mb-1"
                        style={{ color: isSelected ? '#fff' : theme.text.primary }}
                      >
                        {count}
                      </Text>
                      <Text
                        className="text-xs font-medium"
                        style={{ color: isSelected ? '#fff' : theme.text.secondary }}
                      >
                        {tab === 'all'
                          ? 'Tất cả'
                          : tab === 'pending'
                          ? 'Chờ xử lý'
                          : tab === 'confirmed'
                          ? 'Đã xác nhận'
                          : tab === 'completed'
                          ? 'Hoàn thành'
                          : 'Đã hủy'}
                      </Text>
                    </Card>
                  </Pressable>
                );
              }
            )}
          </ScrollView>

          {/* View Toggle Button */}
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-sm font-semibold" style={{ color: theme.text.secondary }}>
              {viewMode === 'list' ? filteredAppointments.length : selectedDateAppointments.length} lịch hẹn
            </Text>
            <Pressable
              onPress={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
              className="flex-row items-center px-4 py-2 rounded-xl"
              style={{ backgroundColor: Colors.primary[600] }}
            >
              <Ionicons 
                name={viewMode === 'list' ? 'calendar' : 'list'} 
                size={18} 
                color="#fff" 
              />
              <Text className="ml-2 text-sm font-semibold text-white">
                {viewMode === 'list' ? 'Xem lịch' : 'Xem danh sách'}
              </Text>
            </Pressable>
          </View>

          {/* Appointments List */}
          <View className="mb-2">
            <Text className="text-sm font-semibold mb-3" style={{ color: theme.text.secondary }}>
              {filteredAppointments.length} lịch hẹn
            </Text>
          </View>

          {loading ? (
            <View className="items-center justify-center py-16">
              <ActivityIndicator size="large" color={Colors.primary[600]} />
              <Text className="mt-4 text-sm" style={{ color: theme.text.secondary }}>
                Đang tải dữ liệu...
              </Text>
            </View>
          ) : viewMode === 'calendar' ? (
            /* Calendar View */
            <View>
              <Card className="mb-4 overflow-hidden">
                <Calendar
                  current={calendarStartDate || selectedDate}
                  onDayPress={(day: DateData) => {
                    if (!calendarStartDate || (calendarStartDate && calendarEndDate)) {
                      // Start new selection
                      setCalendarStartDate(day.dateString);
                      setCalendarEndDate('');
                      setSelectedDate(day.dateString);
                    } else if (calendarStartDate && !calendarEndDate) {
                      // Complete selection
                      if (day.dateString >= calendarStartDate) {
                        setCalendarEndDate(day.dateString);
                      } else {
                        // If selected date is before start, swap them
                        setCalendarEndDate(calendarStartDate);
                        setCalendarStartDate(day.dateString);
                      }
                    }
                  }}
                  onDayLongPress={(day: DateData) => {
                    // Long press to clear selection and select single day
                    setCalendarStartDate(day.dateString);
                    setCalendarEndDate('');
                    setSelectedDate(day.dateString);
                  }}
                  markedDates={getMarkedDates()}
                  markingType="period"
                  theme={{
                    backgroundColor: theme.card,
                    calendarBackground: theme.card,
                    textSectionTitleColor: theme.text.secondary,
                    selectedDayBackgroundColor: Colors.primary[600],
                    selectedDayTextColor: '#ffffff',
                    todayTextColor: Colors.primary[600],
                    dayTextColor: theme.text.primary,
                    textDisabledColor: Colors.gray[400],
                    dotColor: Colors.primary[600],
                    selectedDotColor: '#ffffff',
                    arrowColor: Colors.primary[600],
                    monthTextColor: theme.text.primary,
                    textDayFontWeight: '400',
                    textMonthFontWeight: 'bold',
                    textDayHeaderFontWeight: '600',
                    textDayFontSize: 14,
                    textMonthFontSize: 16,
                    textDayHeaderFontSize: 12,
                  }}
                />
              </Card>

              {/* Clear Selection Button */}
              {(calendarStartDate || calendarEndDate) && (
                <Pressable
                  onPress={() => {
                    setCalendarStartDate('');
                    setCalendarEndDate('');
                    setSelectedDate(new Date().toISOString().split('T')[0]);
                  }}
                  className="mb-3 flex-row items-center justify-center py-2 px-4 rounded-xl self-center"
                  style={{ backgroundColor: Colors.gray[200] }}
                >
                  <Ionicons name="close-circle" size={18} color={Colors.gray[700]} />
                  <Text className="ml-2 font-semibold" style={{ color: Colors.gray[700] }}>
                    Xóa lựa chọn
                  </Text>
                </Pressable>
              )}

              {/* Selected Date Appointments */}
              <View className="mb-3">
                <Text className="text-base font-bold mb-3" style={{ color: theme.text.primary }}>
                  {calendarStartDate && calendarEndDate
                    ? `Lịch hẹn từ ${new Date(calendarStartDate).toLocaleDateString('vi-VN')} đến ${new Date(calendarEndDate).toLocaleDateString('vi-VN')}`
                    : calendarStartDate
                    ? `Lịch hẹn ngày ${new Date(calendarStartDate).toLocaleDateString('vi-VN')}`
                    : `Lịch hẹn ngày ${new Date(selectedDate).toLocaleDateString('vi-VN')}`}
                </Text>
                <Text className="text-sm mb-3" style={{ color: theme.text.secondary }}>
                  💡 Chạm vào ngày đầu, sau đó chạm vào ngày cuối để chọn khoảng thời gian. Chạm giữ để chọn lại.
                </Text>
              </View>

              {selectedDateAppointments.length > 0 ? (
                <View style={{ gap: 12 }}>
                  {selectedDateAppointments.map((appointment) => (
                    <Pressable
                      key={appointment._id}
                      onPress={() => {
                        setSelectedAppointment(appointment);
                        setDetailModalVisible(true);
                      }}
                    >
                      <Card className="p-4">
                        <View className="flex-row items-start">
                          {/* Date Badge */}
                          <View
                            className="items-center justify-center rounded-xl p-3 mr-3"
                            style={{ backgroundColor: Colors.primary[50] }}
                          >
                            <Text
                              className="text-xs font-semibold"
                              style={{ color: Colors.primary[600] }}
                            >
                              Th{formatShortDate(appointment.appointmentDate).split('/')[1]}
                            </Text>
                            <Text
                              className="text-lg font-bold"
                              style={{ color: Colors.primary[600] }}
                            >
                              {formatShortDate(appointment.appointmentDate).split('/')[0]}
                            </Text>
                          </View>

                          {/* Info */}
                          <View className="flex-1">
                            <View className="flex-row items-center justify-between mb-2">
                              <View className="flex-row items-center flex-1 mr-2">
                                <Text
                                  className="text-base font-bold flex-shrink"
                                  style={{ color: theme.text.primary }}
                                  numberOfLines={1}
                                >
                                  {appointment.patientId?.fullName || 'Bệnh nhân'}
                                </Text>
                                {(appointment as any).followUpParentId && (
                                  <View 
                                    className="ml-2 px-2 py-0.5 rounded-full"
                                    style={{ backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#F59E0B' }}
                                  >
                                    <Text className="text-xs font-semibold" style={{ color: '#D97706' }}>
                                      🔄 Tái khám
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <Badge
                                variant={getStatusBadgeVariant(appointment.status)}
                                className="ml-2"
                              >
                                {getStatusText(appointment.status)}
                              </Badge>
                            </View>

                            <View className="flex-row items-center mb-1">
                              <Ionicons name="time-outline" size={16} color={Colors.gray[500]} />
                              <Text
                                className="text-sm ml-2"
                                style={{ color: theme.text.secondary }}
                              >
                                {appointment.startTime} - {appointment.endTime}
                              </Text>
                            </View>

                            <View className="flex-row items-center">
                              <Ionicons name="medical-outline" size={16} color={Colors.gray[500]} />
                              <Text
                                className="text-sm ml-2"
                                style={{ color: theme.text.secondary }}
                                numberOfLines={1}
                              >
                                {appointment.appointmentType}
                              </Text>
                            </View>

                            {appointment.patientId?.phone && (
                              <View className="flex-row items-center mt-1">
                                <Ionicons name="call-outline" size={16} color={Colors.gray[500]} />
                                <Text
                                  className="text-sm ml-2"
                                  style={{ color: theme.text.secondary }}
                                >
                                  {appointment.patientId.phone}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </Card>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View
                  className="items-center py-12 rounded-xl"
                  style={{ backgroundColor: Colors.gray[50] }}
                >
                  <Ionicons name="calendar-outline" size={48} color={Colors.gray[300]} />
                  <Text className="mt-3 text-base font-medium" style={{ color: theme.text.secondary }}>
                    {calendarStartDate && calendarEndDate
                      ? 'Không có lịch hẹn trong khoảng thời gian này'
                      : 'Không có lịch hẹn trong ngày này'}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            /* List View */
            <View>
              {filteredAppointments.length > 0 ? (
                <View style={{ gap: 12 }}>
                  {filteredAppointments.map((appointment) => (
                <Pressable
                  key={appointment._id}
                  onPress={() => {
                    setSelectedAppointment(appointment);
                    setDetailModalVisible(true);
                  }}
                >
                  <Card className="p-4">
                    <View className="flex-row items-start">
                      {/* Date Badge */}
                      <View
                        className="items-center justify-center rounded-xl p-3 mr-3"
                        style={{ backgroundColor: Colors.primary[50] }}
                      >
                        <Text
                          className="text-xs font-semibold"
                          style={{ color: Colors.primary[600] }}
                        >
                          Th{formatShortDate(appointment.appointmentDate).split('/')[1]}
                        </Text>
                        <Text
                          className="text-lg font-bold"
                          style={{ color: Colors.primary[600] }}
                        >
                          {formatShortDate(appointment.appointmentDate).split('/')[0]}
                        </Text>
                      </View>

                      {/* Info */}
                      <View className="flex-1">
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="flex-row items-center flex-1 mr-2">
                            <Text
                              className="text-base font-bold flex-shrink"
                              style={{ color: theme.text.primary }}
                              numberOfLines={1}
                            >
                              {appointment.patientId?.fullName || 'Bệnh nhân'}
                            </Text>
                            {(appointment as any).followUpParentId && (
                              <View 
                                className="ml-2 px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#F59E0B' }}
                              >
                                <Text className="text-xs font-semibold" style={{ color: '#D97706' }}>
                                  🔄 Tái khám
                                </Text>
                              </View>
                            )}
                          </View>
                          <Badge
                            variant={getStatusBadgeVariant(appointment.status)}
                            className="ml-2"
                          >
                            {getStatusText(appointment.status)}
                          </Badge>
                        </View>

                        <View className="flex-row items-center mb-1">
                          <Ionicons name="time-outline" size={16} color={Colors.gray[500]} />
                          <Text
                            className="text-sm ml-2"
                            style={{ color: theme.text.secondary }}
                          >
                            {appointment.startTime} - {appointment.endTime}
                          </Text>
                        </View>

                        <View className="flex-row items-center">
                          <Ionicons name="medical-outline" size={16} color={Colors.gray[500]} />
                          <Text
                            className="text-sm ml-2"
                            style={{ color: theme.text.secondary }}
                            numberOfLines={1}
                          >
                            {appointment.appointmentType}
                          </Text>
                        </View>

                        {appointment.patientId?.phone && (
                          <View className="flex-row items-center mt-1">
                            <Ionicons name="call-outline" size={16} color={Colors.gray[500]} />
                            <Text
                              className="text-sm ml-2"
                              style={{ color: theme.text.secondary }}
                            >
                              {appointment.patientId.phone}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
              ) : (
                <View
                  className="items-center py-12 rounded-xl"
                  style={{ backgroundColor: Colors.gray[50] }}
                >
                  <Ionicons name="calendar-outline" size={48} color={Colors.gray[300]} />
                  <Text className="mt-3 text-base font-medium" style={{ color: theme.text.secondary }}>
                    Chưa có lịch hẹn
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View
            className="rounded-t-3xl p-6"
            style={{ backgroundColor: theme.background, maxHeight: '90%' }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold" style={{ color: theme.text.primary }}>
                Chi tiết lịch hẹn
              </Text>
              <Pressable onPress={() => setDetailModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text.primary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedAppointment && (
                <>
                  {/* Patient Info */}
                  <View className="items-center mb-6">
                    <View
                      className="w-20 h-20 rounded-full items-center justify-center mb-3"
                      style={{ backgroundColor: Colors.primary[600] }}
                    >
                      <Text className="text-white font-bold text-3xl">
                        {selectedAppointment.patientId?.fullName?.charAt(0).toUpperCase() || 'P'}
                      </Text>
                    </View>
                    <Text className="text-xl font-bold" style={{ color: theme.text.primary }}>
                      {selectedAppointment.patientId?.fullName || 'Bệnh nhân'}
                    </Text>
                    <Badge variant={getStatusBadgeVariant(selectedAppointment.status)} className="mt-2">
                      {getStatusText(selectedAppointment.status)}
                    </Badge>
                  </View>

                  {/* Details */}
                  <View style={{ gap: 16, marginBottom: 24 }}>
                    <View className="flex-row items-start" style={{ gap: 12 }}>
                      <Ionicons name="calendar" size={20} color={Colors.primary[600]} />
                      <View className="flex-1">
                        <Text className="text-xs mb-1" style={{ color: theme.text.secondary }}>
                          Ngày khám
                        </Text>
                        <Text className="font-medium" style={{ color: theme.text.primary }}>
                          {formatDate(selectedAppointment.appointmentDate)}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-start" style={{ gap: 12 }}>
                      <Ionicons name="time" size={20} color={Colors.primary[600]} />
                      <View className="flex-1">
                        <Text className="text-xs mb-1" style={{ color: theme.text.secondary }}>
                          Thời gian
                        </Text>
                        <Text className="font-medium" style={{ color: theme.text.primary }}>
                          {selectedAppointment.startTime} - {selectedAppointment.endTime}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-start" style={{ gap: 12 }}>
                      <Ionicons name="medical" size={20} color={Colors.primary[600]} />
                      <View className="flex-1">
                        <Text className="text-xs mb-1" style={{ color: theme.text.secondary }}>
                          Loại khám
                        </Text>
                        <Text className="font-medium" style={{ color: theme.text.primary }}>
                          {selectedAppointment.appointmentType}
                        </Text>
                      </View>
                    </View>

                    {selectedAppointment.patientId?.phone && (
                      <View className="flex-row items-start" style={{ gap: 12 }}>
                        <Ionicons name="call" size={20} color={Colors.primary[600]} />
                        <View className="flex-1">
                          <Text className="text-xs mb-1" style={{ color: theme.text.secondary }}>
                            Số điện thoại
                          </Text>
                          <Text className="font-medium" style={{ color: theme.text.primary }}>
                            {selectedAppointment.patientId.phone}
                          </Text>
                        </View>
                      </View>
                    )}

                    {selectedAppointment.notes && (
                      <View className="flex-row items-start" style={{ gap: 12 }}>
                        <Ionicons name="document-text" size={20} color={Colors.primary[600]} />
                        <View className="flex-1">
                          <Text className="text-xs mb-1" style={{ color: theme.text.secondary }}>
                            Ghi chú
                          </Text>
                          <Text className="font-medium" style={{ color: theme.text.primary }}>
                            {selectedAppointment.notes}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* View Patient Profile Button */}
                  <Pressable
                    onPress={() => setPatientDetailModalVisible(true)}
                    className="flex-row items-center justify-center py-3 mb-4 rounded-xl border-2"
                    style={{ gap: 8, borderColor: Colors.primary[600] }}
                  >
                    <Ionicons name="person-outline" size={20} color={Colors.primary[600]} />
                    <Text className="font-semibold" style={{ color: Colors.primary[600] }}>
                      Xem hồ sơ bệnh nhân
                    </Text>
                  </Pressable>

                  {/* Actions */}
                  {selectedAppointment.status === 'pending' && (
                    <View className="flex-row" style={{ gap: 12 }}>
                      <Pressable
                        onPress={() => handleConfirm(selectedAppointment._id)}
                        disabled={actionLoading}
                        className="flex-1 py-4 rounded-xl items-center"
                        style={{ backgroundColor: Colors.success[600] }}
                      >
                        {actionLoading ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <Text className="text-white font-bold">Xác nhận</Text>
                        )}
                      </Pressable>
                      <Pressable
                        onPress={() => handleCancel(selectedAppointment._id)}
                        disabled={actionLoading}
                        className="flex-1 py-4 rounded-xl items-center"
                        style={{ backgroundColor: Colors.error[600] }}
                      >
                        <Text className="text-white font-bold">Hủy</Text>
                      </Pressable>
                    </View>
                  )}

                  {selectedAppointment.status === 'confirmed' && (
                    <View className="flex-row" style={{ gap: 12 }}>
                      <Pressable
                        onPress={() => handleTreatment(selectedAppointment)}
                        disabled={actionLoading}
                        className="flex-1 py-4 rounded-xl items-center"
                        style={{ backgroundColor: Colors.primary[600] }}
                      >
                        <Text className="text-white font-bold">Điều trị</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleCancel(selectedAppointment._id)}
                        disabled={actionLoading}
                        className="flex-1 py-4 rounded-xl items-center"
                        style={{ backgroundColor: Colors.error[600] }}
                      >
                        <Text className="text-white font-bold">Hủy</Text>
                      </Pressable>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Patient Detail Modal */}
      {selectedAppointment?.patientId?._id && (
        <PatientDetailModal
          visible={patientDetailModalVisible}
          onClose={() => setPatientDetailModalVisible(false)}
          patientId={selectedAppointment.patientId._id}
          token={session?.token || ''}
        />
      )}

      {/* Treatment Modal */}
      <TreatmentModal
        visible={treatmentModalVisible}
        onClose={() => {
          setTreatmentModalVisible(false);
          setAppointmentForTreatment(null);
        }}
        appointment={appointmentForTreatment}
        onSubmit={handleTreatmentSubmit}
        isSubmitting={actionLoading}
      />

      {/* Date Filter Modal */}
      <Modal
        visible={showDateFilter}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDateFilter(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View
            className="rounded-t-3xl p-6"
            style={{ backgroundColor: theme.background }}
          >
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold" style={{ color: theme.text.primary }}>
                Lọc theo ngày
              </Text>
              <Pressable
                onPress={() => setShowDateFilter(false)}
                className="w-8 h-8 items-center justify-center rounded-full"
                style={{ backgroundColor: Colors.gray[100] }}
              >
                <Ionicons name="close" size={20} color={Colors.gray[600]} />
              </Pressable>
            </View>

            <View style={{ gap: 16 }}>
              {/* Start Date */}
              <View>
                <Text className="text-sm font-semibold mb-2" style={{ color: theme.text.secondary }}>
                  Từ ngày
                </Text>
                <TextInput
                  value={startFilterDate}
                  onChangeText={setStartFilterDate}
                  placeholder="YYYY-MM-DD"
                  className="px-4 py-3 rounded-xl text-base"
                  style={{ backgroundColor: theme.card, color: theme.text.primary, borderWidth: 1, borderColor: Colors.gray[200] }}
                  placeholderTextColor={Colors.gray[400]}
                />
                <Text className="text-xs mt-1" style={{ color: Colors.gray[500] }}>
                  Định dạng: YYYY-MM-DD (ví dụ: 2024-01-15)
                </Text>
              </View>

              {/* End Date */}
              <View>
                <Text className="text-sm font-semibold mb-2" style={{ color: theme.text.secondary }}>
                  Đến ngày
                </Text>
                <TextInput
                  value={endFilterDate}
                  onChangeText={setEndFilterDate}
                  placeholder="YYYY-MM-DD"
                  className="px-4 py-3 rounded-xl text-base"
                  style={{ backgroundColor: theme.card, color: theme.text.primary, borderWidth: 1, borderColor: Colors.gray[200] }}
                  placeholderTextColor={Colors.gray[400]}
                />
                <Text className="text-xs mt-1" style={{ color: Colors.gray[500] }}>
                  Định dạng: YYYY-MM-DD (ví dụ: 2024-01-31)
                </Text>
              </View>

              {/* Action Buttons */}
              <View className="flex-row mt-4" style={{ gap: 12 }}>
                <Pressable
                  onPress={() => {
                    setStartFilterDate('');
                    setEndFilterDate('');
                  }}
                  className="flex-1 py-4 rounded-xl items-center"
                  style={{ backgroundColor: Colors.gray[200] }}
                >
                  <Text className="font-bold" style={{ color: Colors.gray[700] }}>
                    Xóa
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowDateFilter(false)}
                  className="flex-1 py-4 rounded-xl items-center"
                  style={{ backgroundColor: Colors.primary[600] }}
                >
                  <Text className="text-white font-bold">Áp dụng</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
