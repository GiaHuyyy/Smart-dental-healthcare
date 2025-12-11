import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CallButton from "@/components/call/CallButton";
import CallMessageBubble from "@/components/call/CallMessageBubble";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card } from "@/components/ui/Card";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/contexts/auth-context";
import { useCall } from "@/contexts/CallContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import realtimeChatService, { ChatMessage as RealtimeChatMessage } from "@/services/realtimeChatService";
import uploadService from "@/services/uploadService";
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
} from "@/utils/ai-chat";
import { formatApiError } from "@/utils/api";
import { clearChatState, loadChatState, persistChatState, StoredChatMessage } from "@/utils/chat-storage";

type ChatRole = "user" | "assistant";
type MessageStatus = "sending" | "sent" | "failed";

type ChatAttachment = {
  id: string;
  type: "image";
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
  urgencyLevel?: "low" | "medium" | "high";
  nextSteps?: string[];
  suggestedDoctor?: SuggestedDoctor | null;
  analysisData?: ImageAnalysisResult | null;
  attachments?: ChatAttachment[];
  metadata?: Record<string, unknown>;
  // Call message fields
  isCallMessage?: boolean;
  callType?: "audio" | "video";
  callStatus?: "missed" | "answered" | "rejected" | "completed";
  callDuration?: number; // in seconds
};

type QuickTopic = {
  id: string;
  title: string;
  description: string;
  iconName: keyof typeof Ionicons.glyphMap;
  accent: string;
  prompt?: string;
};

const WEB_CHAT_URL = "https://smart-dental-healthcare.com/patient/chat-support";
const MAX_HISTORY = 12;
const INITIAL_MESSAGE_LOAD = 30; // Load 30 tin nhắn đầu tiên
const MESSAGES_PER_PAGE = 20; // Load thêm 20 tin mỗi lần

const QUICK_TOPICS: QuickTopic[] = [
  {
    id: "topic-1",
    title: "Đau răng kéo dài",
    description: "Bạn đang đau nhức hoặc ê buốt, hãy mô tả vị trí và thời gian đau.",
    iconName: "heart-outline",
    accent: "#2563eb",
    prompt: "Tôi bị đau nhức răng hàm dưới bên phải đã 3 ngày, khi uống đồ lạnh rất buốt.",
  },
  {
    id: "topic-2",
    title: "Sau nhổ răng khôn",
    description: "Theo dõi tình trạng sưng, đau hoặc sốt sau phẫu thuật.",
    iconName: "chatbubble-outline",
    accent: "#0ea5e9",
    prompt: "Sau khi nhổ răng khôn được 2 ngày tôi vẫn sưng và sốt nhẹ, tôi cần lưu ý gì?",
  },
  {
    id: "topic-3",
    title: "Viêm lợi, chảy máu",
    description: "Nhận hướng dẫn chăm sóc khi lợi sưng đỏ, chảy máu.",
    iconName: "headset-outline",
    accent: "#f97316",
    prompt: "Tôi bị chảy máu lợi mỗi lần đánh răng và có mùi hôi miệng, tôi nên làm gì?",
  },
];

