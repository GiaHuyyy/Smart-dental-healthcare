"use client";

import { useState, useRef, useEffect } from "react";
import { aiChatAPI, ChatMessage, DoctorSuggestion } from "@/utils/aiChat";
import { imageAnalysisAPI, ImageAnalysisResult } from "@/utils/imageAnalysis";

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
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResult | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

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
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);

        // Set suggested doctor if available
        if (response.suggestedDoctor) {
          setSuggestedDoctor(response.suggestedDoctor);
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
        }
      } else {
        // For doctor chat - this would integrate with real-time chat system
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
    // Check if it's image analysis suggestion
    if (suggestion.includes("Phân tích ảnh")) {
      handleImageUploadClick();
      return;
    }

    // Extract text from suggestion (remove emoji)
    const cleanText = suggestion.replace(/^[^\w\s]+\s*/, "");

    const userMessage: ChatMessage = {
      role: "user",
      content: cleanText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setShowQuickSuggestions(false);
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
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);

        // Set suggested doctor if available
        if (response.suggestedDoctor) {
          setSuggestedDoctor(response.suggestedDoctor);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn file ảnh");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB");
      return;
    }

    setIsAnalyzingImage(true);
    setIsLoading(true);

    // Add user message showing uploaded image
    const userMessage: ChatMessage = {
      role: "user",
      content: `🖼️ Đã tải lên ảnh: ${file.name}`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      // Call image analysis API
      const analysisResponse = await imageAnalysisAPI.uploadAndAnalyze(file);

      if (!analysisResponse.success || !analysisResponse.data) {
        throw new Error(analysisResponse.error || "Lỗi phân tích ảnh");
      }

      const result = analysisResponse.data;
      setAnalysisResult(result);

      // Use the formatted message from chatbot service
      const analysisMessage = result.message || "🔍 Phân tích ảnh hoàn tất";

      const aiMessage: ChatMessage = {
        role: "assistant",
        content: analysisMessage,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Set suggested doctor if available
      if (result.suggestedDoctor) {
        setSuggestedDoctor(result.suggestedDoctor);
      }

      // Auto-hide quick suggestions after image upload
      setShowQuickSuggestions(false);
    } catch (error) {
      console.error("Error analyzing image:", error);
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: `❌ Lỗi phân tích ảnh: ${
          error instanceof Error ? error.message : "Lỗi không xác định"
        }. Vui lòng thử lại hoặc liên hệ bác sĩ trực tiếp.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsAnalyzingImage(false);
      setIsLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleAnalysisAction = async (action: string) => {
    // Add user message for the action
    const userMessage: ChatMessage = {
      role: "user",
      content: action,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Handle different actions
    let responseMessage = "";

    switch (action) {
      case "Giải thích thêm":
        responseMessage = "Tôi sẽ giải thích chi tiết hơn về kết quả phân tích:\n\n";
        if (analysisResult?.richContent?.sections) {
          analysisResult.richContent.sections.forEach((section) => {
            if (section.heading && section.text) {
              responseMessage += `🔸 **${section.heading}**: ${section.text}\n\n`;
            }
          });
        }
        responseMessage += "Bạn có câu hỏi gì khác về kết quả này không?";
        break;

      case "Đặt lịch khám":
        responseMessage = "📅 **Đặt lịch khám**\n\n";
        responseMessage += "Dựa trên kết quả phân tích, tôi khuyên bạn nên đặt lịch khám sớm nhất có thể.\n\n";
        responseMessage += "Bạn có thể:\n";
        responseMessage += "• Gọi hotline: 0123-456-789\n";
        responseMessage += "• Đặt lịch online qua website\n";
        responseMessage += "• Đến trực tiếp phòng khám\n\n";
        if (suggestedDoctor) {
          responseMessage += `💡 Gợi ý: Nên đặt lịch với ${suggestedDoctor.fullName} - chuyên khoa ${suggestedDoctor.specialty}`;
        }
        break;

      case "Hướng dẫn tự chăm sóc":
      case "Hướng dẫn chăm sóc":
        responseMessage = "🏠 **Hướng dẫn tự chăm sóc tại nhà**\n\n";
        responseMessage += "**Ngay lập tức:**\n";
        responseMessage += "• Súc miệng bằng nước muối ấm (1 thìa muối + 1 cốc nước)\n";
        responseMessage += "• Tránh thức ăn quá nóng, lạnh, cứng\n";
        responseMessage += "• Đánh răng nhẹ nhàng với bàn chải mềm\n\n";
        responseMessage += "**Lâu dài:**\n";
        responseMessage += "• Đánh răng 2 lần/ngày với kem đánh răng có fluoride\n";
        responseMessage += "• Sử dụng chỉ nha khoa hàng ngày\n";
        responseMessage += "• Hạn chế đường và thức ăn có axit\n";
        responseMessage += "• Khám định kỳ 6 tháng/lần\n\n";
        responseMessage += "⚠️ **Lưu ý**: Nếu có biểu hiện đau tăng, sưng, hoặc sốt, hãy đến bác sĩ ngay lập tức!";
        break;

      case "Kết thúc":
        responseMessage = "Cảm ơn bạn đã sử dụng dịch vụ phân tích ảnh của chúng tôi! 🙏\n\n";
        responseMessage += "**Tóm tắt:**\n";
        if (analysisResult?.richContent?.highlights) {
          responseMessage += `• ${analysisResult.richContent.highlights.join("\n• ")}\n\n`;
        }
        responseMessage += "Nếu cần hỗ trợ thêm, đừng ngần ngại liên hệ với chúng tôi.\n\n";
        responseMessage += "💊 Chúc bạn có răng miệng khỏe mạnh!";
        // Reset analysis result
        setAnalysisResult(null);
        break;

      default:
        responseMessage = `Đã nhận được yêu cầu: ${action}. Cảm ơn bạn!`;
    }

    // Add AI response
    const aiMessage: ChatMessage = {
      role: "assistant",
      content: responseMessage,
      timestamp: new Date(),
    };

    setTimeout(() => {
      setMessages((prev) => [...prev, aiMessage]);
    }, 500);
  };

  const quickSuggestions = [
    "😖 Tôi bị đau răng dữ dội",
    "🦷 Răng khôn mọc đau",
    "✨ Tư vấn tẩy trắng răng",
    "🔧 Hỏi về niềng răng",
    "🩸 Nướu bị chảy máu",
    "💊 Tư vấn chăm sóc răng miệng",
    "📸 Phân tích ảnh X-quang/răng",
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

        {/* Analysis Result Simple Display */}
        {analysisResult && (
          <div className="flex justify-start">
            <div className="max-w-lg bg-white border border-gray-200 rounded-lg shadow-sm">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">🔍</span>
                  </div>
                  <h3 className="font-medium text-gray-900">Kết quả phân tích ảnh</h3>
                </div>
              </div>

              {/* Main Content */}
              <div className="p-4">
                <div className="space-y-3">
                  {/* Main Analysis */}
                  {analysisResult.richContent?.analysis && (
                    <div>
                      <span className="font-medium text-gray-900">Chẩn đoán: </span>
                      <span className="text-gray-700">{analysisResult.richContent.analysis}</span>
                    </div>
                  )}

                  {/* Sections */}
                  {analysisResult.richContent?.sections?.map((section, idx) => (
                    <div key={idx}>
                      {section.heading && (
                        <>
                          <span className="font-medium text-gray-900">{section.heading}: </span>
                          <span className="text-gray-700">{section.text}</span>
                        </>
                      )}
                      {section.bullets && (
                        <ul className="mt-1 ml-4 space-y-1">
                          {section.bullets.map((bullet, bulletIdx) => (
                            <li key={bulletIdx} className="text-gray-700 text-sm">
                              • {bullet}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}

                  {/* Recommendations */}
                  {analysisResult.richContent?.recommendations && (
                    <div>
                      <span className="font-medium text-yellow-600">💡 Khuyến nghị</span>
                      <ul className="mt-1 space-y-1">
                        {analysisResult.richContent.recommendations.map((rec, idx) => (
                          <li key={idx} className="text-gray-700 text-sm">
                            • {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons (Right Side) */}
            <div className="ml-3 flex flex-col space-y-2">
              <button
                onClick={() => handleAnalysisAction("Giải thích thêm")}
                className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
              >
                Giải thích thêm
              </button>
              <button
                onClick={() => handleAnalysisAction("Đặt lịch khám")}
                className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
              >
                Đặt lịch khám
              </button>
              <button
                onClick={() => handleAnalysisAction("Hướng dẫn chăm sóc")}
                className="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
              >
                Hướng dẫn tự chăm sóc
              </button>
              <button
                onClick={() => handleAnalysisAction("Kết thúc")}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
              >
                Kết thúc
              </button>
            </div>
          </div>
        )}

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
                  {isAnalyzingImage ? "Đang phân tích ảnh..." : "Đang soạn tin nhắn..."}
                </span>
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
              className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              disabled={isLoading}
            />
          </div>
          <div className="flex flex-col space-y-2">
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ➤
            </button>
            <button
              onClick={handleImageUploadClick}
              disabled={isLoading || isAnalyzingImage}
              className="p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📷
            </button>
          </div>
        </div>

        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />

        {/* Additional actions for doctor chat */}
        {type === "doctor" && (
          <div className="flex flex-wrap gap-2 mt-3">
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
