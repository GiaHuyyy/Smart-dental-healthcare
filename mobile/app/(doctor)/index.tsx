/**
 * Doctor Dashboard Screen
 * Trang tổng quan bác sĩ với thống kê và lịch hẹn hôm nay
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from 'react-native';

import { AppHeader } from '@/components/layout/AppHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface DashboardStats {
  totalPatients: number;
  totalAppointments: number;
  totalIncome: number;
  totalTreatments: number;
  patientGrowth: number;
  appointmentGrowth: number;
  incomeGrowth: number;
  treatmentGrowth: number;
}

interface TodayAppointment {
  _id: string;
  patientName: string;
  startTime: string;
  appointmentType: string;
  status: string;
}

export default function DoctorDashboard() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    totalAppointments: 0,
    totalIncome: 0,
    totalTreatments: 0,
    patientGrowth: 0,
    appointmentGrowth: 0,
    incomeGrowth: 0,
    treatmentGrowth: 0,
  });
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await doctorDashboardService.getDashboardStats(userId);
      
      // Mock data for now
      setTimeout(() => {
        setStats({
          totalPatients: 156,
          totalAppointments: 423,
          totalIncome: 125000000,
          totalTreatments: 89,
          patientGrowth: 12,
          appointmentGrowth: 8,
          incomeGrowth: 15,
          treatmentGrowth: 10,
        });
        
        setTodayAppointments([
          {
            _id: '1',
            patientName: 'Nguyễn Văn A',
            startTime: '09:00',
            appointmentType: 'Khám định kỳ',
            status: 'confirmed',
          },
          {
            _id: '2',
            patientName: 'Trần Thị B',
            startTime: '10:30',
            appointmentType: 'Tẩy trắng răng',
            status: 'pending',
          },
          {
            _id: '3',
            patientName: 'Lê Văn C',
            startTime: '14:00',
            appointmentType: 'Nhổ răng khôn',
            status: 'confirmed',
          },
        ]);
        
        setLoading(false);
        setRefreshing(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const StatCard = ({
    icon,
    title,
    value,
    growth,
    onPress,
  }: {
    icon: string;
    title: string;
    value: string | number;
    growth?: number;
    onPress?: () => void;
  }) => (
    <Card
      onPress={onPress}
      shadow="sm"
      padding="base"
      className="flex-1"
      style={{ minWidth: '45%' }}
    >
      <View className="flex-row items-start gap-3">
        <View
          className="w-12 h-12 rounded-xl items-center justify-center"
          style={{ backgroundColor: Colors.primary[50] }}
        >
          <Ionicons name={icon as any} size={24} color={Colors.primary[600]} />
        </View>
        <View className="flex-1">
          <Text className="text-xs mb-1" style={{ color: theme.text.secondary }}>
            {title}
          </Text>
          <Text className="text-2xl font-bold" style={{ color: theme.text.primary }}>
            {value}
          </Text>
          {growth !== undefined && growth !== 0 && (
            <View className="flex-row items-center gap-1 mt-1">
              <Ionicons
                name={growth > 0 ? 'trending-up' : 'trending-down'}
                size={12}
                color={growth > 0 ? Colors.success[600] : Colors.error[600]}
              />
              <Text
                className="text-xs font-medium"
                style={{ color: growth > 0 ? Colors.success[600] : Colors.error[600] }}
              >
                {growth > 0 ? '+' : ''}
                {growth}%
              </Text>
            </View>
          )}
        </View>
      </View>
    </Card>
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
        <Text className="mt-4" style={{ color: theme.text.secondary }}>
          Đang tải dữ liệu...
        </Text>
      </View>
    );
  }

  return (
    <>
      <AppHeader
        title="Tổng quan"
        showNotification
        showAvatar
        notificationCount={3}
      />

      <ScrollView
        className="flex-1"
        style={{ backgroundColor: theme.background }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="px-4 pt-4 pb-24">
          {/* Welcome Card */}
          <Card gradient gradientColors={[Colors.primary[600], Colors.primary[700]]} className="mb-6">
            <Text className="text-white text-2xl font-bold mb-2">
              Chào mừng trở lại, Bác sĩ!
            </Text>
            <Text className="text-white/80 mb-1">
              {currentTime.toLocaleDateString('vi-VN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            <Text className="text-white/80">
              Bạn có {todayAppointments.length} lịch hẹn hôm nay
            </Text>
          </Card>

          {/* Stats Grid */}
          <View className="flex-row flex-wrap gap-4 mb-6">
            <StatCard
              icon="people"
              title="Tổng bệnh nhân"
              value={stats.totalPatients}
              growth={stats.patientGrowth}
              onPress={() => router.push('/(doctor)/patients' as any)}
            />
            <StatCard
              icon="calendar"
              title="Lịch hẹn"
              value={stats.totalAppointments}
              growth={stats.appointmentGrowth}
              onPress={() => router.push('/(doctor)/schedule' as any)}
            />
            <StatCard
              icon="wallet"
              title="Doanh thu"
              value={formatCurrency(stats.totalIncome)}
              growth={stats.incomeGrowth}
              onPress={() => router.push('/(doctor)/revenue' as any)}
            />
            <StatCard
              icon="medical"
              title="Điều trị"
              value={stats.totalTreatments}
              growth={stats.treatmentGrowth}
            />
          </View>

          {/* Today's Appointments */}
          <SectionHeader
            title="Lịch hẹn hôm nay"
            action={{
              label: 'Xem tất cả',
              onPress: () => router.push('/(doctor)/schedule' as any),
            }}
          />

          <View className="space-y-3">
            {todayAppointments.length > 0 ? (
              todayAppointments.map((appointment) => (
                <Card
                  key={appointment._id}
                  onPress={() => router.push(`/(doctor)/schedule?id=${appointment._id}` as any)}
                  shadow="sm"
                >
                  <View className="flex-row items-center gap-3">
                    {/* Avatar */}
                    <View
                      className="w-12 h-12 rounded-full items-center justify-center"
                      style={{ backgroundColor: Colors.primary[600] }}
                    >
                      <Text className="text-white font-semibold text-lg">
                        {appointment.patientName.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    {/* Info */}
                    <View className="flex-1">
                      <Text className="font-semibold text-base" style={{ color: theme.text.primary }}>
                        {appointment.patientName}
                      </Text>
                      <Text className="text-sm" style={{ color: theme.text.secondary }}>
                        {appointment.startTime} • {appointment.appointmentType}
                      </Text>
                    </View>

                    {/* Status */}
                    <Badge
                      variant={
                        appointment.status === 'confirmed'
                          ? 'success'
                          : appointment.status === 'completed'
                          ? 'primary'
                          : 'warning'
                      }
                    >
                      {appointment.status === 'confirmed'
                        ? 'Đã xác nhận'
                        : appointment.status === 'completed'
                        ? 'Hoàn thành'
                        : 'Chờ xử lý'}
                    </Badge>
                  </View>
                </Card>
              ))
            ) : (
              <Card>
                <View className="items-center py-8">
                  <Ionicons name="calendar-outline" size={48} color={Colors.gray[300]} />
                  <Text className="mt-3" style={{ color: theme.text.secondary }}>
                    Không có lịch hẹn nào hôm nay
                  </Text>
                </View>
              </Card>
            )}
          </View>

          {/* Quick Actions */}
          <SectionHeader title="Thao tác nhanh" className="mt-6" />
          
          <View className="grid grid-cols-2 gap-4">
            <Pressable
              onPress={() => router.push('/(doctor)/schedule' as any)}
              className="active:opacity-70"
            >
              <Card shadow="sm">
                <View className="items-center py-4">
                  <Ionicons name="add-circle" size={32} color={Colors.primary[600]} />
                  <Text className="mt-2 font-medium" style={{ color: theme.text.primary }}>
                    Thêm lịch hẹn
                  </Text>
                </View>
              </Card>
            </Pressable>

            <Pressable
              onPress={() => router.push('/(doctor)/patients' as any)}
              className="active:opacity-70"
            >
              <Card shadow="sm">
                <View className="items-center py-4">
                  <Ionicons name="person-add" size={32} color={Colors.primary[600]} />
                  <Text className="mt-2 font-medium" style={{ color: theme.text.primary }}>
                    Thêm bệnh nhân
                  </Text>
                </View>
              </Card>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
