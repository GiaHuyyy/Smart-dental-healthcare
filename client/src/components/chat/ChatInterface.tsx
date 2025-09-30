"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addChatMessage,
  clearAppointmentData,
  setAppointmentData,
  setNotes,
  setSelectedDoctor,
  setSymptoms,
  setUrgencyLevel,
} from "@/store/slices/appointmentSlice";
import {
  clearAnalysisResult,
  setAnalysisResult,
  setIsAnalyzing,
  setUploadedImage,
} from "@/store/slices/imageAnalysisSlice";
import { aiChatAPI, ChatMessage, DoctorSuggestion } from "@/utils/aiChat";
import { sendRequest } from "@/utils/api";
import { chatStorage } from "@/utils/chatStorage";
import { imageAnalysisAPI } from "@/utils/imageAnalysis";
import { extractUserData } from "@/utils/sessionHelpers";
import { useAiChatHistory } from "@/hooks/useAiChatHistory";
import { aiChatHistoryService } from "@/utils/aiChatHistory";
import { uploadService } from "@/services/uploadService";
import Image from "next/image";
import { Lightbulb, Calendar, Wrench, Stethoscope, Check, FileText, X, Search, BarChart2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useWebRTC } from "@/contexts/WebRTCContext";
import IncomingCallModal from "@/components/call/IncomingCallModal";
import VideoCallInterface from "@/components/call/VideoCallInterface";
import realtimeChatService from "@/services/realtimeChatService";
import CallMessage from "../call/CallMessage";

