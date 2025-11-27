import axios from "axios";

export interface RevenueRecord {
  _id: string;
  doctorId: string;
  paymentId: {
    _id: string;
    transactionId: string;
    paymentMethod: string;
  };
  patientId: {
    _id: string;
    fullName: string;
    email: string;
    phone?: string;
  };
  amount: number;
  platformFee: number;
  netAmount: number;
  revenueDate: string;
  status: "pending" | "completed" | "withdrawn" | "cancelled";
  refId?: any;
  refModel?: string;
  type: string;
  notes?: string;
  withdrawnDate?: string;
  withdrawnMethod?: string;
  withdrawnTransactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RevenueSummary {
  totalRevenue: number;
  totalPlatformFee: number;
  totalNetRevenue: number;
  totalTransactions: number;
  byStatus: {
    [key: string]: {
      amount: number;
      platformFee: number;
      netAmount: number;
      count: number;
    };
  };
}

export interface MonthlyTrend {
  year: number;
  month: number;
  revenue: number;
  count: number;
}

export interface RevenueSummaryResponse {
  success: boolean;
  data: {
    summary: RevenueSummary;
    monthlyTrend: MonthlyTrend[];
    period: {
      startDate?: string;
      endDate?: string;
    };
  };
  message: string;
}

export interface RevenueListResponse {
  success: boolean;
  data: {
    results: RevenueRecord[];
    totalItems: number;
    totalPages: number;
    current: number;
    pageSize: number;
  };
  message: string;
}

export interface RevenueByRangeResponse {
  success: boolean;
  data: {
    revenues: RevenueRecord[];
    summary: {
      totalAmount: number;
      totalPlatformFee: number;
      totalNetAmount: number;
      count: number;
    };
    period: {
      startDate: string;
      endDate: string;
    };
  };
  message: string;
}

/**
 * Service để làm việc với API doanh thu bác sĩ
 */
class RevenueService {
  /**
   * Lấy tổng quan doanh thu của bác sĩ
   */
  async getDoctorRevenueSummary(
    doctorId: string,
    startDate?: string,
    endDate?: string
  ): Promise<RevenueSummaryResponse> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/revenue/doctor/${doctorId}/summary?${params.toString()}`);

      return response.data;
    } catch (error: any) {
      console.error("Error fetching doctor revenue summary:", error);
      throw error;
    }
  }

  /**
   * Lấy danh sách doanh thu của bác sĩ (có phân trang)
   */
  async getDoctorRevenues(
    doctorId: string,
    page: number = 1,
    pageSize: number = 10,
    filters?: {
      status?: string;
      startDate?: string;
      endDate?: string;
      type?: string;
    }
  ): Promise<RevenueListResponse> {
    try {
      const params = new URLSearchParams({
        current: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (filters?.status) params.append("status", filters.status);
      if (filters?.type) params.append("type", filters.type);
      if (filters?.startDate) params.append("revenueDate[$gte]", filters.startDate);
      if (filters?.endDate) params.append("revenueDate[$lte]", filters.endDate);

      const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/revenue/doctor/${doctorId}?${params.toString()}`);

      return response.data;
    } catch (error: any) {
      console.error("Error fetching doctor revenues:", error);
      throw error;
    }
  }

  /**
   * Lấy doanh thu theo khoảng thời gian
   */
  async getRevenueByDateRange(
    doctorId: string,
    startDate: string,
    endDate: string,
    status?: string
  ): Promise<RevenueByRangeResponse> {
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      if (status) params.append("status", status);

      const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/revenue/doctor/${doctorId}/range?${params.toString()}`);

      return response.data;
    } catch (error: any) {
      console.error("Error fetching revenue by date range:", error);
      throw error;
    }
  }

  /**
   * Lấy chi tiết một record doanh thu
   */
  async getRevenueDetail(revenueId: string): Promise<{ success: boolean; data: RevenueRecord; message: string }> {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/revenue/${revenueId}`);
      return response.data;
    } catch (error: any) {
      console.error("Error fetching revenue detail:", error);
      throw error;
    }
  }

  /**
   * Cập nhật thông tin doanh thu (ví dụ: đánh dấu đã rút tiền)
   */
  async updateRevenue(
    revenueId: string,
    data: {
      status?: string;
      withdrawnDate?: string;
      withdrawnMethod?: string;
      withdrawnTransactionId?: string;
      notes?: string;
    }
  ): Promise<{ success: boolean; data: RevenueRecord; message: string }> {
    try {
      const response = await axios.patch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/revenue/${revenueId}`, data);
      return response.data;
    } catch (error: any) {
      console.error("Error updating revenue:", error);
      throw error;
    }
  }
}

export const revenueService = new RevenueService();
export default revenueService;
