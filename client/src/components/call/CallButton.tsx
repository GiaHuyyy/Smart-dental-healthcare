"use client";

import React from "react";
import { useWebRTC } from "@/contexts/WebRTCContext";

interface CallButtonProps {
  recipientId: string;
  recipientName: string;
  recipientRole: "doctor" | "patient";
  className?: string;
  showIcon?: boolean;
  children?: React.ReactNode;
}

const CallButton: React.FC<CallButtonProps> = ({ 
  recipientId, 
  recipientName, 
  recipientRole, 
  className = "",
  showIcon = true,
  children 
}) => {
  const { initiateCall, isInCall, callStatus } = useWebRTC();

  const handleStartCall = () => {
    if (!isInCall) {
      initiateCall(recipientId, recipientName, recipientRole, "video");
    }
  };

  const isDisabled = isInCall || callStatus === "calling" || callStatus === "ringing";

  // If children is provided, render custom content
  if (children) {
    return (
      <button
        onClick={handleStartCall}
        disabled={isDisabled}
        className={`${className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={isDisabled ? "Đang trong cuộc gọi" : `Gọi video cho ${recipientName}`}
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
      title={isDisabled ? "Đang trong cuộc gọi" : `Gọi video cho ${recipientName}`}
    >
      {showIcon && (
        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
        </svg>
      )}
      {isDisabled ? "Đang gọi..." : "Gọi video"}
    </button>
  );
};

export default CallButton;
