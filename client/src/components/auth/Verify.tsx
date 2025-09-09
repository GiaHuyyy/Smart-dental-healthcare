/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sendRequest } from "@/utils/api";

interface VerifyProps {
  id: string | undefined;
}

export default function Verify({ id }: VerifyProps) {
  const router = useRouter();
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Handle case where id is not available
  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Lỗi</h1>
          <p className="text-gray-600 mt-2">ID xác thực không hợp lệ</p>
          <Link
            href="/auth/register"
            className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Quay lại đăng ký
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificationCode.trim()) {
      toast.error("Vui lòng nhập mã xác thực");
      return;
    }

    setIsLoading(true);

    try {
      const res = await sendRequest<IBackendRes<any>>({
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/check-code`,
        method: "POST",
        body: {
          id,
          code: verificationCode.trim(),
        },
      });

      console.log("Verification response:", res);
      // Handle both wrapped and unwrapped response formats
      if (res && !res.error && (res.data || (res as any)._id || res.message)) {
        toast.success("Xác thực thành công! Tài khoản đã được kích hoạt.");
        router.push("/auth/login");
      } else {
        toast.error(res?.message || "Mã xác thực không đúng hoặc đã hết hạn");
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("Có lỗi xảy ra khi xác thực");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);

    try {
      const res = await sendRequest<IBackendRes<any>>({
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/retry-active`,
        method: "POST",
        body: {
          id,
        },
      });

      if (res?.statusCode === 201) {
        toast.success("Mã xác thực mới đã được gửi đến email của bạn");
      } else {
        toast.error(res?.message || "Không thể gửi lại mã xác thực");
      }
    } catch (error) {
      console.error("Resend error:", error);
      toast.error("Có lỗi xảy ra khi gửi lại mã xác thực");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="flex items-center justify-center">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-2xl">🦷</span>
            </div>
            <span className="ml-3 text-2xl font-bold text-gray-900">Smart Dental</span>
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Xác thực tài khoản</h2>
          <p className="mt-2 text-sm text-gray-600">Nhập mã xác thực đã được gửi đến email của bạn</p>
        </div>

        {/* Verification Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="bg-white p-8 rounded-lg shadow">
            {/* Email Icon */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📧</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Kiểm tra email của bạn</h3>
              <p className="text-sm text-gray-600 mt-2">Chúng tôi đã gửi mã xác thực đến email của bạn</p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                  Mã xác thực
                </label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  required
                  maxLength={36}
                  placeholder="Nhập mã xác thực"
                  className="w-full text-center text-2xl font-mono border border-gray-300 rounded-md px-3 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tracking-widest"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-yellow-400">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-800">
                      Mã xác thực có hiệu lực trong <strong>60 phút</strong>. Nếu không nhận được email, hãy kiểm tra
                      thư mục spam.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-white font-medium bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Đang xác thực..." : "Xác thực tài khoản"}
              </button>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Không nhận được mã?{" "}
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isResending}
                    className="font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  >
                    {isResending ? "Đang gửi..." : "Gửi lại"}
                  </button>
                </p>
              </div>

              <div className="text-center">
                <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-800">
                  ← Quay lại đăng nhập
                </Link>
              </div>
            </div>
          </div>
        </form>

        {/* Help Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-3">Cần hỗ trợ?</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              📞 Hotline: <strong className="text-blue-600">1900 1234</strong>
            </p>
            <p>
              📧 Email: <strong className="text-blue-600">support@smartdental.vn</strong>
            </p>
            <p>🕒 Thời gian hỗ trợ: 8:00 - 22:00 hàng ngày</p>
          </div>
        </div>
      </div>
    </div>
  );
}
