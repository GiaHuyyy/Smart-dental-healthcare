import { sendRequest } from "@/utils/api";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";

export interface CreateMoMoPaymentRequest {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  amount: number;
  orderInfo?: string;
}

export interface MoMoPaymentResponse {
  success: boolean;
  data?: {
    paymentId: string;
    orderId: string;
    payUrl: string;
    deeplink?: string;
    qrCodeUrl?: string;
  };
  // Some API variants return a `momo` object with alternative fields
  momo?: {
    payUrl?: string;
    deeplink?: string;
    deeplinkMiniApp?: string;
  };
  message: string;
}

export interface Payment {
  _id: string;
  patientId: string;
  doctorId: string;
  amount: number;
  status: "pending" | "completed" | "failed" | "refunded";
  type: "appointment" | "treatment" | "medicine" | "other";
  refId: string;
  refModel: string;
  paymentDate?: string;
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const paymentService = {
  /**
   * Tạo thanh toán MoMo cho appointment
   */
  async createMoMoPayment(request: CreateMoMoPaymentRequest, accessToken?: string): Promise<MoMoPaymentResponse> {
    try {
      const response = await sendRequest<MoMoPaymentResponse>({
        url: `${BACKEND_URL}/api/v1/payments/momo/create`,
        method: "POST",
        body: request,
        headers: {
          Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
        },
      });

      return response as MoMoPaymentResponse;
    } catch (error: any) {
      console.error("Create MoMo payment error:", error);
      return {
        success: false,
        message: error.message || "Không thể tạo thanh toán MoMo",
      };
    }
  },

  /**
   * Tạo thanh toán MoMo từ payment đã tồn tại (dùng cho trang payments)
   */
  async createMoMoPaymentFromExisting(paymentId: string, accessToken?: string): Promise<MoMoPaymentResponse> {
    try {
      const response = await sendRequest<MoMoPaymentResponse>({
        url: `${BACKEND_URL}/api/v1/payments/momo/create-from-payment/${paymentId}`,
        method: "POST",
        headers: {
          Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
        },
      });

      return response as MoMoPaymentResponse;
    } catch (error: any) {
      console.error("Create MoMo payment from existing error:", error);
      return {
        success: false,
        message: error.message || "Không thể tạo thanh toán MoMo",
      };
    }
  },

  /**
   * Query payment status
   */
  async queryMoMoPayment(orderId: string, accessToken?: string): Promise<any> {
    try {
      const response = await sendRequest({
        url: `${BACKEND_URL}/api/v1/payments/momo/query/${orderId}`,
        method: "GET",
        headers: {
          Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
        },
      });

      return response;
    } catch (error: any) {
      console.error("Query MoMo payment error:", error);
      return {
        success: false,
        message: error.message || "Không thể truy vấn trạng thái thanh toán",
      };
    }
  },

  /**
   * Get payment by ID
   */
  async getPaymentById(
    paymentId: string,
    accessToken?: string
  ): Promise<{ success: boolean; data?: Payment; message?: string }> {
    try {
      const response = await sendRequest({
        url: `${BACKEND_URL}/api/v1/payments/${paymentId}`,
        method: "GET",
        headers: {
          Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
        },
      });

      return response as any;
    } catch (error: any) {
      console.error("Get payment error:", error);
      return {
        success: false,
        message: error.message || "Không thể lấy thông tin thanh toán",
      };
    }
  },

  /**
   * Get payments by patient
   */
  async getPaymentsByPatient(
    patientId: string,
    accessToken?: string
  ): Promise<{ success: boolean; data?: Payment[]; message?: string }> {
    try {
      const response = await sendRequest({
        url: `${BACKEND_URL}/api/v1/payments/patient/${patientId}`,
        method: "GET",
        headers: {
          Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
        },
      });

      return response as any;
    } catch (error: any) {
      console.error("Get patient payments error:", error);
      return {
        success: false,
        message: error.message || "Không thể lấy danh sách thanh toán",
      };
    }
  },

  /**
   * Get payments by doctor
   */
  async getPaymentsByDoctor(
    doctorId: string,
    accessToken?: string
  ): Promise<{ success: boolean; data?: Payment[]; message?: string }> {
    try {
      const response = await sendRequest({
        url: `${BACKEND_URL}/api/v1/payments/doctor/${doctorId}`,
        method: "GET",
        headers: {
          Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
        },
      });

      return response as any;
    } catch (error: any) {
      console.error("Get doctor payments error:", error);
      return {
        success: false,
        message: error.message || "Không thể lấy danh sách thanh toán",
      };
    }
  },
};

export default paymentService;
