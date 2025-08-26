"use client";

import { useState } from "react";
import ChatInterface from "@/components/chat/ChatInterface";

export default function PatientChatPage() {
  const [selectedChat, setSelectedChat] = useState<"ai" | string>("ai");

  return (
    <div className="flex overflow-hidden h-full">
      {/* Chat Sidebar - Fixed */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Header - Fixed */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Chat & Tư vấn</h2>
          <p className="text-sm text-gray-600">Nhận hỗ trợ từ AI và bác sĩ</p>
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
                    <p className="text-sm text-gray-600 truncate">Tôi có thể giúp gì cho bạn?</p>
                    <p className="text-xs text-gray-500 mt-1">Luôn có sẵn</p>
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
              </div>

              {/* Doctor conversations */}
              <div
                className={`p-3 border rounded-lg cursor-pointer ${
                  selectedChat === "doctor-1"
                    ? "bg-green-50 border-green-200"
                    : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                }`}
                onClick={() => setSelectedChat("doctor-1")}
              >
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm">BS</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">BS. Nguyễn Văn A</h4>
                    <p className="text-sm text-gray-600 truncate">Bạn có thể đặt lịch khám...</p>
                    <p className="text-xs text-gray-500 mt-1">2 phút trước</p>
                  </div>
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                </div>
              </div>

              <div
                className={`p-3 border rounded-lg cursor-pointer ${
                  selectedChat === "doctor-2"
                    ? "bg-green-50 border-green-200"
                    : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                }`}
                onClick={() => setSelectedChat("doctor-2")}
              >
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm">📞</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">Hỗ trợ khách hàng</h4>
                    <p className="text-sm text-gray-600 truncate">Cảm ơn bạn đã liên hệ</p>
                    <p className="text-xs text-gray-500 mt-1">1 ngày trước</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* New Chat Button - Fixed */}
        <div className="p-3 border-t border-gray-200 flex-shrink-0">
          <button
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
            onClick={() => setSelectedChat("ai")}
          >
            + Tư vấn mới với AI
          </button>
        </div>
      </div>

      {/* Main Chat Area - Takes remaining space */}
      <div className="flex-1 min-w-0">
        {selectedChat === "ai" && <ChatInterface type="ai" />}
        {selectedChat === "doctor-1" && <ChatInterface type="doctor" doctorName="BS. Nguyễn Văn A" />}
        {selectedChat === "doctor-2" && <ChatInterface type="doctor" doctorName="Hỗ trợ khách hàng" />}
      </div>
    </div>
  );
}
