import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Calendar, Filter, MapPin, MessageSquare, Search, Star, Stethoscope, UserPlus } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
};

const FALLBACK_SPECIALTIES = ['Nha khoa tổng quát', 'Chỉnh nha', 'Điều trị tủy', 'Thẩm mỹ răng'];

function DoctorCard({ doctor, onBook, onChat }: DoctorCardProps) {
  const hasHighRating = (doctor.rating ?? 4.5) >= 4.5;
  return (
    <View className="rounded-3xl border border-white/70 bg-white/95 p-5 shadow-lg shadow-blue-100">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-lg font-semibold text-slate-900">
            {doctor.fullName ?? doctor.name ?? 'Bác sĩ Smart Dental'}
          </Text>
          <Text className="mt-1 text-sm text-blue-700">
            {doctor.specialty ?? doctor.specialization ?? 'Nha khoa tổng quát'}
          </Text>
          {doctor.bio ? (
            <Text className="mt-2 text-xs leading-5 text-slate-500" numberOfLines={3}>
              {doctor.bio}
            </Text>
          ) : null}
        </View>
        <View className="items-end">
          <View className="rounded-2xl bg-blue-50 px-3 py-2">
            <Text className="text-xs font-semibold text-blue-700">{doctor.experienceYears ?? 5}+ năm</Text>
          </View>
          {hasHighRating ? (
            <View className="mt-2 flex-row items-center space-x-1 rounded-full bg-emerald-50 px-2 py-1">
              <Star color="#047857" size={14} fill="#047857" />
              <Text className="text-xs font-semibold text-emerald-700">{(doctor.rating ?? 4.7).toFixed(1)}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View className="mt-4 space-y-2">
        <View className="flex-row items-center space-x-2">
          <Stethoscope color="#1d4ed8" size={16} />
          <Text className="flex-1 text-xs text-slate-600">
            Đang nhận bệnh tại{' '}
            <Text className="font-semibold">Smart Dental Clinic</Text>
          </Text>
        </View>
        <View className="flex-row items-center space-x-2">
          <MapPin color="#1d4ed8" size={16} />
          <Text className="flex-1 text-xs text-slate-600">123 Nguyễn Đình Chiểu, Q.1, TP.HCM</Text>
        </View>
      </View>

      <View className="mt-5 flex-row space-x-3">
        <TouchableOpacity
          className="flex-1 items-center justify-center rounded-2xl bg-blue-600 py-3"
          onPress={() => onBook(doctor)}
        >
          <View className="flex-row items-center space-x-2">
            <UserPlus color="#ffffff" size={18} />
            <Text className="text-sm font-semibold text-white">Đặt lịch</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 py-3"
          onPress={() => onChat(doctor)}
        >
          <View className="flex-row items-center space-x-2">
            <MessageSquare color="#1d4ed8" size={18} />
            <Text className="text-sm font-semibold text-blue-700">Trao đổi</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function DoctorsScreen() {
  const router = useRouter();
  const { isAuthenticated, session } = useAuth();
  const token = session?.token;

  const [search, setSearch] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

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
    router.push({
      pathname: '/(tabs)/appointments',
      params: id ? { doctorId: id, doctorName: doctor.fullName ?? doctor.name ?? '' } : undefined,
    });
  }, [router]);

  const handleChat = useCallback((_doctor: Doctor) => {
    router.push('/(tabs)/chat');
  }, [router]);

  return (
    <LinearGradient colors={['#eef2ff', '#e0f2fe', '#fff']} className="flex-1">
      <SafeAreaView className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="space-y-6">
            <View className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-lg shadow-blue-100">
              <View className="flex-row items-start space-x-4">
                <View className="rounded-3xl bg-blue-600/90 p-4 shadow-lg shadow-blue-200">
                  <Stethoscope color="#ffffff" size={28} />
                </View>
                <View className="flex-1">
                  <Text className="text-2xl font-semibold text-slate-900">Đội ngũ bác sĩ</Text>
                  <Text className="mt-2 text-sm text-slate-500">
                    Tìm kiếm bác sĩ phù hợp, xem chuyên khoa và đặt lịch khám nhanh chóng.
                  </Text>
                </View>
              </View>

              <View className="mt-5 rounded-2xl bg-blue-50/70 p-4">
                <Text className="text-xs font-semibold uppercase tracking-wide text-blue-700">MẸO</Text>
                <Text className="mt-1 text-xs text-slate-600">
                  Bạn có thể lọc theo chuyên khoa hoặc tìm nhanh bằng tên, email.
                </Text>
              </View>
            </View>

            <View className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg shadow-blue-100">
              <View className="space-y-4">
                <View className="flex-row items-center rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3">
                  <Search color="#1d4ed8" size={18} />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Tìm theo tên, email hoặc chuyên khoa"
                    placeholderTextColor="#94a3b8"
                    className="ml-3 flex-1 text-sm text-slate-900"
                  />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row items-center space-x-3">
                    <View className="flex-row items-center space-x-2 rounded-2xl bg-blue-50 px-3 py-2">
                      <Filter color="#1d4ed8" size={16} />
                      <Text className="text-xs font-semibold text-blue-700">Chuyên khoa</Text>
                    </View>
                    <TouchableOpacity
                      className={`rounded-2xl border px-4 py-2 ${selectedSpecialty === 'all' ? 'border-blue-600 bg-blue-600' : 'border-blue-100 bg-white'}`}
                      onPress={() => setSelectedSpecialty('all')}
                    >
                      <Text className={`text-xs font-semibold ${selectedSpecialty === 'all' ? 'text-white' : 'text-blue-700'}`}>
                        Tất cả
                      </Text>
                    </TouchableOpacity>
                    {specialties.map((item) => (
                      <TouchableOpacity
                        key={item}
                        className={`rounded-2xl border px-4 py-2 ${selectedSpecialty === item ? 'border-blue-600 bg-blue-600' : 'border-blue-100 bg-white'}`}
                        onPress={() => setSelectedSpecialty(item)}
                      >
                        <Text className={`text-xs font-semibold ${selectedSpecialty === item ? 'text-white' : 'text-blue-700'}`}>
                          {item}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            {loading ? (
              <View className="items-center justify-center py-16">
                <ActivityIndicator color="#1d4ed8" size="large" />
                <Text className="mt-3 text-sm text-slate-500">Đang tải danh sách bác sĩ...</Text>
              </View>
            ) : error ? (
              <View className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
                <Text className="text-sm font-semibold text-amber-700">{error}</Text>
                <TouchableOpacity className="mt-3 rounded-2xl bg-blue-600 px-4 py-2" onPress={() => void loadDoctors()}>
                  <Text className="text-sm font-semibold text-white">Thử lại</Text>
                </TouchableOpacity>
              </View>
            ) : filteredDoctors.length === 0 ? (
              <View className="rounded-3xl border border-dashed border-blue-200 bg-blue-50/60 p-8 items-center text-center">
                <Calendar color="#1d4ed8" size={32} />
                <Text className="mt-3 text-sm font-semibold text-blue-700">Không tìm thấy bác sĩ phù hợp</Text>
                <Text className="mt-1 text-xs text-blue-500">Hãy thử đổi bộ lọc hoặc tìm kiếm khác.</Text>
              </View>
            ) : (
              <View className="space-y-4">
                {filteredDoctors.map((doctor) => (
                  <DoctorCard
                    key={doctor._id ?? doctor.id ?? doctor.email ?? doctor.fullName}
                    doctor={doctor}
                    onBook={handleBook}
                    onChat={handleChat}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
