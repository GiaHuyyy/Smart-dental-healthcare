"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { sendRequest } from "@/utils/api";
import {
  Search,
  CreditCard,
  Calendar,
  User,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
} from "lucide-react";

interface PaymentRecord {
  _id: string;
  appointment: {
    _id: string;
    appointmentType: string;
    appointmentDate: string;
    doctor: {
      fullName: string;
      specialization: string;
    };
  };
  amount: number;
  paymentMethod: "cash" | "card" | "transfer" | "insurance";
  status: "pending" | "paid" | "cancelled" | "refunded";
  paymentDate: string;
  description: string;
  invoiceNumber: string;
  notes?: string;
}

export default function PatientPayments() {
  const { data: session } = useSession();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (session) {
      fetchPayments();
    }
  }, [session]);

  const fetchPayments = async () => {
    try {
      const response = await sendRequest<any>({
        url: "/api/payments/patient",
        method: "GET",
        headers: {
          Authorization: `Bearer ${(session as any)?.access_token}`,
        },
      });

      if (response && response.data) {
        setPayments(response.data);
      } else {
        // Demo data for UI showcase
        setPayments([
          {
            _id: "1",
            appointment: {
              _id: "app1",
              appointmentType: "Khám tổng quát",
              appointmentDate: "2024-01-15",
              doctor: {
                fullName: "Nguyễn Văn Nam",
                specialization: "Nha khoa tổng quát",
              },
            },
            amount: 500000,
            paymentMethod: "card",
            status: "paid",
            paymentDate: "2024-01-15T10:30:00Z",
            description: "Phí khám tổng quát và vệ sinh răng miệng",
            invoiceNumber: "INV-2024-001",
          },
          {
            _id: "2",
            appointment: {
              _id: "app2",
              appointmentType: "Điều trị sâu răng",
              appointmentDate: "2024-01-10",
              doctor: {
                fullName: "Trần Thị Hoa",
                specialization: "Nha khoa bảo tồn",
              },
            },
            amount: 800000,
            paymentMethod: "transfer",
            status: "pending",
            paymentDate: "2024-01-10T14:00:00Z",
            description: "Điều trị sâu răng và trám răng",
            invoiceNumber: "INV-2024-002",
          },
        ]);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      // Demo data fallback
      setPayments([
        {
          _id: "1",
          appointment: {
            _id: "app1",
            appointmentType: "Khám tổng quát",
            appointmentDate: "2024-01-15",
            doctor: {
              fullName: "Nguyễn Văn Nam",
              specialization: "Nha khoa tổng quát",
            },
          },
          amount: 500000,
          paymentMethod: "card",
          status: "paid",
          paymentDate: "2024-01-15T10:30:00Z",
          description: "Phí khám tổng quát và vệ sinh răng miệng",
          invoiceNumber: "INV-2024-001",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "cancelled":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "refunded":
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "paid":
        return "Đã thanh toán";
      case "pending":
        return "Chờ thanh toán";
      case "cancelled":
        return "Đã hủy";
      case "refunded":
        return "Đã hoàn tiền";
      default:
        return "Không xác định";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-50 text-green-700 border border-green-200";
      case "pending":
        return "bg-yellow-50 text-yellow-700 border border-yellow-200";
      case "cancelled":
        return "bg-red-50 text-red-700 border border-red-200";
      case "refunded":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      default:
        return "bg-gray-50 text-gray-700 border border-gray-200";
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case "cash":
        return "Tiền mặt";
      case "card":
        return "Thẻ tín dụng";
      case "transfer":
        return "Chuyển khoản";
      case "insurance":
        return "Bảo hiểm";
      default:
        return "Khác";
    }
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.appointment.doctor.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.appointment.appointmentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalAmount = payments.reduce((sum, payment) => {
    return payment.status === "paid" ? sum + payment.amount : sum;
  }, 0);

  const pendingAmount = payments.reduce((sum, payment) => {
    return payment.status === "pending" ? sum + payment.amount : sum;
  }, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/30 to-indigo-50/20 flex items-center justify-center">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: "var(--color-primary)" }}
        ></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 to-indigo-50/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="healthcare-card-elevated p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                style={{
                  backgroundImage: `linear-gradient(to bottom right, var(--color-primary), var(--color-primary-600))`,
                }}
              >
                <CreditCard className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="healthcare-heading text-3xl">Thanh toán & Hóa đơn</h1>
                <p className="healthcare-body mt-1">Theo dõi lịch sử thanh toán và hóa đơn khám chữa bệnh</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 text-right">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="healthcare-body text-sm">
                  Đã thanh toán: <span className="font-semibold text-green-600">{formatCurrency(totalAmount)}</span>
                </span>
              </div>
              {pendingAmount > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  <span className="healthcare-body text-sm">
                    Chờ thanh toán:{" "}
                    <span className="font-semibold text-yellow-600">{formatCurrency(pendingAmount)}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="healthcare-card p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Tìm kiếm theo bác sĩ, dịch vụ, số hóa đơn..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="paid">Đã thanh toán</option>
              <option value="pending">Chờ thanh toán</option>
              <option value="cancelled">Đã hủy</option>
              <option value="refunded">Đã hoàn tiền</option>
            </select>
          </div>
        </div>

        {/* Payments List */}
        <div className="space-y-4">
          {filteredPayments.length === 0 ? (
            <div className="healthcare-card p-12 text-center">
              <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="healthcare-heading text-xl mb-2">Chưa có giao dịch nào</h3>
              <p className="healthcare-body">
                {searchTerm || statusFilter !== "all"
                  ? "Không tìm thấy giao dịch phù hợp với tiêu chí tìm kiếm"
                  : "Bạn chưa có giao dịch thanh toán nào"}
              </p>
            </div>
          ) : (
            filteredPayments.map((payment) => (
              <div key={payment._id} className="healthcare-card p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  {/* Payment Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="healthcare-heading text-xl">{payment.appointment.appointmentType}</h3>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getStatusBadgeClass(
                              payment.status
                            )}`}
                          >
                            {getStatusIcon(payment.status)}
                            {getStatusText(payment.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>BS. {payment.appointment.doctor.fullName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(payment.paymentDate)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            <span>{payment.invoiceNumber}</span>
                          </div>
                        </div>
                        <p className="healthcare-body text-sm">
                          Chuyên khoa: {payment.appointment.doctor.specialization}
                        </p>
                      </div>
                    </div>

                    {/* Payment Details */}
                    <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Dịch vụ</p>
                          <p className="text-gray-900">{payment.description}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Phương thức thanh toán</p>
                          <p className="text-gray-900">{getPaymentMethodText(payment.paymentMethod)}</p>
                        </div>
                      </div>

                      {payment.notes && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <p className="text-sm font-medium text-gray-700 mb-1">Ghi chú</p>
                          <p className="text-sm text-gray-600">{payment.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="lg:text-right">
                    <div className="healthcare-card-elevated p-4 lg:min-w-[200px]">
                      <p className="text-sm text-gray-600 mb-1">Số tiền</p>
                      <p
                        className="healthcare-heading text-2xl"
                        style={{
                          color:
                            payment.status === "paid"
                              ? "#10B981"
                              : payment.status === "pending"
                              ? "#F59E0B"
                              : "#6B7280",
                        }}
                      >
                        {formatCurrency(payment.amount)}
                      </p>
                      {payment.status === "pending" && (
                        <button
                          className="btn-healthcare-primary mt-3 w-full text-sm py-2"
                          onClick={() => {
                            // Handle payment action
                            console.log("Payment initiated for:", payment._id);
                          }}
                        >
                          Thanh toán ngay
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
