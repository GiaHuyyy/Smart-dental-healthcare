"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { sendRequest } from "@/utils/api";
import { Settings, User, Lock, Save, Eye, EyeOff, Camera, Loader2, Bell, Shield, Upload, X } from "lucide-react";
import { toast } from "sonner";

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

// Required field label component
const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
  <span>
    {children} <span className="text-red-500">*</span>
  </span>
);

// Tính ngày sinh tối đa (18 tuổi)
const getMaxDateOfBirth = () => {
  const today = new Date();
  today.setFullYear(today.getFullYear() - 18);
  return today.toISOString().split("T")[0];
};

// Base profile fields shared by both patient and doctor
interface BaseProfile {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  avatarUrl: string;
}

// Doctor-specific fields
interface DoctorProfile extends BaseProfile {
  specialty: string;
  licenseNumber: string;
  licenseImageUrl: string;
  experienceYears: number;
  qualifications: string;
  services: string[];
  workAddress: string;
  consultationFee: number;
}

interface SettingsPageProps {
  role: "patient" | "doctor";
  title?: string;
  subtitle?: string;
}

export default function SettingsPage({
  role,
  title = "Cài đặt tài khoản",
  subtitle = "Quản lý thông tin cá nhân và tùy chọn tài khoản",
}: SettingsPageProps) {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // License image state (for doctor)
  const [pendingLicenseFile, setPendingLicenseFile] = useState<File | null>(null);
  const [previewLicenseUrl, setPreviewLicenseUrl] = useState<string>("");
  const licenseInputRef = useRef<HTMLInputElement>(null);

  // Services state (for doctor)
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [customService, setCustomService] = useState("");

  // Original values to track changes
  const [originalProfile, setOriginalProfile] = useState<DoctorProfile | null>(null);
  const [originalServices, setOriginalServices] = useState<string[]>([]);

  const [profile, setProfile] = useState<DoctorProfile>({
    _id: "",
    fullName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    avatarUrl: "",
    // Doctor-specific fields (will be ignored for patient)
    specialty: "",
    licenseNumber: "",
    licenseImageUrl: "",
    experienceYears: 0,
    qualifications: "",
    services: [],
    workAddress: "",
    consultationFee: 0,
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (session?.user) {
      fetchUserProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userId = (session?.user as any)?._id;
      if (!userId) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await sendRequest<any>({
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/users/${userId}`,
        method: "GET",
        headers: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Authorization: `Bearer ${(session as any)?.access_token}`,
        },
      });

      if (response) {
        const userData = response.data || response;
        setProfile({
          _id: userData._id || userId,
          fullName: userData.fullName || "",
          email: userData.email || "",
          phone: userData.phone || "",
          dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth).toISOString().split("T")[0] : "",
          gender: userData.gender || "",
          address: userData.address || "",
          avatarUrl: userData.avatarUrl || "",
          // Doctor-specific fields
          specialty: userData.specialty || "",
          licenseNumber: userData.licenseNumber || "",
          licenseImageUrl: userData.licenseImageUrl || "",
          experienceYears: userData.experienceYears || 0,
          qualifications: userData.qualifications || "",
          services: userData.services || [],
          workAddress: userData.workAddress || "",
          consultationFee: userData.consultationFee || 0,
        });
        // Set services for doctor
        if (userData.services && Array.isArray(userData.services)) {
          setSelectedServices(userData.services);
          setOriginalServices(userData.services);
        }

        // Save original profile to track changes
        setOriginalProfile({
          _id: userData._id || userId,
          fullName: userData.fullName || "",
          email: userData.email || "",
          phone: userData.phone || "",
          dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth).toISOString().split("T")[0] : "",
          gender: userData.gender || "",
          address: userData.address || "",
          avatarUrl: userData.avatarUrl || "",
          specialty: userData.specialty || "",
          licenseNumber: userData.licenseNumber || "",
          licenseImageUrl: userData.licenseImageUrl || "",
          experienceYears: userData.experienceYears || 0,
          qualifications: userData.qualifications || "",
          services: userData.services || [],
          workAddress: userData.workAddress || "",
          consultationFee: userData.consultationFee || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      toast.error("Không thể tải thông tin người dùng");
    } finally {
      setLoading(false);
    }
  };

  // Check if profile has changes
  const hasProfileChanges = () => {
    if (!originalProfile) return false;

    // Check for pending file uploads
    if (pendingAvatarFile || pendingLicenseFile) return true;

    // Check base fields
    if (profile.fullName !== originalProfile.fullName) return true;
    if (profile.phone !== originalProfile.phone) return true;
    if (profile.dateOfBirth !== originalProfile.dateOfBirth) return true;
    if (profile.gender !== originalProfile.gender) return true;
    if (profile.address !== originalProfile.address) return true;

    // Check doctor-specific fields
    if (role === "doctor") {
      if (profile.specialty !== originalProfile.specialty) return true;
      if (profile.licenseNumber !== originalProfile.licenseNumber) return true;
      if (profile.experienceYears !== originalProfile.experienceYears) return true;
      if (profile.qualifications !== originalProfile.qualifications) return true;
      if (profile.workAddress !== originalProfile.workAddress) return true;
      if (profile.consultationFee !== originalProfile.consultationFee) return true;
      if (profile.licenseImageUrl !== originalProfile.licenseImageUrl) return true;

      // Check services changes
      if (selectedServices.length !== originalServices.length) return true;
      const sortedSelected = [...selectedServices].sort();
      const sortedOriginal = [...originalServices].sort();
      for (let i = 0; i < sortedSelected.length; i++) {
        if (sortedSelected[i] !== sortedOriginal[i]) return true;
      }
    }

    return false;
  };

  const validateProfile = () => {
    const newErrors: Record<string, string> = {};

    if (!profile.fullName.trim()) {
      newErrors.fullName = "Họ và tên không được để trống";
    }

    if (!profile.phone.trim()) {
      newErrors.phone = "Số điện thoại không được để trống";
    } else if (!/^[0-9]{10,11}$/.test(profile.phone.trim())) {
      newErrors.phone = "Số điện thoại không hợp lệ (10-11 số)";
    }

    if (!profile.dateOfBirth) {
      newErrors.dateOfBirth = "Ngày sinh không được để trống";
    } else {
      const birthDate = new Date(profile.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 18) {
        newErrors.dateOfBirth = "Bạn phải đủ 18 tuổi";
      }
    }

    if (!profile.gender) {
      newErrors.gender = "Giới tính không được để trống";
    }

    if (!profile.address?.trim()) {
      newErrors.address = "Địa chỉ không được để trống";
    }

    // Doctor-specific validation
    if (role === "doctor") {
      if (!profile.specialty?.trim()) {
        newErrors.specialty = "Chuyên khoa không được để trống";
      }
      if (!profile.licenseNumber?.trim()) {
        newErrors.licenseNumber = "Số chứng chỉ hành nghề không được để trống";
      }
      if (!profile.licenseImageUrl && !pendingLicenseFile) {
        newErrors.licenseImageUrl = "Ảnh chứng chỉ hành nghề không được để trống";
      }
      if (!profile.experienceYears || profile.experienceYears < 0) {
        newErrors.experienceYears = "Số năm kinh nghiệm không được để trống";
      }
      if (!profile.qualifications?.trim()) {
        newErrors.qualifications = "Bằng cấp / Học vị không được để trống";
      }
      if (selectedServices.length === 0) {
        newErrors.services = "Vui lòng chọn ít nhất một dịch vụ chuyên môn";
      }
      if (!profile.workAddress?.trim()) {
        newErrors.workAddress = "Địa chỉ nơi làm việc không được để trống";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors: Record<string, string> = {};

    if (!passwordForm.currentPassword) {
      newErrors.currentPassword = "Vui lòng nhập mật khẩu hiện tại";
    }

    if (!passwordForm.newPassword) {
      newErrors.newPassword = "Vui lòng nhập mật khẩu mới";
    } else {
      const hasMinLength = passwordForm.newPassword.length >= 8;
      const hasUppercase = /[A-Z]/.test(passwordForm.newPassword);
      const hasLowercase = /[a-z]/.test(passwordForm.newPassword);
      const hasNumber = /[0-9]/.test(passwordForm.newPassword);

      if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber) {
        newErrors.newPassword = "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số";
      }
    }

    if (!passwordForm.confirmPassword) {
      newErrors.confirmPassword = "Vui lòng xác nhận mật khẩu mới";
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file hình ảnh");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Kích thước file không được vượt quá 5MB");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPreviewAvatarUrl(previewUrl);
    setPendingAvatarFile(file);
  };

  // Handle license image
  const handleLicenseClick = () => {
    licenseInputRef.current?.click();
  };

  const handleLicenseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file hình ảnh");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Kích thước file không được vượt quá 10MB");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPreviewLicenseUrl(previewUrl);
    setPendingLicenseFile(file);
    if (errors.licenseImageUrl) setErrors({ ...errors, licenseImageUrl: "" });
  };

  const removeLicense = () => {
    if (previewLicenseUrl) {
      URL.revokeObjectURL(previewLicenseUrl);
    }
    setPendingLicenseFile(null);
    setPreviewLicenseUrl("");
    setProfile({ ...profile, licenseImageUrl: "" });
    if (licenseInputRef.current) {
      licenseInputRef.current.value = "";
    }
  };

  // Handle services
  const toggleService = (service: string) => {
    setSelectedServices((prev) => {
      const newServices = prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service];
      if (errors.services && newServices.length > 0) {
        setErrors({ ...errors, services: "" });
      }
      return newServices;
    });
  };

  const addCustomService = () => {
    if (customService.trim() && !selectedServices.includes(customService.trim())) {
      setSelectedServices((prev) => [...prev, customService.trim()]);
      setCustomService("");
      if (errors.services) setErrors({ ...errors, services: "" });
    }
  };

  const removeService = (service: string) => {
    setSelectedServices((prev) => prev.filter((s) => s !== service));
  };

  const saveProfile = async () => {
    if (!validateProfile()) return;

    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accessToken = (session as any)?.access_token;
      let avatarUrl = profile.avatarUrl;
      let licenseImageUrl = profile.licenseImageUrl;

      // Upload avatar to Cloudinary if there's a pending file
      if (pendingAvatarFile) {
        const formData = new FormData();
        formData.append("file", pendingAvatarFile);
        formData.append("folder", "avatars");

        const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/cloudinary/upload`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        });

        const uploadResult = await uploadResponse.json();

        if (!uploadResult.success || !uploadResult.url) {
          throw new Error(uploadResult.error || "Upload avatar failed");
        }

        avatarUrl = uploadResult.url;
      }

      // Upload license image to Cloudinary if there's a pending file (doctor only)
      if (role === "doctor" && pendingLicenseFile) {
        const formData = new FormData();
        formData.append("file", pendingLicenseFile);
        formData.append("folder", "licenses");

        const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/cloudinary/upload`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        });

        const uploadResult = await uploadResponse.json();

        if (!uploadResult.success || !uploadResult.url) {
          throw new Error(uploadResult.error || "Upload license image failed");
        }

        licenseImageUrl = uploadResult.url;
      }

      // Build request body based on role
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: any = {
        _id: profile._id,
        fullName: profile.fullName,
        phone: profile.phone,
        dateOfBirth: profile.dateOfBirth || undefined,
        gender: profile.gender || undefined,
        address: profile.address || undefined,
        avatarUrl: avatarUrl,
      };

      // Add doctor-specific fields
      if (role === "doctor") {
        body.specialty = profile.specialty || undefined;
        body.licenseNumber = profile.licenseNumber || undefined;
        body.licenseImageUrl = licenseImageUrl || undefined;
        body.experienceYears = profile.experienceYears || undefined;
        body.qualifications = profile.qualifications || undefined;
        body.services = selectedServices.length > 0 ? selectedServices : undefined;
        body.workAddress = profile.workAddress || undefined;
        body.consultationFee = profile.consultationFee || undefined;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await sendRequest<any>({
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/users`,
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body,
      });

      if (response && !response.statusCode && !response.error) {
        setProfile((prev) => ({ ...prev, avatarUrl, licenseImageUrl }));
        await updateSession({
          ...session,
          user: {
            ...session?.user,
            fullName: profile.fullName,
            avatarUrl: avatarUrl,
          },
        });

        // Force refresh to update Header with new session data
        router.refresh();

        if (pendingAvatarFile) {
          URL.revokeObjectURL(previewAvatarUrl);
          setPendingAvatarFile(null);
          setPreviewAvatarUrl("");
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }

        if (pendingLicenseFile) {
          URL.revokeObjectURL(previewLicenseUrl);
          setPendingLicenseFile(null);
          setPreviewLicenseUrl("");
          if (licenseInputRef.current) {
            licenseInputRef.current.value = "";
          }
        }

        // Update original values to reflect saved state
        setOriginalProfile({ ...profile, avatarUrl, licenseImageUrl });
        if (role === "doctor") {
          setOriginalServices([...selectedServices]);
        }

        toast.success("Cập nhật thông tin thành công!");
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error(error?.message || "Có lỗi xảy ra khi cập nhật thông tin");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!validatePassword()) return;

    setSaving(true);
    try {
      const response = await sendRequest<{ message?: string; statusCode?: number; error?: string }>({
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/users/change-password`,
        method: "PATCH",
        headers: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Authorization: `Bearer ${(session as any)?.access_token}`,
        },
        body: {
          _id: profile._id,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
      });

      if (response?.statusCode || response?.error) {
        const errorMessage = response.message || "Có lỗi xảy ra khi đổi mật khẩu";
        if (errorMessage.includes("không đúng")) {
          setErrors({ currentPassword: "Mật khẩu hiện tại không đúng" });
        } else {
          toast.error(errorMessage);
        }
        return;
      }

      toast.success("Đổi mật khẩu thành công!");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setErrors({});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error("Có lỗi xảy ra khi đổi mật khẩu");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-gray-600">Đang tải...</span>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "profile", name: "Thông tin cá nhân", icon: User },
    { id: "password", name: "Đổi mật khẩu", icon: Lock },
    { id: "notifications", name: "Thông báo", icon: Bell },
    { id: "security", name: "Bảo mật", icon: Shield },
  ];

  const roleLabel = role === "doctor" ? "Bác sĩ" : "Bệnh nhân";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              <p className="text-sm text-gray-600">{subtitle}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="healthcare-card p-4">
              <div className="flex flex-col items-center mb-6 pb-6 border-b border-gray-100">
                <div className="relative">
                  <div
                    className="w-24 h-24 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center cursor-pointer group"
                    onClick={handleAvatarClick}
                  >
                    {previewAvatarUrl || profile.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewAvatarUrl || profile.avatarUrl}
                        alt={profile.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-10 h-10 text-primary" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <h3 className="mt-3 font-semibold text-gray-900">{profile.fullName || roleLabel}</h3>
                <p className="text-sm text-gray-500">{profile.email}</p>
                <button onClick={handleAvatarClick} className="mt-2 text-xs text-primary hover:underline">
                  Thay đổi ảnh đại diện
                </button>
                {pendingAvatarFile && <p className="mt-1 text-xs text-orange-500">* Ảnh chưa được lưu</p>}
              </div>

              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setErrors({});
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                        activeTab === tab.id ? "text-white shadow-lg bg-primary" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{tab.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          <div className="lg:col-span-3">
            {activeTab === "profile" && (
              <div className="healthcare-card p-6 space-y-8">
                <h2 className="text-xl font-bold text-gray-900">Thông tin cá nhân</h2>

                {/* Thông tin cơ bản */}
                <div>
                  <h3 className="healthcare-subheading mb-6 text-lg border-b border-gray-200 pb-2">Thông tin cơ bản</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Common fields */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <RequiredLabel>Họ và tên</RequiredLabel>
                      </label>
                      <input
                        type="text"
                        value={profile.fullName}
                        onChange={(e) => {
                          setProfile({ ...profile, fullName: e.target.value });
                          if (errors.fullName) setErrors({ ...errors, fullName: "" });
                        }}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                          errors.fullName ? "border-red-500" : "border-gray-200"
                        }`}
                        placeholder="Nhập họ và tên đầy đủ"
                      />
                      {errors.fullName && <p className="mt-1 text-sm text-red-500">{errors.fullName}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={profile.email}
                        disabled
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                      <p className="mt-1 text-xs text-gray-500">Email không thể thay đổi</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <RequiredLabel>Số điện thoại</RequiredLabel>
                      </label>
                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          setProfile({ ...profile, phone: value });
                          if (errors.phone) setErrors({ ...errors, phone: "" });
                        }}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                          errors.phone ? "border-red-500" : "border-gray-200"
                        }`}
                        placeholder="Nhập số điện thoại (VD: 0912345678)"
                        maxLength={11}
                      />
                      {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <RequiredLabel>Ngày sinh</RequiredLabel>
                      </label>
                      <input
                        type="date"
                        value={profile.dateOfBirth}
                        onChange={(e) => {
                          setProfile({ ...profile, dateOfBirth: e.target.value });
                          if (errors.dateOfBirth) setErrors({ ...errors, dateOfBirth: "" });
                        }}
                        max={getMaxDateOfBirth()}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                          errors.dateOfBirth ? "border-red-500" : "border-gray-200"
                        }`}
                      />
                      {errors.dateOfBirth && <p className="mt-1 text-sm text-red-500">{errors.dateOfBirth}</p>}
                      <p className="mt-1 text-xs text-gray-500">Bạn phải đủ 18 tuổi</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <RequiredLabel>Giới tính</RequiredLabel>
                      </label>
                      <select
                        value={profile.gender}
                        onChange={(e) => {
                          setProfile({ ...profile, gender: e.target.value });
                          if (errors.gender) setErrors({ ...errors, gender: "" });
                        }}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                          errors.gender ? "border-red-500" : "border-gray-200"
                        }`}
                      >
                        <option value="">Chọn giới tính</option>
                        <option value="male">Nam</option>
                        <option value="female">Nữ</option>
                        <option value="other">Khác</option>
                      </select>
                      {errors.gender && <p className="mt-1 text-sm text-red-500">{errors.gender}</p>}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <RequiredLabel>Địa chỉ</RequiredLabel>
                      </label>
                      <input
                        type="text"
                        value={profile.address}
                        onChange={(e) => {
                          setProfile({ ...profile, address: e.target.value });
                          if (errors.address) setErrors({ ...errors, address: "" });
                        }}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                          errors.address ? "border-red-500" : "border-gray-200"
                        }`}
                        placeholder="Nhập địa chỉ đầy đủ"
                      />
                      {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address}</p>}
                    </div>
                  </div>
                </div>

                {/* Doctor-specific fields */}
                {role === "doctor" && (
                  <>
                    {/* Thông tin nghề nghiệp */}
                    <div>
                      <h3 className="healthcare-subheading mb-6 text-lg border-b border-gray-200 pb-2">
                        Thông tin nghề nghiệp
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <RequiredLabel>Chuyên khoa</RequiredLabel>
                          </label>
                          <input
                            type="text"
                            value={profile.specialty}
                            onChange={(e) => {
                              setProfile({ ...profile, specialty: e.target.value });
                              if (errors.specialty) setErrors({ ...errors, specialty: "" });
                            }}
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                              errors.specialty ? "border-red-500" : "border-gray-200"
                            }`}
                            placeholder="Ví dụ: Nha khoa tổng quát, Chỉnh nha..."
                          />
                          {errors.specialty && <p className="mt-1 text-sm text-red-500">{errors.specialty}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <RequiredLabel>Kinh nghiệm (năm)</RequiredLabel>
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={profile.experienceYears}
                            onChange={(e) => {
                              setProfile({ ...profile, experienceYears: parseInt(e.target.value) || 0 });
                              if (errors.experienceYears) setErrors({ ...errors, experienceYears: "" });
                            }}
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                              errors.experienceYears ? "border-red-500" : "border-gray-200"
                            }`}
                            placeholder="Số năm kinh nghiệm"
                          />
                          {errors.experienceYears && (
                            <p className="mt-1 text-sm text-red-500">{errors.experienceYears}</p>
                          )}
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <RequiredLabel>Bằng cấp / Học vị</RequiredLabel>
                          </label>
                          <input
                            type="text"
                            value={profile.qualifications}
                            onChange={(e) => {
                              setProfile({ ...profile, qualifications: e.target.value });
                              if (errors.qualifications) setErrors({ ...errors, qualifications: "" });
                            }}
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                              errors.qualifications ? "border-red-500" : "border-gray-200"
                            }`}
                            placeholder="Ví dụ: Bác sĩ Y khoa, Thạc sĩ Nha khoa, Tiến sĩ..."
                          />
                          {errors.qualifications && (
                            <p className="mt-1 text-sm text-red-500">{errors.qualifications}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Chứng chỉ hành nghề */}
                    <div>
                      <h3 className="healthcare-subheading mb-6 text-lg border-b border-gray-200 pb-2">
                        Chứng chỉ hành nghề
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <RequiredLabel>Số chứng chỉ hành nghề</RequiredLabel>
                          </label>
                          <input
                            type="text"
                            value={profile.licenseNumber}
                            onChange={(e) => {
                              setProfile({ ...profile, licenseNumber: e.target.value });
                              if (errors.licenseNumber) setErrors({ ...errors, licenseNumber: "" });
                            }}
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                              errors.licenseNumber ? "border-red-500" : "border-gray-200"
                            }`}
                            placeholder="Nhập số chứng chỉ hành nghề"
                          />
                          {errors.licenseNumber && <p className="mt-1 text-sm text-red-500">{errors.licenseNumber}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <RequiredLabel>Ảnh chứng chỉ hành nghề</RequiredLabel>
                          </label>
                          <div className="flex items-center gap-4">
                            {previewLicenseUrl || profile.licenseImageUrl ? (
                              <div className="relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={previewLicenseUrl || profile.licenseImageUrl}
                                  alt="License preview"
                                  className="w-20 h-20 object-cover rounded-lg border"
                                />
                                <button
                                  type="button"
                                  onClick={removeLicense}
                                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div
                                className="w-20 h-20 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-primary transition"
                                onClick={handleLicenseClick}
                              >
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
                              />
                              <button
                                type="button"
                                onClick={handleLicenseClick}
                                className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                              >
                                <Upload className="w-4 h-4" />
                                Chọn ảnh
                              </button>
                              <p className="text-xs text-gray-500 mt-1">Tối đa 10MB</p>
                              {pendingLicenseFile && (
                                <p className="text-xs text-orange-500 mt-1">* Ảnh chưa được lưu</p>
                              )}
                            </div>
                          </div>
                          {errors.licenseImageUrl && (
                            <p className="mt-1 text-sm text-red-500">{errors.licenseImageUrl}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Dịch vụ chuyên môn */}
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
                        {errors.services && <p className="mt-1 text-sm text-red-500">{errors.services}</p>}
                      </div>
                    </div>

                    {/* Địa chỉ nơi làm việc */}
                    <div>
                      <h3 className="healthcare-subheading mb-6 text-lg border-b border-gray-200 pb-2">
                        Địa chỉ nơi làm việc
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <RequiredLabel>Địa chỉ phòng khám / bệnh viện</RequiredLabel>
                          </label>
                          <input
                            type="text"
                            value={profile.workAddress}
                            onChange={(e) => {
                              setProfile({ ...profile, workAddress: e.target.value });
                              if (errors.workAddress) setErrors({ ...errors, workAddress: "" });
                            }}
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                              errors.workAddress ? "border-red-500" : "border-gray-200"
                            }`}
                            placeholder="Ví dụ: 123 Đường Nguyễn Huệ, Quận 1, TP.HCM"
                          />
                          {errors.workAddress && <p className="mt-1 text-sm text-red-500">{errors.workAddress}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Phí khám (VNĐ)</label>
                          <input
                            type="number"
                            min="0"
                            step="10000"
                            value={profile.consultationFee}
                            onChange={(e) => setProfile({ ...profile, consultationFee: parseInt(e.target.value) || 0 })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                            placeholder="Nhập phí khám"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={saveProfile}
                    disabled={saving || !hasProfileChanges()}
                    className="btn-healthcare-primary flex items-center gap-2 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Lưu thay đổi
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="healthcare-card p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Cài đặt thông báo</h2>
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <Bell className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-lg font-medium">Chức năng đang phát triển</p>
                  <p className="text-sm text-gray-400 mt-1">Vui lòng quay lại sau</p>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="healthcare-card p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Bảo mật tài khoản</h2>
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <Shield className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-lg font-medium">Chức năng đang phát triển</p>
                  <p className="text-sm text-gray-400 mt-1">Vui lòng quay lại sau</p>
                </div>
              </div>
            )}

            {activeTab === "password" && (
              <div className="healthcare-card p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Đổi mật khẩu</h2>
                <div className="max-w-md space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mật khẩu hiện tại <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordForm.currentPassword}
                        onChange={(e) => {
                          setPasswordForm({ ...passwordForm, currentPassword: e.target.value });
                          if (errors.currentPassword) setErrors({ ...errors, currentPassword: "" });
                        }}
                        className={`w-full px-4 py-2.5 pr-10 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                          errors.currentPassword ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Nhập mật khẩu hiện tại"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.currentPassword && <p className="mt-1 text-sm text-red-500">{errors.currentPassword}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mật khẩu mới <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(e) => {
                          setPasswordForm({ ...passwordForm, newPassword: e.target.value });
                          if (errors.newPassword) setErrors({ ...errors, newPassword: "" });
                        }}
                        className={`w-full px-4 py-2.5 pr-10 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                          errors.newPassword ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Nhập mật khẩu mới"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.newPassword && <p className="mt-1 text-sm text-red-500">{errors.newPassword}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => {
                          setPasswordForm({ ...passwordForm, confirmPassword: e.target.value });
                          if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: "" });
                        }}
                        className={`w-full px-4 py-2.5 pr-10 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                          errors.confirmPassword ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Nhập lại mật khẩu mới"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-primary">
                      <strong>Yêu cầu mật khẩu:</strong>
                    </p>
                    <ul className="text-sm text-primary mt-1 ml-4 list-disc">
                      <li className={passwordForm.newPassword.length >= 8 ? "text-green-600" : ""}>Ít nhất 8 ký tự</li>
                      <li className={/[A-Z]/.test(passwordForm.newPassword) ? "text-green-600" : ""}>
                        Có ít nhất 1 chữ hoa
                      </li>
                      <li className={/[a-z]/.test(passwordForm.newPassword) ? "text-green-600" : ""}>
                        Có ít nhất 1 chữ thường
                      </li>
                      <li className={/[0-9]/.test(passwordForm.newPassword) ? "text-green-600" : ""}>
                        Có ít nhất 1 số
                      </li>
                      <li
                        className={
                          passwordForm.newPassword === passwordForm.confirmPassword &&
                          passwordForm.confirmPassword.length > 0
                            ? "text-green-600"
                            : ""
                        }
                      >
                        Mật khẩu xác nhận khớp
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={changePassword}
                    disabled={
                      saving ||
                      !passwordForm.currentPassword ||
                      !passwordForm.newPassword ||
                      !passwordForm.confirmPassword
                    }
                    className="btn-healthcare-primary flex items-center gap-2 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Đổi mật khẩu
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
