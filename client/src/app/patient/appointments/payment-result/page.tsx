"use client";

import paymentService from "@/services/paymentService";
import { ArrowRight, CheckCircle, Loader2, XCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function PaymentResultPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<"success" | "failed" | "pending">("pending");
  const [paymentInfo, setPaymentInfo] = useState<{
    payment?: unknown;
    momoStatus?: unknown;
  } | null>(null);

  // MoMo callback parameters (read from URL on mount)
  const [orderId, setOrderId] = useState<string | null>(null);
  const [amount, setAmount] = useState<string | null>(null);
  const [orderInfo, setOrderInfo] = useState<string | null>(null);
  const [resultCode, setResultCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [transId, setTransId] = useState<string | null>(null);
  const [extraData, setExtraData] = useState<string | null>(null);

  // Read query params client-side on mount to avoid useSearchParams prerender bailout
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setOrderId(params.get("orderId"));
    setAmount(params.get("amount"));
    setOrderInfo(params.get("orderInfo"));
    setResultCode(params.get("resultCode"));
    setMessage(params.get("message"));
    setTransId(params.get("transId"));
    setExtraData(params.get("extraData"));
  }, []);

  useEffect(() => {
    if (!resultCode || !orderId) {
      setLoading(false);
      setPaymentStatus("failed");
      return;
    }

    checkPaymentStatus();
    
    // 🔥 CRITICAL: Poll payment status every 3 seconds for up to 30 seconds
    // This ensures we catch the payment update even if callback is slow
    let pollCount = 0;
    const maxPolls = 10; // 10 times * 3 seconds = 30 seconds
    
    const pollInterval = setInterval(async () => {
      pollCount++;
      console.log(`🔄 Polling payment status... (${pollCount}/${maxPolls})`);
      
      if (pollCount >= maxPolls) {
        clearInterval(pollInterval);
        console.log('⏹️ Stopped polling after 30 seconds');
        return;
      }
      
      // Query payment status
      if (orderId) {
        try {
          const sessionAny = session as unknown as { access_token?: string; accessToken?: string };
          const accessToken = sessionAny?.access_token || sessionAny?.accessToken;
          
          const result = await paymentService.queryMoMoPayment(orderId, accessToken);
          
          if (result.success && result.data?.payment) {
            const backendPayment = result.data.payment as any;
            console.log(`📊 Poll ${pollCount}: Payment status =`, backendPayment.status);
            
            // If payment is completed or failed, stop polling
            if (backendPayment.status === 'completed') {
              setPaymentStatus('success');
              setPaymentInfo(result.data);
              clearInterval(pollInterval);
              
              toast.success("Thanh toán đã được xác nhận!", {
                description: "Hệ thống đã ghi nhận thanh toán của bạn.",
                duration: 3000,
              });
              
              console.log('✅ Payment completed, stopped polling');
            } else if (backendPayment.status === 'failed') {
              setPaymentStatus('failed');
              setPaymentInfo(result.data);
              clearInterval(pollInterval);
              console.log('❌ Payment failed, stopped polling');
            }
          }
        } catch (error) {
          console.error(`❌ Poll ${pollCount} error:`, error);
        }
      }
    }, 3000); // Poll every 3 seconds
    
    // Cleanup
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultCode, orderId, session]);

  const checkPaymentStatus = async () => {
    try {
      setLoading(true);
      console.log("🔍 Checking payment status...", { resultCode, orderId });

      // Parse extraData to get paymentId
      let paymentId: string | undefined;
      let appointmentId: string | undefined;

      if (extraData) {
        try {
          const parsed = JSON.parse(decodeURIComponent(extraData));
          paymentId = parsed.paymentId;
          appointmentId = parsed.appointmentId;
          console.log("📦 Parsed extraData:", { paymentId, appointmentId });
        } catch (error) {
          console.error("❌ Failed to parse extraData:", error);
        }
      }

      // Clear localStorage for pending payment
      try {
        localStorage.removeItem("pending_payment_appointment");
      } catch (e) {
        console.error("Failed to clear localStorage:", e);
      }

      // resultCode = 0: Success, otherwise: Failed
      const status = resultCode === "0" ? "success" : "failed";
      console.log(`${status === "success" ? "✅" : "❌"} Payment status:`, status);
      setPaymentStatus(status);

      // 🔥 CRITICAL: Manually trigger callback processing if resultCode = 0
      if (status === "success" && orderId) {
        const sessionAny = session as unknown as { access_token?: string; accessToken?: string };
        const accessToken = sessionAny?.access_token || sessionAny?.accessToken;
        
        console.log("🔔 Manually triggering payment processing...");
        
        try {
          // DEVELOPMENT: Simulate callback since localhost can't receive MoMo callback
          const simulateUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081'}/api/v1/payments/simulate-callback/${orderId}`;
          
          console.log("📞 Calling simulate-callback:", simulateUrl);
          
          const simulateResponse = await fetch(simulateUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ resultCode: 0 }),
          });
          
          const simulateResult = await simulateResponse.json();
          console.log("💰 Simulate callback result:", simulateResult);
          
          if (simulateResult.success) {
            console.log("✅ Payment callback processed successfully");
            toast.success("Thanh toán đã được xử lý", {
              description: "Hệ thống đang cập nhật thông tin...",
              duration: 2000,
            });
          } else {
            console.warn("⚠️ Callback simulation unsuccessful:", simulateResult.message);
          }
        } catch (error) {
          console.error("❌ Failed to simulate callback:", error);
          // Don't fail the whole process
        }
      }

      // 🔥 Query payment info from backend to get latest status
      if (orderId) {
        const sessionAny = session as unknown as { access_token?: string; accessToken?: string };
        const accessToken = sessionAny?.access_token || sessionAny?.accessToken;

        console.log("🔄 Querying payment status from backend...");
        try {
          // Wait a bit for processing
          await new Promise((resolve) => setTimeout(resolve, 2000));

          const result = await paymentService.queryMoMoPayment(orderId, accessToken);
          console.log("📊 Backend query result:", result);

          if (result.success && result.data) {
            setPaymentInfo(result.data);

            // Update status based on backend data
            const backendPayment = result.data.payment as any;
            if (backendPayment) {
              console.log("💾 Backend payment status:", backendPayment.status);
              if (backendPayment.status === "completed") {
                setPaymentStatus("success");
              } else if (backendPayment.status === "failed") {
                setPaymentStatus("failed");
              }
            }
          }
        } catch (error) {
          console.error("❌ Failed to query payment:", error);
          // Don't fail the whole process if query fails
        }
      }

      // Show toast with better messages
      if (status === "success") {
        toast.success("Thanh toán thành công!", {
          description: "Lịch hẹn của bạn đã được xác nhận. Doanh thu đã được ghi nhận.",
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
      console.error("❌ Check payment status error:", error);
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
                <dd className={`font-medium ${paymentStatus === "success" ? "text-green-600" : "text-red-600"}`}>
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
