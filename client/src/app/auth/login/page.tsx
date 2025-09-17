"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authenticate } from "@/utils/actions";
import { toast } from "sonner";
import { getSession } from "next-auth/react";
import { Eye, EyeOff, User, Stethoscope, Smile } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 to-indigo-50/20 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="flex items-center justify-center group">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <Smile className="text-white w-8 h-8" />
            </div>
            <div className="ml-4">
              <span className="text-2xl font-bold text-gray-900">Smart Dental</span>
              <div className="text-sm text-gray-500 -mt-1">Healthcare Platform</div>
            </div>
          </Link>
          <div className="healthcare-card-elevated p-8 mt-8">
            <h2 className="healthcare-heading text-2xl text-center">Đăng nhập hệ thống</h2>
            <p className="healthcare-body text-center mt-2">Vui lòng chọn loại tài khoản và đăng nhập</p>
          </div>
        </div>

        {/* User Type Selection */}
        <div className="healthcare-card-elevated p-6">
          <div className="flex space-x-4 mb-6">
            <button
              type="button"
              className={`flex-1 py-4 px-4 rounded-xl border-2 transition-all duration-200 ${
                userType === "patient"
                  ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-blue-50 hover:border-blue-300"
              }`}
              onClick={() => (setUserType("patient"), setFormData({ ...formData, email: "", password: "" }))}
            >
              <div className="text-center">
                <div
                  className={`w-12 h-12 mx-auto mb-2 rounded-lg flex items-center justify-center ${
                    userType === "patient" ? "bg-blue-100" : "bg-gray-100"
                  }`}
                >
                  <User className="w-6 h-6" />
                </div>
                <p className="font-semibold">Bệnh nhân</p>
                <p className="text-xs text-gray-500 mt-1">Đặt lịch & theo dõi sức khỏe</p>
              </div>
            </button>
            <button
              type="button"
              className={`flex-1 py-4 px-4 rounded-xl border-2 transition-all duration-200 ${
                userType === "doctor"
                  ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-blue-50 hover:border-blue-300"
              }`}
              onClick={() => (setUserType("doctor"), setFormData({ ...formData, email: "", password: "" }))}
            >
              <div className="text-center">
                <div
                  className={`w-12 h-12 mx-auto mb-2 rounded-lg flex items-center justify-center ${
                    userType === "doctor" ? "bg-blue-100" : "bg-gray-100"
                  }`}
                >
                  <Stethoscope className="w-6 h-6" />
                </div>
                <p className="font-semibold">Bác sĩ</p>
                <p className="text-xs text-gray-500 mt-1">Quản lý bệnh nhân & điều trị</p>
              </div>
            </button>
          </div>

          {/* Login Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="healthcare-card-elevated p-8">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Địa chỉ Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Nhập địa chỉ email của bạn"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-12 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Nhập mật khẩu của bạn"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
                    <label htmlFor="remember-me" className="ml-3 block text-sm text-gray-700 font-medium">
                      Ghi nhớ đăng nhập
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordModalOpen(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
              </div>

              <div className="mt-8">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`btn-healthcare-primary w-full py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
                    isLoading ? "animate-pulse" : ""
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Đang đăng nhập...
                    </>
                  ) : (
                    `Đăng nhập ${userType === "doctor" ? "Bác sĩ" : "Bệnh nhân"}`
                  )}
                </button>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Chưa có tài khoản?{" "}
                  <Link
                    href="/auth/register"
                    className="font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                  >
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
    </div>
  );
}