const FALLBACK_MESSAGE: ChatMessage = {
  id: "welcome-message",
  role: "assistant",
  content:
    "Xin chào! Tôi là trợ lý nha khoa AI của Smart Dental. Bạn hãy mô tả triệu chứng, gửi ảnh hoặc đặt câu hỏi để được hỗ trợ nhé.",
  createdAt: new Date().toISOString(),
  status: "sent",
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

// Detect if a message is a call message based on content
function detectCallMessage(content: string): {
  isCallMessage: boolean;
  callType?: "audio" | "video";
  callStatus?: "missed" | "answered" | "rejected" | "completed";
} {
  const lowerContent = content.toLowerCase();

  // Check if it's a call message
  if (!lowerContent.includes("cuộc gọi") && !lowerContent.includes("call")) {
    return { isCallMessage: false };
  }

  // Detect call type
  const isVideo = lowerContent.includes("video") || lowerContent.includes("gọi video");
  const callType: "audio" | "video" = isVideo ? "video" : "audio";

  // Detect call status
  let callStatus: "missed" | "answered" | "rejected" | "completed" = "completed";

  if (lowerContent.includes("nhỡ") || lowerContent.includes("missed")) {
    callStatus = "missed";
  } else if (lowerContent.includes("từ chối") || lowerContent.includes("rejected")) {
    callStatus = "rejected";
  } else if (
    lowerContent.includes("hoàn thành") ||
    lowerContent.includes("completed") ||
    lowerContent.includes("kết thúc") ||
    lowerContent.includes("ended")
  ) {
    callStatus = "completed";
  }

  return {
    isCallMessage: true,
    callType,
    callStatus,
  };
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function getUrgencyStyles(level?: "low" | "medium" | "high") {
  switch (level) {
    case "high":
      return {
        borderColor: Colors.error[100],
        backgroundColor: Colors.error[50],
        textColor: Colors.error[700],
        iconColor: Colors.error[600],
      };
    case "medium":
      return {
        borderColor: Colors.warning[100],
        backgroundColor: Colors.warning[50],
        textColor: Colors.warning[700],
        iconColor: Colors.warning[600],
      };
    default:
      return {
        borderColor: Colors.success[100],
        backgroundColor: Colors.success[50],
        textColor: Colors.success[700],
        iconColor: Colors.success[600],
      };
  }
}

function SuggestedDoctorCard({
  doctor,
  onNavigate,
}: {
  doctor: SuggestedDoctor;
  onNavigate: (target: "doctor" | "appointment", doctor?: SuggestedDoctor) => void;
}) {
  if (!doctor) return null;

  return (
    <View
      className="mt-4 rounded-2xl border p-4"
      style={{
        borderColor: Colors.primary[100],
        backgroundColor: `${Colors.primary[50]}99`,
      }}
    >
      <View className="flex-row items-center" style={{ gap: 12 }}>
        <View
          className="h-12 w-12 items-center justify-center rounded-2xl"
          style={{ backgroundColor: Colors.primary[600] }}
        >
          <Ionicons name="medical-outline" size={24} color="#ffffff" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold" style={{ color: Colors.primary[900] }}>
            {doctor.fullName ?? "Bác sĩ Smart Dental"}
          </Text>
          <Text className="text-xs" style={{ color: Colors.primary[600] }}>
            {doctor.specialty ?? "Chuyên khoa Răng Hàm Mặt"}
          </Text>
        </View>
      </View>
      <View className="mt-3 flex-row flex-wrap" style={{ gap: 12 }}>
        <TouchableOpacity
          className="flex-1 rounded-2xl px-4 py-2"
          style={{ backgroundColor: Colors.primary[600] }}
          onPress={() => onNavigate("doctor", doctor)}
        >
          <Text className="text-center text-xs font-semibold text-white">Xem danh sách bác sĩ</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 rounded-2xl border px-4 py-2"
          style={{ borderColor: Colors.primary[400] }}
          onPress={() => onNavigate("appointment", doctor)}
        >
          <Text className="text-center text-xs font-semibold" style={{ color: Colors.primary[600] }}>
            Đặt lịch khám nhanh
          </Text>
        </TouchableOpacity>
      </View>
      {doctor.phone ? (
        <TouchableOpacity
          className="mt-3 flex-row items-center justify-center rounded-2xl border bg-white px-4 py-2"
          style={{ borderColor: Colors.primary[200] }}
          onPress={() => onNavigate("appointment", doctor)}
        >
          <Ionicons name="call-outline" size={16} color={Colors.primary[600]} />
          <Text className="ml-2 text-xs font-semibold" style={{ color: Colors.primary[700] }}>
            Liên hệ: {doctor.phone}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function AnalysisBlock({ analysis }: { analysis: ImageAnalysisResult }) {
  if (!analysis) return null;

  const sections = analysis.richContent?.sections ?? [];

  return (
    <View className="mt-3" style={{ gap: 12 }}>
      {analysis.richContent?.title ? (
        <Text className="text-sm font-semibold" style={{ color: Colors.primary[900] }}>
          {analysis.richContent.title}
        </Text>
      ) : null}

      {analysis.richContent?.analysis ? (
        <Text className="text-sm" style={{ color: Colors.primary[700] }}>
          {analysis.richContent.analysis}
        </Text>
      ) : null}

      {sections.length > 0
        ? sections.map((section, index) => (
            <View
              key={`${section.heading}-${index}`}
              className="rounded-2xl border p-3"
              style={{ borderColor: "#e2e8f0", backgroundColor: "#ffffff" }}
            >
              {section.heading ? (
                <Text className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#1e293b" }}>
                  {section.heading}
                </Text>
              ) : null}
              {section.text ? (
                <Text className="mt-1 text-sm" style={{ color: "#475569" }}>
                  {section.text}
                </Text>
              ) : null}
              {section.bullets?.length ? (
                <View className="mt-2" style={{ gap: 4 }}>
                  {section.bullets.map((bullet) => (
                    <View key={bullet} className="flex-row items-start" style={{ gap: 8 }}>
                      <View
                        className="mt-[6px] h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: Colors.primary[400] }}
                      />
                      <Text className="flex-1 text-xs" style={{ color: "#64748b" }}>
                        {bullet}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ))
        : null}

      {analysis.richContent?.recommendations?.length ? (
        <View
          className="rounded-2xl border p-3"
          style={{
            borderColor: Colors.success[100],
            backgroundColor: `${Colors.success[50]}CC`,
          }}
        >
          <Text className="text-xs font-semibold uppercase tracking-wide" style={{ color: Colors.success[700] }}>
            Khuyến nghị
          </Text>
          {analysis.richContent.recommendations.map((item) => (
            <Text key={item} className="mt-1 text-xs" style={{ color: Colors.success[700] }}>
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
  onNavigateDoctor: (target: "doctor" | "appointment", doctor?: SuggestedDoctor) => void;
}) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const isUser = message.role === "user";
  const statusLabel =
    message.status === "sending"
      ? "Đang gửi..."
      : message.status === "failed"
        ? "Gửi thất bại"
        : formatTime(message.createdAt);

  const urgencyStyles = getUrgencyStyles(message.urgencyLevel);
  const metadata = message.metadata as Record<string, unknown> | undefined;
  let confidence: number | undefined;
  if (metadata && typeof metadata.confidence === "number") {
    confidence = metadata.confidence;
  } else if (typeof message.analysisData?.confidence === "number") {
    confidence = message.analysisData.confidence;
  }

  // Render call message bubble
  if (message.isCallMessage && message.callType && message.callStatus) {
    return (
      <View className={`mb-3 flex-row px-1 ${isUser ? "justify-end" : "justify-start"}`}>
        <CallMessageBubble
          callType={message.callType}
          callStatus={message.callStatus}
          callDuration={message.callDuration}
          isOutgoing={isUser}
          timestamp={statusLabel}
        />
      </View>
    );
  }

  return (
    <View className={`mb-3 flex-row px-1 ${isUser ? "justify-end" : "justify-start"}`}>
      {/* Avatar for assistant messages */}
      {!isUser && (
        <View
          className="w-8 h-8 rounded-full items-center justify-center mr-2 overflow-hidden"
          style={{ backgroundColor: Colors.primary[100] }}
        >
          <Ionicons name="person" size={16} color={Colors.primary[600]} />
        </View>
      )}
      <View
        className="max-w-[82%] rounded-3xl px-4 py-3"
        style={{
          backgroundColor: isUser ? Colors.primary[600] : theme.card,
          borderWidth: isUser ? 0 : 1,
          borderColor: isUser ? "transparent" : theme.border,
        }}
      >
        {message.attachments?.map((attachment) => (
          <View key={attachment.id} className="mb-3 overflow-hidden rounded-2xl">
            <Image source={{ uri: attachment.uri }} contentFit="cover" className="h-40 w-full" />
          </View>
        ))}

        <Text className="text-sm leading-relaxed" style={{ color: isUser ? "#ffffff" : theme.text.primary }}>
          {message.content}
        </Text>

        {message.analysisData ? <AnalysisBlock analysis={message.analysisData} /> : null}

        {message.nextSteps?.length ? (
          <View
            className="mt-3 rounded-2xl border p-3"
            style={{
              borderColor: Colors.primary[100],
              backgroundColor: `${Colors.primary[50]}99`,
            }}
          >
            <Text className="text-xs font-semibold uppercase tracking-wide" style={{ color: Colors.primary[700] }}>
              Các bước tiếp theo
            </Text>
            {message.nextSteps.map((step) => (
              <Text key={step} className="mt-1 text-xs" style={{ color: Colors.primary[700] }}>
                • {step}
              </Text>
            ))}
          </View>
        ) : null}

        {message.quickActions?.length ? (
          <View className="mt-3 flex-row flex-wrap" style={{ gap: 8 }}>
            {message.quickActions.map((action) => (
              <TouchableOpacity
                key={action}
                className="rounded-2xl border px-3 py-1.5"
                style={{
                  borderColor: Colors.primary[200],
                  backgroundColor: Colors.primary[50],
                }}
                onPress={() => onQuickAction(action)}
              >
                <Text className="text-xs font-semibold" style={{ color: Colors.primary[700] }}>
                  {action}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {message.followUpQuestions?.length ? (
          <View className="mt-3" style={{ gap: 8 }}>
            {message.followUpQuestions.map((question) => (
              <TouchableOpacity
                key={question}
                className="rounded-2xl border px-3 py-2"
                style={{
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                }}
                onPress={() => onQuickAction(question)}
              >
                <Text className="text-xs font-medium" style={{ color: theme.text.secondary }}>
                  {question}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {message.suggestedDoctor ? (
          <SuggestedDoctorCard doctor={message.suggestedDoctor} onNavigate={onNavigateDoctor} />
        ) : null}

        {message.urgencyLevel ? (
          <View
            className="mt-3 flex-row items-center justify-between rounded-2xl border px-3 py-2"
            style={{
              borderColor: urgencyStyles.borderColor,
              backgroundColor: urgencyStyles.backgroundColor,
            }}
          >
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Ionicons name="heart-outline" size={16} color={urgencyStyles.iconColor} />
              <Text className="text-xs font-semibold" style={{ color: urgencyStyles.textColor }}>
                Mức độ: {formatUrgencyLabel(message.urgencyLevel)}
              </Text>
            </View>
            {typeof confidence === "number" ? (
              <Text className="text-[11px]" style={{ color: urgencyStyles.textColor }}>
                Độ tin cậy: {Math.round(confidence * 100)}%
              </Text>
            ) : null}
          </View>
        ) : null}

        <Text className="mt-2 text-[10px]" style={{ color: isUser ? "#bfdbfe" : theme.text.secondary }}>
          {statusLabel}
        </Text>
      </View>
    </View>
  );
}

export default function ChatConversationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; name?: string; type?: string; conversationId?: string }>();
  const { session } = useAuth();
  const { setOnCallEnded } = useCall();
  const insets = useSafeAreaInsets();
  // Use fixed tab bar height since this screen is not inside Bottom Tab Navigator
  const tabBarHeight = 0; // Set to 0 or remove if not needed
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const chatId = params.id ?? "ai-bot";
  const chatName = params.name ?? "Smart Dental AI";
  const chatType = params.type ?? "ai"; // 'ai' | 'doctor'
  const existingConversationId = params.conversationId; // Get conversation ID from params

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const flatListRef = useRef<FlatList<ChatMessage> | null>(null);
  const [composerHeight, setComposerHeight] = useState(0);

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Real-time chat state (for doctor chat)
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isConnectingSocket, setIsConnectingSocket] = useState(false);
  const [isDoctorTyping, setIsDoctorTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationCacheRef = useRef<Map<string, string>>(new Map()); // doctorId -> conversationId
  const currentConversationRef = useRef<string | null>(null); // Track current conversation for cleanup
  const abortControllerRef = useRef<AbortController | null>(null); // Cancel pending requests
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Load chat state
  useEffect(() => {
    let isMounted = true;
    (async () => {
      // For doctor chat, DON'T load from storage - will load from backend via Socket.IO
      if (chatType === "doctor") {
        setIsHydrated(true);
        return;
      }

      // For AI chat, load from local storage
      const stored = await loadChatState(chatType as "ai" | "doctor", existingConversationId);
      if (!isMounted) return;

      if (stored?.messages?.length) {
        const restored: ChatMessage[] = stored.messages.map((item) => {
          const attachments = Array.isArray(item.attachments)
            ? (item.attachments
                .map((attachment) => {
                  if (!attachment || typeof attachment !== "object") {
                    return null;
                  }
                  const uri = typeof attachment.uri === "string" ? attachment.uri : null;
                  if (!uri) {
                    return null;
                  }
                  const id = typeof attachment.id === "string" ? attachment.id : createId();
                  const type = typeof attachment.type === "string" ? attachment.type : "image";
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

          const suggestedDoctor =
            item.suggestedDoctor && typeof item.suggestedDoctor === "object"
              ? (item.suggestedDoctor as SuggestedDoctor)
              : null;
          const analysisData =
            item.analysisData && typeof item.analysisData === "object"
              ? (item.analysisData as ImageAnalysisResult)
              : null;

          // Detect if this is a call message (for old messages without call fields)
          const callDetection = detectCallMessage(item.content);

          return {
            id: item.id,
            role: item.role === "assistant" ? "assistant" : "user",
            content: item.content,
            createdAt: item.createdAt,
            status: (item.status as MessageStatus) ?? "sent",
            quickActions,
            followUpQuestions,
            urgencyLevel: item.urgencyLevel,
            nextSteps,
            suggestedDoctor,
            analysisData,
            attachments,
            metadata: item.metadata ?? undefined,
            // Add call message fields if detected
            isCallMessage: callDetection.isCallMessage,
            callType: callDetection.callType,
            callStatus: callDetection.callStatus,
          };
        });
        setMessages(restored);
        messagesRef.current = restored;
      } else if (chatType === "ai") {
        // Only show fallback message for AI chat
        setMessages([FALLBACK_MESSAGE]);
        messagesRef.current = [FALLBACK_MESSAGE];
      }
      // For doctor chat without stored messages, keep empty []

      if (stored?.sessionId) {
        setSessionId(stored.sessionId);
      }

      setIsHydrated(true);
    })();

    return () => {
      isMounted = false;
    };
  }, [chatType, existingConversationId]);

  // Start chat session
  useEffect(() => {
    if (!isHydrated) return;
    if (sessionId) return;
    if (chatType !== "ai") return; // Only for AI chat

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
  }, [isHydrated, session?.user?._id, sessionId, chatType]);

  // Load suggestions
  useEffect(() => {
    if (chatType !== "ai") return;

    let active = true;

    const fetch = async () => {
      try {
        setLoadingSuggestions(true);
        const [questions, symptomSuggestions] = await Promise.all([
          fetchSuggestedQuestions(),
          fetchQuickSuggestions("đau răng"),
        ]);
        if (!active) return;
        const combined = [...new Set([...questions, ...symptomSuggestions])].slice(0, 12);
        setSuggestions(combined);
      } catch (error) {
        console.warn("Không thể tải gợi ý chat", error);
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
  }, [chatType]);

  // Setup call ended callback
  useEffect(() => {
    if (chatType !== "doctor") return; // Only for doctor chat
    if (!setOnCallEnded) return;

    const handleCallEnded = (callInfo: {
      receiverId: string;
      receiverName: string;
      isVideoCall: boolean;
      callStatus: "missed" | "answered" | "rejected" | "completed";
      callDuration?: number;
      isOutgoing: boolean;
    }) => {
      // Only create message if this is the chat with the person we called/received call from
      if (callInfo.receiverId !== chatId) return;

      const callMessage: ChatMessage = {
        id: createId(),
        role: callInfo.isOutgoing ? "user" : "assistant",
        content: callInfo.isVideoCall ? "Cuộc gọi video" : "Cuộc gọi thoại",
        createdAt: new Date().toISOString(),
        status: "sent",
        isCallMessage: true,
        callType: callInfo.isVideoCall ? "video" : "audio",
        callStatus: callInfo.callStatus,
        callDuration: callInfo.callDuration,
      };

      setMessages((prev) => [...prev, callMessage]);
    };

    setOnCallEnded(handleCallEnded);

    return () => {
      setOnCallEnded(undefined);
    };
  }, [chatType, chatId, setOnCallEnded]);

  // Persist chat state
  useEffect(() => {
    messagesRef.current = messages;
    if (!isHydrated) return;

    // Only persist AI chat to local storage (doctor chat is stored on server)
    if (chatType !== "ai") return;

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

    void persistChatState(
      {
        sessionId,
        messages: serialisableMessages,
        lastUpdated: Date.now(),
      },
      chatType as "ai" | "doctor",
      conversationId || existingConversationId
    );
  }, [messages, sessionId, isHydrated, chatType, conversationId, existingConversationId]);

  // Reset state when switching conversations
  useEffect(() => {
    // Reset messages and pagination when conversation changes
    if (chatType === "doctor") {
      setMessages([]);
      messagesRef.current = [];
      setCurrentPage(1);
      setHasMoreMessages(true);
      setIsLoadingMessages(false);
    }
  }, [chatId, existingConversationId, chatType]);

  // Reset state when switching conversations
  useEffect(() => {
    // Clear any pending loading timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    // Reset messages and pagination when conversation changes
    if (chatType === "doctor") {
      const resetStartTime = performance.now();
      console.log("🔄 [Chat] Switching to conversation:", chatId);
      
      // CRITICAL: Leave old conversation BEFORE switching
      if (currentConversationRef.current && realtimeChatService.isConnected()) {
        console.log("🚺 [Chat] Leaving old conversation:", currentConversationRef.current);
        realtimeChatService.leaveConversation(currentConversationRef.current);
        currentConversationRef.current = null;
      }
      
      // Cancel any pending message load requests
      if (abortControllerRef.current) {
        console.log("❌ [Chat] Aborting pending request");
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // Show loading immediately - DON'T clear messages yet (keep old messages visible)
      setIsLoadingMessages(true);
      setConversationId(null);
      
      console.log(`⚡ [Chat] Switch initiated in ${(performance.now() - resetStartTime).toFixed(2)}ms`);
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      // Abort any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [chatId, existingConversationId, chatType]);

  // Auto scroll to bottom
  useEffect(() => {
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 120);

    return () => clearTimeout(timer);
  }, [messages.length]);

  // Connect to realtime chat for doctor conversations
  useEffect(() => {
    if (chatType !== "doctor" || !session?.token) return;
    if (!chatId || chatId === "ai-bot") return;

    let isMounted = true;
    const userId = (session.user as any)?._id || (session.user as any)?.id;
    if (!userId) return;

    const connectSocket = async () => {
      try {
        setIsConnectingSocket(true);
        
        // Skip reconnect if already connected
        if (!realtimeChatService.isConnected()) {
          console.log("🔌 [Chat] Connecting to realtime chat...");
          try {
            await realtimeChatService.connect(session.token!, userId, "patient");
            
            if (!isMounted) return;
            
            const connectionState = realtimeChatService.getConnectionState();
            if (connectionState === "failed") {
              console.warn("⚠️ [Chat] Socket connection failed - using REST API only");
              // Continue without socket - app will work with REST API
            } else if (!realtimeChatService.isConnected()) {
              console.error("❌ [Chat] Socket connected but isConnected() returns false");
              // Continue anyway - don't block the app
            }
          } catch (error) {
            console.error("❌ [Chat] Socket connection error:", error);
            // Continue without socket - app will work with REST API
          }
        } else {
          console.log("✅ [Chat] Already connected to socket");
        }

        if (!isMounted) return;

        setIsConnectingSocket(false);
        console.log("✅ [Chat] Socket connection attempt completed");

        // Use existing conversation ID if provided, otherwise create/find conversation
        let targetConversationId = existingConversationId;

        // Check cache first
        if (!targetConversationId && conversationCacheRef.current.has(chatId)) {
          targetConversationId = conversationCacheRef.current.get(chatId);
          console.log("💾 [Chat] Using cached conversation:", targetConversationId);
        }

        if (!targetConversationId) {
          // Try to create or find conversation
          try {
            const conversation = await realtimeChatService.createConversation(userId, chatId);
            if (isMounted) {
              targetConversationId = conversation._id;
              // Cache the conversation ID
              conversationCacheRef.current.set(chatId, targetConversationId);
              console.log("✅ [Chat] Conversation created/found:", conversation._id);
            }
          } catch (error) {
            console.error("❌ [Chat] Error creating conversation:", error);
            // If createConversation fails, try to find conversation via REST API
            try {
              const { apiRequest } = await import("@/utils/api");
              const convResponse = await apiRequest<any>(
                `/realtime-chat/conversations?userId=${userId}&userRole=patient`,
                {
                  method: "GET",
                  headers: {
                    Authorization: `Bearer ${session.token}`,
                  },
                }
              );
              const conversations: any[] = Array.isArray(convResponse.data) ? convResponse.data : [];
              const existingConv = conversations.find((conv) => (conv.doctorId?._id || conv.doctorId) === chatId);
              if (existingConv && isMounted) {
                targetConversationId = existingConv._id;
                // Cache the conversation ID
                conversationCacheRef.current.set(chatId, targetConversationId);
                console.log("✅ [Chat] Found existing conversation via REST API:", targetConversationId);
              }
            } catch (findError) {
              console.error("❌ [Chat] Error finding conversation via REST API:", findError);
            }
          }
        }

        if (targetConversationId && isMounted) {
          // Leave previous conversation BEFORE setting new one
          if (conversationId && conversationId !== targetConversationId) {
            console.log("🚪 [Chat] Leaving previous conversation:", conversationId);
            realtimeChatService.leaveConversation(conversationId);
          }

          setConversationId(targetConversationId);
          currentConversationRef.current = targetConversationId; // Track current conversation
          console.log("✅ [Chat] Using conversation:", targetConversationId);

          // Join conversation room (non-blocking) - only if socket connected
          if (realtimeChatService.isConnected()) {
            realtimeChatService.joinConversation(targetConversationId);
          } else {
            console.warn("⚠️ [Chat] Socket not connected - skipping room join");
          }

          // Load messages immediately (don't wait for join to complete)
          const loadStartTime = performance.now();
          setIsLoadingMessages(true);
          
          // Add timeout to prevent hanging
          const loadMessagesWithTimeout = async () => {
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Load messages timeout')), 10000)
            );
            
            const loadPromise = (async () => {
              const { apiRequest } = await import("@/utils/api");
              return await apiRequest<ChatMessage[]>(
                `/realtime-chat/conversations/${targetConversationId}/messages?userId=${userId}&userRole=patient&page=1&limit=${INITIAL_MESSAGE_LOAD}`,
                {
                  method: "GET",
                  headers: {
                    Authorization: `Bearer ${session.token}`,
                  },
                }
              );
            })();
            
            return Promise.race([loadPromise, timeoutPromise]);
          };
          
          try {
            const response = await loadMessagesWithTimeout() as any;
            console.log(`⚡ [Chat] Messages loaded in ${(performance.now() - loadStartTime).toFixed(2)}ms`);

            if (isMounted && response.data) {
              const totalMessages = response.data.length;
              console.log(`✅ [Chat] Loaded ${totalMessages} messages via REST API`);
              
              // NOW clear old messages and show new ones
              setCurrentPage(1);
              setHasMoreMessages(totalMessages >= INITIAL_MESSAGE_LOAD);

              const loadedMessages: ChatMessage[] = response.data.map((msg: any) => {
                const senderId = msg.senderId?._id || msg.senderId;
                const isMyMessage = senderId === userId;

                // Check if this is a call message using messageType and callData
                const isCallMessage = msg.messageType === "call" && msg.callData;

                return {
                  id: msg._id,
                  role: isMyMessage ? "user" : "assistant",
                  content: msg.content,
                  createdAt: msg.createdAt,
                  status: "sent" as MessageStatus,
                  attachments: msg.fileUrl
                    ? [
                        {
                          id: msg._id,
                          type: "image" as const,
                          uri: msg.fileUrl,
                        },
                      ]
                    : undefined,
                  // Add call message fields from backend callData
                  isCallMessage,
                  callType: msg.callData?.callType,
                  callStatus: msg.callData?.callStatus,
                  callDuration: msg.callData?.callDuration,
                };
              });

              // Only update if we have messages, or if this is a new conversation (empty is fine)
              setMessages(loadedMessages);
              messagesRef.current = loadedMessages;

              // Mark conversation as read when messages are loaded
              if (conversationId) {
                console.log("✅ [Chat] Marking conversation as read:", conversationId);
                realtimeChatService.markConversationAsRead(conversationId);
              }
            } else if (isMounted) {
              // No messages found, set empty array
              console.log("ℹ️ [Chat] No messages found for conversation");
              setMessages([]);
              messagesRef.current = [];
            }
          } catch (error) {
            console.error("❌ [Chat] Error loading messages via REST API:", error);
            if (isMounted) {
              setMessages([]);
              messagesRef.current = [];
            }
          } finally {
            if (isMounted) {
              setIsLoadingMessages(false);
            }
          }
        }

        // Setup event listeners
        const handleNewMessage = (data: { message: RealtimeChatMessage; conversationId: string }) => {
          if (!isMounted) return;

          const senderId = data.message.senderId?._id || data.message.senderId;
          const isMyMessage = senderId === userId;

          if (isMyMessage) {
            // My message echoed back from server - update status to 'sent'
            setMessages((prev) => {
              // Find message by content and timestamp (within 5 seconds)
              const msgTime = new Date(data.message.createdAt).getTime();
              const matchingMsg = prev.find(
                (m) =>
                  m.role === "user" &&
                  m.content === data.message.content &&
                  m.status === "sending" &&
                  Math.abs(new Date(m.createdAt).getTime() - msgTime) < 5000
              );

              if (matchingMsg) {
                // Update existing message status - chỉ update message cần thiết
                const newMessages = [...prev];
                const index = newMessages.findIndex((m) => m.id === matchingMsg.id);
                if (index !== -1) {
                  newMessages[index] = { ...matchingMsg, status: "sent" as MessageStatus, id: data.message._id };
                }
                return newMessages;
              }
              return prev;
            });
          } else {
            // Message from doctor
            const isCallMessage = data.message.messageType === "call" && (data.message as any).callData;
            const callData = (data.message as any).callData;

            const newMsg: ChatMessage = {
              id: data.message._id,
              role: "assistant",
              content: data.message.content,
              createdAt: data.message.createdAt,
              status: "sent",
              attachments: data.message.fileUrl
                ? [
                    {
                      id: data.message._id,
                      type: "image",
                      uri: data.message.fileUrl,
                    },
                  ]
                : undefined,
              // Add call message fields
              isCallMessage,
              callType: callData?.callType,
              callStatus: callData?.callStatus,
              callDuration: callData?.callDuration,
            };
            setMessages((prev) => [...prev, newMsg]);
          }
        };

        const handleTyping = (data: { conversationId: string; userId: string; isTyping: boolean }) => {
          if (!isMounted) return;
          if (data.userId === userId) return; // Ignore own typing

          setIsDoctorTyping(data.isTyping);

          // Auto-hide typing indicator after 3s
          if (data.isTyping) {
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
            }
            typingTimeoutRef.current = setTimeout(() => {
              setIsDoctorTyping(false);
            }, 3000);
          }
        };

        realtimeChatService.on("newMessage", handleNewMessage);
        realtimeChatService.on("userTyping", handleTyping);

        return () => {
          realtimeChatService.off("newMessage", handleNewMessage);
          realtimeChatService.off("userTyping", handleTyping);
        };
      } catch (error) {
        console.error("❌ [Chat] Failed to connect:", error);
        if (isMounted) {
          setIsConnectingSocket(false);
          Alert.alert("Lỗi kết nối", "Không thể kết nối đến máy chủ chat. Vui lòng thử lại sau.");
        }
      }
    };

    connectSocket();

    return () => {
      isMounted = false;
      if (conversationId) {
        realtimeChatService.leaveConversation(conversationId);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      // Abort any pending requests on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      // Clear ref on unmount
      currentConversationRef.current = null;
    };
  }, [chatType, chatId, session?.token, session?.user, existingConversationId]);

  const handleOpenWebChat = useCallback(async () => {
    try {
      const supported = await Linking.canOpenURL(WEB_CHAT_URL);
      if (supported) {
        await Linking.openURL(WEB_CHAT_URL);
      } else {
        Alert.alert("Không thể mở chat web", "Vui lòng truy cập smart-dental-healthcare.com/patient/chat-support");
      }
    } catch (error) {
      Alert.alert("Không thể mở chat web", formatApiError(error, "Vui lòng thử lại sau."));
    }
  }, []);

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const updateMessage = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((message) => (message.id === id ? { ...message, ...patch } : message)));
  }, []);

  const buildChatHistory = useCallback((extra?: { role: ChatRole; content: string }) => {
    const base = messagesRef.current
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map((message) => ({ role: message.role, content: message.content }));
    if (extra) {
      base.push(extra);
    }
    return base.slice(-MAX_HISTORY);
  }, []);

  const navigateFromDoctorSuggestion = useCallback(
    (target: "doctor" | "appointment", doctor?: SuggestedDoctor) => {
      if (target === "doctor") {
        if (doctor?._id) {
          router.push({ pathname: "/(tabs)/doctors", params: { highlightDoctorId: doctor._id } });
        } else {
          router.push("/(tabs)/doctors");
        }
        return;
      }
      if (doctor?._id) {
        router.push({
          pathname: "/(tabs)/appointments",
          params: { doctorId: doctor._id, doctorName: doctor.fullName ?? "" },
        });
      } else {
        router.push("/(tabs)/appointments");
      }
    },
    [router]
  );

  const handleAiResponse = useCallback(
    (placeholderId: string, data: AiAssistantResponse) => {
      updateMessage(placeholderId, {
        content:
          data.message?.trim() ||
          "Xin lỗi, tôi chưa tìm được câu trả lời phù hợp. Bạn có thể thử mô tả chi tiết hơn nhé!",
        status: "sent",
        createdAt: new Date().toISOString(),
        quickActions: data.quickActions ?? [],
        followUpQuestions: data.followUpQuestions ?? [],
        urgencyLevel: data.urgencyLevel ?? data.context?.urgencyLevel,
        metadata: {
          ...(data.context ?? {}),
          ...(typeof data.confidence === "number" ? { confidence: data.confidence } : {}),
        },
        nextSteps: data.nextSteps ?? [],
        suggestedDoctor: data.suggestedDoctor ?? data.context?.suggestedDoctors?.[0] ?? null,
      });
    },
    [updateMessage]
  );

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text) {
        return;
      }

      // For AI chat, block sending if already processing
      if (chatType === "ai" && isSending) {
        return;
      }

      const now = new Date().toISOString();
      const userMessage: ChatMessage = {
        id: createId(),
        role: "user",
        content: text,
        createdAt: now,
        status: "sending",
      };

      setInput("");
      appendMessage(userMessage);

      // Handle doctor chat via socket - Fast, no blocking
      if (chatType === "doctor") {
        if (!conversationId) {
          updateMessage(userMessage.id, {
            status: "failed",
          });
          Alert.alert("Lỗi", "Không tìm thấy cuộc trò chuyện. Vui lòng thử lại.");
          return;
        }

        // Send message - try socket first, fallback to REST API
        const sendMessagePromise = realtimeChatService.isConnected()
          ? realtimeChatService.sendMessage(conversationId, text, "text")
          : (async () => {
              console.log("⚠️ [Chat] Socket not connected, using REST API for message");
              const { apiRequest } = await import("@/utils/api");
              await apiRequest(
                `/realtime-chat/conversations/${conversationId}/messages`,
                {
                  method: "POST",
                  body: {
                    content: text,
                    messageType: "text",
                  },
                  headers: {
                    Authorization: `Bearer ${session.token}`,
                  },
                }
              );
            })();

        // Send message without blocking UI
        // Status will be updated to 'sent' when we receive the message back from server
        sendMessagePromise
          .then(() => {
            console.log("✅ [Chat] Message sent to server");
            // If using REST API, update status immediately
            if (!realtimeChatService.isConnected()) {
              updateMessage(userMessage.id, { status: "sent" });
            }
          })
          .catch((error) => {
            console.error("❌ [Chat] Failed to send message:", error);
            updateMessage(userMessage.id, {
              status: "failed",
            });
            Alert.alert("Lỗi", formatApiError(error, "Không thể gửi tin nhắn. Vui lòng thử lại."));
          });
        return;
      }

      // Handle AI chat - Needs blocking for response
      setIsSending(true);

      const placeholder: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: "Trợ lý đang phân tích thông tin của bạn...",
        createdAt: new Date().toISOString(),
        status: "sending",
      };
      appendMessage(placeholder);

      try {
        const history = buildChatHistory({ role: "user", content: text });
        const response = await fetchAiAdvice({
          message: text,
          chatHistory: history,
          sessionId,
        });
        handleAiResponse(placeholder.id, response);
      } catch (error) {
        updateMessage(placeholder.id, {
          content: formatApiError(error, "Xin lỗi, tôi chưa thể trả lời ngay lúc này. Vui lòng thử lại sau."),
          status: "failed",
          createdAt: new Date().toISOString(),
        });
      } finally {
        setIsSending(false);
      }
    },
    [
      appendMessage,
      buildChatHistory,
      handleAiResponse,
      input,
      isSending,
      sessionId,
      updateMessage,
      chatType,
      conversationId,
    ]
  );

  const handleSelectTopic = useCallback(
    (topic: QuickTopic) => {
      const prompt = topic.prompt ?? topic.title;
      void handleSend(prompt);
    },
    [handleSend]
  );

  const handleSelectSuggestion = useCallback(
    (suggestion: string) => {
      void handleSend(suggestion);
    },
    [handleSend]
  );

  const handlePickImage = useCallback(async () => {
    if (!session?.token) {
      Alert.alert("Cần đăng nhập", "Vui lòng đăng nhập để sử dụng tính năng gửi hình ảnh.");
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Không có quyền truy cập ảnh", "Ứng dụng cần quyền truy cập thư viện ảnh để gửi hình.");
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
      type: "image",
      uri: asset.uri,
    };

    const now = new Date().toISOString();
    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: chatType === "doctor" ? "Đã gửi hình ảnh" : "Mình vừa gửi hình ảnh để bác sĩ AI phân tích giúp.",
      createdAt: now,
      status: "sending",
      attachments: [attachment],
    };

    appendMessage(userMessage);
    setIsUploadingImage(true);

    try {
      // Handle doctor chat - upload via socket
      if (chatType === "doctor") {
        if (!conversationId) {
          updateMessage(userMessage.id, {
            status: "failed",
          });
          Alert.alert("Lỗi", "Chưa có cuộc hội thoại. Vui lòng thử lại.");
          return;
        }

        // Upload image
        const uploadResult = await uploadService.uploadImage(
          {
            uri: asset.uri,
            mimeType: asset.mimeType ?? "image/jpeg",
            fileName: asset.fileName ?? `image-${Date.now()}.jpg`,
            fileSize: asset.fileSize,
          },
          conversationId
        );

        if (!uploadResult.success || !uploadResult.url) {
          throw new Error(uploadResult.error ?? "Upload thất bại");
        }

        // Try to send via socket first, fallback to REST API
        try {
          if (realtimeChatService.isConnected()) {
            await realtimeChatService.sendMessage(
              conversationId,
              userMessage.content,
              "image",
              uploadResult.url,
              asset.fileName ?? `image-${Date.now()}.jpg`,
              asset.mimeType ?? "image/jpeg",
              asset.fileSize
            );
          } else {
            // Fallback to REST API
            console.log("⚠️ [Chat] Socket not connected, using REST API for message");
            const { apiRequest } = await import("@/utils/api");
            await apiRequest(
              `/realtime-chat/conversations/${conversationId}/messages`,
              {
                method: "POST",
                body: {
                  content: userMessage.content,
                  messageType: "image",
                  fileUrl: uploadResult.url,
                  fileName: asset.fileName ?? `image-${Date.now()}.jpg`,
                  fileType: asset.mimeType ?? "image/jpeg",
                  fileSize: asset.fileSize,
                },
                headers: {
                  Authorization: `Bearer ${session.token}`,
                },
              }
            );
          }
        } catch (sendError) {
          console.error("❌ [Chat] Error sending message:", sendError);
          throw sendError;
        }

        updateMessage(userMessage.id, {
          status: "sent",
        });

        setIsUploadingImage(false);
        return;
      }

      // Handle AI chat - analyze image
      const response = await uploadAnalysisImage(
        {
          uri: asset.uri,
          mimeType: asset.mimeType ?? "image/jpeg",
          fileName: asset.fileName ?? `analysis-${Date.now()}.jpg`,
        },
        session.token
      );

      if (!response.success || !response.data) {
        throw new Error(response.error ?? "Phân tích ảnh thất bại");
      }

      updateMessage(userMessage.id, {
        status: "sent",
      });

      const analysisMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content:
          response.data.message?.trim() ?? "Mình đã nhận được hình ảnh và dưới đây là phân tích sơ bộ dành cho bạn.",
        createdAt: new Date().toISOString(),
        status: "sent",
        analysisData: response.data,
        urgencyLevel: response.data.urgencyLevel,
        suggestedDoctor: response.data.suggestedDoctor ?? null,
        metadata: response.data.confidence ? { confidence: response.data.confidence } : undefined,
      };

      appendMessage(analysisMessage);

      if (response.data.options?.length) {
        appendMessage({
          id: createId(),
          role: "assistant",
          content: "Bạn có muốn trao đổi thêm về các phương án điều trị sau khi xem phân tích không?",
          createdAt: new Date().toISOString(),
          status: "sent",
          quickActions: response.data.options,
        });
      }
    } catch (error) {
      console.error("❌ [Chat] Image upload/analysis error:", error);
      updateMessage(userMessage.id, {
        status: "failed",
      });

      if (chatType === "doctor") {
        Alert.alert("Lỗi", formatApiError(error, "Không thể gửi hình ảnh. Vui lòng thử lại."));
      } else {
        appendMessage({
          id: createId(),
          role: "assistant",
          content: formatApiError(error, "Xin lỗi, hệ thống chưa thể phân tích hình ảnh. Bạn có thể thử lại sau."),
          createdAt: new Date().toISOString(),
          status: "failed",
        });
      }
    } finally {
      setIsUploadingImage(false);
    }
  }, [appendMessage, updateMessage, session?.token, chatType, conversationId]);

  const handleQuickAction = useCallback(
    (text: string) => {
      void handleSend(text);
    },
    [handleSend]
  );

  const handleLoadMore = useCallback(async () => {
    if (!hasMoreMessages || isLoadingMore || !conversationId || chatType !== "doctor") {
      return;
    }

    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    try {
      const { apiRequest } = await import("@/utils/api");
      const response = await apiRequest<ChatMessage[]>(
        `/realtime-chat/conversations/${conversationId}/messages?userId=${session?.user?._id}&userRole=patient&page=${nextPage}&limit=${MESSAGES_PER_PAGE}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session?.token}`,
          },
        }
      );

      if (response.data && response.data.length > 0) {
        const olderMessages: ChatMessage[] = response.data.map((msg: any) => {
          const senderId = msg.senderId?._id || msg.senderId;
          const isMyMessage = senderId === session?.user?._id;
          const isCallMessage = msg.messageType === "call" && msg.callData;

          return {
            id: msg._id,
            role: isMyMessage ? "user" : "assistant",
            content: msg.content,
            createdAt: msg.createdAt,
            status: "sent" as MessageStatus,
            attachments: msg.fileUrl
              ? [
                  {
                    id: msg._id,
                    type: "image" as const,
                    uri: msg.fileUrl,
                  },
                ]
              : undefined,
            isCallMessage,
            callType: msg.callData?.callType,
            callStatus: msg.callData?.callStatus,
            callDuration: msg.callData?.callDuration,
          };
        });

        // Prepend older messages to the beginning
        setMessages((prev) => [...olderMessages, ...prev]);
        setCurrentPage(nextPage);
        setHasMoreMessages(olderMessages.length >= MESSAGES_PER_PAGE);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error("❌ [Chat] Error loading more messages:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMoreMessages, isLoadingMore, conversationId, currentPage, session, chatType]);

  const handleClearConversation = useCallback(() => {
    Alert.alert("Đặt lại cuộc trò chuyện", "Bạn có chắc muốn xóa lịch sử chat?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => {
          setMessages([FALLBACK_MESSAGE]);
          messagesRef.current = [FALLBACK_MESSAGE];
          setSessionId(null);
          void clearChatState();
        },
      },
    ]);
  }, []);

  // Handle input change with typing indicator
  const handleInputChange = useCallback(
    (text: string) => {
      setInput(text);

      // Send typing indicator for doctor chat
      if (chatType === "doctor" && conversationId && realtimeChatService.isConnected()) {
        realtimeChatService.sendTypingStatus(conversationId, text.length > 0);
      }
    },
    [chatType, conversationId]
  );

  const isBusy = isSending || isUploadingImage || isConnectingSocket;

  const helperNotice = useMemo(() => {
    if (isConnectingSocket) {
      return "Đang kết nối đến máy chủ chat...";
    }
    if (chatType === "doctor") {
      const connectionState = realtimeChatService.getConnectionState();
      if (connectionState === "failed") {
        return "⚠️ Chế độ offline - Tin nhắn sẽ được đồng bộ sau";
      }
      if (!realtimeChatService.isConnected() && connectionState !== "connecting") {
        return "⚠️ Mất kết nối realtime - Sử dụng REST API";
      }
    }
    if (isUploadingImage) {
      return chatType === "doctor" ? "Đang tải hình ảnh..." : "Đang tải và phân tích hình ảnh của bạn...";
    }
    if (isSending) {
      return chatType === "doctor" ? "Đang gửi tin nhắn..." : "Trợ lý đang chuẩn bị phản hồi...";
    }
    if (chatType === "doctor") {
      return realtimeChatService.isConnected()
        ? `Đã kết nối • Nhắn tin trực tiếp với ${chatName}`
        : "Nhắn tin trực tiếp với bác sĩ để được tư vấn chi tiết.";
    }
    return "Mô tả chi tiết triệu chứng, thời gian xuất hiện và thói quen gần đây để trợ lý hiểu rõ hơn nhé!";
  }, [isSending, isUploadingImage, chatType, isConnectingSocket, chatName]);

  const composerSafePadding = useMemo(() => Math.max(insets.bottom, 12), [insets.bottom]);
  const conversationPaddingBottom = useMemo(() => 12, []);

  const renderListHeader = useCallback(
    () => (
      <View className="pb-2" style={{ gap: 16 }}>
        <Card className="px-4 py-3">
          <View className="flex-row items-center" style={{ gap: 8 }}>
            {isBusy ? (
              <ActivityIndicator size="small" color={Colors.primary[600]} />
            ) : (
              <Ionicons name="sparkles-outline" size={16} color={Colors.primary[600]} />
            )}
            <Text className="text-xs font-medium" style={{ color: theme.text.secondary }}>
              {helperNotice}
            </Text>
          </View>
        </Card>

        {chatType === "ai" && QUICK_TOPICS.length > 0 ? (
          <View>
            <View className="flex-row items-center justify-between px-1">
              <Text className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.text.secondary }}>
                Chủ đề nhanh
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 4, paddingVertical: 6 }}
            >
              <View className="flex-row" style={{ gap: 12 }}>
                {QUICK_TOPICS.map((topic) => (
                  <TouchableOpacity
                    key={topic.id}
                    className="w-60"
                    onPress={() => handleSelectTopic(topic)}
                    activeOpacity={0.9}
                  >
                    <Card className="px-4 py-3">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row flex-1 items-center" style={{ gap: 12 }}>
                          <View
                            className="h-10 w-10 items-center justify-center rounded-2xl"
                            style={{ backgroundColor: `${topic.accent}1A` }}
                          >
                            <Ionicons name={topic.iconName} size={20} color={topic.accent} />
                          </View>
                          <View className="flex-1">
                            <Text
                              className="text-sm font-semibold"
                              numberOfLines={1}
                              style={{ color: theme.text.primary }}
                            >
                              {topic.title}
                            </Text>
                            <Text className="mt-1 text-xs" numberOfLines={2} style={{ color: theme.text.secondary }}>
                              {topic.description}
                            </Text>
                          </View>
                        </View>
                        <Ionicons name="arrow-forward" size={18} color={Colors.primary[600]} />
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        ) : null}

        {chatType === "ai" && suggestions.length > 0 ? (
          <Card className="px-4 py-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>
                Gợi ý câu hỏi
              </Text>
              {loadingSuggestions ? <ActivityIndicator color={Colors.primary[600]} size="small" /> : null}
            </View>
            <View className="mt-3 flex-row flex-wrap" style={{ gap: 8 }}>
              {suggestions.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion}
                  className="rounded-2xl border px-4 py-2"
                  style={{
                    borderColor: Colors.primary[200],
                    backgroundColor: Colors.primary[50],
                  }}
                  onPress={() => handleSelectSuggestion(suggestion)}
                >
                  <Text className="text-xs font-semibold" style={{ color: Colors.primary[700] }}>
                    {suggestion}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        ) : null}
      </View>
    ),
    [handleSelectSuggestion, handleSelectTopic, helperNotice, isBusy, loadingSuggestions, suggestions, chatType, theme]
  );

  const renderListFooter = useCallback(
    () => (
      <View className="py-6" style={{ gap: 16 }}>
        {isBusy && chatType === "ai" ? (
          <View
            className="flex-row items-center rounded-2xl border px-3 py-2"
            style={{ gap: 8, borderColor: Colors.primary[100], backgroundColor: theme.card }}
            style={{ borderColor: Colors.primary[100], backgroundColor: theme.card }}
          >
            <ActivityIndicator color={Colors.primary[600]} size="small" />
            <Text className="text-xs" style={{ color: theme.text.secondary }}>
              Trợ lý đang xử lý thông tin của bạn...
            </Text>
          </View>
        ) : null}
      </View>
    ),
    [isBusy, chatType, theme]
  );

  return (
    <>
      {/* Custom Header with Call Buttons for Doctor Chat */}
      {chatType === "doctor" ? (
        <View
          className="flex-row items-center justify-between px-4 py-3 border-b"
          style={{
            paddingTop: insets.top + 12,
            backgroundColor: theme.card,
            borderBottomColor: theme.border,
          }}
        >
          <View className="flex-row items-center flex-1">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-base font-semibold" style={{ color: theme.text.primary }} numberOfLines={1}>
                {chatName}
              </Text>
              {realtimeChatService.isConnected() ? (
                <View className="flex-row items-center mt-1">
                  <View className="h-2 w-2 rounded-full bg-green-500 mr-1.5" />
                  <Text className="text-xs" style={{ color: Colors.success[600] }}>
                    Đang hoạt động
                  </Text>
                </View>
              ) : (
                <Text className="text-xs mt-1" style={{ color: theme.text.secondary }}>
                  Ngoại tuyến
                </Text>
              )}
            </View>
          </View>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            {/* Audio Call Button */}
            <CallButton
              receiverId={chatId}
              receiverName={chatName}
              receiverRole={chatType === "doctor" ? "doctor" : "patient"}
              isVideoCall={false}
            />
            {/* Video Call Button */}
            <CallButton
              receiverId={chatId}
              receiverName={chatName}
              receiverRole={chatType === "doctor" ? "doctor" : "patient"}
              isVideoCall={true}
            />
          </View>
        </View>
      ) : (
        <AppHeader title={chatName} showBack showNotification showAvatar notificationCount={0} />
      )}
      <KeyboardAvoidingView
        className="flex-1"
        style={{ backgroundColor: theme.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? tabBarHeight + composerSafePadding : tabBarHeight + 16}
      >
        <View className="flex-1">
          {isLoadingMessages && (
            <View className="absolute top-0 left-0 right-0 z-50 items-center py-2">
              <View className="flex-row items-center rounded-full px-4 py-2" style={{ backgroundColor: theme.card, gap: 8 }}>
                <ActivityIndicator size="small" color={Colors.primary[600]} />
                <Text className="text-xs font-medium" style={{ color: theme.text.secondary }}>
                  Đang tải tin nhắn...
                </Text>
              </View>
            </View>
          )}
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
            ListEmptyComponent={
              chatType === "doctor" ? (
                isLoadingMessages ? (
                  // Skeleton loading state
                  <View className="flex-1 py-4" style={{ gap: 16 }}>
                    {[1, 2, 3].map((i) => (
                      <View key={i} className={`flex-row ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                        <View
                          className="rounded-2xl px-4 py-3"
                          style={{
                            backgroundColor: theme.card,
                            width: "70%",
                            opacity: 0.5,
                          }}
                        >
                          <View className="h-4 rounded" style={{ backgroundColor: theme.border, width: "80%" }} />
                          <View className="h-4 rounded mt-2" style={{ backgroundColor: theme.border, width: "60%" }} />
                        </View>
                      </View>
                    ))}
                  </View>
                ) : realtimeChatService.isConnected() ? (
                  // Empty state when connected
                  <View className="flex-1 items-center justify-center py-20">
                    <View
                      className="h-20 w-20 items-center justify-center rounded-full mb-4"
                      style={{ backgroundColor: Colors.primary[100] }}
                    >
                      <Ionicons name="chatbubbles-outline" size={40} color={Colors.primary[600]} />
                    </View>
                    <Text className="text-base font-semibold mb-2" style={{ color: theme.text.primary }}>
                      Bắt đầu cuộc trò chuyện
                    </Text>
                    <Text className="text-sm text-center px-8" style={{ color: theme.text.secondary }}>
                      Gửi tin nhắn đầu tiên cho bác sĩ {chatName}
                    </Text>
                  </View>
                ) : null
              ) : null
            }
            contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: conversationPaddingBottom }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            // Performance optimizations
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={15}
            windowSize={10}
            getItemLayout={(data, index) => ({
              length: 100, // Estimated height
              offset: 100 * index,
              index,
            })}
            // Pagination
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            onRefresh={isLoadingMessages ? undefined : handleLoadMore}
            refreshing={isLoadingMore}
          />
        </View>

        <View
          className="border-t px-4 pt-3"
          style={{
            paddingBottom: composerSafePadding,
            marginBottom: tabBarHeight + 8,
            backgroundColor: theme.card,
            borderTopColor: theme.border,
          }}
        >
          <View
            className="rounded-3xl border px-4 py-2"
            style={{
              borderColor: theme.border,
              backgroundColor: theme.surface,
            }}
            onLayout={({ nativeEvent }) => setComposerHeight(nativeEvent.layout.height)}
          >
            <TextInput
              value={input}
              onChangeText={handleInputChange}
              placeholder={chatType === "doctor" ? "Nhập tin nhắn..." : "Mô tả triệu chứng hoặc câu hỏi của bạn..."}
              placeholderTextColor="#94a3b8"
              multiline
              className="max-h-32 text-sm"
              style={{ color: theme.text.primary }}
              onSubmitEditing={() => void handleSend()}
              returnKeyType="send"
              blurOnSubmit={false}
            />
            {isDoctorTyping && chatType === "doctor" ? (
              <View className="mt-2 flex-row items-center" style={{ gap: 8 }}>
                <ActivityIndicator size="small" color={Colors.primary[600]} />
                <Text className="text-xs italic" style={{ color: theme.text.secondary }}>
                  {chatName} đang gõ...
                </Text>
              </View>
            ) : null}
            <View className="mt-3 flex-row items-center justify-between">
              <View className="flex-row items-center" style={{ gap: 12 }}>
                <TouchableOpacity
                  onPress={handlePickImage}
                  disabled={isUploadingImage || (chatType === "doctor" && !realtimeChatService.isConnected())}
                  className="flex-row items-center rounded-2xl border px-3 py-2"
                  style={{
                    borderColor: chatType === "ai" ? Colors.primary[100] : Colors.success[100],
                    backgroundColor: chatType === "ai" ? Colors.primary[50] : Colors.success[50],
                    opacity:
                      isUploadingImage || (chatType === "doctor" && !realtimeChatService.isConnected()) ? 0.5 : 1,
                  }}
                >
                  {isUploadingImage ? (
                    <ActivityIndicator
                      size="small"
                      color={chatType === "ai" ? Colors.primary[600] : Colors.success[600]}
                    />
                  ) : (
                    <Ionicons
                      name="image-outline"
                      size={16}
                      color={chatType === "ai" ? Colors.primary[600] : Colors.success[600]}
                    />
                  )}
                  <Text
                    className="ml-2 text-[11px] font-semibold"
                    style={{ color: chatType === "ai" ? Colors.primary[700] : Colors.success[700] }}
                  >
                    {chatType === "ai" ? "Phân tích ảnh" : "Gửi ảnh"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => Linking.openURL("tel:19006363")}
                  className="flex-row items-center rounded-2xl border px-3 py-2"
                  style={{
                    borderColor: Colors.success[100],
                    backgroundColor: Colors.success[50],
                  }}
                >
                  <Ionicons name="call-outline" size={16} color={Colors.success[600]} />
                  <Text className="ml-2 text-[11px] font-semibold" style={{ color: Colors.success[700] }}>
                    Hotline
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => void handleSend()}
                disabled={
                  !input.trim() ||
                  (chatType === "ai" && isSending) ||
                  (chatType === "doctor" && !realtimeChatService.isConnected())
                }
                className="h-10 min-w-[72px] items-center justify-center rounded-2xl px-4"
                style={{
                  backgroundColor:
                    !input.trim() ||
                    (chatType === "ai" && isSending) ||
                    (chatType === "doctor" && !realtimeChatService.isConnected())
                      ? Colors.primary[200]
                      : Colors.primary[600],
                }}
                accessibilityRole="button"
                accessibilityLabel="Gửi tin nhắn"
              >
                {(chatType === "ai" && isSending) || isConnectingSocket ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-xs font-semibold text-white">Gửi</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
