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

// Types matching web client
interface Message {
  _id: string;
  content: string;
  senderId: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  senderRole: 'patient' | 'doctor';
  messageType: 'text' | 'image' | 'file';
  createdAt: string;
  isRead: boolean;
}

interface Conversation {
  _id: string;
  patientId: {
    _id: string;
    fullName: string;
    avatar?: string;
    email: string;
  };
  doctorId: {
    _id: string;
    fullName: string;
    avatar?: string;
    email: string;
    specialty?: string;
  };
  status: string;
  unreadPatientCount: number;
  unreadDoctorCount: number;
  lastMessageAt?: string;
  lastMessage?: {
    content: string;
    createdAt: string;
  };
}

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

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!isAuthenticated || !session?.token) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      console.log('📡 [ChatList] Loading conversations from REST API...');
      
      // Extract userId and userRole from session
      const userId = session.user._id;
      const userRole = session.user.role;
      
      // Use REST API with correct prefix /api/v1 and required query params
      const response = await apiRequest<Conversation[]>(
        `/api/v1/realtime-chat/conversations?userId=${userId}&userRole=${userRole}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        }
      );

      if (response.data) {
        console.log(`✅ [ChatList] Loaded ${response.data.length} conversations`);
        setConversations(response.data);
      } else {
        setErrorMessage('Không thể tải danh sách cuộc trò chuyện');
      }
    } catch (error) {
      console.error('❌ [ChatList] Error:', error);
      setErrorMessage(formatApiError(error, 'Lỗi khi tải danh sách cuộc trò chuyện'));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, session?.token]);

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  const handleChatWithAI = useCallback(() => {
    router.push({
      pathname: '/chat/[id]',
      params: { id: 'ai-bot', name: 'Smart Dental AI', type: 'ai' },
    });
  }, [router]);

  const handleChatWithDoctor = useCallback(
    (conversation: Conversation) => {
      const doctor = conversation.doctorId;
      const doctorId = doctor._id;
      const doctorName = doctor.fullName;
      const conversationId = conversation._id;
      router.push({
        pathname: '/chat/[id]',
        params: { 
          id: doctorId, 
          name: doctorName, 
          type: 'doctor',
          conversationId: conversationId, // Add conversation ID
        },
      });
    },
    [router],
  );

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút`;
    if (diffHours < 24) return `${diffHours} giờ`;
    if (diffDays < 7) return `${diffDays} ngày`;
    
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchTerm.trim()) return true;
    const doctor = conv.doctorId;
    const name = doctor.fullName;
    const specialty = doctor.specialty ?? '';
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

          {/* Conversations list */}
          <View>
            <View className="mb-3 flex-row items-center justify-between px-1">
              <Text className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.text.secondary }}>
                Cuộc trò chuyện ({filteredConversations.length})
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

            {loading && conversations.length === 0 ? (
              <Card className="items-center justify-center p-8">
                <ActivityIndicator color={Colors.primary[600]} />
                <Text className="mt-3 text-sm" style={{ color: theme.text.secondary }}>
                  Đang tải danh sách cuộc trò chuyện...
                </Text>
              </Card>
            ) : filteredConversations.length === 0 ? (
              <View 
                className="items-center justify-center rounded-2xl border border-dashed p-8"
                style={{ 
                  borderColor: Colors.primary[200],
                  backgroundColor: Colors.primary[50] + 'B3'
                }}
              >
                <Ionicons name="chatbubbles-outline" size={28} color={Colors.primary[600]} />
                <Text className="mt-3 text-sm font-semibold" style={{ color: Colors.primary[700] }}>
                  {searchTerm.trim() ? 'Không tìm thấy cuộc trò chuyện phù hợp' : 'Chưa có cuộc trò chuyện nào'}
                </Text>
                <Text className="mt-1 text-xs text-center px-4" style={{ color: Colors.primary[500] }}>
                  {searchTerm.trim() ? 'Thử tìm kiếm với từ khóa khác' : 'Đặt lịch khám và chat với bác sĩ để bắt đầu cuộc trò chuyện'}
                </Text>
              </View>
            ) : (
              <View className="space-y-0">
                {filteredConversations.map((conversation) => {
                  const doctor = conversation.doctorId;
                  const doctorId = doctor._id;
                  const doctorName = doctor.fullName;
                  const specialty = doctor.specialty ?? 'Chuyên khoa Răng Hàm Mặt';
                  
                  // Get last message info
                  const lastMessage = conversation.lastMessage?.content ?? 'Bắt đầu cuộc trò chuyện';
                  const lastMessageTime = conversation.lastMessage?.createdAt 
                    ? formatMessageTime(conversation.lastMessage.createdAt) 
                    : undefined;
                  const unreadCount = conversation.unreadPatientCount ?? 0;

                  return (
                    <ChatListItem
                      key={conversation._id}
                      id={doctorId}
                      name={doctorName}
                      subtitle={specialty}
                      iconName="medical-outline"
                      iconBgColor={Colors.success[50]}
                      iconColor={Colors.success[600]}
                      lastMessage={lastMessage}
                      lastMessageTime={lastMessageTime}
                      unreadCount={unreadCount}
                      onPress={() => handleChatWithDoctor(conversation)}
                    />
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      <PolicyModal visible={showPolicyModal} onClose={() => setShowPolicyModal(false)} />
    </>
  );
}
