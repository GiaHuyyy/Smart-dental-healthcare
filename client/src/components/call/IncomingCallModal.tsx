"use client";

import React from "react";
import { useWebRTC } from "@/contexts/WebRTCContext";

interface IncomingCallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const IncomingCallModal: React.FC<IncomingCallModalProps> = ({ isOpen, onClose }) => {
  const { incomingCall, acceptCall, rejectCall } = useWebRTC();

  const handleAccept = () => {
    acceptCall();
    onClose();
  };

  const handleReject = () => {
    rejectCall();
    onClose();
  };

  if (!isOpen || !incomingCall) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl">
        {/* Caller Avatar */}
        <div className="mb-6">
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">{incomingCall.callerRole === "doctor" ? "👨‍⚕️" : "👤"}</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{incomingCall.callerName || "Unknown User"}</h2>
          <p className="text-gray-600">
            {incomingCall.callerRole === "doctor" ? "Bác sĩ" : "Bệnh nhân"} đang gọi video cho bạn...
          </p>
        </div>

        {/* Call Type */}
        <div className="mb-8">
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            📹 Cuộc gọi video
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-6">
          {/* Reject Call */}
          <button
            onClick={handleReject}
            className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors shadow-lg"
            title="Từ chối"
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M6.707 4.879A3 3 0 004.879 6.707l-.707.707L6.293 9.535a8.966 8.966 0 000 1.93L4.172 13.586l.707.707A3 3 0 006.707 16.12l.707-.707 2.121-2.121a8.966 8.966 0 001.93 0l2.121 2.121.707.707a3 3 0 001.828-1.828l-.707-.707-2.121-2.121a8.966 8.966 0 000-1.93l2.121-2.121.707-.707A3 3 0 0015.293 4.88l-.707.707-2.121 2.121a8.966 8.966 0 00-1.93 0L8.414 5.586l-.707-.707z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {/* Accept Call */}
          <button
            onClick={handleAccept}
            className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white transition-colors shadow-lg"
            title="Chấp nhận"
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
          </button>
        </div>

        {/* Helper Text */}
        <div className="mt-6 text-sm text-gray-500">
          <p>Chấp nhận cuộc gọi để bắt đầu trò chuyện video</p>
        </div>
      </div>

      {/* Ringtone Animation */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="flex items-center justify-center h-full">
          <div className="animate-ping absolute w-32 h-32 bg-blue-400 rounded-full opacity-20"></div>
          <div
            className="animate-ping absolute w-24 h-24 bg-blue-400 rounded-full opacity-40"
            style={{ animationDelay: "0.5s" }}
          ></div>
          <div
            className="animate-ping absolute w-16 h-16 bg-blue-400 rounded-full opacity-60"
            style={{ animationDelay: "1s" }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
