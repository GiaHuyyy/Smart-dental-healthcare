"use client";

import CallButton from "@/components/call/CallButton";

interface ChatHeaderProps {
  type: "ai" | "doctor" | "patient";
  doctorName?: string;
  doctorId?: string;
  specialty?: string;
  patientName?: string;
  patientId?: string;
  patientEmail?: string;
  isOnline?: boolean;
  embedded?: boolean; // For embedded mode without padding/border
  onCall?: () => void;
  onBookAppointment?: () => void;
  onViewProfile?: () => void;
}

export default function ChatHeader({
  type,
  doctorName,
  doctorId,
  specialty,
  patientName,
  patientId,
  patientEmail,
  isOnline = true,
  embedded = false,
  onCall,
  onBookAppointment,
  onViewProfile,
}: ChatHeaderProps) {
  return (
    <div className={embedded ? "" : ""}>
      <div className="flex items-center justify-between">
        {/* Left: User Info */}
        <div className="flex items-center min-w-0 flex-1">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${
              type === "ai"
                ? "bg-gradient-to-br from-blue-500 to-blue-600"
                : type === "doctor"
                ? "bg-gradient-to-br from-green-500 to-green-600"
                : "bg-gradient-to-br from-purple-500 to-purple-600"
            }`}
          >
            <span className="text-white text-sm font-medium">
              {type === "ai" ? "🤖" : type === "doctor" ? "👨‍⚕️" : "👤"}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900 text-lg truncate">
                {type === "ai" ? "AI Tư vấn" : type === "doctor" ? doctorName : patientName}
              </h3>
              <span
                className={`w-2 h-2 ${isOnline ? "bg-green-500" : "bg-gray-400"} rounded-full flex-shrink-0`}
              ></span>
            </div>
            <p className="text-sm text-gray-600 truncate">
              {type === "ai"
                ? isOnline
                  ? "Tư vấn sơ bộ về nha khoa"
                  : "Đang bảo trì"
                : type === "doctor"
                ? specialty || "Bác sĩ nha khoa"
                : patientEmail || "Bệnh nhân"}
            </p>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center ml-4 flex-shrink-0">
          {/* Action buttons for patient view (when chatting with doctor) */}
          {type === "doctor" && (
            <div className="flex items-center space-x-2">
              {/* Gọi điện */}
              <button
                onClick={onCall}
                className="flex items-center space-x-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition-colors whitespace-nowrap"
                title="Gọi điện"
              >
                <span>📞</span>
                <span className="hidden sm:inline">Gọi điện</span>
              </button>

              {/* Đặt lịch */}
              <button
                onClick={onBookAppointment}
                className="flex items-center space-x-1 px-3 py-2 bg-green-50 text-green-600 rounded-lg text-sm hover:bg-green-100 transition-colors whitespace-nowrap"
                title="Đặt lịch hẹn"
              >
                <span>📅</span>
                <span className="hidden sm:inline">Đặt lịch</span>
              </button>

              {/* Hồ sơ */}
              <button
                onClick={onViewProfile}
                className="flex items-center space-x-1 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg text-sm hover:bg-purple-100 transition-colors whitespace-nowrap"
                title="Xem hồ sơ bác sĩ"
              >
                <span>📋</span>
                <span className="hidden sm:inline">Hồ sơ</span>
              </button>

              {/* Gọi video */}
              {doctorId && doctorName && (
                <CallButton
                  recipientId={doctorId}
                  recipientName={doctorName}
                  recipientRole="doctor"
                  className="flex items-center space-x-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition-colors whitespace-nowrap"
                >
                  <span className="flex items-center space-x-1">
                    <span>📹</span>
                    <span className="hidden sm:inline">Gọi video</span>
                  </span>
                </CallButton>
              )}
            </div>
          )}

          {/* Action buttons for doctor view (when chatting with patient) */}
          {type === "patient" && (
            <div className="flex items-center space-x-2">
              {/* Gọi điện cho bệnh nhân */}
              <button
                onClick={onCall}
                className="flex items-center space-x-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition-colors whitespace-nowrap"
                title="Gọi điện cho bệnh nhân"
              >
                <span>📞</span>
                <span className="hidden sm:inline">Gọi điện</span>
              </button>

              {/* Đặt lịch khám */}
              <button
                onClick={onBookAppointment}
                className="flex items-center space-x-1 px-3 py-2 bg-green-50 text-green-600 rounded-lg text-sm hover:bg-green-100 transition-colors whitespace-nowrap"
                title="Đặt lịch khám cho bệnh nhân"
              >
                <span>📅</span>
                <span className="hidden sm:inline">Đặt lịch</span>
              </button>

              {/* Xem hồ sơ bệnh nhân */}
              <button
                onClick={onViewProfile}
                className="flex items-center space-x-1 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg text-sm hover:bg-purple-100 transition-colors whitespace-nowrap"
                title="Xem hồ sơ bệnh nhân"
              >
                <span>📋</span>
                <span className="hidden sm:inline">Hồ sơ</span>
              </button>

              {/* Gọi video cho bệnh nhân */}
              {patientId && patientName && (
                <CallButton
                  recipientId={patientId}
                  recipientName={patientName}
                  recipientRole="patient"
                  className="flex items-center space-x-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition-colors whitespace-nowrap"
                >
                  <span className="flex items-center space-x-1">
                    <span>📹</span>
                    <span className="hidden sm:inline">Gọi video</span>
                  </span>
                </CallButton>
              )}
            </div>
          )}

          {/* AI Badge */}
          {type === "ai" && (
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>💡 Tư vấn 24/7 • 🔒 Bảo mật thông tin • ⚡ Phản hồi nhanh</span>
                <span>Phiên bản 2.0</span>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium ml-2">
                Miễn phí
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
