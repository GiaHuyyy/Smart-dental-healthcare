"use client";
import { User, Menu } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import ChatInterface from "@/components/chat/ChatInterface";
import ChatHeader from "@/components/chat/ChatHeader";
import { useSession } from "next-auth/react";
import realtimeChatService from "@/services/realtimeChatService";
import { extractUserData } from "@/utils/sessionHelpers";

// Type definitions
interface PatientConversation {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  unreadCount: number;
  databaseId: string;
}

interface Message {
  _id: string;
  content: string;
  senderRole: string;
  senderId: string;
  createdAt: string;
  conversationId: string;
  imageUrl?: string;
}

export default function DoctorChatPage() {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [patientConversations, setPatientConversations] = useState<PatientConversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationMessages, setConversationMessages] = useState<{ [key: string]: Message[] }>({});
  const [loadingMessages, setLoadingMessages] = useState<{ [key: string]: boolean }>({});
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [socketInitialized, setSocketInitialized] = useState(false);

  const { data: session } = useSession();
  const previousSelectedChatRef = useRef<string | null>(null);
  const socketConnectedRef = useRef(false);
  const socketEventsSetupRef = useRef(false);

  useEffect(() => {
    // Chỉ thực hiện khi có session
    if (!session?.user) {
      return;
    }

    let socket; // Khai báo socket ở scope này

    const initializeAndListen = async () => {
      try {
        console.log("🔄 [EFFECT] Bắt đầu khởi tạo socket và lắng nghe...");
        setConversationsLoading(true);
        const userData = extractUserData(session);

        if (!userData || !userData.userId || !userData.token) {
          setConnectionError("Không thể xác thực người dùng");
          setConversationsLoading(false);
          return;
        }

        // 1. Kết nối socket
        await realtimeChatService.connect(userData.token, userData.userId, "doctor");
        socket = realtimeChatService.getSocket();
        if (!socket) throw new Error("Không lấy được instance socket");

        console.log("✅ [EFFECT] Socket đã kết nối.");
        setSocketInitialized(true);
        setConnectionError(null);

        // 2. Định nghĩa các hàm xử lý sự kiện
        const handleConversationsLoaded = (data) => {
          console.log("📥 [EVENT] conversationsLoaded:", data.conversations);
          setPatientConversations(data.conversations || []);
          setConversationsLoading(false);
          // Tự động chọn cuộc hội thoại đầu tiên nếu chưa có gì được chọn
          if (data.conversations && data.conversations.length > 0 && !selectedChat) {
            setSelectedChat(data.conversations[0].id);
          }
        };

        const handleMessagesLoaded = (data) => {
          console.log(`📥 [EVENT] messagesLoaded for ${data.conversationId}`);
          setConversationMessages((prev) => ({
            ...prev,
            [data.conversationId]: data.messages,
          }));
          // Tắt trạng thái loading cho cuộc hội thoại này
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
    setPatientConversations((prevConvos) => // hoặc setDoctorConversations
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
          console.error("Socket error:", error);
          setConnectionError("Lỗi socket: " + (error.message || "Unknown error"));
        };

        // 3. Lắng nghe các sự kiện
        console.log("🎧 [EFFECT] Bắt đầu lắng nghe sự kiện...");
        socket.on("conversationsLoaded", handleConversationsLoaded);
        socket.on("messagesLoaded", handleMessagesLoaded);
        socket.on("newMessage", handleNewMessage);
        socket.on("error", handleError);

        // 4. Gửi sự kiện để tải danh sách hội thoại
        console.log("📤 [EFFECT] Gửi sự kiện loadConversations...");
        socket.emit("loadConversations", {
          userId: userData.userId,
          userRole: "doctor",
        });
      } catch (error) {
        console.error("Lỗi khởi tạo socket:", error);
        setConnectionError("Không thể kết nối đến máy chủ");
        setConversationsLoading(false);
      }
    };

    initializeAndListen();

    // 5. Hàm cleanup (rất quan trọng)
    return () => {
      console.log("🧹 [CLEANUP] Dọn dẹp effect...");
      if (socket) {
        console.log("🔌 [CLEANUP] Gỡ bỏ các listener và ngắt kết nối socket.");
        socket.off("conversationsLoaded");
        socket.off("messagesLoaded");
        socket.off("newMessage");
        socket.off("error");
        realtimeChatService.disconnect();
      }
      setSocketInitialized(false);
    };
  }, [session]); // ✅ CHỈ PHỤ THUỘC VÀO SESSION

  // Load messages for a specific conversation using socket
  const loadConversationMessages = useCallback(
    async (conversationId: string, forceReload: boolean = false) => {
      // Check loading state
      const isCurrentlyLoading = loadingMessages[conversationId];
      const hasMessages = conversationMessages[conversationId] && conversationMessages[conversationId].length > 0;

      if (!forceReload && (isCurrentlyLoading || hasMessages)) {
        console.log(`Skipping load for ${conversationId}: loading=${isCurrentlyLoading}, hasMessages=${hasMessages}`);
        return;
      }

      if (!socketInitialized) {
        console.log("Socket not initialized yet, skipping message load");
        return;
      }

      setLoadingMessages((prev) => ({ ...prev, [conversationId]: true }));

      try {
        console.log(`Loading messages via socket for conversation ${conversationId}...`);
        await realtimeChatService.loadMessages(conversationId, 100);
        // Messages will be handled by the messagesLoaded event listener
      } catch (error) {
        console.error("Error loading conversation messages:", error);
        setLoadingMessages((prev) => ({ ...prev, [conversationId]: false }));
      }
    },
    [loadingMessages, conversationMessages, socketInitialized]
  );

  // Load messages when conversation is selected and join room
  useEffect(() => {
    if (selectedChat && socketInitialized) {
      // Check if this is a different conversation than previous
      const isDifferentConversation = previousSelectedChatRef.current !== selectedChat;

      console.log(`Selected chat changed to: ${selectedChat}, isDifferent: ${isDifferentConversation}`);

      // Join the conversation room
      realtimeChatService.joinConversation(selectedChat);

      // Load messages if needed
      loadConversationMessages(selectedChat, isDifferentConversation);

      // Update previous selected chat ref
      previousSelectedChatRef.current = selectedChat;
    } else {
      previousSelectedChatRef.current = null;
    }
  }, [selectedChat, socketInitialized, loadConversationMessages]);

  // Handle new message from socket events (updating UI state)
  const updateConversationWithNewMessage = useCallback((message: Message, conversationId: string) => {
    // Update conversation messages
    setConversationMessages((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), message],
    }));

    // Update lastMessage and timestamp in conversations sidebar
    setPatientConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              lastMessage: message.content,
              timestamp: message.createdAt || new Date().toISOString(),
              // Update unread count if message is from patient
              unreadCount: message.senderRole === "patient" ? (conv.unreadCount || 0) + 1 : conv.unreadCount,
              unread: message.senderRole === "patient" ? true : conv.unread,
            }
          : conv
      )
    );
  }, []);

  // Handle new message callback for ChatInterface
  const handleNewMessage = useCallback(
    (newMessage: Message) => {
      // Use our utility function to update state
      updateConversationWithNewMessage(newMessage, selectedChat || "");
      console.log("New message sent via ChatInterface:", newMessage);
    },
    [updateConversationWithNewMessage, selectedChat]
  );

  // Mark conversation as read (reset unreadCount to 0)
  const markConversationAsRead = useCallback((conversationId: string) => {
    // Update local state immediately
    setPatientConversations((prev) =>
      prev.map((conv) => (conv.id === conversationId ? { ...conv, unread: false, unreadCount: 0 } : conv))
    );

    // Note: Backend marking as read will be handled by socket events when implemented
    console.log(`Marked conversation ${conversationId} as read`);
  }, []);

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
    <div className="flex overflow-hidden h-screen">
      {/* Chat Sidebar - Toggleable */}
      {showSidebar && (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
          {/* Header - Fixed */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Chat & Tư vấn</h2>
                <p className="text-sm text-gray-600">Hỗ trợ bệnh nhân trực tuyến</p>
              </div>
            </div>
          </div>

          {/* Conversation List - Scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-3">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Cuộc trò chuyện ({patientConversations.length})
              </div>

              {/* Patient conversations from database */}
              <div className="space-y-2">
                {connectionError ? (
                  <div className="p-4 text-center text-red-500">
                    <div className="mb-2">⚠️</div>
                    <div className="text-sm">{connectionError}</div>
                  </div>
                ) : conversationsLoading ? (
                  <div className="p-4 text-center text-gray-500">
                    <div
                      className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto mb-2"
                      style={{ borderColor: "var(--color-primary)" }}
                    ></div>
                    Đang tải cuộc hội thoại...
                  </div>
                ) : patientConversations.length > 0 ? (
                  patientConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`p-3 border border-gray-200 rounded-lg cursor-pointer transition-colors mb-2 ${
                        selectedChat === conversation.id ? "bg-primary-100" : "bg-white hover:bg-gray-50"
                      }`}
                      style={selectedChat === conversation.id ? { borderColor: "var(--color-primary)" } : {}}
                      onClick={() => {
                        setSelectedChat(conversation.id);
                        // Mark as read when conversation is clicked
                        if (conversation.unread) {
                          markConversationAsRead(conversation.id);
                        }
                      }}
                    >
                      <div className="flex items-start">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                          style={{ background: "var(--color-primary-50)" }}
                        >
                          <svg
                            className="w-5 h-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            style={{ color: "var(--color-primary)" }}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M6 20c0-3.314 2.686-6 6-6s6 2.686 6 6"
                            />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium text-gray-900">{conversation.patientName}</h4>
                            <p className="text-xs text-gray-400">{formatTimestamp(conversation.timestamp)}</p>
                          </div>
                          <p className="text-sm text-gray-600 truncate">{conversation.patientEmail}</p>
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
                      <p className="text-sm text-gray-500">Chưa có cuộc trò chuyện với bệnh nhân</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats Footer - Fixed */}
          <div className="p-3 border-t border-gray-200 flex-shrink-0">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-600 text-center">
                <div className="flex justify-between items-center">
                  <span>Tổng bệnh nhân:</span>
                  <span className="font-medium">{patientConversations.length}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span>Chờ phản hồi:</span>
                  <span className="font-medium text-gray-700">
                    {patientConversations.filter((c) => c.unread).length}
                  </span>
                </div>
              </div>
            </div>
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
            <Menu className="w-5 h-5" />
          </button>

          {/* ChatHeader Component */}
          <div className="flex-1 min-w-0">
            {(() => {
              const selectedConversation = patientConversations.find((conv) => conv.id === selectedChat);
              return selectedConversation ? (
                <ChatHeader
                  type="patient"
                  patientName={selectedConversation.patientName}
                  patientId={selectedConversation.patientId}
                  patientEmail={selectedConversation.patientEmail}
                  isOnline={true}
                  embedded={true}
                  onCall={() => console.log("Call patient clicked")}
                  onBookAppointment={() => console.log("Book appointment clicked")}
                  onViewProfile={() => console.log("View patient profile clicked")}
                />
              ) : (
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center mr-3">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Chọn bệnh nhân để trò chuyện</h3>
                    <p className="text-sm text-gray-600">Không có cuộc hội thoại nào được chọn</p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Chat Content */}
        <div className="flex-1 min-h-0">
          {(() => {
            const selectedConversation = patientConversations.find((conv) => conv.id === selectedChat);
            return selectedConversation && selectedChat ? (
              <ChatInterface
                type="doctor"
                conversationId={selectedConversation.id}
                currentUserId={
                  (session?.user as { _id?: string; id?: string })?._id ||
                  (session?.user as { _id?: string; id?: string })?.id
                }
                currentUserRole="doctor"
                preloadedMessages={conversationMessages[selectedChat] || []}
                isLoadingMessages={loadingMessages[selectedChat] || false}
                onNewMessage={handleNewMessage}
                onInputFocus={() => {
                  console.log("Doctor input focused, marking as read");
                  if (selectedConversation.unreadCount > 0) {
                    markConversationAsRead(selectedConversation.id);
                  }
                }}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-6xl mb-4">💬</div>
                  <h3 className="text-lg font-medium mb-2">Chọn bệnh nhân để bắt đầu trò chuyện</h3>
                  <p className="text-sm">Hãy chọn một cuộc hội thoại từ danh sách bên trái</p>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
