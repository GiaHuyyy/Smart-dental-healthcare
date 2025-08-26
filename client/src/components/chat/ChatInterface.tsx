"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
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
        // All messages go through AI - no more hardcoded analysis actions
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

    // Create image preview URL
    const imageUrl = URL.createObjectURL(file);

    // Add user message showing uploaded image with preview
    const userMessage: ChatMessage = {
      role: "user",
      content: `🖼️ Đã tải lên ảnh: ${file.name}`,
      timestamp: new Date(),
      imageUrl: imageUrl, // Add image URL to message
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

      // Create a formatted analysis message that includes rich content with better styling
      let analysisMessage = `🔍 **KẾT QUẢ PHÂN TÍCH ẢNH**\n${"═".repeat(50)}\n\n`;

      // Add rich content to the message if available
      if (result.richContent) {
        // Add diagnosis with styling
        if (result.richContent.analysis) {
          analysisMessage += `📋 **CHẨN ĐOÁN:**\n`;
          analysisMessage += `${result.richContent.analysis}\n\n`;
        }

        // Add sections with better formatting
        if (result.richContent.sections && result.richContent.sections.length > 0) {
          analysisMessage += `📊 **CHI TIẾT PHÂN TÍCH:**\n`;
          result.richContent.sections.forEach((section, index) => {
            if (section.heading && section.text) {
              analysisMessage += `\n${index + 1}. **${section.heading}**\n`;
              analysisMessage += `   ${section.text}\n`;
            }
            if (section.bullets && section.bullets.length > 0) {
              section.bullets.forEach((bullet) => {
                analysisMessage += `   • ${bullet}\n`;
              });
            }
          });
          analysisMessage += "\n";
        }

        // Add recommendations
        if (result.richContent.recommendations) {
          analysisMessage += "**� Khuyến nghị:**\n";
          result.richContent.recommendations.forEach((rec) => {
            analysisMessage += `• ${rec}\n`;
          });
          analysisMessage += "\n";
        }

        // Show action buttons only when we have meaningful analysis results
        analysisMessage += `🔧 **CÁC HÀNH ĐỘNG TIẾP THEO:**\n`;
        analysisMessage += `Sử dụng các nút bên dưới để tương tác`;
      } else {
        // If no rich content, show basic message from API
        analysisMessage += result.message || "Đã hoàn thành phân tích ảnh.";
      }

      const aiMessage: ChatMessage = {
        role: "assistant",
        content: analysisMessage,
        timestamp: new Date(),
        // Only show action buttons if we have rich content from AI analysis
        actionButtons:
          result.richContent &&
          (result.richContent.analysis || result.richContent.recommendations || result.richContent.sections)
            ? ["Giải thích thêm", "Đặt lịch khám", "Hướng dẫn chăm sóc", "Gợi ý bác sĩ", "Kết thúc"]
            : undefined,
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Set suggested doctor if available
      if (result.suggestedDoctor) {
        setSuggestedDoctor(result.suggestedDoctor);
      }

      // Auto-hide quick suggestions after image upload
    //   setShowQuickSuggestions(false);
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

  // Handle action button clicks
  const handleAnalysisActionClick = async (action: string) => {
    // Handle "Kết thúc" action specially - show confirmation then clear all messages
    if (action.toLowerCase().includes("kết thúc")) {
      // Add user message first
      const userMessage: ChatMessage = {
        role: "user",
        content: action,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Add goodbye message
      const goodbyeMessage: ChatMessage = {
        role: "assistant",
        content:
          "Cảm ơn bạn đã sử dụng dịch vụ tư vấn nha khoa! 🙏\n\nChúc bạn có răng miệng khỏe mạnh! 💊\n\nChat sẽ được xóa sau 3 giây...",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, goodbyeMessage]);

      // Clear everything after 3 seconds
      setTimeout(() => {
        setMessages([]);
        setAnalysisResult(null);
        setShowQuickSuggestions(true);
        setSuggestedDoctor(null);
        setUrgencyLevel("low");
      }, 3000);

      return;
    }

    // Add user message for the action
    const userMessage: ChatMessage = {
      role: "user",
      content: action,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    setIsLoading(true);

    try {
      // For analysis-related actions, use AI to generate intelligent responses
      let promptMessage = "";

      // Include analysis context if available
      const analysisContext = analysisResult?.richContent
        ? `Dựa trên kết quả phân tích ảnh nha khoa với chẩn đoán: "${analysisResult.richContent.analysis}". `
        : "";

      if (action.toLowerCase().includes("giải thích thêm")) {
        promptMessage = `${analysisContext}Tôi muốn hiểu rõ hơn về kết quả phân tích ảnh nha khoa. Hãy giải thích chi tiết về tình trạng răng miệng, nguyên nhân có thể, và mức độ nghiêm trọng.`;
      } else if (action.toLowerCase().includes("đặt lịch khám")) {
        promptMessage = `${analysisContext}Tôi muốn đặt lịch khám nha khoa. Hãy tư vấn loại hình điều trị cần thiết, độ ưu tiên, và hướng dẫn quy trình đặt lịch khám.`;
      } else if (action.toLowerCase().includes("hướng dẫn chăm sóc")) {
        promptMessage = `${analysisContext}Tôi muốn được hướng dẫn cách chăm sóc răng miệng tại nhà để cải thiện tình trạng hiện tại. Hãy đưa ra lời khuyên cụ thể và thực tế.`;
      } else if (action.toLowerCase().includes("gợi ý bác sĩ")) {
        promptMessage = `${analysisContext}Tôi muốn được gợi ý bác sĩ nha khoa chuyên khoa phù hợp với tình trạng của mình. Hãy tư vấn loại chuyên khoa cần thiết và tiêu chí chọn bác sĩ.`;
      } else {
        promptMessage = action; // Fallback to the action text itself
      }

      // Get AI response
      const aiResponse = await aiChatAPI.getDentalAdvice(promptMessage, messages);

      const aiMessage: ChatMessage = {
        role: "assistant",
        content: aiResponse.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Update suggested doctor if provided
      if (aiResponse.suggestedDoctor) {
        setSuggestedDoctor(aiResponse.suggestedDoctor);
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

  // Get icon for each button
  const getButtonIcon = (buttonText: string) => {
    if (buttonText.includes("Giải thích")) return "💡";
    if (buttonText.includes("Đặt lịch")) return "📅";
    if (buttonText.includes("Hướng dẫn")) return "🏠";
    if (buttonText.includes("Gợi ý bác sĩ")) return "👨‍⚕️";
    if (buttonText.includes("Kết thúc")) return "✅";
    return "🔧";
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
                message.role === "user"
                  ? "bg-blue-500 text-white"
                  : message.actionButtons && message.actionButtons.length > 0
                  ? "bg-white text-gray-900 border border-gray-200 shadow-lg"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {/* Show image if available */}
              {message.imageUrl && (
                <div className="mb-2">
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
              <div className="whitespace-pre-wrap">{message.content}</div>

              {/* Show action buttons if available */}
              {message.actionButtons && message.actionButtons.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
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
