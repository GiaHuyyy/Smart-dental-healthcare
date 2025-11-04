import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppHeader } from '@/components/layout/AppHeader';
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
  address?: string;
  avatarUrl?: string;
};

export default function DoctorDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { session, isAuthenticated } = useAuth();
  const token = session?.token;

  const doctorId = params.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);

  const loadDoctor = useCallback(async () => {
    if (!doctorId || !isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<any>(`/api/v1/users/${doctorId}`, { token });
      const data = response.data as any;
      const doctorData: Doctor = data?.data || data || {};
      setDoctor(doctorData);
    } catch (err) {
      console.warn('loadDoctor failed', err);
      setError(formatApiError(err, 'Không thể tải thông tin bác sĩ.'));
      setDoctor(null);
    } finally {
      setLoading(false);
    }
  }, [doctorId, isAuthenticated, token]);

  useEffect(() => {
    void loadDoctor();
  }, [loadDoctor]);

  const handleBook = useCallback(() => {
    if (!doctor) return;
    const id = doctor._id ?? doctor.id;
    if (!id) return;
    router.push({
      pathname: '/(tabs)/appointments',
      params: {
        doctorId: id,
        doctorName: doctor.fullName ?? doctor.name ?? '',
        autoOpenBooking: 'true',
      },
    });
  }, [doctor, router]);

  const handleChat = useCallback(async () => {
    if (!doctor) return;
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
      router.push({
        pathname: '/chat/[id]',
        params: {
          id: doctorId,
          name: doctorName,
          type: 'doctor',
        },
      });
    }
  }, [doctor, router, session]);

  const handlePhonePress = useCallback((phone?: string) => {
    if (!phone) return;
    const cleaned = phone.replace(/\s+/g, '');
    Linking.openURL(`tel:${cleaned}`).catch(() => {
      Alert.alert('Lỗi', 'Không thể mở ứng dụng gọi điện');
    });
  }, []);

  const handleEmailPress = useCallback((email?: string) => {
    if (!email) return;
    Linking.openURL(`mailto:${email}`).catch(() => {
      Alert.alert('Lỗi', 'Không thể mở ứng dụng email');
    });
  }, []);

  const handleAddressPress = useCallback(async (address?: string) => {
    if (!address) return;
    
    // Encode address for Google Maps
    const encodedAddress = encodeURIComponent(address);
    
    // Platform-specific URL schemes
    let url: string;
    if (Platform.OS === 'ios') {
      // Try iOS Google Maps app first, fallback to web
      url = `comgooglemaps://?q=${encodedAddress}`;
      try {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
          return;
        }
      } catch (error) {
        // Fall through to web version
      }
    } else if (Platform.OS === 'android') {
      // Try Android Google Maps app first, fallback to web
      url = `google.navigation:q=${encodedAddress}`;
      try {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
          return;
        }
      } catch (error) {
        // Fall through to web version
      }
    }
    
    // Fallback to web Google Maps (works on all platforms)
    url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    try {
      await Linking.openURL(url);
    } catch (error) {
      // Final fallback to Google search
      try {
        const searchUrl = `https://www.google.com/search?q=${encodedAddress}`;
        await Linking.openURL(searchUrl);
      } catch (searchError) {
        Alert.alert('Lỗi', 'Không thể mở bản đồ. Vui lòng thử lại sau.');
      }
    }
  }, []);

  if (loading) {
    return (
      <>
        <AppHeader title="Chi tiết bác sĩ" showBack />
        <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
          <ActivityIndicator color={Colors.primary[600]} size="large" />
          <Text className="mt-3 text-sm" style={{ color: theme.text.secondary }}>
            Đang tải thông tin...
          </Text>
        </View>
      </>
    );
  }

  if (error || !doctor) {
    return (
      <>
        <AppHeader title="Chi tiết bác sĩ" showBack />
        <View className="flex-1 items-center justify-center p-6" style={{ backgroundColor: theme.background }}>
          <Card className="p-6 items-center">
            <Ionicons name="alert-circle-outline" size={48} color={Colors.error[600]} />
            <Text className="mt-4 text-base font-semibold" style={{ color: Colors.error[700] }}>
              {error || 'Không tìm thấy bác sĩ'}
            </Text>
            <TouchableOpacity
              className="mt-4 rounded-2xl px-6 py-3"
              style={{ backgroundColor: Colors.primary[600] }}
              onPress={() => router.back()}
            >
              <Text className="text-sm font-semibold text-white">Quay lại</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </>
    );
  }

  const name = doctor.fullName ?? doctor.name ?? 'Bác sĩ Smart Dental';
  const specialty = doctor.specialty ?? doctor.specialization ?? 'Nha khoa tổng quát';
  const rating = doctor.rating ?? 4.7;
  const experience = doctor.experienceYears ?? 5;
  const hasHighRating = rating >= 4.5;

  return (
    <>
      <AppHeader title="Chi tiết bác sĩ" showBack />
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="space-y-6">
          {/* Header Card */}
          <Card className="mb-6">
            <View className="flex-row items-start gap-4">
              <View
                className="w-20 h-20 rounded-full items-center justify-center"
                style={{ backgroundColor: Colors.primary[100] }}
              >
                <Ionicons name="medical-outline" size={32} color={Colors.primary[600]} />
              </View>
              <View className="flex-1">
                <Text className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                  {name}
                </Text>
                <Text className="mt-1 text-base font-semibold" style={{ color: Colors.primary[700] }}>
                  {specialty}
                </Text>
                <View className="mt-2 flex-row items-center gap-3">
                  {hasHighRating && (
                    <View className="flex-row items-center gap-1 rounded-full px-2 py-1" style={{ backgroundColor: Colors.success[50] }}>
                      <Ionicons name="star" size={14} color={Colors.success[600]} />
                      <Text className="text-xs font-semibold" style={{ color: Colors.success[700] }}>
                        {rating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                  <Badge variant="primary" size="sm">
                    {experience}+ năm kinh nghiệm
                  </Badge>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="mt-6 flex-row gap-3">
              <TouchableOpacity
                className="flex-1 items-center justify-center rounded-2xl py-3"
                style={{ backgroundColor: Colors.primary[600] }}
                onPress={handleBook}
              >
                <View className="flex-row items-center gap-2">
                  <Ionicons name="calendar-outline" size={18} color="#ffffff" />
                  <Text className="text-sm font-semibold text-white">Đặt lịch</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center justify-center rounded-2xl py-3"
                style={{ backgroundColor: Colors.primary[50], borderWidth: 1, borderColor: Colors.primary[200] }}
                onPress={handleChat}
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

          {/* Contact Info Card */}
          <Card className="mb-6">
            <Text className="mb-4 text-lg font-semibold" style={{ color: theme.text.primary }}>
              Thông tin liên hệ
            </Text>
            <View className="space-y-3">
              {doctor.phone ? (
                <TouchableOpacity
                  className="flex-row items-center gap-3 rounded-2xl p-3"
                  style={{ backgroundColor: Colors.primary[50] }}
                  onPress={() => handlePhonePress(doctor.phone)}
                  activeOpacity={0.7}
                >
                  <View className="w-10 h-10 items-center justify-center rounded-full" style={{ backgroundColor: Colors.primary[600] }}>
                    <Ionicons name="call-outline" size={20} color="#ffffff" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-medium" style={{ color: theme.text.secondary }}>
                      Số điện thoại
                    </Text>
                    <Text className="mt-1 text-base font-semibold" style={{ color: Colors.primary[700] }}>
                      {doctor.phone}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.primary[600]} />
                </TouchableOpacity>
              ) : (
                <View className="flex-row items-center gap-3 rounded-2xl p-3" style={{ backgroundColor: Colors.gray[50] }}>
                  <View className="w-10 h-10 items-center justify-center rounded-full" style={{ backgroundColor: Colors.gray[300] }}>
                    <Ionicons name="call-outline" size={20} color={Colors.gray[600]} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-medium" style={{ color: theme.text.secondary }}>
                      Số điện thoại
                    </Text>
                    <Text className="mt-1 text-base font-medium" style={{ color: Colors.gray[500] }}>
                      Chưa cập nhật
                    </Text>
                  </View>
                </View>
              )}

              {doctor.email ? (
                <TouchableOpacity
                  className="flex-row items-center gap-3 rounded-2xl p-3"
                  style={{ backgroundColor: Colors.primary[50] }}
                  onPress={() => handleEmailPress(doctor.email)}
                  activeOpacity={0.7}
                >
                  <View className="w-10 h-10 items-center justify-center rounded-full" style={{ backgroundColor: Colors.primary[600] }}>
                    <Ionicons name="mail-outline" size={20} color="#ffffff" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-medium" style={{ color: theme.text.secondary }}>
                      Email
                    </Text>
                    <Text className="mt-1 text-base font-semibold" style={{ color: Colors.primary[700] }} numberOfLines={1}>
                      {doctor.email}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.primary[600]} />
                </TouchableOpacity>
              ) : (
                <View className="flex-row items-center gap-3 rounded-2xl p-3" style={{ backgroundColor: Colors.gray[50] }}>
                  <View className="w-10 h-10 items-center justify-center rounded-full" style={{ backgroundColor: Colors.gray[300] }}>
                    <Ionicons name="mail-outline" size={20} color={Colors.gray[600]} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-medium" style={{ color: theme.text.secondary }}>
                      Email
                    </Text>
                    <Text className="mt-1 text-base font-medium" style={{ color: Colors.gray[500] }}>
                      Chưa cập nhật
                    </Text>
                  </View>
                </View>
              )}

              {doctor.address ? (
                <TouchableOpacity
                  className="flex-row items-start gap-3 rounded-2xl p-3"
                  style={{ backgroundColor: Colors.primary[50] }}
                  onPress={() => handleAddressPress(doctor.address)}
                  activeOpacity={0.7}
                >
                  <View className="w-10 h-10 items-center justify-center rounded-full" style={{ backgroundColor: Colors.primary[600] }}>
                    <Ionicons name="location-outline" size={20} color="#ffffff" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-medium" style={{ color: theme.text.secondary }}>
                      Địa chỉ
                    </Text>
                    <Text className="mt-1 text-base font-semibold" style={{ color: Colors.primary[700] }}>
                      {doctor.address}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.primary[600]} />
                </TouchableOpacity>
              ) : (
                <View className="flex-row items-start gap-3 rounded-2xl p-3" style={{ backgroundColor: Colors.gray[50] }}>
                  <View className="w-10 h-10 items-center justify-center rounded-full" style={{ backgroundColor: Colors.gray[300] }}>
                    <Ionicons name="location-outline" size={20} color={Colors.gray[600]} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-medium" style={{ color: theme.text.secondary }}>
                      Địa chỉ
                    </Text>
                    <Text className="mt-1 text-base font-medium" style={{ color: Colors.gray[500] }}>
                      Chưa cập nhật
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </Card>

          {/* Bio Card */}
          {doctor.bio && (
            <Card className="mb-6">
              <View className="mb-4 flex-row items-center gap-2">
                <Ionicons name="medical-outline" size={20} color={Colors.primary[600]} />
                <Text className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                  Giới thiệu
                </Text>
              </View>
              <Text className="text-sm leading-6" style={{ color: theme.text.secondary }}>
                {doctor.bio}
              </Text>
            </Card>
          )}

          {/* Working Hours Card */}
          <Card className="mb-6">
            <View className="mb-4 flex-row items-center gap-2">
              <Ionicons name="time-outline" size={20} color={Colors.primary[600]} />
              <Text className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                Thời gian làm việc
              </Text>
            </View>
            <View className="space-y-2">
              <Text className="text-sm" style={{ color: theme.text.secondary }}>
                Thứ 2 - Thứ 7: 08:00 - 17:00
              </Text>
              <Text className="text-sm" style={{ color: theme.text.secondary }}>
                Chủ nhật: Nghỉ
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>
    </>
  );
}

