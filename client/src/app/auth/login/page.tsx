"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authenticate } from "@/utils/actions";
import { toast } from "sonner";

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
          router.push("/auth/verify");
        }
      } else {
        toast.success("Đăng nhập thành công");
        router.push(`/${userType}`);
      }
      localStorage.setItem("userType", userType);
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
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nhập mật khẩu"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
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
                <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:text-blue-800">
                  Quên mật khẩu?
                </Link>
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
    </div>
  );
}
