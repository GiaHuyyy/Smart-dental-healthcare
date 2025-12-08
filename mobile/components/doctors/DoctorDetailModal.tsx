import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

type Doctor = {
  _id?: string;
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  phone?: string;
  specialty?: string;
  specialization?: string;
  experienceYears?: number;
  rating?: number;
  bio?: string;
};

interface DoctorDetailModalProps {
  visible: boolean;
  doctor: Doctor | null;
  onClose: () => void;
  onBook?: (doctor: Doctor) => void;
  onChat?: (doctor: Doctor) => void;
}

export default function DoctorDetailModal({
  visible,
  doctor,
  onClose,
  onBook,
  onChat,
}: DoctorDetailModalProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  if (!doctor) return null;

  const hasHighRating = (doctor.rating ?? 4.5) >= 4.5;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        {/* Header */}
        <View
          className="flex-row items-center justify-between border-b px-4 py-4"
          style={{
            backgroundColor: theme.card,
            borderBottomColor: theme.border,
          }}
        >
          <Text className="text-lg font-semibold" style={{ color: theme.text.primary }}>
            Thông tin bác sĩ
          </Text>
          <TouchableOpacity
            onPress={onClose}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: Colors.gray[100] }}
          >
            <Ionicons name="close" size={24} color={theme.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Doctor Info Card */}
          <Card shadow="md" className="mb-4">
            <View className="items-center py-4">
              {/* Avatar */}
              <View
                className="mb-4 h-24 w-24 items-center justify-center rounded-full"
                style={{ backgroundColor: Colors.primary[100] }}
              >
                <Ionicons name="person" size={48} color={Colors.primary[600]} />
              </View>

              {/* Name */}
              <Text className="text-xl font-bold" style={{ color: theme.text.primary }}>
                {doctor.fullName ?? doctor.name ?? 'Bác sĩ Smart Dental'}
              </Text>

              {/* Specialty */}
              <Text className="mt-2 text-base" style={{ color: Colors.primary[700] }}>
                {doctor.specialty ?? doctor.specialization ?? 'Nha khoa tổng quát'}
              </Text>

              {/* Badges */}
              <View className="mt-4 flex-row items-center" style={{ gap: 12 }}>
                <Badge variant="primary" size="md">
                  {doctor.experienceYears ?? 5}+ năm kinh nghiệm
                </Badge>
                {hasHighRating && (
                  <View
                    className="flex-row items-center rounded-full px-3 py-1.5"
                    style={{ backgroundColor: Colors.success[50], gap: 4 }}>
                  >
                    <Ionicons name="star" size={16} color={Colors.success[600]} />
                    <Text className="text-sm font-semibold" style={{ color: Colors.success[700] }}>
                      {(doctor.rating ?? 4.7).toFixed(1)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Card>

          {/* Bio */}
          {doctor.bio && (
            <Card shadow="sm" className="mb-4">
              <View className="flex-row items-start" style={{ gap: 12 }}>
                <View
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: Colors.primary[50] }}
                >
                  <Ionicons name="information-circle" size={20} color={Colors.primary[600]} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>
                    Giới thiệu
                  </Text>
                  <Text className="mt-2 text-sm leading-6" style={{ color: theme.text.secondary }}>
                    {doctor.bio}
                  </Text>
                </View>
              </View>
            </Card>
          )}

          {/* Contact Info */}
          <Card shadow="sm" className="mb-4">
            <Text className="mb-4 text-base font-semibold" style={{ color: theme.text.primary }}>
              Thông tin liên hệ
            </Text>

            <View style={{ gap: 12 }}>
              {doctor.email && (
                <View className="flex-row items-center" style={{ gap: 12 }}>
                  <View
                    className="h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: Colors.primary[50] }}
                  >
                    <Ionicons name="mail-outline" size={20} color={Colors.primary[600]} />
                  </View>
                  <Text className="flex-1 text-sm" style={{ color: theme.text.secondary }}>
                    {doctor.email}
                  </Text>
                </View>
              )}

              {doctor.phone && (
                <View className="flex-row items-center" style={{ gap: 12 }}>
                  <View
                    className="h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: Colors.primary[50] }}
                  >
                    <Ionicons name="call-outline" size={20} color={Colors.primary[600]} />
                  </View>
                  <Text className="flex-1 text-sm" style={{ color: theme.text.secondary }}>
                    {doctor.phone}
                  </Text>
                </View>
              )}

              <View className="flex-row items-center" style={{ gap: 12 }}>
                <View
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: Colors.primary[50] }}
                >
                  <Ionicons name="medical-outline" size={20} color={Colors.primary[600]} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold" style={{ color: theme.text.secondary }}>
                    Đang nhận bệnh tại Smart Dental Clinic
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center" style={{ gap: 12 }}>
                <View
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: Colors.primary[50] }}
                >
                  <Ionicons name="location-outline" size={20} color={Colors.primary[600]} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm" style={{ color: theme.text.secondary }}>
                    123 Nguyễn Đình Chiểu, Q.1, TP.HCM
                  </Text>
                </View>
              </View>
            </View>
          </Card>

          {/* Specialties Card */}
          <Card shadow="sm" className="mb-4">
            <Text className="mb-4 text-base font-semibold" style={{ color: theme.text.primary }}>
              Chuyên môn
            </Text>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              <Badge variant="primary" size="md">
                {doctor.specialty ?? doctor.specialization ?? 'Nha khoa tổng quát'}
              </Badge>
              <Badge variant="secondary" size="md">
                Điều trị răng miệng
              </Badge>
              <Badge variant="secondary" size="md">
                Chăm sóc răng miệng
              </Badge>
            </View>
          </Card>
        </ScrollView>

        {/* Bottom Actions */}
        <View
          className="border-t px-4 py-4"
          style={{
            backgroundColor: theme.card,
            borderTopColor: theme.border,
          }}
        >
          <View className="flex-row" style={{ gap: 12 }}>
            <TouchableOpacity
              className="flex-1 items-center justify-center rounded-2xl py-4"
              style={{ backgroundColor: Colors.primary[600] }}
              onPress={() => {
                onBook?.(doctor);
                onClose();
              }}
            >
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <Ionicons name="calendar-outline" size={20} color="#ffffff" />
                <Text className="text-base font-semibold text-white">Đặt lịch</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 items-center justify-center rounded-2xl py-4"
              style={{
                backgroundColor: Colors.primary[50],
                borderWidth: 1,
                borderColor: Colors.primary[200],
              }}
              onPress={() => {
                onChat?.(doctor);
                onClose();
              }}
            >
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <Ionicons name="chatbubble-outline" size={20} color={Colors.primary[600]} />
                <Text className="text-base font-semibold" style={{ color: Colors.primary[700] }}>
                  Trao đổi
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
