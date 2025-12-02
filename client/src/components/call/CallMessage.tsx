"use client";

import React from "react";
import { Phone, Video, PhoneIncoming, PhoneMissed, PhoneOff, PhoneOutgoing } from "lucide-react";

interface CallData {
  callType: "audio" | "video";
  callStatus: "missed" | "answered" | "rejected" | "completed";
  callDuration?: number;
  startedAt?: string;
  endedAt?: string;
}

interface CallMessageProps {
  callData: CallData;
  isOutgoing: boolean;
  timestamp?: Date | string;
  className?: string;
}

export default function CallMessage({ callData, isOutgoing, timestamp, className = "" }: CallMessageProps) {
  const { callType, callStatus, callDuration = 0 } = callData;

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTime = (date: Date | string): string => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  };

  const getStatusInfo = () => {
    switch (callStatus) {
      case "missed":
        // Cả outgoing (Không trả lời) và incoming (Cuộc gọi nhỡ) đều dùng màu đỏ nhạt
        return {
          icon: PhoneMissed,
          text: isOutgoing ? "Không trả lời" : "Cuộc gọi nhỡ",
          color: "text-red-500",
          bgColor: "bg-red-50",
          textColor: "text-gray-900",
        };
      case "rejected":
        // Cả outgoing (Bị từ chối) và incoming (Đã từ chối) đều dùng màu đỏ nhạt (giống missed)
        return {
          icon: PhoneOff,
          text: isOutgoing ? "Bị từ chối" : "Đã từ chối",
          color: "text-red-500",
          bgColor: "bg-red-50",
          textColor: "text-gray-900",
        };
      case "answered":
      case "completed":
        // Cả outgoing (Cuộc gọi đi) và incoming (Cuộc gọi đến) đều dùng màu xanh lá nhạt
        return {
          icon: isOutgoing ? PhoneOutgoing : PhoneIncoming,
          text: isOutgoing ? "Cuộc gọi đi" : "Cuộc gọi đến",
          color: "text-green-500",
          bgColor: "bg-green-50",
          textColor: "text-gray-900",
        };
      default:
        return {
          icon: Phone,
          text: "Cuộc gọi",
          color: "text-gray-500",
          bgColor: "bg-gray-50",
          textColor: "text-gray-900",
        };
    }
  };

  const statusInfo = getStatusInfo();
  const CallTypeIcon = callType === "video" ? Video : Phone;

  return (
    <div className={`flex ${isOutgoing ? "justify-end" : "justify-start"} ${className}`}>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${statusInfo.bgColor} max-w-xs`}>
        {/* Call type icon */}
        <div className={`p-2 rounded-full ${statusInfo.bgColor}`}>
          <CallTypeIcon className={`w-5 h-5 ${statusInfo.color}`} />
        </div>

        {/* Call info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${statusInfo.textColor}`}>{statusInfo.text}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-500">{callType === "video" ? "Video" : "Thoại"}</span>
            {callDuration > 0 && (
              <>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500">{formatDuration(callDuration)}</span>
              </>
            )}
            {timestamp && (
              <>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-400">{formatTime(timestamp)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
