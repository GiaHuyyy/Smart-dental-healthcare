"use client";

import React, { ReactNode } from "react";
import { useCall } from "@/contexts/CallContext";
import { Phone, Video } from "lucide-react";
import { toast } from "sonner";

interface CallButtonProps {
  // New API
  userId?: string;
  userName?: string;
  userAvatar?: string;
  // Old API (backward compatible)
  recipientId?: string;
  recipientName?: string;
  recipientRole?: "doctor" | "patient";
  // Common props
  isVideoCall?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "ghost";
  showLabel?: boolean;
  showIcon?: boolean;
  className?: string;
  children?: ReactNode;
  title?: string;
}

export default function CallButton({
  // Support both APIs
  userId,
  userName,
  userAvatar,
  recipientId,
  recipientName,
  isVideoCall = false,
  size = "md",
  variant = "primary",
  showLabel = false,
  showIcon = true,
  className = "",
  children,
}: CallButtonProps) {
  const { callUser, callState, isConnected, checkUserOnline } = useCall();

  // Use new API props or fall back to old API
  const targetUserId = userId || recipientId;
  const targetUserName = userName || recipientName;

  const isInCall = callState.status !== "idle";

  const handleCall = async () => {
    console.log("🔍 [CallButton] targetUserId:", targetUserId);
    console.log("🔍 [CallButton] targetUserName:", targetUserName);
    console.log("🔍 [CallButton] isConnected:", isConnected);

    if (!targetUserId || !targetUserName) {
      toast.error("Thiếu thông tin người nhận cuộc gọi");
      return;
    }

    if (!isConnected) {
      toast.error("Chưa kết nối đến server");
      return;
    }

    if (isInCall) {
      toast.error("Đang trong cuộc gọi khác");
      return;
    }

    // Check if user is online
    const isOnline = await checkUserOnline(targetUserId);
    console.log("🔍 [CallButton] isOnline:", isOnline);
    if (!isOnline) {
      toast.error(`${targetUserName || "Người dùng"} đang không online`);
      return;
    }

    // Start call
    await callUser(targetUserId, targetUserName, isVideoCall, userAvatar);
  };

  const sizeClasses = {
    sm: "p-1.5",
    md: "p-2",
    lg: "p-3",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const variantClasses = {
    primary: "bg-primary hover:bg-primary/90 text-white",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700",
    ghost: "hover:bg-gray-100 text-gray-600",
  };

  const Icon = isVideoCall ? Video : Phone;

  // If children provided, render as wrapper (old API style)
  if (children) {
    return (
      <button
        onClick={handleCall}
        disabled={isInCall || !isConnected}
        className={`
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        title={isVideoCall ? "Gọi video" : "Gọi thoại"}
      >
        {children}
      </button>
    );
  }

  // New API style with built-in icon
  return (
    <button
      onClick={handleCall}
      disabled={isInCall || !isConnected}
      className={`
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        rounded-full transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center gap-2
        ${className}
      `}
      title={isVideoCall ? "Gọi video" : "Gọi thoại"}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {showLabel && <span className="text-sm font-medium">{isVideoCall ? "Video" : "Gọi"}</span>}
    </button>
  );
}
