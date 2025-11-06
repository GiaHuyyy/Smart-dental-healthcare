/**
 * Edit Profile Modal
 * Modal để chỉnh sửa thông tin cá nhân
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/utils/api';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export function EditProfileModal({ visible, onClose }: EditProfileModalProps) {
  const { session, updateUser } = useAuth();
  const user = session?.user;

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [address, setAddress] = useState(user?.address || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ tên');
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest(`/api/v1/users/${user?._id}`, {
        method: 'PATCH',
        token: session?.token,
        body: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          dateOfBirth: dateOfBirth.trim(),
          gender: gender.trim(),
          address: address.trim(),
        },
      });

      // Update local session
      await updateUser({
        fullName: fullName.trim(),
        phone: phone.trim(),
        dateOfBirth: dateOfBirth.trim(),
        gender: gender.trim(),
        address: address.trim(),
      });

      Alert.alert('Thành công', 'Đã cập nhật thông tin cá nhân');
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật thông tin. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50">
        <View className="flex-1 mt-20">
          <View className="flex-1 bg-white rounded-t-3xl">
            {/* Header */}
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
              <Text className="text-xl font-bold text-gray-900">
                Chỉnh sửa hồ sơ
              </Text>
              <TouchableOpacity onPress={onClose} className="p-2">
                <Ionicons name="close" size={24} color={Colors.gray[600]} />
              </TouchableOpacity>
            </View>

            {/* Form */}
            <ScrollView 
              className="flex-1 p-4"
              showsVerticalScrollIndicator={false}
            >
              <View className="space-y-4">
                {/* Họ tên */}
                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Họ và tên <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-xl px-4 py-3 text-base"
                    style={{ color: Colors.gray[900] }}
                    placeholder="Nhập họ và tên"
                    value={fullName}
                    onChangeText={setFullName}
                    editable={!loading}
                  />
                </View>

                {/* Email (readonly) */}
                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Email
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-xl px-4 py-3 text-base bg-gray-100"
                    style={{ color: Colors.gray[500] }}
                    value={user?.email || ''}
                    editable={false}
                  />
                  <Text className="text-xs text-gray-500 mt-1">
                    Email không thể thay đổi
                  </Text>
                </View>

                {/* Số điện thoại */}
                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Số điện thoại
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-xl px-4 py-3 text-base"
                    style={{ color: Colors.gray[900] }}
                    placeholder="Nhập số điện thoại"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    editable={!loading}
                  />
                </View>

                {/* Ngày sinh */}
                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Ngày sinh
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-xl px-4 py-3 text-base"
                    style={{ color: Colors.gray[900] }}
                    placeholder="DD/MM/YYYY"
                    value={dateOfBirth}
                    onChangeText={setDateOfBirth}
                    editable={!loading}
                  />
                </View>

                {/* Giới tính */}
                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Giới tính
                  </Text>
                  <View className="flex-row space-x-3">
                    <TouchableOpacity
                      className={`flex-1 border rounded-xl px-4 py-3 ${
                        gender === 'Nam' 
                          ? 'bg-blue-50 border-blue-500' 
                          : 'border-gray-300'
                      }`}
                      onPress={() => setGender('Nam')}
                      disabled={loading}
                    >
                      <Text 
                        className={`text-center font-semibold ${
                          gender === 'Nam' ? 'text-blue-700' : 'text-gray-600'
                        }`}
                      >
                        Nam
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className={`flex-1 border rounded-xl px-4 py-3 ${
                        gender === 'Nữ' 
                          ? 'bg-pink-50 border-pink-500' 
                          : 'border-gray-300'
                      }`}
                      onPress={() => setGender('Nữ')}
                      disabled={loading}
                    >
                      <Text 
                        className={`text-center font-semibold ${
                          gender === 'Nữ' ? 'text-pink-700' : 'text-gray-600'
                        }`}
                      >
                        Nữ
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Địa chỉ */}
                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Địa chỉ
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-xl px-4 py-3 text-base"
                    style={{ color: Colors.gray[900] }}
                    placeholder="Nhập địa chỉ"
                    value={address}
                    onChangeText={setAddress}
                    multiline
                    numberOfLines={3}
                    editable={!loading}
                  />
                </View>
              </View>
            </ScrollView>

            {/* Footer Buttons */}
            <View className="p-4 border-t border-gray-200">
              <TouchableOpacity
                className="bg-blue-600 rounded-xl py-4 items-center"
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">
                    Lưu thay đổi
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                className="mt-2 py-3 items-center"
                onPress={onClose}
                disabled={loading}
              >
                <Text className="text-gray-600 font-semibold">Hủy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
