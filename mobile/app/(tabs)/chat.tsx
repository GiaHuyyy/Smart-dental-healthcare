import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import {
    AlertTriangle,
    ArrowUpRight,
    Globe,
    Headset,
    HeartPulse,
    Image as ImageIcon,
    MessageCircle,
    MessageSquare,
    PhoneCall,
    Sparkles,
    Stethoscope,
    Trash2,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Linking,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import {
    AiAssistantResponse,
    fetchAiAdvice,
    fetchQuickSuggestions,
    fetchSuggestedQuestions,
    formatUrgencyLabel,
    ImageAnalysisResult,
    startChatSession,
    SuggestedDoctor,
    uploadAnalysisImage,
} from '@/utils/ai-chat';
import { formatApiError } from '@/utils/api';
import { clearChatState, loadChatState, persistChatState, StoredChatMessage } from '@/utils/chat-storage';

type ChatRole = 'user' | 'assistant';
type MessageStatus = 'sending' | 'sent' | 'failed';

type ChatAttachment = {
  id: string;
  type: 'image';
  uri: string;
};

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  status: MessageStatus;
  quickActions?: string[];
  followUpQuestions?: string[];
  urgencyLevel?: 'low' | 'medium' | 'high';
  nextSteps?: string[];
  suggestedDoctor?: SuggestedDoctor | null;
  analysisData?: ImageAnalysisResult | null;
  attachments?: ChatAttachment[];
  metadata?: Record<string, unknown>;
};

type QuickTopic = {
  id: string;
  title: string;
  description: string;
  icon: typeof MessageSquare;
  accent: string;
  prompt?: string;
};

const WEB_CHAT_URL = 'https://smart-dental-healthcare.com/patient/chat-support';
const MAX_HISTORY = 12;

const QUICK_TOPICS: QuickTopic[] = [
  {
    id: 'topic-1',
    title: 'Đau răng kéo dài',
    description: 'Bạn đang đau nhức hoặc ê buốt, hãy mô tả vị trí và thời gian đau.',
    icon: HeartPulse,
    accent: '#2563eb',
    prompt: 'Tôi bị đau nhức răng hàm dưới bên phải đã 3 ngày, khi uống đồ lạnh rất buốt.',
  },
  {
    id: 'topic-2',
    title: 'Sau nhổ răng khôn',
    description: 'Theo dõi tình trạng sưng, đau hoặc sốt sau phẫu thuật.',
    icon: MessageSquare,
    accent: '#0ea5e9',
    prompt: 'Sau khi nhổ răng khôn được 2 ngày tôi vẫn sưng và sốt nhẹ, tôi cần lưu ý gì?',
  },
  {
    id: 'topic-3',
    title: 'Viêm lợi, chảy máu',
    description: 'Nhận hướng dẫn chăm sóc khi lợi sưng đỏ, chảy máu.',
    icon: Headset,
    accent: '#f97316',
    prompt: 'Tôi bị chảy máu lợi mỗi lần đánh răng và có mùi hôi miệng, tôi nên làm gì?',
  },
];

