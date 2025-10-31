"use client";

import paymentService from "@/services/paymentService";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Filter,
  RefreshCw,
  Search,
  TrendingUp,
  User,
  Wallet,
  XCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// Backend Payment Response Types
interface Doctor {
  _id: string;
  fullName: string;
  email?: string;
  specialty?: string;
  specialization?: string;
}

interface Appointment {
  _id: string;
  appointmentType: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  consultationFee?: number;
  status: string;
  paymentStatus?: "unpaid" | "paid" | "refunded";
  doctorId?: Doctor;
}

interface PaymentRecord {
  _id: string;
  patientId: {
    _id: string;
    fullName: string;
    email: string;
  };
  doctorId: Doctor | string;
  refId: Appointment | string;
  amount: number;
  status: "pending" | "completed" | "failed" | "refunded";
  type: "appointment" | "treatment" | "medicine" | "other";
  billType?: "consultation_fee" | "refund" | "reservation_fee" | "cancellation_charge";
  paymentMethod?: string;
  paymentDate?: string;
  transactionId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function PatientPayments() {
  const { data: session } = useSession();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchPayments = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);

        const userId = (session as any)?.user?._id;
        if (!userId) {
          console.error("❌ User ID not found in session");
          setLoading(false);
          return;
        }

        console.log("🔄 Fetching payments for user:", userId);
        const response = await paymentService.getPaymentsByPatient(userId, (session as any)?.access_token);

