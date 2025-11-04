"use client";

import React from "react";
import { useCallContext } from "@/contexts/CallProvider";
import { X, Video, Phone, User, Stethoscope } from "lucide-react";
import { toast } from "sonner";

export default function IncomingCallModal() {
  const { callState, answerCall, rejectCall } = useCallContext();

  if (!callState.isReceivingCall) return null;

  const handleAnswerCall = () => {
    try {
      // Check browser compatibility first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Trình duyệt không hỗ trợ cuộc gọi video/audio");
        rejectCall();
        return;
      }

      answerCall();
    } catch (error) {
      console.error("Error answering call:", error);
      toast.error("Không thể kết nối cuộc gọi");
      rejectCall();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="w-96 rounded-lg bg-white p-6 text-center shadow-xl">
        <div className="mb-4 text-xl font-bold text-gray-900">Cuộc gọi đến</div>

        <div className="mb-6 flex flex-col items-center">
          <div className="mb-4 h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            {callState.callerRole === "doctor" ? (
              <Stethoscope className="text-white w-8 h-8" />
            ) : (
              <User className="text-white w-8 h-8" />
            )}
          </div>
          <div className="text-lg font-semibold text-gray-900">{callState.callerName}</div>
          <div className="text-sm text-gray-600 mb-2">{callState.callerRole === "doctor" ? "Bác sĩ" : "Bệnh nhân"}</div>
          <div className="text-sm text-blue-600 font-medium">
            {callState.isVideoCall ? "Cuộc gọi video" : "Cuộc gọi thoại"}
          </div>
        </div>

        <div className="flex justify-center space-x-8">
          <button
            onClick={() => rejectCall()}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600 shadow-lg"
            title="Từ chối"
          >
            <X className="w-6 h-6" />
          </button>

          <button
            onClick={handleAnswerCall}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white transition-colors hover:bg-green-600 shadow-lg"
            title={callState.isVideoCall ? "Trả lời với video" : "Trả lời"}
          >
            {callState.isVideoCall ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          {callState.isVideoCall ? "Camera và microphone sẽ được kích hoạt" : "Microphone sẽ được kích hoạt"}
        </div>
      </div>
    </div>
  );
}
