"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import io, { Socket } from "socket.io-client";

interface IncomingCall {
  callerId: string;
  callerName: string;
  callerRole: "doctor" | "patient";
  callType: "video" | "audio";
}

interface WebRTCContextType {
  // Call state
  isInCall: boolean;
  isCallIncoming: boolean;
  isCallOutgoing: boolean;
  callStatus: "idle" | "calling" | "ringing" | "connected" | "ended";
  incomingCall: IncomingCall | null;

  // Remote user info
  remoteUserId: string | null;
  remoteUserName: string | null;
  remoteUserRole: "patient" | "doctor" | null;

  // Media streams
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;

  // Media controls
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;

  // Call functions
  initiateCall: (
    userId: string,
    userName: string,
    userRole: "patient" | "doctor",
    callType: "video" | "audio"
  ) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: (reason?: string) => void;
  endCall: () => void;

  // Media controls
  toggleVideo: () => void;
  toggleAudio: () => void;

  // Connection
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const WebRTCContext = createContext<WebRTCContextType | null>(null);

export const useWebRTC = () => {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error("useWebRTC must be used within a WebRTCProvider");
  }
  return context;
};

interface WebRTCProviderProps {
  children: React.ReactNode;
}

export const WebRTCProvider: React.FC<WebRTCProviderProps> = ({ children }) => {
  const { data: session } = useSession();

  // Socket connection
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Call state
  const [isInCall, setIsInCall] = useState(false);
  const [isCallIncoming, setIsCallIncoming] = useState(false);
  const [isCallOutgoing, setIsCallOutgoing] = useState(false);
  const [callStatus, setCallStatus] = useState<"idle" | "calling" | "ringing" | "connected" | "ended">("idle");
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  // Remote user info
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const [remoteUserName, setRemoteUserName] = useState<string | null>(null);
  const [remoteUserRole, setRemoteUserRole] = useState<"patient" | "doctor" | null>(null);

  // Media streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // Media controls
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  // WebRTC refs
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const incomingCallData = useRef<IncomingCall | null>(null);

  // WebRTC configuration
  const rtcConfig = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
  };

  // Initialize socket connection
  const connect = useCallback(() => {
    if (!session?.user || socket) return;

    const newSocket = io(`${process.env.NEXT_PUBLIC_BACKEND_URL}`, {
      auth: {
        userId: (session.user as any)._id || (session.user as any).id,
        userRole: (session.user as any).role,
      },
    });

    newSocket.on("connect", () => {
      console.log("WebRTC Socket connected");
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("WebRTC Socket disconnected");
      setIsConnected(false);
    });

    // Call signaling events
    newSocket.on("incoming-call", handleIncomingCall);
    newSocket.on("call-accepted", handleCallAccepted);
    newSocket.on("call-rejected", handleCallRejected);
    newSocket.on("call-ended", handleCallEnded);
    newSocket.on("webrtc-offer", handleWebRTCOffer);
    newSocket.on("webrtc-answer", handleWebRTCAnswer);
    newSocket.on("webrtc-ice-candidate", handleICECandidate);

    setSocket(newSocket);
  }, [session?.user, socket]);

  // Disconnect socket
  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  // Auto-connect when session is available
  useEffect(() => {
    if (session?.user) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [session?.user, connect, disconnect]);

  // Initialize peer connection
  const initializePeerConnection = useCallback(() => {
    if (peerConnection.current) {
      peerConnection.current.close();
    }

    const pc = new RTCPeerConnection(rtcConfig);

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("webrtc-ice-candidate", {
          candidate: event.candidate,
          targetUserId: remoteUserId,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("Received remote stream");
      setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
      if (pc.connectionState === "connected") {
        setCallStatus("connected");
      } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        endCall();
      }
    };

    peerConnection.current = pc;
    return pc;
  }, [socket, remoteUserId]);

  // Get user media
  const getUserMedia = useCallback(async (video: boolean = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video,
        audio: true,
      });
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      throw error;
    }
  }, []);

  // Handle incoming call
  const handleIncomingCall = useCallback((data: IncomingCall) => {
    console.log("Incoming call from:", data);
    incomingCallData.current = data;
    setIncomingCall(data);
    setRemoteUserId(data.callerId);
    setRemoteUserName(data.callerName);
    setRemoteUserRole(data.callerRole);
    setIsCallIncoming(true);
    setCallStatus("ringing");
  }, []);

  // Handle call accepted
  const handleCallAccepted = useCallback(
    async (data: any) => {
      console.log("Call accepted by:", data);
      setCallStatus("connected");
      setIsCallOutgoing(false);
      setIsInCall(true);

      // Create offer
      const pc = initializePeerConnection();
      const stream = await getUserMedia(true);

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket?.emit("webrtc-offer", {
        offer,
        targetUserId: remoteUserId,
      });
    },
    [socket, remoteUserId, initializePeerConnection, getUserMedia]
  );

  // Handle call rejected
  const handleCallRejected = useCallback(() => {
    console.log("Call rejected");
    setCallStatus("ended");
    setIsCallOutgoing(false);
    resetCallState();
  }, []);

  // Handle call ended
  const handleCallEnded = useCallback(() => {
    console.log("Call ended by remote user");
    endCall();
  }, []);

  // Handle WebRTC offer
  const handleWebRTCOffer = useCallback(
    async (data: any) => {
      console.log("Received WebRTC offer");
      const pc = initializePeerConnection();
      const stream = await getUserMedia(true);

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      await pc.setRemoteDescription(data.offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket?.emit("webrtc-answer", {
        answer,
        targetUserId: data.callerId || remoteUserId,
      });
    },
    [socket, remoteUserId, initializePeerConnection, getUserMedia]
  );

  // Handle WebRTC answer
  const handleWebRTCAnswer = useCallback(async (data: any) => {
    console.log("Received WebRTC answer");
    if (peerConnection.current) {
      await peerConnection.current.setRemoteDescription(data.answer);
    }
  }, []);

  // Handle ICE candidate
  const handleICECandidate = useCallback(async (data: any) => {
    console.log("Received ICE candidate");
    if (peerConnection.current) {
      await peerConnection.current.addIceCandidate(data.candidate);
    }
  }, []);

  // Initiate call
  const initiateCall = useCallback(
    async (userId: string, userName: string, userRole: "patient" | "doctor", callType: "video" | "audio") => {
      if (!socket || isInCall) return;

      setRemoteUserId(userId);
      setRemoteUserName(userName);
      setRemoteUserRole(userRole);
      setIsCallOutgoing(true);
      setCallStatus("calling");

      socket.emit("initiate-call", {
        targetUserId: userId,
        callType,
        callerName: (session?.user as any)?.firstName + " " + (session?.user as any)?.lastName,
        callerRole: (session?.user as any)?.role,
      });
    },
    [socket, isInCall, session]
  );

  // Accept call
  const acceptCall = useCallback(async () => {
    if (!socket || !incomingCallData.current) return;

    setIsCallIncoming(false);
    setIsInCall(true);
    setCallStatus("connected");

    socket.emit("accept-call", {
      callerId: incomingCallData.current.callerId,
    });
  }, [socket]);

  // Reject call
  const rejectCall = useCallback(() => {
    if (!socket || !incomingCallData.current) return;

    socket.emit("reject-call", {
      callerId: incomingCallData.current.callerId,
    });

    setIsCallIncoming(false);
    resetCallState();
  }, [socket]);

  // End call
  const endCall = useCallback(() => {
    if (socket && remoteUserId) {
      socket.emit("end-call", {
        targetUserId: remoteUserId,
      });
    }

    // Clean up media streams
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    resetCallState();
  }, [socket, remoteUserId, localStream]);

  // Reset call state
  const resetCallState = useCallback(() => {
    setIsInCall(false);
    setIsCallIncoming(false);
    setIsCallOutgoing(false);
    setCallStatus("idle");
    setRemoteUserId(null);
    setRemoteUserName(null);
    setRemoteUserRole(null);
    setRemoteStream(null);
    incomingCallData.current = null;
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, [localStream]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  const value: WebRTCContextType = {
    // Call state
    isInCall,
    isCallIncoming,
    isCallOutgoing,
    callStatus,
    incomingCall,

    // Remote user info
    remoteUserId,
    remoteUserName,
    remoteUserRole,

    // Media streams
    localStream,
    remoteStream,

    // Media controls
    isVideoEnabled,
    isAudioEnabled,

    // Call functions
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,

    // Media controls
    toggleVideo,
    toggleAudio,

    // Connection
    isConnected,
    connect,
    disconnect,
  };

  return <WebRTCContext.Provider value={value}>{children}</WebRTCContext.Provider>;
};
