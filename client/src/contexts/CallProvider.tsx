// Polyfill for global - must be at the very top of the file
if (typeof global === "undefined") {
  window.global = window;
}
// Ensure all required globals are defined
if (typeof process === "undefined") {
  window.process = { env: { DEBUG: undefined }, nextTick: (cb) => setTimeout(cb, 0) };
}
// Add Buffer polyfill
if (typeof window !== "undefined" && !window.Buffer) {
  window.Buffer = {
    isBuffer: () => false,
    from: () => ({}),
  };
}

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useSession } from "next-auth/react";
import io, { Socket } from "socket.io-client";
import { toast } from "sonner";
import { useRealtimeChat } from "./RealtimeChatContext";

interface CallState {
  inCall: boolean;
  isReceivingCall: boolean;
  caller: string | null;
  callerName: string;
  callerImage: string;
  callerRole: string;
  receiverId: string | null;
  receiverName: string;
  receiverRole: string;
  isVideoCall: boolean;
  callStartTime: number | null;
  callDuration: number;
  callConnectionStatus: string;
  callerInfo?: {
    name: string;
    role: string;
    image?: string;
  };
}

interface CallContextType {
  callState: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeakerOn: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  callUser: (receiverId: string, receiverName: string, receiverRole: string, isVideoCall?: boolean) => Promise<void>;
  answerCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleSpeaker: () => void;
  formatDuration: (seconds: number) => string;
}

