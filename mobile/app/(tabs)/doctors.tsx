import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import DoctorDetailModal from '@/components/doctors/DoctorDetailModal';
import { AppHeader } from '@/components/layout/AppHeader';
import { PolicyButton, PolicyModal } from '@/components/policy';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { apiRequest, formatApiError } from '@/utils/api';

type Doctor = {
  _id?: string;
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  phone?: string;
  specialty?: string;
  specialization?: string;
  experienceYears?: number;
  rating?: number;
  bio?: string;
};

type DoctorCardProps = {
  doctor: Doctor;
  onBook: (doctor: Doctor) => void;
  onChat: (doctor: Doctor) => void;
  onView?: (doctor: Doctor) => void;
};

const FALLBACK_SPECIALTIES = ['Nha khoa tổng quát', 'Chỉnh nha', 'Điều trị tủy', 'Thẩm mỹ răng'];

function DoctorCard({ doctor, onBook, onChat, onView }: DoctorCardProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const hasHighRating = (doctor.rating ?? 4.5) >= 4.5;
  
  return (
    <Card shadow="md" className="mb-4">
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onView?.(doctor)}
        className="flex-row items-start justify-between"
      >
        <View className="flex-1 pr-4">
          <Text className="text-lg font-semibold" style={{ color: theme.text.primary }}>
            {doctor.fullName ?? doctor.name ?? 'Bác sĩ Smart Dental'}
          </Text>
          <Text className="mt-1 text-sm" style={{ color: Colors.primary[700] }}>
            {doctor.specialty ?? doctor.specialization ?? 'Nha khoa tổng quát'}
          </Text>
          {doctor.bio ? (
            <Text className="mt-2 text-xs leading-5" style={{ color: theme.text.secondary }} numberOfLines={3}>
              {doctor.bio}
            </Text>
          ) : null}
        </View>
        <View className="items-end gap-2">
          <Badge variant="primary" size="sm">
            {doctor.experienceYears ?? 5}+ năm
          </Badge>
          {hasHighRating ? (
            <View className="flex-row items-center gap-1 rounded-full px-2 py-1" style={{ backgroundColor: Colors.success[50] }}>
              <Ionicons name="star" size={14} color={Colors.success[600]} />
              <Text className="text-xs font-semibold" style={{ color: Colors.success[700] }}>
                {(doctor.rating ?? 4.7).toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>

      <View className="mt-4 gap-2">
        <View className="flex-row items-center gap-2">
          <Ionicons name="medical-outline" size={16} color={Colors.primary[600]} />
          <Text className="flex-1 text-xs" style={{ color: theme.text.secondary }}>
            Đang nhận bệnh tại{' '}
            <Text className="font-semibold">Smart Dental Clinic</Text>
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Ionicons name="location-outline" size={16} color={Colors.primary[600]} />
          <Text className="flex-1 text-xs" style={{ color: theme.text.secondary }}>
            123 Nguyễn Đình Chiểu, Q.1, TP.HCM
          </Text>
        </View>
      </View>

      <View className="mt-5 flex-row gap-3">
        <TouchableOpacity
          className="flex-1 items-center justify-center rounded-2xl py-3"
          style={{ backgroundColor: Colors.primary[600] }}
          onPress={() => onBook(doctor)}
        >
          <View className="flex-row items-center gap-2">
            <Ionicons name="calendar-outline" size={18} color="#ffffff" />
            <Text className="text-sm font-semibold text-white">Đặt lịch</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 items-center justify-center rounded-2xl py-3"
          style={{ backgroundColor: Colors.primary[50], borderWidth: 1, borderColor: Colors.primary[200] }}
          onPress={() => onChat(doctor)}
        >
          <View className="flex-row items-center gap-2">
            <Ionicons name="chatbubble-outline" size={18} color={Colors.primary[600]} />
            <Text className="text-sm font-semibold" style={{ color: Colors.primary[700] }}>
              Trao đổi
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

export default function DoctorsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { isAuthenticated, session } = useAuth();
  const token = session?.token;

  const [search, setSearch] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [showDoctorModal, setShowDoctorModal] = useState(false);

  const loadDoctors = useCallback(async () => {
    if (!isAuthenticated) {
      setDoctors([]);
      return;
    }

    setLoading(true);
    setError(null);
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
    } catch (err) {
      console.warn('loadDoctors failed', err);
      setError(formatApiError(err, 'Không thể tải danh sách bác sĩ.'));
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    void loadDoctors();
  }, [loadDoctors]);

  const specialties = useMemo(() => {
    const collected = new Set<string>();
    doctors.forEach((doctor) => {
      const value = (doctor.specialty ?? doctor.specialization ?? '').trim();
      if (value) {
        collected.add(value);
      }
    });
    if (collected.size === 0) {
      return FALLBACK_SPECIALTIES;
    }
    return Array.from(collected.values());
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    const query = search.trim().toLowerCase();
    return doctors.filter((doctor) => {
      const name = (doctor.fullName ?? doctor.name ?? '').toLowerCase();
      const mail = (doctor.email ?? '').toLowerCase();
      const spec = (doctor.specialty ?? doctor.specialization ?? '').toLowerCase();
      const matchesQuery = query ? name.includes(query) || mail.includes(query) || spec.includes(query) : true;
      const matchesSpecialty = selectedSpecialty === 'all' ? true : spec.includes(selectedSpecialty.toLowerCase());
      return matchesQuery && matchesSpecialty;
    });
  }, [doctors, search, selectedSpecialty]);

  const handleBook = useCallback((doctor: Doctor) => {
    const id = doctor._id ?? doctor.id;
    if (!id) {
      return;
    }
    router.push({
      pathname: '/(tabs)/appointments',
      params: { 
        doctorId: id, 
        doctorName: doctor.fullName ?? doctor.name ?? '',
        autoOpenBooking: 'true'
      },
    });
  }, [router]);

  const handleView = useCallback((doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setShowDoctorModal(true);
  }, []);

  const handleChat = useCallback(async (doctor: Doctor) => {
    const doctorId = doctor._id ?? doctor.id;
    const doctorName = doctor.fullName ?? doctor.name ?? 'Bác sĩ';
    if (!doctorId || !session?.token || !session?.user?._id) {
      router.push('/(tabs)/chat');
      return;
    }

    // Try to find existing conversation with this doctor
    try {
      const { apiRequest } = await import('@/utils/api');
      const userId = session.user._id;
      const userRole = session.user.role;
      
      const response = await apiRequest<any>(
        `/api/v1/realtime-chat/conversations?userId=${userId}&userRole=${userRole}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        }
      );

      const conversations: any[] = Array.isArray(response.data) ? response.data : [];
      const existingConversation = conversations.find(
        (conv) => (conv.doctorId?._id || conv.doctorId) === doctorId
      );

      const conversationId = existingConversation?._id;

      router.push({
        pathname: '/chat/[id]',
        params: {
          id: doctorId,
          name: doctorName,
          type: 'doctor',
          ...(conversationId ? { conversationId } : {}),
        },
      });
    } catch (error) {
      console.warn('Failed to fetch conversations, navigating without conversationId:', error);
      // If fetch fails, still navigate but without conversationId
      // Chat screen will create/find conversation automatically
      router.push({
        pathname: '/chat/[id]',
        params: {
          id: doctorId,
          name: doctorName,
          type: 'doctor',
        },
      });
    }
  }, [router, session]);

  return (
    <>
      <AppHeader 
        title="Bác sĩ" 
        showNotification 
        showAvatar 
        rightComponent={<PolicyButton onPress={() => setShowPolicyModal(true)} />}
      />
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="space-y-6">
          {/* Header Card */}
          <Card className="mb-6">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                  Đội ngũ bác sĩ
                </Text>
                <Text className="mt-2 text-sm" style={{ color: theme.text.secondary }}>
                  Tìm kiếm bác sĩ phù hợp, xem chuyên khoa và đặt lịch khám nhanh chóng.
                </Text>
              </View>
              <View 
                className="items-center justify-center rounded-2xl p-4"
                style={{ backgroundColor: Colors.primary[100] }}
              >
                <Ionicons name="medical" size={28} color={Colors.primary[600]} />
              </View>
            </View>
            {isAuthenticated ? (
              <View className="mt-4 rounded-2xl p-4" style={{ backgroundColor: Colors.primary[50] }}>
                <Text className="text-sm" style={{ color: Colors.primary[700] }}>
                  Xin chào {session?.user?.fullName ?? session?.user?.email}, hãy chọn bác sĩ phù hợp để đặt lịch hoặc trao đổi.
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                className="mt-4 items-center justify-center rounded-2xl py-3"
                style={{ backgroundColor: Colors.primary[600] }}
                onPress={() => router.push('/(auth)/login' as const)}
              >
                <Text className="text-sm font-semibold text-white">Đăng nhập để xem danh sách bác sĩ</Text>
              </TouchableOpacity>
            )}
          </Card>

          {/* Search & Filter Card */}
          <Card className="mb-6">
            <View className="space-y-4">
              <View
                className="flex-row items-center rounded-2xl px-4 py-3"
                style={{ backgroundColor: Colors.primary[50], borderWidth: 1, borderColor: Colors.primary[100] }}
              >
                <Ionicons name="search-outline" size={18} color={Colors.primary[600]} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Tìm theo tên, email hoặc chuyên khoa"
                  placeholderTextColor={theme.text.secondary}
                  className="ml-3 flex-1 text-sm"
                  style={{ color: theme.text.primary }}
                />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row items-center space-x-3">
                  <View
                    className="flex-row items-center space-x-2 rounded-2xl px-3 py-2"
                    style={{ backgroundColor: Colors.primary[50] }}
                  >
                    <Ionicons name="filter-outline" size={16} color={Colors.primary[600]} />
                    <Text className="text-xs font-semibold" style={{ color: Colors.primary[700] }}>
                      Chuyên khoa
                    </Text>
                  </View>
                  <TouchableOpacity
                    className="rounded-2xl px-4 py-2"
                    style={{
                      borderWidth: 1,
                      borderColor: selectedSpecialty === 'all' ? Colors.primary[600] : Colors.primary[100],
                      backgroundColor: selectedSpecialty === 'all' ? Colors.primary[600] : theme.card,
                    }}
                    onPress={() => setSelectedSpecialty('all')}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: selectedSpecialty === 'all' ? '#ffffff' : Colors.primary[700] }}
                    >
                      Tất cả
                    </Text>
                  </TouchableOpacity>
                  {specialties.map((item) => (
                    <TouchableOpacity
                      key={item}
                      className="rounded-2xl px-4 py-2"
                      style={{
                        borderWidth: 1,
                        borderColor: selectedSpecialty === item ? Colors.primary[600] : Colors.primary[100],
                        backgroundColor: selectedSpecialty === item ? Colors.primary[600] : theme.card,
                      }}
                      onPress={() => setSelectedSpecialty(item)}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: selectedSpecialty === item ? '#ffffff' : Colors.primary[700] }}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </Card>

          {/* Content */}
          {loading ? (
            <View className="items-center justify-center py-16">
              <ActivityIndicator color={Colors.primary[600]} size="large" />
              <Text className="mt-3 text-sm" style={{ color: theme.text.secondary }}>
                Đang tải danh sách bác sĩ...
              </Text>
            </View>
          ) : error ? (
            <Card shadow="md" className="p-6" style={{ backgroundColor: Colors.warning[50] }}>
              <Text className="text-sm font-semibold" style={{ color: Colors.warning[700] }}>
                {error}
              </Text>
              <TouchableOpacity
                className="mt-3 rounded-2xl px-4 py-2"
                style={{ backgroundColor: Colors.primary[600] }}
                onPress={() => void loadDoctors()}
              >
                <Text className="text-sm font-semibold text-white">Thử lại</Text>
              </TouchableOpacity>
            </Card>
          ) : filteredDoctors.length === 0 ? (
            <Card shadow="md" className="p-8 items-center">
              <View
                className="rounded-full p-4"
                style={{ backgroundColor: Colors.primary[50] }}
              >
                <Ionicons name="calendar-outline" size={32} color={Colors.primary[600]} />
              </View>
              <Text className="mt-3 text-sm font-semibold" style={{ color: Colors.primary[700] }}>
                Không tìm thấy bác sĩ phù hợp
              </Text>
              <Text className="mt-1 text-xs" style={{ color: theme.text.secondary }}>
                Hãy thử đổi bộ lọc hoặc tìm kiếm khác.
              </Text>
            </Card>
          ) : (
            <View className="space-y-4">
              {filteredDoctors.map((doctor) => (
                <DoctorCard
                  key={doctor._id ?? doctor.id ?? doctor.email ?? doctor.fullName}
                  doctor={doctor}
                  onBook={handleBook}
                  onChat={handleChat}
                  onView={handleView}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <PolicyModal visible={showPolicyModal} onClose={() => setShowPolicyModal(false)} />
      
      <DoctorDetailModal
        visible={showDoctorModal}
        doctor={selectedDoctor}
        onClose={() => {
          setShowDoctorModal(false);
          setSelectedDoctor(null);
        }}
        onBook={handleBook}
        onChat={handleChat}
      />
    </>
  );
}
