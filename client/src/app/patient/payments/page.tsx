"use client";

import paymentService from "@/services/paymentService";
import walletService from "@/services/walletService";
import { usePaymentSocket } from "@/hooks/usePaymentSocket";
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
  TrendingUp,
  DollarSignIcon,
  DollarSign,
  Plus,
  Minus,
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

interface Transaction {
  _id: string;
  amount: number;
  createdAt: string;
  status: string;
  type: string;
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

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Wallet modal states
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletTransactions, setWalletTransactions] = useState<Transaction[]>([]);
  const [walletStats, setWalletStats] = useState({
    totalTopUp: 0,
    successfulTransactions: 0,
  });

  // Top-up states
  const [showTopUpForm, setShowTopUpForm] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpLoading, setTopUpLoading] = useState(false);

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

  // 🔔 Realtime payment updates via WebSocket
  const { isConnected, onNewPayment, onPaymentUpdate, onPaymentDelete } = usePaymentSocket();

  useEffect(() => {
    if (!isConnected) return;

    // Listen for new payment events
    const cleanupNew = onNewPayment((payment) => {
      console.log("🔔 New payment received:", payment);

      // Add to payments list
      setPayments((prev) => {
        // Check if payment already exists to avoid duplicates
        const exists = prev.some((p) => p._id === payment._id);
        if (exists) return prev;

        // Normalize payment structure
        const sessionUser = (session as { user?: { fullName?: string; name?: string; email?: string } })?.user;
        const normalized: PaymentRecord = {
          ...payment,
          patientId:
            typeof payment.patientId === "string"
              ? {
                  _id: payment.patientId,
                  fullName: sessionUser?.fullName || sessionUser?.name || "",
                  email: sessionUser?.email || "",
                }
              : payment.patientId,
        } as PaymentRecord;

        return [normalized, ...prev];
      });
    });

    // Listen for payment update events
    const cleanupUpdate = onPaymentUpdate((payment) => {
      console.log("🔔 Payment updated:", payment);

      setPayments((prev) =>
        prev.map((p) => {
          if (p._id === payment._id) {
            const sessionUser = (session as { user?: { fullName?: string; name?: string; email?: string } })?.user;
            return {
              ...payment,
              patientId:
                typeof payment.patientId === "string"
                  ? {
                      _id: payment.patientId,
                      fullName: sessionUser?.fullName || sessionUser?.name || "",
                      email: sessionUser?.email || "",
                    }
                  : payment.patientId,
            } as PaymentRecord;
          }
          return p;
        })
      );
    });

    // Listen for payment delete events
    const cleanupDelete = onPaymentDelete((paymentId) => {
      console.log("🔔 Payment deleted:", paymentId);

      setPayments((prev) => {
        return prev.filter((p) => p._id !== paymentId);
      });
    });

    // Cleanup listeners on unmount
    return () => {
      cleanupNew();
      cleanupUpdate();
      cleanupDelete();
    };
  }, [isConnected, onNewPayment, onPaymentUpdate, onPaymentDelete, session, fetchWalletBalance]);

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

  // Calculate stats with proper logic (similar to revenue page)
  const allPayments = payments;

  // Completed payments (charges/fees) - NOT including refunds
  const completedCharges = allPayments.filter((p) => p.status === "completed" && p.billType !== "refund");
  const completedTotal = completedCharges.reduce((sum, p) => sum + p.amount, 0);

  // Pending payments (bills chờ thanh toán)
  const pendingPayments = allPayments.filter((p) => p.status === "pending");
  const pendingTotal = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

  // Refunded payments (bills hoàn tiền)
  const refundedPayments = allPayments.filter((p) => p.billType === "refund");
  const refundedTotal = Math.abs(refundedPayments.reduce((sum, p) => sum + p.amount, 0));

  // Total spending = completed charges + pending (NOT including refunds)
  const totalSpending = completedTotal + pendingTotal + refundedTotal;

  const stats = {
    totalSpending,
    completedTotal,
    completedCount: completedCharges.length,
    pendingTotal,
    pendingCount: pendingPayments.length,
    refundedTotal,
    refundedCount: refundedPayments.length,
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, startFilterDate, endFilterDate]);

  // Handle wallet modal
  const handleWalletModalOpen = async () => {
    setShowWalletModal(true);
    setShowTopUpForm(false); // Reset form state
    const accessToken = (session as any)?.access_token;
    if (!accessToken) return;

    try {
      // Fetch both balance and history
      const [balanceRes, historyRes, statsRes] = await Promise.all([
        walletService.getBalance(accessToken),
        walletService.getHistory(accessToken),
        walletService.getStats(accessToken),
      ]);

      if (balanceRes.success) {
        setWalletBalance(balanceRes.data.balance);
      }

      if (historyRes.success) {
        setWalletTransactions(historyRes.data.transactions);
      }

      if (statsRes.success) {
        setWalletStats({
          totalTopUp: statsRes.data.totalTopUp,
          successfulTransactions: statsRes.data.successfulTransactions,
        });
      }
    } catch (error) {
      console.error("Error fetching wallet data:", error);
      toast.error("Không thể tải thông tin ví");
    }
  };

  // Handle top-up
  const handleTopUp = async () => {
    if (!topUpAmount || parseFloat(topUpAmount) < 10000) {
      toast.error("Số tiền nạp tối thiểu là 10,000 VNĐ");
      return;
    }

    const accessToken = (session as any)?.access_token;
    if (!accessToken) {
      toast.error("Vui lòng đăng nhập để nạp tiền");
      return;
    }

    setTopUpLoading(true);
    try {
      toast.info("Đang tạo yêu cầu nạp tiền...");

      const amount = parseFloat(topUpAmount);
      const response = await walletService.topUp(accessToken, {
        amount: amount,
        paymentMethod: "momo",
        description: `Nạp ${amount.toLocaleString("vi-VN")} VNĐ vào ví`,
      });

      if (response.success && response.data?.payUrl) {
        // Store payment info for callback
        const orderId = response.data.orderId;
        const userId = (session as any)?.user?._id;

        sessionStorage.setItem(
          `momo_payment_${orderId}`,
          JSON.stringify({
            userId,
            amount: amount,
            paymentMethod: "momo",
            description: `Nạp ${amount.toLocaleString("vi-VN")} VNĐ vào ví`,
          })
        );

        // Open MoMo in new tab
        window.open(response.data.payUrl, "_blank");

        // Reset form and close
        setTopUpAmount("");
        setShowTopUpForm(false);
        setTopUpLoading(false);
        toast.success("Đã mở trang thanh toán MoMo");

        // Refresh wallet data after a delay
        setTimeout(async () => {
          await fetchWalletBalance();
          await handleWalletModalOpen();
          toast.success("Số dư đã được cập nhật");
        }, 3000);
      } else if (response.success && response.data?.deeplinkMiniApp) {
        // Redirect to MiniApp
        window.location.href = response.data.deeplinkMiniApp;
      } else {
        toast.error("Không thể tạo yêu cầu thanh toán");
        setTopUpLoading(false);
      }
    } catch (error) {
      console.error("Error topping up:", error);
      toast.error("Có lỗi xảy ra khi nạp tiền");
      setTopUpLoading(false);
    }
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Header with Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="space-y-4">
            {/* Title Row */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Lịch sử thanh toán</h1>
                <p className="text-sm text-gray-600">Quản lý và theo dõi các giao dịch của bạn</p>
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col lg:flex-row items-center gap-4">
              {/* Search */}
              <div className="flex-1 w-full relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo bác sĩ, loại khám, mã giao dịch..."
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

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            {/* Card 1: Tổng chi tiêu */}
            <button
              onClick={() => handleStatCardClick("all")}
              className={`bg-white rounded-lg p-4 border-2 transition-all hover:shadow-md text-left ${
                statusFilter === "all" ? "border-red-500 shadow-md" : "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">Tổng chi tiêu</p>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalSpending)}</div>
                  <p className="text-xs text-gray-500 mt-2">{stats.completedCount + stats.pendingCount} giao dịch</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <DollarSignIcon className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </button>

            {/* Card 2: Chờ thanh toán */}
            <button
              onClick={() => handleStatCardClick("pending")}
              className={`bg-white rounded-lg p-4 border-2 transition-all hover:shadow-md text-left ${
                statusFilter === "pending" ? "border-yellow-500 shadow-md" : "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">Chờ thanh toán</p>
                  <div className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pendingTotal)}</div>
                  <p className="text-xs text-gray-500 mt-2">{stats.pendingCount} giao dịch</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </button>

            {/* Card 3: Đã thanh toán */}
            <button
              onClick={() => handleStatCardClick("completed")}
              className={`bg-white rounded-lg p-4 border-2 transition-all hover:shadow-md text-left ${
                statusFilter === "completed" ? "border-green-500 shadow-md" : "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">Đã thanh toán</p>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.completedTotal)}</div>
                  <p className="text-xs text-gray-500 mt-2">{stats.completedCount} giao dịch</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </button>

            {/* Card 4: Đã hoàn tiền */}
            <button
              onClick={() => handleStatCardClick("refunded")}
              className={`bg-white rounded-lg p-4 border-2 transition-all hover:shadow-md text-left ${
                statusFilter === "refunded" ? "border-primary shadow-md" : "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">Đã hoàn tiền</p>
                  <div className="text-2xl font-bold text-primary">+{formatCurrency(stats.refundedTotal)}</div>
                  <p className="text-xs text-gray-500 mt-2">{stats.refundedCount} giao dịch</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-primary" />
                </div>
              </div>
            </button>

            {/* Wallet Balance Card */}
            <button
              onClick={handleWalletModalOpen}
              className="bg-white rounded-lg p-4 border-2 border-gray-200 transition-all hover:shadow-md text-left"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ví của tôi</p>
                  <p className="text-2xl font-bold bg-linear-to-br from-purple-500 to-pink-500 text-transparent bg-clip-text">
                    {formatCurrency(walletBalance)}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Nhấp để xem chi tiết ví
                  </p>
                </div>
                <div className="w-12 h-12 bg-linear-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
              </div>
            </button>
          </div>

          {/* Pending Payments Alert */}
          {stats.pendingCount > 0 && (
            <div className="bg-linear-to-r mb-6 from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl p-6 shadow-md">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-yellow-100 rounded-xl">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-yellow-900 text-lg mb-1">
                    Bạn có {stats.pendingCount} thanh toán chờ xử lý
                  </h3>
                  <p className="text-yellow-800">
                    Vui lòng hoàn tất thanh toán để xác nhận lịch hẹn. Click vào nút{" "}
                    <strong>&quot;Thanh toán ngay&quot;</strong> bên dưới để thanh toán qua Ví.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pagination Controls - Above List */}
          {!loading && filteredPayments.length > 0 && totalPages > 1 && (
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Hiển thị {startIndex + 1} - {Math.min(endIndex, filteredPayments.length)} trong tổng số{" "}
                  {filteredPayments.length} giao dịch
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
                      // Show first page, last page, current page, and pages around current
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
              {paginatedPayments.map((payment) => {
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
                                <DollarSign className={`w-6 h-6 ${getIconColor(payment)}`} />
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
                        <div className="lg:w-72 flex flex-col items-center justify-center gap-4 p-6 bg-linear-to-br from-gray-50 to-primary/5 rounded-xl border-2 border-gray-100">
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
                              className="w-full px-6 py-4 bg-linear-to-r mb-6 from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
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
            <div className="px-6 py-4 bg-linear-to-br from-primary/10 to-purple-50 border-b border-gray-200">
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

      {/* Wallet History Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-linear-to-br from-purple-500 to-pink-500 text-white flex-shrink-0">
              <div>
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <Wallet className="w-6 h-6" />
                  Ví điện tử
                </h3>
                <p className="text-white/80 text-sm mt-1">Lịch sử giao dịch và thống kê</p>
              </div>
              <button
                onClick={() => {
                  setShowWalletModal(false);
                  setShowTopUpForm(false);
                  setTopUpAmount("");
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Wallet Balance */}
              <div className="px-6 py-6 from-purple-50 to-indigo-50 border-b border-gray-200">
                <div className="text-center">
                  <p className="text-sm text-gray-600 font-medium mb-1">Số dư hiện tại</p>
                  <p className="text-4xl font-bold bg-linear-to-br from-purple-500 to-pink-500 text-transparent bg-clip-text">
                    {formatCurrency(walletBalance)}
                  </p>
                </div>
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => setShowTopUpForm(!showTopUpForm)}
                    className="px-6 py-2 bg-linear-to-br from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-80 font-medium flex items-center gap-2 transition-colors"
                  >
                    {showTopUpForm ? (
                      <>
                        <Minus className="w-4 h-4" />
                        Đóng form
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Nạp tiền
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Top-up Form */}
              {showTopUpForm && (
                <div className="px-6 py-6 bg-white border-b border-gray-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-purple-500" />
                    Nạp tiền vào ví
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Số tiền nạp (VNĐ)</label>
                      <input
                        type="number"
                        value={topUpAmount}
                        onChange={(e) => setTopUpAmount(e.target.value)}
                        placeholder="Nhập số tiền"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary text-lg"
                        disabled={topUpLoading}
                      />
                      <p className="text-xs text-gray-500 mt-2">Số tiền tối thiểu: 10,000 VNĐ</p>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      {[50000, 100000, 500000, 1000000].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setTopUpAmount(amt.toString())}
                          disabled={topUpLoading}
                          className={`px-4 py-2 border-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                            topUpAmount === amt.toString()
                              ? "border-purple-500 bg-purple-500/10 text-purple-500"
                              : "border-gray-200 hover:border-purple-500 hover:bg-purple-50 text-gray-700"
                          }`}
                        >
                          {(amt / 1000).toLocaleString("vi-VN")}k
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => {
                          setShowTopUpForm(false);
                          setTopUpAmount("");
                        }}
                        className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                        disabled={topUpLoading}
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleTopUp}
                        disabled={topUpLoading || !topUpAmount}
                        className="flex-1 px-4 py-3 bg-linear-to-br from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-80 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {topUpLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Đang xử lý...
                          </>
                        ) : (
                          <>
                            <DollarSign className="w-4 h-4" />
                            Nạp tiền
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4 px-6 py-6 border-b border-gray-200">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm text-gray-600">Tổng đã nạp</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(walletStats.totalTopUp)}</p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600">Giao dịch thành công</p>
                  <p className="text-lg font-bold text-gray-900">{walletStats.successfulTransactions}</p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                  <p className="text-sm text-gray-600">Lần nạp gần nhất</p>
                  <p className="text-lg font-bold text-gray-900">
                    {walletTransactions.length > 0 ? formatDate(walletTransactions[0].createdAt) : "Chưa có"}
                  </p>
                </div>
              </div>

              {/* Transaction History */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <h4 className="text-lg font-bold text-gray-900 mb-4">Lịch sử nạp tiền</h4>
                {walletTransactions.length > 0 ? (
                  <div className="space-y-3">
                    {walletTransactions.map((transaction) => (
                      <div
                        key={transaction._id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              +{transaction.amount.toLocaleString("vi-VN")} VNĐ
                            </p>
                            <p className="text-sm text-gray-500">{formatDateTime(transaction.createdAt)}</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          Thành công
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Chưa có lịch sử nạp tiền</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 shrink-0">
              <button
                onClick={() => {
                  setShowWalletModal(false);
                  setShowTopUpForm(false);
                  setTopUpAmount("");
                }}
                className="w-full px-4 py-3 bg-linear-to-br from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-80 font-medium transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
