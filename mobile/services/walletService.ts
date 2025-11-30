import { apiRequest } from '@/utils/api';

interface TopUpRequest {
  amount: number;
  paymentMethod: 'momo' | 'banking' | 'cash';
  description?: string;
}

interface WalletBalance {
  balance: number;
}

interface Transaction {
  _id: string;
  amount: number;
  createdAt: string;
  status: string;
  type: string;
}

interface WalletHistory {
  transactions: Transaction[];
  page: number;
  limit: number;
  total: number;
}

interface WalletStats {
  totalTopUp: number;
  successfulTransactions: number;
}

interface TopUpResponse {
  success: boolean;
  data?: {
    payUrl?: string;
    orderId?: string;
    deeplinkMiniApp?: string;
  };
  message?: string;
}

interface PaymentResult {
  success: boolean;
  data?: {
    newBalance?: number;
  };
  message?: string;
  error?: string;
}

class WalletService {
  async getBalance(token: string): Promise<{ success: boolean; data: WalletBalance; message?: string }> {
    try {
      const response = await apiRequest<{ balance: number }>('/api/v1/wallet/balance', {
        method: 'GET',
        token,
      });

      console.log('🔍 [WalletService] Raw response:', JSON.stringify(response, null, 2));
      console.log('🔍 [WalletService] Returning balance:', response.data);

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ Error fetching wallet balance:', error);
      throw new Error(error?.message || 'Không thể tải số dư ví');
    }
  }

  async topUp(token: string, data: TopUpRequest): Promise<TopUpResponse> {
    try {
      const response = await apiRequest<TopUpResponse>('/api/v1/wallet/topup', {
        method: 'POST',
        token,
        body: data,
      });

      return {
        success: true,
        data: response.data,
        message: response.message || 'Tạo yêu cầu nạp tiền thành công',
      };
    } catch (error: any) {
      console.error('❌ Error topping up wallet:', error);
      return {
        success: false,
        message: error?.message || 'Không thể nạp tiền',
      };
    }
  }

  async getHistory(
    token: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ success: boolean; data: WalletHistory; message?: string }> {
    try {
      const response = await apiRequest<WalletHistory>(`/api/v1/wallet/history?page=${page}&limit=${limit}`, {
        method: 'GET',
        token,
      });

      console.log('🔍 [WalletService] History response:', JSON.stringify(response, null, 2));

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ Error fetching wallet history:', error);
      throw new Error(error?.message || 'Không thể tải lịch sử giao dịch');
    }
  }

  async getStats(token: string): Promise<{ success: boolean; data: WalletStats; message?: string }> {
    try {
      const response = await apiRequest<WalletStats>('/api/v1/wallet/stats', {
        method: 'GET',
        token,
      });

      console.log('🔍 [WalletService] Stats response:', JSON.stringify(response, null, 2));

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ Error fetching wallet stats:', error);
      throw new Error(error?.message || 'Không thể tải thống kê ví');
    }
  }

  async payPendingBill(token: string, billId: string): Promise<PaymentResult> {
    try {
      const response = await apiRequest<PaymentResult>('/api/v1/wallet/pay-bill', {
        method: 'POST',
        token,
        body: { billId },
      });

      return {
        success: true,
        data: response.data,
        message: response.message || 'Thanh toán thành công',
      };
    } catch (error: any) {
      console.error('❌ Error paying bill:', error);
      return {
        success: false,
        error: error?.message || 'Không thể thanh toán',
      };
    }
  }
}

export default new WalletService();
