"use client";

import React, { useEffect, useRef } from "react";
import { useCall } from "@/contexts/CallContext";
import { Phone, PhoneOff, Video } from "lucide-react";
import Image from "next/image";

export default function IncomingCallModal() {
  const { callState, incomingCall, answerCall, rejectCall } = useCall();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play ringtone when receiving call
  useEffect(() => {
    if (incomingCall && callState.status === "ringing") {
      // Try to play ringtone (ignore errors if file doesn't exist)
      try {
        audioRef.current = new Audio("/sounds/ringtone.mp3");
        audioRef.current.loop = true;
        audioRef.current.play().catch(() => {
          // Autoplay might be blocked or file doesn't exist
          console.log("Could not play ringtone");
        });
      } catch {
        // Ignore errors
      }

      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      };
    }
  }, [incomingCall, callState.status]);

  if (!incomingCall || callState.status !== "ringing") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="text-center mb-6">
          {/* Avatar */}
          {incomingCall.callerAvatar ? (
            <Image
              src={incomingCall.callerAvatar}
              alt={incomingCall.callerName}
              width={80}
              height={80}
              className="w-20 h-20 mx-auto mb-4 rounded-full object-cover border-4 border-primary/20"
            />
          ) : (
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-linear-to-br from-primary to-primary/80 flex items-center justify-center animate-pulse">
              <span className="text-3xl font-bold text-white">{incomingCall.callerName.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <h3 className="text-xl font-bold text-gray-900 mb-1">{incomingCall.callerName}</h3>
          <p className="text-gray-500">Cuộc gọi {incomingCall.isVideoCall ? "video" : "thoại"} đến...</p>
        </div>

        {/* Animated rings */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-4 h-4 bg-primary rounded-full animate-ping absolute"></div>
            <div className="w-4 h-4 bg-primary rounded-full"></div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-6">
          {/* Reject button */}
          <button
            onClick={rejectCall}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all hover:scale-110 shadow-lg"
          >
            <PhoneOff className="w-7 h-7" />
          </button>

          {/* Answer button - Show Video icon for video calls, Phone for audio */}
          <button
            onClick={answerCall}
            className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-all hover:scale-110 shadow-lg animate-bounce"
          >
            {incomingCall.isVideoCall ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
          </button>
        </div>
      </div>
    </div>
  );
}
