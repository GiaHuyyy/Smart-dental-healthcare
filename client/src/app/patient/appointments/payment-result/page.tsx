"use client";

import paymentService from "@/services/paymentService";
import { ArrowRight, CheckCircle, Loader2, XCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function PaymentResultPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<"success" | "failed" | "pending">("pending");
  const [paymentInfo, setPaymentInfo] = useState<any>(null);

  // MoMo callback parameters
  const partnerCode = searchParams.get("partnerCode");
  const orderId = searchParams.get("orderId");
  const requestId = searchParams.get("requestId");
  const amount = searchParams.get("amount");
  const orderInfo = searchParams.get("orderInfo");
  const resultCode = searchParams.get("resultCode");
  const message = searchParams.get("message");
  const transId = searchParams.get("transId");
  const extraData = searchParams.get("extraData");

  useEffect(() => {
    if (!resultCode || !orderId) {
      setLoading(false);
      setPaymentStatus("failed");
      return;
    }

    checkPaymentStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultCode, orderId]);

  const checkPaymentStatus = async () => {
    try {
      setLoading(true);

      // Parse extraData to get paymentId
      let paymentId: string | undefined;
      let appointmentId: string | undefined;

      if (extraData) {
        try {
          const parsed = JSON.parse(decodeURIComponent(extraData));
          paymentId = parsed.paymentId;
          appointmentId = parsed.appointmentId;
        } catch (error) {
          console.error("Failed to parse extraData:", error);
        }
      }

      // Clear localStorage for pending payment
      try {
        localStorage.removeItem('pending_payment_appointment');
      } catch (e) {
        console.error("Failed to clear localStorage:", e);
      }

      // resultCode = 0: Success, otherwise: Failed
      const status = resultCode === "0" ? "success" : "failed";
      setPaymentStatus(status);

      // Query payment info from backend
      if (orderId) {
        const accessToken = session?.access_token || (session as any)?.accessToken;
        
        try {
          const result = await paymentService.queryMoMoPayment(orderId, accessToken);
          
          if (result.success) {
            setPaymentInfo(result.data);
          }
        } catch (error) {
          console.error("Failed to query payment:", error);
          // Don't fail the whole process if query fails
        }
      }

      // Show toast with better messages
      if (status === "success") {
        toast.success("Thanh toán thành công!", {
          description: "Lịch hẹn của bạn đã được xác nhận. Vui lòng kiểm tra email hoặc thông báo.",
          duration: 5000,
        });
      } else {
        const errorMessage = message || "Thanh toán không thành công. Vui lòng thử lại.";
        toast.error("Thanh toán thất bại", {
          description: errorMessage,
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Check payment status error:", error);
      setPaymentStatus("failed");
      toast.error("Không thể kiểm tra trạng thái thanh toán", {
        description: "Vui lòng liên hệ hỗ trợ nếu bạn đã thanh toán thành công.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoToAppointments = () => {
    router.push("/patient/appointments/my-appointments");
  };

  const handleGoToPayments = () => {
    router.push("/patient/payments");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Đang xử lý thanh toán...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Result Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Icon */}
          <div className="text-center mb-6">
            {paymentStatus === "success" ? (
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
            ) : (
              <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
            )}

            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {paymentStatus === "success" ? "Thanh toán thành công!" : "Thanh toán thất bại"}
            </h1>

            <p className="text-gray-600">
              {paymentStatus === "success"
                ? "Cảm ơn bạn đã thanh toán. Lịch hẹn của bạn đã được xác nhận."
                : "Thanh toán không thành công. Vui lòng thử lại hoặc liên hệ hỗ trợ."}
            </p>
          </div>

          {/* Payment Details */}
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Thông tin thanh toán</h2>

            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-600">Mã đơn hàng:</dt>
                <dd className="text-gray-900 font-medium">{orderId || "N/A"}</dd>
              </div>

              {transId && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Mã giao dịch:</dt>
                  <dd className="text-gray-900 font-medium">{transId}</dd>
                </div>
              )}

              <div className="flex justify-between">
                <dt className="text-gray-600">Số tiền:</dt>
                <dd className="text-gray-900 font-medium">
                  {amount ? `${parseInt(amount).toLocaleString("vi-VN")} đ` : "N/A"}
                </dd>
              </div>

              <div className="flex justify-between">
                <dt className="text-gray-600">Nội dung:</dt>
                <dd className="text-gray-900 font-medium">{orderInfo || "Thanh toán lịch khám"}</dd>
              </div>

              <div className="flex justify-between">
                <dt className="text-gray-600">Trạng thái:</dt>
                <dd
                  className={`font-medium ${
                    paymentStatus === "success" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {paymentStatus === "success" ? "Thành công" : "Thất bại"}
                </dd>
              </div>

              {message && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Thông báo:</dt>
                  <dd className="text-gray-900 font-medium">{message}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Actions */}
          <div className="border-t border-gray-200 pt-6 mt-6 space-y-3">
            <button
              onClick={handleGoToAppointments}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Xem lịch hẹn của tôi
              <ArrowRight className="w-5 h-5" />
            </button>

            {paymentStatus === "success" && (
              <button
                onClick={handleGoToPayments}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Xem lịch sử thanh toán
              </button>
            )}

            {paymentStatus === "failed" && (
              <button
                onClick={() => router.push("/patient/appointments")}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Thử lại
              </button>
            )}
          </div>
        </div>

        {/* Support Info */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ:{" "}
            <a href="mailto:support@dentalcare.vn" className="text-blue-600 hover:underline">
              support@dentalcare.vn
            </a>{" "}
            hoặc hotline:{" "}
            <a href="tel:1900123456" className="text-blue-600 hover:underline">
              1900 123 456
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}


