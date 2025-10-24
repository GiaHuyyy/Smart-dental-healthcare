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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Chi tiết doanh thu
          </DialogTitle>
          <DialogDescription>Thông tin chi tiết về khoản doanh thu này</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Date */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Trạng thái</div>
              {getStatusBadge(revenue.status)}
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground mb-1">Ngày tạo</div>
              <div className="font-medium">{formatDate(revenue.revenueDate)}</div>
            </div>
          </div>

          {/* Patient Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <User className="w-4 h-4" />
              Thông tin bệnh nhân
            </div>
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Họ tên</div>
                <div className="font-medium">{revenue.patientId?.fullName || "N/A"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Email</div>
                <div className="font-medium">{revenue.patientId?.email || "N/A"}</div>
              </div>
              {revenue.patientId?.phone && (
                <div>
                  <div className="text-sm text-muted-foreground">Số điện thoại</div>
                  <div className="font-medium">{revenue.patientId.phone}</div>
                </div>
              )}
            </div>
          </div>

          {/* Revenue Details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <DollarSign className="w-4 h-4" />
              Thông tin doanh thu
            </div>
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tổng tiền</span>
                <span className="font-semibold">{formatCurrency(revenue.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phí nền tảng (5%)</span>
                <span className="font-semibold text-orange-600">
                  -{formatCurrency(revenue.platformFee)}
                </span>
              </div>
              <div className="h-px bg-border"></div>
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Thực nhận</span>
                <span className="font-bold text-green-600">{formatCurrency(revenue.netAmount)}</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <CreditCard className="w-4 h-4" />
              Thông tin thanh toán
            </div>
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Mã giao dịch</div>
                <div className="font-mono text-sm">{revenue.paymentId?.transactionId || "N/A"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Phương thức</div>
                <div className="font-medium">{revenue.paymentId?.paymentMethod || "N/A"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Loại doanh thu</div>
                <div className="font-medium capitalize">{revenue.type}</div>
              </div>
            </div>
          </div>

          {/* Withdrawal Info (if withdrawn) */}
          {revenue.status === "withdrawn" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <Receipt className="w-4 h-4" />
                Thông tin rút tiền
              </div>
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-blue-50">
                <div>
                  <div className="text-sm text-muted-foreground">Ngày rút</div>
                  <div className="font-medium">
                    {revenue.withdrawnDate ? formatDate(revenue.withdrawnDate) : "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Phương thức</div>
                  <div className="font-medium">{revenue.withdrawnMethod || "N/A"}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-muted-foreground">Mã giao dịch rút tiền</div>
                  <div className="font-mono text-sm">{revenue.withdrawnTransactionId || "N/A"}</div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {revenue.notes && (
            <div className="space-y-2">
              <div className="font-semibold">Ghi chú</div>
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm">{revenue.notes}</p>
              </div>
            </div>
          )}

          {/* Withdraw Form (if completed and not withdrawn) */}
          {revenue.status === "completed" && onUpdate && (
            <div className="space-y-4 p-4 border-2 border-dashed rounded-lg">
              <div className="font-semibold">Yêu cầu rút tiền</div>

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
                    <SelectContent>
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
                  className="w-full gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Xác nhận rút tiền
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
