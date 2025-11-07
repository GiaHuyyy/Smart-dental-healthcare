"use client";

import paymentService from "@/services/paymentService";
import walletService from "@/services/walletService";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  FileText,
  RefreshCw,
  Search,
  User,
  Wallet,
  XCircle,
  X,
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
  const [startFilterDate, setStartFilterDate] = useState<string>("");
  const [endFilterDate, setEndFilterDate] = useState<string>("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  const fetchWalletBalance = useCallback(async () => {
    const accessToken = (session as any)?.access_token;
    if (!accessToken) return;

    try {
      const result = await walletService.getBalance(accessToken);
      if (result.success && result.data) {
        setWalletBalance(result.data.balance);
      }
    } catch (error) {
      console.error("Failed to fetch wallet balance:", error);
    }
  }, [session]);

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
        const response = await paymentService.getPaymentsByPatient(userId, (session as any)?.access_token);

        if (response.success && response.data) {
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
      fetchWalletBalance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

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

  // Format số tiền với dấu +/- dựa vào billType
  const formatAmountWithSign = (payment: PaymentRecord) => {
    const absAmount = Math.abs(payment.amount);
    const formatted = new Intl.NumberFormat("vi-VN", {
      minimumFractionDigits: 0,
    }).format(absAmount);

    // Chỉ refund là màu xanh (+), còn lại màu đỏ (-)
    if (payment.billType === "refund") {
      return `+${formatted} ₫`;
    }

    return `-${formatted} ₫`;
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
        return "text-primary bg-primary/10";
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
        return "Phí giữ chỗ"; // Đổi từ "Phí hủy lịch" thành "Phí giữ chỗ"
      default:
        return "Thanh toán";
    }
  };

  const getPaymentMethodLabel = (method?: string) => {
    switch (method) {
      case "momo":
        return "Ví MoMo";
      case "wallet_deduction":
        return "Ví điện tử";
      case "cash":
        return "Tiền mặt";
      case "card":
        return "Thẻ tín dụng";
      case "pending":
        return "Chưa thanh toán";
      default:
        return method || "Chưa xác định";
    }
  };

  // Get icon color based on payment status and billType
  const getIconColor = (payment: PaymentRecord) => {
    if (payment.billType === "refund") {
      return "text-primary"; // Hoàn tiền - màu chủ đạo
    }

    switch (payment.status) {
      case "completed":
        return "text-green-600";
      case "pending":
        return "text-yellow-600";
      case "failed":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const handleStatCardClick = (status: string) => {
    setStatusFilter(status);
  };

  const handlePayNow = async (payment: PaymentRecord) => {
    console.log("💳 Opening payment modal for payment:", payment._id);
    setSelectedPayment(payment);
    setShowPaymentModal(true);

    // Fetch wallet balance
    fetchWalletBalance();
  };

  const handleMoMoPayment = async () => {
    if (!selectedPayment) return;

    console.log("💳 ========== MOMO PAYMENT INITIATED ==========");
    console.log("Payment details:", {
      paymentId: selectedPayment._id,
      amount: selectedPayment.amount,
      status: selectedPayment.status,
    });

    const accessToken = (session as { access_token?: string })?.access_token;
    if (!accessToken) {
      toast.error("Phiên đăng nhập không hợp lệ");
      return;
    }

    const amountToPay = Math.abs(selectedPayment.amount);
    const loadingToast = toast.loading("Đang tạo yêu cầu thanh toán...", {
      description: `Thanh toán ${formatCurrency(amountToPay)} qua MoMo`,
    });

    try {
      const response = await paymentService.createMoMoPaymentFromExisting(selectedPayment._id, accessToken);

      if (response.success && response.data?.payUrl) {
        toast.success("Chuyển đến cổng thanh toán");
        setShowPaymentModal(false);

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
      toast.error("Có lỗi xảy ra");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const handleWalletPayment = async () => {
    if (!selectedPayment) return;

    console.log("💰 ========== WALLET PAYMENT FOR PENDING BILL ==========");
    console.log("Bill details:", {
      billId: selectedPayment._id,
      amount: selectedPayment.amount,
      status: selectedPayment.status,
    });

    const accessToken = (session as { access_token?: string })?.access_token;
    if (!accessToken) {
      toast.error("Phiên đăng nhập không hợp lệ");
      return;
    }

    // Check wallet balance (amount is negative, so use Math.abs)
    const amountToPay = Math.abs(selectedPayment.amount);
    if (walletBalance < amountToPay) {
      toast.error("Số dư ví không đủ", {
        description: `Cần: ${formatCurrency(amountToPay)}, Có: ${formatCurrency(walletBalance)}`,
      });
      return;
    }

    const loadingToast = toast.loading("Đang xử lý thanh toán...");

    try {
      // Use new API to pay existing pending bill (update bill, not create new one)
      console.log("🔵 Calling payPendingBill API...");
      const result = await walletService.payPendingBill(accessToken, selectedPayment._id);

      if (result.success) {
        toast.dismiss(loadingToast);
        toast.success(`Thanh toán thành công! Số dư mới: ${result.data?.newBalance?.toLocaleString("vi-VN")}đ`);
        setShowPaymentModal(false);

        // Update wallet balance
        if (result.data?.newBalance !== undefined) {
          setWalletBalance(result.data.newBalance);
        } else {
          // Fallback: fetch wallet balance again
          fetchWalletBalance();
        }

        // Refresh payments list
        console.log("🔄 Refreshing payments list...");
        fetchPayments(false);
      } else {
        toast.dismiss(loadingToast);
        toast.error(result.error || "Thanh toán thất bại");
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("❌ Wallet payment error:", error);
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra");
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

    // Fix filter logic:
    // - "refunded" filter should match billType "refund"
    // - "completed" filter should NOT include refunds (only charges/payments)
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "refunded" && payment.billType === "refund") ||
      (statusFilter === "completed" && payment.status === "completed" && payment.billType !== "refund") ||
      (statusFilter !== "refunded" && statusFilter !== "completed" && payment.status === statusFilter);

    // Filter by date range
    let matchesDate = true;
    if (startFilterDate && endFilterDate) {
      // Both dates selected - filter by range
      const paymentDate = new Date(payment.createdAt);
      const start = new Date(startFilterDate);
      const end = new Date(endFilterDate);

      // Set time to start/end of day for comparison
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      paymentDate.setHours(0, 0, 0, 0);

      matchesDate = paymentDate >= start && paymentDate <= end;
    } else if (startFilterDate) {
      // Only start date - filter by single date
      const paymentDate = new Date(payment.createdAt);
      const filterDate = new Date(startFilterDate);

      matchesDate =
        paymentDate.getFullYear() === filterDate.getFullYear() &&
        paymentDate.getMonth() === filterDate.getMonth() &&
        paymentDate.getDate() === filterDate.getDate();
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const stats = {
    total: payments.length,
    completed: payments.filter((p) => p.status === "completed" && p.billType !== "refund").length,
    pending: payments.filter((p) => p.status === "pending").length,
    totalAmount: payments.filter((p) => p.status === "completed").reduce((sum, p) => sum + p.amount, 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Đang tải lịch sử thanh toán...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-3 bg-primary rounded-2xl shadow-lg">
                <Wallet className="w-8 h-8 text-white" />
              </div>
              Lịch sử thanh toán
            </h1>
            <p className="text-gray-600 mt-2">Quản lý và theo dõi các giao dịch của bạn</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <button
            onClick={() => handleStatCardClick("all")}
            className={`bg-white rounded-lg p-4 border-2 transition-all hover:shadow-md text-left ${
              statusFilter === "all" ? "border-primary shadow-md" : "border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng giao dịch</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
            </div>
          </button>

          <button
            onClick={() => handleStatCardClick("pending")}
            className={`bg-white rounded-lg p-4 border-2 transition-all hover:shadow-md text-left ${
              statusFilter === "pending" ? "border-yellow-500 shadow-md" : "border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Chờ thanh toán</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </button>

          <button
            onClick={() => handleStatCardClick("completed")}
            className={`bg-white rounded-lg p-4 border-2 transition-all hover:shadow-md text-left ${
              statusFilter === "completed" ? "border-green-500 shadow-md" : "border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đã thanh toán</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </button>

          <button
            onClick={() => handleStatCardClick("refunded")}
            className={`bg-white rounded-lg p-4 border-2 transition-all hover:shadow-md text-left ${
              statusFilter === "refunded" ? "border-primary shadow-md" : "border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đã hoàn tiền</p>
                <p className="text-2xl font-bold text-primary">
                  {payments.filter((p) => p.billType === "refund").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-primary" />
              </div>
            </div>
          </button>

          {/* Wallet Balance Card */}
          <button
            onClick={() => handleStatCardClick("all")}
            className="bg-white rounded-lg p-4 border-2 border-gray-200 transition-all hover:shadow-md text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Số dư ví</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(walletBalance)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Wallet className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
          <div className="flex flex-col lg:flex-row items-center gap-4">
            {/* Search */}
            <div className="flex-1 w-full relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo bác sĩ, loại khám, mã giao dịch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Date Range Filter */}
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Từ</span>
            <input
              type="date"
              value={startFilterDate}
              onChange={(e) => setStartFilterDate(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors"
            />
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">đến</span>
            <input
              type="date"
              value={endFilterDate}
              onChange={(e) => setEndFilterDate(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors"
            />
            <button
              onClick={() => {
                setStartFilterDate("");
                setEndFilterDate("");
                setSearchTerm("");
              }}
              disabled={!startFilterDate && !endFilterDate && !searchTerm}
              className="px-4 py-3 text-sm bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              Xóa
            </button>
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
                  bên dưới để thanh toán qua Ví.
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
                            <div
                              className={`p-3 rounded-xl ${
                                payment.billType === "refund"
                                  ? "bg-primary/10"
                                  : payment.status === "completed"
                                  ? "bg-green-50"
                                  : payment.status === "pending"
                                  ? "bg-yellow-50"
                                  : payment.status === "failed"
                                  ? "bg-red-50"
                                  : "bg-gray-50"
                              }`}
                            >
                              <FileText className={`w-6 h-6 ${getIconColor(payment)}`} />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-900">
                                {payment.billType === "refund"
                                  ? "Hoàn tiền khám"
                                  : appointment?.appointmentType || "Thanh toán"}
                              </h3>
                              {payment.billType === "refund" ? (
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg mt-1 bg-primary/10 text-primary">
                                  <CheckCircle className="w-4 h-4" />
                                  <span className="text-sm font-semibold">Đã hoàn tiền</span>
                                </div>
                              ) : (
                                <div
                                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg mt-1 ${getStatusColor(
                                    payment.status
                                  )}`}
                                >
                                  {getStatusIcon(payment.status)}
                                  <span className="text-sm font-semibold">{getStatusText(payment.status)}</span>
                                </div>
                              )}
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

                          {payment.paymentMethod && (
                            <div className="flex items-center gap-3 text-gray-700">
                              <Wallet className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="text-xs text-gray-500">Phương thức</p>
                                <p className="font-medium">{getPaymentMethodLabel(payment.paymentMethod)}</p>
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
                                    payment.billType === "refund" ? "text-primary" : "text-red-600"
                                  }`}
                                >
                                  {getBillTypeLabel(payment.billType)}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Thời gian tạo bill - always show */}
                          <div className="flex items-center gap-3 text-gray-700">
                            <Clock className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">Thời gian tạo</p>
                              <p className="font-medium">{formatDateTime(payment.createdAt)}</p>
                            </div>
                          </div>

                          {/* Thời gian thanh toán - only show if not pending */}
                          {payment.status !== "pending" && (
                            <div className="flex items-center gap-3 text-gray-700">
                              <CheckCircle className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="text-xs text-gray-500">Đã thanh toán</p>
                                <p className="font-medium">{formatDateTime(payment.updatedAt)}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Amount & Action */}
                      <div className="lg:w-72 flex flex-col items-center justify-center gap-4 p-6 bg-gradient-to-br from-gray-50 to-primary/5 rounded-xl border-2 border-gray-100">
                        <div className="text-center">
                          <p className="text-sm text-gray-600 font-medium mb-1">Số tiền</p>
                          <p
                            className={`text-3xl font-bold ${
                              payment.billType === "refund" ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {formatAmountWithSign(payment)}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        {payment.status === "pending" && (
                          <button
                            onClick={() => handlePayNow(payment)}
                            className="w-full px-6 py-4 text-white bg-primary rounded-xl hover:from-primary/90 transition-all hover:to-primary/80 font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
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
                            <div className="inline-flex items-center gap-2 px-6 py-3 bg-primary/10 rounded-xl border-2 border-primary/30">
                              <RefreshCw className="w-5 h-5 text-primary" />
                              <span className="font-semibold text-primary">Đã hoàn tiền</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment Method Selection Modal */}
      {showPaymentModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Chọn phương thức thanh toán</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Amount */}
            <div className="px-6 py-4 bg-gradient-to-br from-primary/10 to-purple-50 border-b border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Số tiền cần thanh toán</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(Math.abs(selectedPayment.amount))}</p>
            </div>

            {/* Payment Options */}
            <div className="px-6 py-6 space-y-3">
              {/* Wallet Payment */}
              <button
                onClick={handleWalletPayment}
                disabled={walletBalance < Math.abs(selectedPayment.amount)}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  walletBalance < Math.abs(selectedPayment.amount)
                    ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                    : "border-purple-300 hover:border-purple-500 hover:bg-purple-50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      walletBalance < Math.abs(selectedPayment.amount) ? "bg-gray-400" : "bg-purple-600"
                    }`}
                  >
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Thanh toán bằng ví</p>
                    <p className="text-sm text-gray-600">Số dư: {formatCurrency(walletBalance)}</p>
                    {walletBalance < Math.abs(selectedPayment.amount) && (
                      <p className="text-xs text-red-600 mt-1">Số dư không đủ</p>
                    )}
                  </div>
                  {walletBalance >= Math.abs(selectedPayment.amount) && (
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                  )}
                </div>
              </button>

              {/* MoMo Payment */}
              <button
                onClick={handleMoMoPayment}
                className="w-full p-4 rounded-xl border-2 border-pink-300 hover:border-pink-500 hover:bg-pink-50 transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-pink-600 rounded-lg flex items-center justify-center text-white text-xl font-bold">
                    M
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Thanh toán bằng MoMo</p>
                    <p className="text-sm text-gray-600">Ví điện tử MoMo</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-pink-600" />
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
              <p className="text-xs text-gray-600 text-center">Vui lòng chọn phương thức thanh toán phù hợp</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
