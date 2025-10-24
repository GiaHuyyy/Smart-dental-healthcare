"use client";

import RevenueByTypeChart from "@/components/revenue/RevenueByTypeChart";
import RevenueChart from "@/components/revenue/RevenueChart";
import RevenueDetailDialog from "@/components/revenue/RevenueDetailDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import revenueService, { RevenueRecord } from "@/services/revenueService";
import {
  ArrowUpIcon,
  CalendarIcon,
  CreditCardIcon,
  DollarSignIcon,
  DownloadIcon,
  FilterIcon,
  Loader2Icon,
  ReceiptIcon,
  TrendingUpIcon,
  WalletIcon
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

// Translations
const translations = {
  vi: {
    title: "Doanh thu",
    description: "Quản lý và theo dõi doanh thu từ các dịch vụ khám chữa bệnh",
    filters: "Bộ lọc",
    period: "Khoảng thời gian",
    status: "Trạng thái",
    revenueType: "Loại doanh thu",
    all: "Tất cả",
    today: "Hôm nay",
    week: "Tuần này",
    month: "Tháng này",
    year: "Năm nay",
    custom: "Tùy chỉnh",
    totalRevenue: "Tổng doanh thu",
    comparedToPrevious: "0 giao dịch",
    platformFee: "Phí nền tảng",
    feeRate: "5% mỗi giao dịch",
    netRevenue: "Doanh thu thực nhận",
    afterFees: "Sau khi trừ phí",
    growth: "Tăng trưởng",
    comparedToLastMonth: "➜ So với tháng trước",
    revenueChart: "Biểu đồ doanh thu",
    monthlyTrend: "Theo dõi xu hướng doanh thu theo tháng",
    revenueByType: "Doanh thu theo loại",
    revenueDistribution: "Phân bổ doanh thu theo từng loại dịch vụ",
    recentTransactions: "Giao dịch gần đây",
    latestPayments: "Danh sách các khoản thanh toán mới nhất",
    noData: "Chưa có dữ liệu",
    patient: "Bệnh nhân",
    date: "Ngày",
    type: "Loại",
    amount: "Số tiền",
    fee: "Phí",
    netAmount: "Thực nhận",
    statusLabel: "Trạng thái",
    actions: "Thao tác",
    viewDetails: "Xem chi tiết",
    exportReport: "Xuất báo cáo",
    requestWithdraw: "Yêu cầu rút tiền",
    loading: "Đang tải...",
    error: "Có lỗi xảy ra khi tải dữ liệu",
    statusCompleted: "Hoàn thành",
    statusPending: "Chờ xử lý",
    statusWithdrawn: "Đã rút",
    statusCancelled: "Đã hủy",
    typeAppointment: "Lịch khám",
    typeTreatment: "Điều trị",
    typeMedicine: "Thuốc",
    typeOther: "Khác",
    transactions: "giao dịch",
  },
  en: {
    title: "Revenue",
    description: "Manage and track revenue from medical services",
    filters: "Filters",
    period: "Time Period",
    status: "Status",
    revenueType: "Revenue Type",
    all: "All",
    today: "Today",
    week: "This Week",
    month: "This Month",
    year: "This Year",
    custom: "Custom",
    totalRevenue: "Total Revenue",
    comparedToPrevious: "0 transactions",
    platformFee: "Platform Fee",
    feeRate: "5% per transaction",
    netRevenue: "Net Revenue",
    afterFees: "After fees",
    growth: "Growth",
    comparedToLastMonth: "➜ Compared to last month",
    revenueChart: "Revenue Chart",
    monthlyTrend: "Track monthly revenue trends",
    revenueByType: "Revenue by Type",
    revenueDistribution: "Revenue distribution by service type",
    recentTransactions: "Recent Transactions",
    latestPayments: "Latest payment records",
    noData: "No data available",
    patient: "Patient",
    date: "Date",
    type: "Type",
    amount: "Amount",
    fee: "Fee",
    netAmount: "Net Amount",
    statusLabel: "Status",
    actions: "Actions",
    viewDetails: "View Details",
    exportReport: "Export Report",
    requestWithdraw: "Request Withdraw",
    loading: "Loading...",
    error: "Error loading data",
    statusCompleted: "Completed",
    statusPending: "Pending",
    statusWithdrawn: "Withdrawn",
    statusCancelled: "Cancelled",
    typeAppointment: "Appointment",
    typeTreatment: "Treatment",
    typeMedicine: "Medicine",
    typeOther: "Other",
    transactions: "transactions",
  },
};

export default function RevenuePage() {
  const { data: session } = useSession();
  const [language, setLanguage] = useState<"vi" | "en">("vi");
  const t = translations[language];

  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [selectedRevenue, setSelectedRevenue] = useState<RevenueRecord | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Filters
  const [period, setPeriod] = useState("month");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const doctorId = session?.user?._id;

  useEffect(() => {
    if (doctorId) {
      fetchRevenueData();
    }
  }, [doctorId, period, statusFilter, typeFilter]);

  const fetchRevenueData = async () => {
    if (!doctorId) return;

    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams({
        period,
        current: "1",
        pageSize: "50",
      });

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      if (typeFilter !== "all") {
        params.append("type", typeFilter);
      }

      const response = await revenueService.getDoctorRevenues(
        doctorId,
        1,
        50,
        statusFilter !== "all" ? { status: statusFilter } : undefined
      );

      if (response.success) {
        setRevenueData(response.data);
      }
    } catch (error) {
      console.error("Error fetching revenue data:", error);
    } finally {
      setLoading(false);
    }
  };

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
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { label: t.statusCompleted, className: "bg-green-100 text-green-800" },
      pending: { label: t.statusPending, className: "bg-yellow-100 text-yellow-800" },
      withdrawn: { label: t.statusWithdrawn, className: "bg-blue-100 text-blue-800" },
      cancelled: { label: t.statusCancelled, className: "bg-red-100 text-red-800" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      appointment: t.typeAppointment,
      treatment: t.typeTreatment,
      medicine: t.typeMedicine,
      other: t.typeOther,
    };
    return typeLabels[type] || t.typeOther;
  };

  const handleViewDetails = (revenue: RevenueRecord) => {
    setSelectedRevenue(revenue);
    setIsDetailDialogOpen(true);
  };

  const handleUpdateRevenue = async (revenueId: string, data: any) => {
    try {
      await revenueService.updateRevenue(revenueId, data);
      await fetchRevenueData(); // Refresh data
    } catch (error) {
      console.error("Error updating revenue:", error);
    }
  };

  if (loading && !revenueData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2Icon className="w-8 h-8 animate-spin" />
        <span className="ml-2">{t.loading}</span>
      </div>
    );
  }

  const summary = revenueData?.summary || {
    totalAmount: 0,
    totalPlatformFee: 0,
    totalRevenue: 0,
    totalAppointments: 0,
    averageRevenue: 0,
  };

  // Sử dụng data từ server (đã tính sẵn)
  const totalAmount = summary.totalAmount || 0; // Tổng số tiền gốc
  const platformFee = summary.totalPlatformFee || 0; // Tổng phí nền tảng
  const netRevenue = summary.totalRevenue || 0; // Tổng thực nhận (đã trừ phí)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ReceiptIcon className="w-8 h-8 text-blue-500" />
              {t.title}
            </h1>
            {/* Language Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLanguage(language === "vi" ? "en" : "vi")}
              className="ml-2"
            >
              {language === "vi" ? "🇬🇧 EN" : "🇻🇳 VI"}
            </Button>
          </div>
          <p className="text-muted-foreground mt-1">{t.description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <DownloadIcon className="w-4 h-4" />
            {t.exportReport}
          </Button>
          <Button className="gap-2">
            <WalletIcon className="w-4 h-4" />
            {t.requestWithdraw}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FilterIcon className="w-5 h-5" />
            {t.filters}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Period Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t.period}</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="today">{t.today}</SelectItem>
                  <SelectItem value="week">{t.week}</SelectItem>
                  <SelectItem value="month">{t.month}</SelectItem>
                  <SelectItem value="year">{t.year}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t.status}</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="completed">{t.statusCompleted}</SelectItem>
                  <SelectItem value="pending">{t.statusPending}</SelectItem>
                  <SelectItem value="withdrawn">{t.statusWithdrawn}</SelectItem>
                  <SelectItem value="cancelled">{t.statusCancelled}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t.revenueType}</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="appointment">{t.typeAppointment}</SelectItem>
                  <SelectItem value="treatment">{t.typeTreatment}</SelectItem>
                  <SelectItem value="medicine">{t.typeMedicine}</SelectItem>
                  <SelectItem value="other">{t.typeOther}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSignIcon className="w-4 h-4 text-blue-500" />
              {t.totalRevenue}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ⚡ {summary.totalAppointments} {t.transactions}
            </p>
          </CardContent>
        </Card>

        {/* Platform Fee */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCardIcon className="w-4 h-4 text-orange-500" />
              {t.platformFee}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              -{formatCurrency(platformFee)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t.feeRate}</p>
          </CardContent>
        </Card>

        {/* Net Revenue */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <WalletIcon className="w-4 h-4 text-green-500" />
              {t.netRevenue}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(netRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">{t.afterFees}</p>
          </CardContent>
        </Card>

        {/* Growth */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUpIcon className="w-4 h-4 text-purple-500" />
              {t.growth}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              +0.0%
              <ArrowUpIcon className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t.comparedToLastMonth}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <RevenueChart data={revenueData?.monthlyRevenue || []} />

        {/* Revenue by Type */}
        <RevenueByTypeChart revenues={revenueData?.results || []} />
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            {t.recentTransactions}
          </CardTitle>
          <CardDescription>{t.latestPayments}</CardDescription>
        </CardHeader>
        <CardContent>
          {!revenueData?.recentTransactions || revenueData.recentTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t.noData}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.patient}</TableHead>
                    <TableHead>{t.date}</TableHead>
                    <TableHead>{t.type}</TableHead>
                    <TableHead className="text-right">{t.amount}</TableHead>
                    <TableHead className="text-right">{t.fee}</TableHead>
                    <TableHead className="text-right">{t.netAmount}</TableHead>
                    <TableHead>{t.statusLabel}</TableHead>
                    <TableHead className="text-right">{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueData.recentTransactions
                    .filter((transaction: any) => transaction.revenueRecorded) // Chỉ hiển thị transactions có revenue
                    .map((transaction: any) => {
                      // Tính phí nếu không có trong data
                      const platformFee = transaction.platformFee || Math.round(transaction.amount * 0.05);
                      const revenueAmount = transaction.revenueAmount || (transaction.amount - platformFee);
                      
                      return (
                        <TableRow key={transaction._id}>
                          <TableCell className="font-medium">
                            {transaction.patientId?.fullName || "N/A"}
                          </TableCell>
                          <TableCell>{formatDate(transaction.paymentDate || transaction.createdAt)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getTypeLabel(transaction.refId?.appointmentType || "appointment")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                          <TableCell className="text-right text-orange-600">
                            -{formatCurrency(platformFee)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            {formatCurrency(revenueAmount)}
                          </TableCell>
                          <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // Find the corresponding revenue record
                                const revenue = revenueData.results?.find(
                                  (r: RevenueRecord) => r.paymentId?._id === transaction._id
                                );
                                if (revenue) {
                                  handleViewDetails(revenue);
                                }
                              }}
                            >
                              {t.viewDetails}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue Detail Dialog */}
      <RevenueDetailDialog
        revenue={selectedRevenue}
        isOpen={isDetailDialogOpen}
        onClose={() => setIsDetailDialogOpen(false)}
        onUpdate={handleUpdateRevenue}
      />
    </div>
  );
}
