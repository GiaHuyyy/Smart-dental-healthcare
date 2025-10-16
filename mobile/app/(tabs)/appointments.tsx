import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  MessageSquare,
  Phone,
  Users,
  Video,
} from 'lucide-react-native';
import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
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

type Doctor = {
  _id?: string;
  id?: string;
  fullName?: string;
  name?: string;
  specialty?: string;
};

type AppointmentDisplay = {
  id: string;
  title: string;
  doctorName: string;
  dateLabel: string;
  timeLabel: string;
  location: string;
  isVirtual: boolean;
  statusLabel: string;
  statusVariant: keyof typeof STATUS_STYLES;
  raw: Record<string, unknown>;
  sortKey: number;
};

const MINIMUM_LEAD_MS = 2 * 60 * 60 * 1000;

const AVAILABLE_TIMES = [
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
];

const APPOINTMENT_TYPE_OPTIONS = ['Khám định kỳ', 'Tư vấn trực tuyến', 'Khám cấp cứu'];

const STATUS_STYLES = {
  pending: { text: '#b45309', background: '#fef3c7' },
  confirmed: { text: '#1d4ed8', background: '#dbeafe' },
  completed: { text: '#047857', background: '#d1fae5' },
  cancelled: { text: '#6b7280', background: '#e5e7eb' },
} as const;

function normalizeTimeString(value?: string | null): string | null {
  if (!value) return null;
  const match = value.match(/(\d{1,2}:\d{2})/);
  if (!match) return null;
  const [hh, mm] = match[1].split(':');
  return `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}`;
}

