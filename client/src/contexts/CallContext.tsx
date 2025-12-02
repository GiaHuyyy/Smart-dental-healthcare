"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";
import SimplePeer from "simple-peer";
import { toast } from "sonner";

// ==================== TYPES ====================

type CallStatus = "idle" | "calling" | "ringing" | "connected" | "ended";

interface CallState {
  status: CallStatus;
  callId: string | null;
  isVideoCall: boolean;
  isCaller: boolean;
  // Remote user info
  remoteUserId: string | null;
  remoteUserName: string | null;
  remoteUserAvatar?: string | null;
  // Call timing
  startTime: Date | null;
  duration: number;
  // Media states
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeakerOn: boolean;
}

interface IncomingCallData {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  isVideoCall: boolean;
  signalData: SimplePeer.SignalData;
}

interface CallContextType {
  // State
  callState: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isConnected: boolean;
  incomingCall: IncomingCallData | null;

  // Actions
  callUser: (userId: string, userName: string, isVideoCall: boolean, userAvatar?: string) => Promise<void>;
  answerCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;

  // Media controls
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleSpeaker: () => void;

  // Utilities
  checkUserOnline: (userId: string) => Promise<boolean>;
  formatDuration: (seconds: number) => string;
}

const initialCallState: CallState = {
  status: "idle",
  callId: null,
  isVideoCall: false,
  isCaller: false,
  remoteUserId: null,
  remoteUserName: null,
  remoteUserAvatar: null,
  startTime: null,
  duration: 0,
  isMuted: false,
  isVideoOff: false,
  isSpeakerOn: true,
};

// ==================== CONTEXT ====================

const CallContext = createContext<CallContextType | null>(null);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
};

// ==================== PROVIDER ====================

interface CallProviderProps {
  children: ReactNode;
}

