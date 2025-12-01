import {
    mediaDevices,
    RTCIceCandidate,
    RTCPeerConnection,
    RTCSessionDescription
} from '@/services/webrtc';
import { io, Socket } from 'socket.io-client';

// Socket.IO server is NOT under /api/v1, so use raw URL without API prefix
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.51.8:8081';
const SOCKET_BASE_URL = BASE_URL.replace(/\/api\/v1$/, '');

// WebRTC Configuration
const configuration = {
  iceServers: [
    {
      urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],
    },
  ],
};

export interface CallMessage {
  _id: string;
  senderId: string;
  receiverId: string;
  senderRole: 'patient' | 'doctor';
  messageType: 'call';
  callType: 'audio' | 'video';
  callStatus: 'missed' | 'answered' | 'rejected' | 'completed';
  callDuration: number;
  startedAt: Date;
  endedAt?: Date;
  createdAt: string;
}

export interface IncomingCallData {
  callerId: string;
  callerName: string;
  callerRole: 'doctor' | 'patient';
  isVideoCall: boolean;
  signal: any;
  messageId: string;
}

class WebRTCService {
  private socket: Socket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  
  private userId: string | null = null;
  private userRole: 'patient' | 'doctor' | null = null;
  private userName: string | null = null;
  
  // Store current call info
  private currentCallReceiverId: string | null = null;
  private currentCallMessageId: string | null = null;
  
  private eventListeners: Map<string, Array<(...args: any[]) => void>> = new Map();