function addMinutesToTime(time: string, minutes: number): string {
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hour || 0, (minute || 0) + minutes, 0, 0);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function dateFromInput(input: string): Date {
  const [year, month, day] = input.split('-').map(Number);
  return new Date(year || 0, (month || 1) - 1, day || 1, 0, 0, 0, 0);
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatVietnameseDate(input: string): string {
  const date = dateFromInput(input);
  return date.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function combineDateAndTime(dateString: string, timeString?: string | null): Date | null {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return null;
  let hour = 0;
  let minute = 0;
  if (timeString) {
    const [h, m] = timeString.split(':').map(Number);
    if (!Number.isNaN(h)) hour = h;
    if (!Number.isNaN(m)) minute = m;
  }
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function getAppointmentDateRaw(appointment: Record<string, any>): string | null {
  const raw = appointment.appointmentDate ?? appointment.date ?? appointment.startDate;
  if (!raw) return null;
  const asDate = new Date(raw);
  if (Number.isNaN(asDate.getTime())) return null;
  return asDate.toISOString().slice(0, 10);
}

function getAppointmentDateTime(appointment: Record<string, any>): Date | null {
  const dateString = getAppointmentDateRaw(appointment);
  const timeString = normalizeTimeString(appointment.startTime ?? appointment.time ?? appointment.appointmentTime);
  if (!dateString) return null;
  return combineDateAndTime(dateString, timeString);
}

function extractDoctorName(appointment: Record<string, any>): string {
  return (
    appointment.doctor?.fullName ??
    appointment.doctor?.name ??
    appointment.doctorName ??
    appointment.doctorFullName ??
    appointment.doctorInfo?.fullName ??
    'Bác sĩ Smart Dental'
  );
}

function extractLocation(appointment: Record<string, any>): string {
  return (
    appointment.location ??
    appointment.clinicLocation ??
    appointment.address ??
    appointment.clinic ??
    'Phòng khám Smart Dental'
  );
}

function extractTitle(appointment: Record<string, any>): string {
  return appointment.appointmentType ?? appointment.title ?? 'Lịch hẹn nha khoa';
}

function isVirtualMode(type?: string, location?: string): boolean {
  const typeText = (type ?? '').toLowerCase();
  if (typeText.includes('trực tuyến') || typeText.includes('online') || typeText.includes('tư vấn')) {
    return true;
  }
  const locationText = (location ?? '').toLowerCase();
  return locationText.includes('video') || locationText.includes('online') || locationText.includes('zoom');
}

function mapStatus(status?: string): { label: string; variant: keyof typeof STATUS_STYLES } {
  const normalized = (status ?? '').toLowerCase();
  if (normalized.includes('confirm')) {
    return { label: 'Đã xác nhận', variant: 'confirmed' };
  }
  if (normalized.includes('complete')) {
    return { label: 'Đã hoàn thành', variant: 'completed' };
  }
  if (normalized.includes('cancel')) {
    return { label: 'Đã hủy', variant: 'cancelled' };
  }
  return { label: 'Đang chờ xác nhận', variant: 'pending' };
}

function buildAppointmentDisplay(appointment: Record<string, any>): AppointmentDisplay {
  const dateString = getAppointmentDateRaw(appointment);
  const startTime = normalizeTimeString(appointment.startTime ?? appointment.time ?? appointment.appointmentTime);
  const endTime = normalizeTimeString(appointment.endTime ?? appointment.finishTime ?? appointment.expectedEndTime);
  const timeLabel = startTime ? (endTime ? `${startTime} - ${endTime}` : startTime) : '—';
  const { label: statusLabel, variant } = mapStatus(appointment.status);
  const doctorName = extractDoctorName(appointment);
  const location = extractLocation(appointment);
  const title = extractTitle(appointment);
  const isVirtual = isVirtualMode(appointment.appointmentType, location);
  const dateTime = getAppointmentDateTime(appointment);
  const id = (appointment._id ?? appointment.id ?? `${doctorName}-${startTime ?? 'time'}-${dateString ?? Date.now()}`).toString();

  return {
    id,
    title,
    doctorName,
    dateLabel: dateString ? formatVietnameseDate(dateString) : '—',
    timeLabel,
    location,
    isVirtual,
    statusLabel,
    statusVariant: variant,
    raw: appointment,
    sortKey: dateTime ? dateTime.getTime() : Number.MAX_SAFE_INTEGER,
  };
}

function AppointmentStatusPill({ label, variant }: { label: string; variant: keyof typeof STATUS_STYLES }) {
  const style = STATUS_STYLES[variant];
  return (
    <View className="self-start rounded-full px-3 py-1" style={{ backgroundColor: style.background }}>
      <Text className="text-xs font-semibold" style={{ color: style.text }}>
        {label}
      </Text>
    </View>
  );
}

function AppointmentCard({
  appointment,
  onCancel,
  cancelling,
}: {
  appointment: AppointmentDisplay;
  onCancel: (item: AppointmentDisplay) => void;
  cancelling: boolean;
}) {
  return (
    <View className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-lg shadow-blue-100">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-base font-semibold text-slate-900">{appointment.title}</Text>
          <Text className="mt-1 text-sm text-slate-500">{appointment.doctorName}</Text>
        </View>
        <View className={`rounded-full px-3 py-1 ${appointment.isVirtual ? 'bg-emerald-100' : 'bg-blue-100'}`}>
          <Text className={`text-xs font-semibold ${appointment.isVirtual ? 'text-emerald-700' : 'text-blue-700'}`}>
            {appointment.isVirtual ? 'Trực tuyến' : 'Tại phòng khám'}
          </Text>
        </View>
      </View>

      <View className="mt-4 space-y-3">
        <View className="flex-row items-center space-x-3">
          <Calendar color="#1d4ed8" size={18} />
          <Text className="text-sm font-medium text-slate-700">
            {appointment.dateLabel} • {appointment.timeLabel}
          </Text>
        </View>
        <View className="flex-row items-center space-x-3">
          <MapPin color="#1d4ed8" size={18} />
          <Text className="flex-1 text-sm text-slate-600">{appointment.location}</Text>
        </View>
        <AppointmentStatusPill label={appointment.statusLabel} variant={appointment.statusVariant} />
      </View>

      <View className="mt-5 flex-row space-x-3">
        <TouchableOpacity
          className="flex-1 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 py-3"
          onPress={() =>
            Alert.alert(
              'Liên hệ bác sĩ',
              'Tính năng trao đổi trực tiếp đang được phát triển trên ứng dụng di động. Vui lòng sử dụng cổng web để trò chuyện với bác sĩ.',
            )
          }
        >
          <View className="flex-row items-center space-x-2">
            <MessageSquare color="#1d4ed8" size={18} />
            <Text className="text-sm font-semibold text-blue-700">Trao đổi</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 items-center justify-center rounded-2xl bg-red-50 py-3"
          onPress={() => onCancel(appointment)}
          disabled={cancelling}
        >
          {cancelling ? (
            <View className="flex-row items-center space-x-2">
              <ActivityIndicator color="#b91c1c" />
              <Text className="text-sm font-semibold text-red-700">Đang hủy...</Text>
            </View>
          ) : (
            <Text className="text-sm font-semibold text-red-700">Hủy lịch</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function HistoryCard({ appointment }: { appointment: AppointmentDisplay }) {
  return (
    <View className="rounded-2xl border border-white/60 bg-white/85 p-4">
      <Text className="text-sm font-semibold text-slate-900">{appointment.title}</Text>
      <Text className="mt-1 text-xs text-slate-500">
        {appointment.dateLabel} • {appointment.timeLabel}
      </Text>
      <Text className="mt-2 text-xs text-slate-500">{appointment.doctorName}</Text>
      <View className="mt-3">
        <AppointmentStatusPill label={appointment.statusLabel} variant={appointment.statusVariant} />
      </View>
    </View>
  );
}

function DoctorSelectModal({
  visible,
  doctors,
  selectedDoctorId,
  onClose,
  onSelect,
}: {
  visible: boolean;
  doctors: Doctor[];
  selectedDoctorId: string;
  onClose: () => void;
  onSelect: (doctorId: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-slate-900/40">
        <View className="max-h-[70%] w-11/12 rounded-3xl bg-white p-5 shadow-2xl">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-slate-900">Chọn bác sĩ</Text>
            <TouchableOpacity onPress={onClose}>
              <Text className="text-sm font-medium text-blue-600">Đóng</Text>
            </TouchableOpacity>
          </View>
          <ScrollView className="max-h-96">
            {doctors.map((doctor) => {
              const id = doctor._id ?? doctor.id ?? '';
              const isActive = id === selectedDoctorId;
              return (
                <TouchableOpacity
                  key={id}
                  className={`mb-3 rounded-2xl border px-4 py-3 ${
                    isActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50'
                  }`}
                  onPress={() => {
                    onSelect(id);
                    onClose();
                  }}
                >
                  <Text className="text-sm font-semibold text-slate-900">{doctor.fullName ?? doctor.name ?? 'Bác sĩ'}</Text>
                  {doctor.specialty ? (
                    <Text className="mt-1 text-xs text-slate-500">{doctor.specialty}</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
            {doctors.length === 0 ? (
              <View className="items-center py-6">
                <Text className="text-sm text-slate-500">Không có bác sĩ nào khả dụng.</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function AppointmentsScreen() {
  const router = useRouter();
  const { session, isAuthenticated, isHydrating } = useAuth();

  const patientId = session?.user?._id ?? '';
  const token = session?.token ?? '';

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [doctorModalVisible, setDoctorModalVisible] = useState(false);

  const [appointments, setAppointments] = useState<Record<string, any>[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [appointmentType, setAppointmentType] = useState(APPOINTMENT_TYPE_OPTIONS[0]);
  const [selectedDate, setSelectedDate] = useState('');
  const [inlinePickerDate, setInlinePickerDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [busyTimes, setBusyTimes] = useState<Set<string>>(new Set());
  const [checkingBusyTimes, setCheckingBusyTimes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showInlineDatePicker, setShowInlineDatePicker] = useState(false);
  const inlineSelectedDateLabel = useMemo(
    () => formatVietnameseDate(formatDateInput(inlinePickerDate)),
    [inlinePickerDate],
  );

  const fetchDoctors = useCallback(async () => {
    if (!isAuthenticated) return;
    setDoctorsLoading(true);
    try {
      const response = await apiRequest<any>('/api/v1/users/doctors', { token });
      const payload = response.data as any;
      const list: Doctor[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.users)
          ? payload.users
          : Array.isArray(payload?.data)
            ? payload.data
            : [];
      setDoctors(list);
      setErrorMessage(null);
      if (list.length > 0) {
        const firstId = list[0]._id ?? list[0].id ?? '';
        setSelectedDoctorId((current) => current || firstId);
      }
    } catch (error) {
      console.warn('fetchDoctors failed', error);
      setDoctors([]);
      setErrorMessage((prev) => prev ?? 'Không thể tải danh sách bác sĩ. Vui lòng thử lại sau.');
    } finally {
      setDoctorsLoading(false);
    }
  }, [isAuthenticated, token]);

  const fetchAppointments = useCallback(
    async (withSpinner = true) => {
      if (!patientId || !token) return;
      if (withSpinner) {
        setAppointmentsLoading(true);
      }
      try {
        const response = await apiRequest<any>(`/api/v1/appointments/patient/${patientId}`, {
          token,
        });
        const payload = response.data as any;
        const list: Record<string, any>[] = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.results)
            ? payload.results
            : Array.isArray(payload?.data)
              ? payload.data
              : [];
        setAppointments(list);
        setErrorMessage(null);
      } catch (error) {
        console.warn('fetchAppointments failed', error);
        setErrorMessage(formatApiError(error, 'Không thể tải danh sách lịch hẹn.'));
      } finally {
        if (withSpinner) {
          setAppointmentsLoading(false);
        }
      }
    },
    [patientId, token],
  );

  const fetchDoctorBusyTimes = useCallback(
    async (doctorId: string, dateString: string) => {
      if (!doctorId || !dateString) {
        setBusyTimes(new Set());
        return;
      }
      try {
        setCheckingBusyTimes(true);
        const response = await apiRequest<any>(`/api/v1/appointments/doctor/${doctorId}`, {
          token,
        });
        const payload = response.data as any;
        const list: Record<string, any>[] = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.results)
            ? payload.results
            : Array.isArray(payload?.data)
              ? payload.data
              : [];
        const busy = new Set<string>();
        list.forEach((item) => {
          const rawDate = getAppointmentDateRaw(item);
          if (rawDate !== dateString) return;
          const time = normalizeTimeString(item.startTime ?? item.time ?? item.appointmentTime);
          if (time) {
            busy.add(time);
          }
        });
        setBusyTimes(busy);
      } catch (error) {
        console.warn('fetchDoctorBusyTimes failed', error);
        setBusyTimes(new Set());
      } finally {
        setCheckingBusyTimes(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    void fetchDoctors();
  }, [isAuthenticated, fetchDoctors]);

  useFocusEffect(
    useCallback(() => {
      if (!patientId || !token) return;
      void fetchAppointments();
    }, [patientId, token, fetchAppointments]),
  );

  useEffect(() => {
    if (selectedDoctorId && selectedDate) {
      void fetchDoctorBusyTimes(selectedDoctorId, selectedDate);
    } else {
      setBusyTimes(new Set());
    }
  }, [selectedDoctorId, selectedDate, fetchDoctorBusyTimes]);

  useEffect(() => {
    if (selectedDate) {
      setInlinePickerDate(dateFromInput(selectedDate));
    } else {
      setInlinePickerDate(new Date());
    }
  }, [selectedDate]);

  useEffect(() => {
    setSelectedTime('');
  }, [selectedDate, selectedDoctorId]);

  const onRefresh = useCallback(async () => {
    if (!patientId || !token) return;
    setRefreshing(true);
    await fetchAppointments(false);
    setRefreshing(false);
  }, [fetchAppointments, patientId, token]);

  const openDatePicker = useCallback(() => {
    const initialDate = selectedDate ? dateFromInput(selectedDate) : new Date();
    setInlinePickerDate(initialDate);

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        mode: 'date',
        value: initialDate,
        minimumDate: new Date(),
        onChange: (event: DateTimePickerEvent, dateValue?: Date) => {
          if (event.type === 'dismissed') {
            return;
          }
          if (dateValue) {
            setSelectedDate(formatDateInput(dateValue));
          }
        },
      });
      return;
    }

    setShowInlineDatePicker(true);
  }, [selectedDate]);

  const handleWebDateChange = useCallback((event: { target?: { value?: string } }) => {
    const value = event?.target?.value;
    if (value) {
      setInlinePickerDate(dateFromInput(value));
    }
  }, []);

  const upcomingAndHistory = useMemo(() => {
    const now = new Date();
    const upcoming: AppointmentDisplay[] = [];
    const history: AppointmentDisplay[] = [];

    appointments.forEach((item) => {
      const display = buildAppointmentDisplay(item);
      const dateTime = getAppointmentDateTime(item);
      if (!dateTime || dateTime.getTime() >= now.getTime()) {
        upcoming.push(display);
      } else {
        history.push(display);
      }
    });

    upcoming.sort((a, b) => a.sortKey - b.sortKey);
    history.sort((a, b) => b.sortKey - a.sortKey);

    return { upcoming, history };
  }, [appointments]);

  const isTimeDisabled = useCallback(
    (time: string) => {
      if (!selectedDate) {
        return true;
      }
      if (busyTimes.has(time)) {
        return true;
      }
      const dateTime = combineDateAndTime(selectedDate, time);
      if (!dateTime) {
        return true;
      }
      const now = new Date();
      if (dateTime.getTime() <= now.getTime()) {
        return true;
      }
      if (dateTime.getTime() - now.getTime() < MINIMUM_LEAD_MS) {
        return true;
      }
      return false;
    },
    [selectedDate, busyTimes],
  );

  const handleSubmit = useCallback(async () => {
    if (!isAuthenticated || !patientId || !token) {
      Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập để đặt lịch hẹn.');
      return;
    }

    if (!selectedDoctorId) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn bác sĩ phụ trách.');
      return;
    }

    if (!selectedDate || !selectedTime) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn ngày và giờ khám.');
      return;
    }

    const dateTime = combineDateAndTime(selectedDate, selectedTime);
    if (!dateTime) {
      Alert.alert('Thời gian không hợp lệ', 'Không thể xác định thời gian đã chọn.');
      return;
    }

    const now = new Date();
    if (dateTime.getTime() <= now.getTime()) {
      Alert.alert('Thời gian không hợp lệ', 'Không thể đặt lịch vào thời điểm đã qua.');
      return;
    }

    if (dateTime.getTime() - now.getTime() < MINIMUM_LEAD_MS) {
      Alert.alert('Thời gian quá gấp', 'Vui lòng đặt lịch trước ít nhất 2 giờ.');
      return;
    }

    setSubmitting(true);

    try {
      const endTime = addMinutesToTime(selectedTime, 30);
      const appointmentDateISO = new Date(`${selectedDate}T00:00:00.000Z`).toISOString();

      await apiRequest('/api/v1/appointments', {
        method: 'POST',
        token,
        body: {
          patientId,
          doctorId: selectedDoctorId,
          appointmentDate: appointmentDateISO,
          startTime: selectedTime,
          endTime,
          appointmentType,
          notes: notes.trim(),
          duration: 30,
        },
      });

      Alert.alert('Đặt lịch thành công', 'Lịch hẹn của bạn đã được tạo. Vui lòng chờ bác sĩ xác nhận.');
      setSelectedDate('');
      setSelectedTime('');
      setNotes('');
      await fetchAppointments();
    } catch (error) {
      const message = formatApiError(error, 'Không thể tạo lịch hẹn. Vui lòng thử lại.');
      Alert.alert('Đặt lịch thất bại', message);
    } finally {
      setSubmitting(false);
    }
  }, [
    isAuthenticated,
    patientId,
    token,
    selectedDoctorId,
    selectedDate,
    selectedTime,
    appointmentType,
    notes,
    fetchAppointments,
  ]);

  const handleCancelAppointment = useCallback(
    (appointment: AppointmentDisplay) => {
      if (!token) {
        Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập để hủy lịch.');
        return;
      }

      Alert.alert('Hủy lịch hẹn', 'Bạn có chắc muốn hủy lịch hẹn này không?', [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Đồng ý',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(appointment.id);
            try {
              await apiRequest(`/api/v1/appointments/${appointment.id}/cancel`, {
                method: 'DELETE',
                token,
                body: { reason: 'Hủy bởi bệnh nhân trên ứng dụng di động' },
              });
              Alert.alert('Đã hủy lịch hẹn');
              await fetchAppointments();
            } catch (error) {
              const message = formatApiError(error, 'Không thể hủy lịch hẹn.');
              Alert.alert('Hủy lịch thất bại', message);
            } finally {
              setCancellingId(null);
            }
          },
        },
      ]);
    },
    [token, fetchAppointments],
  );

  const formDisabled = !isAuthenticated || submitting || isHydrating;

  return (
    <LinearGradient colors={['#eef2ff', '#e0f2fe', '#fff']} className="flex-1">
      <SafeAreaView className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            isAuthenticated ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" /> : undefined
          }
        >
          <View className="space-y-6">
            <View className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-lg shadow-blue-100">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-2xl font-semibold text-slate-900">Quản lý lịch hẹn</Text>
                  <Text className="mt-2 text-sm text-slate-500">
                    Đặt lịch mới, xem trạng thái và chuẩn bị cho các buổi khám cùng Smart Dental.
                  </Text>
                </View>
                <View className="items-center justify-center rounded-3xl bg-blue-100 p-4">
                  <Users color="#1d4ed8" size={28} />
                </View>
              </View>
              {isAuthenticated ? (
                <Text className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  Xin chào {session?.user?.fullName ?? session?.user?.email}, hãy chọn bác sĩ và thời gian phù hợp để đặt lịch khám.
                </Text>
              ) : (
                <TouchableOpacity
                  className="mt-4 items-center justify-center rounded-2xl bg-blue-600 py-3"
                  onPress={() => router.push('/(auth)/login' as const)}
                >
                  <Text className="text-sm font-semibold text-white">Đăng nhập để đặt lịch</Text>
                </TouchableOpacity>
              )}
            </View>

            {errorMessage ? (
              <View className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                <View className="flex-row items-center space-x-2">
                  <AlertTriangle color="#b45309" size={20} />
                  <Text className="flex-1 text-sm font-semibold text-amber-800">{errorMessage}</Text>
                </View>
              </View>
            ) : null}

            <View className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-lg shadow-blue-100">
              <Text className="text-lg font-semibold text-slate-900">Đặt lịch mới</Text>
              <Text className="mt-2 text-sm text-slate-500">
                Lựa chọn bác sĩ, khung giờ và ghi chú nhu cầu của bạn. Lịch hẹn sẽ được xác nhận trong thời gian sớm nhất.
              </Text>

              <View className="mt-6 space-y-5">
                <View>
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Bác sĩ phụ trách</Text>
                  <TouchableOpacity
                    className={`flex-row items-center justify-between rounded-2xl border px-4 py-3 ${
                      formDisabled ? 'border-slate-200 bg-slate-50' : 'border-blue-200 bg-blue-50'
                    }`}
                    onPress={() => setDoctorModalVisible(true)}
                    disabled={formDisabled}
                  >
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-slate-900">
                        {doctors.find((doc) => (doc._id ?? doc.id) === selectedDoctorId)?.fullName ??
                          doctors.find((doc) => (doc._id ?? doc.id) === selectedDoctorId)?.name ??
                          'Chọn bác sĩ'}
                      </Text>
                      <Text className="mt-1 text-xs text-slate-500">Nhấn để xem danh sách bác sĩ</Text>
                    </View>
                    {doctorsLoading ? <ActivityIndicator color="#1d4ed8" /> : <Users color="#1d4ed8" size={20} />}
                  </TouchableOpacity>
                </View>

                <View>
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Ngày khám</Text>
                  <TouchableOpacity
                    className={`flex-row items-center justify-between rounded-2xl border px-4 py-3 ${
                      formDisabled ? 'border-slate-200 bg-slate-50' : 'border-blue-200 bg-blue-50'
                    }`}
                    onPress={openDatePicker}
                    disabled={formDisabled}
                  >
                    <Text className="text-sm font-semibold text-slate-900">
                      {selectedDate ? formatVietnameseDate(selectedDate) : 'Chọn ngày khám'}
                    </Text>
                    <Calendar color="#1d4ed8" size={20} />
                  </TouchableOpacity>
                </View>

                <View>
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Khung giờ</Text>
                  <View className="flex-row flex-wrap gap-3">
                    {AVAILABLE_TIMES.map((time) => {
                      const disabled = formDisabled || isTimeDisabled(time);
                      const selected = selectedTime === time;
                      return (
                        <TouchableOpacity
                          key={time}
                          disabled={disabled}
                          onPress={() => setSelectedTime(time)}
                          className={`rounded-2xl border px-4 py-2 ${
                            selected ? 'border-blue-600 bg-blue-600' : 'border-blue-100 bg-white'
                          } ${disabled ? 'opacity-40' : ''}`}
                        >
                          <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-blue-700'}`}>{time}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {selectedDate ? (
                    <View className="mt-3 flex-row items-center space-x-2">
                      {checkingBusyTimes ? (
                        <ActivityIndicator color="#1d4ed8" size="small" />
                      ) : (
                        <Clock color="#1d4ed8" size={16} />
                      )}
                      <Text className="flex-1 text-xs text-slate-500">
                        {busyTimes.size > 0
                          ? `Khung giờ đã kín: ${Array.from(busyTimes.values()).sort().join(', ')}`
                          : 'Chọn khung giờ phù hợp, nên đặt trước ít nhất 2 giờ.'}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View>
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Loại lịch hẹn</Text>
                  <View className="flex-row flex-wrap gap-3">
                    {APPOINTMENT_TYPE_OPTIONS.map((option) => {
                      const active = appointmentType === option;
                      return (
                        <TouchableOpacity
                          key={option}
                          className={`rounded-2xl border px-4 py-2 ${
                            active ? 'border-emerald-500 bg-emerald-100' : 'border-slate-200 bg-white'
                          }`}
                          onPress={() => setAppointmentType(option)}
                          disabled={formDisabled}
                        >
                          <Text
                            className={`text-sm font-semibold ${active ? 'text-emerald-700' : 'text-slate-600'}`}
                          >
                            {option}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View>
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Ghi chú cho bác sĩ</Text>
                  <TextInput
                    className="min-h-[100px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                    placeholder="Mô tả triệu chứng, tiền sử bệnh hoặc nhu cầu của bạn..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    value={notes}
                    onChangeText={setNotes}
                    editable={!formDisabled}
                  />
                </View>

                <TouchableOpacity
                  className={`items-center justify-center rounded-2xl py-4 ${
                    formDisabled ? 'bg-slate-300' : 'bg-blue-600'
                  }`}
                  onPress={handleSubmit}
                  disabled={formDisabled}
                >
                  {submitting ? (
                    <View className="flex-row items-center space-x-2">
                      <ActivityIndicator color="#ffffff" />
                      <Text className="text-base font-semibold text-white">Đang gửi yêu cầu...</Text>
                    </View>
                  ) : (
                    <Text className="text-base font-semibold text-white">Đặt lịch khám</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-lg shadow-blue-100">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-semibold text-slate-900">Lịch hẹn sắp tới</Text>
                <View className="flex-row items-center space-x-2">
                  <CheckCircle color="#1d4ed8" size={18} />
                  <Text className="text-xs font-medium text-blue-700">Tự động làm mới</Text>
                </View>
              </View>
              {appointmentsLoading && !refreshing ? (
                <View className="items-center py-8">
                  <ActivityIndicator color="#1d4ed8" />
                </View>
              ) : upcomingAndHistory.upcoming.length > 0 ? (
                <View className="mt-5 space-y-4">
                  {upcomingAndHistory.upcoming.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onCancel={handleCancelAppointment}
                      cancelling={cancellingId === appointment.id}
                    />
                  ))}
                </View>
              ) : (
                <View className="mt-5 items-center rounded-3xl border border-dashed border-blue-200 bg-blue-50/60 p-6">
                  <Calendar color="#1d4ed8" size={28} />
                  <Text className="mt-3 text-sm font-semibold text-blue-700">Chưa có lịch hẹn nào sắp tới</Text>
                  <Text className="mt-1 text-xs text-blue-500">Hãy đặt lịch mới để bắt đầu hành trình chăm sóc răng miệng.</Text>
                </View>
              )}
            </View>

            <View className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-lg shadow-blue-100">
              <Text className="text-lg font-semibold text-slate-900">Chuẩn bị cho buổi khám</Text>
              <View className="mt-5 space-y-3">
                <View className="flex-row items-center space-x-3 rounded-2xl bg-blue-50 p-3">
                  <Clock color="#1d4ed8" size={18} />
                  <Text className="flex-1 text-sm text-slate-600">Đến sớm 10 phút để hoàn tất thủ tục và khai báo y tế.</Text>
                </View>
                <View className="flex-row items-center space-x-3 rounded-2xl bg-blue-50 p-3">
                  <Phone color="#1d4ed8" size={18} />
                  <Text className="flex-1 text-sm text-slate-600">Mang theo thẻ BHYT, giấy tờ tùy thân và hồ sơ khám trước đó.</Text>
                </View>
                <View className="flex-row items-center space-x-3 rounded-2xl bg-blue-50 p-3">
                  <Video color="#1d4ed8" size={18} />
                  <Text className="flex-1 text-sm text-slate-600">Kiểm tra đường truyền và thiết bị nếu thực hiện tư vấn trực tuyến.</Text>
                </View>
              </View>
            </View>

            <View className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-lg shadow-blue-100">
              <Text className="text-lg font-semibold text-slate-900">Lịch sử khám</Text>
              {appointmentsLoading && !refreshing ? (
                <View className="items-center py-8">
                  <ActivityIndicator color="#1d4ed8" />
                </View>
              ) : upcomingAndHistory.history.length > 0 ? (
                <View className="mt-4 space-y-3">
                  {upcomingAndHistory.history.map((appointment) => (
                    <HistoryCard key={appointment.id} appointment={appointment} />
                  ))}
                </View>
              ) : (
                <Text className="mt-4 text-sm text-slate-500">
                  Chưa có lịch sử khám nào. Khi bạn hoàn thành buổi khám, lịch sử sẽ xuất hiện tại đây.
                </Text>
              )}
            </View>
          </View>
        </ScrollView>

        <DoctorSelectModal
          visible={doctorModalVisible}
          doctors={doctors}
          selectedDoctorId={selectedDoctorId}
          onClose={() => setDoctorModalVisible(false)}
          onSelect={(id) => setSelectedDoctorId(id)}
        />

        {showInlineDatePicker ? (
          <Modal
            visible
            transparent
            animationType="fade"
            onRequestClose={() => setShowInlineDatePicker(false)}
          >
            <View className="flex-1 items-center justify-center bg-slate-900/40">
              <View className="w-11/12 max-w-xl">
                <LinearGradient
                  colors={['#f8fafc', '#e0f2fe']}
                  className="rounded-3xl p-5 shadow-2xl shadow-blue-200"
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-4">
                      <View className="flex-row items-center space-x-2">
                        <View className="rounded-full bg-blue-100 p-2">
                          <Calendar color="#1d4ed8" size={18} />
                        </View>
                        <Text className="text-base font-semibold text-slate-900">Chọn ngày khám</Text>
                      </View>
                      <Text className="mt-2 text-xs text-slate-500">
                        Lựa chọn ngày phù hợp. Bạn có thể đổi nhanh bằng các nút gợi ý bên dưới.
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowInlineDatePicker(false)} className="rounded-full bg-slate-200 px-3 py-1">
                      <Text className="text-xs font-semibold text-slate-600">Đóng</Text>
                    </TouchableOpacity>
                  </View>

                  <View className="mt-4 rounded-2xl border border-blue-200 bg-white/80 p-4">
                    <Text className="text-xs font-semibold uppercase tracking-wide text-blue-600">Ngày đã chọn</Text>
                    <Text className="mt-1 text-lg font-semibold text-slate-900">{inlineSelectedDateLabel}</Text>
                  </View>

                  <View className="mt-3 flex-row flex-wrap gap-3">
                    <TouchableOpacity
                      className="flex-1 items-center rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2"
                      onPress={() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        setInlinePickerDate(today);
                      }}
                    >
                      <Text className="text-sm font-semibold text-blue-700">Hôm nay</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 items-center rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2"
                      onPress={() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        tomorrow.setHours(0, 0, 0, 0);
                        setInlinePickerDate(tomorrow);
                      }}
                    >
                      <Text className="text-sm font-semibold text-blue-700">Ngày mai</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 items-center rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2"
                      onPress={() => {
                        const weekend = new Date();
                        const day = weekend.getDay();
                        const offset = day === 6 ? 0 : day === 0 ? 0 : 6 - day;
                        weekend.setDate(weekend.getDate() + offset);
                        weekend.setHours(0, 0, 0, 0);
                        setInlinePickerDate(weekend);
                      }}
                    >
                      <Text className="text-sm font-semibold text-blue-700">Cuối tuần gần nhất</Text>
                    </TouchableOpacity>
                  </View>

                  <View className="mt-4 rounded-3xl border border-white/70 bg-white/90 p-3">
                    {Platform.OS === 'web'
                      ? (
                          <View className="w-full">
                            {createElement('input', {
                              type: 'date',
                              value: formatDateInput(inlinePickerDate),
                              min: formatDateInput(new Date()),
                              onChange: handleWebDateChange,
                              style: {
                                width: '100%',
                                height: 56,
                                fontSize: 16,
                                padding: '12px 16px',
                                borderRadius: 16,
                                border: '1px solid #bfdbfe',
                                background: 'linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%)',
                                color: '#1e293b',
                                outline: 'none',
                              },
                            } as any)}
                          </View>
                        )
                      : (
                          <DateTimePicker
                            mode="date"
                            display={Platform.OS === 'ios' ? 'inline' : 'spinner'}
                            value={inlinePickerDate}
                            minimumDate={new Date()}
                            onChange={(_, dateValue) => {
                              if (dateValue) {
                                setInlinePickerDate(dateValue);
                              }
                            }}
                          />
                        )}
                  </View>

                  <View className="mt-5 flex-row justify-end space-x-3">
                    <TouchableOpacity
                      className="rounded-2xl border border-slate-200 px-4 py-2"
                      onPress={() => setShowInlineDatePicker(false)}
                    >
                      <Text className="text-sm font-semibold text-slate-600">Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="rounded-2xl bg-blue-600 px-4 py-2"
                      onPress={() => {
                        setSelectedDate(formatDateInput(inlinePickerDate));
                        setShowInlineDatePicker(false);
                      }}
                    >
                      <Text className="text-sm font-semibold text-white">Chọn</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>
            </View>
          </Modal>
        ) : null}
      </SafeAreaView>
    </LinearGradient>
  );
}
