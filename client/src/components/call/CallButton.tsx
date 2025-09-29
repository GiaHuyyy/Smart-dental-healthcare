// CallButton.tsx - Fixed version
"use client";

import React from "react";
import { useCallContext } from "@/contexts/CallProvider";
import { Video, Phone } from "lucide-react";

interface CallButtonProps {
  recipientId: string;
  recipientName: string;
  recipientRole: "doctor" | "patient";
  className?: string;
  showIcon?: boolean;
  children?: React.ReactNode;
  isVideoCall?: boolean;
  style?: React.CSSProperties;
  title?: string;
}

const CallButton: React.FC<CallButtonProps> = ({
  recipientId,
  recipientName,
  recipientRole,
  className = "",
  showIcon = true,
  children,
  isVideoCall = true,
  style,
  title,
}) => {
  const { callUser, callState } = useCallContext();

  const handleStartCall = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!callState.inCall && !callState.isReceivingCall) {
      try {
        console.log(`Starting ${isVideoCall ? 'video' : 'audio'} call to:`, {
          recipientId,
          recipientName,
          recipientRole,
          isVideoCall
        });

        await callUser(recipientId, recipientName, recipientRole, isVideoCall);
      } catch (error) {
        console.error("Failed to start call:", error);
      }
    }
  };

  const isDisabled = callState.inCall || callState.isReceivingCall || callState.callConnectionStatus === "connecting";

  const defaultTitle = isDisabled
    ? "Đang trong cuộc gọi"
    : `${isVideoCall ? "Gọi video" : "Gọi thoại"} cho ${recipientName}`;

  // If children is provided, render custom content
  if (children) {
    return (
      <button
        onClick={handleStartCall}
        disabled={isDisabled}
        className={`${className} ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
        style={style}
        title={title || defaultTitle}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      onClick={handleStartCall}
      disabled={isDisabled}
      className={`
        inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white
        ${
          isDisabled
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        }
        transition-colors duration-200
        ${className}
      `}
      style={style}
      title={title || defaultTitle}
    >
      {showIcon && (isVideoCall ? <Video className="w-4 h-4 mr-2" /> : <Phone className="w-4 h-4 mr-2" />)}
      {isDisabled ? "Đang gọi..." : isVideoCall ? "Gọi video" : "Gọi thoại"}
    </button>
  );
};

export default CallButton;