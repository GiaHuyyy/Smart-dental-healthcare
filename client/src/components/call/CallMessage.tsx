// CallMessage.tsx - Improved version
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
  className?: string;
}

const CallMessage: React.FC<CallMessageProps> = ({
  callData,
  isOutgoing,
  timestamp,
  className = ""
}) => {
  const formatDuration = (seconds: number): string => {
    if (seconds === 0 || !seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getCallStatusText = (): string => {
    switch (callData.callStatus) {
      case "missed":
        return isOutgoing ? "Cuộc gọi nhỡ" : "Cuộc gọi nhỡ";
      case "rejected":
        return isOutgoing ? "Bị từ chối" : "Đã từ chối";
      case "answered":
      case "completed":
        const duration = formatDuration(callData.callDuration);
        return duration ? `${duration}` : "Cuộc gọi";
      default:
        return "Cuộc gọi";
    }
  };

  const getCallIcon = () => {
    if (callData.callStatus === "missed" || callData.callStatus === "rejected") {
      return <PhoneOff size={18} className="text-red-500" />;
    }
    return callData.callType === "video" ? (
      <Video size={18} className="text-green-600" />
    ) : (
      <Phone size={18} className="text-green-600" />
    );
  };

  const getDirectionIcon = () => {
    return isOutgoing ? (
      <ArrowUpRight size={14} className="text-gray-500" />
    ) : (
      <ArrowDownLeft size={14} className="text-gray-500" />
    );
  };

  const getStatusColor = (): string => {
    switch (callData.callStatus) {
      case "missed":
        return "text-red-600";
      case "rejected":
        return "text-orange-600";
      case "answered":
      case "completed":
        return "text-green-700";
      default:
        return "text-gray-600";
    }
  };

  const getBorderColor = (): string => {
    if (isOutgoing) {
      switch (callData.callStatus) {
        case "missed":
        case "rejected":
          return "border-red-200";
        case "completed":
        case "answered":
          return "border-green-200";
        default:
          return "border-blue-200";
      }
    } else {
      switch (callData.callStatus) {
        case "missed":
        case "rejected":
          return "border-red-200";
        case "completed":
        case "answered":
          return "border-green-200";
        default:
          return "border-gray-200";
      }
    }
  };

  const getBackgroundColor = (): string => {
    if (isOutgoing) {
      switch (callData.callStatus) {
        case "missed":
        case "rejected":
          return "bg-red-50";
        case "completed":
        case "answered":
          return "bg-green-50";
        default:
          return "bg-blue-50";
      }
    } else {
      switch (callData.callStatus) {
        case "missed":
        case "rejected":
          return "bg-red-50";
        case "completed":
        case "answered":
          return "bg-green-50";
        default:
          return "bg-gray-50";
      }
    }
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} w-full mb-2`}>
      <div
        className={`
          flex items-center gap-3 px-4 py-3 rounded-lg max-w-xs border
          ${getBorderColor()} ${getBackgroundColor()} ${className}
          shadow-sm
        `}
      >
        {/* Call Icon và Direction */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {getCallIcon()}
          {getDirectionIcon()}
        </div>

        {/* Call Details */}
        <div className="flex-1 min-w-0">
          {/* Status và Duration */}
          {/* <div className={`font-medium text-sm ${getStatusColor()}`}>
            {getCallStatusText()}
          </div> */}

          {/* Call type */}
          <div className="text-xs text-gray-600 mt-0.5">
            {callData.callType === 'video' ? 'Video call' : 'Voice call'}
          </div>

          {/* Timestamp */}
          <div className="text-xs text-gray-500 mt-1">
            {formatTime(timestamp)}
          </div>
        </div>

        {/* Duration badge for completed calls */}
        {(callData.callStatus === 'completed' || callData.callStatus === 'answered') &&
         callData.callDuration > 0 && (
          <div className="flex-shrink-0">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {formatDuration(callData.callDuration)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallMessage;