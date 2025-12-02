"use client";

import React, { useEffect, useRef } from "react";
import { useCall } from "@/contexts/CallContext";
import { PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, VolumeX, Maximize2, Minimize2 } from "lucide-react";
import Image from "next/image";

export default function CallScreen() {
  const { callState, localStream, remoteStream, endCall, toggleMute, toggleVideo, toggleSpeaker, formatDuration } =
    useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Attach streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    // Also attach to audio element for audio-only calls
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Handle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Don't render if idle or ringing (ringing shows IncomingCallModal instead)
  // Only show for: calling (caller waiting), connected (in call)
  if (callState.status === "idle" || callState.status === "ringing") {
    return null;
  }

  const isConnected = callState.status === "connected";
  const isCalling = callState.status === "calling";

  return (
    <div ref={containerRef} className="fixed inset-0 z-100 bg-gray-900 flex flex-col">
      {/* Hidden audio element for audio calls */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Main video area */}
      <div className="flex-1 relative">
        {/* Remote video (or avatar for audio call) */}
        {callState.isVideoCall && remoteStream ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-linear-to-br from-gray-800 to-gray-900">
            {/* Avatar */}
            {callState.remoteUserAvatar ? (
              <Image
                src={callState.remoteUserAvatar}
                alt={callState.remoteUserName || "User"}
                width={128}
                height={128}
                className="w-32 h-32 rounded-full object-cover border-4 border-white/20"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center border-4 border-white/20">
                <span className="text-5xl font-bold text-white">
                  {callState.remoteUserName?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
            )}

            {/* Name */}
            <h2 className="mt-6 text-2xl font-bold text-white">{callState.remoteUserName}</h2>

            {/* Audio wave animation when connected */}
            {isConnected && !callState.isVideoCall && (
              <div className="mt-8 flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-primary rounded-full animate-pulse"
                    style={{
                      height: `${20 + Math.random() * 20}px`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Local video (picture-in-picture) */}
        {callState.isVideoCall && localStream && (
          <div className="absolute top-4 right-4 w-32 h-44 md:w-48 md:h-64 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${callState.isVideoOff ? "hidden" : ""}`}
            />
            {callState.isVideoOff && (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <VideoOff className="w-8 h-8 text-gray-500" />
              </div>
            )}
          </div>
        )}

        {/* Call status/duration */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
          <span className="text-white font-mono text-lg">
            {isConnected ? formatDuration(callState.duration) : isCalling ? "Đang gọi..." : "Đang kết nối..."}
          </span>
        </div>

        {/* Fullscreen button */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 left-4 p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Controls */}
      <div className="bg-gray-800/90 backdrop-blur-sm py-6 px-4">
        <div className="flex justify-center items-center gap-4">
          {/* Mute button */}
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full transition-all ${
              callState.isMuted ? "bg-red-500 text-white" : "bg-gray-700 text-white hover:bg-gray-600"
            }`}
          >
            {callState.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* Video toggle (only for video calls) */}
          {callState.isVideoCall && (
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full transition-all ${
                callState.isVideoOff ? "bg-red-500 text-white" : "bg-gray-700 text-white hover:bg-gray-600"
              }`}
            >
              {callState.isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </button>
          )}

          {/* End call button */}
          <button onClick={endCall} className="p-4 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all">
            <PhoneOff className="w-6 h-6" />
          </button>

          {/* Speaker toggle */}
          <button
            onClick={toggleSpeaker}
            className={`p-4 rounded-full transition-all ${
              !callState.isSpeakerOn ? "bg-red-500 text-white" : "bg-gray-700 text-white hover:bg-gray-600"
            }`}
          >
            {callState.isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </div>
  );
}
