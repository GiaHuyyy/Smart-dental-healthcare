"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAiChatHistory } from "@/hooks/useAiChatHistory";

interface AiChatSession {
  _id: string;
  userId: string;
  symptoms: string[];
  urgencyLevel: "low" | "medium" | "high";
  status: "active" | "completed";
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  sessionSummary?: string;
}

interface AiChatMessage {
  _id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  urgencyLevel: "low" | "medium" | "high";
  symptoms: string[];
  hasImages: boolean;
  imageAnalysis?: {
    findings: string[];
    recommendations: string[];
    severity: string;
  };
  createdAt: string;
}

export default function AiChatHistoryPage() {
  const { data: session } = useSession();
  const { getUserSessions, getSessionMessages, getSessionAnalytics } = useAiChatHistory();

  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);

  // Load user sessions
  useEffect(() => {
    const loadSessions = async () => {
      if (!session?.user) return;

      try {
        setLoading(true);
        const userSessions = await getUserSessions();
        setSessions(userSessions);

        // Load analytics
        const userAnalytics = await getSessionAnalytics();
        setAnalytics(userAnalytics);
      } catch (error) {
        console.error("Failed to load AI chat sessions:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [session, getUserSessions, getSessionAnalytics]);

  // Load messages for selected session
  const loadSessionMessages = async (sessionId: string) => {
    try {
      setMessageLoading(true);
      setSelectedSession(sessionId);
      const sessionMessages = await getSessionMessages(sessionId);
      setMessages(sessionMessages);
    } catch (error) {
      console.error("Failed to load session messages:", error);
    } finally {
      setMessageLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "text-red-600 bg-red-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "low":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-blue-600 bg-blue-100";
      case "active":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN");
  };

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Bạn cần đăng nhập để xem lịch sử chat AI</h2>
          <p className="text-gray-600">Vui lòng đăng nhập để truy cập lịch sử tư vấn AI của bạn.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Lịch sử tư vấn AI</h1>
            <p className="text-gray-600">
              Xem lại các cuộc tư vấn AI trước đây và theo dõi quá trình chăm sóc sức khỏe răng miệng của bạn.
            </p>
          </div>

          {/* Analytics Summary */}
          {analytics && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Thống kê tổng quan</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-800">Tổng phiên chat</h3>
                  <p className="text-2xl font-bold text-blue-900">{analytics.totalSessions}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-green-800">Tin nhắn đã gửi</h3>
                  <p className="text-2xl font-bold text-green-900">{analytics.totalMessages}</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-yellow-800">Ảnh đã phân tích</h3>
                  <p className="text-2xl font-bold text-yellow-900">{analytics.totalImagesAnalyzed}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-red-800">Trường hợp khẩn cấp</h3>
                  <p className="text-2xl font-bold text-red-900">{analytics.urgentSessions}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sessions List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Danh sách phiên chat ({sessions.length})</h2>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {sessions.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      <p>Chưa có lịch sử chat AI nào</p>
                      <p className="text-sm mt-2">Hãy bắt đầu chat với AI để nhận tư vấn về sức khỏe răng miệng!</p>
                    </div>
                  ) : (
                    sessions.map((session) => (
                      <div
                        key={session._id}
                        onClick={() => loadSessionMessages(session._id)}
                        className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedSession === session._id ? "bg-blue-50 border-blue-200" : ""
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(
                              session.urgencyLevel
                            )}`}
                          >
                            {session.urgencyLevel === "high" && "Khẩn cấp"}
                            {session.urgencyLevel === "medium" && "Trung bình"}
                            {session.urgencyLevel === "low" && "Thấp"}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}
                          >
                            {session.status === "completed" ? "Hoàn thành" : "Đang chat"}
                          </span>
                        </div>

                        <div className="mb-2">
                          <p className="text-sm text-gray-600">
                            Triệu chứng: {session.symptoms.length > 0 ? session.symptoms.join(", ") : "Không có"}
                          </p>
                          <p className="text-xs text-gray-500">{session.messageCount} tin nhắn</p>
                        </div>

                        <p className="text-xs text-gray-400">{formatDate(session.createdAt)}</p>

                        {session.sessionSummary && (
                          <p className="text-xs text-gray-600 mt-2 italic">
                            "{session.sessionSummary.substring(0, 60)}..."
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedSession ? "Chi tiết cuộc chat" : "Chọn một phiên chat để xem"}
                  </h2>
                </div>

                <div className="h-96 overflow-y-auto p-6">
                  {messageLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : selectedSession ? (
                    messages.length === 0 ? (
                      <p className="text-center text-gray-500">Không có tin nhắn nào trong phiên này</p>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <div
                            key={message._id}
                            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                message.role === "user" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>

                              {message.symptoms.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs opacity-75">Triệu chứng: {message.symptoms.join(", ")}</p>
                                </div>
                              )}

                              {message.hasImages && (
                                <div className="mt-2">
                                  <span className="text-xs opacity-75">📸 Có ảnh đính kèm</span>
                                </div>
                              )}

                              {message.imageAnalysis && (
                                <div className="mt-2 text-xs opacity-75">
                                  <p>🔍 Phân tích ảnh:</p>
                                  {message.imageAnalysis.findings.length > 0 && (
                                    <p>• Phát hiện: {message.imageAnalysis.findings.join(", ")}</p>
                                  )}
                                  {message.imageAnalysis.recommendations.length > 0 && (
                                    <p>• Khuyến nghị: {message.imageAnalysis.recommendations.join(", ")}</p>
                                  )}
                                </div>
                              )}

                              <p className="text-xs opacity-75 mt-1">{formatDate(message.createdAt)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <p className="text-lg mb-2">💬</p>
                        <p>Chọn một phiên chat từ danh sách bên trái để xem chi tiết</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
