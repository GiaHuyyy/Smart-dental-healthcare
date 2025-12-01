/**
 * Edit Profile Modal
 * Modal để chỉnh sửa thông tin cá nhân
 */

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
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

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Fetch full user data from API when modal opens
  useEffect(() => {
    if (visible && user?._id && session?.token) {
      setFetching(true);
      apiRequest(`/users/${user._id}`, {
        method: 'GET',
        token: session.token,
      })
        .then((response: any) => {
          const userData = response.data || response;
          console.log('📋 User data from API:', userData);
          console.log('📋 Gender value:', userData.gender);
          
          // Normalize gender value
          let normalizedGender = userData.gender || '';
          if (normalizedGender.toLowerCase() === 'male') {
            normalizedGender = 'Nam';
          } else if (normalizedGender.toLowerCase() === 'female') {
            normalizedGender = 'Nữ';
          }
          
          // Format date of birth from ISO to DD/MM/YYYY
          let formattedDate = '';
          if (userData.dateOfBirth) {
            const date = new Date(userData.dateOfBirth);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            formattedDate = `${day}/${month}/${year}`;
            setSelectedDate(date);
          }
          
          setFullName(userData.fullName || '');
          setPhone(userData.phone || '');
          setDateOfBirth(formattedDate);
          setGender(normalizedGender);
          setAddress(userData.address || '');
          
          console.log('✅ Set gender to:', normalizedGender);
          console.log('✅ Set date to:', formattedDate);
        })
        .catch((error) => {
          console.error('Error fetching user profile:', error);
          // Fallback to cached user data
          let fallbackGender = user.gender || '';
          if (fallbackGender.toLowerCase() === 'male') {
            fallbackGender = 'Nam';
          } else if (fallbackGender.toLowerCase() === 'female') {
            fallbackGender = 'Nữ';
          }
          
          // Format fallback date
          let fallbackDate = '';
          if (user.dateOfBirth) {
            const date = new Date(user.dateOfBirth);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            fallbackDate = `${day}/${month}/${year}`;
            setSelectedDate(date);
          }
          
          setFullName(user.fullName || '');
          setPhone(user.phone || '');
          setDateOfBirth(fallbackDate);
          setGender(fallbackGender);
          setAddress(user.address || '');
        })
        .finally(() => {
          setFetching(false);
        });
    }
  }, [visible, user?._id, session?.token]);

  const handleDateChange = (event: any, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selected) {
      setSelectedDate(selected);
      const day = String(selected.getDate()).padStart(2, '0');
      const month = String(selected.getMonth() + 1).padStart(2, '0');
      const year = selected.getFullYear();
      setDateOfBirth(`${day}/${month}/${year}`);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ tên');
      return;
    }

    setLoading(true);
    try {
      // Convert gender back to API format
      let apiGender = gender;
      if (gender === 'Nam') {
        apiGender = 'male';
      } else if (gender === 'Nữ') {
        apiGender = 'female';
      }

      // Convert date from DD/MM/YYYY to ISO format
      let isoDate = '';
      if (dateOfBirth && dateOfBirth.includes('/')) {
        const [day, month, year] = dateOfBirth.split('/');
        if (day && month && year) {
          isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }

      const response = await apiRequest(`/users/${user?._id}`, {
        method: 'PATCH',
        token: session?.token,
        body: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          dateOfBirth: isoDate || dateOfBirth.trim(),
          gender: apiGender,
          address: address.trim(),
        },
      });

      // Update local session
      await updateUser({
        fullName: fullName.trim(),
        phone: phone.trim(),
        dateOfBirth: isoDate || dateOfBirth.trim(),
        gender: apiGender,
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
              {fetching ? (
                <View className="flex-1 items-center justify-center py-20">
                  <ActivityIndicator size="large" color={Colors.primary[600]} />
                  <Text className="mt-3 text-sm" style={{ color: Colors.gray[600] }}>
                    Đang tải thông tin...
                  </Text>
                </View>
              ) : (
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
                  {Platform.OS === 'web' ? (
                    <input
                      type="date"
                      value={dateOfBirth ? (() => {
                        const [day, month, year] = dateOfBirth.split('/');
                        return `${year}-${month}-${day}`;
                      })() : ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value) {
                          const [year, month, day] = value.split('-');
                          setDateOfBirth(`${day}/${month}/${year}`);
                          setSelectedDate(new Date(value));
                        }
                      }}
                      max={new Date().toISOString().split('T')[0]}
                      min="1900-01-01"
                      disabled={loading}
                      className="border border-gray-300 rounded-xl px-4 py-3 text-base w-full"
                      style={{
                        color: Colors.gray[900],
                        backgroundColor: loading ? Colors.gray[100] : '#fff',
                      }}
                    />
                  ) : (
                    <TouchableOpacity
                      className="border border-gray-300 rounded-xl px-4 py-3 flex-row items-center justify-between"
                      style={{ backgroundColor: loading ? Colors.gray[100] : '#fff' }}
                      onPress={() => !loading && setShowDatePicker(true)}
                      disabled={loading}
                    >
                      <Text 
                        className="text-base" 
                        style={{ color: dateOfBirth ? Colors.gray[900] : Colors.gray[400] }}
                      >
                        {dateOfBirth || 'Chọn ngày sinh'}
                      </Text>
                      <Ionicons name="calendar-outline" size={20} color={Colors.gray[500]} />
                    </TouchableOpacity>
                  )}
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
              )}
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

      {/* Date Picker Modal */}
      {showDatePicker && Platform.OS !== 'web' && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View className="flex-1 bg-black/50 items-center justify-center">
            <View className="bg-white rounded-2xl p-4 mx-5" style={{ width: '90%' }}>
              <Text className="text-lg font-bold mb-4" style={{ color: Colors.gray[900] }}>
                Chọn ngày sinh
              </Text>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  className="mt-4 rounded-xl py-3 items-center"
                  style={{ backgroundColor: Colors.primary[600] }}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text className="text-white font-semibold">Xong</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
}