// Helper to format timestamps consistently
function formatTimestampLocalized(input: Date | string): string {
  const d = input instanceof Date ? input : new Date(input);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  const pad = (n: number) => `${n}`.padStart(2, "0");
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (sameDay) return time; // HH:mm for today
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${time}`; // dd/MM HH:mm for other days
}

// Filter out system/call messages without visible content
function isRenderableMessage(msg: any): boolean {
  const type = (msg?.messageType || "text").toString().toLowerCase();
  const hasText = !!(msg?.content && msg.content.trim().length > 0);
  const hasFile = !!msg?.fileUrl;
  if (type === "call") return true; // always render call (as a card)
  if (type === "call" && !hasText && !hasFile) return true;
  return hasText || hasFile; // only render if there is something to show
}

function formatDuration(seconds?: number) {
  if (!seconds || seconds <= 0) return "00:00";
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  const pad = (n: number) => `${n}`.padStart(2, "0");
  return `${pad(mm)}:${pad(ss)}`;
}

interface ChatInterfaceProps {
  type: "ai" | "doctor" | "simple-doctor";
  doctorName?: string;
  doctorId?: string;
  conversationId?: string; // Database conversation ID
  // Realtime chat props
  currentUserId?: string;
  currentUserRole?: "patient" | "doctor";
  authToken?: string;
  doctorsList?: any[];
  patientsList?: any[];
  // Preloaded messages from database
  preloadedMessages?: any[];
  isLoadingMessages?: boolean;
  // Callback when new message is sent
  onNewMessage?: (message: any) => void;
  // Callback when input is focused (for unread count reset)
  onInputFocus?: () => void;
  onStartConversation?: (doctor: DoctorSuggestion) => void;
  patientName?: string;
}

export default function ChatInterface({
  type,
  doctorName,
  patientName,
  conversationId,
  currentUserId,
  currentUserRole,
  preloadedMessages = [],
  isLoadingMessages = false,
  onInputFocus,
  onStartConversation,
}: ChatInterfaceProps) {
  // Session and user data
  const { data: session } = useSession();

  // WebRTC hooks for video calling
  const { isCallIncoming, incomingCall, isInCall } = useWebRTC();

  // AI Chat History hook
  const {
    currentSession,
    addMessage: saveMessage,
    setCurrentSession,
    loadUserSessions,
    updateSession,
  } = useAiChatHistory();

  // Helper to ensure a session exists (replaces legacy getOrInitializeSession)
  const ensureSessionExists = useCallback(async () => {
    if (currentSession) return;
    if (!session?.user) return;

    try {
      // Try to load recent sessions
      await loadUserSessions(1, 5);
      if (!currentSession) {
        // Create a new session via service and set it
        const userId = (session.user as any)._id || (session.user as any).id;
        const newSession = await aiChatHistoryService.createSession({
          userId,
          sessionId: aiChatHistoryService.generateSessionId(),
          status: "active",
        });
        setCurrentSession(newSession as any);
      }
    } catch (err) {
      // ignore ensure session errors
    }
  }, [currentSession, session?.user, loadUserSessions, setCurrentSession]);

  // Redux hooks
  const dispatch = useAppDispatch();
  // Client-side timeouts to avoid UI getting stuck when network/server hangs
  const ANALYSIS_TIMEOUT_MS = 30_000; // 30s for image analysis HTTP call

  const withTimeout = async <T,>(p: Promise<T>, ms: number, errorMessage = "Request timed out") => {
    let timer: NodeJS.Timeout | null = null;
    try {
      const timeoutPromise = new Promise<never>((_, rej) => {
        timer = setTimeout(() => rej(new Error(errorMessage)), ms);
      });
      return (await Promise.race([p, timeoutPromise])) as T;
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
  const { analysisResult, uploadedImage, isAnalyzing } = useAppSelector((state) => state.imageAnalysis);
  const { urgencyLevel } = useAppSelector((state) => state.appointment);

  // Local state for AI chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [hasLoadedFromDatabase, setHasLoadedFromDatabase] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [suggestedDoctor, setSuggestedDoctor] = useState<DoctorSuggestion | null>(null);
  const [showQuickSuggestions, setShowQuickSuggestions] = useState(true);
  const [availableDoctors, setAvailableDoctors] = useState<any[]>([]);
  const [doctorsLoaded, setDoctorsLoaded] = useState(false);
  const [showDoctorSuggestion, setShowDoctorSuggestion] = useState(true);

  // Video call state
  const [showIncomingCallModal, setShowIncomingCallModal] = useState(false);

  // Doctor chat state
  const [conversationMessages, setConversationMessages] = useState<
    Array<{
      role: string;
      content: string;
      timestamp: Date;
      messageType?: string;
      fileUrl?: string;
      fileName?: string;
      fileType?: string;
      fileSize?: number;
    }>
  >([]);
  const [Input, setInput] = useState("");
  const [isInputFocusedLoading, setIsInputFocusedLoading] = useState(false);
  const [isDoctorTyping, setIsDoctorTyping] = useState(false);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiContainerRef = useRef<HTMLDivElement | null>(null);
  const userMessagesEndRef = useRef<HTMLDivElement>(null);
  const doctorContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    // doctor chat pagination: only run for doctor/simple-doctor
    if (type !== "doctor" && type !== "simple-doctor") return;

    if (!preloadedMessages) {
      setConversationMessages([]);
      return;
    }

    if (preloadedMessages.length === 0) {
      let welcomeMessage: any;

      // Nếu người xem là bệnh nhân
      if (currentUserRole === "patient") {
        welcomeMessage = {
          _id: "welcome-msg-1",
          role: "doctor", // Tin nhắn từ bác sĩ, hiển thị bên trái
          content: `Chào bạn, tôi là ${doctorName || "Bác sĩ"}. Bạn cần giúp gì?`,
          timestamp: new Date(),
        };
      }
      // Nếu người xem là bác sĩ
      else if (currentUserRole === "doctor") {
        welcomeMessage = {
          _id: "welcome-msg-2",
          role: "patient", // Tin nhắn hệ thống, hiển thị bên trái
          content: `Bạn có cuộc trò chuyện mới, vui lòng đợi bệnh nhân ${patientName || ""} liên hệ!`,
          timestamp: new Date(),
        };
      }

      if (welcomeMessage) setConversationMessages([welcomeMessage]);
      else setConversationMessages([]);

      return;
    }

    // Transform and paginate preloadedMessages: show only last PAGE_SIZE initially
    const filtered = preloadedMessages.filter(isRenderableMessage);
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    doctorTotalPagesRef.current = pages;
    // load last page
    const start = Math.max(0, total - PAGE_SIZE);
    const lastSlice = filtered.slice(start, total);

    const transformedMessages = lastSlice.map((msg) => {
      const senderId = msg.senderId?._id || msg.senderId;
      const isMyMessage = senderId?.toString() === currentUserId?.toString();

      let finalRole = "";

      if (isMyMessage) {
        finalRole = "user"; // "user" sẽ luôn hiển thị bên phải
      } else {
        // Nếu không phải tin của tôi, thì role là của người gửi
        finalRole = msg.senderRole; // 'doctor' hoặc 'patient'
      }

      return {
        role: finalRole,
        content: msg.content || "",
        timestamp: new Date(msg.createdAt || msg.timestamp || Date.now()),
        messageType: msg.messageType || (msg.fileUrl ? "file" : "text"),
        fileUrl: msg.fileUrl,
        fileName: msg.fileName,
        fileType: msg.fileType,
        fileSize: msg.fileSize,
        callData: msg.callData,
      };
    });

    setConversationMessages(transformedMessages);
    setDoctorPagesLoaded(1);
    lastDoctorLengthRef.current = transformedMessages.length;

    // After rendering, jump to bottom immediately
    setTimeout(() => scrollMessagesToBottomInstant(doctorContainerRef.current), 0);
  }, [type, preloadedMessages, currentUserId, currentUserRole, conversationId]);

  // Video call: Show incoming call modal when there's an incoming call
  useEffect(() => {
    if (isCallIncoming && incomingCall) {
      setShowIncomingCallModal(true);
    } else {
      setShowIncomingCallModal(false);
    }
  }, [isCallIncoming, incomingCall]);

  // Auto scroll to bottom
  const scrollToBottomInstant = (container?: HTMLDivElement | null) => {
    // jump to bottom immediately (no animation)
    try {
      if (container) {
        container.scrollTop = container.scrollHeight;
        return;
      }
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    } catch (e) {
      // ignore
    }
  };

  const scrollMessagesToBottomInstant = (container?: HTMLDivElement | null) => {
    try {
      if (container) {
        container.scrollTop = container.scrollHeight;
        return;
      }
      userMessagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    } catch (e) {
      // ignore
    }
  };

  // Track pagination / load-more state
  // Unified page size because doctor and patient views share the same UI
  const PAGE_SIZE = 10;

  const aiTotalPagesRef = useRef<number>(1);
  const [aiPagesLoaded, setAiPagesLoaded] = useState<number>(0); // number of pages (from the end) loaded, 0 = none
  const [aiLoadingMore, setAiLoadingMore] = useState(false);
  const aiAllMessagesRef = useRef<any[] | null>(null);

  const doctorTotalPagesRef = useRef<number>(1);
  const [doctorPagesLoaded, setDoctorPagesLoaded] = useState<number>(0);
  const [doctorLoadingMore, setDoctorLoadingMore] = useState(false);

  // Keep previous lengths to decide when to scroll
  const lastAiLengthRef = useRef<number>(0);
  const lastDoctorLengthRef = useRef<number>(0);

  // Load previous AI page from aiAllMessagesRef and prepend to messages
  const loadPreviousAiPage = useCallback(() => {
    if (aiLoadingMore) return;
    const all = aiAllMessagesRef.current || [];
    const filtered = all.filter(isRenderableMessage);
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const loaded = aiPagesLoaded;
    if (loaded >= pages) return;

    setAiLoadingMore(true);
    const container = aiContainerRef.current;
    const prevScroll = container?.scrollHeight || 0;

    const endIndex = total - loaded * PAGE_SIZE;
    const startIndex = Math.max(0, endIndex - PAGE_SIZE);
    const slice = filtered.slice(startIndex, endIndex);
    const transformed: ChatMessage[] = slice.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
      timestamp: new Date(msg.createdAt || msg.timestamp || Date.now()),
      analysisData: msg.analysisData as import("@/types/chat").AnalysisData | undefined,
      isAnalysisResult: msg.messageType === "image_analysis" && !!msg.analysisData,
      actionButtons: msg.actionButtons,
      imageUrl: msg.imageUrl,
    }));

    setMessages((prev) => [...transformed, ...prev]);

    setTimeout(() => {
      const newScroll = container?.scrollHeight || 0;
      if (container) container.scrollTop = newScroll - prevScroll;
      setAiPagesLoaded((p) => p + 1);
      setAiLoadingMore(false);
    }, 1000);
  }, [aiPagesLoaded, aiLoadingMore]);

  // quiet unused state variable warnings by referencing doctorLoadingMore in a noop effect
  useEffect(() => {
    // noop to reference doctorLoadingMore
    if (doctorLoadingMore) {
      // nothing
    }
  }, [doctorLoadingMore]);

  // Load doctors from API
  const loadDoctors = async () => {
    try {
      const res = await sendRequest<any>({
        method: "GET",
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/users/doctors`,
      });
      const list = res?.data || res?.users || res || [];
      setAvailableDoctors(Array.isArray(list) ? list : []);
      setDoctorsLoaded(true);
    } catch (e) {
      // ignore doctor load errors
      setAvailableDoctors([]);
      setDoctorsLoaded(true);
    }
  };

  // Validate and set suggested doctor
  const validateAndSetSuggestedDoctor = (suggestedDoctor: DoctorSuggestion) => {
    if (!doctorsLoaded || availableDoctors.length === 0) {
      return false;
    }

    // Find matching doctor
    const matchingDoctor = availableDoctors.find((doctor) => {
      const doctorName = doctor.fullName || doctor.name || "";
      const suggestedName = suggestedDoctor.fullName || "";

      // Exact match
      if (doctorName === suggestedName) return true;

      // Case-insensitive match
      if (doctorName.toLowerCase() === suggestedName.toLowerCase()) return true;

      // Keyword match
      const keywords = suggestedName.split(" ").filter((word) => word.length > 1);
      return keywords.some((keyword) => doctorName.toLowerCase().includes(keyword.toLowerCase()));
    });

    if (matchingDoctor) {
      const validatedDoctor = {
        _id: matchingDoctor._id || matchingDoctor.id,
        fullName: matchingDoctor.fullName || matchingDoctor.name,
        specialty: matchingDoctor.specialty,
        keywords: suggestedDoctor.keywords || [],
        email: matchingDoctor.email,
        phone: matchingDoctor.phone,
      };

      setSuggestedDoctor(validatedDoctor);
      dispatch(setSelectedDoctor(validatedDoctor));

      // Persist suggestion to server session if available
      (async () => {
        try {
          if (currentSession?._id && updateSession) {
            await updateSession(currentSession._id, {
              suggestedDoctor: validatedDoctor as any,
              suggestedDoctorId: (validatedDoctor as any)._id,
            } as any);
          }
        } catch (err) {
          // ignore persistence errors
        }
      })();

      // Persist locally as a fallback
      try {
        localStorage.setItem("sd_suggestedDoctor", JSON.stringify(validatedDoctor));
      } catch {
        // ignore
      }

      return true;
    } else {
      return false;
    }
  };

  // Initialization: removed auto-scroll and debug logs; pagination handles scrolling explicitly

  // Create new session with welcome message
  const createNewSessionAndWelcome = useCallback(async () => {
    if (isCreatingSession) {
      return;
    }

    setIsCreatingSession(true);

    const welcomeMessage: ChatMessage = {
      role: "assistant",
      content:
        "Chào bạn! Tôi là trợ lý AI của Smart Dental Healthcare. Tôi có thể giúp bạn tư vấn sơ bộ về các vấn đề răng miệng. Hãy chia sẻ với tôi triệu chứng hoặc thắc mắc của bạn nhé!",
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);

    // Create new session if user is logged in
    if (session?.user) {
      await ensureSessionExists();
    }

    setIsCreatingSession(false);
  }, [session?.user, ensureSessionExists]);

  // Load AI chat history from database
  const loadAiChatHistory = useCallback(async () => {
    if (!session?.user || type !== "ai") return;

    setIsLoadingHistory(true);
    try {
      const userId =
        (session.user as { _id?: string; id?: string })?._id || (session.user as { _id?: string; id?: string })?.id;
      if (!userId) return;

      const sessionsResponse = await aiChatHistoryService.getUserSessions(userId, 1, 5);
      if (!sessionsResponse.sessions || sessionsResponse.sessions.length === 0) {
        await createNewSessionAndWelcome();
        setHasLoadedFromDatabase(true);
        return;
      }

      const activeSessions = sessionsResponse.sessions.filter((s) => s.status === "active");
      const latestSession = (activeSessions.length > 0 ? activeSessions[0] : sessionsResponse.sessions[0]) as any;
      setCurrentSession(latestSession);

      // Load all messages once and paginate locally
      const allMessages = await aiChatHistoryService.getSessionMessages(latestSession._id!, 1, 0);
      aiAllMessagesRef.current = allMessages || [];

      const filtered = (allMessages || []).filter(isRenderableMessage);
      const total = filtered.length;
      const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      aiTotalPagesRef.current = pages;

      if (total === 0) {
        const welcomeMessage: ChatMessage = {
          role: "assistant",
          content:
            "Chào bạn! Tôi là trợ lý AI của Smart Dental Healthcare. Tôi có thể giúp bạn tư vấn sơ bộ về các vấn đề răng miệng. Hãy chia sẻ với tôi triệu chứng hoặc thắc mắc của bạn nhé!",
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
        setHasLoadedFromDatabase(true);
        return;
      }

      const start = Math.max(0, total - PAGE_SIZE);
      const lastSlice = filtered.slice(start, total);
      const chatMessages: ChatMessage[] = lastSlice.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
        timestamp: new Date(msg.createdAt || Date.now()),
        analysisData: msg.analysisData as import("@/types/chat").AnalysisData | undefined,
        isAnalysisResult: msg.messageType === "image_analysis" && !!msg.analysisData,
        actionButtons: msg.actionButtons,
        imageUrl: msg.imageUrl,
      }));

      setMessages(chatMessages);
      setAiPagesLoaded(1);
      lastAiLengthRef.current = chatMessages.length;

      try {
        const sd = (latestSession as any).suggestedDoctor || (latestSession as any).suggestedDoctorId;
        if (sd) {
          if (typeof sd === "object" && sd.fullName) setSuggestedDoctor(sd as any);
          else if (typeof sd === "string" && availableDoctors.length > 0) {
            const match = availableDoctors.find((d) => d._id === sd || d.id === sd);
            if (match)
              setSuggestedDoctor({
                _id: match._id || match.id,
                fullName: match.fullName || match.name,
                specialty: match.specialty,
              } as any);
          }
        }
      } catch {
        // ignore
      }

      setHasLoadedFromDatabase(true);
      setTimeout(() => scrollToBottomInstant(aiContainerRef.current), 0);
    } catch (error) {
      await createNewSessionAndWelcome();
      setHasLoadedFromDatabase(true);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [session?.user, type, setCurrentSession, createNewSessionAndWelcome, availableDoctors]);

  useEffect(() => {
    loadDoctors();
  }, []);

  // Restore quick suggestion preference from localStorage
  useEffect(() => {
    try {
      const val = localStorage.getItem("sd_showQuickSuggestions");
      if (val !== null) setShowQuickSuggestions(val === "true");
    } catch (err) {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (type === "ai" && !hasLoadedFromDatabase && session?.user) {
      loadAiChatHistory();
    }
  }, [type, session?.user, hasLoadedFromDatabase, loadAiChatHistory]);

  // Persist quick suggestion preference when toggled
  useEffect(() => {
    try {
      localStorage.setItem("sd_showQuickSuggestions", showQuickSuggestions ? "true" : "false");
    } catch (e) {
      // ignore
    }
  }, [showQuickSuggestions]);

  // Message handlers
  const handleSendMessageAI = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      if (type === "ai") {
        // Đảm bảo có session (session đã được tạo khi user đăng nhập)
        if (!currentSession && session?.user) {
          await ensureSessionExists();
        }

        // Lưu tin nhắn user vào database
        if (currentSession && session?.user) {
          try {
            await saveMessage({
              role: "user",
              content: inputMessage,
              urgencyLevel: "medium", // Default value, will be updated after analysis
            });
          } catch {
            // ignore save errors
          }
        }

        // Analyze urgency
        const urgency = await aiChatAPI.analyzeUrgency(inputMessage);
        dispatch(setUrgencyLevel(urgency));

        // Get AI response
        const response = await aiChatAPI.getDentalAdvice(inputMessage, messages);

        const aiMessage: ChatMessage = {
          role: "assistant",
          content: response.message,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);

        // Lưu tin nhắn AI vào database
        if (currentSession && session?.user) {
          try {
            await saveMessage({
              role: "assistant",
              content: response.message,
              urgencyLevel: urgency,
            });
          } catch {
            // ignore save errors
          }
        }

        // Always set a suggested doctor for testing if none provided
        if (response.suggestedDoctor) {
          validateAndSetSuggestedDoctor(response.suggestedDoctor);
        } else {
          // No fallback doctor - let the UI handle the case of no suggested doctor
        }

        // Add urgent message if needed
        if (urgency === "high") {
          const urgentMessage: ChatMessage = {
            role: "assistant",
            content:
              "**KHẨN CẤP**\n\nTình trạng của bạn có thể cần được xử lý ngay lập tức. Vui lòng liên hệ phòng khám ngay hoặc đến cơ sở y tế gần nhất. Hotline: 0123-456-789",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, urgentMessage]);

          // Lưu tin nhắn khẩn cấp vào database
          if (currentSession && session?.user) {
            try {
              await saveMessage({
                role: "assistant",
                content: urgentMessage.content,
                urgencyLevel: "high",
              });
            } catch {
              // ignore save errors
            }
          }
        }
      } else {
        // Doctor chat simulation
        setTimeout(() => {
          const doctorMessage: ChatMessage = {
            role: "assistant",
            content: `${doctorName}: Cảm ơn bạn đã liên hệ. Tôi sẽ xem xét và phản hồi sớm nhất có thể.`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, doctorMessage]);
          setIsLoading(false);
        }, 1000);
        return;
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      // Clear any stuck image-analysis flag when sending messages
      try {
        dispatch(setIsAnalyzing(false));
      } catch {
        // ignore
      }
      setIsLoading(false);
    }
  };

  const handleQuickSuggestion = async (suggestion: string) => {
    if (suggestion.includes("Phân tích ảnh") || suggestion.includes("X-quang")) {
      handleImageUploadClick();
      return;
    }

    const cleanText = suggestion.replace(/^[^\w\s]+\s*/, "");
    const userMessage: ChatMessage = {
      role: "user",
      content: cleanText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      if (type === "ai") {
        // Đảm bảo có session (session đã được tạo khi user đăng nhập)
        if (!currentSession && session?.user) {
          await ensureSessionExists();
        }

        // Lưu tin nhắn user vào database
        if (currentSession && session?.user) {
          try {
            const urgency = await aiChatAPI.analyzeUrgency(cleanText);

            await saveMessage({
              role: "user",
              content: cleanText,
              urgencyLevel: urgency,
            });
          } catch {
            // ignore save errors
          }
        }

        const urgency = await aiChatAPI.analyzeUrgency(cleanText);
        dispatch(setUrgencyLevel(urgency));

        const response = await aiChatAPI.getDentalAdvice(cleanText, messages);

        const aiMessage: ChatMessage = {
          role: "assistant",
          content: response.message,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);

        // Lưu tin nhắn AI vào database
        if (currentSession && session?.user) {
          try {
            await saveMessage({
              role: "assistant",
              content: response.message,
              urgencyLevel: urgency,
            });
          } catch {
            // ignore save errors
          }
        }

        if (response.suggestedDoctor) {
          validateAndSetSuggestedDoctor(response.suggestedDoctor);
        } else {
          // No fallback doctor - let the UI handle the case of no suggested doctor
        }

        if (urgency === "high") {
          const urgentMessage: ChatMessage = {
            role: "assistant",
            content:
              "**KHẨN CẤP**\n\nTình trạng của bạn có thể cần được xử lý ngay lập tức. Vui lòng liên hệ phòng khám ngay hoặc đến cơ sở y tế gần nhất. Hotline: 0123-456-789",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, urgentMessage]);

          // Lưu tin nhắn khẩn cấp vào database
          if (currentSession && session?.user) {
            try {
              await saveMessage({
                role: "assistant",
                content: urgentMessage.content,
                urgencyLevel: "high",
              });
            } catch (err) {
              console.error("Failed to save quick suggestion urgent message:", err);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error with quick suggestion:", error);
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      // Ensure image-analysis flag is cleared if it was stuck
      try {
        dispatch(setIsAnalyzing(false));
      } catch (e) {
        // ignore
      }
      setIsLoading(false);
    }
  };

  // Image analysis
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file using upload service
    const validation = uploadService.validateImageFile(file);
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    // Đảm bảo có session (session đã được tạo khi user đăng nhập)
    if (!currentSession && session?.user) {
      await ensureSessionExists();
    }

    dispatch(setIsAnalyzing(true));
    setIsLoading(true);

    // Create temporary URL for immediate display
    const tempImageUrl = URL.createObjectURL(file);
    dispatch(setUploadedImage(tempImageUrl));

    const userMessage: ChatMessage = {
      role: "user",
      content: `Đang tải lên ảnh: ${file.name}`,
      timestamp: new Date(),
      imageUrl: tempImageUrl,
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      // Directly call server upload+analyze endpoint (server handles Cloudinary upload and analysis)
      let analysisResponse: any = null;
      try {
        // derive token from session safely (support various token fields)
        const extracted = extractUserData(session as any);
        const token = extracted?.token || (session as any)?.accessToken || (session as any)?.access_token || "";

        analysisResponse = await withTimeout(
          imageAnalysisAPI.uploadAndAnalyze(file, token),
          ANALYSIS_TIMEOUT_MS,
          "Analysis timed out"
        );
      } catch (err) {
        toast.error("Phân tích ảnh thất bại hoặc quá thời gian. Vui lòng thử lại.");
        throw err;
      }

      if (!analysisResponse.success || !analysisResponse.data) {
        throw new Error(analysisResponse.error || "Lỗi phân tích ảnh");
      }

      // If server uploaded to Cloudinary, update the temp message image URL
      const cloudUrl = analysisResponse.data?.cloudinaryUrl || analysisResponse.data?.imageUrl || null;
      if (cloudUrl) {
        setMessages((prev) =>
          prev.map((msg, index) => (index === prev.length - 1 ? { ...msg, imageUrl: cloudUrl } : msg))
        );
      }

      // Lưu tin nhắn upload ảnh vào database với Cloudinary URL nếu có
      if (currentSession && session?.user) {
        try {
          await saveMessage({
            role: "user",
            content: `Tải lên ảnh để phân tích: ${file.name}`,
            urgencyLevel: "medium",
            messageType: "image_upload",
            imageUrl: cloudUrl || undefined,
          });
        } catch (err) {
          console.error("Failed to save image upload message:", err);
        }
      }

      if (!analysisResponse.success || !analysisResponse.data) {
        throw new Error(analysisResponse.error || "Lỗi phân tích ảnh");
      }

      const result = analysisResponse.data;
      dispatch(setAnalysisResult(result));

      // Tạo message với format gọn hơn
      const aiMessage: ChatMessage = {
        role: "assistant",
        content: "", // Sẽ render custom content
        timestamp: new Date(),
        isAnalysisResult: true,
        analysisData: result,
        actionButtons:
          result.richContent &&
          (result.richContent.analysis || result.richContent.recommendations || result.richContent.sections)
            ? ["Giải thích thêm", "Đặt lịch khám", "Hướng dẫn chăm sóc", "Gợi ý bác sĩ", "Kết thúc"]
            : undefined,
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Lưu kết quả phân tích ảnh vào database
      if (currentSession && session?.user) {
        try {
          await saveMessage({
            role: "assistant",
            content: result.richContent?.analysis || result.analysis || "Kết quả phân tích ảnh X-ray",
            urgencyLevel: result.urgencyLevel || "medium",
            messageType: "image_analysis",
            analysisData: result,
          });
        } catch (err) {
          console.error("Failed to save image analysis result:", err);
        }
      }

      // Always set a suggested doctor for image analysis
      if (result.suggestedDoctor) {
        validateAndSetSuggestedDoctor(result.suggestedDoctor);
      } else {
        // No fallback doctor - let the UI handle the case of no suggested doctor
      }
    } catch (error) {
      console.error("Error analyzing image:", error);

      // Xử lý lỗi Cloudinary cụ thể
      let errorContent = `❌ Lỗi phân tích ảnh: ${
        error instanceof Error ? error.message : "Lỗi không xác định"
      }. Vui lòng thử lại hoặc liên hệ bác sĩ trực tiếp.`;

      if (error instanceof Error) {
        if (
          error.message.includes("Cloudinary") ||
          error.message.includes("cấu hình") ||
          error.message.includes("lưu trữ")
        ) {
          errorContent = `❌ **Lỗi cấu hình dịch vụ lưu trữ ảnh**\n\nDịch vụ lưu trữ ảnh chưa được cấu hình đúng cách.\n\n**Cách khắc phục:**\n1. Tạo tài khoản Cloudinary tại cloudinary.com\n2. Lấy thông tin cấu hình từ Dashboard\n3. Cập nhật file .env trong thư mục server\n4. Restart server\n\n💡 Xem file CLOUDINARY_SETUP.md để biết chi tiết`;
        } else if (error.message.includes("kết nối") || error.message.includes("mạng")) {
          errorContent = `❌ **Lỗi kết nối mạng**\n\nKhông thể kết nối đến server. Vui lòng kiểm tra kết nối internet và thử lại.`;
        } else if (error.message.includes("file")) {
          errorContent = `❌ **Lỗi xử lý file ảnh**\n\nVui lòng thử lại với ảnh khác hoặc kiểm tra định dạng file.`;
        }
      }

      const errorMessage: ChatMessage = {
        role: "assistant",
        content: errorContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      dispatch(setIsAnalyzing(false));
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Navigation
  const navigateToAppointments = (doctor?: DoctorSuggestion, symptoms?: string) => {
    // Collect comprehensive notes from chat
    let comprehensiveNotes = "";

    // Add symptoms if provided
    if (symptoms) {
      comprehensiveNotes += `TRIỆU CHỨNG: ${symptoms}\n\n`;
    }

    // Add urgency level
    if (urgencyLevel && urgencyLevel !== "low") {
      comprehensiveNotes += `⚠️ MỨC ĐỘ KHẨN CẤP: ${urgencyLevel.toUpperCase()}\n\n`;
    }

    // Add analysis result if available
    if (analysisResult) {
      comprehensiveNotes += `KẾT QUẢ PHÂN TÍCH AI:\n${
        analysisResult.richContent?.analysis || analysisResult.analysis || "Đã phân tích hình ảnh X-ray"
      }\n\n`;
    }

    // Add chat history as context
    if (messages.length > 0) {
      comprehensiveNotes += `LỊCH SỬ CHAT:\n`;
      messages.forEach((msg, index) => {
        if (msg.role === "user") {
          comprehensiveNotes += `Bệnh nhân: ${msg.content}\n`;
        } else if (msg.role === "assistant") {
          comprehensiveNotes += `AI: ${msg.content}\n`;
        }
        if (index < messages.length - 1) comprehensiveNotes += "\n";
      });
    }

    // Store data in Redux
    const appointmentData = {
      doctorId: doctor?._id || "",
      doctorName: doctor?.fullName || "",
      specialty: doctor?.specialty || "",
      symptoms: symptoms || "",
      urgency: urgencyLevel,
      notes: comprehensiveNotes,
      hasImageAnalysis: !!analysisResult,
      // Thêm thông tin hình ảnh và phân tích
      uploadedImage: uploadedImage || undefined,
      analysisResult: analysisResult || null,
      imageUrl: uploadedImage || undefined,
    };

    dispatch(setAppointmentData(appointmentData));
    dispatch(setSymptoms(symptoms || ""));
    dispatch(setNotes(comprehensiveNotes));

    // Add chat messages to history
    const userMessages = messages.filter((msg) => msg.role === "user");
    userMessages.forEach((msg) => {
      dispatch(addChatMessage(msg.content));
    });

    // Navigate to appointments page
    router.push("/patient/appointments");
  };

  // Action handlers
  const handleAnalysisActionClick = async (action: string) => {
    if (action.toLowerCase().includes("kết thúc")) {
      const userMessage: ChatMessage = {
        role: "user",
        content: action,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      const goodbyeMessage: ChatMessage = {
        role: "assistant",
        content:
          "Cảm ơn bạn đã sử dụng dịch vụ tư vấn nha khoa! 🙏\n\nChúc bạn có răng miệng khỏe mạnh! 💊\n\nLịch sử chat sẽ được xóa sau 3 giây...",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, goodbyeMessage]);

      setTimeout(() => {
        setMessages([]);
        chatStorage.clearChat();
        dispatch(clearAnalysisResult());
        dispatch(clearAppointmentData());
        setShowQuickSuggestions(true);
        setSuggestedDoctor(null);
      }, 3000);

      return;
    }

    if (action.toLowerCase().includes("đặt lịch khám")) {
      const symptoms = messages
        .filter((msg) => msg.role === "user")
        .map((msg) => msg.content)
        .join("; ");

      navigateToAppointments(suggestedDoctor || undefined, symptoms);
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: action,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    setIsLoading(true);

    try {
      let promptMessage = "";

      const analysisContext = analysisResult?.richContent
        ? `Dựa trên kết quả phân tích ảnh nha khoa với chẩn đoán: "${analysisResult.richContent.analysis}". `
        : "";

      if (action.toLowerCase().includes("giải thích thêm")) {
        promptMessage = `${analysisContext}Tôi muốn hiểu rõ hơn về kết quả phân tích ảnh nha khoa. Hãy giải thích chi tiết về tình trạng răng miệng, nguyên nhân có thể, và mức độ nghiêm trọng.`;
      } else if (action.toLowerCase().includes("hướng dẫn chăm sóc")) {
        promptMessage = `${analysisContext}Tôi muốn được hướng dẫn cách chăm sóc răng miệng tại nhà để cải thiện tình trạng hiện tại. Hãy đưa ra lời khuyên cụ thể và thực tế.`;
      } else if (action.toLowerCase().includes("gợi ý bác sĩ")) {
        promptMessage = `${analysisContext}Tôi muốn được gợi ý bác sĩ nha khoa chuyên khoa phù hợp với tình trạng của mình. Hãy tư vấn loại chuyên khoa cần thiết và tiêu chí chọn bác sĩ.`;
      } else {
        promptMessage = action;
      }

      const aiResponse = await aiChatAPI.getDentalAdvice(promptMessage, messages);

      const aiMessage: ChatMessage = {
        role: "assistant",
        content: aiResponse.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      if (aiResponse.suggestedDoctor) {
        validateAndSetSuggestedDoctor(aiResponse.suggestedDoctor);
      }
    } catch (error) {
      console.error("Error with analysis action:", error);
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "Xin lỗi, đã có lỗi xảy ra khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // UI helpers
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessageAI();
    }
  };

  // File: components/chat/ChatInterface.tsx

  const handleUserSendMessage = async () => {
    // 1. Check if there is content to send or if it is already sending
    if ((!Input.trim() && !selectedFile) || isInputFocusedLoading) return;

    // Safety: if analysis flag was stuck, clear it when user actively sends a message
    try {
      dispatch(setIsAnalyzing(false));
    } catch {
      // ignore
    }

    setIsInputFocusedLoading(true);
    const originalInput = Input; // Save original message to restore on error

    // 2. Handle sending text messages (via Socket.IO)
    if (!selectedFile && Input.trim()) {
      try {
        if (!conversationId) {
          throw new Error("No conversation ID.");
        }

        // Optimistic UI update for the sender
        const tempMessage = {
          _id: `temp_${Date.now()}`,
          role: "user",
          content: Input.trim(),
          timestamp: new Date(),
          senderId: currentUserId,
          senderRole: currentUserRole,
        };
        setConversationMessages((prev) => [...prev, tempMessage as any]);
        setInput(""); // Clear input after creating temp message
        setIsInputFocusedLoading(false);

        // Send message via socket service
        await realtimeChatService.sendMessage(conversationId, originalInput.trim(), "text");

        // The server will emit a `newMessage` event to sync all clients.
        // The `handleNewMessage` function in the parent page will handle replacing the temp message.
      } catch (error) {
        console.error("Error sending text message:", error);
        alert("Failed to send message. Please try again.");
        // If error, restore input and remove temp message
        setInput(originalInput);
        setConversationMessages((prev) => prev.filter((msg) => !(msg as any)?._id?.toString?.().startsWith?.("temp_")));
      }
      return; // End function after sending text message
    }

    // 3. Handle sending files (via REST API)
    if (selectedFile) {
      try {
        const token = (session as any)?.accessToken;
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("conversationId", conversationId || "");
        formData.append("senderId", currentUserId || "");
        formData.append("senderRole", currentUserRole || "doctor");

        // If there is text content with the file
        if (Input.trim()) {
          formData.append("content", Input.trim());
        }

        const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/realtime-chat/upload-file`, {
          method: "POST",
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error(await uploadResponse.text());
        }

        // No need to update UI here. The server has received the file, saved the message,
        // and will automatically emit a 'newMessage' event to all clients.
        // The `handleNewMessage` function in the parent page will receive it and update the UI.

        // Clean up after successful send
        setSelectedFile(null);
        setUploadPreview(null);
        setInput("");
      } catch (error) {
        console.error("Error sending file:", error);
        alert("Failed to send file. Please try again.");
      } finally {
        setIsInputFocusedLoading(false);
        // Refocus the input after sending
        inputRef.current?.focus();
      }
    }
  };

  const handleDoctorKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleUserSendMessage();
    }
  };

  const formatTime = (date: Date) => formatTimestampLocalized(date);

  // Handle start conversation with doctor
  const handleStartConversationWithDoctor = (doctor: DoctorSuggestion) => {
    if (onStartConversation) {
      // Gọi callback để báo cho component cha xử lý
      onStartConversation(doctor);
    } else {
      console.error("onStartConversation prop is not provided to ChatInterface");
    }
  };

  const getButtonIcon = (buttonText: string) => {
    if (buttonText.includes("Giải thích")) return <Lightbulb className="w-4 h-4 mr-1" />;
    if (buttonText.includes("Đặt lịch")) return <Calendar className="w-4 h-4 mr-1" />;
    if (buttonText.includes("Hướng dẫn")) return <Wrench className="w-4 h-4 mr-1" />;
    if (buttonText.includes("Gợi ý bác sĩ")) return <Stethoscope className="w-4 h-4 mr-1" />;
    if (buttonText.includes("Kết thúc")) return <Check className="w-4 h-4 mr-1" />;
    return <Wrench className="w-4 h-4 mr-1" />;
  };

  const getUrgencyBadge = () => {
    const colors = {
      high: "bg-red-100 text-red-800 border-red-300",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
      low: "bg-green-100 text-green-800 border-green-300",
    };

    const labels = {
      high: "Khẩn cấp",
      medium: "Trung bình",
      low: "Bình thường",
    };

    return (
      <div
        className={`inline-flex items-center px-2 py-1 text-xs font-medium border rounded-full ${colors[urgencyLevel]}`}
      >
        {labels[urgencyLevel]}
      </div>
    );
  };

  const quickSuggestions = [
    "Sâu răng, ê buốt khi ăn đồ ngọt hoặc lạnh",
    "Răng mọc lệch, chen chúc, khớp cắn sai",
    "Răng ố vàng, xỉn màu, không đều đẹp",
    "Hàm hô, móm hoặc chấn thương vùng hàm mặt",
    "Chảy máu lợi khi chải răng",
    "Răng sữa sâu, trẻ đau răng hoặc sợ đi khám răng",
    "Phân tích ảnh X-quang/răng",
  ];

  // Render doctor suggestion section với nút toggle
  const renderDoctorSuggestion = () => {
    if (type !== "ai") return null;

    // No doctors available
    if (doctorsLoaded && availableDoctors.length === 0) {
      return (
        <div className="border-t border-gray-200 bg-yellow-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-yellow-900">⚠️ Thông báo</h4>
              <button
                onClick={() => setShowDoctorSuggestion(!showDoctorSuggestion)}
                className="text-yellow-600 hover:text-yellow-800 text-sm"
              >
                {showDoctorSuggestion ? "Ẩn" : "Hiện"}
              </button>
            </div>
            {showDoctorSuggestion && (
              <div className={`max-w-xs p-2 rounded-lg bg-gray-100 text-gray-800`}>
                <button className="text-sm bg-yellow-500 text-white px-3 py-2 rounded hover:bg-yellow-600">
                  Liên hệ phòng khám
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Valid doctor suggestion với avatar
    if (suggestedDoctor) {
      const getAvatarColor = (name: string) => {
        const colors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-red-500", "bg-yellow-500", "bg-indigo-500"];
        const index = name.charCodeAt(0) % colors.length;
        return colors[index];
      };

      const getInitials = (name: string) => {
        return name
          .split(" ")
          .map((word) => word.charAt(0))
          .join("")
          .slice(0, 2)
          .toUpperCase();
      };

      return (
        <div
          className="border-t border-x rounded-tl-md rounded-tr-md border-gray-200"
          style={{ background: "var(--color-primary-outline)" }}
        >
          <div className="px-4 py-2">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-medium" style={{ color: "var(--color-primary-600)" }}>
                Bác sĩ được đề xuất
              </h4>
              <button
                onClick={() => setShowDoctorSuggestion(!showDoctorSuggestion)}
                className="text-sm font-medium text-primary"
              >
                {showDoctorSuggestion ? "Ẩn" : "Hiện"}
              </button>
            </div>
            {showDoctorSuggestion && (
              <div className="flex items-start space-x-3">
                {/* Doctor Avatar */}
                <div
                  className={`w-10 h-10 ${getAvatarColor(
                    suggestedDoctor.fullName
                  )} rounded-full flex items-center justify-center flex-shrink-0`}
                >
                  <span className="text-white font-medium text-sm">{getInitials(suggestedDoctor.fullName)}</span>
                </div>

                {/* Doctor Info */}
                <div className="flex-1">
                  <h5 className="font-semibold" style={{ color: "var(--color-primary-600)" }}>
                    {suggestedDoctor.fullName}
                  </h5>
                  <p className="text-sm mb-3" style={{ color: "var(--color-primary-contrast)" }}>
                    {suggestedDoctor.specialty}
                  </p>

                  {/* Action Buttons - No Icons */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="text-sm px-2 py-1 rounded-md transition-colors"
                      style={{ background: "var(--color-primary)", color: "white" }}
                      onClick={() => handleStartConversationWithDoctor(suggestedDoctor)}
                    >
                      Nhắn tin
                    </button>
                    <button
                      className="text-sm px-2 py-1 rounded-md transition-colors"
                      style={{ background: "var(--color-primary)", color: "white" }}
                      onClick={() => {
                        // Navigate to patient-facing doctor profile
                        const id = (suggestedDoctor as any)?._id;
                        if (id) router.push(`/patient/doctors/${id}`);
                      }}
                    >
                      Hồ sơ
                    </button>
                    <button
                      className="text-sm px-2 py-1 rounded-md transition-colors"
                      style={{ background: "var(--color-primary)", color: "white" }}
                      onClick={() => {
                        const symptoms = messages
                          .filter((msg) => msg.role === "user")
                          .map((msg) => msg.content)
                          .join("; ");
                        navigateToAppointments(suggestedDoctor || undefined, symptoms);
                      }}
                    >
                      Đặt lịch khám
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  // File upload handling functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert("Kích thước file không được vượt quá 10MB");
      return;
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/avi",
      "video/mov",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "text/csv",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Định dạng file không được hỗ trợ");
      return;
    }

    setSelectedFile(file);

    // Create preview for images and videos
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setUploadPreview(null);
    }
  };

  const cancelFileUpload = () => {
    setSelectedFile(null);
    setUploadPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full max-h-full">
      {/* Show different UI based on type */}
      {type === "ai" ? (
        // AI Chat Interface
        <>
          {/* Messages - Scrollable Area */}
          <div
            ref={(el) => {
              aiContainerRef.current = el;
            }}
            onScroll={(e) => {
              const el = e.currentTarget;
              if (el.scrollTop === 0 && aiPagesLoaded < aiTotalPagesRef.current) {
                // load previous page if available
                loadPreviousAiPage();
              }
            }}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 min-h-0"
          >
            {aiLoadingMore && (
              <div className="flex justify-center py-2">
                <div
                  className="animate-spin rounded-full h-6 w-6"
                  style={{ borderTop: "2px solid var(--color-primary-600)", border: "2px solid rgba(0,0,0,0.05)" }}
                />
              </div>
            )}
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-lg ${
                    message.role === "user"
                      ? "msg-outgoing"
                      : message.actionButtons && message.actionButtons.length > 0
                      ? "bg-white text-gray-900 border border-gray-200 shadow-lg"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {/* Show image if available */}
                  {message.imageUrl && (
                    <div className="mb-3">
                      <Image
                        src={message.imageUrl}
                        alt="Uploaded image"
                        width={200}
                        height={200}
                        className="max-w-full h-auto rounded-lg border object-cover"
                        style={{ maxHeight: "200px" }}
                      />
                    </div>
                  )}

                  {/* Render analysis result */}
                  {message.isAnalysisResult && message.analysisData ? (
                    <div className="space-y-2">
                      {/* Header */}
                      <div
                        className="flex items-center justify-center p-2 rounded-lg"
                        style={{ background: "linear-gradient(90deg,var(--color-primary-outline), #f0fbff)" }}
                      >
                        <span className="font-bold text-base" style={{ color: "var(--color-primary-contrast)" }}>
                          <Search className="inline w-4 h-4 mr-2" /> Kết quả phân tích ảnh
                        </span>
                      </div>

                      {/* Chẩn đoán */}
                      {message.analysisData.richContent?.analysis && (
                        <div
                          className="p-2 rounded-lg"
                          style={{
                            background: "var(--color-primary-outline)",
                            borderLeft: "4px solid var(--color-primary-600)",
                          }}
                        >
                          <div
                            className="text-sm font-semibold mb-1 flex items-center"
                            style={{ color: "var(--color-primary-600)" }}
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            CHẨN ĐOÁN
                          </div>
                          <p className="leading-normal text-sm" style={{ color: "var(--color-primary-contrast)" }}>
                            {message.analysisData.richContent.analysis}
                          </p>
                        </div>
                      )}

                      {/* Chi tiết */}
                      {message.analysisData.richContent?.sections &&
                        message.analysisData.richContent.sections.length > 0 && (
                          <div className="p-2 bg-gray-50 rounded-lg border-l-4 border-gray-500">
                            <div className="text-sm font-semibold text-gray-700 mb-1 flex items-center">
                              <BarChart2 className="w-4 h-4 mr-1" />
                              CHI TIẾT PHÂN TÍCH
                            </div>
                            <div className="space-y-1">
                              {message.analysisData.richContent.sections.map((section: any, index: number) => (
                                <div key={index} className="bg-white rounded-md p-2 border border-gray-200">
                                  {section.heading && (
                                    <div className="font-semibold text-gray-800 mb-1 text-sm">
                                      {index + 1}. {section.heading}
                                    </div>
                                  )}
                                  {section.text && (
                                    <div className="text-gray-700 mb-1 leading-normal text-sm">{section.text}</div>
                                  )}
                                  {section.bullets && section.bullets.length > 0 && (
                                    <ul className="space-y-0">
                                      {section.bullets.map((bullet: string, bulletIndex: number) => (
                                        <li key={bulletIndex} className="text-gray-700 flex items-start text-sm">
                                          <span className="mr-1 mt-0" style={{ color: "var(--color-primary)" }}>
                                            •
                                          </span>
                                          <span>{bullet}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Khuyến nghị */}
                      {message.analysisData.richContent?.recommendations && (
                        <div className="p-2 bg-green-50 rounded-lg border-l-4 border-green-500">
                          <div className="text-sm font-semibold text-green-700 mb-1 flex items-center">
                            <Lightbulb className="w-4 h-4 mr-1" />
                            KHUYẾN NGHỊ
                          </div>
                          <div className="space-y-0">
                            {message.analysisData.richContent.recommendations.map((rec: string, index: number) => (
                              <div key={index} className="text-green-800 flex items-start">
                                <span className="text-green-600 mr-2 mt-0 font-bold">•</span>
                                <span className="text-sm leading-normal">{rec}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action prompt */}
                      <div className="text-center p-2 bg-orange-50 rounded-lg border border-orange-200">
                        <p className="text-orange-700 font-medium flex items-center justify-center text-sm">
                          <Wrench className="w-4 h-4 mr-1" />
                          Sử dụng các nút bên dưới để tương tác
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Regular AI message content */
                    <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
                  )}

                  {/* Show action buttons if available */}
                  {message.actionButtons && message.actionButtons.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {message.actionButtons.map((buttonText, buttonIndex) => (
                        <button
                          key={buttonIndex}
                          onClick={() => handleAnalysisActionClick(buttonText)}
                          className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center shadow-sm hover:shadow-md transform hover:scale-105"
                          style={{ background: "var(--color-primary)", color: "white" }}
                        >
                          <span className="mr-1">{getButtonIcon(buttonText)}</span>
                          {buttonText}
                        </button>
                      ))}
                    </div>
                  )}

                  <div
                    className={`text-xs mt-2 ${message.role === "user" ? "text-white" : "text-gray-500"}`}
                    style={message.role === "user" ? { color: "rgba(255,255,255,0.9)" } : undefined}
                  >
                    {formatTimestampLocalized(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-2 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">
                      {isAnalyzing ? "Đang phân tích ảnh..." : "Đang soạn tin nhắn..."}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Suggestions */}
            {showQuickSuggestions && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {quickSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickSuggestion(suggestion)}
                      className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clear Chat Button */}
            {messages.length > 1 && (
              <div className="text-center">
                <button
                  onClick={() => {
                    if (confirm("Bạn có chắc muốn xóa toàn bộ lịch sử chat?")) {
                      setMessages([]);
                      chatStorage.clearChat();
                      setShowQuickSuggestions(true);
                      setSuggestedDoctor(null);
                      dispatch(clearAnalysisResult());
                      dispatch(clearAppointmentData());
                    }
                  }}
                  className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm transition-colors"
                >
                  🗑️ Xóa lịch sử chat
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Doctor Suggestion Section */}
          {renderDoctorSuggestion()}

          {/* Input */}
          <div className="p-2 border-t border-gray-200 bg-white flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Mô tả triệu chứng của bạn..."
                  className="w-full p-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  disabled={isLoading}
                />
              </div>
              <div className="flex flex-col space-y-1">
                <button
                  onClick={handleSendMessageAI}
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-4 py-2 rounded-lg text-sm"
                  style={{ background: "var(--color-primary)", color: "white" }}
                >
                  ➤
                </button>
                <button
                  onClick={handleImageUploadClick}
                  disabled={isLoading || isAnalyzing}
                  className="px-4 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-xs"
                >
                  📎 File
                </button>
              </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
          </div>
        </>
      ) : (
        // Doctor Chat Interface - Simple input for conversations from AI suggestions
        <>
          {/* Messages - Scrollable Area */}
          <div
            ref={(el) => {
              aiContainerRef.current = el;
            }}
            onScroll={(e) => {
              const el = e.currentTarget;
              if (el.scrollTop === 0 && doctorPagesLoaded > 0) {
                const filtered = (preloadedMessages || []).filter(isRenderableMessage);
                const total = filtered.length;
                const loaded = doctorPagesLoaded;
                const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
                if (loaded < pages) {
                  // show loading spinner at top
                  setDoctorLoadingMore(true);

                  // compute slice and prepend
                  const endIndex = total - loaded * PAGE_SIZE;
                  const startIndex = Math.max(0, endIndex - PAGE_SIZE);
                  const slice = filtered.slice(startIndex, endIndex);
                  const transformed = slice.map((msg) => ({
                    role: (msg.senderId?._id || msg.senderId)?.toString() === currentUserId ? "user" : msg.senderRole,
                    content: msg.content || "",
                    timestamp: new Date(msg.createdAt || msg.timestamp || Date.now()),
                    messageType: msg.messageType || (msg.fileUrl ? "file" : "text"),
                    fileUrl: msg.fileUrl,
                    fileName: msg.fileName,
                    fileType: msg.fileType,
                    fileSize: msg.fileSize,
                    callData: msg.callData,
                  }));
                  const prevScroll = doctorContainerRef.current?.scrollHeight || 0;
                  setConversationMessages((prev) => [...transformed, ...prev]);
                  setDoctorPagesLoaded((p) => p + 1);
                  setTimeout(() => {
                    const now = doctorContainerRef.current;
                    if (now) now.scrollTop = now.scrollHeight - prevScroll;
                    setDoctorLoadingMore(false);
                  }, 2000);
                }
              }
            }}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 min-h-0"
          >
            {isLoadingMessages ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-center">
                  <div
                    className="animate-spin rounded-full h-8 w-8 mx-auto mb-2"
                    style={{ borderBottom: "2px solid var(--color-primary-600)", border: "2px solid rgba(0,0,0,0.05)" }}
                  ></div>
                  <p className="text-gray-500 text-sm">Đang tải lịch sử chat...</p>
                </div>
              </div>
            ) : (
              <>
                {doctorLoadingMore && (
                  <div className="flex justify-center py-2">
                    <div
                      className="animate-spin rounded-full h-6 w-6"
                      style={{ borderTop: "2px solid var(--color-primary-600)", border: "2px solid rgba(0,0,0,0.05)" }}
                    />
                  </div>
                )}

                {conversationMessages.map((message, index) => {
                  // Render CALL message card
                  if ((message as any).messageType === "call") {
                    const callData = (message as any).callData || {};
                    // const senderId = (message as any).senderId?._id || (message as any).senderId;
                    const isMyMessage = message.role === "user";

                    return (
                      <CallMessage
                        key={`call-${index}`}
                        callData={{
                          callType: callData.callType || "audio",
                          callStatus: callData.callStatus || "completed",
                          callDuration: callData.callDuration || 0,
                          startedAt:
                            callData.startedAt ||
                            (message.timestamp instanceof Date
                              ? message.timestamp.toISOString()
                              : String(message.timestamp)),
                          endedAt: callData.endedAt,
                        }}
                        isOutgoing={isMyMessage}
                        timestamp={
                          message.timestamp instanceof Date
                            ? message.timestamp.toISOString()
                            : String(message.timestamp)
                        }
                        className="mb-3"
                      />
                    );
                  }

                  return (
                    <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-lg ${
                          message.role === "user" ? "text-white" : "bg-gray-100 text-gray-900"
                        }`}
                        style={
                          message.role === "user" ? { background: "var(--color-primary)", color: "white" } : undefined
                        }
                      >
                        {/* Render file attachment */}
                        {(() => {
                          const hasFile =
                            (message as any).messageType &&
                            (message as any).messageType !== "text" &&
                            (message as any).fileUrl;
                          if (hasFile) {
                            return (
                              <div className="mb-2">
                                {(message as any).messageType === "image" ? (
                                  <img
                                    src={(message as any).fileUrl}
                                    alt={(message as any).fileName || "Image"}
                                    className="max-w-full h-auto rounded border object-cover"
                                    style={{ maxHeight: "200px", maxWidth: "200px" }}
                                  />
                                ) : (message as any).messageType === "video" ? (
                                  <video
                                    src={(message as any).fileUrl}
                                    controls
                                    className="max-w-full h-auto rounded border"
                                    style={{ maxHeight: "200px" }}
                                  />
                                ) : (
                                  <div className="flex items-center space-x-2 p-2 bg-white bg-opacity-20 rounded border">
                                    <div className="text-lg">📄</div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-gray-900 font-medium truncate">
                                        {(message as any).fileName || "File attachment"}
                                      </p>
                                    </div>
                                    <a
                                      href={(message as any).fileUrl}
                                      rel="noopener noreferrer"
                                      download={(message as any).fileName}
                                      className="text-xs underline opacity-80 hover:opacity-100 text-primary"
                                    >
                                      Tải về
                                    </a>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {/* Render text content */}
                        {message.content && <p className="text-sm leading-normal">{message.content}</p>}

                        <div className="text-xs opacity-70 mt-1">{formatTime(message.timestamp)}</div>
                      </div>
                    </div>
                  );
                })}
                {isDoctorTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 px-4 py-3 rounded-lg">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={userMessagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t bg-white p-4">
            {/* File preview area */}
            {selectedFile && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {uploadPreview ? (
                      selectedFile.type.startsWith("image/") ? (
                        <img src={uploadPreview} alt="Preview" className="w-12 h-12 object-cover rounded" />
                      ) : selectedFile.type.startsWith("video/") ? (
                        <video src={uploadPreview} className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <div
                          className="w-12 h-12 rounded flex items-center justify-center"
                          style={{ background: "var(--color-primary-outline)", color: "var(--color-primary-600)" }}
                        >
                          📄
                        </div>
                      )
                    ) : (
                      <div
                        className="w-12 h-12 rounded flex items-center justify-center"
                        style={{ background: "var(--color-primary-outline)" }}
                      >
                        📄
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    onClick={cancelFileUpload}
                    className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={Input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleDoctorKeyPress}
                onFocus={() => {
                  if (onInputFocus) {
                    onInputFocus();
                  }
                }}
                onBlur={() => {
                  if (onInputFocus) {
                    onInputFocus();
                  }
                }}
                placeholder={
                  currentUserRole === "doctor" ? "Nhập tin nhắn cho bệnh nhân..." : "Nhập tin nhắn cho bác sĩ..."
                }
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isInputFocusedLoading}
              />

              {/* File upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Đính kèm file"
              >
                📎
              </button>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                onClick={handleUserSendMessage}
                disabled={isInputFocusedLoading || (!Input.trim() && !selectedFile)}
                className="px-6 py-2 rounded-lg focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "var(--color-primary)", color: "white", outlineColor: "var(--color-primary-600)" }}
              >
                {isInputFocusedLoading ? "..." : "Gửi"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Video Call Components */}
      {isInCall && <VideoCallInterface />}

      <IncomingCallModal />
    </div>
  );
}
