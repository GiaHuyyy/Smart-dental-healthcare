import { Colors } from '@/constants/colors';
import { useCall } from '@/contexts/CallContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function IncomingCallModal() {
  const { callState, answerCall, rejectCall } = useCall();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for call icon
  useEffect(() => {
    if (callState.isReceivingCall) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    }
  }, [callState.isReceivingCall, pulseAnim]);

  // Shake animation for modal
  useEffect(() => {
    if (callState.isReceivingCall) {
      const shake = Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, {
            toValue: 10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 0,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.delay(3000),
        ])
      );
      shake.start();

      return () => shake.stop();
    }
  }, [callState.isReceivingCall, shakeAnim]);

  if (!callState.isReceivingCall) {
    return null;
  }

  const handleAnswer = () => {
    answerCall();
  };

  const handleReject = () => {
    rejectCall('Cuộc gọi bị từ chối');
  };

  return (
    <Modal
      visible={callState.isReceivingCall}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View className="flex-1 items-center justify-center px-6">
          <Animated.View
            className="w-full max-w-sm overflow-hidden rounded-3xl bg-white p-8"
            style={{
              transform: [{ translateX: shakeAnim }],
            }}
          >
            {/* Call type indicator */}
            <View className="absolute right-4 top-4 flex-row items-center space-x-1 rounded-full bg-blue-100 px-3 py-1">
              <Ionicons
                name={callState.isVideoCall ? 'videocam' : 'call'}
                size={14}
                color={Colors.primary[600]}
              />
              <Text className="text-xs font-semibold" style={{ color: Colors.primary[700] }}>
                {callState.isVideoCall ? 'Video' : 'Audio'}
              </Text>
            </View>

            {/* Caller info */}
            <View className="items-center">
              {/* Avatar with pulse animation */}
              <Animated.View
                className="mb-6 h-28 w-28 items-center justify-center overflow-hidden rounded-full"
                style={{
                  backgroundColor: Colors.primary[100],
                  transform: [{ scale: pulseAnim }],
                }}
              >
                <Ionicons name="person" size={56} color={Colors.primary[600]} />
              </Animated.View>

              {/* Caller name */}
              <Text className="mb-2 text-center text-2xl font-bold" style={{ color: Colors.gray[900] }}>
                {callState.callerName}
              </Text>

              {/* Caller role */}
              <View className="mb-2 rounded-full bg-gray-100 px-4 py-1">
                <Text className="text-sm font-medium" style={{ color: Colors.gray[600] }}>
                  {callState.callerRole === 'doctor' ? 'Bác sĩ' : 'Bệnh nhân'}
                </Text>
              </View>

              {/* Call status */}
              <Text className="mb-8 text-center text-base" style={{ color: Colors.gray[500] }}>
                {callState.isVideoCall ? 'Cuộc gọi video đến...' : 'Cuộc gọi thoại đến...'}
              </Text>
            </View>

            {/* Action buttons */}
            <View className="flex-row items-center justify-center space-x-6">
              {/* Reject button */}
              <TouchableOpacity
                onPress={handleReject}
                className="h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-red-500"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3.84,
                  elevation: 5,
                }}
              >
                <Ionicons name="close" size={32} color="white" />
              </TouchableOpacity>

              {/* Answer button */}
              <TouchableOpacity
                onPress={handleAnswer}
                className="h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-green-500"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3.84,
                  elevation: 5,
                }}
              >
                <Ionicons
                  name={callState.isVideoCall ? 'videocam' : 'call'}
                  size={28}
                  color="white"
                />
              </TouchableOpacity>
            </View>

            {/* Permission note */}
            <Text className="mt-6 text-center text-xs" style={{ color: Colors.gray[400] }}>
              {callState.isVideoCall
                ? 'Camera và microphone sẽ được kích hoạt'
                : 'Microphone sẽ được kích hoạt'}
            </Text>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
});
