"use client";

import { useState } from "react";
import ChatInterface from "@/components/chat/ChatInterface";

export default function PatientChatPage() {
  const [selectedChat, setSelectedChat] = useState<"ai" | string>("ai");
  const [showSidebar, setShowSidebar] = useState(true);

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

                {/* No sample doctor conversations - all will be loaded from API */}
                <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-center py-4">
                    <p className="text-sm text-gray-500">Chưa có cuộc trò chuyện với bác sĩ</p>
                  </div>
                </div>
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
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">Lưu ý: Lịch sử chat AI chỉ được lưu trong vòng 24h</span>
            </div>
          </div>
        </div>

        {/* Chat Content */}
        <div className="flex-1 min-h-0">
          <ChatInterface type="ai" />
        </div>
      </div>
    </div>
  );
}
