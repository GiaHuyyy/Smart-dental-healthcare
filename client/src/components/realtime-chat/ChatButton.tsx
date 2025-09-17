import React, { useState } from "react";
import { MessageSquare, Users, X } from "lucide-react";

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  email: string;
  role: "patient" | "doctor";
  specialization?: string;
}

interface ChatButtonProps {
  currentUser: User;
  onStartChat: (otherUserId: string) => void;
  doctorsList?: User[]; // Danh sách bác sĩ để bệnh nhân chọn
  patientsList?: User[]; // Danh sách bệnh nhân để bác sĩ chọn
  onShowConversations: () => void;
}

export const ChatButton: React.FC<ChatButtonProps> = ({
  currentUser,
  onStartChat,
  doctorsList = [],
  patientsList = [],
  onShowConversations,
}) => {
  const [showUserList, setShowUserList] = useState(false);

  const getDisplayName = (user: User) => {
    return `${user.firstName} ${user.lastName}`;
  };

  const userList = currentUser.role === "patient" ? doctorsList : patientsList;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* User List Modal */}
      {showUserList && (
        <div className="absolute bottom-16 right-0 w-80 h-96 bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col mb-2">
          <div className="flex items-center justify-between p-3 bg-blue-600 text-white rounded-t-lg">
            <div className="flex items-center space-x-2">
              <Users size={20} style={{ color: "white" }} />
              <h3 className="font-medium">{currentUser.role === "patient" ? "Chọn bác sĩ" : "Chọn bệnh nhân"}</h3>
            </div>
            <button
              onClick={() => setShowUserList(false)}
              className="p-1 rounded hover:opacity-90"
              style={{ color: "white" }}
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {userList.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Users size={48} className="mx-auto mb-2 text-gray-300" />
                <p>{currentUser.role === "patient" ? "Không có bác sĩ nào" : "Không có bệnh nhân nào"}</p>
              </div>
            ) : (
              userList.map((user) => (
                <div
                  key={user._id}
                  onClick={() => {
                    onStartChat(user._id);
                    setShowUserList(false);
                  }}
                  className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      style={{ backgroundColor: "var(--color-primary)" }}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                    >
                      {getDisplayName(user).charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{getDisplayName(user)}</p>
                      {user.specialization && <p className="text-sm text-gray-500">{user.specialization}</p>}
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Chat Buttons */}
      <div className="flex flex-col space-y-2">
        {/* Conversations Button */}
        <button
          onClick={onShowConversations}
          className="w-12 h-12 rounded-full shadow-lg hover:opacity-90 transition-colors flex items-center justify-center"
          title="Xem tin nhắn"
          style={{ background: "var(--color-primary-600)", color: "white" }}
        >
          <MessageSquare size={24} />
        </button>

        {/* New Chat Button */}
        <button
          onClick={() => setShowUserList(!showUserList)}
          className="w-12 h-12 rounded-full shadow-lg transition-colors flex items-center justify-center btn-primary"
          title={currentUser.role === "patient" ? "Nhắn tin với bác sĩ" : "Nhắn tin với bệnh nhân"}
        >
          <Users size={24} />
        </button>
      </div>
    </div>
  );
};
