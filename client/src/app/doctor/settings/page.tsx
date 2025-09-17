"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { sendRequest } from "@/utils/api";
import { Settings, User, Lock, Bell, Shield, Clock, Save, Eye, EyeOff, Stethoscope, Award, MapPin } from "lucide-react";

interface DoctorProfile {
  fullName: string;
  email: string;
  phone: string;
  specialization: string;
  medicalLicense: string;
  experience: number;
  qualifications: string[];
  clinicAddress: string;
  consultationFee: number;
  workingHours: {
    start: string;
    end: string;
    workingDays: string[];
  };
  bio: string;
  languages: string[];
}

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  appointmentReminders: boolean;
  patientUpdates: boolean;
  systemAlerts: boolean;
}

interface SecuritySettings {
  twoFactorAuth: boolean;
  sessionTimeout: number;
  loginAlerts: boolean;
  autoLogout: boolean;
}

export default function DoctorSettings() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [profile, setProfile] = useState<DoctorProfile>({
    fullName: "",
    email: "",
    phone: "",
    specialization: "",
    medicalLicense: "",
    experience: 0,
    qualifications: [],
    clinicAddress: "",
    consultationFee: 0,
    workingHours: {
      start: "08:00",
      end: "17:00",
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    },
    bio: "",
    languages: [],
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: true,
    appointmentReminders: true,
    patientUpdates: true,
    systemAlerts: true,
  });

  const [security, setSecurity] = useState<SecuritySettings>({
    twoFactorAuth: false,
    sessionTimeout: 60,
    loginAlerts: true,
    autoLogout: true,
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [newQualification, setNewQualification] = useState("");
  const [newLanguage, setNewLanguage] = useState("");

  useEffect(() => {
    if (session) {
      fetchDoctorSettings();
    }
  }, [session]);

  const fetchDoctorSettings = async () => {
    setLoading(true);
    try {
      const response = await sendRequest<any>({
        url: "/api/doctor/settings",
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
          fullName: "Bác sĩ Nguyễn Văn A",
          email: "doctor@example.com",
          phone: "0123456789",
          specialization: "Nha khoa tổng quát",
          medicalLicense: "NK-12345",
          experience: 10,
          qualifications: ["Thạc sĩ Nha khoa", "Chuyên khoa I", "Chứng chỉ Implant"],
          clinicAddress: "123 Đường ABC, Quận 1, TP.HCM",
          consultationFee: 500000,
          workingHours: {
            start: "08:00",
            end: "17:00",
            workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
          },
          bio: "Bác sĩ có 10 năm kinh nghiệm trong lĩnh vực nha khoa tổng quát và thẩm mỹ nha khoa.",
          languages: ["Tiếng Việt", "English"],
        });
      }
    } catch (error) {
      console.error("Error fetching doctor settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await sendRequest<any>({
        url: "/api/doctor/profile",
        method: "PUT",
        headers: {
          Authorization: `Bearer ${(session as any)?.access_token}`,
        },
        body: profile,
      });
      alert("Cập nhật thông tin thành công!");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Có lỗi xảy ra khi cập nhật thông tin");
    } finally {
      setSaving(false);
    }
  };

  const saveNotifications = async () => {
    setSaving(true);
    try {
      await sendRequest<any>({
        url: "/api/doctor/notifications",
        method: "PUT",
        headers: {
          Authorization: `Bearer ${(session as any)?.access_token}`,
        },
        body: notifications,
      });
      alert("Cập nhật cài đặt thông báo thành công!");
    } catch (error) {
      console.error("Error saving notifications:", error);
      alert("Có lỗi xảy ra khi cập nhật cài đặt");
    } finally {
      setSaving(false);
    }
  };

  const saveSecurity = async () => {
    setSaving(true);
    try {
      await sendRequest<any>({
        url: "/api/doctor/security",
        method: "PUT",
        headers: {
          Authorization: `Bearer ${(session as any)?.access_token}`,
        },
        body: security,
      });
      alert("Cập nhật cài đặt bảo mật thành công!");
    } catch (error) {
      console.error("Error saving security:", error);
      alert("Có lỗi xảy ra khi cập nhật cài đặt");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert("Mật khẩu xác nhận không khớp!");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      alert("Mật khẩu mới phải có ít nhất 6 ký tự!");
      return;
    }

    setSaving(true);
    try {
      await sendRequest<any>({
        url: "/api/doctor/change-password",
        method: "PUT",
        headers: {
          Authorization: `Bearer ${(session as any)?.access_token}`,
        },
        body: {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
      });
      alert("Đổi mật khẩu thành công!");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      console.error("Error changing password:", error);
      alert("Có lỗi xảy ra khi đổi mật khẩu");
    } finally {
      setSaving(false);
    }
  };

  const addQualification = () => {
    if (newQualification.trim() && !profile.qualifications.includes(newQualification.trim())) {
      setProfile({
        ...profile,
        qualifications: [...profile.qualifications, newQualification.trim()],
      });
      setNewQualification("");
    }
  };

  const removeQualification = (index: number) => {
    setProfile({
      ...profile,
      qualifications: profile.qualifications.filter((_, i) => i !== index),
    });
  };

  const addLanguage = () => {
    if (newLanguage.trim() && !profile.languages.includes(newLanguage.trim())) {
      setProfile({
        ...profile,
        languages: [...profile.languages, newLanguage.trim()],
      });
      setNewLanguage("");
    }
  };

  const removeLanguage = (index: number) => {
    setProfile({
      ...profile,
      languages: profile.languages.filter((_, i) => i !== index),
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(amount);
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
    { id: "profile", name: "Hồ sơ bác sĩ", icon: User },
    { id: "practice", name: "Thông tin phòng khám", icon: Stethoscope },
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
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
              style={{
                backgroundImage: `linear-gradient(to bottom right, var(--color-primary), var(--color-primary-600))`,
              }}
            >
              <Settings className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="healthcare-heading text-3xl">Cài đặt bác sĩ</h1>
              <p className="healthcare-body mt-1">Quản lý hồ sơ chuyên môn và cài đặt hệ thống</p>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chuyên khoa *</label>
                    <input
                      type="text"
                      value={profile.specialization}
                      onChange={(e) => setProfile({ ...profile, specialization: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Số chứng chỉ hành nghề *</label>
                    <input
                      type="text"
                      value={profile.medicalLicense}
                      onChange={(e) => setProfile({ ...profile, medicalLicense: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Số năm kinh nghiệm</label>
                    <input
                      type="number"
                      min="0"
                      value={profile.experience}
                      onChange={(e) => setProfile({ ...profile, experience: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Giới thiệu bản thân</label>
                    <textarea
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Mô tả về kinh nghiệm, chuyên môn và phương pháp điều trị..."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bằng cấp & Chứng chỉ</label>
                    <div className="space-y-2">
                      {profile.qualifications.map((qualification, index) => (
                        <div key={index} className="flex items-center justify-between bg-blue-50 px-3 py-2 rounded-lg">
                          <span className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-blue-600" />
                            {qualification}
                          </span>
                          <button
                            onClick={() => removeQualification(index)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Xóa
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newQualification}
                          onChange={(e) => setNewQualification(e.target.value)}
                          placeholder="Thêm bằng cấp/chứng chỉ mới"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          onKeyPress={(e) => e.key === "Enter" && addQualification()}
                        />
                        <button onClick={addQualification} className="px-4 py-2 btn-healthcare-primary">
                          Thêm
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ngôn ngữ</label>
                    <div className="space-y-2">
                      {profile.languages.map((language, index) => (
                        <div key={index} className="flex items-center justify-between bg-green-50 px-3 py-2 rounded-lg">
                          <span>{language}</span>
                          <button
                            onClick={() => removeLanguage(index)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Xóa
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newLanguage}
                          onChange={(e) => setNewLanguage(e.target.value)}
                          placeholder="Thêm ngôn ngữ mới"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          onKeyPress={(e) => e.key === "Enter" && addLanguage()}
                        />
                        <button onClick={addLanguage} className="px-4 py-2 btn-healthcare-primary">
                          Thêm
                        </button>
                      </div>
                    </div>
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

            {activeTab === "practice" && (
              <div className="healthcare-card p-6">
                <h2 className="healthcare-heading text-xl mb-6">Thông tin phòng khám</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Địa chỉ phòng khám *</label>
                    <input
                      type="text"
                      value={profile.clinicAddress}
                      onChange={(e) => setProfile({ ...profile, clinicAddress: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phí khám (VND)</label>
                    <input
                      type="number"
                      min="0"
                      value={profile.consultationFee}
                      onChange={(e) => setProfile({ ...profile, consultationFee: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-sm text-gray-600 mt-1">Hiện tại: {formatCurrency(profile.consultationFee)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Giờ làm việc</label>
                    <div className="flex gap-2">
                      <input
                        type="time"
                        value={profile.workingHours.start}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            workingHours: { ...profile.workingHours, start: e.target.value },
                          })
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="flex items-center">đến</span>
                      <input
                        type="time"
                        value={profile.workingHours.end}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            workingHours: { ...profile.workingHours, end: e.target.value },
                          })
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ngày làm việc trong tuần</label>
                    <div className="grid grid-cols-7 gap-2">
                      {[
                        { key: "Monday", label: "T2" },
                        { key: "Tuesday", label: "T3" },
                        { key: "Wednesday", label: "T4" },
                        { key: "Thursday", label: "T5" },
                        { key: "Friday", label: "T6" },
                        { key: "Saturday", label: "T7" },
                        { key: "Sunday", label: "CN" },
                      ].map((day) => (
                        <label key={day.key} className="flex flex-col items-center">
                          <input
                            type="checkbox"
                            checked={profile.workingHours.workingDays.includes(day.key)}
                            onChange={(e) => {
                              const workingDays = e.target.checked
                                ? [...profile.workingHours.workingDays, day.key]
                                : profile.workingHours.workingDays.filter((d) => d !== day.key);
                              setProfile({
                                ...profile,
                                workingHours: { ...profile.workingHours, workingDays },
                              });
                            }}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm mt-1">{day.label}</span>
                        </label>
                      ))}
                    </div>
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
                      <p className="text-sm text-gray-600">Nhận thông báo về cuộc hẹn và tin nhắn từ bệnh nhân</p>
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
                      <p className="text-sm text-gray-600">Nhận thông báo khẩn cấp qua tin nhắn</p>
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
                      <p className="text-sm text-gray-600">Nhắc nhở về cuộc hẹn sắp tới với bệnh nhân</p>
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
                      <h3 className="font-medium text-gray-900">Cập nhật từ bệnh nhân</h3>
                      <p className="text-sm text-gray-600">Thông báo khi bệnh nhân gửi tin nhắn hoặc đổi lịch</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.patientUpdates}
                        onChange={(e) => setNotifications({ ...notifications, patientUpdates: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Cảnh báo hệ thống</h3>
                      <p className="text-sm text-gray-600">Thông báo về bảo trì, cập nhật hệ thống</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.systemAlerts}
                        onChange={(e) => setNotifications({ ...notifications, systemAlerts: e.target.checked })}
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
                      <option value={30}>30 phút</option>
                      <option value={60}>1 giờ</option>
                      <option value={120}>2 giờ</option>
                      <option value={240}>4 giờ</option>
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

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Tự động đăng xuất</h3>
                      <p className="text-sm text-gray-600">Đăng xuất tự động khi không hoạt động</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={security.autoLogout}
                        onChange={(e) => setSecurity({ ...security, autoLogout: e.target.checked })}
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
