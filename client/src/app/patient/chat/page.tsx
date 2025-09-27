"use client";
import { Bot, Stethoscope, User } from "lucide-react";

import { useState, useEffect, useRef, useCallback } from "react";
import ChatInterface from "@/components/chat/ChatInterface";
import ChatHeader from "@/components/chat/ChatHeader";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import realtimeChatService from "@/services/realtimeChatService";
import { extractUserData } from "@/utils/sessionHelpers";

// Type definitions
interface Message {
  _id: string;
  content: string;
  senderId: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  senderRole: "patient" | "doctor";
  messageType: "text" | "image" | "file" | "call";
  conversation: string;
  createdAt: string;
  isRead: boolean;
  imageUrl?: string;
}

interface DoctorConversation {
  _id: string;
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty?: string;
  specialty?: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  unreadCount: number;
  databaseId?: string;
}

export default function PatientChatPage() {
  const [selectedChat, setSelectedChat] = useState<"ai" | string>("ai");
  const [showSidebar, setShowSidebar] = useState(true);
  const [doctorConversations, setDoctorConversations] = useState<DoctorConversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationMessages, setConversationMessages] = useState<{ [key: string]: Message[] }>({});
  const [loadingMessages, setLoadingMessages] = useState<{ [key: string]: boolean }>({});
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [socketInitialized, setSocketInitialized] = useState(false);

  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const previousSelectedChatRef = useRef<string | null>(null);
  const socketConnectedRef = useRef(false);
  const socketEventsSetupRef = useRef(false);

  // Thay thế 2 useEffect đầu tiên của bạn bằng khối code này
  useEffect(() => {
    // Chỉ chạy khi có session
    if (!session?.user) {
      return;
    }

    let socket; // Khai báo socket để cleanup có thể truy cập

    const initializeSocket = async () => {
      try {
        console.log("🔄 [EFFECT] Bắt đầu khởi tạo socket cho BỆNH NHÂN...");
        setConversationsLoading(true);
        const userData = extractUserData(session);

        if (!userData?.userId || !userData.token) {
          setConnectionError("Không thể xác thực người dùng");
          setConversationsLoading(false);
          return;
        }

        // 1. Kết nối socket
        await realtimeChatService.connect(userData.token, userData.userId, "patient");
        socket = realtimeChatService.getSocket();
        if (!socket) throw new Error("Không lấy được instance của socket.");

        console.log("✅ [EFFECT] Socket đã kết nối.");
        setSocketInitialized(true);
        setConnectionError(null);

        // 2. Định nghĩa các hàm xử lý sự kiện
        const handleConversationsLoaded = (data) => {
          console.log("📥 [EVENT] conversationsLoaded:", data);
          setDoctorConversations(data.conversations || []);
          setConversationsLoading(false);
        };

        const handleMessagesLoaded = (data) => {
          console.log(`📥 [EVENT] messagesLoaded cho conversation ${data.conversationId}:`, data.messages);
          setConversationMessages((prev) => ({
            ...prev,
            [data.conversationId]: data.messages,
          }));
          setLoadingMessages((prev) => ({ ...prev, [data.conversationId]: false }));
        };

        const handleNewMessage = (data) => {
    console.log("📥 [EVENT] newMessage received:", data);

    // data.message chứa toàn bộ thông tin tin nhắn đã được populate
    const { message, conversationId } = data;

    if (!message || !conversationId) return;

    // 1. Cập nhật danh sách tin nhắn trong state
    setConversationMessages((prev) => {
        const currentMessages = prev[conversationId] || [];
        // Tránh thêm tin nhắn trùng lặp nếu nhận được sự kiện nhiều lần
        if (currentMessages.some(m => m._id === message._id)) {
            return prev;
        }
        return {
            ...prev,
            [conversationId]: [...currentMessages, message],
        };
    });

    // 2. Cập nhật thông tin trên sidebar (lastMessage, unread count)
    setDoctorConversations((prevConvos) =>
        prevConvos.map((conv) => {
            if (conv.id === conversationId) {
                const userData = extractUserData(session);
                const isMyMessage = message.senderId._id === userData.userId;

                return {
                    ...conv,
                    lastMessage: message.content || "Đã gửi một tệp",
                    timestamp: message.createdAt,
                    // Chỉ tăng unread count nếu đó không phải tin nhắn của mình
                    unread: !isMyMessage,
                    unreadCount: !isMyMessage ? (conv.unreadCount || 0) + 1 : conv.unreadCount,
                };
            }
            return conv;
        })
    );
};

        const handleError = (error) => {
          console.error("Lỗi Socket:", error);
          setConnectionError(`Lỗi kết nối: ${error.message || "Lỗi không xác định"}`);
        };

        // 3. Lắng nghe các sự kiện
        console.log("🎧 [EFFECT] Bắt đầu lắng nghe sự kiện...");
        socket.on("conversationsLoaded", handleConversationsLoaded);
        socket.on("messagesLoaded", handleMessagesLoaded);
        socket.on("newMessage", handleNewMessage);
        socket.on("error", handleError);

        // 4. Gửi yêu cầu tải danh sách hội thoại
        console.log("📤 [EFFECT] Gửi sự kiện loadConversations...");
        socket.emit("loadConversations", {
          userId: userData.userId,
          userRole: "patient",
        });
      } catch (error) {
        console.error("Lỗi trong quá trình khởi tạo socket:", error);
        setConnectionError("Không thể kết nối đến máy chủ chat.");
        setConversationsLoading(false);
      }
    };

    initializeSocket();

    // 5. Hàm cleanup (rất quan trọng)
    return () => {
      console.log("🧹 [CLEANUP] Dọn dẹp socket...");
      if (socket) {
        socket.off("conversationsLoaded");
        socket.off("messagesLoaded");
        socket.off("newMessage");
        socket.off("error");
      }
      realtimeChatService.disconnect();
      setSocketInitialized(false); // Reset trạng thái
    };
  }, [session]); // Chỉ phụ thuộc vào session

