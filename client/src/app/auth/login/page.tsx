"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authenticate } from "@/utils/actions";
import { toast } from "sonner";
import { getSession } from "next-auth/react";
import { Eye, EyeOff, User, Stethoscope } from "lucide-react";
import ModalReactive from "@/components/auth/ModalReactive";
import ModalForgotPassword from "@/components/auth/ModalForgotPassword";
import Image from "next/image";
import tooth from "../../../../public/tooth.svg";

// Validation patterns
const VALIDATION = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

// Required field label component
const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
  <span>
    {children} <span className="text-red-500">*</span>
  </span>
);

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setErrors({});

    // Validate email
    if (!VALIDATION.email.test(formData.email)) {
      setErrors((prev) => ({ ...prev, email: "Email không hợp lệ" }));
      toast.error("Email không hợp lệ");
      setIsLoading(false);
      return;
    }

    // Validate password not empty
    if (!formData.password || formData.password.length < 6) {
      setErrors((prev) => ({ ...prev, password: "Mật khẩu phải có ít nhất 6 ký tự" }));
      toast.error("Mật khẩu phải có ít nhất 6 ký tự");
      setIsLoading(false);
      return;
    }

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
    <div
      className="min-h-screen bg-linear-to-br flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      style={{
        backgroundColor: "var(--color-primary-50)",
        backgroundImage:
          "linear-gradient(135deg, var(--color-primary-50) 0%, rgba(var(--color-primary-rgb), 0.06) 50%, var(--color-primary) 100%)",
      }}
    >
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="flex items-center justify-center group">
            <div className="w-16 h-16 bg-linear-to-br from-blue-100 to-[#00a6f4] rounded-2xl flex items-center justify-center shadow-lg">
              <Image src={tooth} alt="logo" width={40} height={40} />
            </div>
            <div className="ml-4">
              <span className="text-2xl font-bold text-primary">Smart Dental</span>
              <div className="text-sm text-gray-500 -mt-1">Healthcare Platform</div>
            </div>
          </Link>
          <div className="healthcare-card-elevated p-8 mt-8">
            <h2 className="healthcare-heading text-2xl text-primary text-center">Đăng nhập hệ thống</h2>
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
                  ? "border-primary bg-blue-50 text-primary shadow-md"
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
                  ? "border-primary bg-blue-50 text-primary shadow-md"
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
                    <RequiredLabel>Địa chỉ Email</RequiredLabel>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className={`w-full border rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                      errors.email ? "border-red-500" : "border-gray-200"
                    }`}
                    placeholder="Nhập địa chỉ email của bạn"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    <RequiredLabel>Mật khẩu</RequiredLabel>
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      className={`w-full border rounded-xl px-4 py-3 pr-12 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                        errors.password ? "border-red-500" : "border-gray-200"
                      }`}
                      placeholder="Nhập mật khẩu của bạn"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
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
                    className="text-sm text-primary hover:text-primary font-medium transition-colors"
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
                    className="font-semibold text-primary hover:text-primary transition-colors"
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
