/**
 * Revenue Service
 * API calls cho doanh thu
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.51.8:8081/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface RevenueSummary {
  totalAmount: number;
  totalPlatformFee: number;
  totalRevenue: number;
  totalAppointments: number;
  averageRevenue: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface RevenueByType {
  type: string;
  revenue: number;
  count: number;
}

export interface MonthlyRevenue {
  year: number;
  month: number;
  revenue: number;
  count: number;
}

export interface RevenueTransaction {
  _id: string;
  doctorId: string;
  patientId: {
    _id: string;
    fullName: string;
    email: string;
  };
  paymentId: {
    _id: string;
    amount: number;
    paymentMethod: string;
    status: string;
  };
  appointmentId?: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  type: string;
  status: string;
  revenueDate: string;
  createdAt: string;
}

export interface DoctorRevenueData {
  summary: RevenueSummary;
  revenueByType: RevenueByType[];
  monthlyRevenue: MonthlyRevenue[];
  recentTransactions: RevenueTransaction[];
  results: RevenueTransaction[];
  totalItems: number;
  totalPages: number;
  current: number;
  pageSize: number;
}

/**
 * Lấy tổng quan doanh thu của bác sĩ
 */
export async function getDoctorRevenueSummary(
  doctorId: string,
  token: string,
  params?: {
    startDate?: string;
    endDate?: string;
  }
): Promise<ApiResponse<RevenueSummary>> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const response = await fetch(
      `${API_URL}/revenue/doctor/${doctorId}/summary?${queryParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    return {
      success: response.ok,
      data: data.data || data,
      message: data.message,
    };
  } catch (error) {
    console.error('getDoctorRevenueSummary error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tải tổng quan doanh thu',
    };
  }
}

/**
 * Lấy danh sách doanh thu của bác sĩ (có phân trang + thống kê)
 */
export async function getDoctorRevenues(
  doctorId: string,
  token: string,
  params?: {
    current?: number;
    pageSize?: number;
    status?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<ApiResponse<DoctorRevenueData>> {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.current) queryParams.append('current', params.current.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.startDate) queryParams.append('revenueDate[$gte]', params.startDate);
    if (params?.endDate) queryParams.append('revenueDate[$lte]', params.endDate);

    const response = await fetch(
      `${API_URL}/revenue/doctor/${doctorId}?${queryParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    return {
      success: response.ok,
      data: data.data || data,
      message: data.message,
    };
  } catch (error) {
    console.error('getDoctorRevenues error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tải danh sách doanh thu',
    };
  }
}

/**
 * Lấy doanh thu theo khoảng thời gian
 */
export async function getRevenueByDateRange(
  doctorId: string,
  token: string,
  startDate: string,
  endDate: string,
  status?: string
): Promise<ApiResponse<RevenueTransaction[]>> {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append('startDate', startDate);
    queryParams.append('endDate', endDate);
    if (status) queryParams.append('status', status);

    const response = await fetch(
      `${API_URL}/revenue/doctor/${doctorId}/range?${queryParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    return {
      success: response.ok,
      data: data.data || [],
      message: data.message,
    };
  } catch (error) {
    console.error('getRevenueByDateRange error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tải doanh thu',
    };
  }
}

/**
 * Lấy chi tiết một bản ghi doanh thu
 */
export async function getRevenueById(
  revenueId: string,
  token: string
): Promise<ApiResponse<RevenueTransaction>> {
  try {
    const response = await fetch(`${API_URL}/revenue/${revenueId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return {
      success: response.ok,
      data: data.data || data,
      message: data.message,
    };
  } catch (error) {
    console.error('getRevenueById error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể tải chi tiết doanh thu',
    };
  }
}

/**
 * Cập nhật trạng thái doanh thu (ví dụ: đánh dấu đã rút)
 */
export async function updateRevenue(
  revenueId: string,
  updates: { status?: string; withdrawnAt?: string },
  token: string
): Promise<ApiResponse<RevenueTransaction>> {
  try {
    const response = await fetch(`${API_URL}/revenue/${revenueId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    const data = await response.json();
    return {
      success: response.ok,
      data: data.data || data,
      message: data.message,
    };
  } catch (error) {
    console.error('updateRevenue error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Không thể cập nhật doanh thu',
    };
  }
}

/**
 * Tính toán doanh thu trong khoảng thời gian
 */
export function calculateRevenueSummary(
  transactions: RevenueTransaction[]
): {
  total: number;
  platformFee: number;
  netRevenue: number;
  count: number;
} {
  return transactions.reduce(
    (acc, t) => ({
      total: acc.total + t.amount,
      platformFee: acc.platformFee + t.platformFee,
      netRevenue: acc.netRevenue + t.netAmount,
      count: acc.count + 1,
    }),
    { total: 0, platformFee: 0, netRevenue: 0, count: 0 }
  );
}

/**
 * Format tiền VND
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

export default {
  getDoctorRevenueSummary,
  getDoctorRevenues,
  getRevenueByDateRange,
  getRevenueById,
  updateRevenue,
  calculateRevenueSummary,
  formatCurrency,
};
