"use client";

import React from "react";
import { Phone, Video, PhoneOff, ArrowDownLeft, ArrowUpRight } from "lucide-react";

interface CallMessageProps {
  callData: {
    callType: "audio" | "video";
    callStatus: "missed" | "answered" | "rejected" | "completed";
    callDuration: number;
    startedAt: string;
    endedAt?: string;
  };
  isOutgoing: boolean;
  timestamp: string;
}

const CallMessage: React.FC<CallMessageProps> = ({ callData, isOutgoing, timestamp }) => {
  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return "";

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getCallStatusText = (): string => {
    switch (callData.callStatus) {
      case "missed":
        return "Cuộc gọi nhỡ";
      case "rejected":
        return "Cuộc gọi bị từ chối";
      case "answered":
      case "completed":
        const duration = formatDuration(callData.callDuration);
        return duration ? `Cuộc gọi ${duration}` : "Cuộc gọi";
      default:
        return "Cuộc gọi";
    }
  };

  const getCallIcon = () => {
    if (callData.callStatus === "missed" || callData.callStatus === "rejected") {
      return <PhoneOff size={16} color="#ef4444" />;
    }

    return callData.callType === "video" ? <Video size={16} color="#22c55e" /> : <Phone size={16} color="#22c55e" />;
  };

  const getDirectionIcon = () => {
    return isOutgoing ? <ArrowUpRight size={12} color="#6b7280" /> : <ArrowDownLeft size={12} color="#6b7280" />;
  };

  const getCallStatusColor = (): string => {
    switch (callData.callStatus) {
      case "missed":
        return "text-red-600";
      case "rejected":
        return "text-red-500";
      case "answered":
      case "completed":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-lg max-w-xs ${
        isOutgoing ? "bg-blue-50 border border-blue-200 ml-auto" : "bg-gray-50 border border-gray-200"
      }`}
    >
      <div className="flex items-center gap-1">
        {getCallIcon()}
        {getDirectionIcon()}
      </div>

      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${getCallStatusColor()}`}>{getCallStatusText()}</div>
        <div className="text-xs text-gray-500">
          {new Date(timestamp).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
};

export default CallMessage;
