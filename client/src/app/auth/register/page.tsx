/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, User, Stethoscope, Smile } from "lucide-react";
import { sendRequest } from "@/utils/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function RegisterPage() {
  const [userType, setUserType] = useState("patient");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    specialty: "",
    licenseNumber: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    const { fullName, email, phone, password, dateOfBirth, gender, address, specialty, licenseNumber } = formData;
    const res = await sendRequest<IBackendRes<any>>({
      url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/register`,
      method: "POST",
      body: {
        fullName,
        email,
        phone,
        password,
        dateOfBirth,
        gender,
        address,
        specialty,
        licenseNumber,
        role: userType,
      },
    });

    if (res.error) {
      toast.error(res.message);
    } else {
      toast.success("Đăng ký thành công");
      const userId = res.data?._id || (res as any)._id;
      if (userId) {
        router.push(`/auth/verify/${userId}`);
      } else {
        toast.error("Không thể lấy ID người dùng");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 to-indigo-50/20 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
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
            <h2 className="healthcare-heading text-2xl text-center">Tạo tài khoản mới</h2>
            <p className="healthcare-body text-center mt-2">Điền thông tin để tham gia hệ thống chăm sóc sức khỏe</p>
          </div>
        </div>

        {/* User Type Selection */}
        <div className="healthcare-card-elevated p-6 mb-8">
          <div className="flex space-x-4">
            <button
              type="button"
              className={`flex-1 py-4 px-4 rounded-xl border-2 transition-all duration-200 ${
                userType === "patient"
                  ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-blue-50 hover:border-blue-300"
              }`}
              onClick={() => setUserType("patient")}
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
              onClick={() => setUserType("doctor")}
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
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit}>
          <div className="healthcare-card-elevated p-8 space-y-8">
            {/* Basic Information Section */}
            <div>
              <h3 className="healthcare-subheading mb-6 text-lg border-b border-gray-200 pb-2">Thông tin cơ bản</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 mb-2">
                    Họ và tên *
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Nhập họ và tên đầy đủ"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Nhập địa chỉ email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                    Số điện thoại *
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Nhập số điện thoại"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-semibold text-gray-700 mb-2">
                    Ngày sinh *
                  </label>
                  <input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-semibold text-gray-700 mb-2">
                    Giới tính *
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="">Chọn giới tính</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="address" className="block text-sm font-semibold text-gray-700 mb-2">
                    Địa chỉ *
                  </label>
                  <input
                    id="address"
                    name="address"
                    type="text"
                    required
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Nhập địa chỉ đầy đủ"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Doctor-specific fields */}
            {userType === "doctor" && (
              <div>
                <h3 className="healthcare-subheading mb-6 text-lg border-b border-gray-200 pb-2">
                  Thông tin nghề nghiệp
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="specialty" className="block text-sm font-semibold text-gray-700 mb-2">
                      Chuyên khoa *
                    </label>
                    <input
                      id="specialty"
                      name="specialty"
                      type="text"
                      required
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Ví dụ: Nha khoa tổng quát, Chỉnh hình..."
                      value={formData.specialty}
                      onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor="licenseNumber" className="block text-sm font-semibold text-gray-700 mb-2">
                      Số chứng chỉ hành nghề *
                    </label>
                    <input
                      id="licenseNumber"
                      name="licenseNumber"
                      type="text"
                      required
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Nhập số chứng chỉ hành nghề"
                      value={formData.licenseNumber}
                      onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Password Section */}
            <div>
              <h3 className="healthcare-subheading mb-6 text-lg border-b border-gray-200 pb-2">Thông tin bảo mật</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    Mật khẩu *
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-12 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Tối thiểu 6 ký tự"
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

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                    Xác nhận mật khẩu *
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-12 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Nhập lại mật khẩu"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button type="submit" className="btn-healthcare-primary w-full py-4 text-lg font-semibold">
                Tạo tài khoản {userType === "doctor" ? "Bác sĩ" : "Bệnh nhân"}
              </button>
            </div>

            {/* Login Link */}
            <div className="text-center pt-4">
              <p className="text-sm text-gray-600">
                Đã có tài khoản?{" "}
                <Link href="/auth/login" className="font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                  Đăng nhập ngay
                </Link>
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
