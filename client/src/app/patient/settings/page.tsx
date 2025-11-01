"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { sendRequest } from "@/utils/api";
import { Settings, User, Lock, Bell, Shield, Mail, Phone, Calendar, Save, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";
  address: string;
  emergencyContact: string;
  bloodType: string;
  allergies: string;
  medicalHistory: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  appointmentReminders: boolean;
  medicationReminders: boolean;
  promotionalEmails: boolean;
}

interface SecuritySettings {
  twoFactorAuth: boolean;
  sessionTimeout: number;
  loginAlerts: boolean;
}

export default function PatientSettings() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [profile, setProfile] = useState<UserProfile>({
    fullName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "other",
    address: "",
    emergencyContact: "",
    bloodType: "",
    allergies: "",
    medicalHistory: "",
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: true,
    appointmentReminders: true,
    medicationReminders: true,
    promotionalEmails: false,
  });

  const [security, setSecurity] = useState<SecuritySettings>({
    twoFactorAuth: false,
    sessionTimeout: 30,
    loginAlerts: true,
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (session) {
      fetchUserSettings();
    }
  }, [session]);

  const fetchUserSettings = async () => {
    setLoading(true);
    try {
      const response = await sendRequest<any>({
        url: "/api/user/settings",
        method: "GET",
        headers: {
          Authorization: `Bearer ${(session as any)?.access_token}`,
        },
      });

      if (response && response.data) {
        setProfile(response.data.profile || profile);
        setNotifications(response.data.notifications || notifications);
        setSecurity(response.data.security || security);
      } else {
        // Demo data for UI showcase
        setProfile({
          fullName: "Nguyễn Văn A",
          email: "patient@example.com",
          phone: "0123456789",
          dateOfBirth: "1990-01-01",
          gender: "male",
          address: "123 Đường ABC, Quận 1, TP.HCM",
          emergencyContact: "0987654321",
          bloodType: "A+",
          allergies: "Không có",
          medicalHistory: "Không có tiền sử bệnh lý đặc biệt",
        });
      }
    } catch (error) {
      console.error("Error fetching user settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await sendRequest<any>({
        url: "/api/user/profile",
        method: "PUT",
        headers: {
          Authorization: `Bearer ${(session as any)?.access_token}`,
        },
        body: profile,
      });
      toast.success("Cập nhật thông tin thành công!");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Có lỗi xảy ra khi cập nhật thông tin");
    } finally {
      setSaving(false);
    }
  };

  const saveNotifications = async () => {
    setSaving(true);
    try {
      await sendRequest<any>({
        url: "/api/user/notifications",
        method: "PUT",
        headers: {
          Authorization: `Bearer ${(session as any)?.access_token}`,
        },
        body: notifications,
      });
      toast.success("Cập nhật cài đặt thông báo thành công!");
    } catch (error) {
      console.error("Error saving notifications:", error);
      toast.error("Có lỗi xảy ra khi cập nhật cài đặt");
    } finally {
      setSaving(false);
    }
  };

  const saveSecurity = async () => {
    setSaving(true);
    try {
      await sendRequest<any>({
        url: "/api/user/security",
        method: "PUT",
        headers: {
          Authorization: `Bearer ${(session as any)?.access_token}`,
        },
        body: security,
      });
      toast.success("Cập nhật cài đặt bảo mật thành công!");
    } catch (error) {
      console.error("Error saving security:", error);
      toast.error("Có lỗi xảy ra khi cập nhật cài đặt");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp!");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự!");
      return;
    }

    setSaving(true);
    try {
      await sendRequest<any>({
        url: "/api/user/change-password",
        method: "PUT",
        headers: {
          Authorization: `Bearer ${(session as any)?.access_token}`,
        },
        body: {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
      });
      toast.success("Đổi mật khẩu thành công!");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Có lỗi xảy ra khi đổi mật khẩu");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/30 to-indigo-50/20 flex items-center justify-center">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: "var(--color-primary)" }}
        ></div>
      </div>
    );
  }

  const tabs = [
    { id: "profile", name: "Thông tin cá nhân", icon: User },
    { id: "notifications", name: "Thông báo", icon: Bell },
    { id: "security", name: "Bảo mật", icon: Shield },
    { id: "password", name: "Đổi mật khẩu", icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 to-indigo-50/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="healthcare-card-elevated p-6">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
              style={{
                backgroundImage: `linear-gradient(to bottom right, var(--color-primary), var(--color-primary-600))`,
              }}
            >
              <Settings className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="healthcare-heading text-2xl">Cài đặt tài khoản</h1>
              <p className="healthcare-body mt-1">Quản lý thông tin cá nhân và tùy chọn tài khoản</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="healthcare-card p-6">
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                        activeTab === tab.id ? "text-white shadow-lg" : "text-gray-700 hover:bg-blue-50"
                      }`}
                      style={
                        activeTab === tab.id
                          ? {
                              backgroundImage: `linear-gradient(to right, var(--color-primary), var(--color-primary-600))`,
                            }
                          : {}
                      }
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{tab.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {activeTab === "profile" && (
              <div className="healthcare-card p-6">
                <h2 className="healthcare-heading text-xl mb-6">Thông tin cá nhân</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Họ và tên *</label>
                    <input
                      type="text"
                      value={profile.fullName}
                      onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại *</label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ngày sinh</label>
                    <input
                      type="date"
                      value={profile.dateOfBirth}
                      onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Giới tính</label>
                    <select
                      value={profile.gender}
                      onChange={(e) => setProfile({ ...profile, gender: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nhóm máu</label>
                    <input
                      type="text"
                      value={profile.bloodType}
                      onChange={(e) => setProfile({ ...profile, bloodType: e.target.value })}
                      placeholder="A+, B-, O+, AB+..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Địa chỉ</label>
                    <input
                      type="text"
                      value={profile.address}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Liên hệ khẩn cấp</label>
                    <input
                      type="tel"
                      value={profile.emergencyContact}
                      onChange={(e) => setProfile({ ...profile, emergencyContact: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dị ứng</label>
                    <input
                      type="text"
                      value={profile.allergies}
                      onChange={(e) => setProfile({ ...profile, allergies: e.target.value })}
                      placeholder="Thuốc, thức ăn..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tiền sử bệnh</label>
                    <textarea
                      value={profile.medicalHistory}
                      onChange={(e) => setProfile({ ...profile, medicalHistory: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="mt-6">
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="btn-healthcare-primary flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="healthcare-card p-6">
                <h2 className="healthcare-heading text-xl mb-6">Cài đặt thông báo</h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Thông báo qua email</h3>
                      <p className="text-sm text-gray-600">Nhận thông báo về cuộc hẹn và đơn thuốc qua email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.emailNotifications}
                        onChange={(e) => setNotifications({ ...notifications, emailNotifications: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Thông báo qua SMS</h3>
                      <p className="text-sm text-gray-600">Nhận thông báo quan trọng qua tin nhắn</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.smsNotifications}
                        onChange={(e) => setNotifications({ ...notifications, smsNotifications: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Nhắc nhở cuộc hẹn</h3>
                      <p className="text-sm text-gray-600">Nhắc nhở trước cuộc hẹn 24 giờ và 1 giờ</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.appointmentReminders}
                        onChange={(e) => setNotifications({ ...notifications, appointmentReminders: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Nhắc nhở uống thuốc</h3>
                      <p className="text-sm text-gray-600">Nhắc nhở theo lịch uống thuốc được kê</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.medicationReminders}
                        onChange={(e) => setNotifications({ ...notifications, medicationReminders: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Email khuyến mãi</h3>
                      <p className="text-sm text-gray-600">Nhận thông tin về các chương trình khuyến mãi</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.promotionalEmails}
                        onChange={(e) => setNotifications({ ...notifications, promotionalEmails: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
                <div className="mt-6">
                  <button
                    onClick={saveNotifications}
                    disabled={saving}
                    className="btn-healthcare-primary flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "Đang lưu..." : "Lưu cài đặt"}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="healthcare-card p-6">
                <h2 className="healthcare-heading text-xl mb-6">Cài đặt bảo mật</h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Xác thực 2 lớp</h3>
                      <p className="text-sm text-gray-600">Tăng cường bảo mật với xác thực qua SMS</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={security.twoFactorAuth}
                        onChange={(e) => setSecurity({ ...security, twoFactorAuth: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Thời gian hết hạn phiên (phút)
                    </label>
                    <select
                      value={security.sessionTimeout}
                      onChange={(e) => setSecurity({ ...security, sessionTimeout: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={15}>15 phút</option>
                      <option value={30}>30 phút</option>
                      <option value={60}>1 giờ</option>
                      <option value={120}>2 giờ</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Cảnh báo đăng nhập</h3>
                      <p className="text-sm text-gray-600">Thông báo khi có đăng nhập từ thiết bị mới</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={security.loginAlerts}
                        onChange={(e) => setSecurity({ ...security, loginAlerts: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
                <div className="mt-6">
                  <button
                    onClick={saveSecurity}
                    disabled={saving}
                    className="btn-healthcare-primary flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "Đang lưu..." : "Lưu cài đặt"}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "password" && (
              <div className="healthcare-card p-6">
                <h2 className="healthcare-heading text-xl mb-6">Đổi mật khẩu</h2>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu hiện tại *</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu mới *</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Xác nhận mật khẩu mới *</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Yêu cầu mật khẩu:</strong>
                    </p>
                    <ul className="text-sm text-blue-700 mt-1 ml-4 list-disc">
                      <li>Ít nhất 6 ký tự</li>
                      <li>Nên bao gồm chữ hoa, chữ thường và số</li>
                      <li>Không sử dụng thông tin cá nhân dễ đoán</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-6">
                  <button
                    onClick={changePassword}
                    disabled={
                      saving ||
                      !passwordForm.currentPassword ||
                      !passwordForm.newPassword ||
                      !passwordForm.confirmPassword
                    }
                    className="btn-healthcare-primary flex items-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    {saving ? "Đang xử lý..." : "Đổi mật khẩu"}
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
