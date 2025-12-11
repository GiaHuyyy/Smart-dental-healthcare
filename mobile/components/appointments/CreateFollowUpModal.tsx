/**
 * Create Follow-up Suggestion Modal
 * Modal để bác sĩ tạo đề xuất tái khám cho bệnh nhân
 */

import { Colors } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';

interface CreateFollowUpModalProps {
  visible: boolean;
  onClose: () => void;
  patientName: string;
  appointmentId?: string;
  medicalRecord?: {
    _id: string;
    recordDate: string;
    appointmentId?: string | { _id: string };
  };
  token: string;
  onSuccess?: () => void;
}

export default function CreateFollowUpModal({
  visible,
  onClose,
  patientName,
  appointmentId: propAppointmentId,
  medicalRecord,
  token,
  onSuccess,
}: CreateFollowUpModalProps) {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    if (!isSubmitting) {
      setNotes('');
      onClose();
    }
  };

  const handleSubmit = async () => {
    // Extract appointmentId
    let appointmentId: string | undefined = propAppointmentId;

    if (!appointmentId && medicalRecord && medicalRecord.appointmentId) {
      appointmentId =
        typeof medicalRecord.appointmentId === 'string'
          ? medicalRecord.appointmentId
          : medicalRecord.appointmentId._id;
    }

    if (!appointmentId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin lịch hẹn');
      return;
    }

    if (!notes.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập ghi chú tái khám');
      return;
    }

    setIsSubmitting(true);
    try {
      const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.51.8:8081';
      const API_URL = BASE_URL.endsWith('/api/v1') ? BASE_URL : `${BASE_URL}/api/v1`;

      const payload = {
        parentAppointmentId: appointmentId,
        notes: notes.trim(),
      };

      const response = await fetch(`${API_URL}/appointments/follow-up/create-suggestion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Không thể tạo đề xuất tái khám');
      }

      // Close modal first
      setNotes('');
      onClose();
      
      // Then show success and refresh
      Alert.alert('Thành công', 'Đã gửi đề xuất tái khám cho bệnh nhân');
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error creating follow-up:', error);
      Alert.alert(
        'Lỗi',
        error instanceof Error ? error.message : 'Không thể tạo đề xuất tái khám'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 16,
            width: '100%',
            maxWidth: 500,
            maxHeight: '80%',
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: Colors.gray[200],
            }}
          >
            <Text className="text-lg font-bold text-gray-900">Đề xuất tái khám</Text>
            <Pressable
              onPress={handleClose}
              disabled={isSubmitting}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: Colors.gray[100],
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={20} color={Colors.gray[700]} />
            </Pressable>
          </View>

          <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
            {/* Patient Name */}
            <View style={{ marginBottom: 16 }}>
              <Text className="text-sm font-semibold text-gray-700 mb-2">Bệnh nhân</Text>
              <View
                style={{
                  backgroundColor: Colors.gray[50],
                  borderRadius: 8,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: Colors.gray[200],
                }}
              >
                <Text className="text-sm text-gray-900">{patientName}</Text>
              </View>
            </View>

            {/* Medical Record Info */}
            {medicalRecord && (
              <View style={{ marginBottom: 16 }}>
                <Text className="text-sm font-semibold text-gray-700 mb-2">Hồ sơ khám</Text>
                <View
                  style={{
                    backgroundColor: Colors.gray[50],
                    borderRadius: 8,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: Colors.gray[200],
                  }}
                >
                  <Text className="text-sm text-gray-900">
                    Khám ngày {new Date(medicalRecord.recordDate).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
              </View>
            )}

            {/* Notes Input */}
            <View style={{ marginBottom: 16 }}>
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Ghi chú tái khám <Text style={{ color: Colors.error[600] }}>*</Text>
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Lý do tái khám, lời dặn cho bệnh nhân..."
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                editable={!isSubmitting}
                style={{
                  backgroundColor: 'white',
                  borderRadius: 8,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: Colors.gray[300],
                  fontSize: 14,
                  minHeight: 120,
                }}
              />
            </View>

            {/* Voucher Info */}
            <View
              style={{
                backgroundColor: Colors.success[50],
                borderRadius: 8,
                padding: 12,
                borderWidth: 1,
                borderColor: Colors.success[200],
                marginBottom: 16,
              }}
            >
              <Text className="text-sm" style={{ color: Colors.success[700] }}>
                🎁 Bệnh nhân sẽ tự động nhận <Text className="font-bold">voucher giảm giá 5%</Text> khi
                đề xuất được tạo
              </Text>
            </View>
          </ScrollView>

          {/* Actions */}
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: Colors.gray[200],
            }}
          >
            <Pressable
              onPress={handleClose}
              disabled={isSubmitting}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 8,
                backgroundColor: 'white',
                borderWidth: 1,
                borderColor: Colors.gray[300],
                alignItems: 'center',
              }}
              className="active:opacity-70"
            >
              <Text className="text-sm font-semibold text-gray-700">Hủy</Text>
            </Pressable>

            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting || !notes.trim()}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 8,
                backgroundColor: isSubmitting || !notes.trim() ? Colors.gray[300] : Colors.primary[600],
                alignItems: 'center',
                justifyContent: 'center',
              }}
              className="active:opacity-70"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-sm font-semibold text-white">Gửi đề xuất</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
