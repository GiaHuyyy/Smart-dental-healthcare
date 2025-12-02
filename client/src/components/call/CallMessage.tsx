"use client";

import React from "react";
import { Phone, Video, PhoneIncoming, PhoneMissed, PhoneOff } from "lucide-react";

interface CallMessageProps {
  callType: "audio" | "video";
  callStatus: "missed" | "answered" | "rejected" | "completed";
  callDuration?: number;
  isOutgoing: boolean;
  timestamp?: Date | string;
}

export default function CallMessage({
  callType,
  callStatus,
  callDuration = 0,
  isOutgoing,
  timestamp,
}: CallMessageProps) {
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
        return {
          icon: PhoneMissed,
          text: isOutgoing ? "Cuộc gọi nhỡ" : "Cuộc gọi nhỡ",
          color: "text-red-500",
          bgColor: "bg-red-50",
        };
      case "rejected":
        return {
          icon: PhoneOff,
          text: isOutgoing ? "Đã từ chối" : "Đã từ chối",
          color: "text-orange-500",
          bgColor: "bg-orange-50",
        };
      case "answered":
      case "completed":
        return {
          icon: isOutgoing ? Phone : PhoneIncoming,
          text: isOutgoing ? "Cuộc gọi đi" : "Cuộc gọi đến",
          color: "text-green-500",
          bgColor: "bg-green-50",
        };
      default:
        return {
          icon: Phone,
          text: "Cuộc gọi",
          color: "text-gray-500",
          bgColor: "bg-gray-50",
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;
  const CallTypeIcon = callType === "video" ? Video : Phone;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${statusInfo.bgColor} max-w-xs`}>
      {/* Call type icon */}
      <div className={`p-2 rounded-full ${statusInfo.bgColor}`}>
        <CallTypeIcon className={`w-5 h-5 ${statusInfo.color}`} />
      </div>

      {/* Call info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
          <span className="text-sm font-medium text-gray-900">{statusInfo.text}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500">
            {callType === "video" ? "Video" : "Thoại"}
          </span>
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
  );
}
