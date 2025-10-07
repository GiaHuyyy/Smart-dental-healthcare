import { LinearGradient } from 'expo-linear-gradient';
import {
    AlertTriangle,
    Headset,
    HeartPulse,
    MessageCircle,
    MessageSquare,
    ShieldCheck,
    Sparkles,
} from 'lucide-react-native';
import { useCallback } from 'react';
import {
    Alert,
    Linking,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const WEB_CHAT_URL = 'https://smart-dental-healthcare.com/patient/chat-support';

const QUICK_TOPICS = [
  {
    id: 'topic-1',
    title: 'Hỏi về đơn thuốc',
    description: 'Nhận hướng dẫn sử dụng thuốc và nhắc nhở tái khám.',
    icon: MessageCircle,
    accent: '#2563eb',
  },
  {
    id: 'topic-2',
    title: 'Tư vấn triệu chứng',
    description: 'Trao đổi nhanh với bác sĩ về triệu chứng hiện tại.',
    icon: HeartPulse,
    accent: '#0ea5e9',
  },
  {
    id: 'topic-3',
    title: 'Hỗ trợ thanh toán',
    description: 'Giải đáp thắc mắc về hóa đơn và phương thức thanh toán.',
    icon: Headset,
    accent: '#f97316',
  },
];

const UPCOMING_FEATURES = [
  'Chat realtime với bác sĩ và điều dưỡng',
  'Đồng bộ lịch trực bác sĩ theo từng chuyên khoa',
  'Chia sẻ hình ảnh X-quang và hồ sơ khám trực tiếp trong cuộc trò chuyện',
  'Tự động ghi chú sau khi kết thúc cuộc trò chuyện',
];

export default function ChatScreen() {

  const handleOpenWebChat = useCallback(async () => {
    const supported = await Linking.canOpenURL(WEB_CHAT_URL);
    if (supported) {
      await Linking.openURL(WEB_CHAT_URL);
    } else {
      Alert.alert('Không thể mở chat web', 'Vui lòng truy cập smart-dental-healthcare.com/patient/chat-support');
    }
  }, []);

  const handleShowPlaceholder = useCallback(() => {
    Alert.alert(
      'Tính năng sắp ra mắt',
      'Chat thời gian thực sẽ sớm có mặt trên ứng dụng di động. Vui lòng sử dụng phiên bản web hoặc gọi hotline 1900-6363 để được hỗ trợ ngay.',
    );
  }, []);

  return (
    <LinearGradient colors={['#eef2ff', '#e0f2fe', '#fff']} className="flex-1">
      <SafeAreaView className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48, paddingTop: 12 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="space-y-6">
            <View className="rounded-3xl border border-white/70 bg-white/95 p-6 shadow-lg shadow-blue-100">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-5">
                  <View className="h-14 w-14 items-center justify-center rounded-2xl bg-blue-600">
                    <MessageCircle color="#ffffff" size={28} />
                  </View>
                  <Text className="mt-5 text-2xl font-semibold text-slate-900">Trò chuyện cùng bác sĩ</Text>
                  <Text className="mt-2 text-sm text-slate-600">
                    Kết nối nhanh với đội ngũ Smart Dental để giải đáp mọi thắc mắc về điều trị, thuốc và lịch hẹn.
                  </Text>
                </View>
              </View>

              <View className="mt-6 space-y-3">
                <TouchableOpacity
                  className="flex-row items-center justify-center rounded-3xl bg-blue-600 py-3"
                  onPress={handleShowPlaceholder}
                >
                  <MessageSquare color="#ffffff" size={18} />
                  <Text className="ml-2 text-sm font-semibold text-white">Bắt đầu cuộc trò chuyện</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-row items-center justify-center rounded-3xl border border-blue-200 bg-blue-50 py-3"
                  onPress={handleOpenWebChat}
                >
                  <ShieldCheck color="#1d4ed8" size={18} />
                  <Text className="ml-2 text-sm font-semibold text-blue-700">Mở chat trên web</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="space-y-4">
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chủ đề phổ biến</Text>
              {QUICK_TOPICS.map((topic) => {
                const Icon = topic.icon;
                return (
                  <View key={topic.id} className="rounded-3xl border border-white/70 bg-white/95 p-4 shadow-md shadow-blue-100">
                    <View className="flex-row items-start space-x-3">
                      <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: `${topic.accent}1A` }}>
                        <Icon color={topic.accent} size={22} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-slate-900">{topic.title}</Text>
                        <Text className="mt-1 text-xs text-slate-500">{topic.description}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      className="mt-4 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 py-2"
                      onPress={handleShowPlaceholder}
                    >
                      <Text className="text-xs font-semibold text-blue-700">Gửi câu hỏi</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            <View className="rounded-3xl border border-white/70 bg-white/95 p-6 shadow-lg shadow-blue-100">
              <View className="flex-row items-center space-x-2">
                <Sparkles color="#1d4ed8" size={20} />
                <Text className="text-lg font-semibold text-slate-900">Tính năng sắp ra mắt</Text>
              </View>
              <View className="mt-4 space-y-2">
                {UPCOMING_FEATURES.map((feature) => (
                  <View key={feature} className="flex-row items-start space-x-2">
                    <View className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                    <Text className="flex-1 text-xs text-slate-600">{feature}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
              <View className="flex-row items-start space-x-3">
                <AlertTriangle color="#b45309" size={20} />
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-amber-800">Lưu ý</Text>
                  <Text className="mt-1 text-xs text-amber-700">
                    Chat thời gian thực tạm thời chỉ khả dụng trên phiên bản web. Bạn vẫn có thể liên hệ hotline 1900-6363 hoặc gửi
                    email tới care@smart-dental-healthcare.com để được hỗ trợ ngay.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
