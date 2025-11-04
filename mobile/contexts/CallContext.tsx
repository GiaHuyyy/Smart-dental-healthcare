import webrtcService, { IncomingCallData } from '@/services/webrtcService';
import { router } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { MediaStream } from '@/services/webrtc';
import { useAuth } from './auth-context';

interface CallState {
  inCall: boolean;
  isReceivingCall: boolean;
  isVideoCall: boolean;

  caller: string | null;
  callerName: string;
  callerRole: 'doctor' | 'patient';

  receiver: string | null;
  receiverName: string;
  receiverRole: 'doctor' | 'patient';

  callStartTime: Date | null;
  callDuration: number;
  callStatus: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'ended';

  localStream: MediaStream | null;
  remoteStream: MediaStream | null;

  isMuted: boolean;
  isVideoOff: boolean;
  isSpeakerOn: boolean;

  messageId: string | null;
}

interface CallContextType {
  callState: CallState;
  
  // Call actions
  initiateCall: (receiverId: string, receiverName: string, receiverRole: 'doctor' | 'patient', isVideoCall: boolean) => Promise<void>;
  answerCall: () => Promise<void>;
  rejectCall: (reason?: string) => void;
  endCall: () => void;

  // Media controls
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleSpeaker: () => void;
  switchCamera: () => void;

  // Call history callback setter
  setOnCallEnded: (callback?: (callInfo: {
    receiverId: string;
    receiverName: string;
    isVideoCall: boolean;
    callStatus: 'missed' | 'answered' | 'rejected' | 'completed';
    callDuration?: number;
    isOutgoing: boolean;
  }) => void) => void;

  // Utilities
  formatDuration: (seconds: number) => string;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const [callState, setCallState] = useState<CallState>({
    inCall: false,
    isReceivingCall: false,
    isVideoCall: false,
    caller: null,
    callerName: '',
    callerRole: 'patient',
    receiver: null,
    receiverName: '',
    receiverRole: 'doctor',
    callStartTime: null,
    callDuration: 0,
    callStatus: 'idle',
    localStream: null,
    remoteStream: null,
    isMuted: false,
    isVideoOff: false,
    isSpeakerOn: true,
    messageId: null,
  });

  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callEndedCallbackRef = useRef<CallContextType['onCallEnded']>();
  const incomingCallDataRef = useRef<IncomingCallData | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Connect to WebRTC when authenticated
  useEffect(() => {
    if (session?.token && session?.user) {
      const userId = session.user._id;
      const userName = session.user.fullName || 'User';
      const userRole = session.user.role as 'doctor' | 'patient';

      webrtcService
        .connect(session.token, userId, userRole, userName)
        .then(() => {
          console.log('✅ [CallContext] WebRTC connected');
        })
        .catch((error) => {
          console.error('❌ [CallContext] Failed to connect WebRTC:', error);
        });

      return () => {
        webrtcService.disconnect();
      };
    }
  }, [session]);

