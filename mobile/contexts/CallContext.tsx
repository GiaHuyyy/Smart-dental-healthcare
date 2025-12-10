import webrtcService, { IncomingCallData } from "@/services/webrtcService";
import { router } from "expo-router";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Alert, AppState, AppStateStatus } from "react-native";
import { useAuth } from "./auth-context";

// Helper to safely navigate
const safeNavigate = (path: string) => {
  try {
    console.log("🧭 [CallContext] Navigating to:", path);
    router.push(path as any);
    console.log("✅ [CallContext] Navigation initiated");
  } catch (error) {
    console.warn("⚠️ [CallContext] Navigation failed:", error);
  }
};

interface CallState {
  inCall: boolean;
  isReceivingCall: boolean;
  isVideoCall: boolean;

  caller: string | null;
  callerName: string;
  callerRole: "doctor" | "patient";
  callerAvatar: string | null;

  receiver: string | null;
  receiverName: string;
  receiverRole: "doctor" | "patient";
  receiverAvatar: string | null;

  callStartTime: Date | null;
  callDuration: number;
  callStatus: "idle" | "connecting" | "connected" | "reconnecting" | "ended";

  localStream: MediaStream | null;
  remoteStream: MediaStream | null;

  isMuted: boolean;
  isVideoOff: boolean;
  isSpeakerOn: boolean;

  callId: string | null;
}

interface CallContextType {
  callState: CallState;

  // Call actions
  initiateCall: (
    receiverId: string,
    receiverName: string,
    receiverRole: "doctor" | "patient",
    isVideoCall: boolean,
    receiverAvatar?: string
  ) => Promise<void>;
  answerCall: () => Promise<void>;
  rejectCall: (reason?: string) => void;
  endCall: () => void;

  // Media controls
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleSpeaker: () => void;
  switchCamera: () => void;

