"use client";

import RevenueDetailDialog from "@/components/revenue/RevenueDetailDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useRevenueSocket } from "@/hooks/useRevenueSocket";
import revenueService, { RevenueRecord } from "@/services/revenueService";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CreditCardIcon,
  DollarSignIcon,
  DownloadIcon,
  EyeIcon,
  FilterIcon,
  Loader2Icon,
  ReceiptIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

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
  const [revenueAnimation, setRevenueAnimation] = useState(false);

  // WebSocket connection
  const { isConnected, onNewRevenue, onRevenueUpdated, onSummaryUpdated } = useRevenueSocket();

  // Filters
  const [period, setPeriod] = useState("month");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

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
        statusFilter !== "all" ? { status: statusFilter } : undefined
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
  }, [doctorId, statusFilter, toast]);

  // WebSocket event handlers
  useEffect(() => {
    if (!isConnected) return;

    const handleNewRevenue = (data: { revenue?: { netAmount?: number } }) => {
      setRevenueAnimation(true);
      setTimeout(() => setRevenueAnimation(false), 2000);

      toast({
        title: "💰 Doanh thu mới!",
        description: `Nhận được ${formatCurrency(data.revenue?.netAmount || 0)} từ thanh toán`,
        duration: 5000,
      });

      fetchRevenueData();
    };

    const handleRevenueUpdated = () => {
      fetchRevenueData();
    };

    const handleSummaryUpdated = () => {
      fetchRevenueData();
    };

    onNewRevenue(handleNewRevenue);
    onRevenueUpdated(handleRevenueUpdated);
    onSummaryUpdated(handleSummaryUpdated);
  }, [isConnected, onNewRevenue, onRevenueUpdated, onSummaryUpdated, toast, fetchRevenueData]);

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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { label: "Hoàn thành", className: "bg-green-100 text-green-800" },
      pending: { label: "Chờ xử lý", className: "bg-yellow-100 text-yellow-800" },
      withdrawn: { label: "Đã rút", className: "bg-blue-100 text-blue-800" },
      cancelled: { label: "Đã hủy", className: "bg-red-100 text-red-800" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      appointment: "Lịch khám",
      treatment: "Điều trị",
      medicine: "Thuốc",
      other: "Khác",
    };
    return typeLabels[type] || "Khác";
  };

  const handleViewDetails = (revenue: RevenueRecord) => {
    setSelectedRevenue(revenue);
    setIsDetailDialogOpen(true);
  };

  const handleUpdateRevenue = async (revenueId: string, data: Partial<RevenueRecord>) => {
    try {
      await revenueService.updateRevenue(revenueId, data);
      await fetchRevenueData();
    } catch (error) {
      console.error("Error updating revenue:", error);
    }
  };

  if (loading && !revenueData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2Icon className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Đang tải...</span>
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

  const totalAmount = summary.totalAmount || 0;
  const platformFee = summary.totalPlatformFee || 0;
  const netRevenue = summary.totalRevenue || 0;

  const filteredTransactions = revenueData?.recentTransactions || [];

  const totalPages = Math.ceil(filteredTransactions.length / pageSize);
  const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Doanh thu</h1>
          <p className="text-gray-600 mt-1">Quản lý và theo dõi doanh thu từ các dịch vụ khám chữa bệnh</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Revenue */}
        <Card
          className={`transition-all duration-500 ${revenueAnimation ? "scale-105 shadow-lg ring-2 ring-primary" : ""}`}
        >
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Tổng doanh thu</p>
                <div
                  className={`text-2xl font-bold text-gray-900 transition-all ${revenueAnimation ? "scale-110" : ""}`}
                >
                  {formatCurrency(totalAmount)}
                </div>
                <p className="text-xs text-gray-500 mt-2">{summary.totalAppointments} giao dịch (sau khi trừ phí)</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <DollarSignIcon className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Waiting Revenue */}
        <Card
          className={`transition-all duration-500 ${
            revenueAnimation ? "scale-105 shadow-lg ring-2 ring-yellow-500" : ""
          }`}
        >
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Doanh thu đang chờ</p>
                <div
                  className={`text-2xl font-bold text-yellow-600 transition-all ${revenueAnimation ? "scale-110" : ""}`}
                >
                  {formatCurrency(netRevenue)}
                </div>
                <p className="text-xs text-gray-500 mt-2">Sau khi trừ phí</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <WalletIcon className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Revenue */}
        <Card
          className={`transition-all duration-500 ${
            revenueAnimation ? "scale-105 shadow-lg ring-2 ring-green-500" : ""
          }`}
        >
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Doanh thu thực nhận</p>
                <div
                  className={`text-2xl font-bold text-green-600 transition-all ${revenueAnimation ? "scale-110" : ""}`}
                >
                  {formatCurrency(netRevenue)}
                </div>
                <p className="text-xs text-gray-500 mt-2">Sau khi trừ phí</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <WalletIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Refunds */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Hoàn tiền bệnh nhân</p>
                <div className="text-2xl font-bold text-primary">0</div>
                <p className="text-xs text-gray-500 mt-2">0 giao dịch</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <TrendingUpIcon className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platform Fee */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Phí nền tảng</p>
                <div className="text-2xl font-bold text-orange-600">-{formatCurrency(platformFee)}</div>
                <p className="text-xs text-gray-500 mt-2">5% mỗi giao dịch</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <CreditCardIcon className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ReceiptIcon className="w-5 h-5 text-primary" />
                Giao dịch
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">Danh sách các khoản thanh toán</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" className="gap-2 text-white">
                <DownloadIcon className="w-4 h-4" />
                Xuất báo cáo
              </Button>
              <Button size="sm" className="gap-2 text-white">
                <WalletIcon className="w-4 h-4" />
                Yêu cầu rút tiền
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <ReceiptIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Chưa có dữ liệu</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bệnh nhân</TableHead>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead className="text-right">Số tiền</TableHead>
                      <TableHead className="text-right">Phí</TableHead>
                      <TableHead className="text-right">Thực nhận</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTransactions.map((transaction: Transaction) => {
                      const transactionPlatformFee = transaction.platformFee || Math.round(transaction.amount * 0.05);
                      const revenueAmount = transaction.revenueAmount || transaction.amount - transactionPlatformFee;

                      return (
                        <TableRow key={transaction._id}>
                          <TableCell className="font-medium">{transaction.patientId?.fullName || "N/A"}</TableCell>
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
                            -{formatCurrency(transactionPlatformFee)}
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
                                const revenue = revenueData?.results?.find(
                                  (r: RevenueRecord) => r.paymentId?._id === transaction._id
                                );
                                if (revenue) {
                                  handleViewDetails(revenue);
                                }
                              }}
                              className="gap-2"
                            >
                              <EyeIcon className="w-4 h-4" />
                              Xem
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Hiển thị {(currentPage - 1) * pageSize + 1} -{" "}
                    {Math.min(currentPage * pageSize, filteredTransactions.length)} trong tổng số{" "}
                    {filteredTransactions.length} giao dịch
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                    </Button>
                    <div className="text-sm font-medium px-3">
                      Trang {currentPage} / {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage >= totalPages}
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
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
