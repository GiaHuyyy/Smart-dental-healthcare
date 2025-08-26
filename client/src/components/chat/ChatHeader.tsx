"use client";

interface ChatHeaderProps {
  type: "ai" | "doctor";
  doctorName?: string;
  urgencyLevel?: "low" | "medium" | "high";
  isOnline?: boolean;
  onCall?: () => void;
  onBookAppointment?: () => void;
  onViewProfile?: () => void;
}

export default function ChatHeader({
  type,
  doctorName,
  urgencyLevel = "low",
  isOnline = true,
  onCall,
  onBookAppointment,
  onViewProfile,
}: ChatHeaderProps) {
  const getUrgencyBadge = () => {
    if (urgencyLevel === "low") return null;
    
    const colors = {
      high: "bg-red-100 text-red-800 border-red-300",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
    };

    const labels = {
      high: "Khẩn cấp",
      medium: "Trung bình",
    };

    return (
      <div
        className={`inline-flex items-center px-2 py-1 text-xs font-medium border rounded-full ${colors[urgencyLevel]}`}
      >
        ⚠️ {labels[urgencyLevel]}
      </div>
    );
  };

  const getStatusText = () => {
    if (type === "ai") {
      return isOnline ? "Tư vấn sơ bộ về nha khoa" : "Đang bảo trì";
    } else {
      return isOnline ? "Đang hoạt động" : "Không khả dụng";
    }
  };

  const getStatusColor = () => {
    return isOnline ? "bg-green-500" : "bg-gray-400";
  };

  return (
    <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
              type === "ai" ? "bg-gradient-to-br from-blue-500 to-blue-600" : "bg-gradient-to-br from-green-500 to-green-600"
            }`}
          >
            <span className="text-white text-sm">
              {type === "ai" ? "🤖" : "BS"}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">
              {type === "ai" ? "AI Tư vấn" : doctorName}
            </h3>
            <div className="flex items-center space-x-2">
              <span className={`inline-block w-2 h-2 ${getStatusColor()} rounded-full`}></span>
              <p className="text-sm text-gray-600">{getStatusText()}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Urgency Badge */}
          {getUrgencyBadge()}

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onCall}
              className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 transition-colors flex items-center space-x-1"
            >
              <span>📞</span>
              <span>Gọi điện</span>
            </button>
            
            <button
              onClick={onBookAppointment}
              className="px-3 py-1.5 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200 transition-colors flex items-center space-x-1"
            >
              <span>📅</span>
              <span>Đặt lịch</span>
            </button>

            {type === "doctor" && (
              <button
                onClick={onViewProfile}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors flex items-center space-x-1"
              >
                <span>👤</span>
                <span>Hồ sơ</span>
              </button>
            )}
          </div>

          {/* Service Badge */}
          {type === "ai" && (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              Miễn phí
            </span>
          )}
        </div>
      </div>

      {/* Additional Info for AI */}
      {type === "ai" && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>💡 Tư vấn 24/7 • 🔒 Bảo mật thông tin • ⚡ Phản hồi nhanh</span>
            <span>Phiên bản 2.0</span>
          </div>
        </div>
      )}
    </div>
  );
}
