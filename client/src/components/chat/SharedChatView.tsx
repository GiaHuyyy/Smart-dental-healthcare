// File: src/components/chat/SharedChatView.tsx
"use client";

import { User, Menu, Bot, Stethoscope } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import ChatInterface from "@/components/chat/ChatInterface";
import ChatHeader from "@/components/chat/ChatHeader";
import { useSession } from "next-auth/react";
import realtimeChatService from "@/services/realtimeChatService";
import { extractUserData } from "@/utils/sessionHelpers";
import { useSearchParams } from "next/navigation";
import { DoctorSuggestion } from "@/types/chat";

// --- Type Definitions ---
interface Conversation {
  id: string;
  peerId: string;
  peerName: string;
  peerDetails: string; // Email bệnh nhân hoặc chuyên khoa bác sĩ
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
  senderId: any; // Có thể là string hoặc object
  createdAt: string;
  conversationId: string;
  imageUrl?: string;
}

interface SharedChatViewProps {
  userRole: "doctor" | "patient";
}

// --- Component chính ---
export default function SharedChatView({ userRole }: SharedChatViewProps) {
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  const [selectedChat, setSelectedChat] = useState<string | null>(userRole === "patient" ? "ai" : null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationMessages, setConversationMessages] = useState<{ [key: string]: Message[] }>({});
  const [loadingMessages, setLoadingMessages] = useState<{ [key: string]: boolean }>({});
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [socketInitialized, setSocketInitialized] = useState(false);

  const previousSelectedChatRef = useRef<string | null>(null);
  const userData = extractUserData(session);

  const addOrUpdateConversation = useCallback(
    (newConversationData: any) => {
      const newConversation: Conversation = {
        id: newConversationData.id,
        peerId: userRole === "doctor" ? newConversationData.patientId : newConversationData.doctorId,
        peerName: userRole === "doctor" ? newConversationData.patientName : newConversationData.doctorName,
        peerDetails:
          userRole === "doctor"
            ? newConversationData.patientEmail
            : newConversationData.specialty || newConversationData.doctorSpecialty,
        lastMessage: newConversationData.lastMessage,
        timestamp: newConversationData.timestamp,
        unread: newConversationData.unread,
        unreadCount: newConversationData.unreadCount,
        databaseId: newConversationData.databaseId,
      };

      setConversations((prev) => {
        const existingIndex = prev.findIndex((c) => c.id === newConversation.id);
        if (existingIndex !== -1) {
          // Nếu đã tồn tại, cập nhật nó
          const updatedConversations = [...prev];
          updatedConversations[existingIndex] = newConversation;
          return updatedConversations;
        } else {
          // Nếu chưa, thêm mới vào đầu danh sách
          return [newConversation, ...prev];
        }
      });
    },
    [userRole]
  );

  // --- 1. Socket Connection & Event Listeners ---
  useEffect(() => {
    if (!session?.user || !userRole) return;

    let socket;
    if (!userData?.userId || !userData.token) {
      setConnectionError("Không thể xác thực người dùng");
      setConversationsLoading(false);
      return;
    }

    const initializeAndListen = async () => {
      try {
        setConversationsLoading(true);
        await realtimeChatService.connect(userData.token!, userData.userId, userRole);
        socket = realtimeChatService.getSocket();
        if (!socket) throw new Error("Không lấy được instance socket");

        setSocketInitialized(true);
        setConnectionError(null);

        const handleConversationsLoaded = (data: { conversations: any[] }) => {
          const transformed = (data.conversations || []).map((conv) => ({
            id: conv.id,
            peerId: userRole === "doctor" ? conv.patientId : conv.doctorId,
            peerName: userRole === "doctor" ? conv.patientName : conv.doctorName,
            peerDetails: userRole === "doctor" ? conv.patientEmail : conv.specialty || conv.doctorSpecialty,
            lastMessage: conv.lastMessage,
            timestamp: conv.timestamp,
            unread: conv.unread,
            unreadCount: conv.unreadCount,
            databaseId: conv.databaseId,
          }));
          setConversations(transformed);
          setConversationsLoading(false);
          if (transformed.length > 0 && selectedChat === null) {
            setSelectedChat(transformed[0].id);
          }
        };

        const handleMessagesLoaded = (data: { conversationId: string; messages: Message[] }) => {
          setConversationMessages((prev) => ({ ...prev, [data.conversationId]: data.messages }));
          setLoadingMessages((prev) => ({ ...prev, [data.conversationId]: false }));
        };

        const handleNewMessage = (data: { message: Message; conversationId: string }) => {
          const { message, conversationId } = data;
          if (!message || !conversationId) return;

          setConversationMessages((prev) => {
            const current = prev[conversationId] || [];
            if (current.some((m) => m._id === message._id)) return prev;
            return { ...prev, [conversationId]: [...current, message] };
          });

          setConversations((prev) =>
            prev.map((conv) => {
              if (conv.id === conversationId) {
                const senderId = message.senderId?._id || message.senderId;
                const isMyMessage = senderId.toString() === userData?.userId;
                return {
                  ...conv,
                  lastMessage: message.content || "Đã gửi một tệp",
                  timestamp: message.createdAt,
                  unread: !isMyMessage,
                  unreadCount: !isMyMessage ? (conv.unreadCount || 0) + 1 : conv.unreadCount,
                };
              }
              return conv;
            })
          );
        };

        socket.on("conversationsLoaded", handleConversationsLoaded);
        socket.on("messagesLoaded", handleMessagesLoaded);
        socket.on("newMessage", handleNewMessage);
        socket.on("error", (err) => setConnectionError(err.message));
        socket.on("conversationCreated", addOrUpdateConversation);

        socket.emit("loadConversations", { userId: userData.userId, userRole });
      } catch (error) {
        setConnectionError("Không thể kết nối đến máy chủ chat.");
        setConversationsLoading(false);
      }
    };

    initializeAndListen();

    return () => {
      if (socket) {
        socket.off("conversationCreated", addOrUpdateConversation);
        realtimeChatService.disconnect();
      }
      setSocketInitialized(false);
    };
  }, [session, userRole, addOrUpdateConversation]);

  const handleStartConversation = useCallback(
    async (doctor: DoctorSuggestion) => {
      if (!userData?.userId) return;
      try {
        const newConversation = await realtimeChatService.createConversation(userData.userId, doctor._id);

        // ✅ GỌI HÀM CHUNG ĐỂ CẬP NHẬT UI
        addOrUpdateConversation(newConversation);
        setSelectedChat(newConversation.id);
      } catch (error) {
        console.error("Lỗi khi tạo cuộc hội thoại:", error);
      }
    },
    [userData, addOrUpdateConversation]
  );

  // --- 2. Tải tin nhắn khi chọn cuộc hội thoại ---
  const loadConversationMessages = useCallback(
    (conversationId: string, forceReload = false) => {
      if (!socketInitialized) return;

      // ✅ THAY ĐỔI LOGIC KIỂM TRA Ở ĐÂY
      const isCurrentlyLoading = loadingMessages[conversationId];
      const hasLoadedBefore = conversationMessages.hasOwnProperty(conversationId);

      // Chỉ tải khi chưa từng tải trước đó HOẶC khi bị ép tải lại
      if ((isCurrentlyLoading || hasLoadedBefore) && !forceReload) {
        console.log(
          `Skipping load for ${conversationId}. Loaded before: ${hasLoadedBefore}, Loading now: ${isCurrentlyLoading}`
        );
        return;
      }

      console.log(`Requesting messages for ${conversationId} from server...`);
      setLoadingMessages((prev) => ({ ...prev, [conversationId]: true }));
      realtimeChatService.loadMessages(conversationId, 100);
    },
    [conversationMessages, socketInitialized, loadingMessages]
  );

  useEffect(() => {
    // Chỉ bệnh nhân mới có chức năng này
    if (userRole !== "patient" || !session?.user) {
      return;
    }

    // Kiểm tra URL param để tạo cuộc hội thoại mới
    if (searchParams?.get("newConversation") === "true") {
      const newConvDataRaw = localStorage.getItem("newConversation");
      if (newConvDataRaw) {
        try {
          const conversationData = JSON.parse(newConvDataRaw);
          const userData = extractUserData(session);

          console.log("Đang tạo cuộc hội thoại mới qua SOCKET với:", conversationData);

          const createConvViaSocket = async () => {
            try {
              // Gọi service để emit sự kiện qua socket
              const newConversationId = await realtimeChatService.createConversation(
                userData!.userId,
                conversationData.doctorId
              );

              console.log("Socket: Tạo cuộc hội thoại thành công, ID:", newConversationId);

              // Chọn luôn cuộc hội thoại vừa tạo.
              // Sidebar sẽ được cập nhật tự động qua sự kiện 'conversationCreated'.
              setSelectedChat(newConversationId);
            } catch (socketError) {
              console.error("Lỗi socket khi tạo cuộc hội thoại:", socketError);
            } finally {
              // Dọn dẹp để tránh tạo lại khi reload
              localStorage.removeItem("newConversation");
              window.history.replaceState(null, "", "/patient/chat");
            }
          };

          createConvViaSocket();
        } catch (error) {
          console.error("Lỗi xử lý newConversation:", error);
        }
      }
    }
  }, [searchParams, session, userRole]);

  useEffect(() => {
    if (selectedChat && selectedChat !== "ai" && socketInitialized) {
      const isDifferent = previousSelectedChatRef.current !== selectedChat;
      realtimeChatService.joinConversation(selectedChat);
      loadConversationMessages(selectedChat, isDifferent);
      previousSelectedChatRef.current = selectedChat;
    } else {
      previousSelectedChatRef.current = null;
    }
  }, [selectedChat, socketInitialized, loadConversationMessages]);

  // --- 3. Các hàm tiện ích ---
  const markConversationAsRead = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((conv) => (conv.id === conversationId ? { ...conv, unread: false, unreadCount: 0 } : conv))
    );
    realtimeChatService.markConversationAsRead(conversationId);
  }, []);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    if (diffInHours < 24 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString("vi-VN");
  };

  const selectedConversation = conversations.find((conv) => conv.id === selectedChat);

  // --- RENDER ---
  return (
    <div className="flex overflow-hidden h-screen pt-16">
      {/* --- Sidebar --- */}
      {showSidebar && (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Chat & Tư vấn</h2>
            <p className="text-sm text-gray-600">
              {userRole === "patient" ? "Nhận hỗ trợ từ AI và bác sĩ" : "Hỗ trợ bệnh nhân trực tuyến"}
            </p>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto min-h-0 p-3">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Cuộc trò chuyện</div>
            <div className="space-y-2">
              {/* AI Assistant (Patient only) */}
              {userRole === "patient" && (
                <div
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedChat === "ai"
                      ? "bg-primary-100 border-primary-300"
                      : "bg-white hover:bg-gray-50 border-gray-200"
                  }`}
                  onClick={() => setSelectedChat("ai")}
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3 bg-primary text-white">
                      <Bot size={16} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">AI Tư vấn</h4>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 truncate">Tư vấn nha khoa 24/7</p>
                        <div className="w-2 h-2 rounded-full bg-primary-600"></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Luôn có sẵn</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Doctor/Patient Conversations */}
              {conversationsLoading ? (
                <div className="p-4 text-center text-gray-500">Đang tải...</div>
              ) : conversations.length > 0 ? (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-3 border border-gray-200 rounded-lg cursor-pointer transition-colors ${
                      selectedChat === conv.id ? "bg-primary-100 border-primary-300" : "bg-white hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      setSelectedChat(conv.id);
                      if (conv.unread) markConversationAsRead(conv.id);
                    }}
                  >
                    <div className="flex items-start">
                      <div className="w-8 h-8 bg-primary-50 rounded-full flex items-center justify-center mr-3 text-primary">
                        {userRole === "patient" ? <Stethoscope size={16} /> : <User size={16} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium text-gray-900">{conv.peerName}</h4>
                          <p className="text-xs text-gray-400">{formatTimestamp(conv.timestamp)}</p>
                        </div>
                        <p className="text-sm text-gray-600 truncate">{conv.peerDetails}</p>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
                          {conv.unread && (
                            <div className="bg-red-500 text-white text-xs rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                              {conv.unreadCount}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-center">
                  <p className="text-sm text-gray-500 py-4">Chưa có cuộc trò chuyện nào</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200">
            {userRole === "patient" ? (
              <button className="w-full btn-primary-filled text-sm" onClick={() => setSelectedChat("ai")}>
                + Tư vấn mới với AI
              </button>
            ) : (
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                <div className="flex justify-between items-center">
                  <span>Tổng bệnh nhân:</span>
                  <span className="font-medium">{conversations.length}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span>Chờ phản hồi:</span>
                  <span className="font-medium text-gray-700">{conversations.filter((c) => c.unread).length}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- Main Chat Area --- */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center p-4 border-b border-gray-200 bg-white">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 text-gray-500 hover:text-gray-700 md:hidden mr-3"
          >
            <Menu size={20} />
          </button>

          <div className="flex-1 min-w-0">
            {selectedChat === "ai" && userRole === "patient" ? (
              <ChatHeader type="ai" />
            ) : selectedConversation ? (
              <ChatHeader
                type={userRole === "doctor" ? "patient" : "doctor"}
                patientName={userRole === "doctor" ? selectedConversation.peerName : session?.user?.name || ""}
                patientId={userRole === "doctor" ? selectedConversation.peerId : userData?.userId || ""}
                patientEmail={userRole === "doctor" ? selectedConversation.peerDetails : session?.user?.email || ""}
                doctorName={userRole === "patient" ? selectedConversation.peerName : session?.user?.name || ""}
                doctorId={userRole === "patient" ? selectedConversation.peerId : userData?.userId || ""}
                specialty={
                  userRole === "patient" ? selectedConversation.peerDetails : (session?.user as any)?.specialty || ""
                }
                isOnline={true}
                embedded={true}
              />
            ) : (
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                  <User size={20} className="text-gray-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Chào mừng đến với Chat</h3>
                  <p className="text-sm text-gray-600">Chọn một cuộc hội thoại để bắt đầu</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0">
          {selectedChat === "ai" && userRole === "patient" ? (
            <ChatInterface type="ai" onStartConversation={handleStartConversation} />
          ) : selectedConversation ? (
            <ChatInterface
              type="doctor"
              conversationId={selectedConversation.id}
              currentUserId={userData?.userId}
              currentUserRole={userRole}
              preloadedMessages={selectedChat ? conversationMessages[selectedChat] || [] : []}
              isLoadingMessages={selectedChat ? loadingMessages[selectedChat] || false : false}
              doctorName={userRole === "patient" ? selectedConversation.peerName : session?.user?.name || ""}
              patientName={userRole === "doctor" ? selectedConversation.peerName : session?.user?.name || ""}
              onInputFocus={() => {
                if (selectedConversation && selectedConversation.unread) {
                  markConversationAsRead(selectedConversation.id);
                }
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-center text-gray-500">
              <div>
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-lg font-medium">Chọn một cuộc trò chuyện</h3>
                <p className="text-sm">Hãy chọn một liên hệ từ danh sách bên trái để xem tin nhắn.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
