/**
 * Doctor Revenue Screen
 * Doanh thu của bác sĩ
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';

import { AppHeader } from '@/components/layout/AppHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface RevenueStats {
  totalRevenue: number;
  platformFee: number;
  netRevenue: number;
  growth: number;
  transactionCount: number;
}

interface RevenueTransaction {
  _id: string;
  patientName: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  date: string;
  type: string;
  status: string;
}

export default function DoctorRevenue() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<RevenueStats>({
    totalRevenue: 0,
    platformFee: 0,
    netRevenue: 0,
    growth: 0,
    transactionCount: 0,
  });
  const [transactions, setTransactions] = useState<RevenueTransaction[]>([]);

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async () => {
    try {
      // TODO: Replace with actual API call
      // Mock data
      setTimeout(() => {
        setStats({
          totalRevenue: 50000000,
          platformFee: 2500000,
          netRevenue: 47500000,
          growth: 15,
          transactionCount: 12,
        });

        setTransactions([
          {
            _id: '1',
            patientName: 'Nguyễn Văn A',
            amount: 500000,
            platformFee: 25000,
            netAmount: 475000,
            date: '2024-01-15',
            type: 'appointment',
            status: 'completed',
          },
          {
            _id: '2',
            patientName: 'Trần Thị B',
            amount: 1200000,
            platformFee: 60000,
            netAmount: 1140000,
            date: '2024-01-14',
            type: 'treatment',
            status: 'completed',
          },
        ]);

        setLoading(false);
        setRefreshing(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRevenueData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'appointment':
        return 'Lịch khám';
      case 'treatment':
        return 'Điều trị';
      case 'medicine':
        return 'Thuốc';
      default:
        return 'Khác';
    }
  };

  if (loading) {
    return (
      <>
        <AppHeader title="Doanh thu" showNotification />
        <View
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: theme.background }}
        >
          <ActivityIndicator size="large" color={Colors.primary[600]} />
        </View>
      </>
    );
  }

  return (
    <>
      <AppHeader title="Doanh thu" showNotification />

      <ScrollView
        className="flex-1"
        style={{ backgroundColor: theme.background }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="px-4 pt-4 pb-24">
          {/* Summary Cards */}
          <View className="grid grid-cols-1 gap-4 mb-6">
            {/* Total Revenue */}
            <Card shadow="md">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-sm mb-1" style={{ color: theme.text.secondary }}>
                    Tổng doanh thu
                  </Text>
                  <Text className="text-2xl font-bold mb-1" style={{ color: theme.text.primary }}>
                    {formatCurrency(stats.totalRevenue)}
                  </Text>
                  <Text className="text-xs" style={{ color: theme.text.secondary }}>
                    {stats.transactionCount} giao dịch
                  </Text>
                </View>
                <View
                  className="w-14 h-14 rounded-full items-center justify-center"
                  style={{ backgroundColor: Colors.primary[50] }}
                >
                  <Ionicons name="wallet" size={28} color={Colors.primary[600]} />
                </View>
              </View>
            </Card>

            {/* Platform Fee & Net Revenue */}
            <View className="grid grid-cols-2 gap-4">
              <Card shadow="sm">
                <Text className="text-xs mb-2" style={{ color: theme.text.secondary }}>
                  Phí nền tảng
                </Text>
                <Text className="text-xl font-bold mb-1" style={{ color: Colors.error[600] }}>
                  {formatCurrency(stats.platformFee)}
                </Text>
                <Text className="text-xs" style={{ color: theme.text.secondary }}>
                  5% mỗi giao dịch
                </Text>
              </Card>

              <Card shadow="sm">
                <Text className="text-xs mb-2" style={{ color: theme.text.secondary }}>
                  Thực nhận
                </Text>
                <Text className="text-xl font-bold mb-1" style={{ color: Colors.success[600] }}>
                  {formatCurrency(stats.netRevenue)}
                </Text>
                <Text className="text-xs" style={{ color: theme.text.secondary }}>
                  Sau khi trừ phí
                </Text>
              </Card>
            </View>

            {/* Growth Card */}
            <Card shadow="sm">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-sm mb-1" style={{ color: theme.text.secondary }}>
                    Tăng trưởng
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-2xl font-bold" style={{ color: Colors.success[600] }}>
                      +{stats.growth}%
                    </Text>
                    <Ionicons name="trending-up" size={24} color={Colors.success[600]} />
                  </View>
                </View>
                <Text className="text-xs" style={{ color: theme.text.secondary }}>
                  So với tháng trước
                </Text>
              </View>
            </Card>
          </View>

          {/* Recent Transactions */}
          <SectionHeader title="Giao dịch gần đây" />

          <View className="space-y-3">
            {transactions.map((transaction) => (
              <Card key={transaction._id} shadow="sm">
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1">
                    <Text className="font-semibold text-base mb-1" style={{ color: theme.text.primary }}>
                      {transaction.patientName}
                    </Text>
                    <Text className="text-sm" style={{ color: theme.text.secondary }}>
                      {new Date(transaction.date).toLocaleDateString('vi-VN')} •{' '}
                      {getTypeLabel(transaction.type)}
                    </Text>
                  </View>
                  <Badge variant="success">{transaction.status === 'completed' ? 'Hoàn thành' : 'Chờ xử lý'}</Badge>
                </View>

                <View className="border-t pt-3" style={{ borderColor: theme.border }}>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-sm" style={{ color: theme.text.secondary }}>
                      Số tiền:
                    </Text>
                    <Text className="text-sm font-medium" style={{ color: theme.text.primary }}>
                      {formatCurrency(transaction.amount)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-sm" style={{ color: theme.text.secondary }}>
                      Phí (5%):
                    </Text>
                    <Text className="text-sm font-medium" style={{ color: Colors.error[600] }}>
                      -{formatCurrency(transaction.platformFee)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>
                      Thực nhận:
                    </Text>
                    <Text className="text-base font-bold" style={{ color: Colors.success[600] }}>
                      {formatCurrency(transaction.netAmount)}
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        </View>
      </ScrollView>
    </>
  );
}
