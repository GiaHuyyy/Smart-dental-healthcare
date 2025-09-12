"use client";

import React, { useEffect, useRef } from "react";
import { useWebRTC } from "@/contexts/WebRTCContext";

interface VideoCallInterfaceProps {
  onClose?: () => void;
}

const VideoCallInterface: React.FC<VideoCallInterfaceProps> = ({ onClose }) => {
  const {
    isInCall,
    callStatus,
    remoteUserName,
    remoteUserRole,
    localStream,
    remoteStream,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
    endCall,
  } = useWebRTC();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Set up local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Set up remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleEndCall = () => {
    endCall();
    onClose?.();
  };

  if (!isInCall) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">{remoteUserName || "Unknown User"}</h2>
          <p className="text-sm text-gray-300">
            {remoteUserRole === "doctor" ? "Bác sĩ" : "Bệnh nhân"} •{" "}
            {callStatus === "connected" ? "Đang kết nối" : "Đang kết nối..."}
          </p>
        </div>
        <div className="flex space-x-2">
          <span className="text-sm text-gray-300">
            {callStatus === "connected" ? "🟢 Đã kết nối" : "🟡 Đang kết nối..."}
          </span>
        </div>
      </div>

      {/* Video Container */}
      <div className="flex-1 relative bg-gray-900">
        {/* Remote Video (Main) */}
        <div className="w-full h-full relative">
          {remoteStream ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <div className="text-center text-white">
                <div className="w-24 h-24 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">{remoteUserRole === "doctor" ? "👨‍⚕️" : "👤"}</span>
                </div>
                <p className="text-lg">{remoteUserName}</p>
                <p className="text-sm text-gray-400">{callStatus === "connected" ? "Camera tắt" : "Đang kết nối..."}</p>
              </div>
            </div>
          )}
        </div>

        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-white shadow-lg">
          {localStream && isVideoEnabled ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-700">
              <span className="text-white text-2xl">{isVideoEnabled ? "📷" : "📷❌"}</span>
            </div>
          )}
          <div className="absolute bottom-2 left-2 text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
            Bạn
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-900 p-6">
        <div className="flex justify-center space-x-6">
          {/* Toggle Audio */}
          <button
            onClick={toggleAudio}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-colors ${
              isAudioEnabled ? "bg-gray-600 hover:bg-gray-500" : "bg-red-600 hover:bg-red-500"
            }`}
            title={isAudioEnabled ? "Tắt mic" : "Bật mic"}
          >
            {isAudioEnabled ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0L18.485 7.757a1 1 0 010 1.414L17.071 10.585a1 1 0 11-1.414-1.414L16.899 8l-1.242-1.243a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
                <path
                  fillRule="evenodd"
                  d="M18.485 6.343a1 1 0 010 1.414L16.899 9.343 15.485 7.929a1 1 0 111.414-1.414l1.586 1.586z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>

          {/* Toggle Video */}
          <button
            onClick={toggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-colors ${
              isVideoEnabled ? "bg-gray-600 hover:bg-gray-500" : "bg-red-600 hover:bg-red-500"
            }`}
            title={isVideoEnabled ? "Tắt camera" : "Bật camera"}
          >
            {isVideoEnabled ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                  clipRule="evenodd"
                />
                <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
              </svg>
            )}
          </button>

          {/* End Call */}
          <button
            onClick={handleEndCall}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white transition-colors"
            title="Kết thúc cuộc gọi"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Call Info */}
        <div className="mt-4 text-center text-gray-400 text-sm">
          <p>Cuộc gọi video • {callStatus === "connected" ? "Đã kết nối" : "Đang kết nối..."}</p>
        </div>
      </div>
    </div>
  );
};

export default VideoCallInterface;
