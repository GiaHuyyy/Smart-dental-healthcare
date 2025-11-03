import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppHeader } from '@/components/layout/AppHeader';
import { PolicyButton, PolicyModal } from '@/components/policy';
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
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
};

type ChatListItemProps = {
  id: string;
  name: string;
  subtitle: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconBgColor: string;
  iconColor: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  onPress: () => void;
};

function ChatListItem({
  name,
  subtitle,
  iconName,
  iconBgColor,
  iconColor,
  lastMessage,
  lastMessageTime,
  unreadCount,
  onPress,
}: ChatListItemProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card className="mb-3">
        <View className="flex-row items-center space-x-3">
          <View 
            className="h-14 w-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: iconBgColor }}
          >
            <Ionicons name={iconName} size={26} color={iconColor} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold" style={{ color: theme.text.primary }}>
                {name}
              </Text>
              {lastMessageTime ? (
                <Text className="text-xs" style={{ color: theme.text.secondary }}>
                  {lastMessageTime}
                </Text>
              ) : null}
            </View>
            <Text className="mt-1 text-xs" style={{ color: theme.text.secondary }}>
              {subtitle}
            </Text>
            {lastMessage ? (
              <Text 
                className="mt-1 text-sm" 
                style={{ color: theme.text.secondary }}
                numberOfLines={1}
              >
                {lastMessage}
              </Text>
            ) : null}
          </View>
          {unreadCount && unreadCount > 0 ? (
            <View 
              className="h-6 min-w-[24px] items-center justify-center rounded-full px-2"
              style={{ backgroundColor: Colors.primary[600] }}
            >
              <Text className="text-xs font-bold text-white">{unreadCount}</Text>
            </View>
          ) : null}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function ChatListScreen() {
  const router = useRouter();
  const { session, isAuthenticated, isHydrating } = useAuth();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  const fetchDoctors = useCallback(async () => {
    if (!isAuthenticated || !session?.token) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await apiRequest<Doctor[]>('/doctors', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });

      if (response.data) {
        setDoctors(response.data);
      } else {
        setErrorMessage('Không thể tải danh sách bác sĩ');
      }
    } catch (error) {
      setErrorMessage(formatApiError(error, 'Lỗi khi tải danh sách bác sĩ'));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, session?.token]);

  useEffect(() => {
    void fetchDoctors();
  }, [fetchDoctors]);

  const handleChatWithAI = useCallback(() => {
    router.push({
      pathname: '/chat/[id]',
      params: { id: 'ai-bot', name: 'Smart Dental AI', type: 'ai' },
    });
  }, [router]);

  const handleChatWithDoctor = useCallback(
    (doctor: Doctor) => {
      const doctorId = doctor._id ?? doctor.id ?? 'unknown';
      const doctorName = doctor.fullName ?? doctor.name ?? 'Bác sĩ';
      router.push({
        pathname: '/chat/[id]',
        params: { id: doctorId, name: doctorName, type: 'doctor' },
      });
    },
    [router],
  );

  const filteredDoctors = doctors.filter((doctor) => {
    if (!searchTerm.trim()) return true;
    const name = doctor.fullName ?? doctor.name ?? '';
    const specialty = doctor.specialty ?? doctor.specialization ?? '';
    const search = searchTerm.toLowerCase();
    return name.toLowerCase().includes(search) || specialty.toLowerCase().includes(search);
  });

  if (!isHydrating && !isAuthenticated) {
    return (
      <>
        <AppHeader 
          title="Tin nhắn" 
          showNotification 
          showAvatar 
          notificationCount={0}
          rightComponent={<PolicyButton onPress={() => setShowPolicyModal(true)} />}
        />
        <ScrollView 
          className="flex-1"
          style={{ backgroundColor: theme.background }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}
        >
          <Card className="w-full max-w-md p-6">
            <View className="items-center">
              <Ionicons name="chatbubbles-outline" size={36} color={Colors.primary[600]} />
              <Text className="mt-4 text-xl font-semibold" style={{ color: theme.text.primary }}>
                Đăng nhập để nhắn tin
              </Text>
              <Text className="mt-2 text-center text-sm" style={{ color: theme.text.secondary }}>
                Trò chuyện với bác sĩ hoặc trợ lý AI để được tư vấn nhanh chóng.
              </Text>
              <TouchableOpacity
                className="mt-6 w-full items-center justify-center rounded-2xl py-3"
                style={{ backgroundColor: Colors.primary[600] }}
                onPress={() => router.push('/(auth)/login' as const)}
              >
                <Text className="text-sm font-semibold text-white">Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </ScrollView>
        <PolicyModal visible={showPolicyModal} onClose={() => setShowPolicyModal(false)} />
      </>
    );
  }

  return (
    <>
      <AppHeader 
        title="Tin nhắn" 
        showNotification 
        showAvatar 
        notificationCount={0}
        rightComponent={<PolicyButton onPress={() => setShowPolicyModal(true)} />}
      />
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48, paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="space-y-6">
          {/* Search bar */}
          <Card className="p-3">
            <View className="flex-row items-center space-x-3">
              <Ionicons name="search-outline" size={20} color={theme.text.secondary} />
              <TextInput
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Tìm bác sĩ..."
                placeholderTextColor="#94a3b8"
                className="flex-1 text-sm"
                style={{ color: theme.text.primary }}
              />
            </View>
          </Card>

          {/* AI Chatbot */}
          <View>
            <Text className="mb-3 px-1 text-xs font-semibold uppercase tracking-wide" style={{ color: theme.text.secondary }}>
              Trợ lý AI
            </Text>
            <ChatListItem
              id="ai-bot"
              name="Smart Dental AI"
              subtitle="Trợ lý nha khoa thông minh • Luôn sẵn sàng"
              iconName="chatbubble-ellipses-outline"
              iconBgColor={Colors.primary[600]}
              iconColor="#ffffff"
              lastMessage="Xin chào! Tôi có thể giúp gì cho bạn?"
              onPress={handleChatWithAI}
            />
          </View>

          {/* Doctors list */}
          <View>
            <View className="mb-3 flex-row items-center justify-between px-1">
              <Text className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.text.secondary }}>
                Bác sĩ ({filteredDoctors.length})
              </Text>
              {loading ? <ActivityIndicator size="small" color={Colors.primary[600]} /> : null}
            </View>

            {errorMessage ? (
              <View 
                className="mb-4 rounded-2xl border p-4"
                style={{ 
                  borderColor: Colors.error[100],
                  backgroundColor: Colors.error[50]
                }}
              >
                <View className="flex-row items-center space-x-2">
                  <Ionicons name="alert-circle-outline" size={18} color={Colors.error[600]} />
                  <Text className="flex-1 text-sm" style={{ color: Colors.error[700] }}>
                    {errorMessage}
                  </Text>
                </View>
              </View>
            ) : null}

            {loading && doctors.length === 0 ? (
              <Card className="items-center justify-center p-8">
                <ActivityIndicator color={Colors.primary[600]} />
                <Text className="mt-3 text-sm" style={{ color: theme.text.secondary }}>
                  Đang tải danh sách bác sĩ...
                </Text>
              </Card>
            ) : filteredDoctors.length === 0 ? (
              <View 
                className="items-center justify-center rounded-2xl border border-dashed p-8"
                style={{ 
                  borderColor: Colors.primary[200],
                  backgroundColor: `${Colors.primary[50]}B3`
                }}
              >
                <Ionicons name="people-outline" size={28} color={Colors.primary[600]} />
                <Text className="mt-3 text-sm font-semibold" style={{ color: Colors.primary[700] }}>
                  {searchTerm.trim() ? 'Không tìm thấy bác sĩ phù hợp' : 'Chưa có bác sĩ nào'}
                </Text>
                <Text className="mt-1 text-xs" style={{ color: Colors.primary[500] }}>
                  {searchTerm.trim() ? 'Thử tìm kiếm với từ khóa khác' : 'Danh sách bác sĩ sẽ xuất hiện ở đây'}
                </Text>
              </View>
            ) : (
              <View className="space-y-0">
                {filteredDoctors.map((doctor) => {
                  const doctorId = doctor._id ?? doctor.id ?? 'unknown';
                  const doctorName = doctor.fullName ?? doctor.name ?? 'Bác sĩ';
                  const specialty = doctor.specialty ?? doctor.specialization ?? 'Chuyên khoa Răng Hàm Mặt';
                  const rating = doctor.rating ?? 4.5;
                  const experience = doctor.experienceYears ?? 5;

                  return (
                    <ChatListItem
                      key={doctorId}
                      id={doctorId}
                      name={doctorName}
                      subtitle={`${specialty} • ${experience} năm kinh nghiệm • ⭐ ${rating.toFixed(1)}`}
                      iconName="medical-outline"
                      iconBgColor={Colors.success[50]}
                      iconColor={Colors.success[600]}
                      lastMessage={doctor.lastMessage}
                      lastMessageTime={doctor.lastMessageTime}
                      unreadCount={doctor.unreadCount}
                      onPress={() => handleChatWithDoctor(doctor)}
                    />
                  );
                })}
              </View>
            )}
          </View>

          {/* Quick actions */}
          <Card className="p-4">
            <View className="flex-row items-center space-x-2">
              <Ionicons name="information-circle-outline" size={20} color={Colors.primary[600]} />
              <View className="flex-1">
                <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>
                  Cần hỗ trợ ngay?
                </Text>
                <Text className="mt-1 text-xs" style={{ color: theme.text.secondary }}>
                  Gọi hotline <Text className="font-semibold" style={{ color: Colors.primary[700] }}>1900-6363</Text> để được tư vấn trực tiếp.
                </Text>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
      <PolicyModal visible={showPolicyModal} onClose={() => setShowPolicyModal(false)} />
    </>
  );
}
