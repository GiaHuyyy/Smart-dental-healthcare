import {
  mediaDevices,
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
} from "@/services/webrtc";
import { io, Socket } from "socket.io-client";

// Socket.IO server is NOT under /api/v1, so use raw URL without API prefix
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.51.8:8081";
const SOCKET_BASE_URL = BASE_URL.replace(/\/api\/v1$/, "");

// WebRTC Configuration
const configuration = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
    },
  ],
};

export interface CallMessage {
  _id: string;
  senderId: string;
  receiverId: string;
  senderRole: "patient" | "doctor";
  messageType: "call";
  callType: "audio" | "video";
  callStatus: "missed" | "answered" | "rejected" | "completed";
  callDuration: number;
  startedAt: Date;
  endedAt?: Date;
  createdAt: string;
}

export interface IncomingCallData {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callerRole: "doctor" | "patient";
  isVideoCall: boolean;
  signalData: any;
}

class WebRTCService {
  private socket: Socket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  private userId: string | null = null;
  private userRole: "patient" | "doctor" | null = null;
  private userName: string | null = null;
  private userAvatar: string | null = null;

  // Store current call info
  private currentCallId: string | null = null;
  private currentCallReceiverId: string | null = null;
  private currentCallMessageId: string | null = null;
  private isCallEnding: boolean = false; // Flag to track if call is ending normally

  private eventListeners: Map<string, Array<(...args: any[]) => void>> = new Map();

  // Helper: Wait for ICE gathering to complete (for SimplePeer compatibility - trickle: false)
  private waitForIceGatheringComplete(pc: RTCPeerConnection, timeout = 5000): Promise<void> {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === "complete") {
        resolve();
        return;
      }

      const timeoutId = setTimeout(() => {
        console.log("⏰ [WebRTC] ICE gathering timeout, proceeding anyway");
        resolve();
      }, timeout);

      const checkState = () => {
        if (pc.iceGatheringState === "complete") {
          clearTimeout(timeoutId);
          (pc as any).removeEventListener("icegatheringstatechange", checkState);
          resolve();
        }
      };

