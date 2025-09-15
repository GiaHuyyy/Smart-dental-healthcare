"use client";

import React from "react";
import { useCallContext } from "@/contexts/CallProvider";

interface CallButtonProps {
  recipientId: string;
  recipientName: string;
  recipientRole: "doctor" | "patient";
  className?: string;
  showIcon?: boolean;
  children?: React.ReactNode;
  isVideoCall?: boolean;
}

const CallButton: React.FC<CallButtonProps> = ({
  recipientId,
  recipientName,
  recipientRole,
  className = "",
  showIcon = true,
  children,
  isVideoCall = true,
}) => {
  const { callUser, callState } = useCallContext();

  const handleStartCall = async () => {
    if (!callState.inCall) {
      try {
        await callUser(recipientId, recipientName, recipientRole, isVideoCall);
      } catch (error) {
        console.error("Failed to start call:", error);
      }
    }
  };

  const isDisabled = callState.inCall || callState.isReceivingCall || callState.callConnectionStatus === "connecting";

  // If children is provided, render custom content
  if (children) {
    return (
      <button
        onClick={handleStartCall}
        disabled={isDisabled}
        className={`${className} ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
        title={isDisabled ? "Đang trong cuộc gọi" : `${isVideoCall ? "Gọi video" : "Gọi thoại"} cho ${recipientName}`}
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
      title={isDisabled ? "Đang trong cuộc gọi" : `${isVideoCall ? "Gọi video" : "Gọi thoại"} cho ${recipientName}`}
    >
      {showIcon && (
        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
          {isVideoCall ? (
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          ) : (
            <path
              fillRule="evenodd"
              d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
              clipRule="evenodd"
            />
          )}
        </svg>
      )}
      {isDisabled ? "Đang gọi..." : isVideoCall ? "Gọi video" : "Gọi thoại"}
    </button>
  );
};

export default CallButton;
