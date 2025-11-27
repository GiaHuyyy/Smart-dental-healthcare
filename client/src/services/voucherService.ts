export interface Voucher {
  _id: string;
  patientId: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  reason: "doctor_cancellation" | "follow_up";
  expiresAt: string;
  isUsed: boolean;
  usedAt?: string;
  relatedAppointmentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VoucherResponse {
  success: boolean;
  data?: Voucher[];
  message?: string;
  error?: string;
}

export interface ApplyVoucherResponse {
  success: boolean;
  data?: {
    discountedAmount: number;
    voucherId: string;
  };
  message?: string;
  error?: string;
}

const voucherService = {
  /**
   * Get patient's available vouchers
   */
  async getMyVouchers(token?: string): Promise<VoucherResponse> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/vouchers/my-vouchers`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "Lấy danh sách voucher thất bại",
        };
      }

      return {
        success: true,
        data: data.data,
        message: data.message,
      };
    } catch (error) {
      console.error("Get vouchers error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi kết nối server",
      };
    }
  },

  /**
   * Apply voucher to an amount
   */
  async applyVoucher(voucherCode: string, amount: number, token?: string): Promise<ApplyVoucherResponse> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/vouchers/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ voucherCode, amount }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "Áp dụng voucher thất bại",
        };
      }

      return {
        success: true,
        data: data.data,
        message: data.message,
      };
    } catch (error) {
      console.error("Apply voucher error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Lỗi kết nối server",
      };
    }
  },

  /**
   * Format voucher discount text
   */
  formatDiscount(voucher: Voucher): string {
    if (voucher.type === "percentage") {
      return `${voucher.value}%`;
    }
    return `${voucher.value.toLocaleString("vi-VN")} VND`;
  },

  /**
   * Check if voucher is expired
   */
  isExpired(voucher: Voucher): boolean {
    return new Date(voucher.expiresAt) < new Date();
  },

  /**
   * Get voucher reason text
   */
  getReasonText(reason: Voucher["reason"]): string {
    const reasons = {
      doctor_cancellation: "Bác sĩ hủy lịch",
      follow_up: "Ưu đãi tái khám",
    };
    return reasons[reason] || reason;
  },
};

export default voucherService;
