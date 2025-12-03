import { Colors } from "@/constants/colors";
import { useCall } from "@/contexts/CallContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, TouchableOpacity } from "react-native";

interface CallButtonProps {
  receiverId: string;
  receiverName: string;
  receiverRole: "doctor" | "patient";
  receiverAvatar?: string;
  isVideoCall: boolean;
  size?: number;
  color?: string;
  backgroundColor?: string;
  disabled?: boolean;
}

export default function CallButton({
  receiverId,
  receiverName,
  receiverRole,
  receiverAvatar,
  isVideoCall,
  size = 20,
  color = Colors.primary[600],
  backgroundColor,
  disabled = false,
}: CallButtonProps) {
  const { initiateCall, callState } = useCall();
  const [isInitiating, setIsInitiating] = React.useState(false);

  const handlePress = async () => {
    if (callState.inCall || callState.isReceivingCall || isInitiating) {
      return;
    }

    setIsInitiating(true);

    try {
      await initiateCall(receiverId, receiverName, receiverRole, isVideoCall, receiverAvatar);
    } catch (error) {
      console.error("Error initiating call:", error);
    } finally {
      setIsInitiating(false);
    }
  };

  const isDisabled = disabled || callState.inCall || callState.isReceivingCall || isInitiating;

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isDisabled}
      className="h-10 w-10 items-center justify-center rounded-full"
      style={{
        backgroundColor: backgroundColor || Colors.primary[100],
        opacity: isDisabled ? 0.5 : 1,
      }}
    >
      {isInitiating ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Ionicons name={isVideoCall ? "videocam" : "call"} size={size} color={color} />
      )}
    </TouchableOpacity>
  );
}
