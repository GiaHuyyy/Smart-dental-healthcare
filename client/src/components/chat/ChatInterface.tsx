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
import { useAiChatHistory } from "@/hooks/useAiChatHistory";
import { aiChatHistoryService } from "@/utils/aiChatHistory";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRealtimeChat } from "@/contexts/RealtimeChatContext";
import { useSession } from "next-auth/react";

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
}

export default function ChatInterface({
  type,
  doctorName,
  doctorId,
  conversationId,
  currentUserId,
  currentUserRole,
  authToken,
  doctorsList = [],
  patientsList = [],
  preloadedMessages = [],
  isLoadingMessages = false,
  onNewMessage,
}: ChatInterfaceProps) {
  // Session and user data
  const { data: session } = useSession();

  // AI Chat History hook
  const {
    currentSession,
    createSession,
    addMessage: saveMessage,
    completeSession,
    updateSession,
    setCurrentSession,
  } = useAiChatHistory();

  // Redux hooks
  const dispatch = useAppDispatch();
  const { analysisResult, uploadedImage, isAnalyzing } = useAppSelector((state) => state.imageAnalysis);
  const { urgencyLevel } = useAppSelector((state) => state.appointment);

  // Realtime chat context
  const {
    isConnected,
    conversations,
    activeConversation,
    messages: realtimeMessages,
    isTyping: isRealtimeTyping,
    connectToChat,
    disconnectFromChat,
    startConversation,
    selectConversation,
    sendMessage: sendRealtimeMessage,
    markMessageAsRead,
    setTypingStatus,
  } = useRealtimeChat();

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

  // Realtime chat UI state
  const [showConversationList, setShowConversationList] = useState(false);
  const [showChatWindow, setShowChatWindow] = useState(false);

  // Doctor chat state
  const [doctorMessages, setDoctorMessages] = useState<Array<{ role: string; content: string; timestamp: Date }>>([]);
  const [doctorInput, setDoctorInput] = useState("");
  const [isDoctorLoading, setIsDoctorLoading] = useState(false);
  const [isDoctorTyping, setIsDoctorTyping] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const doctorMessagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Initialize realtime chat connection
  useEffect(() => {
    if (type === "doctor" && session?.user && authToken) {
      const currentUser = {
        _id: (session.user as any)?._id || (session.user as any)?.id || currentUserId || "",
        firstName: (session.user as any)?.firstName || "",
        lastName: (session.user as any)?.lastName || "",
        email: session.user.email || "",
        role: currentUserRole || ("doctor" as "patient" | "doctor"),
        specialization: (session.user as any)?.specialization || "",
      };
      connectToChat(authToken, currentUser);
    }

    return () => {
      if (type === "doctor") {
        disconnectFromChat();
      }
    };
  }, [type, session, authToken, currentUserId, currentUserRole, connectToChat, disconnectFromChat]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollDoctorMessagesToBottom = () => {
    doctorMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto scroll when messages change
  useEffect(() => {
    if (type === "ai") {
      scrollToBottom();
    } else if (type === "doctor") {
      scrollDoctorMessagesToBottom();
    }
  }, [messages, doctorMessages, type]);

  // Initialize doctor conversation
  useEffect(() => {
    if (type === "doctor" && doctorName) {
      // Load preloaded messages from database
      if (preloadedMessages && preloadedMessages.length > 0) {
        const transformedMessages = preloadedMessages.map((msg: any) => {
          // Handle populated senderId (object) vs direct senderId (string)
          const senderIdValue =
            typeof msg.senderId === "object" ? msg.senderId._id || msg.senderId.id || msg.senderId : msg.senderId;
          const senderIdString = senderIdValue.toString();
          const currentUserIdString = currentUserId?.toString();
          const isCurrentUserById = senderIdString === currentUserIdString;

          // Also check by senderRole for additional validation
          const isCurrentUserByRole = msg.senderRole === "patient";
          const isCurrentUser = isCurrentUserById || isCurrentUserByRole;

          console.log(`Message comparison:
            senderId=${senderIdString},
            currentUserId=${currentUserIdString},
            isCurrentUserById=${isCurrentUserById},
            senderRole=${msg.senderRole},
            isCurrentUserByRole=${isCurrentUserByRole},
            finalIsCurrentUser=${isCurrentUser}`);

          return {
            role: isCurrentUser ? "user" : "doctor",
            content: msg.content,
            timestamp: new Date(msg.createdAt || msg.timestamp),
          };
        });

        setDoctorMessages(transformedMessages);
        console.log("Loaded preloaded messages:", transformedMessages);
        console.log("Current user ID:", currentUserId);
        console.log(
          "Message senders:",
          preloadedMessages.map((msg: any) => ({
            senderId:
              typeof msg.senderId === "object" ? msg.senderId._id || msg.senderId.id || msg.senderId : msg.senderId,
            content: msg.content,
            senderRole: msg.senderRole,
            isCurrentUser:
              (typeof msg.senderId === "object"
                ? msg.senderId._id || msg.senderId.id || msg.senderId
                : msg.senderId
              ).toString() === currentUserId?.toString(),
          }))
        );
      } else if (doctorMessages.length === 0) {
        // Add welcome message if no messages yet
        const welcomeMessage = {
          role: "doctor",
          content: `Xin chào! Tôi là ${doctorName}. Tôi có thể giúp gì cho bạn hôm nay?`,
          timestamp: new Date(),
        };
        setDoctorMessages([welcomeMessage]);
      }
    }
  }, [type, doctorName, preloadedMessages, currentUserId]);

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
      console.log("Loaded doctors from API:", list);
    } catch (e) {
      console.log("Error loading doctors from API:", e);
      setAvailableDoctors([]);
      setDoctorsLoaded(true);
    }
  };

  // Validate and set suggested doctor
  const validateAndSetSuggestedDoctor = (suggestedDoctor: DoctorSuggestion) => {
    if (!doctorsLoaded || availableDoctors.length === 0) {
      console.log("No doctors available, cannot validate suggestion");
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
      console.log("Validated and set doctor:", validatedDoctor.fullName);
      return true;
    } else {
      console.log("Suggested doctor not found in available doctors:", suggestedDoctor.fullName);
      return false;
    }
  };

  // Initialize component
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Create new session with welcome message
  const createNewSessionAndWelcome = useCallback(async () => {
    if (isCreatingSession) {
      console.log("Đang tạo session, bỏ qua request duplicate");
      return;
    }

    console.log("Bắt đầu tạo session mới...");
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
      try {
        const newSession = await createSession("", "low");
        console.log("✅ Created new AI chat session:", newSession);
      } catch (err) {
        console.error("❌ Failed to create AI chat session:", err);
      }
    }

    setIsCreatingSession(false);
  }, [session?.user, createSession, isCreatingSession]);

  // Load AI chat history from database
  const loadAiChatHistory = useCallback(async () => {
    console.log("=== Lịch sử chat AI ===");
    console.log("Session user:", session?.user);
    console.log("Type:", type);

    if (!session?.user || type !== "ai") {
      console.log("Không load chat AI - user hoặc type không hợp lệ");
      return;
    }

    console.log("Bắt đầu load lịch sử chat AI từ database...");
    setIsLoadingHistory(true);
    try {
      // Get user's most recent active session
      const userId =
        (session.user as { _id?: string; id?: string })?._id || (session.user as { _id?: string; id?: string })?.id;

      console.log("User ID:", userId);
      if (!userId) {
        console.log("Không có user ID");
        return;
      }

      console.log("Đang tìm session gần nhất...");
      const sessionsResponse = await aiChatHistoryService.getUserSessions(userId, 1, 5); // Get up to 5 recent sessions
      console.log("Sessions response:", sessionsResponse);

      if (sessionsResponse.sessions.length > 0) {
        // Check for active sessions from today
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today

        const todaySessions = sessionsResponse.sessions.filter((session) => {
          const sessionDate = new Date(session.createdAt!);
          return sessionDate >= today && session.status === "active";
        });

        console.log("Sessions từ hôm nay:", todaySessions);

        if (todaySessions.length > 0) {
          // Use the most recent session from today
          const latestSession = todaySessions[0];
          console.log("Sử dụng session từ hôm nay:", latestSession);

          // Load messages from this session
          const messages = await aiChatHistoryService.getSessionMessages(latestSession._id!);
          console.log("Messages từ database:", messages);

          if (messages.length > 0) {
            // Convert database messages to ChatMessage format
            const chatMessages: ChatMessage[] = messages.map((msg) => ({
              role: msg.role as "user" | "assistant",
              content: msg.content,
              timestamp: new Date(msg.createdAt!),
              analysisData: msg.analysisData,
              isAnalysisResult: msg.messageType === "image_analysis" && !!msg.analysisData,
              actionButtons: msg.actionButtons,
              imageUrl: msg.imageUrl,
            }));

            console.log("Converted chat messages:", chatMessages);
            console.log(
              "Messages có analysis data:",
              chatMessages.filter((m) => m.analysisData && Object.keys(m.analysisData).length > 0)
            );

            setMessages(chatMessages);
            setCurrentSession(latestSession);
            setHasLoadedFromDatabase(true);
            console.log(`✅ Đã load ${chatMessages.length} tin nhắn từ database session ${latestSession._id}`);
            return;
          } else {
            console.log("Session hôm nay không có messages, sử dụng session này cho chat mới");
            setCurrentSession(latestSession);
            setHasLoadedFromDatabase(true);

            // Just set welcome message without creating new session
            const welcomeMessage: ChatMessage = {
              role: "assistant",
              content:
                "Chào bạn! Tôi là trợ lý AI của Smart Dental Healthcare. Tôi có thể giúp bạn tư vấn sơ bộ về các vấn đề răng miệng. Hãy chia sẻ với tôi triệu chứng hoặc thắc mắc của bạn nhé!",
              timestamp: new Date(),
            };
            setMessages([welcomeMessage]);
            return;
          }
        }
      }

      // No recent session found, create new session and welcome message
      console.log("Tạo session mới với welcome message...");
      await createNewSessionAndWelcome();
      setHasLoadedFromDatabase(true);
    } catch (error) {
      console.error("Error loading AI chat history:", error);
      // Fallback to creating new session
      await createNewSessionAndWelcome();
      setHasLoadedFromDatabase(true);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [session?.user, type, setCurrentSession, createNewSessionAndWelcome]);

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    console.log("useEffect - Check load AI chat:", {
      type,
      messagesLength: messages.length,
      hasUser: !!session?.user,
      hasLoadedFromDatabase,
      userName: (session?.user as any)?.firstName || (session?.user as any)?.fullName || "Unknown",
    });

    if (type === "ai" && !hasLoadedFromDatabase && session?.user) {
      console.log("Điều kiện đủ để load AI chat history");
      loadAiChatHistory();
    } else {
      console.log("Không load AI chat history - điều kiện không đủ");
    }
  }, [type, session?.user, hasLoadedFromDatabase, loadAiChatHistory]);

  // Remove localStorage saving since we're using database now
  // useEffect(() => {
  //   if (type === "ai" && messages.length > 1) {
  //     chatStorage.saveChat(messages);
  //     console.log(`Saved ${messages.length} messages to storage`);
  //   }
  // }, [messages, type]);

  // Message handlers
  const handleSendMessage = async () => {
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
        // Tạo session mới nếu chưa có
        if (!currentSession && session?.user) {
          try {
            await createSession("", "low");
            console.log("Created new AI chat session");
          } catch (err) {
            console.error("Failed to create AI chat session:", err);
          }
        }

        // Lưu tin nhắn user vào database
        if (currentSession && session?.user) {
          try {
            await saveMessage({
              role: "user",
              content: inputMessage,
              urgencyLevel: "medium", // Default value, will be updated after analysis
            });
            console.log("Saved user message to database");
          } catch (err) {
            console.error("Failed to save user message to database:", err);
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
            console.log("Saved AI message to database");
          } catch (err) {
            console.error("Failed to save AI message to database:", err);
          }
        }

        // Always set a suggested doctor for testing if none provided
        if (response.suggestedDoctor) {
          validateAndSetSuggestedDoctor(response.suggestedDoctor);
        } else {
          // No fallback doctor - let the UI handle the case of no suggested doctor
          console.log("No doctor suggestion from AI response");
        }

        // Add urgent message if needed
        if (urgency === "high") {
          const urgentMessage: ChatMessage = {
            role: "assistant",
            content:
              "⚠️ **KHẨN CẤP** ⚠️\n\nTình trạng của bạn có thể cần được xử lý ngay lập tức. Vui lòng liên hệ phòng khám ngay hoặc đến cơ sở y tế gần nhất.\n\n📞 Hotline: 0123-456-789",
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
              console.log("Saved urgent message to database");
            } catch (err) {
              console.error("Failed to save urgent message to database:", err);
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
        // Tạo session mới nếu chưa có
        if (!currentSession && session?.user) {
          try {
            await createSession("", "low");
            console.log("Created new AI chat session for quick suggestion");
          } catch (err) {
            console.error("Failed to create AI chat session:", err);
          }
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
            console.log("Saved quick suggestion user message to database");
          } catch (err) {
            console.error("Failed to save quick suggestion user message:", err);
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
            console.log("Saved quick suggestion AI message to database");
          } catch (err) {
            console.error("Failed to save quick suggestion AI message:", err);
          }
        }

        if (response.suggestedDoctor) {
          validateAndSetSuggestedDoctor(response.suggestedDoctor);
        } else {
          // No fallback doctor - let the UI handle the case of no suggested doctor
          console.log("No doctor suggestion for quick suggestion");
        }

        if (urgency === "high") {
          const urgentMessage: ChatMessage = {
            role: "assistant",
            content:
              "⚠️ **KHẨN CẤP** ⚠️\n\nTình trạng của bạn có thể cần được xử lý ngay lập tức. Vui lòng liên hệ phòng khám ngay hoặc đến cơ sở y tế gần nhất.\n\n📞 Hotline: 0123-456-789",
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
              console.log("Saved quick suggestion urgent message to database");
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
      setIsLoading(false);
    }
  };

  // Image analysis
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn file ảnh");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB");
      return;
    }

    // Tạo session mới nếu chưa có
    if (!currentSession && session?.user) {
      try {
        await createSession("", "medium"); // Image analysis có urgency medium
        console.log("Created new AI chat session for image analysis");
      } catch (err) {
        console.error("Failed to create AI chat session:", err);
      }
    }

    dispatch(setIsAnalyzing(true));
    setIsLoading(true);

    const imageUrl = URL.createObjectURL(file);
    dispatch(setUploadedImage(imageUrl));

    const userMessage: ChatMessage = {
      role: "user",
      content: `🖼️ Đã tải lên ảnh: ${file.name}`,
      timestamp: new Date(),
      imageUrl: imageUrl,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Lưu tin nhắn upload ảnh vào database
    if (currentSession && session?.user) {
      try {
        await saveMessage({
          role: "user",
          content: `Tải lên ảnh để phân tích: ${file.name}`,
          urgencyLevel: "medium",
          messageType: "image_upload",
        });
        console.log("Saved image upload message to database");
      } catch (err) {
        console.error("Failed to save image upload message:", err);
      }
    }

    try {
      const analysisResponse = await imageAnalysisAPI.uploadAndAnalyze(file);

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
          console.log("🖼️ Lưu kết quả phân tích ảnh vào database...");
          console.log("Analysis data:", result);

          await saveMessage({
            role: "assistant",
            content: result.richContent?.analysis || result.analysis || "Kết quả phân tích ảnh X-ray",
            urgencyLevel: result.urgencyLevel || "medium",
            messageType: "image_analysis",
            analysisData: result,
          });
          console.log("✅ Đã lưu kết quả phân tích ảnh vào database");
        } catch (err) {
          console.error("❌ Lỗi khi lưu kết quả phân tích ảnh:", err);
        }
      } else {
        console.log("⚠️ Không thể lưu kết quả phân tích - không có session hoặc user");
      }

      // Always set a suggested doctor for image analysis
      if (result.suggestedDoctor) {
        validateAndSetSuggestedDoctor(result.suggestedDoctor);
      } else {
        // No fallback doctor - let the UI handle the case of no suggested doctor
        console.log("No doctor suggestion for image analysis");
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
      comprehensiveNotes += `🔍 TRIỆU CHỨNG: ${symptoms}\n\n`;
    }

    // Add urgency level
    if (urgencyLevel && urgencyLevel !== "low") {
      comprehensiveNotes += `⚠️ MỨC ĐỘ KHẨN CẤP: ${urgencyLevel.toUpperCase()}\n\n`;
    }

    // Add analysis result if available
    if (analysisResult) {
      comprehensiveNotes += `🔍 KẾT QUẢ PHÂN TÍCH AI:\n${
        analysisResult.richContent?.analysis || analysisResult.analysis || "Đã phân tích hình ảnh X-ray"
      }\n\n`;
    }

    // Add chat history as context
    if (messages.length > 0) {
      comprehensiveNotes += `💬 LỊCH SỬ CHAT:\n`;
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
      uploadedImage: uploadedImage || null,
      analysisResult: analysisResult || null,
      imageUrl: uploadedImage || null,
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
      handleSendMessage();
    }
  };

  // Handle realtime chat functionality
  const handleStartRealtimeConversation = async (otherUserId: string) => {
    try {
      const conversation = await startConversation(otherUserId);
      selectConversation(conversation);
      setShowChatWindow(true);
      setShowConversationList(false);
    } catch (error) {
      console.error("Error starting conversation:", error);
    }
  };

  const handleRealtimeMessageSend = (content: string) => {
    if (activeConversation) {
      sendRealtimeMessage(content);
    }
  };

  const handleCloseRealtimeChat = () => {
    setShowChatWindow(false);
    setShowConversationList(false);
  };

  // Doctor chat handlers
  const handleDoctorSendMessage = async () => {
    if (!doctorInput.trim() || isDoctorLoading) return;

    const userMessage = {
      role: "user",
      content: doctorInput.trim(),
      timestamp: new Date(),
    };

    setDoctorMessages((prev) => [...prev, userMessage]);
    setDoctorInput("");
    setIsDoctorLoading(true);

    try {
      // Get auth token from session
      const token =
        (session as any)?.access_token ||
        (session as any)?.accessToken ||
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      // Send message to database via API
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/realtime-chat/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          conversationId: conversationId || doctorId, // Use conversationId if available, fallback to doctorId
          senderId: currentUserId || "current_patient_id", // You'll need current user ID
          content: userMessage.content,
          type: "text",
        }),
      });

      if (response.ok) {
        const savedMessage = await response.json();
        console.log("Message saved to database:", savedMessage);

        // Notify parent component about new message
        if (onNewMessage) {
          onNewMessage(savedMessage);
        }

        // For now, add a placeholder doctor response
        // In real implementation, doctor would respond through the realtime system
        setTimeout(() => {
          const doctorResponse = {
            role: "doctor",
            content: "Cảm ơn bạn đã liên hệ. Tôi đã nhận được tin nhắn và sẽ phản hồi sớm nhất có thể.",
            timestamp: new Date(),
          };
          setDoctorMessages((prev) => [...prev, doctorResponse]);
          setIsDoctorLoading(false);
        }, 1000);
      } else {
        console.error("Failed to save message to database");
        setIsDoctorLoading(false);
      }
    } catch (error) {
      console.error("Error sending message to database:", error);
      // Fallback to local message only
      setTimeout(() => {
        const doctorResponse = {
          role: "doctor",
          content: "Đã xảy ra lỗi khi gửi tin nhắn. Vui lòng thử lại sau.",
          timestamp: new Date(),
        };
        setDoctorMessages((prev) => [...prev, doctorResponse]);
        setIsDoctorLoading(false);
      }, 1000);
    }
  };

  const handleDoctorKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleDoctorSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handle start conversation with doctor
  const handleStartConversationWithDoctor = (doctor: DoctorSuggestion) => {
    // Store doctor info in localStorage để trang chat có thể đọc
    const conversationData = {
      doctorId: doctor._id,
      doctorName: doctor.fullName,
      specialty: doctor.specialty,
      timestamp: new Date().toISOString(),
      symptoms: messages
        .filter((msg) => msg.role === "user")
        .map((msg) => msg.content)
        .join("; "),
    };

    localStorage.setItem("newConversation", JSON.stringify(conversationData));

    // Navigate to chat page
    router.push("/patient/chat?newConversation=true");
  };

  const getButtonIcon = (buttonText: string) => {
    if (buttonText.includes("Giải thích")) return "💡";
    if (buttonText.includes("Đặt lịch")) return "📅";
    if (buttonText.includes("Hướng dẫn")) return "🏠";
    if (buttonText.includes("Gợi ý bác sĩ")) return "👨‍⚕️";
    if (buttonText.includes("Kết thúc")) return "✅";
    return "🔧";
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
    "😖 Sâu răng, ê buốt khi ăn đồ ngọt hoặc lạnh",
    "🦷 Răng mọc lệch, chen chúc, khớp cắn sai",
    "✨ Răng ố vàng, xỉn màu, không đều đẹp",
    "🔧 Hàm hô, móm hoặc chấn thương vùng hàm mặt",
    "🩸 Chảy máu lợi khi chải răng",
    "💊 Răng sữa sâu, trẻ đau răng hoặc sợ đi khám răng",
    "📸 Phân tích ảnh X-quang/răng",
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
              <div>
                <p className="text-sm text-yellow-800 mb-3">
                  Hiện tại chưa có bác sĩ nào trong hệ thống. Vui lòng liên hệ trực tiếp với phòng khám để được tư vấn.
                </p>
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
        <div className="border-t border-x rounded-tl-md rounded-tr-md border-gray-200 bg-blue-50">
          <div className="px-4 py-2">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-medium text-blue-900">Bác sĩ được đề xuất</h4>
              <button
                onClick={() => setShowDoctorSuggestion(!showDoctorSuggestion)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
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
                  <h5 className="text-blue-900 font-semibold">{suggestedDoctor.fullName}</h5>
                  <p className="text-sm text-blue-700 mb-3">{suggestedDoctor.specialty}</p>

                  {/* Action Buttons - No Icons */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="text-sm bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600 transition-colors"
                      onClick={() => handleStartConversationWithDoctor(suggestedDoctor)}
                    >
                      Nhắn tin
                    </button>
                    <button className="text-sm bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600 transition-colors">
                      Hồ sơ
                    </button>
                    <button
                      className="text-sm bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600 transition-colors"
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

  return (
    <div className="flex-1 flex flex-col h-full max-h-full">
      {/* Show different UI based on type */}
      {type === "ai" ? (
        // AI Chat Interface
        <>
          {/* Messages - Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 min-h-0">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-lg ${
                    message.role === "user"
                      ? "bg-blue-500 text-white"
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
                      <div className="flex items-center justify-center p-2 bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg">
                        <span className="text-blue-800 font-bold text-base">🔍 Kết quả phân tích ảnh</span>
                      </div>

                      {/* Chẩn đoán */}
                      {message.analysisData.richContent?.analysis && (
                        <div className="p-2 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                          <div className="text-sm font-semibold text-blue-700 mb-1 flex items-center">
                            <span className="mr-1">📋</span>
                            CHẨN ĐOÁN
                          </div>
                          <p className="text-blue-900 leading-normal text-sm">
                            {message.analysisData.richContent.analysis}
                          </p>
                        </div>
                      )}

                      {/* Chi tiết */}
                      {message.analysisData.richContent?.sections &&
                        message.analysisData.richContent.sections.length > 0 && (
                          <div className="p-2 bg-gray-50 rounded-lg border-l-4 border-gray-500">
                            <div className="text-sm font-semibold text-gray-700 mb-1 flex items-center">
                              <span className="mr-1">📊</span>
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
                                          <span className="text-blue-500 mr-1 mt-0">•</span>
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
                            <span className="mr-1">💡</span>
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
                          <span className="mr-1">🔧</span>
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
                          className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center shadow-sm hover:shadow-md transform hover:scale-105"
                        >
                          <span className="mr-1">{getButtonIcon(buttonText)}</span>
                          {buttonText}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className={`text-xs mt-2 ${message.role === "user" ? "text-blue-100" : "text-gray-500"}`}>
                    {message.timestamp instanceof Date
                      ? message.timestamp.toLocaleTimeString()
                      : new Date(message.timestamp).toLocaleTimeString()}
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
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
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
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 min-h-0">
            {isLoadingMessages ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-gray-500 text-sm">Đang tải lịch sử chat...</p>
                </div>
              </div>
            ) : (
              <>
                {doctorMessages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-lg ${
                        message.role === "user" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="text-sm leading-normal">{message.content}</p>
                      <div className="text-xs opacity-70 mt-1">{formatTime(message.timestamp)}</div>
                    </div>
                  </div>
                ))}
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
            <div ref={doctorMessagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t bg-white p-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={doctorInput}
                onChange={(e) => setDoctorInput(e.target.value)}
                onKeyPress={handleDoctorKeyPress}
                placeholder="Nhập tin nhắn cho bác sĩ..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isDoctorLoading}
              />
              <button
                onClick={handleDoctorSendMessage}
                disabled={isDoctorLoading || !doctorInput.trim()}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDoctorLoading ? "..." : "Gửi"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
