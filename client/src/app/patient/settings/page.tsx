"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { sendRequest } from "@/utils/api";
import { Settings, User, Lock, Save, Eye, EyeOff, Camera, Loader2, Bell, Shield } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  avatarUrl: string;
}

export default function PatientSettings() {
  const { data: session, update: updateSession } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile>({
    _id: "",
    fullName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    avatarUrl: "",
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

      const response = await sendRequest<any>({
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/users/${userId}`,
        method: "GET",
        headers: {
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
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      toast.error("Không thể tải thông tin người dùng");
    } finally {
      setLoading(false);
    }
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
      // Check password requirements: at least 8 chars, uppercase, lowercase, and number
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

    // Create preview URL and store the file for later upload
    const previewUrl = URL.createObjectURL(file);
    setPreviewAvatarUrl(previewUrl);
    setPendingAvatarFile(file);
  };

  const saveProfile = async () => {
    if (!validateProfile()) return;

    setSaving(true);
    try {
      const accessToken = (session as any)?.access_token;
      let avatarUrl = profile.avatarUrl;

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

      // Save all profile data including avatar URL
      const response = await sendRequest<any>({
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/users`,
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: {
          _id: profile._id,
          fullName: profile.fullName,
          phone: profile.phone,
          dateOfBirth: profile.dateOfBirth || undefined,
          gender: profile.gender || undefined,
          address: profile.address || undefined,
          avatarUrl: avatarUrl,
        },
      });

      if (response) {
        // Update local state and session
        setProfile((prev) => ({ ...prev, avatarUrl }));
        await updateSession({
          ...session,
          user: {
            ...session?.user,
            fullName: profile.fullName,
            avatarUrl: avatarUrl,
          },
        });

        // Clear pending avatar file and preview
        if (pendingAvatarFile) {
          URL.revokeObjectURL(previewAvatarUrl);
          setPendingAvatarFile(null);
          setPreviewAvatarUrl("");
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }

        toast.success("Cập nhật thông tin thành công!");
      }
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
          Authorization: `Bearer ${(session as any)?.access_token}`,
        },
        body: {
          _id: profile._id,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
      });

      // Check if response contains error (statusCode or error field)
      if (response?.statusCode || response?.error) {
        const errorMessage = response.message || "Có lỗi xảy ra khi đổi mật khẩu";
        if (errorMessage.includes("không đúng")) {
          setErrors({ currentPassword: "Mật khẩu hiện tại không đúng" });
        } else {
          toast.error(errorMessage);
        }
        return;
      }

      // Success
      toast.success("Đổi mật khẩu thành công!");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setErrors({});
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Cài đặt tài khoản</h1>
              <p className="text-sm text-gray-600">Quản lý thông tin cá nhân và tùy chọn tài khoản</p>
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
                <h3 className="mt-3 font-semibold text-gray-900">{profile.fullName || "Bệnh nhân"}</h3>
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
              <div className="healthcare-card p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Thông tin cá nhân</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profile.fullName}
                      onChange={(e) => {
                        setProfile({ ...profile, fullName: e.target.value });
                        if (errors.fullName) setErrors({ ...errors, fullName: "" });
                      }}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                        errors.fullName ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="Nhập họ và tên"
                    />
                    {errors.fullName && <p className="mt-1 text-sm text-red-500">{errors.fullName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-gray-500">Email không thể thay đổi</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Số điện thoại <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        setProfile({ ...profile, phone: value });
                        if (errors.phone) setErrors({ ...errors, phone: "" });
                      }}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                        errors.phone ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="Nhập số điện thoại"
                      maxLength={11}
                    />
                    {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ngày sinh</label>
                    <input
                      type="date"
                      value={profile.dateOfBirth}
                      onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
                      max={new Date().toISOString().split("T")[0]}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Giới tính</label>
                    <select
                      value={profile.gender}
                      onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    >
                      <option value="">Chọn giới tính</option>
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Địa chỉ</label>
                    <input
                      type="text"
                      value={profile.address}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      placeholder="Nhập địa chỉ"
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="btn-healthcare-primary flex items-center gap-2 px-6"
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
