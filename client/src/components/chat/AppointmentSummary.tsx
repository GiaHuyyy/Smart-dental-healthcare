"use client";

import { useAppSelector } from "@/store/hooks";
import { Stethoscope, FileText, AlertTriangle, Search, MessageSquare, Lightbulb } from "lucide-react";

export default function AppointmentSummary() {
  const { appointmentData, selectedDoctor, symptoms, urgencyLevel, chatHistory } = useAppSelector(
    (state: any) => state.appointment
  );
  const { analysisResult } = useAppSelector((state: any) => state.imageAnalysis);

  if (!appointmentData && !selectedDoctor && !symptoms && !analysisResult) {
    return null;
  }

  const hasData = appointmentData || selectedDoctor || symptoms || analysisResult;

  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
      <div className="flex items-start">
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
          <FileText className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-green-900 mb-2">Thông tin từ chatbot</h4>

          <div className="space-y-2 text-sm">
            {selectedDoctor && (
              <div className="flex items-center">
                <span className="font-medium text-green-800 mr-2">
                  <Stethoscope className="inline w-4 h-4 mr-1" />
                  Bác sĩ:
                </span>
                <span className="text-green-700">
                  {selectedDoctor.fullName} - {selectedDoctor.specialty}
                </span>
              </div>
            )}

            {symptoms && (
              <div className="flex items-start">
                <span className="font-medium text-green-800 mr-2">Triệu chứng:</span>
                <span className="text-green-700">{symptoms}</span>
              </div>
            )}

            {urgencyLevel && urgencyLevel !== "low" && (
              <div className="flex items-center">
                <span className="font-medium text-green-800 mr-2">
                  <AlertTriangle className="inline w-4 h-4 mr-1" />
                  Mức độ:
                </span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    urgencyLevel === "high" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {urgencyLevel === "high" ? "Khẩn cấp" : "Trung bình"}
                </span>
              </div>
            )}

            {analysisResult && (
              <div className="flex items-center">
                <span className="font-medium text-green-800 mr-2">
                  <Search className="inline w-4 h-4 mr-1" />
                  Phân tích:
                </span>
                <span className="text-green-700">Đã có kết quả phân tích hình ảnh</span>
              </div>
            )}

            {chatHistory && chatHistory.length > 0 && (
              <div className="flex items-center">
                <span className="font-medium text-green-800 mr-2">
                  <MessageSquare className="inline w-4 h-4 mr-1" />
                  Chat:
                </span>
                <span className="text-green-700">{chatHistory.length} tin nhắn đã trao đổi</span>
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-green-200">
            <p className="text-xs text-green-600">
              <Lightbulb className="inline w-4 h-4 mr-1" />
              Thông tin này sẽ được tự động điền vào form đặt lịch bên dưới
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
