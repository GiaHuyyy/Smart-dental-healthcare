"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RevenueRecord } from "@/services/revenueService";
import { CreditCard, DollarSign, FileText, Loader2, Receipt, User } from "lucide-react";
import { useState } from "react";

interface RevenueDetailDialogProps {
  revenue: RevenueRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (revenueId: string, data: any) => Promise<void>;
}

export default function RevenueDetailDialog({
  revenue,
  isOpen,
  onClose,
  onUpdate,
}: RevenueDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [withdrawData, setWithdrawData] = useState({
    withdrawnMethod: "bank_transfer",
    withdrawnTransactionId: "",
    notes: "",
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN", {
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

  const handleWithdraw = async () => {
    if (!revenue || !onUpdate) return;

    setLoading(true);
    try {
      await onUpdate(revenue._id, {
        status: "withdrawn",
        withdrawnDate: new Date().toISOString(),
        ...withdrawData,
      });
      onClose();
    } catch (error) {
      console.error("Error withdrawing revenue:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!revenue) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 border-white/20 shadow-2xl">
        <DialogHeader className="pb-6 border-b border-blue-100">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent font-bold">
              Chi tiết doanh thu
            </span>
          </DialogTitle>
          <DialogDescription className="text-slate-600 ml-12">
            Thông tin chi tiết về khoản doanh thu này
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Status and Date */}
          <div className="flex items-center justify-between p-5 bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-blue-100 hover:shadow-lg transition-all">
            <div>
              <div className="text-sm text-slate-500 mb-2 font-medium">Trạng thái</div>
              {getStatusBadge(revenue.status)}
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500 mb-2 font-medium">Ngày tạo</div>
              <div className="font-semibold text-slate-700">{formatDate(revenue.revenueDate)}</div>
            </div>
          </div>

          {/* Patient Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 font-bold text-slate-800">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2 rounded-lg shadow-md">
                <User className="w-4 h-4 text-white" />
              </div>
              Thông tin bệnh nhân
            </div>
            <div className="grid grid-cols-2 gap-4 p-5 bg-white/80 backdrop-blur-sm border border-green-100 rounded-2xl shadow-md">
              <div>
                <div className="text-sm text-slate-500 mb-1 font-medium">Họ tên</div>
                <div className="font-semibold text-slate-800">{revenue.patientId?.fullName || "N/A"}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1 font-medium">Email</div>
                <div className="font-semibold text-slate-800">{revenue.patientId?.email || "N/A"}</div>
              </div>
              {revenue.patientId?.phone && (
                <div>
                  <div className="text-sm text-slate-500 mb-1 font-medium">Số điện thoại</div>
                  <div className="font-semibold text-slate-800">{revenue.patientId.phone}</div>
                </div>
              )}
            </div>
          </div>

          {/* Revenue Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 font-bold text-slate-800">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg shadow-md">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
              Thông tin doanh thu
            </div>
            <div className="space-y-4 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl shadow-lg">
              <div className="flex justify-between items-center p-3 bg-white/70 rounded-xl">
                <span className="text-slate-600 font-medium">Tổng tiền</span>
                <span className="font-bold text-lg text-blue-700">{formatCurrency(revenue.amount)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/70 rounded-xl">
                <span className="text-slate-600 font-medium">Phí nền tảng (5%)</span>
                <span className="font-bold text-lg text-orange-600">
                  -{formatCurrency(revenue.platformFee)}
                </span>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent"></div>
              <div className="flex justify-between items-center p-4 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl shadow-md">
                <span className="font-bold text-white text-lg">Thực nhận</span>
                <span className="font-bold text-2xl text-white">{formatCurrency(revenue.netAmount)}</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 font-bold text-slate-800">
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-2 rounded-lg shadow-md">
                <CreditCard className="w-4 h-4 text-white" />
              </div>
              Thông tin thanh toán
            </div>
            <div className="grid grid-cols-2 gap-4 p-5 bg-white/80 backdrop-blur-sm border border-purple-100 rounded-2xl shadow-md">
              <div>
                <div className="text-sm text-slate-500 mb-1 font-medium">Mã giao dịch</div>
                <div className="font-mono text-sm font-semibold text-slate-800 bg-slate-100 px-2 py-1 rounded">
                  {revenue.paymentId?.transactionId || "N/A"}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1 font-medium">Phương thức</div>
                <div className="font-semibold text-slate-800">{revenue.paymentId?.paymentMethod || "N/A"}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1 font-medium">Loại doanh thu</div>
                <div className="font-semibold text-slate-800 capitalize">{revenue.type}</div>
              </div>
            </div>
          </div>

          {/* Withdrawal Info (if withdrawn) */}
          {revenue.status === "withdrawn" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 font-bold text-slate-800">
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2 rounded-lg shadow-md">
                  <Receipt className="w-4 h-4 text-white" />
                </div>
                Thông tin rút tiền
              </div>
              <div className="grid grid-cols-2 gap-4 p-5 bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-2xl shadow-lg">
                <div>
                  <div className="text-sm text-slate-500 mb-1 font-medium">Ngày rút</div>
                  <div className="font-semibold text-slate-800">
                    {revenue.withdrawnDate ? formatDate(revenue.withdrawnDate) : "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 mb-1 font-medium">Phương thức</div>
                  <div className="font-semibold text-slate-800">{revenue.withdrawnMethod || "N/A"}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-slate-500 mb-1 font-medium">Mã giao dịch rút tiền</div>
                  <div className="font-mono text-sm font-semibold text-slate-800 bg-white/70 px-3 py-2 rounded-lg">
                    {revenue.withdrawnTransactionId || "N/A"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {revenue.notes && (
            <div className="space-y-3">
              <div className="font-bold text-slate-800">Ghi chú</div>
              <div className="p-5 bg-amber-50 border-2 border-amber-200 rounded-2xl shadow-md">
                <p className="text-sm text-slate-700 leading-relaxed">{revenue.notes}</p>
              </div>
            </div>
          )}

          {/* Withdraw Form (if completed and not withdrawn) */}
          {revenue.status === "completed" && onUpdate && (
            <div className="space-y-4 p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-dashed border-green-300 rounded-2xl shadow-lg">
              <div className="flex items-center gap-2 font-bold text-green-800">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2 rounded-lg shadow-md">
                  <Receipt className="w-4 h-4 text-white" />
                </div>
                Yêu cầu rút tiền
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="withdrawnMethod">Phương thức rút tiền</Label>
                  <Select
                    value={withdrawData.withdrawnMethod}
                    onValueChange={(value) =>
                      setWithdrawData({ ...withdrawData, withdrawnMethod: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="bank_transfer">Chuyển khoản ngân hàng</SelectItem>
                      <SelectItem value="momo">Ví MoMo</SelectItem>
                      <SelectItem value="zalopay">Ví ZaloPay</SelectItem>
                      <SelectItem value="other">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="withdrawnTransactionId">Mã tham chiếu / Số tài khoản</Label>
                  <Input
                    id="withdrawnTransactionId"
                    value={withdrawData.withdrawnTransactionId}
                    onChange={(e) =>
                      setWithdrawData({ ...withdrawData, withdrawnTransactionId: e.target.value })
                    }
                    placeholder="Nhập mã tham chiếu hoặc số tài khoản"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Ghi chú</Label>
                  <Textarea
                    id="notes"
                    value={withdrawData.notes}
                    onChange={(e) => setWithdrawData({ ...withdrawData, notes: e.target.value })}
                    placeholder="Ghi chú thêm (không bắt buộc)"
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleWithdraw}
                  disabled={loading || !withdrawData.withdrawnTransactionId}
                  className="w-full gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Đang xử lý..." : "Xác nhận rút tiền"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
