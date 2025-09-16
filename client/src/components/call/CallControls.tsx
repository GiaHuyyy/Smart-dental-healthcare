"use client";

import React from "react";
import CallButton from "./CallButton";
import { Phone, Video } from "lucide-react";

interface CallControlsProps {
  recipientId: string;
  recipientName: string;
  recipientRole: "doctor" | "patient";
  className?: string;
}

const CallControls: React.FC<CallControlsProps> = ({ recipientId, recipientName, recipientRole, className = "" }) => {
  return (
    <div className={`flex gap-2 ${className}`}>
      {/* Voice Call Button */}
      <CallButton
        recipientId={recipientId}
        recipientName={recipientName}
        recipientRole={recipientRole}
        isVideoCall={false}
        className="bg-green-600 hover:bg-green-700 focus:ring-green-500"
        showIcon={false}
      >
        <Phone className="w-4 h-4 mr-2" />
        Gọi thoại
      </CallButton>

      {/* Video Call Button */}
      <CallButton
        recipientId={recipientId}
        recipientName={recipientName}
        recipientRole={recipientRole}
        isVideoCall={true}
        className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
        showIcon={false}
      >
        <Video className="w-4 h-4 mr-2" />
        Gọi video
      </CallButton>
    </div>
  );
};

export default CallControls;
