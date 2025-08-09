"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authenticate } from "@/utils/actions";
import { toast } from "sonner";
import { getSession } from "next-auth/react";
import ModalReactive from "@/components/auth/ModalReactive";
import ModalForgotPassword from "@/components/auth/ModalForgotPassword";

export default function LoginPage() {
  const router = useRouter();
  const [userType, setUserType] = useState("patient");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Simulate login API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const { email, password } = formData;
      const res = await authenticate(email, password, userType);

      if (res.error) {
        toast.error(res.error);
        if (res.code === 2) {
          setIsModalOpen(true);
        }
      } else {
        toast.success("Đăng nhập thành công");
        // Force session update
        await getSession();
        router.push(`/${userType}`);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setIsLoading(false);
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
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Đăng nhập tài khoản</h2>
          <p className="mt-2 text-sm text-gray-600">Chọn loại tài khoản để tiếp tục</p>
        </div>

        {/* User Type Selection */}
        <div className="flex space-x-4">
          <button
            type="button"
            className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
              userType === "patient"
                ? "border-green-500 bg-green-50 text-green-700"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
            onClick={() => (setUserType("patient"), setFormData({ ...formData, email: "", password: "" }))}
          >
            <div className="text-center">
              <span className="text-2xl">👤</span>
              <p className="mt-1 font-medium">Bệnh nhân</p>
            </div>
          </button>
          <button
            type="button"
            className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
              userType === "doctor"
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
            onClick={() => (setUserType("doctor"), setFormData({ ...formData, email: "", password: "" }))}
          >
            <div className="text-center">
              <span className="text-2xl">👨‍⚕️</span>
              <p className="mt-1 font-medium">Bác sĩ</p>
            </div>
          </button>
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="bg-white p-8 rounded-lg shadow">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nhập email của bạn"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nhập mật khẩu"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                        />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={formData.rememberMe}
                    onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Ghi nhớ đăng nhập
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordModalOpen(true)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Quên mật khẩu?
                </button>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  userType === "patient"
                    ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                    : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                }`}
              >
                {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Chưa có tài khoản?{" "}
                <Link href="/auth/register" className="font-medium text-blue-600 hover:text-blue-800">
                  Đăng ký ngay
                </Link>
              </p>
            </div>
          </div>
        </form>
      </div>

      {/* Modal for reactive form */}
      <ModalReactive isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen} userEmail={formData.email} />

      {/* Modal for forgot password */}
      <ModalForgotPassword isModalOpen={isForgotPasswordModalOpen} setIsModalOpen={setIsForgotPasswordModalOpen} />
    </div>
  );
}
