"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import paymentService from "@/services/paymentService";
import Image from "next/image";

interface MoMoPaymentButtonProps {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  amount: number;
  orderInfo?: string;
  accessToken?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function MoMoPaymentButton({
  appointmentId,
  patientId,
  doctorId,
  amount,
  orderInfo,
  accessToken,
  onSuccess,
  onError,
}: MoMoPaymentButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    try {
      setLoading(true);

      const result = await paymentService.createMoMoPayment(
        {
          appointmentId,
          patientId,
          doctorId,
          amount,
          orderInfo: orderInfo || `Thanh toán lịch khám #${appointmentId}`,
        },
        accessToken
      );

      if (!result.success || !result.data?.payUrl) {
        throw new Error(result.message || "Không thể tạo thanh toán MoMo");
      }

      // Redirect to MoMo payment page
      toast.success("Đang chuyển đến trang thanh toán...");
      window.location.href = result.data.payUrl;

      onSuccess?.();
    } catch (error: any) {
      console.error("MoMo payment error:", error);
      toast.error(error.message || "Không thể tạo thanh toán MoMo");
      onError?.(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className="w-full bg-pink-600 hover:bg-pink-700 disabled:bg-gray-300 text-white font-medium py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-3 shadow-md hover:shadow-lg"
    >
      {loading ? (
        <>
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Đang xử lý...</span>
        </>
      ) : (
        <>
          {/* MoMo Logo */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            className="w-8 h-8 fill-white"
          >
            <circle cx="50" cy="50" r="45" fill="#A50064" />
            <text
              x="50"
              y="70"
              fontSize="60"
              fontWeight="bold"
              textAnchor="middle"
              fill="white"
            >
              M
            </text>
          </svg>
          <div className="flex flex-col items-start">
            <span className="text-base font-bold">Thanh toán với MoMo</span>
            <span className="text-xs font-normal opacity-90">
              {amount.toLocaleString("vi-VN")} đ
            </span>
          </div>
        </>
      )}
    </button>
  );
}









