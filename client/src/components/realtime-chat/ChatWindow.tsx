import React, { useState, useEffect, useRef } from "react";
import { Send, X, Minimize2, Maximize2, Phone, Video, MoreVertical } from "lucide-react";

interface Message {
  _id: string;
  content: string;
  senderId: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  senderRole: "patient" | "doctor";
  messageType: "text" | "image" | "file";
  createdAt: string;
  isRead: boolean;
}

interface Conversation {
  _id: string;
  patientId: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    email: string;
  };
  doctorId: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    email: string;
    specialization?: string;
  };
  status: string;
  unreadPatientCount: number;
  unreadDoctorCount: number;
}

interface ChatWindowProps {
  conversation: Conversation;
  currentUserId: string;
  currentUserRole: "patient" | "doctor";
  onClose: () => void;
  onSendMessage: (content: string) => void;
  onMarkMessageRead: (messageId: string) => void;
  messages: Message[];
  isTyping: boolean;
  onTyping: (isTyping: boolean) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  currentUserId,
  currentUserRole,
  onClose,
  onSendMessage,
  onMarkMessageRead,
  messages,
  isTyping,
  onTyping,
}) => {
  const [inputMessage, setInputMessage] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const otherUser = currentUserRole === "patient" ? conversation.doctorId : conversation.patientId;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      onSendMessage(inputMessage.trim());
      setInputMessage("");
      onTyping(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);

    // Handle typing indicator
    onTyping(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDisplayName = (user: any) => {
    return `${user.firstName} ${user.lastName}`;
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 w-80 bg-white border border-gray-200 rounded-lg shadow-lg">
        <div
          className="flex items-center justify-between p-3 bg-blue-600 text-white rounded-t-lg cursor-pointer"
          onClick={() => setIsMinimized(false)}
        >
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-semibold">
              {getDisplayName(otherUser).charAt(0)}
            </div>
            <div>
              <p className="font-medium text-sm">{getDisplayName(otherUser)}</p>
              {currentUserRole === "patient" && otherUser.specialization && (
                <p className="text-xs text-blue-100">{otherUser.specialization}</p>
              )}
            </div>
          </div>
          <div className="flex space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(false);
              }}
              className="p-1 hover:bg-blue-700 rounded"
            >
              <Maximize2 size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 hover:bg-blue-700 rounded"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 h-96 bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-blue-600 text-white rounded-t-lg">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-semibold">
            {getDisplayName(otherUser).charAt(0)}
          </div>
          <div>
            <p className="font-medium text-sm">{getDisplayName(otherUser)}</p>
            {currentUserRole === "patient" && otherUser.specialization && (
              <p className="text-xs text-blue-100">{otherUser.specialization}</p>
            )}
          </div>
        </div>
        <div className="flex space-x-1">
          <button className="p-1 hover:bg-blue-700 rounded">
            <Phone size={16} />
          </button>
          <button className="p-1 hover:bg-blue-700 rounded">
            <Video size={16} />
          </button>
          <button className="p-1 hover:bg-blue-700 rounded">
            <MoreVertical size={16} />
          </button>
          <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-blue-700 rounded">
            <Minimize2 size={16} />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-blue-700 rounded">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`flex ${message.senderId._id === currentUserId ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs p-2 rounded-lg ${
                message.senderId._id === currentUserId ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">{formatTime(message.createdAt)}</p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-2 rounded-lg">
              <p className="text-sm text-gray-500 italic">{getDisplayName(otherUser)} đang nhập...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Nhập tin nhắn..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim()}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
