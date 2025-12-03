import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface CallMessageBubbleProps {
  callType: "audio" | "video";
  callStatus: "missed" | "answered" | "rejected" | "completed";
  callDuration?: number; // in seconds
  isOutgoing: boolean;
  timestamp: string;
}

export default function CallMessageBubble({
  callType,
  callStatus,
  callDuration,
  isOutgoing,
  timestamp,
}: CallMessageBubbleProps) {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getCallInfo = () => {
    const isMissed = callStatus === "missed";
    const isRejected = callStatus === "rejected";
    const isCompleted = callStatus === "completed" || callStatus === "answered";

    let icon: keyof typeof Ionicons.glyphMap = callType === "video" ? "videocam" : "call";
    let text = "";
    let iconColor = Colors.gray[500];
    let bgColor = Colors.gray[50];

    if (isMissed) {
      icon = callType === "video" ? "videocam-off" : "call";
      text = isOutgoing ? "Không trả lời" : "Cuộc gọi nhỡ";
      iconColor = Colors.error[500];
      bgColor = Colors.error[50];
    } else if (isRejected) {
      icon = callType === "video" ? "videocam-off" : "call";
      text = isOutgoing ? "Bị từ chối" : "Đã từ chối";
      iconColor = Colors.error[500];
      bgColor = Colors.error[50];
    } else if (isCompleted) {
      icon = callType === "video" ? "videocam" : "call";
      text = isOutgoing ? "Cuộc gọi đi" : "Cuộc gọi đến";
      iconColor = Colors.success[500];
      bgColor = Colors.success[50];
    } else {
      text = "Cuộc gọi";
      iconColor = Colors.gray[500];
      bgColor = Colors.gray[50];
    }

    return { icon, text, iconColor, bgColor };
  };

  const { icon, text, iconColor, bgColor } = getCallInfo();
  const callTypeLabel = callType === "video" ? "Video" : "Thoại";

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Call type icon */}
      <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>

      {/* Call info */}
      <View style={styles.content}>
        <Text style={styles.callText}>{text}</Text>
        <View style={styles.detailsRow}>
          <Text style={styles.callTypeLabel}>{callTypeLabel}</Text>
          {callDuration !== undefined && callDuration > 0 && (
            <>
              <Text style={styles.separator}>•</Text>
              <Text style={styles.duration}>{formatDuration(callDuration)}</Text>
            </>
          )}
          <Text style={styles.separator}>•</Text>
          <Text style={styles.timestamp}>{timestamp}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginVertical: 4,
    maxWidth: "80%",
    alignSelf: "flex-start",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  callText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.gray[900],
    marginBottom: 2,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  callTypeLabel: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  separator: {
    fontSize: 12,
    color: Colors.gray[400],
    marginHorizontal: 6,
  },
  duration: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  timestamp: {
    fontSize: 12,
    color: Colors.gray[400],
  },
});