  // Setup WebRTC event listeners
  useEffect(() => {
    // Incoming call
    const handleIncomingCall = (data: IncomingCallData) => {
      console.log('📞 [CallContext] Incoming call from:', data.callerName);
      
      incomingCallDataRef.current = data;
      
      setCallState((prev) => ({
        ...prev,
        isReceivingCall: true,
        caller: data.callerId,
        callerName: data.callerName,
        callerRole: data.callerRole,
        isVideoCall: data.isVideoCall,
        messageId: data.messageId,
        callStatus: 'idle',
      }));
    };

    // Call answered
    const handleCallAnswered = async (data: { signal: any; answererId: string }) => {
      console.log('✅ [CallContext] Call answered by:', data.answererId);
      
      try {
        await webrtcService.handleCallAnswered(data.signal);
        
        setCallState((prev) => ({
          ...prev,
          callStatus: 'connected',
          callStartTime: new Date(),
        }));

        console.log('✅ [CallContext] Call connected, starting timer');
        startCallTimer();
      } catch (error) {
        console.error('❌ [CallContext] Error handling call answer:', error);
        Alert.alert('Lỗi', 'Không thể kết nối cuộc gọi');
        endCall();
      }
    };

    // Call rejected
    const handleCallRejected = (data: { reason?: string }) => {
      console.log('❌ [CallContext] Call rejected:', data.reason);
      
      Alert.alert('Cuộc gọi bị từ chối', data.reason || 'Người nhận đã từ chối cuộc gọi');
      resetCallState();
    };

    // Call ended
    const handleCallEnded = (data: { userId: string; messageId: string }) => {
      console.log('📞 [CallContext] ===== CALL ENDED EVENT =====');
      console.log('📞 [CallContext] Ended by userId:', data.userId);
      console.log('📞 [CallContext] Message ID:', data.messageId);
      
      // Trigger callback before resetting state
      if (callEndedCallbackRef.current) {
        const isOutgoing = callState.receiver !== null;
        const partnerId = isOutgoing ? callState.receiver : callState.caller;
        const partnerName = isOutgoing ? callState.receiverName : callState.callerName;
        
        if (partnerId && partnerName) {
          callEndedCallbackRef.current({
            receiverId: partnerId,
            receiverName: partnerName,
            isVideoCall: callState.isVideoCall,
            callStatus: callState.callStatus === 'connected' ? 'completed' : 'missed',
            callDuration: callState.callStatus === 'connected' ? callState.callDuration : undefined,
            isOutgoing,
          });
        }
      }
      
      Alert.alert('Cuộc gọi đã kết thúc', 'Cuộc gọi đã được kết thúc');
      resetCallState();
    };

    // Remote stream
    const handleRemoteStream = (stream: MediaStream) => {
      console.log('📺 [CallContext] Received remote stream');
      
      setCallState((prev) => ({
        ...prev,
        remoteStream: stream,
      }));
    };

    // Connection state change
    const handleConnectionStateChange = (state: string) => {
      console.log('🔗 [CallContext] Connection state:', state);
      
      let callStatus: CallState['callStatus'] = 'idle';
      
      switch (state) {
        case 'connecting':
          callStatus = 'connecting';
          break;
        case 'connected':
          callStatus = 'connected';
          if (!callState.callStartTime) {
            setCallState((prev) => ({
              ...prev,
              callStartTime: new Date(),
            }));
            startCallTimer();
          }
          break;
        case 'disconnected':
        case 'failed':
        case 'closed':
          callStatus = 'ended';
          Alert.alert('Mất kết nối', 'Cuộc gọi đã bị ngắt kết nối');
          resetCallState();
          break;
      }
      
      setCallState((prev) => ({
        ...prev,
        callStatus,
      }));
    };

    // Register listeners
    webrtcService.on('incomingCall', handleIncomingCall);
    webrtcService.on('callAnswered', handleCallAnswered);
    webrtcService.on('callRejected', handleCallRejected);
    webrtcService.on('callEnded', handleCallEnded);
    webrtcService.on('remoteStream', handleRemoteStream);
    webrtcService.on('connectionStateChange', handleConnectionStateChange);

    return () => {
      webrtcService.off('incomingCall', handleIncomingCall);
      webrtcService.off('callAnswered', handleCallAnswered);
      webrtcService.off('callRejected', handleCallRejected);
      webrtcService.off('callEnded', handleCallEnded);
      webrtcService.off('remoteStream', handleRemoteStream);
      webrtcService.off('connectionStateChange', handleConnectionStateChange);
    };
  }, [callState.callStartTime]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('📱 [CallContext] App came to foreground');
      } else if (nextAppState.match(/inactive|background/)) {
        console.log('📱 [CallContext] App went to background');
        // Consider ending call or showing notification
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Call timer
  const startCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }

