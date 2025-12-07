/**
 * Patient Dashboard Screen
 * Trang tổng quan bệnh nhân với thông tin sức khỏe và lịch hẹn
 * API integration similar to client/src/app/patient/page.tsx
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { AppHeader } from '@/components/layout/AppHeader';
import { PolicyButton, PolicyModal } from '@/components/policy';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { API_BASE_URL, formatApiError } from '@/utils/api';

// Types matching client service
interface PatientDashboardStats {
  nextAppointment: {
    id: string;
    date: string;
    time: string;
    doctor: string;
    type: string;
  } | null;
  completedAppointments: number;
  completedGrowth: number;
  followUpRequired: number;
  oralHealthScore: number;
}

interface RecentActivity {
  _id: string;
  title: string;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'attention';
  icon: 'check' | 'clock' | 'file';
}

// Icon mapping
const getActivityIcon = (icon: 'check' | 'clock' | 'file'): keyof typeof Ionicons.glyphMap => {
  switch (icon) {
    case 'check':
      return 'checkmark-circle-outline';
    case 'clock':
      return 'time-outline';
    case 'file':
      return 'document-text-outline';
  }
};

const getActivityColor = (status: 'completed' | 'pending' | 'attention') => {
  switch (status) {
    case 'completed':
      return { bg: Colors.success[50], text: Colors.success[700], label: 'Hoàn thành' };
    case 'pending':
      return { bg: Colors.primary[50], text: Colors.primary[700], label: 'Đang xử lý' };
    case 'attention':
      return { bg: Colors.warning[50], text: Colors.warning[700], label: 'Cần xem' };
  }
};

export default function PatientDashboard() {
  const router = useRouter();
  const { session, isAuthenticated, isHydrating } = useAuth();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<PatientDashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  const fetchDashboardData = useCallback(async (showLoader = true) => {
    if (!isAuthenticated || !session?.user?._id || !session?.token) {
      return;
    }

    if (showLoader) {
      setLoading(true);
    }
    setErrorMessage(null);

    try {
      const userId = session.user._id;
      const token = session.token;

      // Fetch stats - matching client service
      const [appointmentsRes, completedRes, activitiesRes] = await Promise.all([
        // Next appointment
        fetch(`${API_BASE_URL}/appointments/patient/${userId}?status=confirmed&limit=1`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }),
        // Completed appointments
        fetch(`${API_BASE_URL}/appointments/patient/${userId}?status=completed`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }),
        // Recent activities
        fetch(`${API_BASE_URL}/appointments/patient/${userId}/history?pageSize=3`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      // Process next appointment
      let nextAppointment = null;
      if (appointmentsRes.ok) {
        const appointmentsData = await appointmentsRes.json();
        const appointments = appointmentsData.data || appointmentsData;

        if (Array.isArray(appointments) && appointments.length > 0) {
          const apt = appointments[0];
          nextAppointment = {
            id: apt._id || '',
            date: new Date(apt.appointmentDate).toLocaleDateString('vi-VN'),
            time: apt.startTime || 'N/A',
            doctor: apt.doctor?.fullName || apt.doctorId?.fullName || 'N/A',
            type: apt.appointmentType || 'Khám định kỳ',
          };
        }
      }

      // Process completed appointments
      let completedAppointments = 0;
      if (completedRes.ok) {
        const completedData = await completedRes.json();
        const appointments = completedData.data || completedData;
        completedAppointments = Array.isArray(appointments) ? appointments.length : 0;
      }

      // Process activities
      let activitiesList: RecentActivity[] = [];
      if (activitiesRes.ok) {
        const activitiesData = await activitiesRes.json();
        const appointments = activitiesData.data?.appointments || activitiesData.data || [];

        activitiesList = appointments.map((apt: any) => {
          let status: 'completed' | 'pending' | 'attention' = 'pending';
          let icon: 'check' | 'clock' | 'file' = 'clock';

          if (apt.status === 'completed') {
            status = 'completed';
            icon = 'check';
          } else if (apt.status === 'pending') {
            status = 'pending';
            icon = 'clock';
          } else if (apt.status === 'confirmed') {
            status = 'attention';
            icon = 'file';
          }

          return {
            _id: apt._id,
            title: apt.appointmentType || 'Khám định kỳ',
            description: `${new Date(apt.appointmentDate).toLocaleDateString('vi-VN')} — ${
              apt.doctor?.fullName || apt.doctorId?.fullName || 'Bác sĩ'
            }`,
            date: apt.appointmentDate,
            status,
            icon,
          };
        });
      }

      // Set mock values for follow-up and health score (can be replaced with real API)
      setStats({
        nextAppointment,
        completedAppointments,
        completedGrowth: 2,
        followUpRequired: 2,
        oralHealthScore: 74,
      });

      setActivities(activitiesList.length > 0 ? activitiesList : getMockActivities());
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      setErrorMessage(formatApiError(error, 'Không thể tải dữ liệu dashboard'));
      // Set mock data on error
      setStats({
        nextAppointment: null,
        completedAppointments: 0,
        completedGrowth: 0,
        followUpRequired: 0,
        oralHealthScore: 74,
      });
      setActivities(getMockActivities());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, session]);

  useEffect(() => {
    if (!isHydrating && isAuthenticated) {
      void fetchDashboardData();
    }
  }, [isHydrating, isAuthenticated, fetchDashboardData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchDashboardData(false);
  }, [fetchDashboardData]);

  const getMockActivities = (): RecentActivity[] => {
    return [
      {
        _id: '1',
        title: 'Khám định kỳ hoàn thành',
        description: '15/01/2024 — BS. Nguyễn Thị B',
        date: '2024-01-15',
        status: 'completed',
        icon: 'check',
      },
      {
        _id: '2',
        title: 'Tẩy trắng răng được lên lịch',
        description: '20/01/2024 — Chờ xác nhận',
        date: '2024-01-20',
        status: 'pending',
        icon: 'clock',
      },
      {
        _id: '3',
        title: 'Kết quả X-quang đã sẵn sàng',
        description: '12/01/2024 — Xem kết quả',
        date: '2024-01-12',
        status: 'attention',
        icon: 'file',
      },
    ];
  };

  if (!isHydrating && !isAuthenticated) {
    return (
      <>
        <AppHeader title="Tổng quan" showNotification showAvatar />
        <ScrollView 
          className="flex-1"
          style={{ backgroundColor: theme.background }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}
        >
          <Card className="w-full max-w-md p-6">
            <View className="items-center">
              <Ionicons name="medical-outline" size={36} color={Colors.primary[600]} />
              <Text className="mt-4 text-xl font-semibold" style={{ color: theme.text.primary }}>
                Đăng nhập để xem dashboard
              </Text>
              <Text className="mt-2 text-center text-sm" style={{ color: theme.text.secondary }}>
                Theo dõi sức khỏe răng miệng và lịch hẹn của bạn.
              </Text>
              <TouchableOpacity
                className="mt-6 w-full items-center justify-center rounded-2xl py-3"
                style={{ backgroundColor: Colors.primary[600] }}
                onPress={() => router.push('/(auth)/login' as const)}
              >
                <Text className="text-sm font-semibold text-white">Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </ScrollView>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <AppHeader title="Tổng quan" showNotification showAvatar />
        <ScrollView 
          className="flex-1"
          style={{ backgroundColor: theme.background }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <ActivityIndicator size="large" color={Colors.primary[600]} />
          <Text className="mt-4 text-sm" style={{ color: theme.text.secondary }}>
            Đang tải dữ liệu...
          </Text>
        </ScrollView>
      </>
    );
  }

  return (
    <>
      <AppHeader 
        title="Tổng quan" 
        showNotification 
        showAvatar
        rightComponent={<PolicyButton onPress={() => setShowPolicyModal(true)} />}
      />
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary[600]]}
            tintColor={Colors.primary[600]}
          />
        }
      >
        {errorMessage && (
          <View className="mx-4 mt-4 rounded-xl p-4" style={{ backgroundColor: Colors.error[50] }}>
            <View className="flex-row items-center">
              <Ionicons name="alert-circle-outline" size={20} color={Colors.error[600]} />
              <Text className="ml-2 flex-1 text-sm" style={{ color: Colors.error[700] }}>
                {errorMessage}
              </Text>
            </View>
          </View>
        )}

        {/* Welcome Section */}
        <View className="mt-4 px-4">
          <Text className="text-2xl font-bold" style={{ color: theme.text.primary }}>
            Xin chào {session?.user?.fullName ? session.user.fullName.split(' ').slice(-1)[0] : 'bạn'}! 👋
          </Text>
          <Text className="mt-1 text-sm" style={{ color: theme.text.secondary }}>
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </View>

        {/* Stats Grid */}
        <View className="mt-6 px-4">
          <View className="flex-row" style={{ gap: 12 }}>
            {/* Next Appointment */}
            <TouchableOpacity
              className="flex-1"
              onPress={() => router.push('/(tabs)/appointments')}
              activeOpacity={0.7}
            >
              <Card className="p-4" style={{ minHeight: 140 }}>
                <View className="flex-row items-center justify-between mb-3">
                  <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: Colors.primary[100] }}>
                    <Ionicons name="calendar-outline" size={20} color={Colors.primary[600]} />
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-medium mb-2" style={{ color: theme.text.secondary }}>
                    Lịch hẹn tiếp theo
                  </Text>
                  {stats?.nextAppointment ? (
                    <>
                      <Text className="text-sm font-bold mb-1" style={{ color: theme.text.primary }}>
                        {stats.nextAppointment.date}
                      </Text>
                      <Text className="text-xs leading-4" style={{ color: theme.text.tertiary }} numberOfLines={2}>
                        {stats.nextAppointment.time} • {stats.nextAppointment.doctor}
                      </Text>
                    </>
                  ) : (
                    <Text className="text-sm font-semibold" style={{ color: theme.text.tertiary }}>
                      Chưa có lịch hẹn
                    </Text>
                  )}
                </View>
              </Card>
            </TouchableOpacity>

            {/* Completed Visits */}
            <TouchableOpacity
              className="flex-1"
              onPress={() => router.push('/(tabs)/appointments')}
              activeOpacity={0.7}
            >
              <Card className="p-4" style={{ minHeight: 140 }}>
                <View className="flex-row items-center justify-between mb-3">
                  <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: Colors.success[100] }}>
                    <Ionicons name="checkmark-done-outline" size={20} color={Colors.success[600]} />
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-medium mb-2" style={{ color: theme.text.secondary }}>
                    Lượt khám hoàn thành
                  </Text>
                  <Text className="text-2xl font-bold mb-1" style={{ color: theme.text.primary }}>
                    {stats?.completedAppointments || 0}
                  </Text>
                  {stats && stats.completedGrowth > 0 && (
                    <View className="flex-row items-center">
                      <Ionicons name="trending-up-outline" size={12} color={Colors.success[600]} />
                      <Text className="ml-1 text-xs font-medium" style={{ color: Colors.success[600] }}>
                        +{stats.completedGrowth} tháng này
                      </Text>
                    </View>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          </View>

          <View className="mt-3 flex-row" style={{ gap: 12 }}>
            {/* Follow-up Required */}
            <TouchableOpacity
              className="flex-1"
              onPress={() => router.push('/(tabs)/records')}
              activeOpacity={0.7}
            >
              <Card className="p-4" style={{ minHeight: 140 }}>
                <View className="flex-row items-center justify-between mb-3">
                  <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: Colors.warning[100] }}>
                    <Ionicons name="alert-circle-outline" size={20} color={Colors.warning[600]} />
                  </View>
                  {stats && stats.followUpRequired > 0 && (
                    <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: Colors.error[100] }}>
                      <Text className="text-xs font-semibold" style={{ color: Colors.error[700] }}>
                        {stats.followUpRequired}
                      </Text>
                    </View>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-medium mb-2" style={{ color: theme.text.secondary }}>
                    Cần tái khám
                  </Text>
                  <Text className="text-2xl font-bold mb-1" style={{ color: theme.text.primary }}>
                    {stats?.followUpRequired || 0}
                  </Text>
                  <Text className="text-xs" style={{ color: theme.text.tertiary }}>
                    Lịch hẹn cần xác nhận
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>

            {/* Oral Health Score */}
            <TouchableOpacity
              className="flex-1"
              onPress={() => router.push('/(tabs)/records')}
              activeOpacity={0.7}
            >
              <Card className="p-4" style={{ minHeight: 140 }}>
                <View className="flex-row items-center justify-between mb-3">
                  <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: Colors.primary[100] }}>
                    <Ionicons name="fitness-outline" size={20} color={Colors.primary[600]} />
                  </View>
                  <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: Colors.success[100] }}>
                    <Text className="text-xs font-semibold" style={{ color: Colors.success[700] }}>
                      Tốt
                    </Text>
                  </View>
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-medium mb-2" style={{ color: theme.text.secondary }}>
                    Chỉ số sức khỏe
                  </Text>
                  <Text className="text-2xl font-bold mb-1" style={{ color: theme.text.primary }}>
                    {stats?.oralHealthScore || 0}%
                  </Text>
                  <Text className="text-xs" style={{ color: theme.text.tertiary }}>
                    Tình trạng răng miệng
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activities */}
        <View className="mt-6 px-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-base font-semibold" style={{ color: theme.text.primary }}>
              Hoạt động gần đây
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/appointments')}>
              <Text className="text-sm font-medium" style={{ color: Colors.primary[600] }}>
                Xem tất cả
              </Text>
            </TouchableOpacity>
          </View>
          
          {activities.length > 0 ? (
            <Card className="p-0">
              {activities.map((activity, index) => {
                const activityStyle = getActivityColor(activity.status);
                return (
                  <TouchableOpacity
                    key={activity._id}
                    onPress={() => router.push('/(tabs)/appointments')}
                    activeOpacity={0.7}
                  >
                    <View
                      className="flex-row items-center p-4"
                      style={{
                        borderBottomWidth: index < activities.length - 1 ? 1 : 0,
                        borderBottomColor: theme.border,
                      }}
                    >
                      <View
                        className="h-10 w-10 items-center justify-center rounded-xl"
                        style={{ backgroundColor: activityStyle.bg }}
                      >
                        <Ionicons
                          name={getActivityIcon(activity.icon)}
                          size={20}
                          color={activityStyle.text}
                        />
                      </View>
                      <View className="ml-3 flex-1">
                        <Text className="text-sm font-medium" style={{ color: theme.text.primary }}>
                          {activity.title}
                        </Text>
                        <Text className="mt-0.5 text-xs" style={{ color: theme.text.secondary }}>
                          {activity.description}
                        </Text>
                      </View>
                      <View className="rounded-full px-2 py-1" style={{ backgroundColor: activityStyle.bg }}>
                        <Text className="text-xs font-medium" style={{ color: activityStyle.text }}>
                          {activityStyle.label}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Card>
          ) : (
            <Card className="items-center py-8">
              <View
                className="h-16 w-16 items-center justify-center rounded-full"
                style={{ backgroundColor: Colors.gray[100] }}
              >
                <Ionicons name="time-outline" size={32} color={Colors.gray[400]} />
              </View>
              <Text className="mt-3 text-sm font-medium" style={{ color: theme.text.primary }}>
                Chưa có hoạt động nào
              </Text>
              <Text className="mt-1 text-center text-xs" style={{ color: theme.text.secondary }}>
                Các hoạt động gần đây sẽ được hiển thị tại đây
              </Text>
            </Card>
          )}
        </View>

        {/* Quick Actions */}
        <View className="mt-6 px-4">
          <Text className="mb-3 text-base font-semibold" style={{ color: theme.text.primary }}>
            Thao tác nhanh
          </Text>
          <View className="flex-row" style={{ gap: 12 }}>
            <TouchableOpacity
              className="flex-1"
              onPress={() => router.push('/(tabs)/appointments')}
              activeOpacity={0.7}
            >
              <Card className="items-center py-5">
                <View
                  className="h-12 w-12 items-center justify-center rounded-full"
                  style={{ backgroundColor: Colors.primary[100] }}
                >
                  <Ionicons name="add-circle-outline" size={24} color={Colors.primary[600]} />
                </View>
                <Text className="mt-2 text-sm font-medium" style={{ color: theme.text.primary }}>
                  Đặt lịch hẹn
                </Text>
              </Card>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1"
              onPress={() => router.push('/(tabs)/chat')}
              activeOpacity={0.7}
            >
              <Card className="items-center py-5">
                <View
                  className="h-12 w-12 items-center justify-center rounded-full"
                  style={{ backgroundColor: Colors.primary[100] }}
                >
                  <Ionicons name="chatbubbles-outline" size={24} color={Colors.primary[600]} />
                </View>
                <Text className="mt-2 text-sm font-medium" style={{ color: theme.text.primary }}>
                  Liên hệ bác sĩ
                </Text>
              </Card>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <PolicyModal visible={showPolicyModal} onClose={() => setShowPolicyModal(false)} />
    </>
  );
}
