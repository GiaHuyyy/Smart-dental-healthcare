"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import ChatWrapper from "./ChatWrapper";

interface ChatButtonSimpleProps {
  type: "ai" | "doctor";
}

export default function ChatButtonSimple({ type }: ChatButtonSimpleProps) {
  const [showChat, setShowChat] = useState(false);

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setShowChat(true)}
        className="rounded-full p-3 shadow-lg transition-all duration-200 flex items-center justify-center"
        style={{ background: "var(--color-primary-600)", color: "white" }}
      >
        <MessageCircle size={24} />
      </button>

      {/* Chat Modal */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col m-4">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{type === "ai" ? "AI Tư vấn" : "Chat với Bác sĩ"}</h3>
              <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-gray-600 text-xl">
                ×
              </button>
            </div>

            {/* Chat Content */}
            <div className="flex-1 overflow-hidden">
              <ChatWrapper type={type} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
