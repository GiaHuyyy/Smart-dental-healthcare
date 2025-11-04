import { Colors } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface CallMessageBubbleProps {
  callType: 'audio' | 'video';
  callStatus: 'missed' | 'answered' | 'rejected' | 'completed';
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
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallInfo = () => {
    const isMissed = callStatus === 'missed';
    const isRejected = callStatus === 'rejected';
    const isCompleted = callStatus === 'completed';

    let icon: keyof typeof Ionicons.glyphMap = callType === 'video' ? 'videocam' : 'call';
    let text = '';
    let color = Colors.gray[600];

    if (isMissed) {
      icon = callType === 'video' ? 'videocam-off' : 'call';
      text = isOutgoing ? 'Cuộc gọi nhưỡng' : 'Cuộc gọi nhỡ';
      color = Colors.error[600];
    } else if (isRejected) {
      icon = callType === 'video' ? 'videocam-off' : 'call';
      text = isOutgoing ? 'Cuộc gọi bị từ chối' : 'Cuộc gọi đã từ chối';
      color = Colors.error[600];
    } else if (isCompleted) {
      text = isOutgoing ? 'Cuộc gọi đi' : 'Cuộc gọi đến';
      color = Colors.success[600];
    } else {
      text = isOutgoing ? 'Cuộc gọi đi' : 'Cuộc gọi đến';
      color = Colors.primary[600];
    }

    return { icon, text, color };
  };

  const { icon, text, color } = getCallInfo();

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.callText, { color }]}>{text}</Text>
        {callDuration !== undefined && callStatus === 'completed' && (
          <Text style={styles.duration}>{formatDuration(callDuration)}</Text>
        )}
        <Text style={styles.timestamp}>{timestamp}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.gray[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    marginVertical: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  callText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  duration: {
    fontSize: 12,
    color: Colors.gray[600],
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 11,
    color: Colors.gray[500],
  },
});
