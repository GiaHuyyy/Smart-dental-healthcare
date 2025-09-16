"use client";

import React, { useEffect, useRef, useState } from "react";
import { useCallContext } from "@/contexts/CallProvider";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize, Minimize, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import IncomingCallDialog from "./IncomingCallDialog";

export default function VideoCallInterface() {
  const {
    callState,
    localVideoRef,
    remoteVideoRef,
    endCall,
    toggleMute,
    toggleVideo,
    isMuted,
    isVideoOff,
    formatDuration,
    toggleSpeaker,
    isSpeakerOn,
    remoteStream,
    localStream,
  } = useCallContext();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioVolume, setAudioVolume] = useState(1);
  const callContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Debug logging to show current call state
  useEffect(() => {
    console.log("Call state updated:", callState);
    console.log("Local stream:", localStream ? "Available" : "Not available");
    console.log("Remote stream:", remoteStream ? "Available" : "Not available");

    if (callState.callStartTime) {
      console.log("Call duration:", callState.callDuration);
      console.log("Start time:", callState.callStartTime);
    }
  }, [callState, localStream, remoteStream]);

  // Attach streams to video elements when they become available
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      console.log("Attaching local stream to video element");
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch((err) => {
        console.error("Error playing local video:", err);
      });
    }

    if (remoteStream && remoteVideoRef.current) {
      console.log("Attaching remote stream to video element");
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch((err) => {
        console.error("Error playing remote video:", err);
      });
    }
  }, [localStream, remoteStream, localVideoRef, remoteVideoRef]);

  // Specifically handle audio for audio calls
  useEffect(() => {
    if (remoteStream && !callState.isVideoCall) {
      console.log("Setting up audio for audio-only call");
      if (audioRef.current) {
        audioRef.current.srcObject = remoteStream;
        audioRef.current.volume = audioVolume;

        audioRef.current.play().catch((err) => {
          console.error("Error playing audio:", err);
          const playPromise = audioRef.current!.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              toast.error("Vui lòng nhấp vào màn hình để bật âm thanh");
              document.addEventListener(
                "click",
                function playAudio() {
                  audioRef.current!.play();
                  document.removeEventListener("click", playAudio);
                },
                { once: true }
              );
            });
          }
        });
      }
    }
  }, [remoteStream, callState.isVideoCall, audioVolume]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      callContainerRef.current?.requestFullscreen().catch((err: any) => {
        toast.error(`Không thể bật chế độ toàn màn hình: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value);
    setAudioVolume(volume);
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.volume = volume;
    }
  };

  useEffect(() => {
    if (callState.inCall) {
      console.log("Call duration state:", {
        duration: callState.callDuration,
        startTime: callState.callStartTime,
        formatted: formatDuration(callState.callDuration),
      });
    }
  }, [callState.callDuration, callState.callStartTime, callState.inCall, formatDuration]);

  // If there's no call data, don't render
  if (!callState.inCall && !callState.isReceivingCall) return null;

  // Determine name and image of the other party
  const partnerName = callState.receiverName || callState.callerName;
  const partnerImage = callState.callerImage;

  return (
    <>
      {/* Incoming Call Dialog */}
      <IncomingCallDialog />

      {/* Main Call Interface - only show when in call */}
      {callState.inCall && (
        <div ref={callContainerRef} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
          {/* Call duration */}
          <div className="absolute top-4 z-10 rounded-full bg-black bg-opacity-50 px-4 py-2 text-white">
            {callState.callStartTime
              ? isNaN(callState.callDuration)
                ? "00:00"
                : formatDuration(callState.callDuration)
              : "Đang kết nối..."}
          </div>

          {/* Audio element for call audio */}
          <audio ref={audioRef} autoPlay className="hidden" />

          {/* Video container */}
          <div className="relative h-full w-full">
            {/* Remote video (or avatar if audio call) */}
            {callState.isVideoCall && remoteStream ? (
              <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-gray-900">
                {partnerImage ? (
                  <img
                    src={partnerImage}
                    alt={partnerName}
                    className="h-40 w-40 rounded-full border-4 border-blue-500 object-cover"
                  />
                ) : (
                  <div className="h-40 w-40 rounded-full border-4 border-blue-500 bg-gray-600 flex items-center justify-center">
                    <span className="text-4xl text-white font-bold">
                      {partnerName?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  </div>
                )}
                <div className="mt-4 text-2xl font-semibold text-white">{partnerName}</div>
                <div className="mt-2 text-lg text-gray-300">
                  {callState.callStartTime ? "Đang nói chuyện..." : "Đang gọi..."}
                </div>
                {/* Audio waveform visualization */}
                {callState.callStartTime && (
                  <div className="mt-6 flex items-center space-x-1">
                    <div className="h-4 w-1 animate-pulse bg-blue-400" style={{ animationDelay: "0s" }}></div>
                    <div className="h-6 w-1 animate-pulse bg-blue-500" style={{ animationDelay: "0.1s" }}></div>
                    <div className="h-8 w-1 animate-pulse bg-blue-600" style={{ animationDelay: "0.2s" }}></div>
                    <div className="h-10 w-1 animate-pulse bg-blue-700" style={{ animationDelay: "0.3s" }}></div>
                    <div className="h-8 w-1 animate-pulse bg-blue-600" style={{ animationDelay: "0.4s" }}></div>
                    <div className="h-6 w-1 animate-pulse bg-blue-500" style={{ animationDelay: "0.5s" }}></div>
                    <div className="h-4 w-1 animate-pulse bg-blue-400" style={{ animationDelay: "0.6s" }}></div>
                  </div>
                )}
                {/* Large timer display for audio calls */}
                {callState.callStartTime && (
                  <div className="mt-8 text-5xl font-bold text-white">
                    {isNaN(callState.callDuration) ? "00:00" : formatDuration(callState.callDuration)}
                  </div>
                )}
              </div>
            )}

            {/* Local video */}
            {callState.isVideoCall && localStream && (
              <div className="absolute bottom-20 right-4 h-40 w-32 overflow-hidden rounded-lg border-2 border-white">
                <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              </div>
            )}
          </div>

          {/* Control buttons */}
          <div className="absolute bottom-8 flex space-x-4">
            {/* Volume control for audio calls */}
            {!callState.isVideoCall && (
              <div className="flex items-center space-x-2 rounded-full bg-gray-800 px-4 py-2">
                <Volume2 className="text-white" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={audioVolume}
                  onChange={handleVolumeChange}
                  className="w-20"
                />
              </div>
            )}

            {/* Mute button */}
            <button
              onClick={toggleMute}
              className={`flex h-12 w-12 items-center justify-center rounded-full ${
                isMuted ? "bg-red-600" : "bg-gray-600"
              } text-white transition-all hover:scale-110`}
              title={isMuted ? "Bật mic" : "Tắt mic"}
            >
              {isMuted ? <MicOff /> : <Mic />}
            </button>

            {/* Video button (only for video calls) */}
            {callState.isVideoCall && (
              <button
                onClick={toggleVideo}
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  isVideoOff ? "bg-red-600" : "bg-gray-600"
                } text-white transition-all hover:scale-110`}
                title={isVideoOff ? "Bật camera" : "Tắt camera"}
              >
                {isVideoOff ? <VideoOff /> : <Video />}
              </button>
            )}

            {/* Speaker button */}
            <button
              onClick={toggleSpeaker}
              className={`flex h-12 w-12 items-center justify-center rounded-full ${
                isSpeakerOn ? "bg-blue-600" : "bg-gray-600"
              } text-white transition-all hover:scale-110`}
              title={isSpeakerOn ? "Tắt loa" : "Bật loa"}
            >
              {isSpeakerOn ? <Volume2 /> : <VolumeX />}
            </button>

            {/* Fullscreen button (only for video calls) */}
            {callState.isVideoCall && (
              <button
                onClick={handleFullscreenToggle}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-600 text-white transition-all hover:scale-110"
                title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
              >
                {isFullscreen ? <Minimize /> : <Maximize />}
              </button>
            )}

            {/* End call button */}
            <button
              onClick={endCall}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white transition-all hover:scale-110"
              title="Kết thúc cuộc gọi"
            >
              <PhoneOff />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
