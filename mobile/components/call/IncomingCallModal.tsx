import { Colors } from "@/constants/colors";
import { useCall } from "@/contexts/CallContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Image, Modal, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function IncomingCallModal() {
  const { callState, answerCall, rejectCall } = useCall();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const ring2Anim = useRef(new Animated.Value(0)).current;
  const ring3Anim = useRef(new Animated.Value(0)).current;

  // Pulse animation for avatar
  useEffect(() => {
    if (callState.isReceivingCall) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    }
  }, [callState.isReceivingCall, pulseAnim]);

  // Ring wave animations
  useEffect(() => {
    if (callState.isReceivingCall) {
      const createRingAnimation = (anim: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        );
      };

      const ring1 = createRingAnimation(ringAnim, 0);
      const ring2 = createRingAnimation(ring2Anim, 600);
      const ring3 = createRingAnimation(ring3Anim, 1200);

      ring1.start();
      ring2.start();
      ring3.start();

      return () => {
        ring1.stop();
        ring2.stop();
        ring3.stop();
      };
    }
  }, [callState.isReceivingCall, ringAnim, ring2Anim, ring3Anim]);

  if (!callState.isReceivingCall) {
    return null;
  }

  const handleAnswer = () => {
    answerCall();
  };

  const handleReject = () => {
    rejectCall("Cuộc gọi bị từ chối");
  };

  const renderRing = (anim: Animated.Value, size: number) => {
    const scale = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2.5],
    });
    const opacity = anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.6, 0.3, 0],
    });

    return (
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
    );
  };

  return (
    <Modal visible={callState.isReceivingCall} transparent={false} animationType="slide" statusBarTranslucent>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={callState.isVideoCall ? ["#1a1a2e", "#16213e", "#0f3460"] : ["#1a1a2e", "#16213e", "#1a1a2e"]}
        style={styles.container}
      >
        {/* Call type badge */}
        <View style={styles.callTypeBadge}>
          <View
            style={[
              styles.callTypeInner,
              { backgroundColor: callState.isVideoCall ? "rgba(59, 130, 246, 0.2)" : "rgba(34, 197, 94, 0.2)" },
            ]}
          >
            <Ionicons
              name={callState.isVideoCall ? "videocam" : "call"}
              size={16}
              color={callState.isVideoCall ? "#60a5fa" : "#4ade80"}
            />
            <Text style={[styles.callTypeText, { color: callState.isVideoCall ? "#60a5fa" : "#4ade80" }]}>
              {callState.isVideoCall ? "Cuộc gọi Video" : "Cuộc gọi Thoại"}
            </Text>
          </View>
        </View>

        {/* Main content */}
        <View style={styles.content}>
          {/* Avatar with ring animations */}
          <View style={styles.avatarContainer}>
            {renderRing(ringAnim, 140)}
            {renderRing(ring2Anim, 140)}
            {renderRing(ring3Anim, 140)}

            <Animated.View style={[styles.avatar, { transform: [{ scale: pulseAnim }] }]}>
              {callState.callerAvatar ? (
                <Image source={{ uri: callState.callerAvatar }} style={styles.avatarImage} />
              ) : (
                <LinearGradient colors={[Colors.primary[400], Colors.primary[600]]} style={styles.avatarGradient}>
                  <Ionicons name="person" size={64} color="white" />
                </LinearGradient>
              )}
            </Animated.View>
          </View>

          {/* Caller info */}
          <View style={styles.callerInfo}>
            <Text style={styles.callerName}>{callState.callerName}</Text>

            <Text style={styles.callStatus}>{callState.isVideoCall ? "Đang gọi video..." : "Đang gọi..."}</Text>
          </View>
        </View>

        {/* Bottom action buttons */}
        <View style={styles.actionsContainer}>
          {/* Reject button */}
          <View style={styles.actionWrapper}>
            <TouchableOpacity
              onPress={handleReject}
              style={[styles.actionButton, styles.rejectButton]}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={36} color="white" />
            </TouchableOpacity>
            <Text style={styles.actionLabel}>Từ chối</Text>
          </View>

          {/* Answer button */}
          <View style={styles.actionWrapper}>
            <TouchableOpacity
              onPress={handleAnswer}
              style={[styles.actionButton, styles.answerButton]}
              activeOpacity={0.8}
            >
              <Ionicons name={callState.isVideoCall ? "videocam" : "call"} size={32} color="white" />
            </TouchableOpacity>
            <Text style={styles.actionLabel}>Trả lời</Text>
          </View>
        </View>

        {/* Permission note */}
        <View style={styles.noteContainer}>
          <Ionicons
            name={callState.isVideoCall ? "camera-outline" : "mic-outline"}
            size={16}
            color="rgba(255, 255, 255, 0.5)"
          />
          <Text style={styles.noteText}>
            {callState.isVideoCall ? "Camera và microphone sẽ được kích hoạt" : "Microphone sẽ được kích hoạt"}
          </Text>
        </View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight || 44,
  },
  callTypeBadge: {
    alignItems: "center",
    marginTop: 20,
  },
  callTypeInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  callTypeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 60,
  },
  avatarContainer: {
    width: 180,
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  ring: {
    position: "absolute",
    borderWidth: 2,
    borderColor: Colors.primary[400],
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: "hidden",
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  avatarGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  callerInfo: {
    alignItems: "center",
  },
  callerName: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
    textAlign: "center",
  },
  callStatus: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "400",
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 80,
    paddingBottom: 40,
  },
  actionWrapper: {
    alignItems: "center",
  },
  actionButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  rejectButton: {
    backgroundColor: "#ef4444",
  },
  answerButton: {
    backgroundColor: "#22c55e",
  },
  actionLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  noteContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingBottom: 40,
  },
  noteText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.5)",
  },
});
