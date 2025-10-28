"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import voucherService, { Voucher } from "@/services/voucherService";
import { Gift, Calendar, Check, X } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export default function VoucherList() {
  const { data: session } = useSession();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState("");

  const loadVouchers = async () => {
    try {
      const accessToken = (session as { access_token?: string })?.access_token;
      if (!accessToken) {
        console.log("⚠️ No access token, waiting for session...", session);
        setLoading(false);
        return;
      }

      console.log("🔄 Loading vouchers with token...");
      const result = await voucherService.getMyVouchers(accessToken);
      console.log("✅ Voucher result:", result);

      if (result.success && result.data) {
        setVouchers(result.data);
        console.log("✅ Loaded vouchers:", result.data.length);
      } else {
        console.error("❌ Voucher error:", result.error);
      }
    } catch (error) {
      console.error("❌ Load vouchers error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVouchers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (vouchers.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        <Gift className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Bạn chưa có voucher nào</p>
        <p className="text-sm text-gray-500 mt-1">
          Voucher sẽ được tặng khi bác sĩ tạo đề xuất tái khám hoặc hủy lịch khẩn cấp
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Voucher của tôi</h3>
        <span className="text-sm text-gray-500">{vouchers.length} voucher khả dụng</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {vouchers.map((voucher) => {
          const isExpired = voucherService.isExpired(voucher);
          const discount = voucherService.formatDiscount(voucher);
          const reasonText = voucherService.getReasonText(voucher.reason);

          return (
            <div
              key={voucher._id}
              className={`border-2 rounded-xl p-4 transition-all ${
                isExpired
                  ? "border-gray-300 bg-gray-50 opacity-60"
                  : voucher.isUsed
                  ? "border-green-300 bg-green-50"
                  : "border-blue-300 bg-gradient-to-br from-blue-50 to-purple-50"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Gift
                    className={`w-5 h-5 ${
                      isExpired ? "text-gray-400" : voucher.isUsed ? "text-green-600" : "text-blue-600"
                    }`}
                  />
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      isExpired
                        ? "bg-gray-200 text-gray-600"
                        : voucher.isUsed
                        ? "bg-green-200 text-green-800"
                        : "bg-blue-200 text-blue-800"
                    }`}
                  >
                    {reasonText}
                  </span>
                </div>

                {voucher.isUsed && (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <Check className="w-4 h-4" /> Đã dùng
                  </span>
                )}

                {isExpired && !voucher.isUsed && (
                  <span className="flex items-center gap-1 text-xs text-gray-600 font-medium">
                    <X className="w-4 h-4" /> Hết hạn
                  </span>
                )}
              </div>

              <div className="mb-3">
                <p className="text-3xl font-bold text-gray-800">{discount}</p>
                <p className="text-xs text-gray-500 mt-1">Giảm giá</p>
              </div>

              <div
                className={`mb-3 p-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                  copiedCode === voucher.code
                    ? "bg-green-100 border-green-400"
                    : "bg-white border-gray-300 hover:border-blue-400"
                }`}
                onClick={() => handleCopyCode(voucher.code)}
              >
                <p className="text-xs text-gray-500 mb-1">Mã voucher</p>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-mono font-bold text-gray-800">{voucher.code}</p>
                  {copiedCode === voucher.code ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <span className="text-xs text-blue-600">Copy</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>
                    HSD:{" "}
                    {format(new Date(voucher.expiresAt), "dd/MM/yyyy", {
                      locale: vi,
                    })}
                  </span>
                </div>

                {voucher.isUsed && voucher.usedAt && (
                  <span>
                    Dùng:{" "}
                    {format(new Date(voucher.usedAt), "dd/MM/yyyy", {
                      locale: vi,
                    })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>💡 Mẹo:</strong> Click vào mã voucher để sao chép. Áp dụng voucher khi đặt lịch tái khám để nhận ưu
          đãi!
        </p>
      </div>
    </div>
  );
}
