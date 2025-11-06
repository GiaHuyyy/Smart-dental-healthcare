/**
 * Doctor Revenue Screen
 * Doanh thu của bác sĩ
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { AppHeader } from '@/components/layout/AppHeader';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as revenueService from '@/services/revenueService';

type PeriodFilter = 'today' | 'week' | 'month' | 'year';
type StatusFilter = 'all' | 'completed' | 'pending';

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
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [stats, setStats] = useState<RevenueStats>({
    totalRevenue: 0,
    platformFee: 0,
    netRevenue: 0,
    growth: 0,
    transactionCount: 0,
  });
  const [transactions, setTransactions] = useState<RevenueTransaction[]>([]);

  useEffect(() => {
    if (session?.user?._id && session?.token) {
      fetchRevenueData();
    }
  }, [session]);

  const fetchRevenueData = useCallback(async () => {
    if (!session?.user?._id || !session?.token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch revenue data
      const result = await revenueService.getDoctorRevenues(
        session.user._id,
        session.token,
        { current: 1, pageSize: 20 }
      );

      if (result.success && result.data) {
        const { summary, recentTransactions } = result.data;

        // Set stats from summary
        if (summary) {
          setStats({
            totalRevenue: summary.totalAmount || 0,
            platformFee: summary.totalPlatformFee || 0,
            netRevenue: summary.totalRevenue || 0,
            growth: 15, // TODO: Calculate from data
            transactionCount: summary.totalAppointments || 0,
          });
        }

        // Set transactions
        if (recentTransactions && recentTransactions.length > 0) {
          const formattedTransactions = recentTransactions.map((t: any) => ({
            _id: t._id,
            patientName: t.patientId?.fullName || 'N/A',
            amount: t.amount || 0,
            platformFee: t.platformFee || 0,
            netAmount: t.netAmount || 0,
            date: t.revenueDate || t.createdAt,
            type: t.type || 'appointment',
            status: t.status || 'completed',
          }));
          setTransactions(formattedTransactions);
        } else {
          setTransactions([]);
        }

        console.log('✅ Revenue data loaded');
      } else {
        console.error('Revenue error:', result.error);
        setTransactions([]);
      }
    } catch (error) {
      console.error('fetchRevenueData error:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRevenueData();
  }, [fetchRevenueData]);

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

  const getPeriodLabel = (period: PeriodFilter) => {
    switch (period) {
      case 'today':
        return 'Hôm nay';
      case 'week':
        return 'Tuần này';
      case 'month':
        return 'Tháng này';
      case 'year':
        return 'Năm nay';
      default:
        return 'Tháng này';
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return (
        <View className="px-2 py-1 rounded-full" style={{ backgroundColor: Colors.success[50] }}>
          <Text className="text-xs font-medium" style={{ color: Colors.success[600] }}>
            Hoàn thành
          </Text>
        </View>
      );
    }
    return (
      <View className="px-2 py-1 rounded-full" style={{ backgroundColor: Colors.warning[50] }}>
        <Text className="text-xs font-medium" style={{ color: Colors.warning[600] }}>
          Chờ xử lý
        </Text>
      </View>
    );
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (periodFilter !== 'month') count++;
    if (statusFilter !== 'all') count++;
    return count;
  };

  return (
    <>
      <AppHeader title="Doanh thu" showNotification />

      <ScrollView
        className="flex-1"
        style={{ backgroundColor: theme.background }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="px-4 pt-4 pb-24">
          {/* Filters Bar */}
          <View className="flex-row items-center gap-2 mb-4">
            <Pressable
              className="flex-row items-center px-4 py-2 rounded-lg flex-1"
              style={{ backgroundColor: theme.card }}
              onPress={() => setShowFilterModal(true)}
            >
              <Ionicons name="calendar-outline" size={18} color={theme.text.secondary} />
              <Text className="ml-2 flex-1 text-sm" style={{ color: theme.text.primary }}>
                {getPeriodLabel(periodFilter)}
              </Text>
              <Ionicons name="chevron-down" size={18} color={theme.text.secondary} />
            </Pressable>

            <Pressable
              className="relative p-2.5 rounded-lg"
              style={{ backgroundColor: theme.card }}
              onPress={() => setShowFilterModal(true)}
            >
              <Ionicons
                name="options-outline"
                size={20}
                color={getActiveFilterCount() > 0 ? Colors.primary[600] : theme.text.secondary}
              />
              {getActiveFilterCount() > 0 && (
                <View
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full items-center justify-center"
                  style={{ backgroundColor: Colors.primary[600] }}
                >
                  <Text className="text-xs font-bold text-white">{getActiveFilterCount()}</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Summary Cards */}
          <View className="gap-4 mb-6">
            {/* Total Revenue Card with Gradient */}
            <View
              className="rounded-xl p-4 overflow-hidden"
              style={{
                backgroundColor: Colors.primary[600],
                shadowColor: Colors.primary[600],
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-sm mb-1 text-white/80">Tổng doanh thu</Text>
                  <Text className="text-2xl font-bold mb-1 text-white">
                    {formatCurrency(stats.totalRevenue)}
                  </Text>
                  <Text className="text-xs text-white/70">{stats.transactionCount} giao dịch</Text>
                </View>
                <View className="w-14 h-14 rounded-full items-center justify-center bg-white/20">
                  <Ionicons name="wallet" size={28} color="white" />
                </View>
              </View>
            </View>

            {/* Platform Fee & Net Revenue */}
            <View className="flex-row gap-4">
              <View className="flex-1 rounded-xl p-4" style={{ backgroundColor: theme.card }}>
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mb-3"
                  style={{ backgroundColor: Colors.error[50] }}
                >
                  <Ionicons name="card-outline" size={20} color={Colors.error[600]} />
                </View>
                <Text className="text-xs mb-2" style={{ color: theme.text.secondary }}>
                  Phí nền tảng
                </Text>
                <Text className="text-xl font-bold mb-1" style={{ color: Colors.error[600] }}>
                  {formatCurrency(stats.platformFee)}
                </Text>
                <Text className="text-xs" style={{ color: theme.text.secondary }}>
                  5% giao dịch
                </Text>
              </View>

              <View className="flex-1 rounded-xl p-4" style={{ backgroundColor: theme.card }}>
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mb-3"
                  style={{ backgroundColor: Colors.success[50] }}
                >
                  <Ionicons name="cash-outline" size={20} color={Colors.success[600]} />
                </View>
                <Text className="text-xs mb-2" style={{ color: theme.text.secondary }}>
                  Thực nhận
                </Text>
                <Text className="text-xl font-bold mb-1" style={{ color: Colors.success[600] }}>
                  {formatCurrency(stats.netRevenue)}
                </Text>
                <Text className="text-xs" style={{ color: theme.text.secondary }}>
                  Sau trừ phí
                </Text>
              </View>
            </View>

            {/* Growth Card */}
            <View className="rounded-xl p-4" style={{ backgroundColor: theme.card }}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: Colors.success[50] }}
                  >
                    <Ionicons name="trending-up" size={20} color={Colors.success[600]} />
                  </View>
                  <View>
                    <Text className="text-sm mb-1" style={{ color: theme.text.secondary }}>
                      Tăng trưởng
                    </Text>
                    <Text className="text-2xl font-bold" style={{ color: Colors.success[600] }}>
                      +{stats.growth}%
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-right" style={{ color: theme.text.secondary }}>
                  So với{'\n'}tháng trước
                </Text>
              </View>
            </View>
          </View>

          {/* Recent Transactions Header */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold" style={{ color: theme.text.primary }}>
              Giao dịch gần đây
            </Text>
            <Text className="text-sm" style={{ color: theme.text.secondary }}>
              {transactions.length} giao dịch
            </Text>
          </View>

          {/* Transactions List */}
          {loading ? (
            <View className="items-center justify-center py-8">
              <ActivityIndicator size="large" color={Colors.primary[600]} />
            </View>
          ) : transactions.length === 0 ? (
            <View className="items-center justify-center py-12">
              <View
                className="w-20 h-20 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: theme.card }}
              >
                <Ionicons name="receipt-outline" size={40} color={theme.text.secondary} />
              </View>
              <Text className="text-base font-medium mb-2" style={{ color: theme.text.primary }}>
                Chưa có giao dịch
              </Text>
              <Text className="text-sm text-center" style={{ color: theme.text.secondary }}>
                Giao dịch sẽ hiển thị tại đây
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {transactions.map((transaction) => (
                <View
                  key={transaction._id}
                  className="rounded-xl p-4"
                  style={{ backgroundColor: theme.card }}
                >
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1">
                      <Text className="font-semibold text-base mb-1" style={{ color: theme.text.primary }}>
                        {transaction.patientName}
                      </Text>
                      <View className="flex-row items-center gap-2">
                        <Ionicons name="calendar-outline" size={14} color={theme.text.secondary} />
                        <Text className="text-sm" style={{ color: theme.text.secondary }}>
                          {new Date(transaction.date).toLocaleDateString('vi-VN')}
                        </Text>
                        <Text style={{ color: theme.text.secondary }}>•</Text>
                        <Text className="text-sm" style={{ color: theme.text.secondary }}>
                          {getTypeLabel(transaction.type)}
                        </Text>
                      </View>
                    </View>
                    {getStatusBadge(transaction.status)}
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
                      <Text className="text-sm" style={{ color: Colors.error[600] }}>
                        -{formatCurrency(transaction.platformFee)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between pt-2 border-t" style={{ borderColor: theme.border }}>
                      <Text className="text-sm font-semibold" style={{ color: theme.text.primary }}>
                        Thực nhận:
                      </Text>
                      <Text className="text-base font-bold" style={{ color: Colors.success[600] }}>
                        {formatCurrency(transaction.netAmount)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="slide">
        <Pressable
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={() => setShowFilterModal(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="rounded-t-3xl p-6" style={{ backgroundColor: theme.card }}>
              {/* Modal Header */}
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-xl font-bold" style={{ color: theme.text.primary }}>
                  Bộ lọc
                </Text>
                <Pressable
                  onPress={() => {
                    setPeriodFilter('month');
                    setStatusFilter('all');
                  }}
                >
                  <Text className="text-sm font-medium" style={{ color: Colors.primary[600] }}>
                    Đặt lại
                  </Text>
                </Pressable>
              </View>

              {/* Period Filter */}
              <View className="mb-6">
                <Text className="text-sm font-semibold mb-3" style={{ color: theme.text.primary }}>
                  Khoảng thời gian
                </Text>
                <View className="gap-2">
                  {[
                    { value: 'today' as PeriodFilter, label: 'Hôm nay', icon: 'today-outline' },
                    { value: 'week' as PeriodFilter, label: 'Tuần này', icon: 'calendar-outline' },
                    { value: 'month' as PeriodFilter, label: 'Tháng này', icon: 'calendar' },
                    { value: 'year' as PeriodFilter, label: 'Năm nay', icon: 'calendar-sharp' },
                  ].map((option) => (
                    <Pressable
                      key={option.value}
                      className="flex-row items-center justify-between p-3 rounded-lg"
                      style={{
                        backgroundColor:
                          periodFilter === option.value ? Colors.primary[50] : theme.background,
                      }}
                      onPress={() => setPeriodFilter(option.value)}
                    >
                      <View className="flex-row items-center gap-3">
                        <Ionicons
                          name={option.icon as any}
                          size={20}
                          color={
                            periodFilter === option.value
                              ? Colors.primary[600]
                              : theme.text.secondary
                          }
                        />
                        <Text
                          className="text-sm font-medium"
                          style={{
                            color:
                              periodFilter === option.value
                                ? Colors.primary[600]
                                : theme.text.primary,
                          }}
                        >
                          {option.label}
                        </Text>
                      </View>
                      {periodFilter === option.value && (
                        <Ionicons name="checkmark-circle" size={20} color={Colors.primary[600]} />
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Status Filter */}
              <View className="mb-6">
                <Text className="text-sm font-semibold mb-3" style={{ color: theme.text.primary }}>
                  Trạng thái
                </Text>
                <View className="gap-2">
                  {[
                    { value: 'all' as StatusFilter, label: 'Tất cả', icon: 'list-outline' },
                    { value: 'completed' as StatusFilter, label: 'Hoàn thành', icon: 'checkmark-circle-outline' },
                    { value: 'pending' as StatusFilter, label: 'Chờ xử lý', icon: 'time-outline' },
                  ].map((option) => (
                    <Pressable
                      key={option.value}
                      className="flex-row items-center justify-between p-3 rounded-lg"
                      style={{
                        backgroundColor:
                          statusFilter === option.value ? Colors.primary[50] : theme.background,
                      }}
                      onPress={() => setStatusFilter(option.value)}
                    >
                      <View className="flex-row items-center gap-3">
                        <Ionicons
                          name={option.icon as any}
                          size={20}
                          color={
                            statusFilter === option.value
                              ? Colors.primary[600]
                              : theme.text.secondary
                          }
                        />
                        <Text
                          className="text-sm font-medium"
                          style={{
                            color:
                              statusFilter === option.value
                                ? Colors.primary[600]
                                : theme.text.primary,
                          }}
                        >
                          {option.label}
                        </Text>
                      </View>
                      {statusFilter === option.value && (
                        <Ionicons name="checkmark-circle" size={20} color={Colors.primary[600]} />
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Apply Button */}
              <Pressable
                className="p-4 rounded-lg items-center"
                style={{ backgroundColor: Colors.primary[600] }}
                onPress={() => {
                  setShowFilterModal(false);
                  fetchRevenueData();
                }}
              >
                <Text className="text-base font-semibold text-white">Áp dụng bộ lọc</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