      (pc as any).addEventListener("icegatheringstatechange", checkState);
    });
  }

  // Connect to WebRTC socket
  connect(
    token: string,
    userId: string,
    userRole: "patient" | "doctor",
    userName: string,
    userAvatar?: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.userId = userId;
        this.userRole = userRole;
        this.userName = userName;
        this.userAvatar = userAvatar || null;

        console.log(`🔌 [WebRTC] Connecting to ${SOCKET_BASE_URL}/webrtc`);

        const formattedToken = token.startsWith("Bearer ") ? token : `Bearer ${token}`;

        this.socket = io(`${SOCKET_BASE_URL}/webrtc`, {
          auth: {
            token: formattedToken,
            userId,
            userRole,
          },
          transports: ["websocket", "polling"],
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        this.socket.on("connect", () => {
          console.log(`✅ [WebRTC] Connected with ID: ${this.socket?.id}`);

          // Join WebRTC room - match server format
          console.log("📤 [WebRTC] Joining WebRTC room with user:", userId, userName, userRole);
          this.socket?.emit("join", {
            odataId: userId,
            userName,
            userRole,
          });

          resolve();
        });

        this.socket.on("connect_error", (error) => {
          console.error("❌ [WebRTC] Connection error:", error);
          reject(error);
        });

        this.socket.on("disconnect", (reason) => {
          console.log("🔌 [WebRTC] Disconnected:", reason);
        });

        this.socket.on("joined", (data) => {
          console.log("✅ [WebRTC] Successfully joined WebRTC room:", data);
        });

        this.socket.on("call-initiated", (data) => {
          console.log("✅ [WebRTC] Call initiated successfully:", data);
          // Store call info for later use (e.g., when ending call)
          this.currentCallMessageId = data.messageId;
        });

        this.socket.on("call-failed", (data) => {
          console.error("❌ [WebRTC] Call failed:", data);
        });

        // Setup event listeners
        this.setupEventListeners();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Setup all socket event listeners
  private setupEventListeners() {
    if (!this.socket) return;

    console.log("🎧 [WebRTC] Setting up event listeners");

    // Incoming call
    this.socket.on("incoming-call", (data: IncomingCallData) => {
      console.log("📞 [WebRTC] ===== INCOMING CALL RECEIVED =====");
      console.log("📞 [WebRTC] Call ID:", data.callId);
      console.log("📞 [WebRTC] Caller:", data.callerName, data.callerId);
      console.log("📞 [WebRTC] Video call:", data.isVideoCall);
      // Store callId for later use
      this.currentCallId = data.callId;
      this.emit("incomingCall", data);
    });

    // Call answered
    this.socket.on("call-answered", (data: { callId: string; signalData: any }) => {
      console.log("✅ [WebRTC] Call answered, callId:", data.callId);
      this.emit("callAnswered", data);
    });

    // Call rejected
    this.socket.on("call-rejected", (data: { callId: string; reason?: string }) => {
      console.log("❌ [WebRTC] Call rejected:", data.callId, data.reason);
      this.emit("callRejected", data);
    });

    // Call ended
    this.socket.on("call-ended", (data: { callId: string; duration: number; reason?: string }) => {
      console.log("📞 [WebRTC] ===== CALL ENDED =====");
      console.log("📞 [WebRTC] Call ID:", data.callId);
      console.log("📞 [WebRTC] Duration:", data.duration);
      console.log("📞 [WebRTC] Reason:", data.reason);
      // Set flag to prevent error logs on ICE disconnect
      this.isCallEnding = true;
      this.emit("callEnded", data);
      // Cleanup after emitting event
      this.cleanup();
    });

    // ICE candidate
    this.socket.on("ice-candidate", (data: { callId: string; candidate: any }) => {
      console.log("🧊 [WebRTC] ===== RECEIVED ICE CANDIDATE =====");
      console.log("🧊 [WebRTC] Call ID:", data.callId);
      console.log("🧊 [WebRTC] Candidate type:", data.candidate?.type);
      this.handleICECandidate(data.candidate);
    });
  }

  // Get user media (camera/microphone)
  async getUserMedia(isVideoCall: boolean): Promise<MediaStream> {
    try {
      const constraints: any = {
        audio: true,
        video: isVideoCall
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
              facingMode: "user",
            }
          : false,
      };

      const stream = await mediaDevices.getUserMedia(constraints);
      this.localStream = stream;
      console.log("✅ [WebRTC] Got user media:", stream.id);

      return stream;
    } catch (error) {
      console.error("❌ [WebRTC] Error getting user media:", error);
      throw error;
    }
  }

  // Create peer connection
  private createPeerConnection(isVideoCall: boolean): RTCPeerConnection {
    const pc = new RTCPeerConnection(configuration);

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        if (this.localStream) {
          pc.addTrack(track, this.localStream);
        }
      });
    }

    // Handle remote stream - multiple ways to catch it
    (pc as any).ontrack = (event: any) => {
      console.log("📺 [WebRTC] ===== RECEIVED REMOTE TRACK =====");
      console.log("📺 [WebRTC] Track kind:", event.track?.kind);
      console.log("📺 [WebRTC] Streams count:", event.streams?.length);

      if (event.streams && event.streams[0]) {
        console.log("📺 [WebRTC] Got stream from event.streams[0]");
        this.remoteStream = event.streams[0];
        this.emit("remoteStream", this.remoteStream);
      } else if (event.track) {
        // Fallback: create MediaStream from track if streams not available
        console.log("📺 [WebRTC] Creating stream from track");
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream() as any;
        }
        (this.remoteStream as any).addTrack(event.track);
        this.emit("remoteStream", this.remoteStream);
      }
    };

    // Also listen for addstream event (older API, but some implementations use it)
    (pc as any).onaddstream = (event: any) => {
      console.log("📺 [WebRTC] ===== ON ADD STREAM (legacy) =====");
      if (event.stream) {
        console.log("📺 [WebRTC] Got stream from onaddstream");
        this.remoteStream = event.stream;
        this.emit("remoteStream", this.remoteStream);
      }
    };

    // Handle ICE candidates - DON'T send individually, SimplePeer uses trickle: false
    // ICE candidates will be included in the SDP after gathering completes
    (pc as any).onicecandidate = (event: any) => {
      if (event.candidate) {
        console.log("🧊 [WebRTC] ICE candidate gathered:", event.candidate.type, event.candidate.protocol);
        // Don't emit - wait for gathering complete and send full SDP
      } else {
        console.log("🧊 [WebRTC] ICE gathering completed");
      }
    };

    // Handle connection state
    (pc as any).onconnectionstatechange = () => {
      console.log("🔗 [WebRTC] ===== CONNECTION STATE CHANGE =====");
      console.log("🔗 [WebRTC] Connection state:", pc.connectionState);
      console.log("🔗 [WebRTC] ICE connection state:", pc.iceConnectionState);
      console.log("🔗 [WebRTC] ICE gathering state:", pc.iceGatheringState);
      console.log("🔗 [WebRTC] Signaling state:", pc.signalingState);
      this.emit("connectionStateChange", pc.connectionState);
    };

    // Add ICE connection state change handler
    (pc as any).oniceconnectionstatechange = () => {
      console.log("🧊 [WebRTC] ICE connection state changed:", pc.iceConnectionState);
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        console.log("✅ [WebRTC] ICE connection established!");
      }
      if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
        // Only log error if call is NOT ending normally
        if (!this.isCallEnding) {
          console.error("❌ [WebRTC] ICE connection failed or disconnected");
        } else {
          console.log("🔗 [WebRTC] ICE disconnected (call ended normally)");
        }
      }
    };

    // Add signaling state change handler
    (pc as any).onsignalingstatechange = () => {
      console.log("📡 [WebRTC] Signaling state changed:", pc.signalingState);
      if (pc.signalingState === "stable") {
        console.log("✅ [WebRTC] Signaling state is stable - connection should be ready");
      }
    };

    this.peerConnection = pc;
    return pc;
  }

  // Initiate call
  async initiateCall(
    receiverId: string,
    receiverName: string,
    receiverRole: "doctor" | "patient",
    isVideoCall: boolean
  ): Promise<void> {
    try {
      console.log(`📞 [WebRTC] Initiating ${isVideoCall ? "video" : "audio"} call to:`, receiverName, receiverId);

      if (!this.socket || !this.socket.connected) {
        console.error("❌ [WebRTC] Socket not connected!");
        throw new Error("WebRTC socket not connected");
      }

      console.log("✅ [WebRTC] Socket is connected, ID:", this.socket.id);

      // Generate callId (same format as client)
      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.currentCallId = callId;
      this.currentCallReceiverId = receiverId;

      // Get user media
      await this.getUserMedia(isVideoCall);

      // Create peer connection
      const pc = this.createPeerConnection(isVideoCall);

      console.log("📝 [WebRTC] Creating offer...");
      // Create offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideoCall,
      });

      console.log("📝 [WebRTC] Setting local description (offer)...");
      await pc.setLocalDescription(offer);
      console.log("✅ [WebRTC] Local description set:", offer.type);

      // Wait for ICE gathering to complete (SimplePeer compatibility - trickle: false)
      console.log("🧊 [WebRTC] Waiting for ICE gathering to complete...");
      await this.waitForIceGatheringComplete(pc);
      console.log("✅ [WebRTC] ICE gathering complete, sending offer with all candidates");

      // Get the final SDP with all ICE candidates included
      const finalOffer = pc.localDescription;

      console.log("📤 [WebRTC] Emitting call-user event with data:", {
        callId,
        callerId: this.userId,
        receiverId,
        isVideoCall,
      });

      // Send call request - match server format
      this.socket?.emit("call-user", {
        callId,
        callerId: this.userId,
        callerName: this.userName,
        callerAvatar: this.userAvatar,
        receiverId,
        receiverName,
        isVideoCall,
        signalData: finalOffer,
      });

      console.log("✅ [WebRTC] Call request sent");
    } catch (error) {
      console.error("❌ [WebRTC] Error initiating call:", error);
      this.cleanup();
      throw error;
    }
  }

  // Answer call
  async answerCall(callData: IncomingCallData): Promise<void> {
    try {
      console.log("✅ [WebRTC] Answering call from:", callData.callerName);

      // Store call info for ending call later
      this.currentCallId = callData.callId;
      this.currentCallReceiverId = callData.callerId;

      // Get user media
      await this.getUserMedia(callData.isVideoCall);

      // Create peer connection
      const pc = this.createPeerConnection(callData.isVideoCall);

      console.log("📝 [WebRTC] Setting remote description (offer)...");
      // Set remote description - use signalData from server
      await pc.setRemoteDescription(new RTCSessionDescription(callData.signalData));
      console.log("✅ [WebRTC] Remote description set:", callData.signalData.type);

      console.log("📝 [WebRTC] Creating answer...");
      // Create answer
      const answer = await pc.createAnswer();

      console.log("📝 [WebRTC] Setting local description (answer)...");
      await pc.setLocalDescription(answer);
      console.log("✅ [WebRTC] Local description set:", answer.type);

      // Wait for ICE gathering to complete (SimplePeer compatibility - trickle: false)
      console.log("🧊 [WebRTC] Waiting for ICE gathering to complete...");
      await this.waitForIceGatheringComplete(pc);
      console.log("✅ [WebRTC] ICE gathering complete, sending answer with all candidates");

      // Get the final SDP with all ICE candidates included
      const finalAnswer = pc.localDescription;

      console.log("📤 [WebRTC] Emitting answer-call event");
      // Send answer - match server format
      this.socket?.emit("answer-call", {
        callId: callData.callId,
        signalData: finalAnswer,
      });

      console.log("✅ [WebRTC] Answer sent");
    } catch (error) {
      console.error("❌ [WebRTC] Error answering call:", error);
      this.cleanup();
      throw error;
    }
  }

  // Handle call answered (for caller)
  async handleCallAnswered(signalData: any): Promise<void> {
    try {
      console.log("📝 [WebRTC] Handling call answered");
      console.log("📝 [WebRTC] Signal data received:", JSON.stringify(signalData).substring(0, 200));

      if (!this.peerConnection) {
        console.error("❌ [WebRTC] No peer connection when handling answer");
        return;
      }

      // Log current state before setting remote description
      console.log("📝 [WebRTC] Current signaling state:", this.peerConnection.signalingState);
      console.log("📝 [WebRTC] Current ICE connection state:", this.peerConnection.iceConnectionState);

      // SimplePeer may send signal in different format
      // It could be { type: 'answer', sdp: '...' } or just the SDP object
      let sdpData = signalData;

      // If signalData has sdp property, use it
      if (signalData && typeof signalData === "object") {
        if (signalData.sdp && signalData.type) {
          sdpData = signalData;
        } else if (signalData.sdp) {
          sdpData = { type: "answer", sdp: signalData.sdp };
        }
      }

      console.log("📝 [WebRTC] Setting remote description (answer), type:", sdpData?.type);
      console.log("📝 [WebRTC] SDP length:", sdpData?.sdp?.length);

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdpData));

      console.log("✅ [WebRTC] Remote description set successfully");
      console.log("📝 [WebRTC] New signaling state:", this.peerConnection.signalingState);
      console.log("📝 [WebRTC] New ICE connection state:", this.peerConnection.iceConnectionState);
    } catch (error) {
      console.error("❌ [WebRTC] Error handling call answer:", error);
    }
  }

  // Handle ICE candidate
  private async handleICECandidate(candidate: any): Promise<void> {
    try {
      if (!this.peerConnection) {
        console.warn("⚠️ [WebRTC] No peer connection to add ICE candidate");
        return;
      }

      if (!candidate) {
        console.warn("⚠️ [WebRTC] Empty ICE candidate");
        return;
      }

      console.log("➕ [WebRTC] Adding ICE candidate to peer connection");
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log("✅ [WebRTC] ICE candidate added successfully");
    } catch (error) {
      console.error("❌ [WebRTC] Error adding ICE candidate:", error);
    }
  }

  // Reject call
  rejectCall(callId: string, reason?: string): void {
    console.log("❌ [WebRTC] Rejecting call:", callId);
    this.socket?.emit("reject-call", {
      callId,
      reason: reason || "Cuộc gọi bị từ chối",
    });
    this.currentCallId = null;
  }

  // End call
  endCall(): void {
    console.log("📞 [WebRTC] Ending call");

    // Set flag to prevent error logs on ICE disconnect
    this.isCallEnding = true;

    if (this.currentCallId) {
      console.log("📤 [WebRTC] Emitting end-call event:", { callId: this.currentCallId });
      this.socket?.emit("end-call", {
        callId: this.currentCallId,
      });
    } else {
      console.warn("⚠️ [WebRTC] No callId to send end-call event");
    }

    this.cleanup();
  }

  // Media controls
  toggleMute(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return !audioTrack.enabled; // Return true if muted
      }
    }
    return false;
  }

  toggleVideo(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return !videoTrack.enabled; // Return true if video off
      }
    }
    return false;
  }

  switchCamera(): void {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        // @ts-ignore - _switchCamera is internal method
        videoTrack._switchCamera();
      }
    }
  }

  // Event emitter
  on(event: string, handler: (...args: any[]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(handler);
  }

  off(event: string, handler: (...args: any[]) => void): void {
    if (this.eventListeners.has(event)) {
      const handlers = this.eventListeners.get(event)!;
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, ...args: any[]): void {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event)!.forEach((handler) => {
        handler(...args);
      });
    }
  }

  // Cleanup
  private cleanup(): void {
    console.log("🧹 [WebRTC] Cleaning up");

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;

    // Clear call info
    this.currentCallId = null;
    this.currentCallReceiverId = null;
    this.currentCallMessageId = null;

    // Reset flag after a short delay to allow ICE disconnect events to be handled
    setTimeout(() => {
      this.isCallEnding = false;
    }, 1000);

    console.log("✅ [WebRTC] Cleanup complete");
  }

  // Disconnect
  disconnect(): void {
    console.log("🔌 [WebRTC] Disconnecting");
    this.cleanup();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.eventListeners.clear();
  }

  // Getters
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Export singleton
const webrtcService = new WebRTCService();
export default webrtcService;
