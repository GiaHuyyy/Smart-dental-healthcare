import React from "react";
import { MessageSquare, X } from "lucide-react";

type UserWithOptionalSpecialization = {
  _id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  email: string;
  specialization?: string;
};

interface Conversation {
  _id: string;
  patientId: {
    _id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    email: string;
  };
  doctorId: {
    _id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    email: string;
    specialization?: string;
  };
  status: string;
  unreadPatientCount: number;
  unreadDoctorCount: number;
  lastMessageAt: string;
  lastMessage?: {
    content: string;
    createdAt: string;
  };
}

interface ConversationListProps {
  conversations: Conversation[];
  currentUserId: string;
  currentUserRole: "patient" | "doctor";
  onSelectConversation: (conversation: Conversation) => void;
  onClose: () => void;
  isVisible: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  currentUserRole,
  onSelectConversation,
  onClose,
  isVisible,
}) => {
  if (!isVisible) return null;

  const getOtherUser = (conversation: Conversation) => {
    return currentUserRole === "patient"
      ? (conversation.doctorId as UserWithOptionalSpecialization)
      : (conversation.patientId as UserWithOptionalSpecialization);
  };

  const getDisplayName = (user: { firstName: string; lastName: string }) => {
    return `${user.firstName} ${user.lastName}`;
  };

  const getUnreadCount = (conversation: Conversation) => {
    return currentUserRole === "patient" ? conversation.unreadPatientCount : conversation.unreadDoctorCount;
  };

  const formatLastMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      });
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 h-96 bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col">
      {/* Header */}
      <div
        style={{ backgroundColor: "var(--color-primary-600)", color: "white" }}
        className="flex items-center justify-between p-3 rounded-t-lg"
      >
        <div className="flex items-center space-x-2">
          <MessageSquare size={20} />
          <h3 className="font-medium">Tin nhắn</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-blue-700 rounded">
          <X size={16} />
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <MessageSquare size={48} className="mx-auto mb-2 text-gray-300" />
            <p>Chưa có cuộc trò chuyện nào</p>
          </div>
        ) : (
          conversations.map((conversation) => {
            const otherUser = getOtherUser(conversation) as UserWithOptionalSpecialization;
            const otherUserSpec: string | undefined = otherUser.specialization;
            const unreadCount = getUnreadCount(conversation);

            return (
              <div
                key={conversation._id}
                onClick={() => onSelectConversation(conversation)}
                className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div
                      style={{ backgroundColor: "var(--color-primary)" }}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                    >
                      {getDisplayName(otherUser).charAt(0)}
                    </div>
                    {unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-medium">{unreadCount > 9 ? "9+" : unreadCount}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{getDisplayName(otherUser)}</p>
                        {currentUserRole === "patient" && otherUserSpec && (
                          <p className="text-xs text-gray-500 truncate">{otherUserSpec}</p>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 ml-2 flex-shrink-0">
                        {formatLastMessageTime(conversation.lastMessageAt)}
                      </p>
                    </div>

                    {conversation.lastMessage && (
                      <p className="text-sm text-gray-600 truncate mt-1">{conversation.lastMessage.content}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
