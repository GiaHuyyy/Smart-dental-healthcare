// File: src/components/chat/SharedChatView.tsx
"use client";

import ChatHeader from "@/components/chat/ChatHeader";
import ChatInterface from "@/components/chat/ChatInterface";
import realtimeChatService from "@/services/realtimeChatService";
import { extractUserData } from "@/utils/sessionHelpers";
import { Drone, Menu, Stethoscope, User } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
// Avoid useSearchParams in components that may be prerendered - read window.location in effect instead
import { DoctorSuggestion } from "@/types/chat";

// --- Type Definitions ---
interface Conversation {
  id: string;
  peerId: string;
  peerName: string;
  peerDetails: string; // Email bệnh nhân hoặc chuyên khoa bác sĩ
  peerAvatar?: string; // Avatar URL của người đối diện
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

  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationMessages, setConversationMessages] = useState<{ [key: string]: Message[] }>({});
  const [loadingMessages, setLoadingMessages] = useState<{ [key: string]: boolean }>({});
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [socketInitialized, setSocketInitialized] = useState(false);

  const previousSelectedChatRef = useRef<string | null>(null);
  const newlyCreatedConvsRef = useRef<Set<string>>(new Set());
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
        peerAvatar: userRole === "doctor" ? newConversationData.patientAvatar : newConversationData.doctorAvatar,
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

  const getDisplayName = (user: any) => {
    if (!user) return "";
    // Prefer explicit name, fall back to first/last name or email
    if ((user as any).name) return (user as any).name;
    const first = (user as any).firstName || "";
    const last = (user as any).lastName || "";
    if (first || last) return `${first} ${last}`.trim();
    return (user as any).email || "";
  };

  // --- 1. Socket Connection & Event Listeners ---
  useEffect(() => {
    if (!session?.user || !userRole) return;

    let socket: any;
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
            peerAvatar: userRole === "doctor" ? conv.patientAvatar : conv.doctorAvatar,
            lastMessage: conv.lastMessage,
            timestamp: conv.timestamp,
            unread: conv.unread,
            unreadCount: conv.unreadCount,
            databaseId: conv.databaseId,
          }));
          setConversations(transformed);
          setConversationsLoading(false);
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
        socket.on("error", (err: any) => setConnectionError(err?.message || String(err)));
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
      if (!userData || !userData.userId) return;
      if (!doctor._id) {
        console.error("Doctor ID is undefined, cannot start conversation.");
        return;
      }

      try {
        // ép chắc chắn thành string
        const uid = userData.userId as string;

        const newConversation = await realtimeChatService.createConversation(uid, doctor._id);

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

      // Skip loading for newly created conversations (already have empty messages)
      if (newlyCreatedConvsRef.current.has(conversationId) && !forceReload) {
        console.log("Skipping loadMessages for newly created conversation:", conversationId);
        return;
      }

      // ✅ THAY ĐỔI LOGIC KIỂM TRA Ở ĐÂY
      const isCurrentlyLoading = loadingMessages[conversationId];
      const hasLoadedBefore = conversationMessages.hasOwnProperty(conversationId);

      // Chỉ tải khi chưa từng tải trước đó HOẶC khi bị ép tải lại
      if ((isCurrentlyLoading || hasLoadedBefore) && !forceReload) {
        return;
      }
      setLoadingMessages((prev) => ({ ...prev, [conversationId]: true }));
      realtimeChatService.loadMessages(conversationId, 100);

      // Set timeout to stop loading if no response (for new conversations with no messages)
      setTimeout(() => {
        setLoadingMessages((prev) => ({ ...prev, [conversationId]: false }));
      }, 2000);
    },
    [conversationMessages, socketInitialized, loadingMessages]
  );

  useEffect(() => {
    // For both patients and doctors when in browser
    if (!session?.user || typeof window === "undefined" || !socketInitialized || conversationsLoading) return;

    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("newConversation") === "true") {
        const newConvDataRaw = localStorage.getItem("newConversation");
        if (newConvDataRaw) {
          try {
            const conversationData = JSON.parse(newConvDataRaw);
            console.log("Processing newConversation:", conversationData);
            const userData = extractUserData(session);

            // If conversationData already contains a conversation id or full conversation object,
            // open it immediately. Otherwise, fall back to creating via socket using peerId.
            const tryExtractId = (obj: unknown): string | null => {
              if (!obj) return null;
              if (typeof obj === "string") return obj;
              const o = obj as Record<string, unknown>;
              if (o.conversationId) return String(o.conversationId);
              if (o.id) return String(o.id);
              if (o._id) return String(o._id);
              if (o.databaseId) return String(o.databaseId);
              return null;
            };

            const convObj = conversationData as unknown as Record<string, unknown> | null;
            const existingConvId = tryExtractId(conversationData) || tryExtractId(convObj?.conversation as unknown);

            if (existingConvId) {
              console.log("Found existing conversation ID:", existingConvId);
              setSelectedChat(existingConvId);
              localStorage.removeItem("newConversation");
              window.history.replaceState(null, "", userRole === "doctor" ? "/doctor/chat" : "/patient/chat");
            } else if (
              conversationData &&
              ((conversationData as unknown as Record<string, unknown>).doctorId ||
                (conversationData as unknown as Record<string, unknown>).patientId)
            ) {
              // Check if conversation already exists in conversations list
              const peerId =
                userRole === "doctor"
                  ? (conversationData as unknown as Record<string, unknown>).patientId
                  : (conversationData as unknown as Record<string, unknown>).doctorId;

              const existingConv = conversations.find((conv) => conv.peerId === String(peerId));

              if (existingConv) {
                console.log("Found existing conversation in list:", existingConv.id);
                setSelectedChat(existingConv.id);
                localStorage.removeItem("newConversation");
                window.history.replaceState(null, "", userRole === "doctor" ? "/doctor/chat" : "/patient/chat");
                return;
              }

              // Create new conversation via socket
              const createConvViaSocket = async () => {
                try {
                  // createConversation expects (patientId, doctorId)
                  // For doctor: current userId is doctorId, peerId is patientId → createConversation(patientId, doctorId)
                  // For patient: current userId is patientId, peerId is doctorId → createConversation(patientId, doctorId)
                  const patientId = userRole === "doctor" ? String(peerId) : userData!.userId;
                  const doctorId = userRole === "doctor" ? userData!.userId : String(peerId);

                  console.log("Creating new conversation - patientId:", patientId, "doctorId:", doctorId);
                  const resp = await realtimeChatService.createConversation(patientId, doctorId);
                  console.log("Create conversation response:", resp);

                  // Normalize response to id and add name if needed
                  let convId: string | null = null;
                  let respWithName: any = resp;

                  if (!resp) {
                    console.warn("createConversation returned empty response", resp);
                  } else if (typeof resp === "string") {
                    convId = resp;
                    // For new conversation without full data, add name from conversationData
                    const peerName =
                      userRole === "doctor"
                        ? (conversationData as unknown as Record<string, unknown>).patientName
                        : (conversationData as unknown as Record<string, unknown>).doctorName;
                    respWithName = {
                      id: resp,
                      [userRole === "doctor" ? "patientId" : "doctorId"]: peerId,
                      [userRole === "doctor" ? "patientName" : "doctorName"]: peerName,
                      lastMessage: "",
                      timestamp: new Date().toISOString(),
                      unread: false,
                      unreadCount: 0,
                    };
                  } else if (typeof resp === "object") {
                    const r = resp as Record<string, unknown>;
                    if (r.id) convId = String(r.id);
                    else if (r._id) convId = String(r._id);
                    else if (r.conversation && typeof r.conversation === "object") {
                      const inner = r.conversation as Record<string, unknown>;
                      if (inner.id) convId = String(inner.id);
                    }

                    // Add name if missing
                    if (resp) {
                      const peerName =
                        userRole === "doctor"
                          ? (conversationData as unknown as Record<string, unknown>).patientName
                          : (conversationData as unknown as Record<string, unknown>).doctorName;
                      if (peerName) {
                        respWithName = { ...resp, [userRole === "doctor" ? "patientName" : "doctorName"]: peerName };
                      }
                    }
                  }

                  console.log("Response with name:", respWithName);

                  // Initialize empty messages for new conversation
                  const finalConvId =
                    convId ||
                    (typeof resp === "object" && resp && (resp as Record<string, unknown>)?.id
                      ? String((resp as Record<string, unknown>).id)
                      : null);

                  if (finalConvId && typeof resp === "string") {
                    console.log("Initializing new conversation with ID:", finalConvId);
                    // Mark as newly created to skip auto-load messages
                    newlyCreatedConvsRef.current.add(finalConvId);
                    // Initialize messages array for new conversation
                    setConversationMessages((prev) => ({ ...prev, [finalConvId]: [] }));
                    setLoadingMessages((prev) => ({ ...prev, [finalConvId]: false }));
                    addOrUpdateConversation(respWithName);
                    setSelectedChat(finalConvId);
                  } else if (convId) {
                    newlyCreatedConvsRef.current.add(convId);
                    addOrUpdateConversation(respWithName);
                    setSelectedChat(convId);
                  } else {
                    const tryId =
                      (resp && (resp as unknown as Record<string, unknown>)?.id) ||
                      (resp && (resp as unknown as Record<string, unknown>)?.databaseId);
                    if (tryId) {
                      newlyCreatedConvsRef.current.add(String(tryId));
                      addOrUpdateConversation(respWithName);
                      setSelectedChat(String(tryId));
                    }
                  }
                } catch (socketError) {
                  console.error("Lỗi socket khi tạo cuộc hội thoại:", socketError);
                } finally {
                  localStorage.removeItem("newConversation");
                  window.history.replaceState(null, "", userRole === "doctor" ? "/doctor/chat" : "/patient/chat");
                }
              };

              createConvViaSocket();
            } else {
              console.warn("newConversation payload did not contain doctorId/patientId or conv id:", conversationData);
              localStorage.removeItem("newConversation");
              window.history.replaceState(null, "", userRole === "doctor" ? "/doctor/chat" : "/patient/chat");
            }
          } catch (error) {
            console.error("Error parsing newConversation:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error parsing URL params:", error);
    }
  }, [session, userRole, socketInitialized, conversationsLoading, conversations, addOrUpdateConversation]);

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
    <div className="flex overflow-hidden h-full bg-gradient-to-br from-blue-50/30 to-indigo-50/20 p-6">
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
                  className={`p-3 border border-gray-200 rounded-lg cursor-pointer transition-colors ${
                    selectedChat === "ai"
                      ? "bg-primary-100 ring ring-primary"
                      : "bg-white hover:bg-gray-50"
                  }`}
                  onClick={() => setSelectedChat("ai")}
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3 bg-primary text-white">
                      <Drone size={18} />
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
                      selectedChat === conv.id
                        ? "bg-primary-100 ring ring-primary"
                        : "bg-white hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      setSelectedChat(conv.id);
                      if (conv.unread) markConversationAsRead(conv.id);
                    }}
                  >
                    <div className="flex items-start">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mr-3 text-primary overflow-hidden">
                        {conv.peerAvatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={conv.peerAvatar} alt={conv.peerName} className="w-full h-full object-cover" />
                        ) : userRole === "patient" ? (
                          <Stethoscope className="text-white" size={18} />
                        ) : (
                          <User className="text-white" size={18} />
                        )}
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
        {/* Header với Sidebar Toggle */}
        <div className="flex items-center p-4 border-b border-gray-200 bg-white">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 text-gray-500 hover:text-gray-700 md:hidden mr-3"
          >
            <Menu size={20} />
          </button>

          <div className="flex-1 min-w-0">
            {/* ✅ BƯỚC 3: CHỈ HIỂN THỊ HEADER KHI ĐÃ CHỌN CUỘC HỘI THOẠI */}
            {selectedChat && (
              <>
                {selectedChat === "ai" && userRole === "patient" ? (
                  <ChatHeader type="ai" />
                ) : selectedConversation ? (
                  <ChatHeader
                    type={userRole === "doctor" ? "patient" : "doctor"}
                    patientName={userRole === "doctor" ? selectedConversation.peerName : getDisplayName(session?.user)}
                    patientId={userRole === "doctor" ? selectedConversation.peerId : userData?.userId || ""}
                    patientEmail={userRole === "doctor" ? selectedConversation.peerDetails : session?.user?.email || ""}
                    patientAvatar={
                      userRole === "doctor" ? selectedConversation.peerAvatar : (session?.user as any)?.avatarUrl
                    }
                    doctorName={userRole === "patient" ? selectedConversation.peerName : getDisplayName(session?.user)}
                    doctorId={userRole === "patient" ? selectedConversation.peerId : userData?.userId || ""}
                    doctorAvatar={
                      userRole === "patient" ? selectedConversation.peerAvatar : (session?.user as any)?.avatarUrl
                    }
                    specialty={
                      userRole === "patient"
                        ? selectedConversation.peerDetails
                        : ((session?.user as unknown as Record<string, unknown>)?.specialty as string | undefined) || ""
                    }
                    isOnline={true}
                    embedded={true}
                  />
                ) : null}
              </>
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
              doctorName={userRole === "patient" ? selectedConversation.peerName : getDisplayName(session?.user)}
              patientName={userRole === "doctor" ? selectedConversation.peerName : getDisplayName(session?.user)}
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
