import { Colors } from "@/constants/colors";
import { useCall } from "@/contexts/CallContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Dimensions, Image, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RTCView } from "@/services/webrtc";

const { width, height } = Dimensions.get("window");

export default function CallScreen() {
  const { callState, endCall, toggleMute, toggleVideo, switchCamera, formatDuration } = useCall();

  const [isLocalVideoMinimized, setIsLocalVideoMinimized] = useState(false);
  const hasNavigatedBackRef = React.useRef(false);

  // Log state on mount and changes
  useEffect(() => {
    console.log("📱 [CallScreen] Mounted/Updated, callState:", {
      inCall: callState.inCall,
      callStatus: callState.callStatus,
      isReceivingCall: callState.isReceivingCall,
    });
  }, [callState.inCall, callState.callStatus, callState.isReceivingCall]);

  // Navigate back only when call truly ends (status becomes idle AND not in call)
  useEffect(() => {
    // Only navigate back if:
    // 1. We haven't already navigated back
    // 2. Call is not active (inCall = false)
    // 3. Status is idle (not connecting/connected)
    // 4. We're not receiving a call
    const shouldGoBack =
      !hasNavigatedBackRef.current &&
      !callState.inCall &&
      callState.callStatus === "idle" &&
      !callState.isReceivingCall;

    if (shouldGoBack) {
      // Add a small delay to ensure state is stable
      const timer = setTimeout(() => {
        // Double check before navigating
        if (!callState.inCall && callState.callStatus === "idle") {
          console.log("📱 [CallScreen] Navigating back - call ended");
          hasNavigatedBackRef.current = true;
          router.back();
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [callState.inCall, callState.callStatus, callState.isReceivingCall]);

  const handleEndCall = () => {
    endCall();
  };

  const getPartnerName = () => {
    return callState.callerName || callState.receiverName || "Unknown";
  };

  const getPartnerAvatar = () => {
    return callState.callerAvatar || callState.receiverAvatar || null;
  };

  const getConnectionStatusText = () => {
    switch (callState.callStatus) {
      case "connecting":
        return "Đang kết nối...";
      case "connected":
        return callState.callStartTime ? formatDuration(callState.callDuration) : "Đang kết nối...";
      case "reconnecting":
        return "Đang kết nối lại...";
      default:
        return "Đang gọi...";
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Video Call Layout */}
      {callState.isVideoCall ? (
        <View style={styles.videoContainer}>
          {/* Remote video (full screen) */}
          {callState.remoteStream ? (
            <RTCView
              streamURL={Platform.OS === "web" ? callState.remoteStream : (callState.remoteStream as any).toURL()}
              style={styles.remoteVideo}
              objectFit="cover"
              mirror={false}
            />
          ) : (
            <View style={styles.placeholderContainer}>
              <View style={styles.avatarPlaceholder}>
                {getPartnerAvatar() ? (
                  <Image source={{ uri: getPartnerAvatar()! }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person" size={80} color={Colors.gray[400]} />
                )}
              </View>
              <Text style={styles.partnerName}>{getPartnerName()}</Text>
              <Text style={styles.statusText}>{getConnectionStatusText()}</Text>
            </View>
          )}

          {/* Local video (floating, minimizable) */}
          {callState.localStream && (
            <TouchableOpacity
              style={[styles.localVideoContainer, isLocalVideoMinimized && styles.localVideoMinimized]}
              onPress={() => setIsLocalVideoMinimized(!isLocalVideoMinimized)}
              activeOpacity={0.9}
            >
              <RTCView
                streamURL={Platform.OS === "web" ? callState.localStream : (callState.localStream as any).toURL()}
                style={styles.localVideo}
                objectFit="cover"
                mirror={true}
              />
              {callState.isVideoOff && (
                <View style={styles.videoOffOverlay}>
                  <Ionicons name="videocam-off" size={32} color="white" />
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      ) : (
        /* Audio Call Layout */
        <View style={styles.audioContainer}>
          <View style={styles.avatarPlaceholder}>
            {getPartnerAvatar() ? (
              <Image source={{ uri: getPartnerAvatar()! }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={100} color={Colors.primary[600]} />
            )}
          </View>
          <Text style={styles.partnerName}>{getPartnerName()}</Text>
          <Text style={styles.statusText}>{getConnectionStatusText()}</Text>

          {/* Audio waveform indicator */}
          {callState.callStatus === "connected" && (
            <View style={styles.waveformContainer}>
              {[...Array(5)].map((_, i) => (
                <View key={i} style={[styles.waveformBar, { animationDelay: `${i * 0.1}s` }]} />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Top overlay - Timer */}
      <View style={styles.topOverlay}>
        <View style={styles.timerContainer}>
          <View style={styles.timerDot} />
          <Text style={styles.timerText}>{getConnectionStatusText()}</Text>
        </View>
      </View>

      {/* Bottom controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.controlsRow}>
          {/* Mute button */}
          <TouchableOpacity
            style={[styles.controlButton, callState.isMuted && styles.controlButtonActive]}
            onPress={toggleMute}
          >
            <Ionicons name={callState.isMuted ? "mic-off" : "mic"} size={28} color="white" />
          </TouchableOpacity>

          {/* Video toggle (only for video calls) */}
          {callState.isVideoCall && (
            <TouchableOpacity
              style={[styles.controlButton, callState.isVideoOff && styles.controlButtonActive]}
              onPress={toggleVideo}
            >
              <Ionicons name={callState.isVideoOff ? "videocam-off" : "videocam"} size={28} color="white" />
            </TouchableOpacity>
          )}

          {/* Switch camera (only for video calls) */}
          {callState.isVideoCall && (
            <TouchableOpacity style={styles.controlButton} onPress={switchCamera}>
              <Ionicons name="camera-reverse" size={28} color="white" />
            </TouchableOpacity>
          )}

          {/* End call button */}
          <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
            <Ionicons name="call" size={32} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  videoContainer: {
    flex: 1,
  },
  remoteVideo: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  localVideoContainer: {
    position: "absolute",
    top: 60,
    right: 16,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "white",
    backgroundColor: "#1a1a1a",
  },
  localVideoMinimized: {
    width: 80,
    height: 107,
  },
  localVideo: {
    width: "100%",
    height: "100%",
  },
  videoOffOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  audioContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
  },
  avatarPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.primary[100],
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  partnerName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    color: Colors.gray[400],
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 32,
    height: 40,
  },
  waveformBar: {
    width: 4,
    height: 20,
    backgroundColor: Colors.primary[500],
    marginHorizontal: 2,
    borderRadius: 2,
  },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00ff00",
    marginRight: 8,
  },
  timerText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  controlsContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  controlButtonActive: {
    backgroundColor: Colors.error[500],
  },
  endCallButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.error[600],
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "135deg" }],
  },
});
