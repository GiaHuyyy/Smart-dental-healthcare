"use client";

import { useState, useRef, useEffect } from "react";
import { aiChatAPI, ChatMessage, DoctorSuggestion } from "@/utils/aiChat";

interface ChatInterfaceProps {
  type: "ai" | "doctor";
  doctorName?: string;
}

export default function ChatInterface({ type, doctorName }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedDoctor, setSuggestedDoctor] = useState<DoctorSuggestion | null>(null);
  const [urgencyLevel, setUrgencyLevel] = useState<"high" | "medium" | "low">("low");
  const [showQuickSuggestions, setShowQuickSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    if (type === "ai" && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content:
            "Chào bạn! Tôi là trợ lý AI của Smart Dental Healthcare. Tôi có thể giúp bạn tư vấn sơ bộ về các vấn đề răng miệng. Hãy chia sẻ với tôi triệu chứng hoặc thắc mắc của bạn nhé!",
          timestamp: new Date(),
        },
      ]);
    }
  }, [type, messages.length]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    // setShowQuickSuggestions(false); // Hide suggestions after first message

    try {
      if (type === "ai") {
        // Analyze urgency first
        const urgency = await aiChatAPI.analyzeUrgency(inputMessage);
        setUrgencyLevel(urgency);

        // Get AI response
        const response = await aiChatAPI.getDentalAdvice(inputMessage, messages);

        const aiMessage: ChatMessage = {
          role: "assistant",
          content: response.message,
          timestamp: response.timestamp ? new Date(response.timestamp) : new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);
        setSuggestedDoctor(response.suggestedDoctor);

        // Show urgency warning if high
        if (urgency === "high") {
          const urgentMessage: ChatMessage = {
            role: "assistant",
            content:
              "⚠️ **KHẨN CẤP** ⚠️\n\nTình trạng của bạn có thể cần được xử lý ngay lập tức. Vui lòng liên hệ phòng khám ngay hoặc đến cơ sở y tế gần nhất.\n\n📞 Hotline: 0123-456-789",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, urgentMessage]);
        }
      } else {
        // For doctor chat - this would integrate with real-time chat system
        // For now, just echo the message
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickSuggestion = async (suggestion: string) => {
    // Extract text from suggestion (remove emoji)
    const cleanText = suggestion.replace(/^[^\w\s]+\s*/, "");

    const userMessage: ChatMessage = {
      role: "user",
      content: cleanText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    // setShowQuickSuggestions(false);
    setIsLoading(true);

    try {
      if (type === "ai") {
        // Analyze urgency first
        const urgency = await aiChatAPI.analyzeUrgency(cleanText);
        setUrgencyLevel(urgency);

        // Get AI response
        const response = await aiChatAPI.getDentalAdvice(cleanText, messages);

        const aiMessage: ChatMessage = {
          role: "assistant",
          content: response.message,
          timestamp: response.timestamp ? new Date(response.timestamp) : new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);
        setSuggestedDoctor(response.suggestedDoctor);

        // Show urgency warning if high
        if (urgency === "high") {
          const urgentMessage: ChatMessage = {
            role: "assistant",
            content:
              "⚠️ **KHẨN CẤP** ⚠️\n\nTình trạng của bạn có thể cần được xử lý ngay lập tức. Vui lòng liên hệ phòng khám ngay hoặc đến cơ sở y tế gần nhất.\n\n📞 Hotline: 0123-456-789",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, urgentMessage]);
        }
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

  const quickSuggestions = [
    "😖 Tôi bị đau răng dữ dội",
    "🦷 Răng khôn mọc đau",
    "✨ Tư vấn tẩy trắng răng",
    "🔧 Hỏi về niềng răng",
    "🩸 Nướu bị chảy máu",
    "💊 Tư vấn chăm sóc răng miệng",
  ];

  const getUrgencyBadge = () => {
    const colors = {
      high: "bg-red-100 text-red-800 border-red-300",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
      low: "bg-green-100 text-green-800 border-green-300",
    };

    const labels = {
      high: "Khẩn cấp",
      medium: "Trung bình",
      low: "Thấp",
    };

    return (
      <div
        className={`inline-flex items-center px-2 py-1 text-xs font-medium border rounded-full ${colors[urgencyLevel]}`}
      >
        {labels[urgencyLevel]}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full max-h-full">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                type === "ai" ? "bg-blue-500" : "bg-green-500"
              }`}
            >
              <span className="text-white text-sm">{type === "ai" ? "🤖" : "BS"}</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{type === "ai" ? "AI Tư vấn" : doctorName}</h3>
              <p className="text-sm text-gray-600">
                {type === "ai" ? (
                  <>
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                    Tư vấn sơ bộ về nha khoa
                  </>
                ) : (
                  <>
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                    Đang hoạt động
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {type === "ai" && messages.length > 2 && getUrgencyBadge()}

            {/* Common action buttons for both AI and Doctor */}
            <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 flex items-center">
              📞 <span className="ml-1">Gọi điện</span>
            </button>
            <button className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200 flex items-center">
              📅 <span className="ml-1">Đặt lịch</span>
            </button>

            {type === "ai" && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">Miễn phí</span>
            )}
          </div>
        </div>
      </div>

      {/* Messages - Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 min-h-0">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === "user" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900"
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div className={`text-xs mt-1 ${message.role === "user" ? "text-blue-100" : "text-gray-500"}`}>
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
            </div>
          </div>
        )}

        {/* Quick Suggestions */}
        {type === "ai" && showQuickSuggestions && (
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
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Doctor Suggestion */}
      {type === "ai" && suggestedDoctor && (
        <div className="p-4 bg-blue-50 border-t border-blue-200">
          <div className="flex items-start">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-xs">BS</span>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-blue-900">Bác sĩ được đề xuất</h4>
              <p className="text-sm text-blue-800 font-medium">{suggestedDoctor.fullName}</p>
              <p className="text-sm text-blue-700">{suggestedDoctor.specialty}</p>
              {/* button liên hệ và button xem hồ sơ 2 màu cho phù hợp */}
              <div className="flex space-x-2">
                <button className="mt-2 text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">
                  Liên hệ
                </button>
                <button className="mt-2 text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">
                  Xem hồ sơ
                </button>
                <button className="mt-2 text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">
                  Đặt lịch khám
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
        <div className="flex space-x-3">
          <div className="flex-1">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={type === "ai" ? "Mô tả triệu chứng của bạn..." : "Nhập tin nhắn..."}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
              disabled={isLoading}
            />
          </div>
          <div className="flex flex-col space-y-1">
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Gửi
            </button>
            <button className="px-4 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-xs">
              📎 File
            </button>
          </div>
        </div>

        {/* Quick actions for doctor chat */}
        {type === "doctor" && (
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200">
              Cần đặt lịch khám
            </button>
            <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200">
              Cần chụp X-quang
            </button>
            <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200">
              Kê đơn thuốc
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
