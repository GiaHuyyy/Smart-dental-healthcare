// ChatHeader.tsx - Fixed version với nút gọi thoại hoạt động
"use client";

import CallButton from "@/components/call/CallButton";
import { User, Phone, Calendar, FileText, Video, Lightbulb, Lock, Zap, Drone } from "lucide-react";

interface ChatHeaderProps {
  type: "ai" | "doctor" | "patient";
  doctorName?: string;
  doctorId?: string;
  specialty?: string;
  patientName?: string;
  patientId?: string;
  patientEmail?: string;
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

  // Xác định vai trò của người đối diện để hiển thị thông tin chính xác
  const isPatientViewingDoctor = type === 'doctor';
  const isDoctorViewingPatient = type === 'patient';

  const peerId = isPatientViewingDoctor ? doctorId : patientId;
  const peerName = isPatientViewingDoctor ? doctorName : patientName;

  return (
    <div className="flex items-center justify-between">
      {/* --- Thông tin người dùng (bên trái) --- */}
      <div className="flex items-center min-w-0 flex-1">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center mr-3 flex-shrink-0"
          style={{
            background:
              type === "ai"
                ? "linear-gradient(135deg, var(--color-primary), var(--color-primary-600))"
                : "linear-gradient(135deg, var(--color-primary-600), var(--color-primary))",
          }}
        >
          <span className="text-white">
            {type === "ai" ? (
              <Drone size={18} />
            ) : (
              <User size={18} />
            )}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-gray-900 text-lg truncate">
              {type === "ai" ? "AI Tư vấn" : peerName}
            </h3>
            {isOnline && type !== 'ai' && (
              <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></span>
            )}
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
      <div className="flex items-center ml-4 flex-shrink-0 space-x-2">
        {/* Nút hành động cho AI Chat */}
        {type === "ai" && (
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="inline-flex items-center space-x-2">
                  <Lightbulb className="w-4 h-4" />
                  <span>Tư vấn 24/7</span> <Lock className="w-3 h-3 mx-2" /> <span>Bảo mật thông tin</span>{" "}
                  <Zap className="w-3 h-3 mx-2" /> <span>Phản hồi nhanh</span>
                </span>
                <span>Phiên bản 2.0</span>
              </div>
              <span
                className="px-3 py-1 rounded-full text-xs font-medium ml-2"
                style={{ background: "var(--color-primary-outline)", color: "var(--color-primary-600)" }}
              >
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
                recipientRole={isPatientViewingDoctor ? 'doctor' : 'patient'}
                isVideoCall={false}
                showIcon={false}
                className="flex items-center space-x-1.5 pl-3 pr-2 py-2 text-sm whitespace-nowrap hover:opacity-80 transition-opacity border-none bg-transparent"
                style={{ color: "var(--color-primary-600)" }}
                title="Gọi thoại"
              >
                <Phone size={16} />
                <span className="hidden sm:inline">Gọi</span>
              </CallButton>

              {/* Divider */}
              <div className="border-l h-8" style={{ borderColor: "rgba(var(--color-primary-rgb), 0.2)"}}></div>

              {/* Nút Gọi Video */}
              <CallButton
                recipientId={peerId}
                recipientName={peerName}
                recipientRole={isPatientViewingDoctor ? 'doctor' : 'patient'}
                isVideoCall={true}
                showIcon={false}
                className="flex items-center space-x-1.5 pl-2 pr-3 py-2 text-sm whitespace-nowrap hover:opacity-80 transition-opacity border-none bg-transparent"
                style={{ color: "var(--color-primary-600)" }}
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
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap hover:opacity-80 transition-opacity"
                title="Đặt lịch hẹn"
                style={{ background: "var(--color-accent)", color: "var(--color-primary-600)" }}
              >
                <Calendar size={16} />
                <span className="hidden sm:inline">Đặt lịch</span>
              </button>
            )}

            {/* Nút Hồ sơ */}
            <button
              onClick={onViewProfile}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap hover:opacity-80 transition-opacity"
              title={isPatientViewingDoctor ? "Xem hồ sơ bác sĩ" : "Xem hồ sơ bệnh nhân"}
              style={{ background: "var(--color-accent)", color: "var(--color-primary-600)" }}
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