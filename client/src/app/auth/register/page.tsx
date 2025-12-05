/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  User,
  Stethoscope,
  Upload,
  X,
  MapPin,
  Loader2,
  Sparkles,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { sendRequest } from "@/utils/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import tooth from "../../../../public/tooth.svg";

// Danh sách các dịch vụ chuyên môn phổ biến
const COMMON_SERVICES = [
  "Khám tổng quát",
  "Nhổ răng",
  "Trám răng",
  "Lấy cao răng",
  "Tẩy trắng răng",
  "Bọc răng sứ",
  "Niềng răng",
  "Implant",
  "Điều trị tủy",
  "Nhổ răng khôn",
  "Phục hình răng",
  "Chữa viêm nướu",
];

// Validation patterns
const VALIDATION = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^(0|\+84)[0-9]{9,10}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
};

// Required field label component
const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
  <span>
    {children} <span className="text-red-500">*</span>
  </span>
);

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
    // Doctor specific
    specialty: "",
    licenseNumber: "",
    experienceYears: "",
    qualifications: "",
    workAddress: "",
  });

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Avatar state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // License image state (for doctor)
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [licensePreview, setLicensePreview] = useState<string | null>(null);
  const licenseInputRef = useRef<HTMLInputElement>(null);

  // License verification state
  const [isVerifyingLicense, setIsVerifyingLicense] = useState(false);
  const [licenseVerification, setLicenseVerification] = useState<{
    isValid: boolean;
    confidence: number;
    message: string;
    details?: {
      documentType?: string;
      issuer?: string;
      licenseNumber?: string;
      holderName?: string;
      validityStatus?: string;
    };
  } | null>(null);

  // Services state
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [customService, setCustomService] = useState("");

  // Geocoding state
  const [isGeocodingLoading, setIsGeocodingLoading] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  // Handle avatar file selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ảnh đại diện không được vượt quá 5MB");
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle license file selection with AI verification
  const handleLicenseChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Ảnh chứng chỉ không được vượt quá 10MB");
        return;
      }

      // Set file and preview immediately
      setLicenseFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLicensePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Reset previous verification
      setLicenseVerification(null);
      setIsVerifyingLicense(true);

      // Verify license with AI
      const toastId = toast.loading("Đang xác thực chứng chỉ hành nghề bằng AI...");

      try {
        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/image-analysis/verify-license`, {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        toast.dismiss(toastId);

        if (result.success && result.data) {
          setLicenseVerification(result.data);

          if (result.data.isValid) {
            toast.success(result.data.message || "Chứng chỉ hành nghề hợp lệ!");

            // Auto-fill license number if detected
            if (result.data.details?.licenseNumber) {
              setFormData((prev) => {
                // Only auto-fill if not already filled
                if (!prev.licenseNumber) {
                  return {
                    ...prev,
                    licenseNumber: result.data.details.licenseNumber,
                  };
                }
                return prev;
              });
            }
          } else {
            toast.warning(result.data.message || "Ảnh không phải chứng chỉ hành nghề hợp lệ", {
              duration: 5000,
            });
          }
        } else {
          toast.error(result.error || "Không thể xác thực ảnh. Vui lòng thử lại.");
          setLicenseVerification({
            isValid: false,
            confidence: 0,
            message: result.error || "Không thể xác thực ảnh",
          });
        }
      } catch (error) {
        console.error("License verification error:", error);
        toast.dismiss(toastId);
        toast.error("Lỗi khi xác thực ảnh. Vui lòng thử lại.");
        setLicenseVerification({
          isValid: false,
          confidence: 0,
          message: "Lỗi kết nối. Vui lòng thử lại.",
        });
      } finally {
        setIsVerifyingLicense(false);
      }
    }
  };

  // Remove avatar
  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  };

  // Remove license
  const removeLicense = () => {
    setLicenseFile(null);
    setLicensePreview(null);
    setLicenseVerification(null);
    if (licenseInputRef.current) {
      licenseInputRef.current.value = "";
    }
  };

  // Toggle service selection
  const toggleService = (service: string) => {
    setSelectedServices((prev) => (prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]));
  };

  // Add custom service
  const addCustomService = () => {
    if (customService.trim() && !selectedServices.includes(customService.trim())) {
      setSelectedServices((prev) => [...prev, customService.trim()]);
      setCustomService("");
    }
  };

  // Remove service
  const removeService = (service: string) => {
    setSelectedServices((prev) => prev.filter((s) => s !== service));
  };

  // Geocode work address using AI (Gemini)
  const geocodeAddress = async (address: string) => {
    if (!address.trim()) {
      toast.error("Vui lòng nhập địa chỉ nơi làm việc");
      return;
    }

    setIsGeocodingLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/geocoding/geocode`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address }),
      });

      if (!response.ok) {
        throw new Error("Không thể kết nối đến server");
      }

      const data = await response.json();

      if (data.success && data.latitude && data.longitude) {
        setCoordinates({ lat: data.latitude, lng: data.longitude });
        toast.success(`Đã xác định tọa độ thành công!`);
        if (data.formattedAddress && data.formattedAddress !== address) {
          setFormData((prev) => ({ ...prev, workAddress: data.formattedAddress }));
        }
      } else {
        toast.error(data.error || "Không tìm thấy tọa độ cho địa chỉ này. Vui lòng nhập chi tiết hơn.");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      toast.error("Lỗi khi tìm tọa độ. Vui lòng thử lại.");
    } finally {
      setIsGeocodingLoading(false);
    }
  };

  // Upload image to Cloudinary
  const uploadImage = async (file: File, folder: string): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/cloudinary/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      return data.url || data.secure_url || null;
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate email
    if (!VALIDATION.email.test(formData.email)) {
      setErrors((prev) => ({ ...prev, email: "Email không hợp lệ" }));
      toast.error("Email không hợp lệ");
      return;
    }

    // Validate phone
    if (!VALIDATION.phone.test(formData.phone)) {
      setErrors((prev) => ({ ...prev, phone: "Số điện thoại không hợp lệ (VD: 0912345678)" }));
      toast.error("Số điện thoại không hợp lệ. VD: 0912345678 hoặc +84912345678");
      return;
    }

    // Validate password strength
    if (!VALIDATION.password.test(formData.password)) {
      setErrors((prev) => ({
        ...prev,
        password: "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số",
      }));
      toast.error("Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: "Mật khẩu xác nhận không khớp" }));
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    // Validate doctor-specific fields
    if (userType === "doctor") {
      if (!formData.specialty) {
        toast.error("Vui lòng nhập chuyên khoa");
        return;
      }
      if (!formData.licenseNumber) {
        toast.error("Vui lòng nhập số chứng chỉ hành nghề");
        return;
      }
      if (!licenseFile) {
        toast.error("Vui lòng tải lên ảnh chứng chỉ hành nghề");
        return;
      }
      // Check if license verification passed
      if (!licenseVerification?.isValid) {
        toast.error("Ảnh chứng chỉ hành nghề không hợp lệ. Vui lòng tải lên ảnh chứng chỉ/giấy phép hành nghề y tế.");
        return;
      }
      if (!formData.experienceYears) {
        toast.error("Vui lòng nhập số năm kinh nghiệm");
        return;
      }
      if (!formData.qualifications) {
        toast.error("Vui lòng nhập bằng cấp / học vị");
        return;
      }
      if (selectedServices.length === 0) {
        toast.error("Vui lòng chọn ít nhất một dịch vụ chuyên môn");
        return;
      }
      if (!formData.workAddress) {
        toast.error("Vui lòng nhập địa chỉ nơi làm việc");
        return;
      }
      if (!coordinates) {
        toast.error("Vui lòng xác định tọa độ địa chỉ làm việc bằng AI");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Upload avatar if selected
      let avatarUrl: string | null = null;
      if (avatarFile) {
        toast.loading("Đang tải ảnh đại diện...");
        avatarUrl = await uploadImage(avatarFile, "avatars");
        if (!avatarUrl) {
          toast.dismiss();
          toast.error("Không thể tải ảnh đại diện. Vui lòng thử lại.");
          setIsSubmitting(false);
          return;
        }
        toast.dismiss();
      }

      // Upload license image if selected (doctor only)
      let licenseImageUrl: string | null = null;
      if (userType === "doctor" && licenseFile) {
        toast.loading("Đang tải ảnh chứng chỉ...");
        licenseImageUrl = await uploadImage(licenseFile, "licenses");
        if (!licenseImageUrl) {
          toast.dismiss();
          toast.error("Không thể tải ảnh chứng chỉ. Vui lòng thử lại.");
          setIsSubmitting(false);
          return;
        }
        toast.dismiss();
      }

      const {
        fullName,
        email,
        phone,
        password,
        dateOfBirth,
        gender,
        address,
        specialty,
        licenseNumber,
        experienceYears,
        qualifications,
        workAddress,
      } = formData;

      const requestBody: any = {
        fullName,
        email,
        phone,
        password,
        dateOfBirth,
        gender,
        address,
        role: userType,
      };

      // Add avatar if uploaded
      if (avatarUrl) {
        requestBody.avatarUrl = avatarUrl;
      }

      // Add doctor-specific fields
      if (userType === "doctor") {
        requestBody.specialty = specialty;
        requestBody.licenseNumber = licenseNumber;
        if (licenseImageUrl) requestBody.licenseImageUrl = licenseImageUrl;
        if (experienceYears) requestBody.experienceYears = parseInt(experienceYears);
        if (qualifications) requestBody.qualifications = qualifications;
        if (selectedServices.length > 0) requestBody.services = selectedServices;
        requestBody.workAddress = workAddress;
        if (coordinates) {
          requestBody.latitude = coordinates.lat;
          requestBody.longitude = coordinates.lng;
        }
      }

      const res = await sendRequest<IBackendRes<any>>({
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/register`,
        method: "POST",
        body: requestBody,
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
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
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
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="flex items-center justify-center group">
            <div className="w-16 h-16 bg-linear-to-br from-blue-100 to-[#00a6f4] rounded-2xl flex items-center justify-center shadow-lg">
              <Image src={tooth} alt="Logo" width={40} height={40} />
            </div>
            <div className="ml-4">
              <span className="text-2xl font-bold text-primary">Smart Dental</span>
              <div className="text-sm text-gray-500 -mt-1">Healthcare Platform</div>
            </div>
          </Link>
          <div className="healthcare-card-elevated p-8 mt-8">
            <h2 className="healthcare-heading text-primary text-2xl text-center">Tạo tài khoản mới</h2>
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
                  ? "border-primary bg-blue-50 text-primary shadow-md"
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
                  ? "border-primary bg-blue-50 text-primary shadow-md"
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
                    <RequiredLabel>Họ và tên</RequiredLabel>
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    className={`w-full border rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                      errors.fullName ? "border-red-500" : "border-gray-200"
                    }`}
                    placeholder="Nhập họ và tên đầy đủ"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                  {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    <RequiredLabel>Email</RequiredLabel>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className={`w-full border rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                      errors.email ? "border-red-500" : "border-gray-200"
                    }`}
                    placeholder="Nhập địa chỉ email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                    <RequiredLabel>Số điện thoại</RequiredLabel>
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    className={`w-full border rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                      errors.phone ? "border-red-500" : "border-gray-200"
                    }`}
                    placeholder="Nhập số điện thoại (VD: 0912345678)"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-semibold text-gray-700 mb-2">
                    <RequiredLabel>Ngày sinh</RequiredLabel>
                  </label>
                  <input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-semibold text-gray-700 mb-2">
                    <RequiredLabel>Giới tính</RequiredLabel>
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
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
                    <RequiredLabel>Địa chỉ</RequiredLabel>
                  </label>
                  <input
                    id="address"
                    name="address"
                    type="text"
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    placeholder="Nhập địa chỉ đầy đủ"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Avatar Upload Section */}
            <div>
              <h3 className="healthcare-subheading mb-6 text-lg border-b border-gray-200 pb-2">Ảnh đại diện</h3>
              <div className="flex items-center gap-6">
                <div className="relative">
                  {avatarPreview ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
                      />
                      <button
                        type="button"
                        onClick={removeAvatar}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <User className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                </div>
                <div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    <Upload className="w-4 h-4" />
                    Chọn ảnh
                  </label>
                  <p className="text-xs text-gray-500 mt-2">PNG, JPG tối đa 5MB (Không bắt buộc)</p>
                </div>
              </div>
            </div>

            {/* Doctor-specific fields */}
            {userType === "doctor" && (
              <>
                {/* Professional Info */}
                <div>
                  <h3 className="healthcare-subheading mb-6 text-lg border-b border-gray-200 pb-2">
                    Thông tin nghề nghiệp
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="specialty" className="block text-sm font-semibold text-gray-700 mb-2">
                        <RequiredLabel>Chuyên khoa</RequiredLabel>
                      </label>
                      <input
                        id="specialty"
                        name="specialty"
                        type="text"
                        required
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                        placeholder="Ví dụ: Nha khoa tổng quát, Chỉnh nha..."
                        value={formData.specialty}
                        onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                      />
                    </div>

                    <div>
                      <label htmlFor="experienceYears" className="block text-sm font-semibold text-gray-700 mb-2">
                        <RequiredLabel>Kinh nghiệm (năm)</RequiredLabel>
                      </label>
                      <input
                        id="experienceYears"
                        name="experienceYears"
                        type="number"
                        min="0"
                        max="50"
                        required
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                        placeholder="Số năm kinh nghiệm"
                        value={formData.experienceYears}
                        onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="qualifications" className="block text-sm font-semibold text-gray-700 mb-2">
                        <RequiredLabel>Bằng cấp / Học vị</RequiredLabel>
                      </label>
                      <input
                        id="qualifications"
                        name="qualifications"
                        type="text"
                        required
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                        placeholder="Ví dụ: Bác sĩ Y khoa, Thạc sĩ Nha khoa, Tiến sĩ..."
                        value={formData.qualifications}
                        onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* License Info */}
                <div>
                  <h3 className="healthcare-subheading mb-6 text-lg border-b border-gray-200 pb-2">
                    Chứng chỉ hành nghề
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="licenseNumber" className="block text-sm font-semibold text-gray-700 mb-2">
                        <RequiredLabel>Số chứng chỉ hành nghề</RequiredLabel>
                      </label>
                      <input
                        id="licenseNumber"
                        name="licenseNumber"
                        type="text"
                        required
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                        placeholder="Nhập số chứng chỉ hành nghề"
                        value={formData.licenseNumber}
                        onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <RequiredLabel>Ảnh chứng chỉ hành nghề</RequiredLabel>
                      </label>
                      <div className="flex items-start gap-4">
                        {licensePreview ? (
                          <div className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={licensePreview}
                              alt="License preview"
                              className={`w-20 h-20 object-cover rounded-lg border-2 ${
                                isVerifyingLicense
                                  ? "border-blue-400 animate-pulse"
                                  : licenseVerification?.isValid
                                  ? "border-green-500"
                                  : licenseVerification
                                  ? "border-amber-500"
                                  : "border-gray-200"
                              }`}
                            />
                            {isVerifyingLicense && (
                              <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center">
                                <Loader2 className="w-6 h-6 text-white animate-spin" />
                              </div>
                            )}
                            {!isVerifyingLicense && licenseVerification && (
                              <div
                                className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center ${
                                  licenseVerification.isValid ? "bg-green-500" : "bg-amber-500"
                                }`}
                              >
                                {licenseVerification.isValid ? (
                                  <CheckCircle className="w-4 h-4 text-white" />
                                ) : (
                                  <AlertTriangle className="w-4 h-4 text-white" />
                                )}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={removeLicense}
                              disabled={isVerifyingLicense}
                              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition disabled:opacity-50"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                            <Upload className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <input
                            ref={licenseInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLicenseChange}
                            className="hidden"
                            id="license-upload"
                            disabled={isVerifyingLicense}
                          />
                          <label
                            htmlFor="license-upload"
                            className={`cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition ${
                              isVerifyingLicense ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                          >
                            {isVerifyingLicense ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Đang xác thực...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                Chọn ảnh
                              </>
                            )}
                          </label>
                          <p className="text-xs text-gray-500 mt-1">Tối đa 10MB • AI sẽ xác thực tự động</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Verification Result - Full width below both fields */}
                  {licenseVerification && !isVerifyingLicense && (
                    <div
                      className={`mt-4 p-3 rounded-lg text-sm ${
                        licenseVerification.isValid
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {licenseVerification.isValid ? (
                          <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{licenseVerification.message}</p>
                          {licenseVerification.isValid && licenseVerification.details && (
                            <div className="mt-2 text-xs opacity-80 grid grid-cols-1 md:grid-cols-3 gap-1">
                              {licenseVerification.details.documentType && (
                                <p>
                                  <span className="font-medium">Loại:</span> {licenseVerification.details.documentType}
                                </p>
                              )}
                              {licenseVerification.details.issuer && (
                                <p>
                                  <span className="font-medium">Cấp bởi:</span> {licenseVerification.details.issuer}
                                </p>
                              )}
                              {licenseVerification.details.licenseNumber && (
                                <p>
                                  <span className="font-medium">Số:</span> {licenseVerification.details.licenseNumber}
                                </p>
                              )}
                            </div>
                          )}
                          {!licenseVerification.isValid && (
                            <p className="mt-1 opacity-80">
                              Vui lòng tải lên ảnh chứng chỉ/giấy phép hành nghề y tế hợp lệ để tiếp tục đăng ký.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Services */}
                <div>
                  <h3 className="healthcare-subheading mb-6 text-lg border-b border-gray-200 pb-2">
                    <RequiredLabel>Dịch vụ chuyên môn</RequiredLabel>
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">Chọn ít nhất một dịch vụ mà bạn cung cấp</p>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {COMMON_SERVICES.map((service) => (
                        <button
                          key={service}
                          type="button"
                          onClick={() => toggleService(service)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                            selectedServices.includes(service)
                              ? "bg-primary text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {service}
                        </button>
                      ))}
                    </div>

                    {/* Selected services */}
                    {selectedServices.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Đã chọn:</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedServices.map((service) => (
                            <span
                              key={service}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-primary rounded-full text-sm"
                            >
                              {service}
                              <button
                                type="button"
                                onClick={() => removeService(service)}
                                className="hover:text-red-500 transition"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add custom service */}
                    <div className="flex gap-2 mt-4">
                      <input
                        type="text"
                        placeholder="Thêm dịch vụ khác..."
                        value={customService}
                        onChange={(e) => setCustomService(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomService();
                          }
                        }}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={addCustomService}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                      >
                        Thêm
                      </button>
                    </div>
                  </div>
                </div>

                {/* Work Address with Geocoding */}
                <div>
                  <h3 className="healthcare-subheading mb-6 text-lg border-b border-gray-200 pb-2">
                    Địa chỉ nơi làm việc
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="workAddress" className="block text-sm font-semibold text-gray-700 mb-2">
                        <RequiredLabel>Địa chỉ phòng khám / bệnh viện</RequiredLabel>
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="workAddress"
                          name="workAddress"
                          type="text"
                          required
                          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                          placeholder="Ví dụ: 123 Đường Nguyễn Huệ, Quận 1, TP.HCM"
                          value={formData.workAddress}
                          onChange={(e) => {
                            setFormData({ ...formData, workAddress: e.target.value });
                            setCoordinates(null); // Reset coordinates when address changes
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => geocodeAddress(formData.workAddress)}
                          disabled={isGeocodingLoading || !formData.workAddress}
                          className="px-4 py-3 bg-linear-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isGeocodingLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Sparkles className="w-5 h-5" />
                          )}
                          AI Xác định
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Nhập địa chỉ chi tiết rồi nhấn &quot;AI Xác định&quot; để lấy tọa độ chính xác bằng AI
                      </p>
                    </div>

                    {/* Show coordinates if available */}
                    {coordinates && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                        <div className="flex items-center gap-2 text-green-700">
                          <MapPin className="w-5 h-5" />
                          <span className="font-medium">Đã xác định tọa độ thành công</span>
                        </div>
                        <p className="text-sm text-green-600 mt-1">
                          Vĩ độ: {coordinates.lat.toFixed(6)} | Kinh độ: {coordinates.lng.toFixed(6)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Password Section */}
            <div>
              <h3 className="healthcare-subheading mb-6 text-lg border-b border-gray-200 pb-2">Thông tin bảo mật</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      placeholder="Tối thiểu 8 ký tự, chữ hoa, chữ thường, số"
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
                  <p className="text-xs text-gray-500 mt-1">Ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số</p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                    <RequiredLabel>Xác nhận mật khẩu</RequiredLabel>
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      className={`w-full border rounded-xl px-4 py-3 pr-12 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                        errors.confirmPassword ? "border-red-500" : "border-gray-200"
                      }`}
                      placeholder="Nhập lại mật khẩu"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-primary transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-healthcare-primary w-full py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                {isSubmitting ? "Đang xử lý..." : `Tạo tài khoản ${userType === "doctor" ? "Bác sĩ" : "Bệnh nhân"}`}
              </button>
            </div>

            {/* Login Link */}
            <div className="text-center pt-4">
              <p className="text-sm text-gray-600">
                Đã có tài khoản?{" "}
                <Link href="/auth/login" className="font-semibold text-primary hover:opacity-90 transition-colors">
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