export const CallProvider: React.FC<CallProviderProps> = ({ children }) => {
  const { data: session } = useSession();

  // Socket & Peer refs
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [callState, setCallState] = useState<CallState>(initialCallState);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);

  // Refs for callbacks
  const incomingCallRef = useRef<IncomingCallData | null>(null);
  const callStateRef = useRef<CallState>(initialCallState);

  // Keep refs in sync
  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // ==================== HELPER FUNCTIONS ====================

  const stopMediaStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
  }, []);

  const cleanupCall = useCallback(() => {
    // Stop duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Destroy peer
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    // Stop streams
    stopMediaStream();
    setRemoteStream(null);

    // Reset state
    setCallState(initialCallState);
    setIncomingCall(null);
  }, [stopMediaStream]);

  // Ref for cleanup function (to use in useEffect)
  const cleanupCallRef = useRef(cleanupCall);
  useEffect(() => {
    cleanupCallRef.current = cleanupCall;
  }, [cleanupCall]);

  // ==================== SOCKET CONNECTION ====================

  useEffect(() => {
    if (!session?.user) return;

    const user = session.user as { _id: string; fullName: string; role: string };

    // Connect to WebRTC namespace
    const socket = io(`${process.env.NEXT_PUBLIC_BACKEND_URL}/webrtc`, {
      transports: ["websocket", "polling"],
      auth: {
        userId: user._id,
      },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ [Call] Connected to WebRTC server");
      setIsConnected(true);

      // Join with user info
      socket.emit("join", {
        odataId: user._id,
        userName: user.fullName,
        userRole: user.role as "doctor" | "patient",
      });
    });

    socket.on("disconnect", () => {
      console.log("❌ [Call] Disconnected from WebRTC server");
      setIsConnected(false);
    });

    socket.on("joined", () => {
      console.log("✅ [Call] Joined WebRTC room");
    });

    // Incoming call
    socket.on("incoming-call", (data: IncomingCallData) => {
      console.log("📞 [Call] Incoming call:", data);

      // Ignore if already in a call
      if (callStateRef.current.status !== "idle") {
        socket.emit("reject-call", { callId: data.callId, reason: "Đang bận" });
        return;
      }

      setIncomingCall(data);
      setCallState((prev) => ({
        ...prev,
        status: "ringing",
        callId: data.callId,
        isVideoCall: data.isVideoCall,
        isCaller: false,
        remoteUserId: data.callerId,
        remoteUserName: data.callerName,
        remoteUserAvatar: data.callerAvatar || null,
      }));
    });

    // Call answered (for caller)
    socket.on("call-answered", async (data: { callId: string; signalData: SimplePeer.SignalData }) => {
      console.log("✅ [Call] Call answered:", data.callId);

      if (peerRef.current) {
        peerRef.current.signal(data.signalData);
      }
    });

    // Call rejected
    socket.on("call-rejected", (data: { callId: string; reason: string }) => {
      console.log("❌ [Call] Call rejected:", data.reason);
      toast.error(data.reason || "Cuộc gọi bị từ chối");
      cleanupCallRef.current();
    });

    // Call failed
    socket.on("call-failed", (data: { reason: string }) => {
      console.log("❌ [Call] Call failed:", data.reason);
      toast.error(data.reason || "Không thể thực hiện cuộc gọi");
      cleanupCallRef.current();
    });

    // Call ended
    socket.on("call-ended", (data: { callId: string; duration: number; reason?: string }) => {
      console.log("📞 [Call] Call ended:", data);
      if (data.reason) {
        toast.info(data.reason);
      }
      cleanupCallRef.current();
    });

    // ICE candidate
    socket.on("ice-candidate", (data: { candidate: SimplePeer.SignalData }) => {
      if (peerRef.current) {
        peerRef.current.signal(data.candidate);
      }
    });

    return () => {
      socket.disconnect();
      cleanupCallRef.current();
    };
  }, [session?.user]);

  // ==================== MEDIA FUNCTIONS ====================

  const getMediaStream = useCallback(async (isVideoCall: boolean): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideoCall
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user",
            }
          : false,
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error("❌ [Call] Failed to get media:", error);
      throw new Error("Không thể truy cập camera/microphone");
    }
  }, []);

  // ==================== CALL FUNCTIONS ====================

  const startDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    setCallState((prev) => ({ ...prev, startTime: new Date() }));

    durationIntervalRef.current = setInterval(() => {
      setCallState((prev) => {
        if (!prev.startTime) return prev;
        const duration = Math.floor((Date.now() - prev.startTime.getTime()) / 1000);
        return { ...prev, duration };
      });
    }, 1000);
  }, []);

  const callUser = useCallback(
    async (userId: string, userName: string, isVideoCall: boolean, userAvatar?: string) => {
      if (!socketRef.current || !isConnected) {
        toast.error("Chưa kết nối đến server");
        return;
      }

      if (callState.status !== "idle") {
        toast.error("Đang trong cuộc gọi khác");
        return;
      }

      const user = session?.user as { _id: string; fullName: string } | undefined;
      if (!user) {
        toast.error("Chưa đăng nhập");
        return;
      }

      try {
        // Get media stream
        const stream = await getMediaStream(isVideoCall);

        // Generate call ID
        const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Update state
        setCallState({
          ...initialCallState,
          status: "calling",
          callId,
          isVideoCall,
          isCaller: true,
          remoteUserId: userId,
          remoteUserName: userName,
          remoteUserAvatar: userAvatar || null,
        });

        // Create peer (initiator) - trickle: false để chỉ gửi 1 signal
        const peer = new SimplePeer({
          initiator: true,
          trickle: false,
          stream,
          config: {
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
          },
        });

        peerRef.current = peer;

        peer.on("signal", (signalData) => {
          console.log("📤 [Call] Sending call signal");
          socketRef.current?.emit("call-user", {
            callId,
            callerId: user._id,
            callerName: user.fullName,
            callerAvatar: (session?.user as { avatarUrl?: string })?.avatarUrl,
            receiverId: userId,
            receiverName: userName,
            isVideoCall,
            signalData,
          });
        });

        peer.on("stream", (stream) => {
          console.log("📺 [Call] Got remote stream");
          setRemoteStream(stream);
        });

        peer.on("connect", () => {
          console.log("✅ [Call] Peer connected");
          setCallState((prev) => ({ ...prev, status: "connected" }));
          startDurationTimer();
        });

        peer.on("close", () => {
          console.log("📞 [Call] Peer closed");
          cleanupCall();
        });

        peer.on("error", (err) => {
          console.error("❌ [Call] Peer error:", err);
          toast.error("Lỗi kết nối cuộc gọi");
          cleanupCall();
        });
      } catch (error) {
        console.error("❌ [Call] Failed to start call:", error);
        toast.error(error instanceof Error ? error.message : "Không thể thực hiện cuộc gọi");
        cleanupCall();
      }
    },
    [session?.user, isConnected, callState.status, getMediaStream, cleanupCall, startDurationTimer]
  );

  const answerCall = useCallback(async () => {
    if (!incomingCall || !socketRef.current) return;

    const user = session?.user as { _id: string } | undefined;
    if (!user) return;

    try {
      // Get media stream
      const stream = await getMediaStream(incomingCall.isVideoCall);

      // Update state
      setCallState((prev) => ({
        ...prev,
        status: "connected",
      }));

      // Create peer (not initiator) - trickle: false để chỉ gửi 1 signal
      const peer = new SimplePeer({
        initiator: false,
        trickle: false,
        stream,
        config: {
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
        },
      });

      peerRef.current = peer;

      peer.on("signal", (signalData) => {
        console.log("📤 [Call] Sending answer signal");
        socketRef.current?.emit("answer-call", {
          callId: incomingCall.callId,
          signalData,
        });
      });

      peer.on("stream", (stream) => {
        console.log("📺 [Call] Got remote stream");
        setRemoteStream(stream);
      });

      peer.on("connect", () => {
        console.log("✅ [Call] Peer connected");
        startDurationTimer();
      });

      peer.on("close", () => {
        console.log("📞 [Call] Peer closed");
        cleanupCall();
      });

      peer.on("error", (err) => {
        console.error("❌ [Call] Peer error:", err);
        toast.error("Lỗi kết nối cuộc gọi");
        cleanupCall();
      });

      // Signal with incoming data
      peer.signal(incomingCall.signalData);

      // Clear incoming call
      setIncomingCall(null);
    } catch (error) {
      console.error("❌ [Call] Failed to answer call:", error);
      toast.error(error instanceof Error ? error.message : "Không thể trả lời cuộc gọi");

      // Inline reject logic to avoid circular dependency
      if (incomingCall && socketRef.current) {
        socketRef.current.emit("reject-call", {
          callId: incomingCall.callId,
          reason: "Không thể kết nối cuộc gọi",
        });
      }
      cleanupCall();
    }
  }, [incomingCall, session?.user, getMediaStream, cleanupCall, startDurationTimer]);

  const rejectCall = useCallback(() => {
    if (!incomingCall || !socketRef.current) return;

    socketRef.current.emit("reject-call", {
      callId: incomingCall.callId,
      reason: "Cuộc gọi bị từ chối",
    });

    cleanupCall();
  }, [incomingCall, cleanupCall]);

  const endCall = useCallback(() => {
    if (!socketRef.current) return;

    const callId = callStateRef.current.callId;
    if (callId) {
      socketRef.current.emit("end-call", { callId });
    }

    cleanupCall();
  }, [cleanupCall]);

  // ==================== MEDIA CONTROLS ====================

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState((prev) => ({ ...prev, isMuted: !audioTrack.enabled }));
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCallState((prev) => ({ ...prev, isVideoOff: !videoTrack.enabled }));
      }
    }
  }, []);

  const toggleSpeaker = useCallback(() => {
    // For web, this mainly affects the UI state
    // Actual speaker routing is handled by the browser
    setCallState((prev) => ({ ...prev, isSpeakerOn: !prev.isSpeakerOn }));
  }, []);

  // ==================== UTILITIES ====================

  const checkUserOnline = useCallback(
    (userId: string): Promise<boolean> => {
      console.log("🔍 [CallContext] Checking if user is online:", userId);
      console.log("🔍 [CallContext] Socket connected:", !!socketRef.current, "isConnected state:", isConnected);

      return new Promise((resolve) => {
        if (!socketRef.current || !isConnected) {
          console.log("❌ [CallContext] Socket not connected, returning false");
          resolve(false);
          return;
        }

        const timeout = setTimeout(() => {
          console.log("⏰ [CallContext] Timeout waiting for online-status");
          resolve(false);
        }, 5000);

        socketRef.current.once("online-status", (data: { odataId: string; isOnline: boolean }) => {
          console.log("📥 [CallContext] Received online-status:", data);
          clearTimeout(timeout);
          if (data.odataId === userId) {
            resolve(data.isOnline);
          } else {
            console.log("⚠️ [CallContext] odataId mismatch:", data.odataId, "vs", userId);
            resolve(false);
          }
        });

        console.log("📤 [CallContext] Emitting check-online for:", userId);
        socketRef.current.emit("check-online", { odataId: userId });
      });
    },
    [isConnected]
  );

  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // ==================== CONTEXT VALUE ====================

  const value: CallContextType = {
    callState,
    localStream,
    remoteStream,
    isConnected,
    incomingCall,
    callUser,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    checkUserOnline,
    formatDuration,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};

export default CallProvider;