    callTimerRef.current = setInterval(() => {
      setCallState((prev) => {
        if (!prev.callStartTime) return prev;
        
        const duration = Math.floor((Date.now() - prev.callStartTime.getTime()) / 1000);
        return { ...prev, callDuration: duration };
      });
    }, 1000);
  }, []);

  const stopCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  }, []);

  // Format call duration
  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Initiate call
  const initiateCall = useCallback(
    async (
      receiverId: string,
      receiverName: string,
      receiverRole: 'doctor' | 'patient',
      isVideoCall: boolean
    ) => {
      try {
        if (callState.inCall || callState.isReceivingCall) {
          Alert.alert('Thông báo', 'Bạn đang trong cuộc gọi khác');
          return;
        }

        console.log(`📞 [CallContext] ===== INITIATING CALL =====`);
        console.log(`📞 [CallContext] Receiver ID: ${receiverId}`);
        console.log(`📞 [CallContext] Receiver Name: ${receiverName}`);
        console.log(`📞 [CallContext] Receiver Role: ${receiverRole}`);
        console.log(`📞 [CallContext] Is Video Call: ${isVideoCall}`);

        setCallState((prev) => ({
          ...prev,
          inCall: true,
          receiver: receiverId,
          receiverName,
          receiverRole,
          isVideoCall,
          callStatus: 'connecting',
        }));

        await webrtcService.initiateCall(receiverId, receiverName, receiverRole, isVideoCall);

        const localStream = webrtcService.getLocalStream();
        
        setCallState((prev) => ({
          ...prev,
          localStream,
        }));

        // Navigate to call screen
        router.push('/call');
      } catch (error) {
        console.error('❌ [CallContext] Error initiating call:', error);
        Alert.alert('Lỗi', 'Không thể bắt đầu cuộc gọi. Vui lòng kiểm tra quyền camera/microphone');
        resetCallState();
      }
    },
    [callState.inCall, callState.isReceivingCall]
  );

  // Answer call
  const answerCall = useCallback(async () => {
    try {
      if (!incomingCallDataRef.current) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin cuộc gọi');
        return;
      }

      console.log('✅ [CallContext] Answering call');

      setCallState((prev) => ({
        ...prev,
        inCall: true,
        isReceivingCall: false,
        callStatus: 'connecting',
      }));

      await webrtcService.answerCall(incomingCallDataRef.current);

      const localStream = webrtcService.getLocalStream();
      
      setCallState((prev) => ({
        ...prev,
        localStream,
      }));

      incomingCallDataRef.current = null;

      // Navigate to call screen
      router.push('/call');
    } catch (error) {
      console.error('❌ [CallContext] Error answering call:', error);
      Alert.alert('Lỗi', 'Không thể kết nối cuộc gọi. Vui lòng kiểm tra quyền camera/microphone');
      resetCallState();
    }
  }, []);

  // Reject call
  const rejectCall = useCallback((reason?: string) => {
    console.log('❌ [CallContext] Rejecting call');

    if (incomingCallDataRef.current) {
      webrtcService.rejectCall(incomingCallDataRef.current.callerId, reason);
      incomingCallDataRef.current = null;
    }

    resetCallState();
  }, []);

  // End call
  const endCall = useCallback(() => {
    console.log('📞 [CallContext] Ending call');

    const receiverId = callState.receiver || callState.caller;
    const messageId = callState.messageId;

    if (receiverId && messageId) {
      webrtcService.endCall(receiverId, messageId);
    } else {
      webrtcService.endCall();
    }

    resetCallState();
  }, [callState.receiver, callState.caller, callState.messageId]);

  // Reset call state
  const resetCallState = useCallback(() => {
    stopCallTimer();
    
    // Cleanup WebRTC service
    webrtcService.endCall();

    setCallState({
      inCall: false,
      isReceivingCall: false,
      isVideoCall: false,
      caller: null,
      callerName: '',
      callerRole: 'patient',
      receiver: null,
      receiverName: '',
      receiverRole: 'doctor',
      callStartTime: null,
      callDuration: 0,
      callStatus: 'idle',
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isVideoOff: false,
      isSpeakerOn: true,
      messageId: null,
    });
  }, [stopCallTimer]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const isMuted = webrtcService.toggleMute();
    setCallState((prev) => ({ ...prev, isMuted }));
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    const isVideoOff = webrtcService.toggleVideo();
    setCallState((prev) => ({ ...prev, isVideoOff }));
  }, []);

  // Toggle speaker
  const toggleSpeaker = useCallback(() => {
    setCallState((prev) => ({ ...prev, isSpeakerOn: !prev.isSpeakerOn }));
    // Note: Speaker control is handled differently on mobile vs web
  }, []);

  // Switch camera (mobile only)
  const switchCamera = useCallback(() => {
    webrtcService.switchCamera();
  }, []);

  const value: CallContextType = {
    callState,
    initiateCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    switchCamera,
    formatDuration,
    setOnCallEnded: (callback) => {
      callEndedCallbackRef.current = callback;
    },
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};

export const useCall = (): CallContextType => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within CallProvider');
  }
  return context;
};