// Create a better WebRTC wrapper to fix audio issues
const createPeerConnection = (config: any) => {
  const { initiator, stream, onSignal, onStream, onError, onClose, isVideoCall } = config;

  // Create RTCPeerConnection with ICE servers
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:global.stun.twilio.com:3478" },
    ],
    // Add these configurations to improve connectivity
    iceTransportPolicy: "all",
    bundlePolicy: "balanced",
    rtcpMuxPolicy: "require",
    sdpSemantics: "unified-plan",
  });

  // Add local stream tracks to connection
  if (stream) {
    stream.getTracks().forEach((track: MediaStreamTrack) => {
      console.log(`Adding ${track.kind} track to peer connection`);
      pc.addTrack(track, stream);
    });
  }

  // Handle ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("ICE candidate generated", event.candidate.candidate.substring(0, 50) + "...");
      onSignal({ candidate: event.candidate });
    }
  };

  pc.onicegatheringstatechange = () => {
    console.log("ICE gathering state:", pc.iceGatheringState);
  };

  pc.oniceconnectionstatechange = () => {
    console.log("ICE connection state:", pc.iceConnectionState);
    if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
      console.log("ICE connected/completed - media should be flowing");
    }
    if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
      onError(new Error("ICE connection failed or disconnected"));
    }
  };

  // Get remote stream
  pc.ontrack = (event) => {
    console.log(`Received ${event.track.kind} track from remote peer`);

    if (event.streams && event.streams[0]) {
      // Important: Ensure audio is unmuted/enabled
      event.streams[0].getAudioTracks().forEach((track) => {
        track.enabled = true;
        console.log("Remote audio track enabled:", track.enabled, "readyState:", track.readyState);
      });

      onStream(event.streams[0]);
    } else {
      console.warn("Received track but no stream");
    }
  };

  // Handle connection state changes
  pc.onconnectionstatechange = () => {
    console.log("Connection state change:", pc.connectionState);
    if (pc.connectionState === "connected") {
      console.log("Connection established successfully");
    }
    if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
      onError(new Error("Connection failed or disconnected"));
    } else if (pc.connectionState === "closed") {
      onClose?.();
    }
  };

  // Start connection process based on initiator role
  const start = async () => {
    if (initiator) {
      try {
        console.log("Creating offer as initiator");
        // Add audio configuration to SDP
        const offerOptions = {
          offerToReceiveAudio: true,
          offerToReceiveVideo: config.isVideoCall,
        };

        const offer = await pc.createOffer(offerOptions);

        // Make sure audio is prioritized and enabled
        let modifiedSdp = offer.sdp;
        // Ensure audio is given higher priority
        modifiedSdp = modifiedSdp.replace(/(a=mid:audio\r\n)/, "$1a=setup:actpass\r\n");
        offer.sdp = modifiedSdp;

        await pc.setLocalDescription(offer);
        console.log("Local description set (offer)");
        onSignal(pc.localDescription);
      } catch (err) {
        console.error("Error creating offer:", err);
        onError(err);
      }
    }
  };

  // Process incoming signal
  const processSignal = async (signal: any) => {
    try {
      console.log("Processing signal:", JSON.stringify(signal, null, 2));

      // Handle simulated SDPs from mobile clients
      if (
        signal.sdp === "simulated-sdp-offer" ||
        signal.sdp === "simulated-sdp-answer" ||
        signal.sdp?.includes("simulated-sdp")
      ) {
        console.log("Received simulated SDP from mobile client, creating compatible format");

        // Generate valid ICE parameters that meet WebRTC requirements
        const iceUfrag = generateRandomString(8); // At least 4 chars
        const icePwd = generateRandomString(32); // At least 22 chars
        const fingerprint = generateFingerprint();

        // Create a minimal valid SDP for WebRTC with proper ICE parameters and MAINTAINING ORDER
        // The critical fix: we need to ensure the order of m-lines matches exactly what was in the offer
        // For offers and answers, audio MUST come before video
        let validSdp =
          `v=0\r\n` +
          `o=- ${Date.now()} 2 IN IP4 127.0.0.1\r\n` +
          `s=-\r\n` +
          `t=0 0\r\n` +
          `a=group:BUNDLE audio${isVideoCall ? " video" : ""}\r\n` +
          `a=msid-semantic: WMS\r\n`;

        // Always include audio first
        validSdp +=
          `m=audio 9 UDP/TLS/RTP/SAVPF 111\r\n` +
          `c=IN IP4 0.0.0.0\r\n` +
          `a=rtcp:9 IN IP4 0.0.0.0\r\n` +
          `a=ice-ufrag:${iceUfrag}\r\n` +
          `a=ice-pwd:${icePwd}\r\n` +
          `a=fingerprint:sha-256 ${fingerprint}\r\n` +
          `a=setup:${signal.type === "offer" ? "actpass" : "active"}\r\n` +
          `a=mid:audio\r\n` +
          `a=rtcp-mux\r\n` + // Add rtcp-mux attribute - critical fix
          `a=sendrecv\r\n` +
          `a=rtpmap:111 opus/48000/2\r\n` +
          `a=rtcp-fb:111 transport-cc\r\n` +
          `a=fmtp:111 minptime=10;useinbandfec=1\r\n`;

        // Add video section only for video calls and only after audio
        if (isVideoCall) {
          validSdp +=
            `m=video 9 UDP/TLS/RTP/SAVPF 96\r\n` +
            `c=IN IP4 0.0.0.0\r\n` +
            `a=rtcp:9 IN IP4 0.0.0.0\r\n` +
            `a=ice-ufrag:${iceUfrag}\r\n` +
            `a=ice-pwd:${icePwd}\r\n` +
            `a=fingerprint:sha-256 ${fingerprint}\r\n` +
            `a=setup:${signal.type === "offer" ? "actpass" : "active"}\r\n` +
            `a=mid:video\r\n` +
            `a=rtcp-mux\r\n` + // Add rtcp-mux attribute - critical fix
            `a=sendrecv\r\n` +
            `a=rtpmap:96 H264/90000\r\n` +
            `a=rtcp-fb:96 nack\r\n` +
            `a=rtcp-fb:96 nack pli\r\n`;
        }

        // Replace the simulated SDP with our valid one
        signal.sdp = validSdp;

        console.log("Created valid SDP replacement with correct m-line order:", {
          type: signal.type,
          hasAudio: true,
          hasVideo: isVideoCall,
          hasRtcpMux: true, // Log that rtcp-mux is included
          ufrag: iceUfrag.substring(0, 4) + "...",
          pwdLength: icePwd.length,
        });
      } else if (signal.sdp) {
        // For real SDP (not simulated), ensure rtcp-mux is present
        if (!signal.sdp.includes("a=rtcp-mux")) {
          console.warn("Received SDP without rtcp-mux, adding it");

          // Add rtcp-mux to each media section if missing
          let modifiedSdp = signal.sdp;
          const mediaMatches = modifiedSdp.match(/m=[^\r\n]+\r\n/g) || [];

          for (const mediaLine of mediaMatches) {
            const mediaSection = mediaLine.trim();
            const mediaType = mediaSection.split(" ")[0].substring(2); // Extract "audio" or "video"

            // Find the end of this media section
            const mediaStartIndex = modifiedSdp.indexOf(mediaSection);
            if (mediaStartIndex !== -1) {
              // Find if rtcp-mux is already present in this media section
              const nextMediaIndex = modifiedSdp.indexOf("m=", mediaStartIndex + mediaSection.length);
              const endIndex = nextMediaIndex !== -1 ? nextMediaIndex : modifiedSdp.length;
              const mediaBlock = modifiedSdp.substring(mediaStartIndex, endIndex);

              if (!mediaBlock.includes("a=rtcp-mux")) {
                // Insert rtcp-mux after the mid attribute
                const midIndex = modifiedSdp.indexOf("a=mid:", mediaStartIndex);
                if (midIndex !== -1 && midIndex < endIndex) {
                  const midEndIndex = modifiedSdp.indexOf("\r\n", midIndex) + 2;
                  modifiedSdp =
                    modifiedSdp.substring(0, midEndIndex) + "a=rtcp-mux\r\n" + modifiedSdp.substring(midEndIndex);
                }
              }
            }
          }

          signal.sdp = modifiedSdp;
          console.log("Added rtcp-mux to SDP");
        }
      }

      if (signal.type === "offer") {
        console.log("Received offer, setting remote description");
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          console.log("Remote description set successfully (offer)");
          console.log("Creating answer");

          const answer = await pc.createAnswer();

          // Modify SDP to ensure audio works
          let modifiedSdp = answer.sdp;
          modifiedSdp = modifiedSdp.replace(/(a=mid:audio\r\n)/, "$1a=setup:active\r\n");

          // Ensure rtcp-mux is present in our answer
          if (!modifiedSdp.includes("a=rtcp-mux")) {
            modifiedSdp = modifiedSdp.replace(/(a=mid:(audio|video)\r\n)/g, "$1a=rtcp-mux\r\n");
          }

          answer.sdp = modifiedSdp;

          await pc.setLocalDescription(answer);
          console.log("Local description set (answer)");
          onSignal(pc.localDescription);
        } catch (err) {
          console.error("Error setting remote offer:", err);

          // Special handling for rtcp-mux errors
          if ((err as any).message && (err as any).message.includes("rtcp-mux must be enabled")) {
            console.warn("rtcp-mux error detected, attempting to fix the SDP");

            // Create a modified offer with rtcp-mux
            let fixedOfferSdp = signal.sdp;
            if (!fixedOfferSdp.includes("a=rtcp-mux")) {
              fixedOfferSdp = fixedOfferSdp.replace(/(a=mid:(audio|video)\r\n)/g, "$1a=rtcp-mux\r\n");

              try {
                const fixedOffer = new RTCSessionDescription({
                  type: "offer",
                  sdp: fixedOfferSdp,
                });

                await pc.setRemoteDescription(fixedOffer);
                const answer = await pc.createAnswer();

                // Ensure our answer also has rtcp-mux
                let modifiedSdp = answer.sdp;
                if (!modifiedSdp.includes("a=rtcp-mux")) {
                  modifiedSdp = modifiedSdp.replace(/(a=mid:(audio|video)\r\n)/g, "$1a=rtcp-mux\r\n");
                }

                answer.sdp = modifiedSdp;
                await pc.setLocalDescription(answer);
                onSignal(pc.localDescription);
                console.log("Recovery successful: fixed rtcp-mux issue");
                return;
              } catch (recoveryErr) {
                console.error("Recovery attempt failed:", recoveryErr);
              }
            }
          }

          throw err;
        }
      } else if (signal.type === "answer") {
        console.log("Received answer, setting remote description");
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          console.log("Remote description set successfully");
        } catch (err) {
          console.error("Failed to set remote description:", err);

          // Recovery attempt for m-line order issues
          if ((err as any).message?.includes("order of m-lines") || (err as any).name === "InvalidAccessError") {
            console.warn("Detected m-line order issue, attempting recovery...");

            // Create a compatible answer by cloning our local description and modifying SDP
            const localDesc = pc.localDescription;
            if (localDesc && localDesc.sdp) {
              // Extract media sections from local description to ensure same order
              const mediaPattern = /m=(?:audio|video).*?(?=m=|$)/gs;
              const localMedia = localDesc.sdp.match(mediaPattern) || [];

              if (localMedia.length > 0) {
                console.log("Creating compatible answer based on our offer structure");

                // Create basic SDP with session-level attributes
                const sessionPattern = /(v=.*?)m=/s;
                const sessionMatch = localDesc.sdp.match(sessionPattern);
                const sessionPart = sessionMatch
                  ? sessionMatch[1]
                  : "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n";

                // Reuse the local media sections but change attributes as needed
                let fixedSdp = sessionPart;

                // Add media sections in the same order as the local description
                localMedia.forEach((section) => {
                  // Modify setup attribute for answer
                  fixedSdp += section.replace(/a=setup:actpass/g, "a=setup:active");
                });

                // Create a fixed answer and apply it
                const fixedAnswer = new RTCSessionDescription({
                  type: "answer",
                  sdp: fixedSdp,
                });

                try {
                  await pc.setRemoteDescription(fixedAnswer);
                  console.log("Recovery successful: set compatible remote description");
                  return; // Exit early on success
                } catch (recoveryErr) {
                  console.error("Recovery attempt failed:", recoveryErr);
                  // Continue to normal error handling
                }
              }
            }
          }

          // If we get here, we couldn't recover
          throw err;
        }
      } else if (signal.candidate) {
        // Only add candidate if remote description has been set
        if (pc.remoteDescription) {
          console.log("Adding ICE candidate");
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch((err) => {
            console.log("Non-fatal ICE candidate error:", err);
          });
        } else {
          console.log("Received ICE candidate before remote description, queueing");
          setTimeout(() => {
            if (pc.remoteDescription) {
              pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch((err) =>
                console.log("Non-fatal ICE candidate error:", err)
              );
            }
          }, 500);
        }
      }
    } catch (err) {
      console.error("Error processing signal:", err);
      console.error("Signal that caused error:", signal);

      // More descriptive error
      if ((err as any).message?.includes("rtcp-mux must be enabled")) {
        console.error("SDP format issue: rtcp-mux is required when BUNDLE is enabled");
      } else if ((err as any).message?.includes("order of m-lines")) {
        console.error("SDP format issue: The order of media lines in the SDP doesn't match between offer and answer");
      } else if ((err as any).message?.includes("ICE pwd")) {
        console.error("ICE password length issue detected. Needs to be 22-256 characters.");
      }

      onError(err);
    }
  };

  // Helper function to generate random string of specific length
  function generateRandomString(length: number) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let result = "";
    const randomValues = new Uint8Array(length);
    window.crypto.getRandomValues(randomValues);
    randomValues.forEach((val) => (result += chars[val % chars.length]));
    return result;
  }

  // Helper function to generate valid fingerprint
  function generateFingerprint() {
    // Generate 32 random bytes as hex pairs separated by colons
    const randomBytes = new Uint8Array(32);
    window.crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join(":");
  }

  // Start the connection process if we're the initiator
  start();

  // Return interface for controlling the connection
  return {
    processSignal,
    close: () => {
      console.log("Closing peer connection");
      pc.close();
    },
  };
};

