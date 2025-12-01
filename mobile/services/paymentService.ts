import { apiRequest } from '@/utils/api';

export interface MoMoPaymentRequest {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  amount: number;
  orderInfo: string;
}

export interface MoMoPaymentResponse {
  success: boolean;
  message: string;
  data?: {
    payUrl: string;
    orderId: string;
    requestId: string;
  };
}

class PaymentService {
  async createMoMoPayment(
    data: MoMoPaymentRequest,
    token: string
  ): Promise<MoMoPaymentResponse> {
    try {
      const response = await apiRequest<any>('/payments/momo/create', {
        method: 'POST',
        token,
        body: data,
      });

      // Response structure from API
      return {
        success: true,
        message: response.message || 'Tạo thanh toán thành công',
        data: response.data || response,
      };
    } catch (error: any) {
      console.error('❌ MoMo payment error:', error);
      throw new Error(error?.message || 'Không thể tạo thanh toán MoMo');
    }
  }

  async checkPaymentStatus(orderId: string, token: string): Promise<any> {
    try {
      const response = await apiRequest(`/payments/momo/status/${orderId}`, {
        method: 'GET',
        token,
      });

      return response;
    } catch (error: any) {
      console.error('❌ Payment status check error:', error);
      throw new Error(error?.message || 'Không thể kiểm tra trạng thái thanh toán');
    }
  }

  async createMoMoPaymentFromExisting(
    paymentId: string,
    token: string
  ): Promise<MoMoPaymentResponse> {
    try {
      const response = await apiRequest<any>(`/payments/momo/create-from-payment/${paymentId}`, {
        method: 'POST',
        token,
      });

      return {
        success: true,
        message: response.message || 'Tạo thanh toán thành công',
        data: response.data || response,
      };
    } catch (error: any) {
      console.error('❌ MoMo payment from existing error:', error);
      throw new Error(error?.message || 'Không thể tạo thanh toán MoMo');
    }
  }
}

export default new PaymentService();
