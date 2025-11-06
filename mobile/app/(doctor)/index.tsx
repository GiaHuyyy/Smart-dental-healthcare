/**
 * Doctor Dashboard Screen
 * Trang tổng quan bác sĩ với thống kê và lịch hẹn hôm nay
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Dimensions,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import { AppHeader } from '@/components/layout/AppHeader';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as doctorService from '@/services/doctorService';

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

interface ChartDataPoint {
  period: string;
  hoanthanh: number;
  huy: number;
  choXuLy: number;
}

export default function DoctorDashboard() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { session } = useAuth();

  const [loading, setLoading] = useState(false); // Changed to false - show UI immediately
  const [statsLoading, setStatsLoading] = useState(true);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
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
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (session?.user?._id && session?.token) {
      // Load stats and appointments separately for better UX
      fetchStats();
      fetchAppointments();
      // Delay chart loading to prioritize critical data
      setTimeout(() => {
        fetchChartData();
      }, 500);
    }
  }, [session]);

  // Load chart data when date changes
  useEffect(() => {
    if (session?.user?._id && session?.token) {
      fetchChartData();
    }
  }, [selectedDate, session]);

  // Fetch stats only
  const fetchStats = useCallback(async () => {
    if (!session?.user?._id || !session?.token) return;

    try {
      setStatsLoading(true);
      const statsResult = await doctorService.getDashboardStats(session.user._id, session.token);

      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
        console.log('✅ Dashboard stats loaded:', statsResult.data);
      } else {
        console.error('Stats error:', statsResult.error);
      }
    } catch (error) {
      console.error('fetchStats error:', error);
    } finally {
      setStatsLoading(false);
    }
  }, [session]);

  // Fetch appointments only
  const fetchAppointments = useCallback(async () => {
    if (!session?.user?._id || !session?.token) return;

    try {
      setAppointmentsLoading(true);
      const appointmentsResult = await doctorService.getTodayAppointments(session.user._id, session.token);

      if (appointmentsResult.success && appointmentsResult.data) {
        setTodayAppointments(appointmentsResult.data);
        console.log('✅ Today appointments loaded:', appointmentsResult.data.length);
      } else {
        console.error('Appointments error:', appointmentsResult.error);
      }
    } catch (error) {
      console.error('fetchAppointments error:', error);
    } finally {
      setAppointmentsLoading(false);
    }
  }, [session]);

  const fetchChartData = useCallback(async () => {
    if (!session?.user?._id || !session?.token) {
      return;
    }

    try {
      setChartLoading(true);
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth() + 1;

      const chartResult = await doctorService.getChartData(
        session.user._id,
        session.token,
        year,
        month
      );

      if (chartResult.success && chartResult.data) {
        setChartData(chartResult.data);
        console.log('✅ Chart data loaded:', chartResult.data.length);
      } else {
        console.error('Chart error:', chartResult.error);
      }
    } catch (error) {
      console.error('fetchChartData error:', error);
    } finally {
      setChartLoading(false);
    }
  }, [session, selectedDate]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      fetchStats(),
      fetchAppointments(),
      fetchChartData(),
    ]).finally(() => {
      setRefreshing(false);
    });
  }, [fetchStats, fetchAppointments, fetchChartData]);

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
    iconColor,
    iconBg,
    onPress,
  }: {
    icon: string;
    title: string;
    value: string | number;
    growth?: number;
    iconColor?: string;
    iconBg?: string;
    onPress?: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      className="flex-1 min-w-[48%] active:opacity-80"
      disabled={!onPress}
    >
      <View
        className="p-4 rounded-2xl border"
        style={{
          backgroundColor: theme.card,
          borderColor: Colors.gray[100],
        }}
      >
        <View className="flex-row items-center justify-between mb-3">
          <View
            className="w-11 h-11 rounded-xl items-center justify-center"
            style={{ backgroundColor: iconBg || Colors.primary[50] }}
          >
            <Ionicons name={icon as any} size={22} color={iconColor || Colors.primary[600]} />
          </View>
          {growth !== undefined && growth !== 0 && (
            <View
              className="flex-row items-center gap-1 px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: growth > 0 ? Colors.success[50] : Colors.error[50],
              }}
            >
              <Ionicons
                name={growth > 0 ? 'trending-up' : 'trending-down'}
                size={10}
                color={growth > 0 ? Colors.success[600] : Colors.error[600]}
              />
              <Text
                className="text-xs font-semibold"
                style={{ color: growth > 0 ? Colors.success[600] : Colors.error[600] }}
              >
                {Math.abs(growth)}%
              </Text>
            </View>
          )}
        </View>
        <Text className="text-xs mb-1" style={{ color: theme.text.secondary }}>
          {title}
        </Text>
        <Text className="text-xl font-bold" style={{ color: theme.text.primary }}>
          {value}
        </Text>
      </View>
    </Pressable>
  );

  // Skeleton component for loading states
  const SkeletonBox = ({ width, height }: { width: number | string; height: number }) => (
    <View
      className="rounded-lg"
      style={
        {
          width,
          height,
          backgroundColor: colorScheme === 'dark' ? Colors.gray[700] : Colors.gray[200],
          opacity: 0.6,
        } as any
      }
    />
  );

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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="px-4 pt-3 pb-24">
          {/* Welcome Card - Compact */}
          <View
            className="p-4 rounded-2xl mb-4"
            style={{
              backgroundColor: Colors.primary[600],
            }}
          >
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-1">
                <Text className="text-white text-lg font-bold mb-1">
                  Xin chào, Bác sĩ! 👋
                </Text>
                <Text className="text-white/80 text-xs">
                  {currentTime.toLocaleDateString('vi-VN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </Text>
              </View>
              <View
                className="w-14 h-14 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <Ionicons name="calendar-outline" size={26} color="white" />
              </View>
            </View>
            <View className="flex-row items-center gap-2 mt-2">
              <View className="w-1.5 h-1.5 rounded-full bg-white" />
              <Text className="text-white/90 text-sm font-medium">
                {todayAppointments.length} lịch hẹn hôm nay
              </Text>
            </View>
          </View>

          {/* Stats Grid - 2 columns */}
          <View className="flex-row flex-wrap gap-3 mb-4">
            {statsLoading ? (
              <>
                <View style={{ width: '48%' }}>
                  <SkeletonBox width="100%" height={110} />
                </View>
                <View style={{ width: '48%' }}>
                  <SkeletonBox width="100%" height={110} />
                </View>
                <View style={{ width: '48%' }}>
                  <SkeletonBox width="100%" height={110} />
                </View>
                <View style={{ width: '48%' }}>
                  <SkeletonBox width="100%" height={110} />
                </View>
              </>
            ) : (
              <>
                <StatCard
                  icon="people-outline"
                  title="Bệnh nhân"
                  value={stats.totalPatients}
                  growth={stats.patientGrowth}
                  iconColor={Colors.primary[600]}
                  iconBg={Colors.primary[50]}
                  onPress={() => router.push('/(doctor)/patients' as any)}
                />
                <StatCard
                  icon="calendar-outline"
                  title="Lịch hẹn"
                  value={stats.totalAppointments}
                  growth={stats.appointmentGrowth}
                  iconColor={Colors.success[600]}
                  iconBg={Colors.success[50]}
                  onPress={() => router.push('/(doctor)/schedule' as any)}
                />
                <StatCard
                  icon="wallet-outline"
                  title="Doanh thu"
                  value={formatCurrency(stats.totalIncome)}
                  growth={stats.incomeGrowth}
                  iconColor={Colors.warning[600]}
                  iconBg={Colors.warning[50]}
                  onPress={() => router.push('/(doctor)/revenue' as any)}
                />
                <StatCard
                  icon="medkit-outline"
                  title="Điều trị"
                  value={stats.totalTreatments}
                  growth={stats.treatmentGrowth}
                  iconColor={Colors.info[600]}
                  iconBg={Colors.info[50]}
                />
              </>
            )}
          </View>

          {/* Today's Appointments - Simplified */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-base font-bold" style={{ color: theme.text.primary }}>
                Lịch hẹn hôm nay
              </Text>
              <Pressable
                onPress={() => router.push('/(doctor)/schedule' as any)}
                className="active:opacity-70"
              >
                <Text className="text-sm font-medium" style={{ color: Colors.primary[600] }}>
                  Xem tất cả
                </Text>
              </Pressable>
            </View>

            {appointmentsLoading ? (
              <View className="space-y-2">
                <SkeletonBox width="100%" height={78} />
                <SkeletonBox width="100%" height={78} />
                <SkeletonBox width="100%" height={78} />
              </View>
            ) : todayAppointments.length > 0 ? (
              <View className="space-y-2">
                {todayAppointments.slice(0, 3).map((appointment) => (
                  <Pressable
                    key={appointment._id}
                    onPress={() => router.push(`/(doctor)/schedule?id=${appointment._id}` as any)}
                    className="active:opacity-80"
                  >
                    <View
                      className="p-3 rounded-xl border flex-row items-center gap-3"
                      style={{
                        backgroundColor: theme.card,
                        borderColor: Colors.gray[100],
                      }}
                    >
                      {/* Time Badge */}
                      <View
                        className="w-14 h-14 rounded-xl items-center justify-center"
                        style={{ backgroundColor: Colors.primary[50] }}
                      >
                        <Text className="text-xs font-semibold" style={{ color: Colors.primary[600] }}>
                          {appointment.startTime.split(':')[0]}
                        </Text>
                        <Text className="text-[10px]" style={{ color: Colors.primary[500] }}>
                          {appointment.startTime.split(':')[1]}
                        </Text>
                      </View>

                      {/* Info */}
                      <View className="flex-1">
                        <Text
                          className="font-semibold text-sm mb-0.5"
                          style={{ color: theme.text.primary }}
                          numberOfLines={1}
                        >
                          {appointment.patientName}
                        </Text>
                        <Text
                          className="text-xs"
                          style={{ color: theme.text.secondary }}
                          numberOfLines={1}
                        >
                          {appointment.appointmentType}
                        </Text>
                      </View>

                      {/* Status Badge */}
                      <View
                        className="px-2 py-1 rounded-full"
                        style={{
                          backgroundColor:
                            appointment.status === 'completed'
                              ? Colors.success[50]
                              : appointment.status === 'confirmed'
                              ? Colors.primary[50]
                              : Colors.warning[50],
                        }}
                      >
                        <Text
                          className="text-xs font-medium"
                          style={{
                            color:
                              appointment.status === 'completed'
                                ? Colors.success[600]
                                : appointment.status === 'confirmed'
                                ? Colors.primary[600]
                                : Colors.warning[600],
                          }}
                        >
                          {appointment.status === 'confirmed'
                            ? 'Đã xác nhận'
                            : appointment.status === 'completed'
                            ? 'Hoàn thành'
                            : 'Chờ'}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View
                className="p-6 rounded-xl items-center border border-dashed"
                style={{
                  backgroundColor: Colors.gray[50],
                  borderColor: Colors.gray[200],
                }}
              >
                <Ionicons name="calendar-outline" size={36} color={Colors.gray[300]} />
                <Text className="mt-2 text-sm" style={{ color: theme.text.secondary }}>
                  Không có lịch hẹn hôm nay
                </Text>
              </View>
            )}
          </View>

          {/* Chart Overview - Compact */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-base font-bold" style={{ color: theme.text.primary }}>
                Thống kê
              </Text>
              <Pressable
                onPress={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setSelectedDate(newDate);
                }}
                className="px-2.5 py-1 rounded-lg active:opacity-70"
                style={{ backgroundColor: Colors.primary[50] }}
              >
                <Text className="text-xs font-medium" style={{ color: Colors.primary[600] }}>
                  {selectedDate.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' })}
                </Text>
              </Pressable>
            </View>

            <View
              className="p-3 rounded-xl border"
              style={{
                backgroundColor: theme.card,
                borderColor: Colors.gray[100],
              }}
            >
              {/* Legend - Compact */}
              <View className="flex-row flex-wrap gap-2 mb-3">
                <View className="flex-row items-center gap-1">
                  <View className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: Colors.primary[600] }} />
                  <Text className="text-[10px]" style={{ color: theme.text.secondary }}>
                    Hoàn thành
                  </Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <View className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: Colors.gray[400] }} />
                  <Text className="text-[10px]" style={{ color: theme.text.secondary }}>
                    Hủy
                  </Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <View className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: Colors.warning[500] }} />
                  <Text className="text-[10px]" style={{ color: theme.text.secondary }}>
                    Chờ xử lý
                  </Text>
                </View>
              </View>

              {chartLoading ? (
                <SkeletonBox width="100%" height={180} />
              ) : chartData.length > 0 ? (
                <LineChart
                  data={{
                    labels: chartData.slice(0, 7).map((d) => d.period),
                    datasets: [
                      {
                        data: chartData.slice(0, 7).map((d) => d.hoanthanh),
                        color: () => Colors.primary[600],
                        strokeWidth: 2,
                      },
                      {
                        data: chartData.slice(0, 7).map((d) => d.huy),
                        color: () => Colors.gray[400],
                        strokeWidth: 2,
                      },
                      {
                        data: chartData.slice(0, 7).map((d) => d.choXuLy),
                        color: () => Colors.warning[500],
                        strokeWidth: 2,
                      },
                    ],
                  }}
                  width={Dimensions.get('window').width - 56}
                  height={180}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
                    style: {
                      borderRadius: 16,
                    },
                    propsForDots: {
                      r: '0',
                    },
                  }}
                  bezier
                  style={{
                    marginVertical: 4,
                    borderRadius: 12,
                  }}
                  withInnerLines={false}
                  withOuterLines={false}
                  withVerticalLines={false}
                  withHorizontalLines={true}
                  withVerticalLabels={true}
                  withHorizontalLabels={true}
                />
              ) : (
                <View className="h-36 items-center justify-center">
                  <Ionicons name="analytics-outline" size={32} color={Colors.gray[300]} />
                  <Text className="mt-2 text-xs" style={{ color: theme.text.secondary }}>
                    Chưa có dữ liệu
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Quick Actions */}
          <View className="mb-4">
            <Text className="text-base font-bold mb-3" style={{ color: theme.text.primary }}>
              Thao tác nhanh
            </Text>
            
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => router.push('/(doctor)/schedule' as any)}
                className="flex-1 active:opacity-80"
              >
                <View
                  className="p-4 rounded-xl items-center border"
                  style={{
                    backgroundColor: theme.card,
                    borderColor: Colors.gray[100],
                  }}
                >
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center mb-2"
                    style={{ backgroundColor: Colors.primary[50] }}
                  >
                    <Ionicons name="calendar-outline" size={24} color={Colors.primary[600]} />
                  </View>
                  <Text className="text-xs font-medium text-center" style={{ color: theme.text.primary }}>
                    Lịch hẹn
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => router.push('/(doctor)/patients' as any)}
                className="flex-1 active:opacity-80"
              >
                <View
                  className="p-4 rounded-xl items-center border"
                  style={{
                    backgroundColor: theme.card,
                    borderColor: Colors.gray[100],
                  }}
                >
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center mb-2"
                    style={{ backgroundColor: Colors.success[50] }}
                  >
                    <Ionicons name="people-outline" size={24} color={Colors.success[600]} />
                  </View>
                  <Text className="text-xs font-medium text-center" style={{ color: theme.text.primary }}>
                    Bệnh nhân
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => router.push('/(doctor)/revenue' as any)}
                className="flex-1 active:opacity-80"
              >
                <View
                  className="p-4 rounded-xl items-center border"
                  style={{
                    backgroundColor: theme.card,
                    borderColor: Colors.gray[100],
                  }}
                >
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center mb-2"
                    style={{ backgroundColor: Colors.warning[50] }}
                  >
                    <Ionicons name="wallet-outline" size={24} color={Colors.warning[600]} />
                  </View>
                  <Text className="text-xs font-medium text-center" style={{ color: theme.text.primary }}>
                    Doanh thu
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
