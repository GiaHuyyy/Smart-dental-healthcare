// ChatHeader.tsx - Fixed version với nút gọi thoại hoạt động
"use client";

import CallButton from "@/components/call/CallButton";
import { User, Phone, Calendar, FileText, Video, Lightbulb, Lock, Zap, Drone } from "lucide-react";

interface ChatHeaderProps {
  type: "ai" | "doctor" | "patient";
  doctorName?: string;
  doctorId?: string;
  doctorAvatar?: string;
  specialty?: string;
  patientName?: string;
  patientId?: string;
  patientEmail?: string;
  patientAvatar?: string;
  isOnline?: boolean;
  embedded?: boolean;
  onCall?: () => void;
  onBookAppointment?: () => void;
  onViewProfile?: () => void;
}

export default function ChatHeader({
  type,
  doctorName,
  doctorId,
  doctorAvatar,
  specialty,
  patientName,
  patientId,
  patientEmail,
  patientAvatar,
  isOnline = true,
  embedded = false,
  onCall,
  onBookAppointment,
  onViewProfile,
}: ChatHeaderProps) {
  // Xác định vai trò của người đối diện để hiển thị thông tin chính xác
  const isPatientViewingDoctor = type === "doctor";
  const isDoctorViewingPatient = type === "patient";

  const peerId = isPatientViewingDoctor ? doctorId : patientId;
  const peerName = isPatientViewingDoctor ? doctorName : patientName;
  const peerAvatar = isPatientViewingDoctor ? doctorAvatar : patientAvatar;

  return (
    <div className="flex items-center justify-between">
      {/* --- Thông tin người dùng (bên trái) --- */}
      <div className="flex items-center min-w-0 flex-1">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center mr-3 shrink-0 overflow-hidden"
          style={{
            background:
              type === "ai" || !peerAvatar
                ? "linear-gradient(135deg, var(--color-primary), var(--color-primary-600))"
                : undefined,
          }}
        >
          {type === "ai" ? (
            <span className="text-white">
              <Drone size={18} />
            </span>
          ) : peerAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={peerAvatar} alt={peerName || "User"} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white">
              <User size={18} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-gray-900 text-lg truncate">{type === "ai" ? "AI Tư vấn" : peerName}</h3>
            {isOnline && type !== "ai" && <span className="w-2 h-2 bg-green-500 rounded-full shrink-0"></span>}
          </div>
          <p className="text-sm text-gray-600 truncate">
            {type === "ai"
              ? "Tư vấn sơ bộ về nha khoa"
              : isPatientViewingDoctor
              ? specialty || "Bác sĩ nha khoa"
              : patientEmail || "Bệnh nhân"}
          </p>
        </div>
      </div>

      {/* --- Các nút hành động (bên phải) --- */}
      <div className="flex items-center ml-4 shrink-0 space-x-2">
        {/* Nút hành động cho AI Chat */}
        {type === "ai" && (
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="inline-flex items-center space-x-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                <span>Tư vấn 24/7</span> <Lock className="w-3 h-3 mx-2 text-primary" /> <span>Bảo mật thông tin</span>{" "}
                <Zap className="w-3 h-3 mx-2 text-primary" /> <span>Phản hồi nhanh</span>
              </span>
              <span>
                Phiên bản <span className="text-primary">2.0</span>
              </span>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-medium ml-2 text-primary ring ring-primary">
              Miễn phí
            </span>
          </div>
        )}

        {/* Nút hành động cho chat với người dùng */}
        {(isPatientViewingDoctor || isDoctorViewingPatient) && peerId && peerName && (
          <>
            {/* Nút Gọi & Gọi Video */}
            <div className="flex items-center rounded-lg overflow-hidden" style={{ background: "var(--color-accent)" }}>
              {/* Nút Gọi thoại */}
              <CallButton
                recipientId={peerId}
                recipientName={peerName}
                recipientRole={isPatientViewingDoctor ? "doctor" : "patient"}
                isVideoCall={false}
                showIcon={false}
                className="text-primary flex items-center space-x-1.5 pl-3 pr-2 py-2 text-sm whitespace-nowrap hover:opacity-80 transition-opacity border-none bg-transparent"
                title="Gọi thoại"
              >
                <Phone size={16} />
                <span className="hidden sm:inline">Gọi</span>
              </CallButton>

              {/* Divider */}
              <div className="border-l h-8 border-primary"></div>

              {/* Nút Gọi Video */}
              <CallButton
                recipientId={peerId}
                recipientName={peerName}
                recipientRole={isPatientViewingDoctor ? "doctor" : "patient"}
                isVideoCall={true}
                showIcon={false}
                className="text-primary flex items-center space-x-1.5 pl-2 pr-3 py-2 text-sm whitespace-nowrap hover:opacity-80 transition-opacity border-none bg-transparent"
                title="Gọi video"
              >
                <Video size={16} />
                <span className="hidden sm:inline">Video</span>
              </CallButton>
            </div>

            {/* Nút Đặt lịch (Chỉ cho Bệnh nhân) */}
            {isPatientViewingDoctor && (
              <button
                onClick={onBookAppointment}
                className="flex text-primary items-center space-x-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap hover:opacity-80 transition-opacity"
                title="Đặt lịch hẹn"
              >
                <Calendar size={16} />
                <span className="hidden sm:inline">Đặt lịch</span>
              </button>
            )}

            {/* Nút Hồ sơ */}
            <button
              onClick={onViewProfile}
              className="flex text-primary items-center space-x-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap hover:opacity-80 transition-opacity"
              title={isPatientViewingDoctor ? "Xem hồ sơ bác sĩ" : "Xem hồ sơ bệnh nhân"}
            >
              <FileText size={16} />
              <span className="hidden sm:inline">Hồ sơ</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
