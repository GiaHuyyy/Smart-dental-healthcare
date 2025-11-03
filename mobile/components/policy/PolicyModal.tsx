/**
 * PolicyModal Component
 * Reusable modal displaying appointment policies
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface PolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PolicyModal({ visible, onClose }: PolicyModalProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View 
        className="flex-1 items-center justify-center px-4" 
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      >
        <Pressable 
          className="absolute inset-0" 
          onPress={onClose} 
        />
        
        <View 
          className="w-full max-w-lg rounded-2xl overflow-hidden"
          style={{ 
            backgroundColor: theme.background,
            maxHeight: '85%',
          }}
        >
          {/* Header */}
          <View className="border-b px-5 py-4" style={{ borderBottomColor: theme.border }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-2">
                <Text className="text-base font-bold" style={{ color: theme.text.primary }}>
                  Chính sách Đặt lịch & Quản lý Hẹn
                </Text>
              </View>
              <TouchableOpacity 
                onPress={onClose}
                className="w-8 h-8 items-center justify-center rounded-full"
                style={{ backgroundColor: theme.border }}
              >
                <Ionicons name="close" size={20} color={theme.text.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
            {/* Introduction */}
            <Text className="mb-4 text-center text-xs leading-5" style={{ color: theme.text.secondary }}>
              Nhằm đảm bảo chất lượng dịch vụ, tối ưu hóa thời gian chờ đợi cho Bệnh nhân và lịch làm việc của Bác sĩ, 
              chúng tôi ban hành các quy định về việc đặt và quản lý lịch hẹn trực tuyến như sau:
            </Text>

            {/* PHẦN 1: QUY ĐỊNH DÀNH CHO BỆNH NHÂN */}
            <View className="mb-4 rounded-xl p-3" style={{ backgroundColor: Colors.primary[50] }}>
              <Text className="mb-3 text-center text-sm font-bold" style={{ color: Colors.primary[700] }}>
                PHẦN 1: QUY ĐỊNH DÀNH CHO BỆNH NHÂN
              </Text>

              {/* 1.1 Đặt lịch hẹn mới */}
              <View className="mb-3">
                <Text className="mb-1.5 text-xs font-semibold" style={{ color: theme.text.primary }}>
                  1.1. Đặt lịch hẹn mới
                </Text>
                <Text className="mb-1.5 text-xs leading-4" style={{ color: theme.text.secondary }}>
                  Để đảm bảo công tác chuẩn bị được chu đáo, Bệnh nhân vui lòng đặt lịch hẹn{' '}
                  <Text className="font-semibold" style={{ color: theme.text.primary }}>
                    trước giờ khám dự kiến ít nhất 1 giờ (60 phút)
                  </Text>.
                </Text>
                <Text className="text-xs leading-4" style={{ color: theme.text.secondary }}>
                  Hệ thống sẽ không hiển thị các khung giờ còn trống nếu thời điểm đặt lịch ít hơn 1 giờ so với thời điểm khám.
                </Text>
              </View>

              {/* 1.2 Đổi lịch hẹn */}
              <View className="mb-3">
                <Text className="mb-1.5 text-xs font-semibold" style={{ color: theme.text.primary }}>
                  1.2. Đổi lịch hẹn (Reschedule)
                </Text>
                
                {/* Đổi lịch hợp lệ */}
                <View className="mb-2 rounded-lg p-2.5" style={{ backgroundColor: Colors.success[50] }}>
                  <Text className="mb-1 text-xs font-medium" style={{ color: Colors.success[700] }}>
                    ✓ Đổi lịch hợp lệ (Trước 30 phút)
                  </Text>
                  <Text className="text-xs leading-4" style={{ color: theme.text.secondary }}>
                    Bệnh nhân được phép thay đổi ngày/giờ hẹn{' '}
                    <Text className="font-semibold" style={{ color: Colors.success[700] }}>miễn phí</Text>{' '}
                    nếu thao tác được thực hiện trước giờ hẹn ban đầu ít nhất 30 phút.
                  </Text>
                </View>

                {/* Đổi lịch cận giờ */}
                <View className="rounded-lg p-2.5" style={{ backgroundColor: Colors.error[50] }}>
                  <Text className="mb-1 text-xs font-medium" style={{ color: Colors.error[700] }}>
                    ⚠ Đổi lịch cận giờ (Trong vòng 30 phút)
                  </Text>
                  <Text className="mb-1.5 text-xs leading-4" style={{ color: theme.text.secondary }}>
                    Nếu Bệnh nhân thao tác đổi lịch trong vòng 30 phút trước giờ hẹn, hệ thống sẽ hiển thị cảnh báo.
                  </Text>
                  <Text className="text-xs leading-4" style={{ color: theme.text.secondary }}>
                    Nếu xác nhận tiếp tục, một{' '}
                    <Text className="font-semibold" style={{ color: Colors.error[700] }}>phí giữ chỗ 100.000 VNĐ</Text>{' '}
                    sẽ được áp dụng.
                  </Text>
                </View>
              </View>

              {/* 1.3 Hủy lịch hẹn */}
              <View className="mb-3">
                <Text className="mb-1.5 text-xs font-semibold" style={{ color: theme.text.primary }}>
                  1.3. Hủy lịch hẹn (Cancel)
                </Text>
                
                {/* Hủy lịch hợp lệ */}
                <View className="mb-2 rounded-lg p-2.5" style={{ backgroundColor: Colors.success[50] }}>
                  <Text className="mb-1 text-xs font-medium" style={{ color: Colors.success[700] }}>
                    ✓ Hủy lịch hợp lệ (Trước 30 phút)
                  </Text>
                  <Text className="mb-1.5 text-xs leading-4" style={{ color: theme.text.secondary }}>
                    Bệnh nhân hủy lịch hẹn trước giờ hẹn ban đầu ít nhất 30 phút.
                  </Text>
                  <Text className="mb-0.5 text-xs leading-4" style={{ color: theme.text.secondary }}>
                    • Việc hủy lịch là hoàn toàn <Text className="font-semibold" style={{ color: Colors.success[700] }}>miễn phí</Text>
                  </Text>
                  <Text className="text-xs leading-4" style={{ color: theme.text.secondary }}>
                    • Nếu đã thanh toán phí khám, được{' '}
                    <Text className="font-semibold" style={{ color: Colors.success[700] }}>hoàn lại 100%</Text>
                  </Text>
                </View>

                {/* Hủy lịch cận giờ */}
                <View className="rounded-lg p-2.5" style={{ backgroundColor: Colors.error[50] }}>
                  <Text className="mb-1 text-xs font-medium" style={{ color: Colors.error[700] }}>
                    ⚠ Hủy lịch cận giờ (Trong vòng 30 phút)
                  </Text>
                  <Text className="mb-1.5 text-xs leading-4" style={{ color: theme.text.secondary }}>
                    Nếu Bệnh nhân hủy lịch trong vòng 30 phút trước giờ hẹn, hệ thống sẽ hiển thị cảnh báo.
                  </Text>
                  <Text className="mb-0.5 text-xs leading-4" style={{ color: theme.text.secondary }}>
                    • Nếu xác nhận hủy, một{' '}
                    <Text className="font-semibold" style={{ color: Colors.error[700] }}>phí giữ chỗ 100.000 VNĐ</Text>{' '}
                    sẽ được áp dụng (bị trừ)
                  </Text>
                  <Text className="text-xs leading-4" style={{ color: theme.text.secondary }}>
                    • Nếu đã thanh toán phí khám, vẫn được{' '}
                    <Text className="font-semibold" style={{ color: Colors.success[700] }}>hoàn lại 100% phí khám</Text>
                  </Text>
                  <View className="mt-1.5 rounded p-1.5" style={{ backgroundColor: Colors.warning[50] }}>
                    <Text className="text-xs leading-4" style={{ color: Colors.warning[700] }}>
                      ⚠ Lưu ý: Khoản hoàn 100% phí khám không bao gồm 100.000 VNĐ phí giữ chỗ đã bị trừ.
                    </Text>
                  </View>
                </View>
              </View>

              {/* 1.4 Lịch Tái khám */}
              <View>
                <Text className="mb-1.5 text-xs font-semibold" style={{ color: theme.text.primary }}>
                  1.4. Lịch Tái khám (Follow-up)
                </Text>
                <Text className="mb-1.5 text-xs leading-4" style={{ color: theme.text.secondary }}>
                  Sau khi kết thúc điều trị, Bác sĩ có thể tạo một đề xuất lịch tái khám dựa trên kế hoạch điều trị.
                </Text>
                <Text className="mb-1.5 text-xs leading-4" style={{ color: theme.text.secondary }}>
                  Đề xuất này sẽ được gửi thông báo và hiển thị trong mục "Lịch tái khám" trên tài khoản của Bệnh nhân.
                </Text>
                <View className="rounded-lg p-2.5" style={{ backgroundColor: Colors.success[50] }}>
                  <Text className="text-xs leading-4" style={{ color: theme.text.secondary }}>
                    Khi chọn [Lên lịch tái khám], Bệnh nhân sẽ chủ động chọn ngày giờ phù hợp và được hưởng{' '}
                    <Text className="font-semibold" style={{ color: Colors.success[700] }}>ưu đãi giảm 5%</Text>{' '}
                    chi phí cho lần tái khám này.
                  </Text>
                </View>
              </View>
            </View>

            {/* PHẦN 2: QUY ĐỊNH TỪ PHÍA BÁC SĨ & PHÒNG KHÁM */}
            <View className="mb-4 rounded-xl p-3" style={{ backgroundColor: Colors.warning[50] }}>
              <Text className="mb-3 text-center text-sm font-bold" style={{ color: Colors.warning[700] }}>
                PHẦN 2: QUY ĐỊNH TỪ PHÍA BÁC SĨ & PHÒNG KHÁM
              </Text>

              {/* 2.1 Hủy lịch hẹn (Do Bác sĩ/Phòng khám) */}
              <View className="mb-3">
                <Text className="mb-1.5 text-xs font-semibold" style={{ color: theme.text.primary }}>
                  2.1. Hủy lịch hẹn (Do Bác sĩ/Phòng khám)
                </Text>
                
                {/* Trường hợp 1: Lý do đột xuất */}
                <View className="mb-2 rounded-lg p-2.5" style={{ backgroundColor: theme.card }}>
                  <Text className="mb-1 text-xs font-medium" style={{ color: theme.text.primary }}>
                    Trường hợp 1: Lý do đột xuất từ Phòng khám
                  </Text>
                  <Text className="mb-1.5 text-xs leading-4" style={{ color: theme.text.secondary }}>
                    Nếu Phòng khám/Bác sĩ phải hủy lịch vì lý do bất khả kháng (Bác sĩ ốm, sự cố thiết bị, mất điện...), 
                    Bệnh nhân sẽ được thông báo ngay lập tức.
                  </Text>
                  <View className="rounded p-1.5" style={{ backgroundColor: Colors.success[50] }}>
                    <Text className="text-xs font-semibold" style={{ color: Colors.success[700] }}>
                      Chính sách hỗ trợ:
                    </Text>
                    <Text className="text-xs leading-4" style={{ color: theme.text.secondary }}>
                      • Bệnh nhân được <Text className="font-semibold" style={{ color: Colors.success[700] }}>hoàn 100%</Text> phí đã thanh toán (nếu có)
                    </Text>
                    <Text className="text-xs leading-4" style={{ color: theme.text.secondary }}>
                      • Nhận một <Text className="font-semibold" style={{ color: Colors.success[700] }}>Voucher giảm 5%</Text> cho lần đặt lịch tiếp theo
                    </Text>
                  </View>
                </View>

                {/* Trường hợp 2: Bệnh nhân đến trễ */}
                <View className="rounded-lg p-2.5" style={{ backgroundColor: theme.card }}>
                  <Text className="mb-1 text-xs font-medium" style={{ color: theme.text.primary }}>
                    Trường hợp 2: Bệnh nhân đến trễ
                  </Text>
                  <Text className="mb-1.5 text-xs leading-4" style={{ color: theme.text.secondary }}>
                    Nếu Bệnh nhân đến trễ quá 15 phút so với giờ hẹn, Bác sĩ có quyền hủy lịch hẹn để không ảnh hưởng đến 
                    các Bệnh nhân kế tiếp.
                  </Text>
                  <View className="rounded p-1.5" style={{ backgroundColor: Colors.error[50] }}>
                    <Text className="text-xs font-semibold" style={{ color: Colors.error[700] }}>
                      Chính sách xử lý:
                    </Text>
                    <Text className="text-xs leading-4" style={{ color: theme.text.secondary }}>
                      • Lịch hẹn bị hủy và Bệnh nhân bị áp dụng{' '}
                      <Text className="font-semibold" style={{ color: Colors.error[700] }}>phí giữ chỗ 100.000 VNĐ</Text>
                    </Text>
                    <Text className="text-xs leading-4" style={{ color: theme.text.secondary }}>
                      • Nếu đã thanh toán phí khám, được{' '}
                      <Text className="font-semibold" style={{ color: Colors.success[700] }}>hoàn 100% phí khám</Text>
                    </Text>
                    <View className="mt-1.5 rounded p-1.5" style={{ backgroundColor: Colors.warning[100] }}>
                      <Text className="text-xs leading-4" style={{ color: Colors.warning[700] }}>
                        ⚠ Khoản hoàn 100% phí khám không bao gồm 100.000 VNĐ phí giữ chỗ đã bị trừ.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* 2.2 Lên lịch Tái khám (Phía Bác sĩ) */}
              <View>
                <Text className="mb-1.5 text-xs font-semibold" style={{ color: theme.text.primary }}>
                  2.2. Lên lịch Tái khám (Phía Bác sĩ)
                </Text>
                <Text className="mb-1.5 text-xs leading-4" style={{ color: theme.text.secondary }}>
                  Các lịch tái khám do Bác sĩ tạo là các đề xuất và sẽ hiển thị ở trạng thái "Chờ xác nhận" 
                  (chưa chính thức chiếm chỗ trên lịch làm việc của Bác sĩ).
                </Text>
                <Text className="text-xs leading-4" style={{ color: theme.text.secondary }}>
                  Lịch tái khám chỉ trở thành chính thức sau khi Bệnh nhân xác nhận [Lên lịch tái khám] như mô tả ở Mục 1.4.
                </Text>
              </View>
            </View>

            {/* PHẦN 3: QUY ĐỊNH VỀ THÔNG BÁO */}
            <View className="mb-4 rounded-xl p-3" style={{ backgroundColor: Colors.primary[50] }}>
              <Text className="mb-2 text-center text-sm font-bold" style={{ color: Colors.primary[700] }}>
                PHẦN 3: QUY ĐỊNH VỀ THÔNG BÁO
              </Text>
              <Text className="text-center text-xs leading-5" style={{ color: theme.text.secondary }}>
                Để đảm bảo tính minh bạch, tất cả các hành động liên quan đến lịch hẹn (Đặt, Đổi, Hủy, Đề xuất tái khám, 
                Xác nhận tái khám...) đều sẽ được hệ thống gửi{' '}
                <Text className="font-semibold" style={{ color: theme.text.primary }}>thông báo ngay lập tức (realtime)</Text> và{' '}
                <Text className="font-semibold" style={{ color: theme.text.primary }}>gửi Email xác nhận</Text>{' '}
                đến các bên liên quan (Bệnh nhân và Bác sĩ).
              </Text>
            </View>
          </ScrollView>

          {/* Footer Button */}
          <View className="border-t px-5 py-3" style={{ borderTopColor: theme.border }}>
            <TouchableOpacity
              className="items-center justify-center rounded-xl py-3"
              style={{ backgroundColor: Colors.primary[600] }}
              onPress={onClose}
            >
              <Text className="text-sm font-semibold text-white">Đã hiểu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
