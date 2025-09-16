"use client";

import React from "react";
import { Phone, Video, PhoneOff } from "lucide-react";
import { useCallContext } from "@/contexts/CallProvider";
import { toast } from "sonner";

export default function IncomingCallDialog() {
  const { callState, answerCall, rejectCall } = useCallContext();

  if (!callState.isReceivingCall) return null;

  const handleAnswerCall = () => {
    try {
      // Check browser compatibility first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Trình duyệt không hỗ trợ cuộc gọi video/audio");
        rejectCall("Thiết bị không hỗ trợ");
        return;
      }

      answerCall();
    } catch (error) {
      console.error("Error answering call:", error);
      toast.error("Không thể kết nối cuộc gọi");
      rejectCall("Lỗi khi kết nối");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="w-80 rounded-lg bg-white p-6 text-center shadow-xl">
        <div className="mb-4 text-xl font-bold">Cuộc gọi đến</div>

        <div className="mb-6 flex flex-col items-center">
          <div className="mb-2 h-20 w-20 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
            {callState.callerName?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="text-lg font-semibold">{callState.callerName || "Người dùng"}</div>
          <div className="text-sm text-gray-500 capitalize">
            {callState.callerRole === "doctor" ? "Bác sĩ" : "Bệnh nhân"}
          </div>
          <div className="text-sm text-blue-600 mt-1">
            {callState.isVideoCall ? "Cuộc gọi video" : "Cuộc gọi thoại"}
          </div>
        </div>

        <div className="flex justify-center space-x-8">
          <button
            onClick={() => rejectCall()}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
            title="Từ chối"
          >
            <PhoneOff size={20} />
          </button>

          <button
            onClick={handleAnswerCall}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white transition-colors hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-300"
            title={callState.isVideoCall ? "Trả lời với video" : "Trả lời"}
          >
            {callState.isVideoCall ? <Video size={20} /> : <Phone size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}