// Sửa lại hàm này để dùng socket
const loadConversationMessages = useCallback(
    (conversationId, forceReload = false) => {
        const hasMessages = conversationMessages[conversationId]?.length > 0;
        if (hasMessages && !forceReload) {
            console.log(`Skipping message load for ${conversationId}, đã có tin nhắn.`);
            return;
        }

        if (!socketInitialized) {
            console.warn("Socket chưa sẵn sàng, không thể tải tin nhắn.");
            return;
        }

        console.log(`📤 Yêu cầu tải tin nhắn cho conversation ${conversationId} qua socket...`);
        setLoadingMessages((prev) => ({ ...prev, [conversationId]: true }));
        realtimeChatService.loadMessages(conversationId, 100); // Gửi sự kiện qua socket
        // Kết quả sẽ được nhận bởi listener 'messagesLoaded' đã setup ở trên
    },
    [conversationMessages, socketInitialized]
);


// Sửa lại useEffect này một chút cho gọn
useEffect(() => {
    // Bỏ qua nếu là chat AI hoặc không có gì được chọn
    if (!selectedChat || selectedChat === "ai") {
        previousSelectedChatRef.current = null;
        return;
    }

    // Nếu chọn cuộc trò chuyện khác so với trước đó
    const isDifferentConversation = previousSelectedChatRef.current !== selectedChat;
    if (isDifferentConversation) {
        console.log(`Chọn cuộc trò chuyện mới: ${selectedChat}. Tải tin nhắn...`);
        // Tham gia vào "phòng" chat của cuộc hội thoại này trên server
        realtimeChatService.joinConversation(selectedChat);
        loadConversationMessages(selectedChat, true); // Luôn tải lại khi đổi conv
    }

    // Cập nhật lại ref
    previousSelectedChatRef.current = selectedChat;

}, [selectedChat, loadConversationMessages]);

  // Handle new message callback
  const handleNewMessage = (newMessage: any) => {
    if (selectedChat && selectedChat !== "ai") {
      // Add new message to conversation messages
      setConversationMessages((prev) => ({
        ...prev,
        [selectedChat]: [...(prev[selectedChat] || []), newMessage],
      }));

      // Update lastMessage and timestamp in conversations sidebar
      setDoctorConversations((prev) =>
        prev.map((conv) =>
          conv.id === selectedChat
            ? {
                ...conv,
                lastMessage: newMessage.content,
                timestamp: newMessage.createdAt || new Date().toISOString(),
                // Update unreadCount if message is from doctor
                unreadCount: newMessage.senderRole === "doctor" ? (conv.unreadCount || 0) + 1 : conv.unreadCount,
                unread: newMessage.senderRole === "doctor" ? true : conv.unread,
              }
            : conv
        )
      );

      console.log("Added new message to conversation:", newMessage);
    }
  };

  // Mark conversation as read (reset unreadCount to 0)
  const markConversationAsRead = async (conversationId: string) => {
    try {
      const userId = (session?.user as any)?._id || (session?.user as any)?.id;
      if (userId) {
        // Update local state immediately
        setDoctorConversations((prev) =>
          prev.map((conv) => (conv.id === conversationId ? { ...conv, unread: false, unreadCount: 0 } : conv))
        );

        // Call API to mark as read in backend
        await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/realtime-chat/conversations/${conversationId}/mark-read`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: userId,
              userRole: "patient",
            }),
          }
        );
      }
    } catch (error) {
      console.error("Error marking conversation as read:", error);
    }
  };

  // Check for new conversation from AI suggestion
  useEffect(() => {
    if (searchParams?.get("newConversation") === "true") {
      const newConvData = localStorage.getItem("newConversation");
      if (newConvData) {
        try {
          const conversationData = JSON.parse(newConvData);

          // Create conversation in database
          createConversationInDatabase(conversationData);

          // Clear localStorage
          localStorage.removeItem("newConversation");
        } catch (error) {
          console.error("Error parsing new conversation data:", error);
        }
      }
    }
  }, [searchParams]);

  // Create conversation in database
  const createConversationInDatabase = async (conversationData: any) => {
    try {
      // Get auth token from session
      const token =
        (session as any)?.access_token ||
        (session as any)?.accessToken ||
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      console.log("Creating conversation with token:", token ? "Token found" : "No token");
      console.log("Backend URL:", process.env.NEXT_PUBLIC_BACKEND_URL);
      console.log("Request body:", {
        participants: [
          (session?.user as any)?._id || (session?.user as any)?.id || "current_patient_id",
          conversationData.doctorId,
        ],
        type: "doctor_consultation",
        metadata: {
          symptoms: conversationData.symptoms,
          specialty: conversationData.specialty,
          createdFromAI: true,
        },
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/realtime-chat/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          patientId: (session?.user as any)?._id || (session?.user as any)?.id || "current_patient_id",
          doctorId: conversationData.doctorId,
        }),
      });

      if (response.ok) {
        const newConversation = await response.json();

        // Add to local state with database ID
        const conversationForUI = {
          id: newConversation._id || newConversation.id,
          doctorId: conversationData.doctorId,
          doctorName: conversationData.doctorName,
          specialty: conversationData.specialty,
          lastMessage: `Triệu chứng: ${conversationData.symptoms.substring(0, 50)}...`,
          timestamp: conversationData.timestamp,
          unread: false,
          databaseId: newConversation._id || newConversation.id, // Store database ID
        };

        // Check if conversation already exists in state to avoid duplicates
        setDoctorConversations((prev) => {
          const exists = prev.some((conv) => conv.databaseId === conversationForUI.databaseId);
          if (exists) {
            return prev;
          }
          return [conversationForUI, ...prev];
        });
        setSelectedChat(conversationForUI.id);

        console.log("Conversation created in database:", newConversation);
      } else {
        const errorData = await response.text();
        console.error("Failed to create conversation in database:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        // Fallback to localStorage behavior
        addConversationToLocalState(conversationData);
      }
    } catch (error) {
      console.error("Error creating conversation in database:", {
        error: error,
        message: error instanceof Error ? error.message : "Unknown error",
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/realtime-chat/conversations`,
      });
      // Fallback to localStorage behavior
      addConversationToLocalState(conversationData);
    }
  };

  // Fallback method for local state only
  const addConversationToLocalState = (conversationData: any) => {
    const newConversation = {
      id: `doctor_${conversationData.doctorId}_${Date.now()}`,
      doctorId: conversationData.doctorId,
      doctorName: conversationData.doctorName,
      specialty: conversationData.specialty,
      lastMessage: `Triệu chứng: ${conversationData.symptoms.substring(0, 50)}...`,
      timestamp: conversationData.timestamp,
      unread: false,
      unreadCount: 0,
    };

    setDoctorConversations((prev) => [newConversation, ...prev]);
    setSelectedChat(newConversation.id);
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes} phút trước`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} giờ trước`;
    } else {
      return date.toLocaleDateString("vi-VN");
    }
  };

  return (
    <div className="flex overflow-hidden h-screen pt-16">
      {/* Chat Sidebar - Toggleable */}
      {showSidebar && (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
          {/* Header - Fixed */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Chat & Tư vấn</h2>
                <p className="text-sm text-gray-600">Nhận hỗ trợ từ AI và bác sĩ</p>
              </div>
            </div>
          </div>

          {/* Conversation List - Scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-3">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Cuộc trò chuyện</div>

              {/* AI Assistant - Always first */}
              <div className="space-y-2">
                <div
                  className={`p-3 border rounded-lg cursor-pointer border-l-4 ${
                    selectedChat === "ai"
                      ? "bg-primary-100 border-l-[4px]"
                      : "bg-gray-50 border-gray-200 hover:bg-gray-100 border-l-gray-300"
                  }`}
                  onClick={() => setSelectedChat("ai")}
                >
                  <div className="flex items-start">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                      style={{ background: "var(--color-primary)" }}
                    >
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">AI Tư vấn</h4>
                      <p className="text-sm text-gray-600 truncate">Tư vấn nha khoa miễn phí 24/7</p>
                      <p className="text-xs text-gray-500 mt-1">Luôn có sẵn</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-primary-600"></div>
                  </div>
                </div>

                {/* Doctor conversations from database */}
                {conversationsLoading ? (
                  <div className="p-4 text-center text-gray-500">
                    <div
                      className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto mb-2"
                      style={{ borderColor: "var(--color-primary)" }}
                    ></div>
                    Đang tải cuộc hội thoại...
                  </div>
                ) : doctorConversations.length > 0 ? (
                  doctorConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`p-3 border border-gray-200 rounded-lg cursor-pointer transition-colors mb-2 ${
                        selectedChat === conversation.id
                          ? "bg-primary-100 border-primary-300"
                          : "bg-white hover:bg-gray-50"
                      }`}
                      onClick={() => {
                        setSelectedChat(conversation.id);
                        // Mark conversation as read when clicked
                        if (conversation.unreadCount > 0) {
                          markConversationAsRead(conversation.id);
                        }
                      }}
                    >
                      <div className="flex items-start">
                        <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center mr-3">
                          <Stethoscope className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium text-gray-900">{conversation.doctorName}</h4>
                            <p className="text-xs text-gray-400">{formatTimestamp(conversation.timestamp)}</p>
                          </div>
                          <p className="text-sm text-gray-600 truncate">{conversation.specialty}</p>
                          <div className="flex justify-between items-center">
                            <p className="text-xs text-gray-500 mt-1 truncate">{conversation.lastMessage}</p>
                            {conversation.unread && (
                              <div className="bg-red-500 text-white text-xs rounded-full px-[5px] py-[0.5px] mb-1">
                                {conversation.unreadCount}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center justify-center py-4">
                      <p className="text-sm text-gray-500">Chưa có cuộc trò chuyện với bác sĩ</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* New Chat Button - Fixed */}
          <div className="p-3 border-t border-gray-200 flex-shrink-0">
            <button className={"w-full px-4 py-2 btn-primary-filled text-sm"} onClick={() => setSelectedChat("ai")}>
              + Tư vấn mới với AI
            </button>
          </div>
        </div>
      )}

      {/* Main Chat Area - Takes remaining space */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header with Sidebar Toggle */}
        <div className="flex items-center p-4 border-b border-gray-200 bg-white flex-shrink-0">
          {/* Sidebar Toggle Button */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg mr-3 transition-colors flex-shrink-0"
            title={showSidebar ? "Ẩn sidebar" : "Hiện sidebar"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* ChatHeader Component */}
          <div className="flex-1 min-w-0">
            {selectedChat === "ai" ? (
              <ChatHeader type="ai" />
            ) : (
              (() => {
                const selectedConversation = doctorConversations.find((conv) => conv.id === selectedChat);
                return selectedConversation ? (
                  <ChatHeader
                    type="doctor"
                    doctorName={selectedConversation.doctorName}
                    doctorId={selectedConversation.doctorId}
                    specialty={selectedConversation.specialty}
                    isOnline={true}
                    onCall={() => console.log("Call clicked")}
                    onBookAppointment={() => console.log("Book appointment clicked")}
                    onViewProfile={() => console.log("View profile clicked")}
                  />
                ) : (
                  <ChatHeader type="ai" />
                );
              })()
            )}
          </div>
        </div>

        {/* Chat Content */}
        <div className="flex-1 min-h-0">
          {selectedChat === "ai" ? (
            <ChatInterface type="ai" />
          ) : (
            (() => {
              const selectedConversation = doctorConversations.find((conv) => conv.id === selectedChat);
              return selectedConversation ? (
                <ChatInterface
                  type="doctor"
                  doctorName={selectedConversation.doctorName}
                  doctorId={selectedConversation.doctorId}
                  conversationId={selectedConversation.databaseId || selectedConversation.id}
                  currentUserId={(session?.user as any)?._id || (session?.user as any)?.id}
                  currentUserRole="patient"
                  preloadedMessages={conversationMessages[selectedChat] || []}
                  isLoadingMessages={loadingMessages[selectedChat] || false}
                  onNewMessage={handleNewMessage}
                  onInputFocus={() => {
                    console.log("Patient input focused, selectedConversation:", selectedConversation);
                    // Mark conversation as read when input is focused
                    if (selectedConversation.unreadCount > 0) {
                      console.log("Calling markConversationAsRead for patient input focus");
                      markConversationAsRead(selectedConversation.id);
                    }
                  }}
                />
              ) : (
                <ChatInterface type="ai" />
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}