  // Connect to WebRTC socket
  connect(token: string, userId: string, userRole: 'patient' | 'doctor', userName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.userId = userId;
        this.userRole = userRole;
        this.userName = userName;

        console.log(`🔌 [WebRTC] Connecting to ${SOCKET_BASE_URL}/webrtc`);

        const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

        this.socket = io(`${SOCKET_BASE_URL}/webrtc`, {
          auth: {
            token: formattedToken,
            userId,
            userRole,
          },
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
          console.log(`✅ [WebRTC] Connected with ID: ${this.socket?.id}`);
          
          // Join WebRTC room
          console.log('📤 [WebRTC] Joining WebRTC room with user:', userId, userName, userRole);
          this.socket?.emit('join-webrtc', {
            userId,
            userRole,
            userName,
          });

          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ [WebRTC] Connection error:', error);
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('🔌 [WebRTC] Disconnected:', reason);
        });

        this.socket.on('webrtc-joined', (data) => {
          console.log('✅ [WebRTC] Successfully joined WebRTC room:', data);
        });

        this.socket.on('call-initiated', (data) => {
          console.log('✅ [WebRTC] Call initiated successfully:', data);
          // Store call info for later use (e.g., when ending call)
          this.currentCallMessageId = data.messageId;
        });

        this.socket.on('call-failed', (data) => {
          console.error('❌ [WebRTC] Call failed:', data);
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

    console.log('🎧 [WebRTC] Setting up event listeners');

    // Incoming call
    this.socket.on('incoming-call', (data: IncomingCallData) => {
      console.log('📞 [WebRTC] ===== INCOMING CALL RECEIVED =====');
      console.log('📞 [WebRTC] Caller:', data.callerName, data.callerId);
      console.log('📞 [WebRTC] Video call:', data.isVideoCall);
      console.log('📞 [WebRTC] Message ID:', data.messageId);
      this.emit('incomingCall', data);
    });

    // Call answered
    this.socket.on('call-answered', (data: { signal: any; answererId: string }) => {
      console.log('✅ [WebRTC] Call answered by:', data.answererId);
      this.emit('callAnswered', data);
    });

    // Call rejected
    this.socket.on('call-rejected', (data: { reason?: string }) => {
      console.log('❌ [WebRTC] Call rejected:', data.reason);
      this.emit('callRejected', data);
    });

    // Call ended
    this.socket.on('call-ended', (data: { userId: string; messageId: string }) => {
      console.log('📞 [WebRTC] ===== CALL ENDED =====');
      console.log('📞 [WebRTC] Ended by userId:', data.userId);
      console.log('📞 [WebRTC] Message ID:', data.messageId);
      this.emit('callEnded', data);
    });

    // ICE candidate
    this.socket.on('ice-candidate', (data: { candidate: any; callerId?: string; receiverId?: string }) => {
      console.log('🧊 [WebRTC] ===== RECEIVED ICE CANDIDATE =====');
      console.log('🧊 [WebRTC] From:', data.callerId, 'To:', data.receiverId);
      console.log('🧊 [WebRTC] Candidate type:', data.candidate?.type);
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
              facingMode: 'user',
            }
          : false,
      };

      const stream = await mediaDevices.getUserMedia(constraints);
      this.localStream = stream;
      console.log('✅ [WebRTC] Got user media:', stream.id);
      
      return stream;
    } catch (error) {
      console.error('❌ [WebRTC] Error getting user media:', error);
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

    // Handle remote stream
    (pc as any).ontrack = (event: any) => {
      console.log('📺 [WebRTC] Received remote track');
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.emit('remoteStream', this.remoteStream);
      }
    };

    // Handle ICE candidates
    (pc as any).onicecandidate = (event: any) => {
      if (event.candidate) {
        console.log('🧊 [WebRTC] New ICE candidate:', event.candidate.type, event.candidate.protocol);
        this.socket?.emit('ice-candidate', {
          callerId: this.userId,
          receiverId: this.currentCallReceiverId,
          candidate: event.candidate,
        });
      } else {
        console.log('🧊 [WebRTC] ICE gathering completed');
      }
    };

    // Handle connection state
    (pc as any).onconnectionstatechange = () => {
      console.log('🔗 [WebRTC] ===== CONNECTION STATE CHANGE =====');
      console.log('🔗 [WebRTC] Connection state:', pc.connectionState);
      console.log('🔗 [WebRTC] ICE connection state:', pc.iceConnectionState);
      console.log('🔗 [WebRTC] ICE gathering state:', pc.iceGatheringState);
      console.log('🔗 [WebRTC] Signaling state:', pc.signalingState);
      this.emit('connectionStateChange', pc.connectionState);
    };
    
    // Add ICE connection state change handler
    (pc as any).oniceconnectionstatechange = () => {
      console.log('🧊 [WebRTC] ICE connection state changed:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        console.error('❌ [WebRTC] ICE connection failed or disconnected');
      }
    };

    this.peerConnection = pc;
    return pc;
  }

  // Initiate call
  async initiateCall(
    receiverId: string,
    receiverName: string,
    receiverRole: 'doctor' | 'patient',
    isVideoCall: boolean
  ): Promise<void> {
    try {
      console.log(`📞 [WebRTC] Initiating ${isVideoCall ? 'video' : 'audio'} call to:`, receiverName, receiverId);

      if (!this.socket || !this.socket.connected) {
        console.error('❌ [WebRTC] Socket not connected!');
        throw new Error('WebRTC socket not connected');
      }

      console.log('✅ [WebRTC] Socket is connected, ID:', this.socket.id);

      // Store receiver ID for ending call later
      this.currentCallReceiverId = receiverId;

      // Get user media
      await this.getUserMedia(isVideoCall);

      // Create peer connection
      const pc = this.createPeerConnection(isVideoCall);

      console.log('📝 [WebRTC] Creating offer...');
      // Create offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideoCall,
      });

      console.log('📝 [WebRTC] Setting local description (offer)...');
      await pc.setLocalDescription(offer);
      console.log('✅ [WebRTC] Local description set:', offer.type);

      console.log('📤 [WebRTC] Emitting call-user event with data:', {
        callerId: this.userId,
        receiverId,
        isVideoCall,
      });

      // Send call request
      this.socket?.emit('call-user', {
        callerId: this.userId,
        callerName: this.userName,
        callerRole: this.userRole,
        receiverId,
        receiverName,
        receiverRole,
        isVideoCall,
        signal: offer,
      });

      console.log('✅ [WebRTC] Call request sent');
    } catch (error) {
      console.error('❌ [WebRTC] Error initiating call:', error);
      this.cleanup();
      throw error;
    }
  }

  // Answer call
  async answerCall(callData: IncomingCallData): Promise<void> {
    try {
      console.log('✅ [WebRTC] Answering call from:', callData.callerName);

      // Store caller ID and message ID for ending call later
      this.currentCallReceiverId = callData.callerId;
      this.currentCallMessageId = callData.messageId;

      // Get user media
      await this.getUserMedia(callData.isVideoCall);

      // Create peer connection
      const pc = this.createPeerConnection(callData.isVideoCall);

      console.log('📝 [WebRTC] Setting remote description (offer)...');
      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription(callData.signal));
      console.log('✅ [WebRTC] Remote description set:', callData.signal.type);

      console.log('📝 [WebRTC] Creating answer...');
      // Create answer
      const answer = await pc.createAnswer();
      
      console.log('📝 [WebRTC] Setting local description (answer)...');
      await pc.setLocalDescription(answer);
      console.log('✅ [WebRTC] Local description set:', answer.type);

      console.log('📤 [WebRTC] Emitting answer-call event');
      // Send answer
      this.socket?.emit('answer-call', {
        callerId: callData.callerId,
        signal: answer,
        messageId: callData.messageId,
      });

      console.log('✅ [WebRTC] Answer sent');
    } catch (error) {
      console.error('❌ [WebRTC] Error answering call:', error);
      this.cleanup();
      throw error;
    }
  }

  // Handle call answered (for caller)
  async handleCallAnswered(signal: any): Promise<void> {
    try {
      console.log('📝 [WebRTC] Handling call answered, signal type:', signal?.type);
      
      if (!this.peerConnection) {
        console.error('❌ [WebRTC] No peer connection when handling answer');
        return;
      }
      
      console.log('📝 [WebRTC] Setting remote description (answer)...');
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
      console.log('✅ [WebRTC] Remote description set:', signal.type);
    } catch (error) {
      console.error('❌ [WebRTC] Error handling call answer:', error);
    }
  }

  // Handle ICE candidate
  private async handleICECandidate(candidate: any): Promise<void> {
    try {
      if (!this.peerConnection) {
        console.warn('⚠️ [WebRTC] No peer connection to add ICE candidate');
        return;
      }
      
      if (!candidate) {
        console.warn('⚠️ [WebRTC] Empty ICE candidate');
        return;
      }
      
      console.log('➕ [WebRTC] Adding ICE candidate to peer connection');
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('✅ [WebRTC] ICE candidate added successfully');
    } catch (error) {
      console.error('❌ [WebRTC] Error adding ICE candidate:', error);
    }
  }

  // Reject call
  rejectCall(callerId: string, reason?: string): void {
    console.log('❌ [WebRTC] Rejecting call from:', callerId);
    this.socket?.emit('reject-call', {
      callerId,
      reason: reason || 'Call rejected',
    });
  }

  // End call
  endCall(receiverId?: string, messageId?: string): void {
    console.log('📞 [WebRTC] Ending call');
    
    const targetReceiverId = receiverId || this.currentCallReceiverId;
    const targetMessageId = messageId || this.currentCallMessageId;
    
    if (targetReceiverId && targetMessageId) {
      console.log('📤 [WebRTC] Emitting end-call event:', { receiverId: targetReceiverId, messageId: targetMessageId });
      this.socket?.emit('end-call', {
        receiverId: targetReceiverId,
        messageId: targetMessageId,
      });
    } else {
      console.warn('⚠️ [WebRTC] No receiver/message ID to send end-call event');
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
    console.log('🧹 [WebRTC] Cleaning up');

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
    this.currentCallReceiverId = null;
    this.currentCallMessageId = null;
    
    console.log('✅ [WebRTC] Cleanup complete');
  }

  // Disconnect
  disconnect(): void {
    console.log('🔌 [WebRTC] Disconnecting');
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
