"use client";

import React from "react";
import { useCallContext } from "@/contexts/CallProvider";

export default function IncomingCallModal() {
  const { callState, answerCall, rejectCall } = useCallContext();

  if (!callState.isReceivingCall) return null;

  const handleAnswerCall = () => {
    try {
      // Check browser compatibility first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Trình duyệt không hỗ trợ cuộc gọi video/audio");
        rejectCall();
        return;
      }

      answerCall();
    } catch (error) {
      console.error("Error answering call:", error);
      alert("Không thể kết nối cuộc gọi");
      rejectCall();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="w-96 rounded-lg bg-white p-6 text-center shadow-xl">
        <div className="mb-4 text-xl font-bold text-gray-900">Cuộc gọi đến</div>

        <div className="mb-6 flex flex-col items-center">
          <div className="mb-4 h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <span className="text-white text-2xl">{callState.callerRole === "doctor" ? "👨‍⚕️" : "👤"}</span>
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
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8l-8 8m0-8l8 8" />
            </svg>
          </button>

          <button
            onClick={handleAnswerCall}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white transition-colors hover:bg-green-600 shadow-lg"
            title={callState.isVideoCall ? "Trả lời với video" : "Trả lời"}
          >
            {callState.isVideoCall ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            )}
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          {callState.isVideoCall ? "Camera và microphone sẽ được kích hoạt" : "Microphone sẽ được kích hoạt"}
        </div>
      </div>
    </div>
  );
}