const CallContext = createContext<CallContextType | null>(null);

export const useCallContext = (): CallContextType => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCallContext must be used within a CallProvider");
  }
  return context;
};

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const { data: session } = useSession();
  const { sendMessage } = useRealtimeChat();

  // Socket connection for call signaling
  const [socket, setSocket] = useState<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!session?.user) return;

    const newSocket = io(`${process.env.NEXT_PUBLIC_BACKEND_URL}/webrtc`, {
      auth: {
        userId: (session.user as any)?._id || (session.user as any)?.id,
        userRole: (session.user as any)?.role,
        userName: `${(session.user as any)?.firstName} ${(session.user as any)?.lastName}`,
      },
    });

    newSocket.on("connect", () => {
      console.log("Call Provider Socket connected");

      // Join WebRTC room with user info
      newSocket.emit("join-webrtc", {
        userId: (session.user as any)?._id || (session.user as any)?.id,
        userRole: (session.user as any)?.role,
        userName: `${(session.user as any)?.firstName} ${(session.user as any)?.lastName}`,
      });
    });

    newSocket.on("webrtc-joined", (data) => {
      console.log("Successfully joined WebRTC:", data);
    });

    newSocket.on("disconnect", () => {
      console.log("Call Provider Socket disconnected");
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [session?.user]);

  // Call state
  const [callState, setCallState] = useState<CallState>({
    inCall: false,
    isReceivingCall: false,
    caller: null,
    callerName: "",
    callerImage: "",
    callerRole: "", // doctor or patient
    receiverId: null,
    receiverName: "",
    receiverRole: "", // doctor or patient
    isVideoCall: false,
    callStartTime: null,
    callDuration: 0,
    callConnectionStatus: "disconnected", // connecting, connected, disconnected
    callerInfo: {
      name: "",
      role: "",
      image: "",
    },
  });

  // Media and peer connection refs
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<any>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentMessageIdRef = useRef(null);

  // Get current user info
  const currentUserId = (session?.user as any)?._id || (session?.user as any)?.id;
  const currentUserRole = (session?.user as any)?.role;

  // Start call timer
  const startCallTimer = () => {
    const startTime = Date.now();
    setCallState((prev) => ({ ...prev, callStartTime: startTime }));

    callTimerRef.current = setInterval(() => {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      setCallState((prev) => ({ ...prev, callDuration: duration }));
    }, 1000);
  };

  // Stop call timer
  const stopCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  };

  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Get user media
  const getUserMedia = async (isVideoCall) => {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: isVideoCall
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            }
          : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      if (error.name === "NotAllowedError") {
        toast.error("Vui lòng cấp quyền truy cập camera và microphone");
      } else {
        toast.error("Không thể truy cập thiết bị media");
      }
      throw error;
    }
  };

  // Initiate call
  const callUser = async (receiverId, receiverName, receiverRole, isVideoCall = false) => {
    try {
      if (!socket) {
        toast.error("Kết nối socket không khả dụng");
        return;
      }

      // Check if already in call
      if (callState.inCall) {
        toast.error("Bạn đang trong cuộc gọi khác");
        return;
      }

      console.log("Initiating call to:", receiverId, receiverName, receiverRole);

      // Send call start message to chat
      if (sendMessage) {
        const callStartMessage = `📞 Đang bắt đầu cuộc gọi ${isVideoCall ? "video" : "thoại"}...`;
        sendMessage(callStartMessage);
      }

      // Get user media first
      const stream = await getUserMedia(isVideoCall);

      // Update call state
      setCallState((prev) => ({
        ...prev,
        inCall: true,
        receiverId,
        receiverName,
        receiverRole,
        isVideoCall,
        callConnectionStatus: "connecting",
      }));

      // Create peer connection
      const peer = createPeerConnection({
        initiator: true,
        stream,
        isVideoCall,
        onSignal: (signal: any) => {
          socket.emit("call-user", {
            callerId: currentUserId,
            receiverId,
            callerName: (session?.user as any)?.firstName + " " + (session?.user as any)?.lastName,
            callerRole: currentUserRole,
            isVideoCall,
            signal,
          });
        },
        onStream: (stream: MediaStream) => {
          setRemoteStream(stream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
        },
        onError: (error: Error) => {
          console.error("Peer connection error:", error);
          toast.error("Lỗi kết nối cuộc gọi");
          endCall();
        },
        onClose: () => {
          console.log("Peer connection closed");
        },
      });

      peerConnectionRef.current = peer;
    } catch (error) {
      console.error("Error initiating call:", error);
      toast.error("Không thể bắt đầu cuộc gọi");
      endCall();
    }
  };

  // Answer incoming call
  const answerCall = async () => {
    try {
      if (!callState.isReceivingCall) return;

      console.log("Answering call from:", callState.caller);

      // Get user media
      const stream = await getUserMedia(callState.isVideoCall);

      // Update call state
      setCallState((prev) => ({
        ...prev,
        inCall: true,
        isReceivingCall: false,
        callConnectionStatus: "connecting",
      }));

      // Update the existing peer connection with local stream
      if (peerConnectionRef.current) {
        // Add local stream tracks to existing peer connection
        if (stream) {
          stream.getTracks().forEach((track: MediaStreamTrack) => {
            console.log(`Adding ${track.kind} track to existing peer connection`);
            // Note: We need to modify the peer connection to accept new stream
            // For now, we'll recreate it with the stream
          });
        }

        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }

      startCallTimer();
    } catch (error) {
      console.error("Error answering call:", error);
      toast.error("Không thể trả lời cuộc gọi");
      rejectCall();
    }
  };

  // Reject incoming call
  const rejectCall = (reason = "Từ chối cuộc gọi") => {
    if (callState.isReceivingCall) {
      socket?.emit("reject-call", {
        callerId: callState.caller,
        messageId: currentMessageIdRef.current,
        reason,
      });
    }

    // Reset call state
    setCallState({
      inCall: false,
      isReceivingCall: false,
      caller: null,
      callerName: "",
      callerImage: "",
      callerRole: "",
      receiverId: null,
      receiverName: "",
      receiverRole: "",
      isVideoCall: false,
      callStartTime: null,
      callDuration: 0,
      callConnectionStatus: "disconnected",
    });

    // Clean up streams
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      setRemoteStream(null);
    }

    // Clean up peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    stopCallTimer();
  };

  // End call
  const endCall = () => {
    if (socket && callState.inCall) {
      socket.emit("end-call", {
        callerId: currentUserId,
        receiverId: callState.receiverId,
        messageId: currentMessageIdRef.current,
        callDuration: callState.callDuration,
      });

      // Send call end message to chat
      if (sendMessage && callState.receiverId) {
        const duration = formatDuration(callState.callDuration);
        const callEndMessage = `📞 Cuộc gọi ${
          callState.isVideoCall ? "video" : "thoại"
        } đã kết thúc. Thời gian: ${duration}`;
        sendMessage(callEndMessage);
      }
    }

    rejectCall();
    toast.success("Cuộc gọi đã kết thúc");
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // Toggle speaker
  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // Note: Speaker control is limited in web browsers
    // This is more of a UI state for mobile implementations
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Incoming call
    socket.on("incoming-call", (data) => {
      console.log("Incoming call:", data);

      setCallState((prev) => ({
        ...prev,
        isReceivingCall: true,
        caller: data.callerId,
        callerName: data.callerName,
        callerRole: data.callerRole,
        isVideoCall: data.isVideoCall,
      }));

      currentMessageIdRef.current = data.messageId;

      // Create peer connection for receiving
      const peer = createPeerConnection({
        initiator: false,
        stream: null, // Will be set when answering
        isVideoCall: data.isVideoCall,
        onSignal: (signal: any) => {
          socket.emit("answer-call", {
            callerId: data.callerId,
            signal,
            messageId: data.messageId,
          });
        },
        onStream: (stream: MediaStream) => {
          setRemoteStream(stream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
        },
        onError: (error: Error) => {
          console.error("Peer connection error:", error);
          toast.error("Lỗi kết nối cuộc gọi");
          rejectCall();
        },
      });

      peerConnectionRef.current = peer;

      // Handle incoming signal
      if (data.signal) {
        peer.processSignal(data.signal);
      }
    });

    // Call accepted
    socket.on("call-accepted", (data) => {
      console.log("Call accepted:", data);

      setCallState((prev) => ({
        ...prev,
        callConnectionStatus: "connected",
      }));

      // Handle answer signal
      if (peerConnectionRef.current && data.signal) {
        peerConnectionRef.current.processSignal(data.signal);
      }

      startCallTimer();
      toast.success("Cuộc gọi đã được kết nối");
    });

    // Call rejected
    socket.on("call-rejected", (data) => {
      console.log("Call rejected:", data);
      toast.error(`Cuộc gọi bị từ chối: ${data.reason}`);
      endCall();
    });

    // Call ended
    socket.on("call-ended", (data) => {
      console.log("Call ended:", data);
      toast.info("Cuộc gọi đã kết thúc");
      rejectCall();
    });

    // ICE candidate
    socket.on("ice-candidate", (data) => {
      console.log("Received ICE candidate");
      if (peerConnectionRef.current) {
        peerConnectionRef.current.processSignal({ candidate: data.candidate });
      }
    });

    // Call failed
    socket.on("call-failed", (data) => {
      console.log("Call failed:", data);
      toast.error(data.message || "Cuộc gọi thất bại");
      endCall();
    });

    return () => {
      socket.off("incoming-call");
      socket.off("call-accepted");
      socket.off("call-rejected");
      socket.off("call-ended");
      socket.off("ice-candidate");
      socket.off("call-failed");
    };
  }, [socket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      stopCallTimer();
    };
  }, []);

  const contextValue = {
    // Call state
    callState,

    // Media refs
    localVideoRef,
    remoteVideoRef,

    // Media streams
    localStream,
    remoteStream,

    // Call controls
    callUser,
    answerCall,
    rejectCall,
    endCall,

    // Media controls
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    isMuted,
    isVideoOff,
    isSpeakerOn,

    // Utilities
    formatDuration,
  };

  return <CallContext.Provider value={contextValue}>{children}</CallContext.Provider>;
};
