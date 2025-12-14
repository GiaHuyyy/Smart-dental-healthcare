/**
 * Follow-up Suggestions Component
 * Hiển thị danh sách đề xuất tái khám từ bác sĩ cho bệnh nhân
 */

import { Colors } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';

interface Doctor {
  _id: string;
  fullName: string;
  specialty?: string;
  avatar?: string;
}

interface Voucher {
  _id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  description?: string;
}

interface FollowUpSuggestion {
  _id: string;
  patientId: string;
  doctorId: Doctor;
  parentAppointmentId: string;
  notes: string;
  status: 'pending' | 'scheduled' | 'rejected';
  voucherId?: Voucher;
  createdAt: string;
  updatedAt: string;
}

interface FollowUpSuggestionsProps {
  patientId: string;
  token: string;
  onSchedule?: (suggestion: FollowUpSuggestion) => void;
  onCountChange?: (count: number) => void;
}

export default function FollowUpSuggestions({
  patientId,
  token,
  onSchedule,
  onCountChange,
}: FollowUpSuggestionsProps) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<FollowUpSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reject modal state
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [suggestionToReject, setSuggestionToReject] = useState<FollowUpSuggestion | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const loadSuggestions = useCallback(async () => {
    if (!patientId || !token) {
      console.log('⚠️ [FollowUpSuggestions] Missing patientId or token');
      return;
    }

    try {
      const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.51.8:8081';
      const API_URL = BASE_URL.endsWith('/api/v1') ? BASE_URL : `${BASE_URL}/api/v1`;

      console.log('🔍 [FollowUpSuggestions] Loading suggestions for patient:', patientId);
      console.log('🔍 [FollowUpSuggestions] API URL:', `${API_URL}/appointments/follow-up/suggestions/${patientId}`);

      const response = await fetch(`${API_URL}/appointments/follow-up/suggestions/${patientId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      console.log('📦 [FollowUpSuggestions] Response:', {
        ok: response.ok,
        status: response.status,
        isArray: Array.isArray(result),
        resultType: typeof result,
        length: Array.isArray(result) ? result.length : result.data?.length,
        fullResult: result,
      });

      if (response.ok) {
        // API returns array directly, not wrapped in {success, data}
        const data = Array.isArray(result) ? result : result.data || [];
        const pendingSuggestions = data.filter(
          (s: FollowUpSuggestion) => s.status === 'pending'
        );
        console.log('✅ [FollowUpSuggestions] Pending suggestions:', pendingSuggestions.length);
        setSuggestions(pendingSuggestions);
        
        // Notify parent about count change
        if (onCountChange) {
          onCountChange(pendingSuggestions.length);
        }
      } else {
        console.error('❌ [FollowUpSuggestions] Failed to load suggestions:', {
          message: result.message || result.error || 'Unknown error',
          status: response.status,
          statusText: response.statusText,
          result,
        });
      }
    } catch (error) {
      console.error('❌ [FollowUpSuggestions] Error loading suggestions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [patientId, token]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadSuggestions();
  };

  const handleOpenRejectModal = (suggestion: FollowUpSuggestion) => {
    setSuggestionToReject(suggestion);
    setRejectModalVisible(true);
  };

  const handleCloseRejectModal = () => {
    setRejectModalVisible(false);
    setSuggestionToReject(null);
    setRejectReason('');
  };

  const handleConfirmReject = async () => {
    if (!suggestionToReject || !rejectReason.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập lý do từ chối');
      return;
    }

    setIsRejecting(true);
    try {
      const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.51.8:8081';
      const API_URL = BASE_URL.endsWith('/api/v1') ? BASE_URL : `${BASE_URL}/api/v1`;

      const response = await fetch(
        `${API_URL}/appointments/follow-up/reject/${suggestionToReject._id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: rejectReason }),
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        Alert.alert('Thành công', 'Đã từ chối đề xuất tái khám');
        handleCloseRejectModal();
        loadSuggestions();
      } else {
        Alert.alert('Lỗi', result.message || 'Không thể từ chối đề xuất');
      }
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      Alert.alert('Lỗi', 'Không thể từ chối đề xuất tái khám');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleSchedule = (suggestion: FollowUpSuggestion) => {
    if (onSchedule) {
      onSchedule(suggestion);
    } else {
      // Navigate to booking screen with pre-filled data
      router.push({
        pathname: '/(tabs)/appointments',
        params: {
          doctorId: suggestion.doctorId._id,
          followUpSuggestionId: suggestion._id,
          voucherCode: suggestion.voucherId?.code || '',
        },
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center py-8">
        <ActivityIndicator size="large" color={Colors.primary[600]} />
      </View>
    );
  }

  if (suggestions.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-8">
        <Ionicons name="calendar-outline" size={48} color={Colors.gray[300]} />
        <Text className="text-base text-gray-500 mt-4">Không có đề xuất tái khám nào</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary[600]}
          />
        }
      >
        <View style={{ gap: 12, padding: 16 }}>
          {suggestions.map((suggestion) => (
            <View
              key={suggestion._id}
              style={{
                backgroundColor: 'white',
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: Colors.primary[200],
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              {/* Header with Doctor Info */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: Colors.primary[100],
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Ionicons name="medical" size={24} color={Colors.primary[600]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text className="text-base font-bold text-gray-900">
                    {suggestion.doctorId.fullName}
                  </Text>
                  {suggestion.doctorId.specialty && (
                    <Text className="text-sm text-gray-600">{suggestion.doctorId.specialty}</Text>
                  )}
                </View>
              </View>

              {/* Notes */}
              <View
                style={{
                  backgroundColor: Colors.gray[50],
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <Ionicons
                    name="document-text-outline"
                    size={16}
                    color={Colors.gray[600]}
                    style={{ marginTop: 2 }}
                  />
                  <Text className="text-sm text-gray-700 flex-1">{suggestion.notes}</Text>
                </View>
              </View>

              {/* Voucher Info */}
              {suggestion.voucherId && (
                <View
                  style={{
                    backgroundColor: Colors.success[50],
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: Colors.success[200],
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="gift" size={16} color={Colors.success[700]} />
                    <View style={{ flex: 1 }}>
                      <Text className="text-sm font-semibold" style={{ color: Colors.success[700] }}>
                        Voucher giảm giá {suggestion.voucherId.discountValue}
                        {suggestion.voucherId.discountType === 'percentage' ? '%' : 'đ'}
                      </Text>
                      <Text className="text-xs" style={{ color: Colors.success[600] }}>
                        Mã: {suggestion.voucherId.code}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Date */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                <Ionicons name="calendar-outline" size={14} color={Colors.gray[500]} />
                <Text className="text-xs text-gray-500">
                  Đề xuất ngày {formatDate(suggestion.createdAt)}
                </Text>
              </View>

              {/* Actions */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable
                  onPress={() => handleOpenRejectModal(suggestion)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: 'white',
                    borderWidth: 1,
                    borderColor: Colors.error[300],
                    alignItems: 'center',
                  }}
                  className="active:opacity-70"
                >
                  <Text className="text-sm font-semibold" style={{ color: Colors.error[600] }}>
                    Từ chối
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleSchedule(suggestion)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: Colors.primary[600],
                    alignItems: 'center',
                  }}
                  className="active:opacity-70"
                >
                  <Text className="text-sm font-semibold text-white">Lên lịch tái khám</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Reject Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseRejectModal}
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
              maxWidth: 400,
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
              <Text className="text-lg font-bold text-gray-900">Từ chối đề xuất</Text>
              <Pressable
                onPress={handleCloseRejectModal}
                disabled={isRejecting}
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

            {/* Content */}
            <View style={{ padding: 16 }}>
              <Text className="text-sm text-gray-700 mb-4">
                Vui lòng cho bác sĩ biết lý do bạn từ chối đề xuất tái khám này
              </Text>

              <TextInput
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder="Nhập lý do từ chối..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!isRejecting}
                style={{
                  backgroundColor: Colors.gray[50],
                  borderRadius: 8,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: Colors.gray[300],
                  fontSize: 14,
                  minHeight: 100,
                  marginBottom: 16,
                }}
              />

              {/* Actions */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable
                  onPress={handleCloseRejectModal}
                  disabled={isRejecting}
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
                  onPress={handleConfirmReject}
                  disabled={isRejecting || !rejectReason.trim()}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 8,
                    backgroundColor:
                      isRejecting || !rejectReason.trim() ? Colors.gray[300] : Colors.error[600],
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  className="active:opacity-70"
                >
                  {isRejecting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="text-sm font-semibold text-white">Xác nhận từ chối</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