  // Call history callback setter
  setOnCallEnded: (
    callback?: (callInfo: {
      receiverId: string;
      receiverName: string;
      isVideoCall: boolean;
      callStatus: "missed" | "answered" | "rejected" | "completed";
      callDuration?: number;
      isOutgoing: boolean;
    }) => void
  ) => void;

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
    callerName: "",
    callerRole: "patient",
    callerAvatar: null,
    receiver: null,
    receiverName: "",
    receiverRole: "doctor",
    receiverAvatar: null,
    callStartTime: null,
    callDuration: 0,
    callStatus: "idle",
    localStream: null,
    remoteStream: null,
    isMuted: false,
    isVideoOff: false,
    isSpeakerOn: true,
    callId: null,
  });

  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callEndedCallbackRef = useRef<Parameters<CallContextType["setOnCallEnded"]>[0]>(undefined);
  const incomingCallDataRef = useRef<IncomingCallData | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const isCallActiveRef = useRef<boolean>(false); // Track if call is active

  // Refs to hold latest function references for use in event handlers
  const resetCallStateRef = useRef<() => void>(() => {});
  const endCallRef = useRef<() => void>(() => {});

  // Track if WebRTC is connected to prevent duplicate connections
  const isWebRTCConnectedRef = useRef<boolean>(false);

  // Connect to WebRTC when authenticated
  // Use stable dependencies to prevent reconnection on every render
  const userId = session?.user?._id;
  const userToken = session?.token;
  const userName = session?.user?.fullName || "User";
  const userRole = session?.user?.role as "doctor" | "patient" | undefined;
  const userAvatar = session?.user?.avatarUrl;

  useEffect(() => {
    if (userToken && userId && userRole && !isWebRTCConnectedRef.current) {
      isWebRTCConnectedRef.current = true;

      webrtcService
        .connect(userToken, userId, userRole, userName, userAvatar)
        .then(() => {
          console.log("✅ [CallContext] WebRTC connected");
        })
        .catch((error) => {
          console.error("❌ [CallContext] Failed to connect WebRTC:", error);
          isWebRTCConnectedRef.current = false;
        });

      return () => {
        // Only disconnect if there's no active call
        if (!isCallActiveRef.current) {
          console.log("🔌 [CallContext] Disconnecting WebRTC (no active call)");
          webrtcService.disconnect();
          isWebRTCConnectedRef.current = false;
        } else {
          console.log("⚠️ [CallContext] Skipping disconnect - call is active");
        }
      };
    }
  }, [userId, userToken, userRole, userName, userAvatar]);

  // Setup WebRTC event listeners - run only once
  useEffect(() => {
    console.log("🎧 [CallContext] Setting up event listeners");

    // Incoming call
    const handleIncomingCall = (data: IncomingCallData) => {
      console.log("📞 [CallContext] Incoming call from:", data.callerName);
      console.log("📞 [CallContext] Call ID:", data.callId);

      incomingCallDataRef.current = data;

      setCallState((prev) => ({
        ...prev,
        isReceivingCall: true,
        caller: data.callerId,
        callerName: data.callerName,
        callerRole: data.callerRole || "patient",
        callerAvatar: data.callerAvatar || null,
        isVideoCall: data.isVideoCall,
        callId: data.callId,
        callStatus: "idle",
      }));
    };

    // Call answered
    const handleCallAnswered = async (data: { callId: string; signalData: any }) => {
      console.log("✅ [CallContext] Call answered, callId:", data.callId);

      try {
        await webrtcService.handleCallAnswered(data.signalData);

        setCallState((prev) => ({
          ...prev,
          callStatus: "connected",
          callStartTime: new Date(),
        }));

        console.log("✅ [CallContext] Call connected, starting timer");
        startCallTimer();
      } catch (error) {
        console.error("❌ [CallContext] Error handling call answer:", error);
        Alert.alert("Lỗi", "Không thể kết nối cuộc gọi");
        endCallRef.current();
      }
    };

    // Call rejected
    const handleCallRejected = (data: { callId: string; reason?: string }) => {
      console.log("❌ [CallContext] Call rejected:", data.callId, data.reason);

      Alert.alert("Cuộc gọi bị từ chối", data.reason || "Người nhận đã từ chối cuộc gọi");
      resetCallStateRef.current();
    };

    // Call ended
    const handleCallEnded = (data: { callId: string; duration: number; reason?: string }) => {
      console.log("📞 [CallContext] ===== CALL ENDED EVENT =====");
      console.log("📞 [CallContext] Call ID:", data.callId);
      console.log("📞 [CallContext] Duration:", data.duration);
      console.log("📞 [CallContext] Reason:", data.reason);

      // Trigger callback before resetting state - use functional update to get current state
      setCallState((currentState) => {
        if (callEndedCallbackRef.current) {
          const isOutgoing = currentState.receiver !== null;
          const partnerId = isOutgoing ? currentState.receiver : currentState.caller;
          const partnerName = isOutgoing ? currentState.receiverName : currentState.callerName;

          if (partnerId && partnerName) {
            callEndedCallbackRef.current({
              receiverId: partnerId,
              receiverName: partnerName,
              isVideoCall: currentState.isVideoCall,
              callStatus: data.duration > 0 ? "completed" : "missed",
              callDuration: data.duration > 0 ? data.duration : undefined,
              isOutgoing,
            });
          }
        }
        return currentState; // Don't change state here, resetCallState will do it
      });

      if (data.reason) {
        Alert.alert("Cuộc gọi đã kết thúc", data.reason);
      }

      console.log("📞 [CallContext] Resetting call state...");
      resetCallStateRef.current();
      console.log("✅ [CallContext] Call state reset completed");
    };

    // Remote stream
    const handleRemoteStream = (stream: MediaStream) => {
      console.log("📺 [CallContext] Received remote stream");

      setCallState((prev) => ({
        ...prev,
        remoteStream: stream,
      }));
    };

    // Connection state change
    const handleConnectionStateChange = (state: string) => {
      console.log("🔗 [CallContext] Connection state:", state);
      console.log("🔗 [CallContext] isCallActiveRef:", isCallActiveRef.current);

      // Use ref to check if call is active (ref always has current value)
      if (!isCallActiveRef.current) {
        console.log("🔗 [CallContext] Ignoring connection state change - call not active");
        return;
      }

      switch (state) {
        case "connecting":
          setCallState((prev) => ({
            ...prev,
            callStatus: "connecting",
          }));
          break;
        case "connected":
          setCallState((prev) => {
            console.log("🔗 [CallContext] Processing connected state, callStartTime:", prev.callStartTime);
            // Only start timer if not already started
            if (!prev.callStartTime) {
              console.log("✅ [CallContext] Connection established, starting timer");
              // Start timer outside of setState to avoid issues
              setTimeout(() => startCallTimer(), 0);
              return {
                ...prev,
                callStatus: "connected",
                callStartTime: new Date(),
              };
            }
            console.log("🔗 [CallContext] Timer already started, skipping");
            return {
              ...prev,
              callStatus: "connected",
            };
          });
          break;
        case "disconnected":
        case "failed":
        case "closed":
          // Only show alert and reset if the call is still active
          if (isCallActiveRef.current) {
            console.log("🔗 [CallContext] Connection lost during active call");
            Alert.alert("Mất kết nối", "Cuộc gọi đã bị ngắt kết nối");
            resetCallStateRef.current();
          }
          break;
      }
    };

    // Register listeners
    console.log("🎧 [CallContext] Registering event listeners on webrtcService");
    webrtcService.on("incomingCall", handleIncomingCall);
    webrtcService.on("callAnswered", handleCallAnswered);
    webrtcService.on("callRejected", handleCallRejected);
    webrtcService.on("callEnded", handleCallEnded);
    webrtcService.on("remoteStream", handleRemoteStream);
    webrtcService.on("connectionStateChange", handleConnectionStateChange);
    console.log("✅ [CallContext] Event listeners registered");

    return () => {
      console.log("🧹 [CallContext] Cleaning up event listeners");
      webrtcService.off("incomingCall", handleIncomingCall);
      webrtcService.off("callAnswered", handleCallAnswered);
      webrtcService.off("callRejected", handleCallRejected);
      webrtcService.off("callEnded", handleCallEnded);
      webrtcService.off("remoteStream", handleRemoteStream);
      webrtcService.off("connectionStateChange", handleConnectionStateChange);
    };
  }, []); // Empty dependency - run only once

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        console.log("📱 [CallContext] App came to foreground");
      } else if (nextAppState.match(/inactive|background/)) {
        console.log("📱 [CallContext] App went to background");
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
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Initiate call
  const initiateCall = useCallback(
    async (
      receiverId: string,
      receiverName: string,
      receiverRole: "doctor" | "patient",
      isVideoCall: boolean,
      receiverAvatar?: string
    ) => {
      try {
        if (callState.inCall || callState.isReceivingCall) {
          Alert.alert("Thông báo", "Bạn đang trong cuộc gọi khác");
          return;
        }

        console.log(`📞 [CallContext] ===== INITIATING CALL =====`);
        console.log(`📞 [CallContext] Receiver ID: ${receiverId}`);
        console.log(`📞 [CallContext] Receiver Name: ${receiverName}`);
        console.log(`📞 [CallContext] Receiver Role: ${receiverRole}`);
        console.log(`📞 [CallContext] Is Video Call: ${isVideoCall}`);

        // Mark call as active
        isCallActiveRef.current = true;

        setCallState((prev) => ({
          ...prev,
          inCall: true,
          receiver: receiverId,
          receiverName,
          receiverRole,
          receiverAvatar: receiverAvatar || null,
          isVideoCall,
          callStatus: "connecting",
        }));

        await webrtcService.initiateCall(receiverId, receiverName, receiverRole, isVideoCall);

        const localStream = webrtcService.getLocalStream();

        setCallState((prev) => ({
          ...prev,
          localStream,
        }));

        // Navigate to call screen
        safeNavigate("/call");
      } catch (error: any) {
        console.error("❌ [CallContext] Error initiating call:", error);

        // Check if it's an Expo Go limitation
        const errorMessage = error?.message || "";
        if (errorMessage.includes("development build") || errorMessage.includes("dev client")) {
          Alert.alert(
            "Không hỗ trợ trên Expo Go",
            "Chức năng gọi điện yêu cầu development build. Vui lòng chạy:\n\nnpx expo run:android\n\nhoặc\n\nnpx expo run:ios",
            [{ text: "Đã hiểu" }]
          );
        } else {
          Alert.alert("Lỗi", "Không thể bắt đầu cuộc gọi. Vui lòng kiểm tra quyền camera/microphone");
        }
        resetCallState();
      }
    },
    [callState.inCall, callState.isReceivingCall]
  );

  // Answer call
  const answerCall = useCallback(async () => {
    try {
      if (!incomingCallDataRef.current) {
        Alert.alert("Lỗi", "Không tìm thấy thông tin cuộc gọi");
        return;
      }

      console.log("✅ [CallContext] Answering call");

      // Mark call as active FIRST
      isCallActiveRef.current = true;

      // Update state to show we're in a call
      setCallState((prev) => ({
        ...prev,
        inCall: true,
        isReceivingCall: false,
        callStatus: "connecting",
      }));

      // Navigate to call screen IMMEDIATELY so user sees the UI
      // Don't wait for WebRTC to complete
      safeNavigate("/call");

      // Store incoming call data before clearing ref
      const callData = incomingCallDataRef.current;
      incomingCallDataRef.current = null;

      // Now handle WebRTC (this runs while user already sees the call screen)
      await webrtcService.answerCall(callData);

      const localStream = webrtcService.getLocalStream();

      setCallState((prev) => ({
        ...prev,
        localStream,
      }));
    } catch (error: any) {
      console.error("❌ [CallContext] Error answering call:", error);

      // Check if it's an Expo Go limitation
      const errorMessage = error?.message || "";
      if (errorMessage.includes("development build") || errorMessage.includes("dev client")) {
        Alert.alert(
          "Không hỗ trợ trên Expo Go",
          "Chức năng gọi điện yêu cầu development build. Vui lòng chạy:\n\nnpx expo run:android\n\nhoặc\n\nnpx expo run:ios",
          [{ text: "Đã hiểu" }]
        );
      } else {
        Alert.alert("Lỗi", "Không thể kết nối cuộc gọi. Vui lòng kiểm tra quyền camera/microphone");
      }
      resetCallState();
    }
  }, []);

  // Reject call
  const rejectCall = useCallback((reason?: string) => {
    console.log("❌ [CallContext] Rejecting call");

    if (incomingCallDataRef.current) {
      webrtcService.rejectCall(incomingCallDataRef.current.callId, reason);
      incomingCallDataRef.current = null;
    }

    resetCallStateRef.current();
  }, []);

  // Reset call state
  const resetCallState = useCallback(() => {
    stopCallTimer();

    // Mark call as inactive
    isCallActiveRef.current = false;

    setCallState({
      inCall: false,
      isReceivingCall: false,
      isVideoCall: false,
      caller: null,
      callerName: "",
      callerRole: "patient",
      callerAvatar: null,
      receiver: null,
      receiverName: "",
      receiverRole: "doctor",
      receiverAvatar: null,
      callStartTime: null,
      callDuration: 0,
      callStatus: "idle",
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isVideoOff: false,
      isSpeakerOn: true,
      callId: null,
    });
  }, [stopCallTimer]);

  // End call
  const endCall = useCallback(() => {
    console.log("📞 [CallContext] Ending call");

    webrtcService.endCall();
    resetCallState();
  }, [resetCallState]);

  // Keep refs updated with latest function references
  useEffect(() => {
    resetCallStateRef.current = resetCallState;
    endCallRef.current = endCall;
  }, [resetCallState, endCall]);

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
    throw new Error("useCall must be used within CallProvider");
  }
  return context;
};
