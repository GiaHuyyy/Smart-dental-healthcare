"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import VoucherList from "@/components/vouchers/VoucherList";

export default function VouchersPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Quay lại
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Voucher của tôi</h1>
              <p className="text-gray-600">Quản lý và sử dụng các voucher giảm giá của bạn</p>
            </div>
          </div>
        </div>

        {/* Voucher List */}
        <VoucherList />

        {/* Usage Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
            <span className="text-xl">💡</span>
            Hướng dẫn sử dụng voucher
          </h3>
          <ul className="space-y-2 text-primary">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-1">1.</span>
              <span>Click vào mã voucher để sao chép vào clipboard</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-1">2.</span>
              <span>Khi đặt lịch khám hoặc thanh toán, dán mã voucher vào ô "Mã giảm giá"</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-1">3.</span>
              <span>Voucher sẽ được áp dụng tự động và giảm trừ vào tổng số tiền</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-1">4.</span>
              <span>Mỗi voucher chỉ được sử dụng một lần và có thời hạn sử dụng</span>
            </li>
          </ul>
        </div>

        {/* How to get vouchers */}
        <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-6">
          <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
            <span className="text-xl">🎁</span>
            Cách nhận voucher
          </h3>
          <ul className="space-y-2 text-green-800">
            <li className="flex items-start gap-2">
              <span className="text-green-600">•</span>
              <span>
                <strong>Bác sĩ hủy lịch khẩn cấp:</strong> Nhận voucher giảm giá 5% cho lần khám tiếp theo
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">•</span>
              <span>
                <strong>Lịch tái khám:</strong> Khi bác sĩ tạo đề xuất tái khám, bạn nhận voucher giảm giá 5%
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">•</span>
              <span>
                <strong>Chương trình khuyến mãi:</strong> Theo dõi email và thông báo để không bỏ lỡ voucher đặc biệt
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
