"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
    addChatMessage,
    clearAppointmentData,
    setAppointmentData,
    setNotes,
    setSelectedDoctor,
    setSymptoms,
    setUrgencyLevel
} from "@/store/slices/appointmentSlice";
import {
    clearAnalysisResult,
    setAnalysisResult,
    setIsAnalyzing,
    setUploadedImage
} from "@/store/slices/imageAnalysisSlice";
import { aiChatAPI, ChatMessage, DoctorSuggestion } from "@/utils/aiChat";
import { sendRequest } from "@/utils/api";
import { imageAnalysisAPI } from "@/utils/imageAnalysis";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface ChatInterfaceProps {
  type: "ai" | "doctor";
  doctorName?: string;
}

export default function ChatInterface({ type, doctorName }: ChatInterfaceProps) {
  // Redux hooks
  const dispatch = useAppDispatch();
  const { analysisResult, uploadedImage, isAnalyzing } = useAppSelector(state => state.imageAnalysis);
  const { selectedDoctor, symptoms, urgencyLevel, chatHistory } = useAppSelector(state => state.appointment);
  
  // Local state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedDoctor, setSuggestedDoctor] = useState<DoctorSuggestion | null>(null);
  const [showQuickSuggestions, setShowQuickSuggestions] = useState(true);
  const [availableDoctors, setAvailableDoctors] = useState<any[]>([]);
  const [doctorsLoaded, setDoctorsLoaded] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load doctors from API
  const loadDoctors = async () => {
    try {
      const res = await sendRequest<any>({
        method: "GET",
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/users/doctors`,
      });
      const list = res?.data || res?.users || res || [];
      setAvailableDoctors(Array.isArray(list) ? list : []);
      setDoctorsLoaded(true);
      console.log('Loaded doctors from API:', list);
    } catch (e) {
      console.log('Error loading doctors from API:', e);
      setAvailableDoctors([]);
      setDoctorsLoaded(true);
    }
  };

  // Validate and set suggested doctor
  const validateAndSetSuggestedDoctor = (suggestedDoctor: DoctorSuggestion) => {
    if (!doctorsLoaded || availableDoctors.length === 0) {
      console.log('No doctors available, cannot validate suggestion');
      return false;
    }

    // Find matching doctor
    const matchingDoctor = availableDoctors.find(doctor => {
      const doctorName = doctor.fullName || doctor.name || '';
      const suggestedName = suggestedDoctor.fullName || '';
      
      // Exact match
      if (doctorName === suggestedName) return true;
      
      // Case-insensitive match
      if (doctorName.toLowerCase() === suggestedName.toLowerCase()) return true;
      
      // Keyword match
      const keywords = suggestedName.split(' ').filter(word => word.length > 1);
      return keywords.some(keyword => 
        doctorName.toLowerCase().includes(keyword.toLowerCase())
      );
    });

    if (matchingDoctor) {
      const validatedDoctor = {
        _id: matchingDoctor._id || matchingDoctor.id,
        fullName: matchingDoctor.fullName || matchingDoctor.name,
        specialty: matchingDoctor.specialty,
        keywords: suggestedDoctor.keywords || [],
        email: matchingDoctor.email,
        phone: matchingDoctor.phone
      };
      
      setSuggestedDoctor(validatedDoctor);
      dispatch(setSelectedDoctor(validatedDoctor));
      console.log('Validated and set doctor:', validatedDoctor.fullName);
      return true;
    } else {
      console.log('Suggested doctor not found in available doctors:', suggestedDoctor.fullName);
      return false;
    }
  };

  // Initialize component
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    if (type === "ai" && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: "Chào bạn! Tôi là trợ lý AI của Smart Dental Healthcare. Tôi có thể giúp bạn tư vấn sơ bộ về các vấn đề răng miệng. Hãy chia sẻ với tôi triệu chứng hoặc thắc mắc của bạn nhé!",
          timestamp: new Date(),
        },
      ]);
    }
  }, [type, messages.length]);

  // Message handlers
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
        // Analyze urgency
        const urgency = await aiChatAPI.analyzeUrgency(inputMessage);
        dispatch(setUrgencyLevel(urgency));

        // Get AI response
        const response = await aiChatAPI.getDentalAdvice(inputMessage, messages);

        const aiMessage: ChatMessage = {
          role: "assistant",
          content: response.message,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);

        // Always set a suggested doctor for testing if none provided
        if (response.suggestedDoctor) {
          validateAndSetSuggestedDoctor(response.suggestedDoctor);
        } else {
          // Fallback doctor for testing
          const fallbackDoctor: DoctorSuggestion = {
            _id: "1",
            fullName: "BS. Nguyễn Văn A",
            specialty: "Nha khoa tổng quát",
            keywords: ["nha khoa", "tổng quát"],
            email: "doctor@example.com",
            phone: "0123-456-789"
          };
          setSuggestedDoctor(fallbackDoctor);
          dispatch(setSelectedDoctor(fallbackDoctor));
          console.log('Set fallback doctor for testing:', fallbackDoctor);
        }

        // Add urgent message if needed
        if (urgency === "high") {
          const urgentMessage: ChatMessage = {
            role: "assistant",
            content: "⚠️ **KHẨN CẤP** ⚠️\n\nTình trạng của bạn có thể cần được xử lý ngay lập tức. Vui lòng liên hệ phòng khám ngay hoặc đến cơ sở y tế gần nhất.\n\n📞 Hotline: 0123-456-789",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, urgentMessage]);
        }
      } else {
        // Doctor chat simulation
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

  const handleQuickSuggestion = async (suggestion: string) => {
    if (suggestion.includes("Phân tích ảnh")) {
      handleImageUploadClick();
      return;
    }

    const cleanText = suggestion.replace(/^[^\w\s]+\s*/, "");
    const userMessage: ChatMessage = {
      role: "user",
      content: cleanText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      if (type === "ai") {
        const urgency = await aiChatAPI.analyzeUrgency(cleanText);
        setUrgencyLevel(urgency);

        const response = await aiChatAPI.getDentalAdvice(cleanText, messages);

        const aiMessage: ChatMessage = {
          role: "assistant",
          content: response.message,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);

        if (response.suggestedDoctor) {
          validateAndSetSuggestedDoctor(response.suggestedDoctor);
        } else {
          // Fallback doctor for testing
          const fallbackDoctor: DoctorSuggestion = {
            _id: "1",
            fullName: "BS. Nguyễn Văn A",
            specialty: "Nha khoa tổng quát",
            keywords: ["nha khoa", "tổng quát"],
            email: "doctor@example.com",
            phone: "0123-456-789"
          };
          setSuggestedDoctor(fallbackDoctor);
          console.log('Set fallback doctor for quick suggestion:', fallbackDoctor);
        }

        if (urgency === "high") {
          const urgentMessage: ChatMessage = {
            role: "assistant",
            content: "⚠️ **KHẨN CẤP** ⚠️\n\nTình trạng của bạn có thể cần được xử lý ngay lập tức. Vui lòng liên hệ phòng khám ngay hoặc đến cơ sở y tế gần nhất.\n\n📞 Hotline: 0123-456-789",
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

  // Image analysis
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn file ảnh");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB");
      return;
    }

    dispatch(setIsAnalyzing(true));
    setIsLoading(true);

    const imageUrl = URL.createObjectURL(file);
    dispatch(setUploadedImage(imageUrl));
    
    const userMessage: ChatMessage = {
      role: "user",
      content: `🖼️ Đã tải lên ảnh: ${file.name}`,
      timestamp: new Date(),
      imageUrl: imageUrl,
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const analysisResponse = await imageAnalysisAPI.uploadAndAnalyze(file);

      if (!analysisResponse.success || !analysisResponse.data) {
        throw new Error(analysisResponse.error || "Lỗi phân tích ảnh");
      }

      const result = analysisResponse.data;
      dispatch(setAnalysisResult(result));

      let analysisMessage = `🔍 **KẾT QUẢ PHÂN TÍCH ẢNH**\n${"═".repeat(50)}\n\n`;

      if (result.richContent) {
        if (result.richContent.analysis) {
          analysisMessage += `📋 **CHẨN ĐOÁN:**\n${result.richContent.analysis}\n\n`;
        }

        if (result.richContent.sections && result.richContent.sections.length > 0) {
          analysisMessage += `📊 **CHI TIẾT PHÂN TÍCH:**\n`;
          result.richContent.sections.forEach((section, index) => {
            if (section.heading && section.text) {
              analysisMessage += `\n${index + 1}. **${section.heading}**\n   ${section.text}\n`;
            }
            if (section.bullets && section.bullets.length > 0) {
              section.bullets.forEach((bullet) => {
                analysisMessage += `   • ${bullet}\n`;
              });
            }
          });
          analysisMessage += "\n";
        }

        if (result.richContent.recommendations) {
          analysisMessage += "💡 **KHUYẾN NGHỊ:**\n";
          result.richContent.recommendations.forEach((rec) => {
            analysisMessage += `• ${rec}\n`;
          });
          analysisMessage += "\n";
        }

        analysisMessage += `🔧 **CÁC HÀNH ĐỘNG TIẾP THEO:**\nSử dụng các nút bên dưới để tương tác`;
      } else {
        analysisMessage += result.message || "Đã hoàn thành phân tích ảnh.";
      }

      const aiMessage: ChatMessage = {
        role: "assistant",
        content: analysisMessage,
        timestamp: new Date(),
        actionButtons: result.richContent &&
          (result.richContent.analysis || result.richContent.recommendations || result.richContent.sections)
            ? ["Giải thích thêm", "Đặt lịch khám", "Hướng dẫn chăm sóc", "Gợi ý bác sĩ", "Kết thúc"]
            : undefined,
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Always set a suggested doctor for image analysis
      if (result.suggestedDoctor) {
        validateAndSetSuggestedDoctor(result.suggestedDoctor);
      } else {
        // Fallback doctor for image analysis - choose based on analysis content
        let specialty = "Nha khoa tổng quát";
        let doctorName = "BS. Nguyễn Văn A";
        
        // Try to determine specialty from analysis content
        if (result.richContent?.analysis) {
          const analysis = result.richContent.analysis.toLowerCase();
          if (analysis.includes("chỉnh nha") || analysis.includes("niềng răng")) {
            specialty = "Chỉnh nha";
            doctorName = "BS. Lê Văn C";
          } else if (analysis.includes("thẩm mỹ") || analysis.includes("tẩy trắng")) {
            specialty = "Thẩm mỹ răng";
            doctorName = "BS. Trần Thị B";
          } else if (analysis.includes("nhổ răng") || analysis.includes("răng khôn")) {
            specialty = "Nhổ răng";
            doctorName = "BS. Phạm Thị D";
          } else if (analysis.includes("tẩy trắng")) {
            specialty = "Tẩy trắng răng";
            doctorName = "BS. Hoàng Văn E";
          }
        }
        
        const fallbackDoctor: DoctorSuggestion = {
          _id: "1",
          fullName: doctorName,
          specialty: specialty,
          keywords: [specialty.toLowerCase()],
          email: "doctor@example.com",
          phone: "0123-456-789"
        };
        setSuggestedDoctor(fallbackDoctor);
        dispatch(setSelectedDoctor(fallbackDoctor));
        console.log('Set fallback doctor for image analysis:', fallbackDoctor);
      }
    } catch (error) {
      console.error("Error analyzing image:", error);
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: `❌ Lỗi phân tích ảnh: ${error instanceof Error ? error.message : "Lỗi không xác định"}. Vui lòng thử lại hoặc liên hệ bác sĩ trực tiếp.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      dispatch(setIsAnalyzing(false));
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Navigation
  const navigateToAppointments = (doctor?: DoctorSuggestion, symptoms?: string) => {
    // Collect comprehensive notes from chat
    let comprehensiveNotes = '';
    
    // Add symptoms if provided
    if (symptoms) {
      comprehensiveNotes += `🔍 TRIỆU CHỨNG: ${symptoms}\n\n`;
    }
    
    // Add urgency level
    if (urgencyLevel && urgencyLevel !== 'low') {
      comprehensiveNotes += `⚠️ MỨC ĐỘ KHẨN CẤP: ${urgencyLevel.toUpperCase()}\n\n`;
    }
    
    // Add analysis result if available
    if (analysisResult) {
      comprehensiveNotes += `🔍 KẾT QUẢ PHÂN TÍCH AI:\n${analysisResult.richContent?.analysis || analysisResult.analysis || 'Đã phân tích hình ảnh X-ray'}\n\n`;
    }
    
    // Add chat history as context
    if (messages.length > 0) {
      comprehensiveNotes += `💬 LỊCH SỬ CHAT:\n`;
      messages.forEach((msg, index) => {
        if (msg.role === 'user') {
          comprehensiveNotes += `Bệnh nhân: ${msg.content}\n`;
        } else if (msg.role === 'assistant') {
          comprehensiveNotes += `AI: ${msg.content}\n`;
        }
        if (index < messages.length - 1) comprehensiveNotes += '\n';
      });
    }
    
    // Store data in Redux
    const appointmentData = {
      doctorId: doctor?._id || '',
      doctorName: doctor?.fullName || '',
      specialty: doctor?.specialty || '',
      symptoms: symptoms || '',
      urgency: urgencyLevel,
      notes: comprehensiveNotes,
      hasImageAnalysis: !!analysisResult,
      // Thêm thông tin hình ảnh và phân tích
      uploadedImage: uploadedImage || null,
      analysisResult: analysisResult || null,
      imageUrl: uploadedImage || null
    };
    
    dispatch(setAppointmentData(appointmentData));
    dispatch(setSymptoms(symptoms || ''));
    dispatch(setNotes(comprehensiveNotes));
    
    // Add chat messages to history
    const userMessages = messages.filter(msg => msg.role === 'user');
    userMessages.forEach(msg => {
      dispatch(addChatMessage(msg.content));
    });
    
    // Navigate to appointments page
    router.push('/patient/appointments');
  };

  // Action handlers
  const handleAnalysisActionClick = async (action: string) => {
    if (action.toLowerCase().includes("kết thúc")) {
      const userMessage: ChatMessage = {
        role: "user",
        content: action,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      const goodbyeMessage: ChatMessage = {
        role: "assistant",
        content: "Cảm ơn bạn đã sử dụng dịch vụ tư vấn nha khoa! 🙏\n\nChúc bạn có răng miệng khỏe mạnh! 💊\n\nChat sẽ được xóa sau 3 giây...",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, goodbyeMessage]);

      setTimeout(() => {
        setMessages([]);
        dispatch(clearAnalysisResult());
        dispatch(clearAppointmentData());
        setShowQuickSuggestions(true);
        setSuggestedDoctor(null);
      }, 3000);

      return;
    }

    if (action.toLowerCase().includes("đặt lịch khám")) {
      const symptoms = messages
        .filter(msg => msg.role === "user")
        .map(msg => msg.content)
        .join("; ");
      
      navigateToAppointments(suggestedDoctor || undefined, symptoms);
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: action,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    setIsLoading(true);

    try {
      let promptMessage = "";

      const analysisContext = analysisResult?.richContent
        ? `Dựa trên kết quả phân tích ảnh nha khoa với chẩn đoán: "${analysisResult.richContent.analysis}". `
        : "";

      if (action.toLowerCase().includes("giải thích thêm")) {
        promptMessage = `${analysisContext}Tôi muốn hiểu rõ hơn về kết quả phân tích ảnh nha khoa. Hãy giải thích chi tiết về tình trạng răng miệng, nguyên nhân có thể, và mức độ nghiêm trọng.`;
      } else if (action.toLowerCase().includes("hướng dẫn chăm sóc")) {
        promptMessage = `${analysisContext}Tôi muốn được hướng dẫn cách chăm sóc răng miệng tại nhà để cải thiện tình trạng hiện tại. Hãy đưa ra lời khuyên cụ thể và thực tế.`;
      } else if (action.toLowerCase().includes("gợi ý bác sĩ")) {
        promptMessage = `${analysisContext}Tôi muốn được gợi ý bác sĩ nha khoa chuyên khoa phù hợp với tình trạng của mình. Hãy tư vấn loại chuyên khoa cần thiết và tiêu chí chọn bác sĩ.`;
      } else {
        promptMessage = action;
      }

      const aiResponse = await aiChatAPI.getDentalAdvice(promptMessage, messages);

      const aiMessage: ChatMessage = {
        role: "assistant",
        content: aiResponse.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      if (aiResponse.suggestedDoctor) {
        validateAndSetSuggestedDoctor(aiResponse.suggestedDoctor);
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

  // UI helpers
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getButtonIcon = (buttonText: string) => {
    if (buttonText.includes("Giải thích")) return "💡";
    if (buttonText.includes("Đặt lịch")) return "📅";
    if (buttonText.includes("Hướng dẫn")) return "🏠";
    if (buttonText.includes("Gợi ý bác sĩ")) return "👨‍⚕️";
    if (buttonText.includes("Kết thúc")) return "✅";
    return "🔧";
  };

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
      <div className={`inline-flex items-center px-2 py-1 text-xs font-medium border rounded-full ${colors[urgencyLevel]}`}>
        {labels[urgencyLevel]}
      </div>
    );
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

  // Render doctor suggestion section
  const renderDoctorSuggestion = () => {
    if (type !== "ai") return null;

    console.log('renderDoctorSuggestion called:', {
      suggestedDoctor,
      doctorsLoaded,
      availableDoctorsLength: availableDoctors.length,
      type
    });

    // No doctors available
    if (doctorsLoaded && availableDoctors.length === 0) {
      return (
        <div className="p-4 bg-yellow-50 border-t border-yellow-200">
          <div className="flex items-start">
            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-xs">⚠️</span>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-yellow-900">Thông báo</h4>
              <p className="text-sm text-yellow-800">
                Hiện tại chưa có bác sĩ nào trong hệ thống. Vui lòng liên hệ trực tiếp với phòng khám để được tư vấn.
              </p>
              <div className="mt-2">
                <button className="text-sm bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600">
                  📞 Liên hệ phòng khám
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // AI suggested doctor but not available
    if (suggestedDoctor && doctorsLoaded && availableDoctors.length === 0) {
      return (
        <div className="p-4 bg-orange-50 border-t border-orange-200">
          <div className="flex items-start">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-xs">⚠️</span>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-orange-900">Thông báo</h4>
              <p className="text-sm text-orange-800">
                AI đã gợi ý bác sĩ <strong>{suggestedDoctor.fullName}</strong> nhưng hiện tại chưa có bác sĩ nào trong hệ thống.
              </p>
              <p className="text-sm text-orange-700 mt-1">
                Vui lòng liên hệ trực tiếp với phòng khám để được tư vấn và đặt lịch.
              </p>
              <div className="mt-2 flex space-x-2">
                <button className="text-sm bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600">
                  📞 Liên hệ phòng khám
                </button>
                <button 
                  className="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                  onClick={() => {
                    const symptoms = messages
                      .filter(msg => msg.role === "user")
                      .map(msg => msg.content)
                      .join("; ");
                    navigateToAppointments(undefined, symptoms);
                  }}
                >
                  📅 Đặt lịch khám
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Valid doctor suggestion - show even if doctors not loaded yet
    if (suggestedDoctor) {
      return (
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
                <button 
                  className="mt-2 text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                  onClick={() => {
                    const symptoms = messages
                      .filter(msg => msg.role === "user")
                      .map(msg => msg.content)
                      .join("; ");
                    navigateToAppointments(suggestedDoctor || undefined, symptoms);
                  }}
                >
                  Đặt lịch khám
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Show loading state while doctors are being loaded (only if no suggested doctor)
    if (!doctorsLoaded && !suggestedDoctor) {
      return (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
            <span className="text-sm text-gray-600">Đang tải danh sách bác sĩ...</span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex-1 flex flex-col h-full max-h-full">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
              type === "ai" ? "bg-blue-500" : "bg-green-500"
            }`}>
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

            <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 flex items-center">
              📞 <span className="ml-1">Gọi điện</span>
            </button>
            <button 
              className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200 flex items-center"
              onClick={() => {
                const symptoms = messages
                  .filter(msg => msg.role === "user")
                  .map(msg => msg.content)
                  .join("; ");
                navigateToAppointments(suggestedDoctor || undefined, symptoms);
              }}
            >
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
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              message.role === "user"
                ? "bg-blue-500 text-white"
                : message.actionButtons && message.actionButtons.length > 0
                ? "bg-white text-gray-900 border border-gray-200 shadow-lg"
                : "bg-gray-100 text-gray-900"
            }`}>
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
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                </div>
                <span className="text-sm text-gray-600">
                  {isAnalyzing ? "Đang phân tích ảnh..." : "Đang soạn tin nhắn..."}
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

      {/* Doctor Suggestion Section */}
      {renderDoctorSuggestion()}

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
              disabled={isLoading || isAnalyzing}
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
