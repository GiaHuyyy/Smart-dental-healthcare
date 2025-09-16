"use client";
import { User, Menu } from "lucide-react";

import { useState, useEffect, useRef, useCallback } from "react";
import ChatInterface from "@/components/chat/ChatInterface";
import ChatHeader from "@/components/chat/ChatHeader";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

export default function DoctorChatPage() {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [patientConversations, setPatientConversations] = useState<any[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationMessages, setConversationMessages] = useState<{ [key: string]: any[] }>({});
  const [loadingMessages, setLoadingMessages] = useState<{ [key: string]: boolean }>({});
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const previousSelectedChatRef = useRef<string | null>(null);

  // Load conversations from database when component mounts
  useEffect(() => {
    const loadConversations = async () => {
      if (session?.user) {
        try {
          const userId = (session.user as any)?._id || (session.user as any)?.id;
          if (userId) {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/realtime-chat/conversations?userId=${userId}&userRole=doctor`
            );

            if (response.ok) {
              const conversations = await response.json();
              console.log("Raw conversations from API:", conversations);

              // Transform conversations and fetch patient info for each
              const transformedConversations = await Promise.all(
                conversations.map(async (conv: any) => {
                  console.log("Processing conversation:", conv);
                  console.log("Patient data:", conv.patientId);

                  // Handle both populated and non-populated patientId
                  const patientData = typeof conv.patientId === "object" ? conv.patientId : null;
                  const patientId = patientData?._id || conv.patientId;

                  let patientInfo = {
                    name: "Bệnh nhân",
                    email: "",
                  };

                  // If patientId is just a string, fetch patient info
                  if (typeof conv.patientId === "string") {
                    try {
                      console.log("Fetching patient info for ID:", conv.patientId);
                      const patientResponse = await fetch(
                        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/users/${conv.patientId}`
                      );
                      console.log("Patient API response status:", patientResponse.status);

                      if (patientResponse.ok) {
                        const patient = await patientResponse.json();
                        console.log("Patient data from API:", patient);
                        patientInfo = {
                          name:
                            patient.fullName ||
                            `${patient.firstName || ""} ${patient.lastName || ""}`.trim() ||
                            "Bệnh nhân",
                          email: patient.email || "",
                        };
                        console.log("Processed patient info:", patientInfo);
                      } else {
                        console.error("Failed to fetch patient info:", await patientResponse.text());
                      }
                    } catch (error) {
                      console.error("Error fetching patient info:", error);
                    }
                  } else if (patientData) {
                    patientInfo = {
                      name:
                        patientData.fullName ||
                        `${patientData.firstName || ""} ${patientData.lastName || ""}`.trim() ||
                        "Bệnh nhân",
                      email: patientData.email || "",
                    };
                  }

                  return {
                    id: conv._id,
                    patientId: patientId,
                    patientName: patientInfo.name,
                    patientEmail: patientInfo.email,
                    lastMessage: conv.lastMessage?.content || "Cuộc hội thoại mới",
                    timestamp: conv.updatedAt || conv.createdAt,
                    unread: conv.unreadDoctorCount > 0,
                    unreadCount: conv.unreadDoctorCount || 0,
                    databaseId: conv._id,
                  };
                })
              );

              setPatientConversations(transformedConversations);
              console.log("Loaded conversations from database:", transformedConversations);

              // Auto-select first conversation if none selected
              if (transformedConversations.length > 0 && !selectedChat) {
                setSelectedChat(transformedConversations[0].id);
              }
            }
          }
        } catch (error) {
          console.error("Error loading conversations:", error);
        } finally {
          setConversationsLoading(false);
        }
      }
    };

    loadConversations();
  }, [session]);

  // Load messages for a specific conversation
  const loadConversationMessages = async (conversationId: string, forceReload: boolean = false) => {
    // Check loading state
    const isCurrentlyLoading = loadingMessages[conversationId];
    const hasMessages = conversationMessages[conversationId] && conversationMessages[conversationId].length > 0;

    if (!forceReload && (isCurrentlyLoading || hasMessages)) {
      console.log(`Skipping load for ${conversationId}: loading=${isCurrentlyLoading}, hasMessages=${hasMessages}`);
      return; // Already loaded or loading (unless forced reload)
    }

    setLoadingMessages((prev) => ({ ...prev, [conversationId]: true }));

    try {
      const userId = (session?.user as any)?._id || (session?.user as any)?.id;
      if (userId) {
        console.log(`Loading messages for conversation ${conversationId}...`);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/realtime-chat/conversations/${conversationId}/messages?userId=${userId}&userRole=doctor&limit=100`
        );

        if (response.ok) {
          const messages = await response.json();
          setConversationMessages((prev) => ({
            ...prev,
            [conversationId]: messages,
          }));
          console.log(`Loaded ${messages.length} messages for conversation ${conversationId}:`, messages);
        } else {
          console.error(`Failed to load messages for conversation ${conversationId}:`, response.status);
        }
      }
    } catch (error) {
      console.error("Error loading conversation messages:", error);
    } finally {
      setLoadingMessages((prev) => ({ ...prev, [conversationId]: false }));
    }
  };

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedChat) {
      // Check if this is a different conversation than previous
      const isDifferentConversation = previousSelectedChatRef.current !== selectedChat;

      console.log(`Selected chat changed to: ${selectedChat}, isDifferent: ${isDifferentConversation}`);

      // Always load messages when switching conversations
      // Clear existing messages for the conversation to force fresh load
      if (isDifferentConversation) {
        setConversationMessages((prev) => ({ ...prev, [selectedChat]: [] }));
      }

      loadConversationMessages(selectedChat, isDifferentConversation);

      // Update previous selected chat ref
      previousSelectedChatRef.current = selectedChat;
    } else {
      previousSelectedChatRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat]); // Intentionally excluding loadConversationMessages to avoid infinite loop

  // Polling for new messages
  const pollForNewMessages = useCallback(
    async (conversationId: string) => {
      try {
        const userId = (session?.user as any)?._id || (session?.user as any)?.id;
        if (userId) {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/realtime-chat/conversations/${conversationId}/messages?userId=${userId}&userRole=doctor&limit=100`
          );

          if (response.ok) {
            const newMessages = await response.json();
            const currentMessages = conversationMessages[conversationId] || [];

            // Check if there are new messages
            if (newMessages.length > currentMessages.length) {
              console.log(
                `🔄 Found ${
                  newMessages.length - currentMessages.length
                } new messages for conversation ${conversationId}`
              );
              setConversationMessages((prev) => ({
                ...prev,
                [conversationId]: newMessages,
              }));

              // Update lastMessage in conversations sidebar
              const latestMessage = newMessages[newMessages.length - 1];
              if (latestMessage) {
                setPatientConversations((prev) =>
                  prev.map((conv) =>
                    conv.id === conversationId
                      ? {
                          ...conv,
                          lastMessage: latestMessage.content,
                          timestamp: latestMessage.createdAt || new Date().toISOString(),
                          // Update unreadCount if new messages are from patient (not current doctor)
                          unreadCount:
                            latestMessage.senderRole === "patient"
                              ? (conv.unreadCount || 0) + (newMessages.length - currentMessages.length)
                              : conv.unreadCount,
                          unread:
                            latestMessage.senderRole === "patient"
                              ? (conv.unreadCount || 0) + (newMessages.length - currentMessages.length) > 0
                              : conv.unread,
                        }
                      : conv
                  )
                );
              }
            }
          }
        }
      } catch (error) {
        console.error("Error polling for new messages:", error);
      }
    },
    [session, conversationMessages]
  );

  // Set up polling when conversation is selected
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    if (selectedChat) {
      // Start polling every 1 second for faster realtime
      pollInterval = setInterval(() => {
        pollForNewMessages(selectedChat);
      }, 1000);

      console.log(`📡 Started polling for conversation: ${selectedChat}`);
    }

    // Cleanup polling on conversation change or unmount
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        console.log(`🛑 Stopped polling for conversation: ${selectedChat}`);
      }
    };
  }, [selectedChat, conversationMessages]);

  // Handle new message callback
  const handleNewMessage = (newMessage: any) => {
    if (selectedChat) {
      // Add new message to conversation messages
      setConversationMessages((prev) => ({
        ...prev,
        [selectedChat]: [...(prev[selectedChat] || []), newMessage],
      }));

      // Update lastMessage and timestamp in conversations sidebar
      setPatientConversations((prev) =>
        prev.map((conv) =>
          conv.id === selectedChat
            ? {
                ...conv,
                lastMessage: newMessage.content,
                timestamp: newMessage.createdAt || new Date().toISOString(),
                // Update unreadCount if message is from patient
                unreadCount: newMessage.senderRole === "patient" ? (conv.unreadCount || 0) + 1 : conv.unreadCount,
                unread: newMessage.senderRole === "patient" ? true : conv.unread,
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
        setPatientConversations((prev) =>
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
              userRole: "doctor",
            }),
          }
        );
      }
    } catch (error) {
      console.error("Error marking conversation as read:", error);
    }
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
    <div className="flex overflow-hidden h-full">
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
                {conversationsLoading ? (
                  <div className="p-4 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    Đang tải cuộc hội thoại...
                  </div>
                ) : patientConversations.length > 0 ? (
                  patientConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`p-3 border border-gray-200 rounded-lg cursor-pointer transition-colors mb-2 ${
                        selectedChat === conversation.id ? "bg-blue-50 border-blue-300" : "bg-white hover:bg-gray-50"
                      }`}
                      onClick={() => {
                        setSelectedChat(conversation.id);
                        // Mark as read when conversation is clicked
                        if (conversation.unread) {
                          markConversationAsRead(conversation.id);
                        }
                      }}
                    >
                      <div className="flex items-start">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
                  <span className="font-medium text-red-600">
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
                conversationId={selectedConversation.databaseId || selectedConversation.id}
                currentUserId={
                  (session?.user as { _id?: string; id?: string })?._id ||
                  (session?.user as { _id?: string; id?: string })?.id
                }
                currentUserRole="doctor"
                preloadedMessages={conversationMessages[selectedChat] || []}
                isLoadingMessages={loadingMessages[selectedChat] || false}
                onNewMessage={handleNewMessage}
                onInputFocus={() => {
                  console.log("Doctor input focused, selectedConversation:", selectedConversation);
                  // Mark conversation as read when input is focused
                  if (selectedConversation.unreadCount > 0) {
                    console.log("Calling markConversationAsRead for doctor input focus");
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