        if (response.success && response.data) {
          console.log("✅ Payments loaded:", response.data.length, "records");
          // Normalize backend payment objects to PaymentRecord[] expected by this UI
          const normalized: PaymentRecord[] = (response.data as any[]).map((p) => {
            const sessionUser = (session as any)?.user;

            const patientObj =
              typeof p.patientId === "string"
                ? {
                    _id: p.patientId,
                    fullName: sessionUser?.fullName || sessionUser?.name || "",
                    email: sessionUser?.email || "",
                  }
                : p.patientId || { _id: "", fullName: "", email: "" };

            return {
              _id: p._id,
              patientId: patientObj,
              doctorId: p.doctorId,
              refId: p.refId,
              amount: p.amount,
              status: p.status,
              type: p.type,
              billType: p.billType,
              paymentMethod: p.paymentMethod,
              paymentDate: p.paymentDate,
              transactionId: p.transactionId,
              notes: p.notes,
              createdAt: p.createdAt,
              updatedAt: p.updatedAt,
            } as PaymentRecord;
          });

          setPayments(normalized);
        } else {
          console.error("❌ Failed to fetch payments:", response.message);
          setPayments([]);
        }
      } catch (error) {
        console.error("❌ Error fetching payments:", error);
        setPayments([]);
      } finally {
        setLoading(false);
      }
    },
    [session]
  );

  useEffect(() => {
    if (session) {
      fetchPayments();
    }
  }, [session, fetchPayments]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && session) {
        console.log("🔄 Page became visible, refreshing payments...");
        fetchPayments();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [session, fetchPayments]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format số tiền với dấu +/- dựa vào billType HOẶC giá trị amount
  const formatAmountWithSign = (payment: PaymentRecord) => {
    const amount = payment.amount;
    const absAmount = Math.abs(amount);
    const formatted = new Intl.NumberFormat("vi-VN", {
      minimumFractionDigits: 0,
    }).format(absAmount);

    // Nếu amount là số âm → bill trừ tiền (màu đỏ)
    if (amount < 0) {
      return `-${formatted} ₫`;
    }

    // Bills MoMo/Wallet luôn là trừ tiền (màu đỏ)
    if (
      payment.paymentMethod === "momo" ||
      payment.paymentMethod === "wallet" ||
      payment.paymentMethod === "wallet_deduction"
    ) {
      return `-${formatted} ₫`;
    }

    // Bill hoàn tiền thì thêm dấu +
    if (payment.billType === "refund") {
      return `+${formatted} ₫`;
    }

    // Bill trừ phí (cancellation_charge, reservation_fee) thì thêm dấu -
    if (payment.billType === "cancellation_charge" || payment.billType === "reservation_fee") {
      return `-${formatted} ₫`;
    }

    // Mặc định không có dấu
    return `${formatted} ₫`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5" />;
      case "pending":
        return <Clock className="w-5 h-5" />;
      case "failed":
        return <XCircle className="w-5 h-5" />;
      case "refunded":
        return <RefreshCw className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Đã thanh toán";
      case "pending":
        return "Chờ thanh toán";
      case "failed":
        return "Thất bại";
      case "refunded":
        return "Đã hoàn tiền";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-50";
      case "pending":
        return "text-yellow-600 bg-yellow-50";
      case "failed":
        return "text-red-600 bg-red-50";
      case "refunded":
        return "text-blue-600 bg-blue-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getBillTypeLabel = (billType?: string) => {
    switch (billType) {
      case "consultation_fee":
        return "Phí khám";
      case "refund":
        return "Hoàn tiền";
      case "reservation_fee":
        return "Phí giữ chỗ";
      case "cancellation_charge":
        return "Phí hủy lịch";
      default:
        return "Thanh toán";
    }
  };

  const handlePayNow = async (payment: PaymentRecord) => {
    console.log("💳 ========== PAYMENT INITIATED FROM PAYMENTS PAGE ==========");
    console.log("Payment details:", {
      paymentId: payment._id,
      amount: payment.amount,
      status: payment.status,
    });

    if (!session) {
      toast.error("Vui lòng đăng nhập", {
        description: "Bạn cần đăng nhập để thực hiện thanh toán",
      });
      return;
    }

    const sessionUser = (session as any)?.user;
    const accessToken = (session as any)?.access_token || (session as any)?.accessToken;

    if (!accessToken) {
      toast.error("Phiên đăng nhập không hợp lệ", {
        description: "Vui lòng đăng xuất và đăng nhập lại",
      });
      return;
    }

    const loadingToast = toast.loading("Đang tạo yêu cầu thanh toán...", {
      description: `Thanh toán ${formatCurrency(payment.amount)} qua MoMo`,
    });

    try {
      // Sử dụng API mới để tạo MoMo payment từ payment đã tồn tại
      const response = await paymentService.createMoMoPaymentFromExisting(payment._id, accessToken);

      if (response.success && response.data?.payUrl) {
        toast.success("Chuyển đến cổng thanh toán", {
          description: "Bạn sẽ được chuyển đến trang thanh toán MoMo...",
          duration: 2000,
        });

        const payUrl = response.data!.payUrl;
        setTimeout(() => {
          window.location.href = payUrl;
        }, 1000);
      } else {
        toast.error("Không thể tạo thanh toán", {
          description: response.message || "Vui lòng thử lại sau",
        });
      }
    } catch (error) {
      console.error("❌ Payment error:", error);
      toast.error("Có lỗi xảy ra", {
        description: "Không thể tạo yêu cầu thanh toán. Vui lòng thử lại",
      });
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const filteredPayments = payments.filter((payment) => {
    // Cho phép hiển thị cả những bill không có refId/doctorId (như refund, cancellation_charge)
    const appointment = typeof payment.refId === "object" ? payment.refId : null;
    const doctor = typeof payment.doctorId === "object" ? payment.doctorId : null;

    const doctorName = appointment?.doctorId?.fullName || doctor?.fullName || "";
    const appointmentType = appointment?.appointmentType || "";
    const transactionId = payment.transactionId || "";
    const notes = payment.notes || "";

    const matchesSearch =
      searchTerm === "" || // Nếu không có search term thì match all
      doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointmentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notes.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: payments.length,
    completed: payments.filter((p) => p.status === "completed").length,
    pending: payments.filter((p) => p.status === "pending").length,
    totalAmount: payments.filter((p) => p.status === "completed").reduce((sum, p) => sum + p.amount, 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Đang tải lịch sử thanh toán...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                <Wallet className="w-8 h-8 text-white" />
              </div>
              Lịch sử thanh toán
            </h1>
            <p className="text-gray-600 mt-2">Quản lý và theo dõi các giao dịch của bạn</p>
          </div>
          <button
            onClick={() => fetchPayments(false)}
            disabled={loading}
            className="px-6 py-3 bg-white border-2 border-blue-200 text-blue-600 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-shadow border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Tổng giao dịch</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl">
                <CreditCard className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-shadow border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Đã thanh toán</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.completed}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-2xl">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-shadow border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Chờ thanh toán</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pending}</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-2xl">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 shadow-md hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-100 font-medium">Tổng chi tiêu</p>
                <p className="text-2xl font-bold text-white mt-2">{formatCurrency(stats.totalAmount)}</p>
              </div>
              <div className="p-4 bg-white/20 rounded-2xl">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo bác sĩ, loại khám, mã giao dịch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 transition-colors"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-12 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 transition-colors appearance-none bg-white font-medium min-w-[200px]"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Chờ thanh toán</option>
                <option value="completed">Đã thanh toán</option>
                <option value="failed">Thất bại</option>
                <option value="refunded">Đã hoàn tiền</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pending Payments Alert */}
        {stats.pending > 0 && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl p-6 shadow-md">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-yellow-900 text-lg mb-1">Bạn có {stats.pending} thanh toán chờ xử lý</h3>
                <p className="text-yellow-800">
                  Vui lòng hoàn tất thanh toán để xác nhận lịch hẹn. Click vào nút <strong>"Thanh toán ngay"</strong>{" "}
                  bên dưới để thanh toán qua MoMo.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payments List */}
        {filteredPayments.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-md border border-gray-100">
            <div className="max-w-md mx-auto">
              <div className="p-6 bg-gray-50 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <CreditCard className="w-12 h-12 text-gray-300" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Chưa có giao dịch nào</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== "all"
                  ? "Không tìm thấy giao dịch phù hợp với tiêu chí tìm kiếm"
                  : "Bạn chưa có giao dịch thanh toán nào"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPayments.map((payment) => {
              const appointment = typeof payment.refId === "object" ? payment.refId : null;
              const doctor = typeof payment.doctorId === "object" ? payment.doctorId : null;
              const appointmentDoctor = appointment?.doctorId;
              const displayDoctor = appointmentDoctor || doctor;

              return (
                <div
                  key={payment._id}
                  className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all border border-gray-100 overflow-hidden group"
                >
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                      {/* Left: Payment Info */}
                      <div className="flex-1 space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-50 rounded-xl">
                              <FileText className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-900">
                                {appointment?.appointmentType || "Thanh toán"}
                              </h3>
                              <div
                                className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg mt-1 ${getStatusColor(
                                  payment.status
                                )}`}
                              >
                                {getStatusIcon(payment.status)}
                                <span className="text-sm font-semibold">{getStatusText(payment.status)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-center gap-3 text-gray-700">
                            <User className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">Bác sĩ</p>
                              <p className="font-medium">BS. {displayDoctor?.fullName || "Đang tải..."}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-gray-700">
                            <Building2 className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">Chuyên khoa</p>
                              <p className="font-medium">
                                {displayDoctor?.specialization || displayDoctor?.specialty || "Nha khoa"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-gray-700">
                            <Calendar className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">Ngày khám</p>
                              <p className="font-medium">
                                {appointment?.appointmentDate
                                  ? formatDate(appointment.appointmentDate)
                                  : formatDate(payment.createdAt)}
                              </p>
                            </div>
                          </div>

                          {appointment?.startTime && (
                            <div className="flex items-center gap-3 text-gray-700">
                              <Clock className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="text-xs text-gray-500">Giờ khám</p>
                                <p className="font-medium">{appointment.startTime}</p>
                              </div>
                            </div>
                          )}

                          {payment.billType && (
                            <div className="flex items-center gap-3 text-gray-700">
                              <FileText className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="text-xs text-gray-500">Loại giao dịch</p>
                                <p
                                  className={`font-medium ${
                                    payment.billType === "refund"
                                      ? "text-green-600"
                                      : payment.billType === "cancellation_charge" ||
                                        payment.billType === "reservation_fee"
                                      ? "text-red-600"
                                      : "text-blue-600"
                                  }`}
                                >
                                  {getBillTypeLabel(payment.billType)}
                                </p>
                              </div>
                            </div>
                          )}

                          {payment.transactionId && (
                            <div className="flex items-center gap-3 text-gray-700 md:col-span-2">
                              <CreditCard className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="text-xs text-gray-500">Mã giao dịch</p>
                                <p className="font-mono text-sm font-medium">{payment.transactionId}</p>
                              </div>
                            </div>
                          )}

                          {payment.paymentDate && (
                            <div className="flex items-center gap-3 text-gray-700 md:col-span-2">
                              <CheckCircle className="w-5 h-5 text-green-500" />
                              <div>
                                <p className="text-xs text-gray-500">Thời gian thanh toán</p>
                                <p className="font-medium">{formatDateTime(payment.paymentDate)}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Amount & Action */}
                      <div className="lg:w-72 flex flex-col items-center justify-center gap-4 p-6 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-gray-100">
                        <div className="text-center">
                          <p className="text-sm text-gray-600 font-medium mb-1">Số tiền</p>
                          <p
                            className={`text-3xl font-bold ${
                              payment.amount < 0 ||
                              payment.paymentMethod === "momo" ||
                              payment.paymentMethod === "wallet" ||
                              payment.paymentMethod === "wallet_deduction" ||
                              payment.billType === "cancellation_charge" ||
                              payment.billType === "reservation_fee"
                                ? "text-red-600"
                                : payment.billType === "refund"
                                ? "text-green-600"
                                : "bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent"
                            }`}
                          >
                            {formatAmountWithSign(payment)}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        {payment.status === "pending" && (
                          <button
                            onClick={() => handlePayNow(payment)}
                            className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
                          >
                            <Wallet className="w-5 h-5" />
                            Thanh toán ngay
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                          </button>
                        )}

                        {payment.status === "failed" && (
                          <button
                            onClick={() => handlePayNow(payment)}
                            className="w-full px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                          >
                            <RefreshCw className="w-5 h-5" />
                            Thử lại thanh toán
                          </button>
                        )}

                        {payment.status === "completed" && (
                          <div className="w-full text-center">
                            <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-50 rounded-xl border-2 border-green-200">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              <span className="font-semibold text-green-700">Đã hoàn tất</span>
                            </div>
                          </div>
                        )}

                        {payment.status === "refunded" && (
                          <div className="w-full text-center">
                            <div className="inline-flex items-center gap-2 px-6 py-3 bg-blue-50 rounded-xl border-2 border-blue-200">
                              <RefreshCw className="w-5 h-5 text-blue-600" />
                              <span className="font-semibold text-blue-700">Đã hoàn tiền</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer - Payment Method */}
                  {payment.paymentMethod && (
                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <DollarSign className="w-4 h-4" />
                        <span>Phương thức: </span>
                        <span className="font-medium text-gray-900">
                          {payment.paymentMethod === "momo"
                            ? "Ví MoMo"
                            : payment.paymentMethod === "cash"
                            ? "Tiền mặt"
                            : payment.paymentMethod === "card"
                            ? "Thẻ tín dụng"
                            : payment.paymentMethod}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
