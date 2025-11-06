/**
 * Doctor Schedule Screen
 * Lịch khám của bác sĩ với calendar view và list view
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

import { CustomCalendar } from '@/components/calendar/CustomCalendar';
import { WeekCalendar } from '@/components/calendar/WeekCalendar';
import { AppHeader } from '@/components/layout/AppHeader';
import PatientDetailModal from '@/components/patient/PatientDetailModal';
import { Badge } from '@/components/ui/Badge';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Appointment, AppointmentStatus } from '@/services/appointmentService';
import * as appointmentService from '@/services/appointmentService';

type TabStatus = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';
type ViewMode = 'month' | 'week' | 'list';
type SortBy = 'time' | 'patient' | 'status';

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
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [patientDetailModalVisible, setPatientDetailModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Filter & Sort states
  const [sortBy, setSortBy] = useState<SortBy>('time');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [appointmentType, setAppointmentType] = useState<string>('all');

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
        console.log('✅ Appointments loaded:', result.data.length);
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

    // Filter by search term (enhanced search)
    if (searchTerm) {
      filtered = filtered.filter(
        (apt) =>
          apt.patientId?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          apt.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          apt.patientId?.phone?.includes(searchTerm) ||
          apt.patientId?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by selected date from calendar
    // This works with viewMode (week/month/list)
    if (viewMode !== 'list') {
      filtered = filtered.filter((apt) => {
        const aptDate = new Date(apt.appointmentDate);
        const aptDateOnly = new Date(aptDate.getFullYear(), aptDate.getMonth(), aptDate.getDate());
        const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        return aptDateOnly.getTime() === selectedDateOnly.getTime();
      });
    }
    // In list mode, show all appointments (no date filter)

    // Filter by appointment type
    if (appointmentType !== 'all') {
      filtered = filtered.filter((apt) => apt.appointmentType === appointmentType);
    }

    // Sort appointments
    filtered.sort((a, b) => {
      if (sortBy === 'time') {
        // Sort by date and time
        const dateCompare = new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime();
        if (dateCompare !== 0) return dateCompare;
        const timeA = a.startTime || '00:00';
        const timeB = b.startTime || '00:00';
        return timeA.localeCompare(timeB);
      } else if (sortBy === 'patient') {
        // Sort by patient name
        const nameA = a.patientId?.fullName || '';
        const nameB = b.patientId?.fullName || '';
        return nameA.localeCompare(nameB);
      } else if (sortBy === 'status') {
        // Sort by status priority (pending -> confirmed -> completed -> cancelled)
        const statusOrder: { [key: string]: number } = {
          pending: 1,
          confirmed: 2,
          completed: 3,
          cancelled: 4,
        };
        return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
      }
      return 0;
    });

    return filtered;
  };

  const filteredAppointments = getFilteredAppointments();

  // Stats
  const stats = {
    all: appointments.length,
    pending: appointments.filter((a) => a.status === 'pending').length,
    confirmed: appointments.filter((a) => a.status === 'confirmed').length,
    completed: appointments.filter((a) => a.status === 'completed').length,
    cancelled: appointments.filter((a) => a.status === 'cancelled').length,
  };

  // Calendar marked dates - for month view
  const markedDatesForMonth = React.useMemo(() => {
    const marked: { [key: string]: { dots?: Array<{ color: string }> } } = {};
    appointments.forEach((apt) => {
      const date = new Date(apt.appointmentDate).toISOString().split('T')[0];
      if (!marked[date]) {
        marked[date] = { dots: [] };
      }
      // Add dot based on status
      const color =
        apt.status === 'completed'
          ? Colors.primary[600]
          : apt.status === 'confirmed'
          ? Colors.success[600]
          : apt.status === 'cancelled'
          ? Colors.error[600]
          : Colors.warning[600];
      marked[date].dots!.push({ color });
    });
    return marked;
  }, [appointments]);

  // Marked dates for week view
  const markedDatesForWeek = React.useMemo(() => {
    const marked: { [key: string]: { count?: number; color?: string } } = {};
    appointments.forEach((apt) => {
      const date = new Date(apt.appointmentDate).toISOString().split('T')[0];
      if (!marked[date]) {
        marked[date] = { count: 0 };
      }
      marked[date].count = (marked[date].count || 0) + 1;
      // Primary color for dates with appointments
      marked[date].color = Colors.primary[600];
    });
    return marked;
  }, [appointments]);

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
        // Clear query params khi đóng modal
        router.push('/(doctor)/schedule' as any);
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
        // Clear query params khi đóng modal
        router.push('/(doctor)/schedule' as any);
      } else {
        Alert.alert('Lỗi', result.error || 'Không thể hoàn thành');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra');
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
                // Clear query params khi đóng modal
                router.push('/(doctor)/schedule' as any);
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

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
        <Text className="mt-4" style={{ color: theme.text.secondary }}>
          Đang tải dữ liệu...
        </Text>
      </View>
    );
  }

  return (
    <>
      <AppHeader title="Lịch khám" showNotification />

      <ScrollView
        className="flex-1"
        style={{ backgroundColor: theme.background }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="px-4 pt-4 pb-24">
          {/* Compact Header: Search + Filter */}
          <View className="mb-3">
            {/* Search Bar with Filter */}
            <View className="flex-row items-center gap-2 mb-3">
              <View
                className="flex-1 flex-row items-center px-3 py-2.5 rounded-lg"
                style={{ backgroundColor: Colors.gray[100] }}
              >
                <Ionicons name="search" size={18} color={Colors.gray[400]} />
                <TextInput
                  className="flex-1 ml-2 text-sm"
                  placeholder="Tìm kiếm..."
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  style={{ color: theme.text.primary }}
                  placeholderTextColor={Colors.gray[400]}
                />
                {searchTerm ? (
                  <Pressable onPress={() => setSearchTerm('')}>
                    <Ionicons name="close-circle" size={18} color={Colors.gray[400]} />
                  </Pressable>
                ) : null}
              </View>

              {/* Filter Button */}
              <Pressable
                onPress={() => setShowFilterModal(true)}
                className="w-11 h-11 rounded-lg items-center justify-center relative"
                style={{ backgroundColor: Colors.gray[100] }}
              >
                <Ionicons name="options-outline" size={20} color={Colors.gray[700]} />
                {(sortBy !== 'time' || appointmentType !== 'all') && (
                  <View
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full items-center justify-center"
                    style={{ backgroundColor: Colors.primary[600] }}
                  >
                    <Text className="text-white text-[9px] font-bold">
                      {[sortBy !== 'time', appointmentType !== 'all'].filter(Boolean).length}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>

            {/* Tabs Row */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row -mx-1"
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
                      className="mx-1 px-3 py-1.5 rounded-full"
                      style={{
                        backgroundColor: isSelected ? colors[tab] : Colors.gray[100],
                      }}
                    >
                      <Text
                        className="text-xs font-medium"
                        style={{ color: isSelected ? '#fff' : theme.text.secondary }}
                      >
                        {tab === 'all'
                          ? `Tất cả (${count})`
                          : tab === 'pending'
                          ? `Chờ (${count})`
                          : tab === 'confirmed'
                          ? `Xác nhận (${count})`
                          : tab === 'completed'
                          ? `Hoàn thành (${count})`
                          : `Hủy (${count})`}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </ScrollView>
          </View>

          {/* View Mode Toggle - Compact */}
          <View className="flex-row mb-3 gap-1.5">
            <Pressable
              onPress={() => setViewMode('week')}
              className="flex-1 py-2 rounded-lg items-center justify-center"
              style={{
                backgroundColor: viewMode === 'week' ? Colors.primary[600] : Colors.gray[100],
              }}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={viewMode === 'week' ? '#fff' : Colors.gray[500]}
              />
            </Pressable>

            <Pressable
              onPress={() => setViewMode('month')}
              className="flex-1 py-2 rounded-lg items-center justify-center"
              style={{
                backgroundColor: viewMode === 'month' ? Colors.primary[600] : Colors.gray[100],
              }}
            >
              <Ionicons
                name="calendar"
                size={20}
                color={viewMode === 'month' ? '#fff' : Colors.gray[500]}
              />
            </Pressable>

            <Pressable
              onPress={() => setViewMode('list')}
              className="flex-1 py-2 rounded-lg items-center justify-center"
              style={{
                backgroundColor: viewMode === 'list' ? Colors.primary[600] : Colors.gray[100],
              }}
            >
              <Ionicons
                name="list"
                size={20}
                color={viewMode === 'list' ? '#fff' : Colors.gray[500]}
              />
            </Pressable>
          </View>

          {/* Week Calendar View */}
          {viewMode === 'week' && (
            <WeekCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              markedDates={markedDatesForWeek}
            />
          )}

          {/* Month Calendar View */}
          {viewMode === 'month' && (
            <CustomCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              markedDates={markedDatesForMonth}
            />
          )}

          {/* Appointments List - Compact */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>
              {viewMode === 'list' ? 'Tất cả lịch hẹn' : formatDate(selectedDate.toISOString()).split(',')[1].trim()}
            </Text>
            <Text className="text-xs" style={{ color: theme.text.secondary }}>
              {filteredAppointments.length} lịch hẹn
            </Text>
          </View>

          <View className="space-y-2">
            {filteredAppointments.length > 0 ? (
              filteredAppointments.map((appointment) => (
                <Pressable
                  key={appointment._id}
                  onPress={() => {
                    setSelectedAppointment(appointment);
                    setDetailModalVisible(true);
                  }}
                  className="active:opacity-70"
                >
                  <View
                    className="flex-row items-center p-3 rounded-xl border"
                    style={{
                      backgroundColor: theme.card,
                      borderColor: Colors.gray[200],
                    }}
                  >
                    {/* Time Badge */}
                    <View
                      className="px-2 py-1 rounded-lg mr-3"
                      style={{ backgroundColor: Colors.primary[50] }}
                    >
                      <Text className="text-xs font-bold" style={{ color: Colors.primary[600] }}>
                        {appointment.startTime}
                      </Text>
                    </View>

                    {/* Info */}
                    <View className="flex-1">
                      <Text
                        className="font-semibold text-sm"
                        style={{ color: theme.text.primary }}
                        numberOfLines={1}
                      >
                        {appointment.patientId?.fullName || 'Bệnh nhân'}
                      </Text>
                      <Text
                        className="text-xs mt-0.5"
                        style={{ color: theme.text.secondary }}
                        numberOfLines={1}
                      >
                        {appointment.appointmentType}
                      </Text>
                    </View>

                    {/* Status Icon */}
                    <View
                      className="w-7 h-7 rounded-full items-center justify-center"
                      style={{
                        backgroundColor:
                          appointment.status === 'completed'
                            ? Colors.primary[100]
                            : appointment.status === 'confirmed'
                            ? Colors.success[100]
                            : appointment.status === 'cancelled'
                            ? Colors.error[100]
                            : Colors.warning[100],
                      }}
                    >
                      <Ionicons
                        name={
                          appointment.status === 'completed'
                            ? 'checkmark'
                            : appointment.status === 'confirmed'
                            ? 'checkmark-circle'
                            : appointment.status === 'cancelled'
                            ? 'close'
                            : 'time'
                        }
                        size={14}
                        color={
                          appointment.status === 'completed'
                            ? Colors.primary[600]
                            : appointment.status === 'confirmed'
                            ? Colors.success[600]
                            : appointment.status === 'cancelled'
                            ? Colors.error[600]
                            : Colors.warning[600]
                        }
                      />
                    </View>
                  </View>
                </Pressable>
              ))
            ) : (
              <View
                className="items-center py-12 rounded-xl"
                style={{ backgroundColor: Colors.gray[50] }}
              >
                <Ionicons name="calendar-outline" size={40} color={Colors.gray[300]} />
                <Text className="mt-2 text-sm" style={{ color: theme.text.secondary }}>
                  Chưa có lịch hẹn
                </Text>
              </View>
            )}
          </View>
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
              <Pressable onPress={() => {
                setDetailModalVisible(false);
                // Clear query params khi đóng modal
                router.push('/(doctor)/schedule' as any);
              }}>
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
                  <View className="space-y-4 mb-6">
                    <View className="flex-row items-start gap-3">
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

                    <View className="flex-row items-start gap-3">
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

                    <View className="flex-row items-start gap-3">
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
                      <View className="flex-row items-start gap-3">
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
                      <View className="flex-row items-start gap-3">
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
                    onPress={() => {
                      setPatientDetailModalVisible(true);
                    }}
                    className="flex-row items-center justify-center gap-2 py-3 mb-4 rounded-lg border-2"
                    style={{ borderColor: Colors.primary[600] }}
                  >
                    <Ionicons name="person-outline" size={20} color={Colors.primary[600]} />
                    <Text className="font-semibold" style={{ color: Colors.primary[600] }}>
                      Xem hồ sơ bệnh nhân
                    </Text>
                  </Pressable>

                  {/* Actions */}
                  {selectedAppointment.status === 'pending' && (
                    <View className="flex-row gap-3">
                      <Pressable
                        onPress={() => handleConfirm(selectedAppointment._id)}
                        disabled={actionLoading}
                        className="flex-1 py-3 rounded-lg items-center"
                        style={{ backgroundColor: Colors.success[600] }}
                      >
                        {actionLoading ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <Text className="text-white font-semibold">Xác nhận</Text>
                        )}
                      </Pressable>
                      <Pressable
                        onPress={() => handleCancel(selectedAppointment._id)}
                        disabled={actionLoading}
                        className="flex-1 py-3 rounded-lg items-center"
                        style={{ backgroundColor: Colors.error[600] }}
                      >
                        <Text className="text-white font-semibold">Hủy</Text>
                      </Pressable>
                    </View>
                  )}

                  {selectedAppointment.status === 'confirmed' && (
                    <View className="flex-row gap-3">
                      <Pressable
                        onPress={() => handleComplete(selectedAppointment._id)}
                        disabled={actionLoading}
                        className="flex-1 py-3 rounded-lg items-center"
                        style={{ backgroundColor: Colors.primary[600] }}
                      >
                        {actionLoading ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <Text className="text-white font-semibold">Hoàn thành</Text>
                        )}
                      </Pressable>
                      <Pressable
                        onPress={() => handleCancel(selectedAppointment._id)}
                        disabled={actionLoading}
                        className="flex-1 py-3 rounded-lg items-center"
                        style={{ backgroundColor: Colors.error[600] }}
                      >
                        <Text className="text-white font-semibold">Hủy</Text>
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

      {/* Filter Modal - Simple & Clean */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Pressable className="flex-1" onPress={() => setShowFilterModal(false)} />
          <View
            className="rounded-t-3xl p-5"
            style={{ backgroundColor: theme.card }}
          >
            {/* Header */}
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-lg font-bold" style={{ color: theme.text.primary }}>
                Sắp xếp & Lọc
              </Text>
              <Pressable onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={Colors.gray[500]} />
              </Pressable>
            </View>

            {/* Sort By */}
            <View className="mb-4">
              <Text className="text-xs font-semibold mb-2 uppercase" style={{ color: Colors.gray[500] }}>
                Sắp xếp
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {[
                  { value: 'time' as SortBy, label: 'Theo giờ', icon: 'time-outline' },
                  { value: 'patient' as SortBy, label: 'Tên A-Z', icon: 'person-outline' },
                  { value: 'status' as SortBy, label: 'Ưu tiên', icon: 'flag-outline' },
                ].map((option) => {
                  const isSelected = sortBy === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setSortBy(option.value)}
                      className="flex-row items-center px-4 py-2.5 rounded-xl"
                      style={{
                        backgroundColor: isSelected ? Colors.primary[600] : Colors.gray[100],
                      }}
                    >
                      <Ionicons
                        name={option.icon as any}
                        size={16}
                        color={isSelected ? '#fff' : Colors.gray[600]}
                      />
                      <Text
                        className="ml-2 text-sm font-medium"
                        style={{ color: isSelected ? '#fff' : theme.text.primary }}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Appointment Type */}
            <View className="mb-4">
              <Text className="text-xs font-semibold mb-2 uppercase" style={{ color: Colors.gray[500] }}>
                Loại khám
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {[
                  { value: 'all', label: 'Tất cả' },
                  { value: 'Tổng quát', label: 'Tổng quát' },
                  { value: 'Nhổ răng', label: 'Nhổ răng' },
                  { value: 'Tẩy trắng', label: 'Tẩy trắng' },
                  { value: 'Niềng răng', label: 'Niềng răng' },
                  { value: 'Trám răng', label: 'Trám răng' },
                ].map((option) => {
                  const isSelected = appointmentType === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setAppointmentType(option.value)}
                      className="px-4 py-2.5 rounded-xl"
                      style={{
                        backgroundColor: isSelected ? Colors.primary[600] : Colors.gray[100],
                      }}
                    >
                      <Text
                        className="text-sm font-medium"
                        style={{ color: isSelected ? '#fff' : theme.text.primary }}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Actions */}
            <View className="flex-row gap-3 pt-3">
              <Pressable
                onPress={() => {
                  setSortBy('time');
                  setAppointmentType('all');
                }}
                className="flex-1 py-3 rounded-xl items-center"
                style={{ backgroundColor: Colors.gray[100] }}
              >
                <Text className="font-semibold" style={{ color: theme.text.secondary }}>
                  Đặt lại
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShowFilterModal(false)}
                className="flex-1 py-3 rounded-xl items-center"
                style={{ backgroundColor: Colors.primary[600] }}
              >
                <Text className="text-white font-bold">Áp dụng</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