const FALLBACK_MESSAGE: ChatMessage = {
  id: 'welcome-message',
  role: 'assistant',
  content:
    'Xin chào! Tôi là trợ lý nha khoa AI của Smart Dental. Bạn hãy mô tả triệu chứng, gửi ảnh hoặc đặt câu hỏi để được hỗ trợ nhé.',
  createdAt: new Date().toISOString(),
  status: 'sent',
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function getUrgencyStyles(level?: 'low' | 'medium' | 'high') {
  switch (level) {
    case 'high':
      return {
        borderClass: 'border-rose-300',
        backgroundClass: 'bg-rose-50',
        textClass: 'text-rose-700',
        iconColor: '#f43f5e',
      };
    case 'medium':
      return {
      borderClass: 'border-amber-300',
      backgroundClass: 'bg-amber-50',
      textClass: 'text-amber-700',
      iconColor: '#f59e0b',
      };
    default:
      return {
        borderClass: 'border-emerald-300',
        backgroundClass: 'bg-emerald-50',
        textClass: 'text-emerald-700',
        iconColor: '#10b981',
      };
  }
}

function SuggestedDoctorCard({
  doctor,
  onNavigate,
}: {
  doctor: SuggestedDoctor;
  onNavigate: (target: 'doctor' | 'appointment', doctor?: SuggestedDoctor) => void;
}) {
  if (!doctor) return null;

  return (
    <View className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
      <View className="flex-row items-center space-x-3">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-blue-600">
          <Stethoscope color="#ffffff" size={24} />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-slate-900">{doctor.fullName ?? 'Bác sĩ Smart Dental'}</Text>
          <Text className="text-xs text-slate-600">{doctor.specialty ?? 'Chuyên khoa Răng Hàm Mặt'}</Text>
        </View>
      </View>
      <View className="mt-3 flex-row flex-wrap gap-3">
        <TouchableOpacity
          className="flex-1 rounded-2xl bg-blue-600 px-4 py-2"
          onPress={() => onNavigate('doctor', doctor)}
        >
          <Text className="text-center text-xs font-semibold text-white">Xem danh sách bác sĩ</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 rounded-2xl border border-blue-400 px-4 py-2"
          onPress={() => onNavigate('appointment', doctor)}
        >
          <Text className="text-center text-xs font-semibold text-blue-600">Đặt lịch khám nhanh</Text>
        </TouchableOpacity>
      </View>
      {doctor.phone ? (
        <TouchableOpacity
          className="mt-3 flex-row items-center justify-center rounded-2xl border border-blue-200 bg-white px-4 py-2"
          onPress={() => onNavigate('appointment', doctor)}
        >
          <PhoneCall color="#2563eb" size={16} />
          <Text className="ml-2 text-xs font-semibold text-blue-700">Liên hệ: {doctor.phone}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function AnalysisBlock({ analysis }: { analysis: ImageAnalysisResult }) {
  if (!analysis) return null;

  const sections = analysis.richContent?.sections ?? [];

  return (
    <View className="mt-3 space-y-3">
      {analysis.richContent?.title ? (
        <Text className="text-sm font-semibold text-slate-900">{analysis.richContent.title}</Text>
      ) : null}

      {analysis.richContent?.analysis ? (
        <Text className="text-sm text-slate-700">{analysis.richContent.analysis}</Text>
      ) : null}

      {sections.length > 0
        ? sections.map((section, index) => (
            <View key={`${section.heading}-${index}`} className="rounded-2xl border border-slate-200 bg-white/80 p-3">
              {section.heading ? (
                <Text className="text-xs font-semibold uppercase tracking-wide text-slate-800">
                  {section.heading}
                </Text>
              ) : null}
              {section.text ? <Text className="mt-1 text-sm text-slate-700">{section.text}</Text> : null}
              {section.bullets?.length ? (
                <View className="mt-2 space-y-1">
                  {section.bullets.map((bullet) => (
                    <View key={bullet} className="flex-row items-start space-x-2">
                      <View className="mt-[6px] h-1.5 w-1.5 rounded-full bg-blue-400" />
                      <Text className="flex-1 text-xs text-slate-600">{bullet}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ))
        : null}

      {analysis.richContent?.recommendations?.length ? (
        <View className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3">
          <Text className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Khuyến nghị</Text>
          {analysis.richContent.recommendations.map((item) => (
            <Text key={item} className="mt-1 text-xs text-emerald-700">
              • {item}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ChatBubble({
  message,
  onQuickAction,
  onNavigateDoctor,
}: {
  message: ChatMessage;
  onQuickAction: (text: string) => void;
  onNavigateDoctor: (target: 'doctor' | 'appointment', doctor?: SuggestedDoctor) => void;
}) {
  const isUser = message.role === 'user';
  const statusLabel =
    message.status === 'sending'
      ? 'Đang gửi...'
      : message.status === 'failed'
        ? 'Gửi thất bại'
        : formatTime(message.createdAt);

  const urgencyStyles = getUrgencyStyles(message.urgencyLevel);
  const metadata = message.metadata as Record<string, unknown> | undefined;
  let confidence: number | undefined;
  if (metadata && typeof metadata.confidence === 'number') {
    confidence = metadata.confidence;
  } else if (typeof message.analysisData?.confidence === 'number') {
    confidence = message.analysisData.confidence;
  }

  return (
    <View className={`mb-3 flex-row px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <View
        className={`max-w-[82%] rounded-3xl px-4 py-3 ${
          isUser ? 'bg-blue-600' : 'border border-slate-200 bg-slate-100'
        }`}
      >
        {message.attachments?.map((attachment) => (
          <View key={attachment.id} className="mb-3 overflow-hidden rounded-2xl">
            <Image source={{ uri: attachment.uri }} contentFit="cover" className="h-40 w-full" />
          </View>
        ))}

        <Text className={`text-sm leading-relaxed ${isUser ? 'text-white' : 'text-slate-800'}`}>
          {message.content}
        </Text>

        {message.analysisData ? <AnalysisBlock analysis={message.analysisData} /> : null}

        {message.nextSteps?.length ? (
          <View className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
            <Text className="text-xs font-semibold uppercase tracking-wide text-blue-700">Các bước tiếp theo</Text>
            {message.nextSteps.map((step) => (
              <Text key={step} className="mt-1 text-xs text-blue-700">
                • {step}
              </Text>
            ))}
          </View>
        ) : null}

        {message.quickActions?.length ? (
          <View className="mt-3 flex-row flex-wrap gap-2">
            {message.quickActions.map((action) => (
              <TouchableOpacity
                key={action}
                className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-1.5"
                onPress={() => onQuickAction(action)}
              >
                <Text className="text-xs font-semibold text-blue-700">{action}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {message.followUpQuestions?.length ? (
          <View className="mt-3 space-y-2">
            {message.followUpQuestions.map((question) => (
              <TouchableOpacity
                key={question}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
                onPress={() => onQuickAction(question)}
              >
                <Text className="text-xs font-medium text-slate-700">{question}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {message.suggestedDoctor ? (
          <SuggestedDoctorCard doctor={message.suggestedDoctor} onNavigate={onNavigateDoctor} />
        ) : null}

        {message.urgencyLevel ? (
          <View
            className={`mt-3 flex-row items-center justify-between rounded-2xl border px-3 py-2 ${urgencyStyles.borderClass} ${urgencyStyles.backgroundClass}`}
          >
            <View className="flex-row items-center space-x-2">
              <HeartPulse size={16} color={urgencyStyles.iconColor} />
              <Text className={`text-xs font-semibold ${urgencyStyles.textClass}`}>
                Mức độ: {formatUrgencyLabel(message.urgencyLevel)}
              </Text>
            </View>
            {typeof confidence === 'number' ? (
              <Text className={`text-[11px] ${urgencyStyles.textClass}`}>
                Độ tin cậy: {Math.round(confidence * 100)}%
              </Text>
            ) : null}
          </View>
        ) : null}

        <Text className={`mt-2 text-[10px] ${isUser ? 'text-blue-100' : 'text-slate-500'}`}>{statusLabel}</Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const flatListRef = useRef<FlatList<ChatMessage> | null>(null);
  const [composerHeight, setComposerHeight] = useState(0);

  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const stored = await loadChatState();
      if (!isMounted) return;

      if (stored?.messages?.length) {
        const restored: ChatMessage[] = stored.messages.map((item) => {
          const attachments = Array.isArray(item.attachments)
            ? (item.attachments
                .map((attachment) => {
                  if (!attachment || typeof attachment !== 'object') {
                    return null;
                  }
                  const uri = typeof attachment.uri === 'string' ? attachment.uri : null;
                  if (!uri) {
                    return null;
                  }
                  const id = typeof attachment.id === 'string' ? attachment.id : createId();
                  const type = typeof attachment.type === 'string' ? attachment.type : 'image';
                  return {
                    id,
                    type,
                    uri,
                  } as ChatAttachment;
                })
                .filter(Boolean) as ChatAttachment[])
            : undefined;

          const quickActions = Array.isArray(item.quickActions) ? (item.quickActions as string[]) : undefined;
          const followUpQuestions = Array.isArray(item.followUpQuestions)
            ? (item.followUpQuestions as string[])
            : undefined;
          const nextSteps = Array.isArray(item.nextSteps) ? (item.nextSteps as string[]) : undefined;

          const suggestedDoctor = item.suggestedDoctor && typeof item.suggestedDoctor === 'object'
            ? (item.suggestedDoctor as SuggestedDoctor)
            : null;
          const analysisData = item.analysisData && typeof item.analysisData === 'object'
            ? (item.analysisData as ImageAnalysisResult)
            : null;

          return {
            id: item.id,
            role: item.role === 'assistant' ? 'assistant' : 'user',
            content: item.content,
            createdAt: item.createdAt,
            status: (item.status as MessageStatus) ?? 'sent',
            quickActions,
            followUpQuestions,
            urgencyLevel: item.urgencyLevel,
            nextSteps,
            suggestedDoctor,
            analysisData,
            attachments,
            metadata: item.metadata ?? undefined,
          };
        });
        setMessages(restored);
        messagesRef.current = restored;
      } else {
        setMessages([FALLBACK_MESSAGE]);
        messagesRef.current = [FALLBACK_MESSAGE];
      }

      if (stored?.sessionId) {
        setSessionId(stored.sessionId);
      }

      setIsHydrated(true);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (sessionId) return;

    let cancelled = false;
    (async () => {
      const nextSessionId = await startChatSession(session?.user?._id);
      if (!cancelled) {
        setSessionId(nextSessionId);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isHydrated, session?.user?._id, sessionId]);

  useEffect(() => {
    let active = true;

    const fetch = async () => {
      try {
        setLoadingSuggestions(true);
        const [questions, symptomSuggestions] = await Promise.all([
          fetchSuggestedQuestions(),
          fetchQuickSuggestions('đau răng'),
        ]);
        if (!active) return;
        const combined = [...new Set([...questions, ...symptomSuggestions])].slice(0, 12);
        setSuggestions(combined);
      } catch (error) {
        console.warn('Không thể tải gợi ý chat', error);
      } finally {
        if (active) {
          setLoadingSuggestions(false);
        }
      }
    };

    void fetch();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
    if (!isHydrated) return;

    const serialisableMessages: StoredChatMessage[] = messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
      status: message.status,
      quickActions: message.quickActions,
      followUpQuestions: message.followUpQuestions,
      urgencyLevel: message.urgencyLevel,
      nextSteps: message.nextSteps,
      suggestedDoctor: message.suggestedDoctor ? { ...message.suggestedDoctor } : null,
      analysisData: message.analysisData ? { ...message.analysisData } : null,
      attachments: message.attachments
        ? message.attachments.map((attachment) => ({
            id: attachment.id,
            type: attachment.type,
            uri: attachment.uri,
          }))
        : null,
      metadata: message.metadata ? { ...message.metadata } : undefined,
    }));

    void persistChatState({
      sessionId,
      messages: serialisableMessages,
      lastUpdated: Date.now(),
    });
  }, [messages, sessionId, isHydrated]);

  useEffect(() => {
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 120);

    return () => clearTimeout(timer);
  }, [messages.length]);

  const handleOpenWebChat = useCallback(async () => {
    try {
      const supported = await Linking.canOpenURL(WEB_CHAT_URL);
      if (supported) {
        await Linking.openURL(WEB_CHAT_URL);
      } else {
        Alert.alert('Không thể mở chat web', 'Vui lòng truy cập smart-dental-healthcare.com/patient/chat-support');
      }
    } catch (error) {
      Alert.alert('Không thể mở chat web', formatApiError(error, 'Vui lòng thử lại sau.'));
    }
  }, []);

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const updateMessage = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((message) => (message.id === id ? { ...message, ...patch } : message)));
  }, []);

  const buildChatHistory = useCallback(
    (extra?: { role: ChatRole; content: string }) => {
      const base = messagesRef.current
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .map((message) => ({ role: message.role, content: message.content }));
      if (extra) {
        base.push(extra);
      }
      return base.slice(-MAX_HISTORY);
    },
    [],
  );

  const navigateFromDoctorSuggestion = useCallback(
    (target: 'doctor' | 'appointment', doctor?: SuggestedDoctor) => {
      if (target === 'doctor') {
        if (doctor?._id) {
          router.push({ pathname: '/(tabs)/doctors', params: { highlightDoctorId: doctor._id } });
        } else {
          router.push('/(tabs)/doctors');
        }
        return;
      }
      if (doctor?._id) {
        router.push({ pathname: '/(tabs)/appointments', params: { doctorId: doctor._id, doctorName: doctor.fullName ?? '' } });
      } else {
        router.push('/(tabs)/appointments');
      }
    },
    [router],
  );

  const handleAiResponse = useCallback(
    (placeholderId: string, data: AiAssistantResponse) => {
      updateMessage(placeholderId, {
        content:
          data.message?.trim() ||
          'Xin lỗi, tôi chưa tìm được câu trả lời phù hợp. Bạn có thể thử mô tả chi tiết hơn nhé!',
        status: 'sent',
        createdAt: new Date().toISOString(),
        quickActions: data.quickActions ?? [],
        followUpQuestions: data.followUpQuestions ?? [],
        urgencyLevel: data.urgencyLevel ?? data.context?.urgencyLevel,
        metadata: {
          ...(data.context ?? {}),
          ...(typeof data.confidence === 'number' ? { confidence: data.confidence } : {}),
        },
        nextSteps: data.nextSteps ?? [],
        suggestedDoctor: data.suggestedDoctor ?? data.context?.suggestedDoctors?.[0] ?? null,
      });
    },
    [updateMessage],
  );

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text || isSending) {
        return;
      }

      const now = new Date().toISOString();
      const userMessage: ChatMessage = {
        id: createId(),
        role: 'user',
        content: text,
        createdAt: now,
        status: 'sent',
      };

      setInput('');
      appendMessage(userMessage);
      setIsSending(true);

      const placeholder: ChatMessage = {
        id: createId(),
        role: 'assistant',
        content: 'Trợ lý đang phân tích thông tin của bạn...',
        createdAt: new Date().toISOString(),
        status: 'sending',
      };
      appendMessage(placeholder);

      try {
        const history = buildChatHistory({ role: 'user', content: text });
        const response = await fetchAiAdvice({
          message: text,
          chatHistory: history,
          sessionId,
        });
        handleAiResponse(placeholder.id, response);
      } catch (error) {
        updateMessage(placeholder.id, {
          content: formatApiError(error, 'Xin lỗi, tôi chưa thể trả lời ngay lúc này. Vui lòng thử lại sau.'),
          status: 'failed',
          createdAt: new Date().toISOString(),
        });
      } finally {
        setIsSending(false);
      }
    },
    [appendMessage, buildChatHistory, handleAiResponse, input, isSending, sessionId, updateMessage],
  );

  const handleSelectTopic = useCallback(
    (topic: QuickTopic) => {
      const prompt = topic.prompt ?? topic.title;
      void handleSend(prompt);
    },
    [handleSend],
  );

  const handleSelectSuggestion = useCallback(
    (suggestion: string) => {
      void handleSend(suggestion);
    },
    [handleSend],
  );

  const handlePickImage = useCallback(async () => {
    if (!session?.token) {
      Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập để sử dụng tính năng phân tích hình ảnh.');
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Không có quyền truy cập ảnh', 'Ứng dụng cần quyền truy cập thư viện ảnh để gửi hình.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: false,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];

    const attachment: ChatAttachment = {
      id: createId(),
      type: 'image',
      uri: asset.uri,
    };

    const now = new Date().toISOString();
    appendMessage({
      id: createId(),
      role: 'user',
      content: 'Mình vừa gửi hình ảnh để bác sĩ AI phân tích giúp.',
      createdAt: now,
      status: 'sent',
      attachments: [attachment],
    });

    setIsUploadingImage(true);

    try {
      const response = await uploadAnalysisImage(
        {
          uri: asset.uri,
          mimeType: asset.mimeType ?? 'image/jpeg',
          fileName: asset.fileName ?? `analysis-${Date.now()}.jpg`,
        },
        session.token,
      );

      if (!response.success || !response.data) {
        throw new Error(response.error ?? 'Phân tích ảnh thất bại');
      }

      const analysisMessage: ChatMessage = {
        id: createId(),
        role: 'assistant',
        content:
          response.data.message?.trim() ??
          'Mình đã nhận được hình ảnh và dưới đây là phân tích sơ bộ dành cho bạn.',
        createdAt: new Date().toISOString(),
        status: 'sent',
        analysisData: response.data,
        urgencyLevel: response.data.urgencyLevel,
        suggestedDoctor: response.data.suggestedDoctor ?? null,
        metadata: response.data.confidence ? { confidence: response.data.confidence } : undefined,
      };

      appendMessage(analysisMessage);

      if (response.data.options?.length) {
        appendMessage({
          id: createId(),
          role: 'assistant',
          content: 'Bạn có muốn trao đổi thêm về các phương án điều trị sau khi xem phân tích không?',
          createdAt: new Date().toISOString(),
          status: 'sent',
          quickActions: response.data.options,
        });
      }
    } catch (error) {
      appendMessage({
        id: createId(),
        role: 'assistant',
        content: formatApiError(error, 'Xin lỗi, hệ thống chưa thể phân tích hình ảnh. Bạn có thể thử lại sau.'),
        createdAt: new Date().toISOString(),
        status: 'failed',
      });
    } finally {
      setIsUploadingImage(false);
    }
  }, [appendMessage, session?.token]);

  const handleQuickAction = useCallback(
    (text: string) => {
      void handleSend(text);
    },
    [handleSend],
  );

  const handleClearConversation = useCallback(() => {
    Alert.alert('Đặt lại cuộc trò chuyện', 'Bạn có chắc muốn xóa lịch sử chat?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          setMessages([FALLBACK_MESSAGE]);
          messagesRef.current = [FALLBACK_MESSAGE];
          setSessionId(null);
          void clearChatState();
        },
      },
    ]);
  }, []);

  const isBusy = isSending || isUploadingImage;

  const helperNotice = useMemo(
    () =>
      isUploadingImage
        ? 'Đang tải và phân tích hình ảnh của bạn...'
        : isSending
          ? 'Trợ lý đang chuẩn bị phản hồi...'
          : 'Mô tả chi tiết triệu chứng, thời gian xuất hiện và thói quen gần đây để trợ lý hiểu rõ hơn nhé!',
    [isSending, isUploadingImage],
  );

  const composerSafePadding = useMemo(() => Math.max(insets.bottom, 12), [insets.bottom]);
  const conversationPaddingBottom = useMemo(
    () => composerHeight + tabBarHeight + composerSafePadding + 24,
    [composerHeight, composerSafePadding, tabBarHeight],
  );

  const renderListHeader = useCallback(
    () => (
      <View className="space-y-4 pb-2">
        <View className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3 shadow-sm shadow-blue-100">
          <View className="flex-row items-center space-x-2">
            {isBusy ? <ActivityIndicator size="small" color="#2563eb" /> : <Sparkles size={16} color="#2563eb" />}
            <Text className="text-xs font-medium text-slate-700">{helperNotice}</Text>
          </View>
        </View>

        <View>
          <View className="flex-row items-center justify-between px-1">
            <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chủ đề nhanh</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 4, paddingVertical: 6 }}
          >
            <View className="flex-row space-x-3">
              {QUICK_TOPICS.map((topic) => {
                const Icon = topic.icon;
                return (
                  <TouchableOpacity
                    key={topic.id}
                    className="w-60 rounded-3xl border border-blue-100 bg-white/90 px-4 py-3"
                    onPress={() => handleSelectTopic(topic)}
                    activeOpacity={0.9}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row flex-1 items-center space-x-3">
                        <View
                          className="h-10 w-10 items-center justify-center rounded-2xl"
                          style={{ backgroundColor: `${topic.accent}1A` }}
                        >
                          <Icon color={topic.accent} size={20} />
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-slate-900" numberOfLines={1}>
                            {topic.title}
                          </Text>
                          <Text className="mt-1 text-xs text-slate-500" numberOfLines={2}>
                            {topic.description}
                          </Text>
                        </View>
                      </View>
                      <ArrowUpRight color="#2563eb" size={18} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <View className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3 shadow-sm shadow-blue-100">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-slate-900">Gợi ý câu hỏi</Text>
            {loadingSuggestions ? <ActivityIndicator color="#2563eb" size="small" /> : null}
          </View>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {suggestions.length === 0 && !loadingSuggestions ? (
              <Text className="text-xs text-slate-500">Gợi ý sẽ xuất hiện khi hệ thống sẵn sàng.</Text>
            ) : null}
            {suggestions.map((suggestion) => (
              <TouchableOpacity
                key={suggestion}
                className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2"
                onPress={() => handleSelectSuggestion(suggestion)}
              >
                <Text className="text-xs font-semibold text-blue-700">{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    ),
    [handleSelectSuggestion, handleSelectTopic, helperNotice, isBusy, loadingSuggestions, suggestions],
  );

  const renderListFooter = useCallback(
    () => (
      <View className="py-6 space-y-4">
        {isBusy ? (
          <View className="flex-row items-center space-x-2 rounded-2xl border border-blue-100 bg-white/80 px-3 py-2">
            <ActivityIndicator color="#2563eb" size="small" />
            <Text className="text-xs text-slate-600">Trợ lý đang xử lý thông tin của bạn...</Text>
          </View>
        ) : null}
        <View className="flex-row items-start space-x-3 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3">
          <AlertTriangle color="#b45309" size={20} />
          <View className="flex-1">
            <Text className="text-sm font-semibold text-amber-800">Lưu ý quan trọng</Text>
            <Text className="mt-1 text-xs text-amber-700">
              Các câu trả lời của trợ lý AI mang tính chất tham khảo. Hãy đặt lịch khám tại Smart Dental để được chẩn đoán trực tiếp bởi bác sĩ chuyên khoa.
            </Text>
          </View>
        </View>
        <View className="flex-row items-start space-x-3 rounded-2xl border border-white/60 bg-white/80 px-4 py-3">
          <Headset color="#2563eb" size={20} />
          <View className="flex-1">
            <Text className="text-sm font-semibold text-slate-900">Cần hỗ trợ khẩn?</Text>
            <Text className="mt-1 text-xs text-slate-600">
              Gọi hotline <Text className="font-semibold text-blue-700">1900-6363</Text> hoặc đặt lịch khám trực tiếp ngay trong ứng dụng.
            </Text>
          </View>
        </View>
      </View>
    ),
    [isBusy],
  );

  return (
    <LinearGradient colors={['#eef2ff', '#e0f2fe', '#fff']} className="flex-1">
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? tabBarHeight + composerSafePadding : tabBarHeight + 16}
        >
          <View className="flex-1">
            <View className="border-b border-white/30 bg-white/40 px-4 pb-3 pt-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center space-x-3">
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-blue-600">
                    <MessageCircle color="#ffffff" size={26} />
                  </View>
                  <View>
                    <Text className="text-base font-semibold text-slate-900">Smart Dental AI</Text>
                    <Text className="text-xs text-emerald-600">Sẵn sàng hỗ trợ</Text>
                  </View>
                </View>
                <View className="flex-row items-center space-x-2">
                  <TouchableOpacity
                    onPress={handleClearConversation}
                    className="h-10 w-10 items-center justify-center rounded-full bg-white/80"
                    accessibilityRole="button"
                    accessibilityLabel="Xóa lịch sử trò chuyện"
                  >
                    <Trash2 color="#e11d48" size={18} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleOpenWebChat}
                    className="h-10 w-10 items-center justify-center rounded-full bg-white/80"
                    accessibilityRole="button"
                    accessibilityLabel="Mở chat web"
                  >
                    <Globe color="#2563eb" size={18} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ChatBubble
                  message={item}
                  onQuickAction={handleQuickAction}
                  onNavigateDoctor={navigateFromDoctorSuggestion}
                />
              )}
              ListHeaderComponent={renderListHeader}
              ListFooterComponent={renderListFooter}
              contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: conversationPaddingBottom }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          </View>

          <View
            className="border-t border-slate-200/60 bg-white/95 px-4 pt-3"
            style={{ paddingBottom: composerSafePadding, marginBottom: tabBarHeight + 8 }}
          >
            <View
              className="rounded-3xl border border-slate-200 bg-white px-4 py-2 shadow-lg shadow-blue-100"
              onLayout={({ nativeEvent }) => setComposerHeight(nativeEvent.layout.height)}
            >
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Mô tả triệu chứng hoặc câu hỏi của bạn..."
                placeholderTextColor="#94a3b8"
                multiline
                className="max-h-32 text-sm text-slate-900"
                onSubmitEditing={() => void handleSend()}
                returnKeyType="send"
                blurOnSubmit={false}
              />
              <View className="mt-3 flex-row items-center justify-between">
                <View className="flex-row items-center space-x-3">
                  <TouchableOpacity
                    onPress={handlePickImage}
                    className="flex-row items-center rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2"
                  >
                    {isUploadingImage ? (
                      <ActivityIndicator size="small" color="#2563eb" />
                    ) : (
                      <ImageIcon color="#2563eb" size={16} />
                    )}
                    <Text className="ml-2 text-[11px] font-semibold text-blue-700">Phân tích ảnh</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => Linking.openURL('tel:19006363')}
                    className="flex-row items-center rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2"
                  >
                    <PhoneCall color="#047857" size={16} />
                    <Text className="ml-2 text-[11px] font-semibold text-emerald-700">Hotline 1900-6363</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() => void handleSend()}
                  disabled={!input.trim() || isSending}
                  className={`h-10 min-w-[72px] items-center justify-center rounded-2xl px-4 ${
                    !input.trim() || isSending ? 'bg-blue-200' : 'bg-blue-600'
                  }`}
                  accessibilityRole="button"
                  accessibilityLabel="Gửi tin nhắn"
                >
                  <Text className="text-xs font-semibold text-white">{isSending ? 'Đang gửi...' : 'Gửi'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
