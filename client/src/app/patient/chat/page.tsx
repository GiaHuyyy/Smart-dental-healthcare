"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ChatInterface from "@/components/chat/ChatInterface";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

export default function PatientChatPage() {
  const [selectedChat, setSelectedChat] = useState<"ai" | string>("ai");
  const [showSidebar, setShowSidebar] = useState(true);
  const [doctorConversations, setDoctorConversations] = useState<any[]>([]);
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
              `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/realtime-chat/conversations?userId=${userId}&userRole=patient`
            );

            if (response.ok) {
              const conversations = await response.json();
              console.log("Raw conversations from API:", conversations);

              // Transform conversations and fetch doctor info for each
              const transformedConversations = await Promise.all(
                conversations.map(async (conv: any) => {
                  console.log("Processing conversation:", conv);
                  console.log("Doctor data:", conv.doctorId);

                  // Handle both populated and non-populated doctorId
                  const doctorData = typeof conv.doctorId === "object" ? conv.doctorId : null;
                  const doctorId = doctorData?._id || conv.doctorId;

                  let doctorInfo = {
                    name: "Bác sĩ",
                    specialty: "Nha khoa tổng quát",
                  };

                  // If doctorId is just a string, fetch doctor info
                  if (typeof conv.doctorId === "string") {
                    try {
                      console.log("Fetching doctor info for ID:", conv.doctorId);
                      const doctorResponse = await fetch(
                        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/users/${conv.doctorId}`
                      );
                      console.log("Doctor API response status:", doctorResponse.status);

                      if (doctorResponse.ok) {
                        const doctor = await doctorResponse.json();
                        console.log("Doctor data from API:", doctor);
                        doctorInfo = {
                          name:
                            doctor.fullName || `${doctor.firstName || ""} ${doctor.lastName || ""}`.trim() || "Bác sĩ",
                          specialty: doctor.specialty || doctor.specialization || "Nha khoa tổng quát",
                        };
                        console.log("Processed doctor info:", doctorInfo);
                      } else {
                        console.error("Failed to fetch doctor info:", await doctorResponse.text());
                      }
                    } catch (error) {
                      console.error("Error fetching doctor info:", error);
                    }
                  } else if (doctorData) {
                    doctorInfo = {
                      name:
                        doctorData.fullName ||
                        `${doctorData.firstName || ""} ${doctorData.lastName || ""}`.trim() ||
                        "Bác sĩ",
                      specialty: doctorData.specialty || doctorData.specialization || "Nha khoa tổng quát",
                    };
                  }

                  return {
                    id: conv._id,
                    doctorId: doctorId,
                    doctorName: doctorInfo.name,
                    specialty: doctorInfo.specialty,
                    lastMessage: conv.lastMessage?.content || "Cuộc hội thoại mới",
                    timestamp: conv.updatedAt || conv.createdAt,
                    unread: conv.unreadPatientCount > 0,
                    unreadCount: conv.unreadPatientCount || 0,
                    databaseId: conv._id,
                  };
                })
              );

              setDoctorConversations(transformedConversations);
              console.log("Loaded conversations from database:", transformedConversations);
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
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/realtime-chat/conversations/${conversationId}/messages?userId=${userId}&userRole=patient&limit=100`
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
    if (selectedChat !== "ai" && selectedChat) {
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
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/realtime-chat/conversations/${conversationId}/messages?userId=${userId}&userRole=patient&limit=100`
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
                setDoctorConversations((prev) =>
                  prev.map((conv) =>
                    conv.id === conversationId
                      ? {
                          ...conv,
                          lastMessage: latestMessage.content,
                          timestamp: latestMessage.createdAt || new Date().toISOString(),
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

    if (selectedChat && selectedChat !== "ai") {
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
  }, [selectedChat, pollForNewMessages]);

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
              }
            : conv
        )
      );

      console.log("Added new message to conversation:", newMessage);
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
    <div className="flex overflow-hidden h-full">
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
                      ? "bg-blue-50 border-blue-200 border-l-blue-500"
                      : "bg-gray-50 border-gray-200 hover:bg-gray-100 border-l-gray-300"
                  }`}
                  onClick={() => setSelectedChat("ai")}
                >
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-sm">🤖</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">AI Tư vấn</h4>
                      <p className="text-sm text-gray-600 truncate">Tư vấn nha khoa miễn phí 24/7</p>
                      <p className="text-xs text-gray-500 mt-1">Luôn có sẵn</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  </div>
                </div>

                {/* Doctor conversations from database */}
                {conversationsLoading ? (
                  <div className="p-4 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    Đang tải cuộc hội thoại...
                  </div>
                ) : doctorConversations.length > 0 ? (
                  doctorConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`p-3 border border-gray-200 rounded-lg cursor-pointer transition-colors mb-2 ${
                        selectedChat === conversation.id ? "bg-blue-50 border-blue-300" : "bg-white hover:bg-gray-50"
                      }`}
                      onClick={() => setSelectedChat(conversation.id)}
                    >
                      <div className="flex items-start">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                          <span className="text-white text-sm">👨‍⚕️</span>
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
            <button
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm transition-colors"
              onClick={() => setSelectedChat("ai")}
            >
              + Tư vấn mới với AI
            </button>
          </div>
        </div>
      )}

      {/* Main Chat Area - Takes remaining space */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header with Sidebar Toggle */}
        <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {/* Sidebar Toggle Button - Always visible */}
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg mr-3 transition-colors"
                title={showSidebar ? "Ẩn sidebar" : "Hiện sidebar"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Chat Title */}
              <div className="flex items-center">
                {selectedChat === "ai" ? (
                  <>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3 bg-blue-500">
                      <span className="text-white text-sm">🤖</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">AI Tư vấn</h3>
                      <p className="text-sm text-gray-600">
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                        Tư vấn sơ bộ về nha khoa
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {(() => {
                      const selectedConversation = doctorConversations.find((conv) => conv.id === selectedChat);
                      console.log("Selected conversation:", selectedConversation);
                      return selectedConversation ? (
                        <>
                          <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3 bg-green-500">
                            <span className="text-white text-sm">👨‍⚕️</span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{selectedConversation.doctorName}</h3>
                            <p className="text-sm text-gray-600">
                              <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mr-1"></span>
                              {selectedConversation.specialty}
                            </p>
                          </div>
                        </>
                      ) : null;
                    })()}
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">{/* Removed note about 24h chat history limit */}</div>
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
