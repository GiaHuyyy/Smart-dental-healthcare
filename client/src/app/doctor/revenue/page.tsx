"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRevenueSocket } from "@/hooks/useRevenueSocket";
import revenueService, { RevenueRecord } from "@/services/revenueService";
import {
  Calendar,
  CalendarDays,
  CheckCircle,
  Clock,
  CreditCardIcon,
  DollarSignIcon,
  DownloadIcon,
  Loader2Icon,
  Mail,
  Phone,
  ReceiptIcon,
  RefreshCw,
  Search,
  User,
  Wallet,
  WalletIcon,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Transaction {
  _id: string;
  amount: number;
  platformFee?: number;
  revenueAmount?: number;
  paymentDate?: string;
  createdAt: string;
  status: string;
  revenueRecorded?: boolean;
  patientId?: {
    fullName: string;
  };
  refId?: {
    appointmentType?: string;
  };
}

export default function RevenuePage() {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<{
    summary?: {
      totalAmount: number;
      totalPlatformFee: number;
      totalRevenue: number;
      totalAppointments: number;
      averageRevenue: number;
    };
    results?: RevenueRecord[];
    recentTransactions?: Transaction[];
  } | null>(null);
  const [selectedRevenue, setSelectedRevenue] = useState<RevenueRecord | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // WebSocket connection
  const { isConnected, registerRefreshCallback, unregisterRefreshCallback } = useRevenueSocket();

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [startFilterDate, setStartFilterDate] = useState<string>("");
  const [endFilterDate, setEndFilterDate] = useState<string>("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const doctorId = session?.user?._id;

  const fetchRevenueData = useCallback(async () => {
    if (!doctorId) return;

    setLoading(true);
    try {
      const response = await revenueService.getDoctorRevenues(
        doctorId,
        1,
        100,
        undefined // Fetch ALL revenues, filter will be done on frontend
      );

      if (response.success) {
        setRevenueData(response.data);
      }
    } catch (error) {
      console.error("Error fetching revenue data:", error);
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi tải dữ liệu",
      });
    } finally {
      setLoading(false);
    }
  }, [doctorId, toast]); // Removed statusFilter from dependency

  // Register refresh callback for socket events (like appointment pattern)
  useEffect(() => {
    console.log("🔍 Revenue page effect - isConnected:", isConnected, "doctorId:", doctorId);

    if (!isConnected) {
      console.log("⚠️ Revenue socket not connected yet");
      return;
    }

    console.log("✅ Registering refresh callback for doctor:", doctorId);

    // Register callback to refresh data when any revenue event occurs
    registerRefreshCallback(() => {
      console.log("🔄 Revenue socket event triggered - refreshing data...");
      fetchRevenueData();
    });

    // Cleanup on unmount
    return () => {
      console.log("🧹 Unregistering refresh callback");
      unregisterRefreshCallback();
    };
  }, [isConnected, doctorId, fetchRevenueData, registerRefreshCallback, unregisterRefreshCallback]);
  useEffect(() => {
    fetchRevenueData();
  }, [fetchRevenueData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleViewDetails = (revenue: RevenueRecord) => {
    setSelectedRevenue(revenue);
    setIsDetailDialogOpen(true);
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, startFilterDate, endFilterDate, searchTerm]);

  // Calculate totals from revenues directly (new 3-bill structure)
  const allRevenues = useMemo(() => revenueData?.results || [], [revenueData?.results]);

  // Pending revenues (bills chờ thanh toán) - Lấy từ netAmount (thực nhận)
  const pendingRevenues = allRevenues.filter((r) => r.status === "pending");
  const pendingTotal = pendingRevenues.reduce((sum, r) => sum + (r.netAmount || 0), 0);

  // Completed revenues (bills đã thanh toán) - Lấy từ netAmount (thực nhận)
  const completedRevenues = allRevenues.filter((r) => r.status === "completed" && (r.netAmount || 0) >= 0);
  const completedTotal = completedRevenues.reduce((sum, r) => sum + (r.netAmount || 0), 0);

  // Refund revenues (bills hoàn tiền) - Lấy từ netAmount (ĐÃ ÂM từ database)
  const refundRevenues = allRevenues.filter((r) => (r.netAmount || 0) < 0);
  const refundTotal = refundRevenues.reduce((sum, r) => sum + (r.netAmount || 0), 0); // GIỮ NGUYÊN SỐ ÂM

  // Total = pending + completed + refund (refund đã âm nên cộng vào sẽ tự trừ)
  // Ví dụ: 190,000 + (-190,000) = 0 ✅
  const totalAmount = pendingTotal + completedTotal + refundTotal;

  // Platform fee total - Lấy từ cả pending và completed (KHÔNG tính phí cho refund)
  const platformFee = [...pendingRevenues, ...completedRevenues].reduce((sum, r) => sum + (r.platformFee || 0), 0);

  const totalAppointments = allRevenues.length;

  // Prepare chart data - Group revenues by day (last 7 days) and calculate net amount
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0); // Reset to start of day
      return date;
    });

    return last7Days.map((date) => {
      const dayName = date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();

      // Get date string in local timezone (not UTC)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      // Helper function to check if revenue belongs to this day
      const isSameDay = (revenue: RevenueRecord) => {
        const sourceDate = revenue.revenueDate ? new Date(revenue.revenueDate) : new Date(revenue.createdAt);
        const revYear = sourceDate.getFullYear();
        const revMonth = String(sourceDate.getMonth() + 1).padStart(2, "0");
        const revDay = String(sourceDate.getDate()).padStart(2, "0");
        const revDateStr = `${revYear}-${revMonth}-${revDay}`;
        return revDateStr === dateStr;
      };

      // Completed revenues (positive netAmount)
      const completedRevenues = allRevenues.filter(
        (r) => r.status === "completed" && (r.netAmount || 0) > 0 && isSameDay(r)
      );
      const completedAmount = completedRevenues.reduce((sum, r) => sum + (r.netAmount || 0), 0);

      // Pending revenues
      const pendingRevenues = allRevenues.filter((r) => r.status === "pending" && isSameDay(r));
      const pendingAmount = pendingRevenues.reduce((sum, r) => sum + (r.netAmount || 0), 0);

      // Refund revenues (negative netAmount, display as positive for chart)
      const refundRevenues = allRevenues.filter((r) => (r.netAmount || 0) < 0 && isSameDay(r));
      const refundAmount = Math.abs(refundRevenues.reduce((sum, r) => sum + (r.netAmount || 0), 0));

      return {
        day: dayName,
        completed: completedAmount,
        pending: pendingAmount,
        refund: refundAmount,
        date: dateStr,
      };
    });
  }, [allRevenues]);

  if (loading && !revenueData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Đang tải...</span>
      </div>
    );
  }

  // Filter revenues with search, date range, and status
  const filteredTransactions = allRevenues.filter((revenue) => {
    // Status filter
    let statusMatch = true;
    if (statusFilter === "all") {
      statusMatch = true;
    } else if (statusFilter === "refund") {
      statusMatch = (revenue.amount || 0) < 0;
    } else {
      statusMatch = revenue.status === statusFilter;
    }

    // Search filter
    const searchMatch =
      !searchTerm ||
      (typeof revenue.patientId === "object" &&
        revenue.patientId?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (typeof revenue.patientId === "object" &&
        revenue.patientId?.email?.toLowerCase().includes(searchTerm.toLowerCase()));

    // Date range filter
    if (startFilterDate && endFilterDate && statusMatch && searchMatch) {
      const revenueDate = new Date(revenue.createdAt);
      const start = new Date(startFilterDate);
      const end = new Date(endFilterDate);

      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      revenueDate.setHours(0, 0, 0, 0);

      return revenueDate >= start && revenueDate <= end;
    } else if (startFilterDate && statusMatch && searchMatch) {
      const revenueDate = new Date(revenue.createdAt);
      const filterDate = new Date(startFilterDate);

      return (
        revenueDate.getFullYear() === filterDate.getFullYear() &&
        revenueDate.getMonth() === filterDate.getMonth() &&
        revenueDate.getDate() === filterDate.getDate()
      );
    }

    return statusMatch && searchMatch;
  });

  const totalPages = Math.ceil(filteredTransactions.length / pageSize);
  const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Handler for card clicks
  const handleCardClick = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-4">
          {/* Title and Buttons Row - All in one line */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Doanh thu</h1>
                <p className="text-sm text-gray-600">Quản lý và theo dõi doanh thu</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" className="gap-2 text-white">
                <DownloadIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Xuất báo cáo</span>
              </Button>
              <Button size="sm" className="gap-2 text-white">
                <WalletIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Yêu cầu rút tiền</span>
              </Button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm bệnh nhân, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
              />
            </div>

            <span className="text-sm font-medium text-gray-700">Từ</span>
            <input
              type="date"
              value={startFilterDate}
              onChange={(e) => setStartFilterDate(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
            />
            <span className="text-sm font-medium text-gray-700">đến</span>
            <input
              type="date"
              value={endFilterDate}
              onChange={(e) => setEndFilterDate(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
            />
            <button
              onClick={() => {
                setStartFilterDate("");
                setEndFilterDate("");
                setSearchTerm("");
              }}
              disabled={!startFilterDate && !endFilterDate && !searchTerm}
              className="px-4 py-2.5 text-sm bg-white text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium border border-gray-300"
            >
              Xóa
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Revenue - Click to show all */}
        <button
          onClick={() => handleCardClick("all")}
          className={`bg-white rounded-xl ring-2 ${statusFilter === "all" ? "ring-primary" : "ring-transparent"}`}
        >
          <Card className="text-left h-full">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm mb-1 text-gray-600">Tổng doanh thu</p>
                  <div className="text-2xl font-bold text-primary">+{formatCurrency(totalAmount)}</div>
                  <p className="text-xs mt-2 text-gray-600">{totalAppointments} giao dịch (trừ 5% phí)</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSignIcon className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </button>

        {/* Pending Revenue - Click to show pending */}
        <button
          onClick={() => handleCardClick("pending")}
          className={`bg-white rounded-xl ring-2 ${
            statusFilter === "pending" ? " ring-yellow-500" : "ring-transparent "
          }`}
        >
          <Card className="text-left h-full">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">Doanh thu chờ</p>
                  <div className="text-2xl font-bold text-yellow-600">+{formatCurrency(pendingTotal)}</div>
                  <p className="text-xs text-gray-500 mt-2">{pendingRevenues.length} giao dịch (trừ 5% phí)</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </button>

        {/* Completed Revenue - Click to show completed */}
        <button
          onClick={() => handleCardClick("completed")}
          className={`bg-white rounded-xl ring-2 ${
            statusFilter === "completed" ? "ring-green-500" : "ring-transparent"
          }`}
        >
          <Card className="text-left h-full">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">Doanh thu thực nhận</p>
                  <div className="text-2xl font-bold text-green-600">+{formatCurrency(completedTotal)}</div>
                  <p className="text-xs text-gray-500 mt-2">{completedRevenues.length} giao dịch (trừ 5% phí)</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </button>

        {/* Refunds - Click to show refunds */}
        <button
          onClick={() => handleCardClick("refund")}
          className={`bg-white rounded-xl ring-2  ${statusFilter === "refund" ? " ring-red-500" : "ring-transparent "}`}
        >
          <Card className="text-left h-full">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">Đã hoàn tiền</p>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(refundTotal)}</div>
                  <p className="text-xs text-gray-500 mt-2">{refundRevenues.length} giao dịch (trừ 5% phí)</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </button>

        {/* Platform Fee */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Phí nền tảng</p>
                <div className="text-2xl font-bold text-orange-600">{formatCurrency(platformFee)}</div>
                <p className="text-xs text-gray-500 mt-2">5% mỗi giao dịch</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <CreditCardIcon className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Biểu đồ doanh thu</h3>
              <p className="text-sm text-gray-600">Theo dõi xu hướng doanh thu 7 ngày qua (đã trừ phí nền tảng)</p>
            </div>

            {/* Chart */}
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    {/* Gradient for Completed */}
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                    {/* Gradient for Pending */}
                    <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#eab308" stopOpacity={0.05} />
                    </linearGradient>
                    {/* Gradient for Refund */}
                    <linearGradient id="colorRefund" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                      return value.toString();
                    }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
                            <p className="text-xs text-gray-500 mb-2">Ngày: {label}</p>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                  <span className="text-xs text-gray-600">Đã thanh toán</span>
                                </div>
                                <span className="text-sm font-semibold text-green-600">
                                  {formatCurrency((payload[0]?.value as number) || 0)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                  <span className="text-xs text-gray-600">Chờ xử lý</span>
                                </div>
                                <span className="text-sm font-semibold text-yellow-600">
                                  {formatCurrency((payload[1]?.value as number) || 0)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                  <span className="text-xs text-gray-600">Đã hoàn tiền</span>
                                </div>
                                <span className="text-sm font-semibold text-red-600">
                                  {formatCurrency((payload[2]?.value as number) || 0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {/* Completed Revenue - Green */}
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorCompleted)"
                    dot={{ fill: "#10b981", strokeWidth: 2, r: 4, stroke: "white" }}
                    activeDot={{ r: 6 }}
                  />
                  {/* Pending Revenue - Yellow */}
                  <Area
                    type="monotone"
                    dataKey="pending"
                    stroke="#eab308"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorPending)"
                    dot={{ fill: "#eab308", strokeWidth: 2, r: 4, stroke: "white" }}
                    activeDot={{ r: 6 }}
                  />
                  {/* Refund Revenue - Red */}
                  <Area
                    type="monotone"
                    dataKey="refund"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRefund)"
                    dot={{ fill: "#ef4444", strokeWidth: 2, r: 4, stroke: "white" }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-600">Doanh thu thực nhận:</span>
                <span className="text-sm font-semibold text-green-600">{formatCurrency(completedTotal)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-sm text-gray-600">Doanh thu chờ:</span>
                <span className="text-sm font-semibold text-yellow-600">{formatCurrency(pendingTotal)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-600">Đã hoàn tiền:</span>
                <span className="text-sm font-semibold text-red-600">{formatCurrency(Math.abs(refundTotal))}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <ReceiptIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Chưa có dữ liệu</p>
          </div>
        ) : (
          <>
            {/* Pagination - Top */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Hiển thị {(currentPage - 1) * pageSize + 1} -{" "}
                    {Math.min(currentPage * pageSize, filteredTransactions.length)} trong tổng số{" "}
                    {filteredTransactions.length} giao dịch
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Trước
                    </button>
                    <div className="flex items-center gap-1">
                      {[...Array(totalPages)].map((_, index) => {
                        const pageNumber = index + 1;
                        if (
                          pageNumber === 1 ||
                          pageNumber === totalPages ||
                          (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={pageNumber}
                              onClick={() => setCurrentPage(pageNumber)}
                              className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                                currentPage === pageNumber ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"
                              }`}
                            >
                              {pageNumber}
                            </button>
                          );
                        } else if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                          return (
                            <span key={pageNumber} className="px-2 text-gray-400">
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Tiếp
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Table Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="grid grid-cols-12 gap-6 text-sm font-semibold text-gray-700">
                <div className="col-span-2">Bệnh nhân</div>
                <div className="col-span-2">Ngày tạo</div>
                <div className="col-span-2">Ngày thanh toán</div>
                <div className="col-span-1 text-right">Số tiền</div>
                <div className="col-span-1 text-right">Phí</div>
                <div className="col-span-2 text-right">Thực nhận</div>
                <div className="col-span-1 text-center">Trạng thái</div>
                <div className="col-span-1 text-center">Thao tác</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {paginatedTransactions.map((revenue: RevenueRecord) => {
                // Lấy giá trị trực tiếp từ database
                const amount = revenue.amount || 0;
                const platformFee = revenue.platformFee || 0;
                const netAmount = revenue.netAmount || 0;
                const patientName = (typeof revenue.patientId === "object" && revenue.patientId?.fullName) || "N/A";
                const patientEmail = (typeof revenue.patientId === "object" && revenue.patientId?.email) || "";

                return (
                  <div
                    key={revenue._id}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleViewDetails(revenue)}
                  >
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Patient with Avatar */}
                      <div className="col-span-2 flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-6 h-6 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[15px] font-medium text-gray-900 truncate">{patientName}</p>
                          {patientEmail && <p className="text-xs text-gray-500 truncate mt-0.5">{patientEmail}</p>}
                        </div>
                      </div>

                      {/* Created Date */}
                      <div className="col-span-2 flex items-center">
                        <p className="text-[15px] text-gray-900">{formatDate(revenue.createdAt)}</p>
                      </div>

                      {/* Payment Date */}
                      <div className="col-span-2 flex items-center">
                        <p className="text-[15px] text-gray-900">
                          {revenue.status === "completed" && revenue.revenueDate ? formatDate(revenue.revenueDate) : ""}
                        </p>
                      </div>

                      {/* Amount */}
                      <div className="col-span-1 text-right flex items-center justify-end">
                        <p className="text-[15px] font-semibold text-primary">
                          {amount >= 0 ? "+" : ""}
                          {formatCurrency(amount)}
                        </p>
                      </div>

                      {/* Platform Fee */}
                      <div className="col-span-1 text-right flex items-center justify-end">
                        <p className="text-[15px] text-orange-600">{formatCurrency(platformFee)}</p>
                      </div>

                      {/* Net Amount */}
                      <div className="col-span-2 text-right flex items-center justify-end">
                        <p
                          className={`text-[15px] font-bold ${
                            revenue.status === "pending"
                              ? "text-yellow-600"
                              : netAmount >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {netAmount >= 0 ? "+" : ""}
                          {formatCurrency(netAmount)}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="col-span-1 flex items-center justify-center">
                        {/* Refund: netAmount < 0 */}
                        {netAmount < 0 ? (
                          <span className="px-2 py-1 rounded-md text-xs bg-red-100 text-red-700">Refund</span>
                        ) : revenue.status === "completed" ? (
                          <span className="px-2 py-1 rounded-md text-xs bg-green-100 text-green-700">Completed</span>
                        ) : (
                          <span className="px-2 py-1 rounded-md text-xs bg-yellow-100 text-yellow-700">Pending</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 flex items-center justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (revenue.refId) {
                              const refIdString =
                                typeof revenue.refId === "object"
                                  ? revenue.refId._id || revenue.refId.toString()
                                  : revenue.refId.toString();
                              window.location.href = `/doctor/schedule?appointmentId=${refIdString}`;
                            }
                          }}
                          className="gap-1.5 hover:bg-primary/10 text-primary text-sm font-medium"
                        >
                          <CalendarDays className="w-4 h-4" />
                          <span className="hidden sm:inline">Xem lịch</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Revenue Detail Modal */}
      {isDetailDialogOpen && selectedRevenue && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Chi Tiết Hóa Đơn</h2>
              <button onClick={() => setIsDetailDialogOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Patient info */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {(typeof selectedRevenue.patientId === "object" && selectedRevenue.patientId?.fullName) || "N/A"}
                  </h3>
                  {typeof selectedRevenue.patientId === "object" && selectedRevenue.patientId?.email && (
                    <p className="text-sm text-gray-600">{selectedRevenue.patientId.email}</p>
                  )}
                </div>
              </div>

              {/* Revenue details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Ngày tạo</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedRevenue.createdAt)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Ngày thanh toán</p>
                    {selectedRevenue.status === "completed" && selectedRevenue.revenueDate && (
                      <p className="font-medium text-gray-900">{formatDate(selectedRevenue.revenueDate)}</p>
                    )}
                  </div>
                </div>

                {typeof selectedRevenue.patientId === "object" && selectedRevenue.patientId?.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium text-gray-900">{selectedRevenue.patientId.email}</p>
                    </div>
                  </div>
                )}

                {typeof selectedRevenue.patientId === "object" && selectedRevenue.patientId?.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Điện thoại</p>
                      <p className="font-medium text-gray-900">{selectedRevenue.patientId.phone}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <ReceiptIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Loại</p>
                    <p className="font-medium text-gray-900">
                      {selectedRevenue.type === "appointment" ? "Lịch khám" : "Khác"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 rounded-full mt-0.5 ${
                      (selectedRevenue.netAmount || 0) < 0
                        ? "bg-red-500"
                        : selectedRevenue.status === "completed"
                        ? "bg-green-500"
                        : selectedRevenue.status === "pending"
                        ? "bg-yellow-500"
                        : "bg-gray-500"
                    }`}
                  />
                  <div>
                    <p className="text-sm text-gray-600">Trạng thái</p>
                    <p className="font-medium text-gray-900">
                      {(selectedRevenue.netAmount || 0) < 0
                        ? "Hoàn tiền"
                        : selectedRevenue.status === "completed"
                        ? "Đã thanh toán"
                        : selectedRevenue.status === "pending"
                        ? "Chờ xử lý"
                        : "Đã hủy"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount details */}
              <div className="border-t border-gray-200 pt-6 space-y-3">
                <h3 className="font-semibold text-gray-900 mb-4">Thông tin thanh toán</h3>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Số tiền gốc:</span>
                  <span
                    className={`font-semibold ${(selectedRevenue.amount || 0) >= 0 ? "text-gray-900" : "text-red-600"}`}
                  >
                    {formatCurrency(selectedRevenue.amount || 0)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Phí nền tảng (5%):</span>
                  <span className="font-semibold text-orange-600">
                    {formatCurrency(selectedRevenue.platformFee || 0)}
                  </span>
                </div>

                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Thực nhận:</span>
                    <span
                      className={`text-xl font-bold ${
                        (selectedRevenue.netAmount || 0) < 0
                          ? "text-red-600"
                          : selectedRevenue.status === "pending"
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {formatCurrency(selectedRevenue.netAmount || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedRevenue.notes && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Ghi chú</h3>
                  <p className="text-gray-600">{selectedRevenue.notes}</p>
                </div>
              )}

              {/* Action button to view appointment */}
              {selectedRevenue.refId && (
                <div className="border-t border-gray-200 pt-6">
                  <Button
                    onClick={() => {
                      const refIdString =
                        typeof selectedRevenue.refId === "object"
                          ? selectedRevenue.refId._id || selectedRevenue.refId.toString()
                          : selectedRevenue.refId.toString();
                      window.location.href = `/doctor/schedule?appointmentId=${refIdString}`;
                    }}
                    className="w-full gap-2"
                  >
                    <CalendarDays className="w-4 h-4" />
                    Xem lịch hẹn liên quan
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
