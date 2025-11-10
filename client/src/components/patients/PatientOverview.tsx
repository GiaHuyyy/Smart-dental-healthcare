"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, MapPin, Calendar as CalendarIcon, Activity, TrendingUp, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import realtimeChatService from "@/services/realtimeChatService";

interface Patient {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  avatarUrl?: string;
}

interface Appointment {
  _id: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  status: string;
  appointmentType?: string;
  consultationFee?: number;
  notes?: string;
  paymentStatus?: string;
  duration?: number;
}

interface MedicalRecord {
  _id: string;
  recordDate: string;
  chiefComplaint: string;
  diagnosis: string;
  treatmentPlan: string;
  status: string;
}

interface Payment {
  _id: string;
  amount: number;
  status: string;
}

interface PatientOverviewProps {
  patient: Patient;
  appointments: Appointment[];
  medicalRecords: MedicalRecord[];
  payments: Payment[];
}

export default function PatientOverview({ patient, appointments, payments }: PatientOverviewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const handleOpenChat = async () => {
    const patientId = patient._id;
    if (!patientId) return;

    try {
      setIsCreatingChat(true);
      // If socket is connected, try to create conversation immediately via socket
      if (realtimeChatService.isConnected()) {
        try {
          const userInfo = realtimeChatService.getUserInfo();
          const resp = await realtimeChatService.createConversation(userInfo.userId || "", patientId);

          // store the returned conversation or its id into localStorage for SharedChatView to pick up
          try {
            localStorage.setItem("newConversation", JSON.stringify(resp));
          } catch {
            // ignore
          }

          router.push(`/doctor/chat?newConversation=true`);
          toast({
            title: "Đang mở cửa sổ chat",
            description: "Cuộc hội thoại đã được tạo và mở",
          });
          return;
        } catch (socketErr) {
          console.warn("Socket createConversation failed, falling back to patientId flow", socketErr);
          // fallback to patientId-based flow below
        }
      }

      // Fallback: Save data for SharedChatView to pick up and create via socket on chat page
      const payload = { patientId };
      try {
        localStorage.setItem("newConversation", JSON.stringify(payload));
      } catch {
        // ignore storage errors
      }

      // Navigate to chat page which will read localStorage and create/join via socket
      router.push(`/doctor/chat?newConversation=true`);
      toast({
        title: "Đang mở cửa sổ chat",
        description: "Đang tạo/khôi phục cuộc hội thoại với bệnh nhân",
      });
    } catch (err) {
      console.error("Failed to start/open conversation", err);
      toast({
        title: "Không thể mở chat",
        description: "Vui lòng thử lại sau",
      });
    } finally {
      setIsCreatingChat(false);
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  const nextAppointment = (() => {
    if (!appointments?.length) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const upcoming = appointments
      .map((a) => ({
        ...a,
        dt: new Date(a.appointmentDate),
        appointmentDateTime: new Date(`${a.appointmentDate}T${a.startTime}`),
      }))
      .filter((a) => {
        const appointmentDate = new Date(a.appointmentDate);
        appointmentDate.setHours(0, 0, 0, 0);
        return appointmentDate >= now && a.status !== "cancelled" && a.status !== "completed";
      })
      .sort((a, b) => a.appointmentDateTime.getTime() - b.appointmentDateTime.getTime());
    return upcoming[0] || null;
  })();

  const paymentStats = (() => {
    // Revenue records với amount > 0 = Doctor nhận tiền (consultation fee, cancellation charge)
    // Revenue records với amount < 0 = Doctor trả lại tiền (refund)
    const completedPayments = payments.filter((p: Payment) => {
      const status = p.status?.toLowerCase() || "";
      const amount = p.amount || 0;
      return (status === "completed" || status === "paid") && amount > 0;
    });

    const pendingPayments = payments.filter((p: Payment) => {
      const status = p.status?.toLowerCase() || "";
      return status === "pending";
    });

    const refundedPayments = payments.filter((p: Payment) => {
      const status = p.status?.toLowerCase() || "";
      const amount = p.amount || 0;
      // Refund = completed records with negative amount
      return (status === "completed" || status === "refunded") && amount < 0;
    });

    const totalPaid = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPending = pendingPayments.reduce((sum, p) => sum + Math.abs(p.amount || 0), 0);
    const totalRefunded = refundedPayments.reduce((sum, p) => sum + Math.abs(p.amount || 0), 0);

    return {
      refunded: refundedPayments.length,
      paid: completedPayments.length,
      pending: pendingPayments.length,
      totalPaid: totalPaid,
      pendingAmount: totalPending,
      totalRefunded: totalRefunded,
    };
  })();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
      {/* Patient Info - 2 columns */}
      <div className="xl:col-span-2 space-y-3">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-700" />
            Thông tin cá nhân
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Họ tên</label>
              <p className="text-sm font-medium text-gray-900">{patient.fullName}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                <Mail className="w-3 h-3" />
                Email
              </label>
              <p className="text-sm font-medium text-gray-900">{patient.email}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Ngày sinh</label>
              <p className="text-sm font-medium text-gray-900">
                {patient.dateOfBirth ? formatDate(patient.dateOfBirth) : "Chưa cập nhật"}
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                <Phone className="w-3 h-3" />
                Số điện thoại
              </label>
              <p className="text-sm font-medium text-gray-900">{patient.phone}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Tuổi</label>
              <p className="text-sm font-medium text-gray-900">
                {patient.dateOfBirth ? `${calculateAge(patient.dateOfBirth)} tuổi` : "N/A"}
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Giới tính</label>
              <p className="text-sm font-medium text-gray-900">
                {patient.gender === "male" ? "Nam" : patient.gender === "female" ? "Nữ" : "Chưa cập nhật"}
              </p>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Địa chỉ
              </label>
              <p className="text-sm font-medium text-gray-900">{patient.address || "Chưa cập nhật"}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Ngày đăng ký</label>
              <p className="text-sm font-medium text-gray-900">{formatDate(patient.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats - 1 column */}
      <div className="space-y-3">
        {nextAppointment ? (
          <div
            className="bg-white rounded-xl p-4 border border-gray-200 hover:border-primary cursor-pointer hover:shadow-md transition-all"
            onClick={() => {
              window.location.href = `/doctor/schedule?appointmentId=${nextAppointment._id}`;
            }}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              Lịch khám sắp tới
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                <span className="text-sm font-semibold text-gray-700">Ngày khám</span>
                <span className="font-bold text-sm text-primary">{formatDate(nextAppointment.appointmentDate)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                <span className="text-sm font-semibold text-gray-700">Giờ khám</span>
                <span className="font-bold text-sm text-primary">{nextAppointment.startTime}</span>
              </div>
              {nextAppointment.appointmentType && (
                <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                  <span className="text-sm font-semibold text-gray-700">Loại khám</span>
                  <span className="font-bold text-sm text-primary">{nextAppointment.appointmentType}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-gray-400" />
              Lịch khám sắp tới
            </h3>
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 font-semibold">Không có</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-4 pb-3 border-b border-gray-200">Dữ liệu khám</h3>
          <div className="space-y-4">
            {/* Appointments Stats */}
            <button className="border-gray-200 transition-all w-full rounded-xl p-4 border hover:border-primary">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-gray-900">Lịch hẹn</h4>
                <CalendarIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-3">
                <div className="bg-white flex justify-between items-center rounded-lg p-3 border-2 border-gray-200">
                  <p className="text-xs font-semibold text-gray-600">Tổng</p>
                  <p className="text-xs font-bold text-gray-900">{appointments.length}</p>
                </div>
                <div className="bg-white flex justify-between items-center rounded-lg p-3 border-2 border-primary/20">
                  <p className="text-xs font-semibold text-gray-600">Hoàn thành</p>
                  <p className="text-xs font-bold text-primary">
                    {appointments.filter((a) => a.status === "completed").length}
                  </p>
                </div>
                <div className="bg-white flex justify-between items-center rounded-lg p-3 border-2 border-red-200">
                  <p className="text-xs font-semibold text-gray-600">Đã hủy</p>
                  <p className="text-xs font-bold text-red-600">
                    {appointments.filter((a) => a.status === "cancelled").length}
                  </p>
                </div>
              </div>
            </button>

            {/* Payment Stats */}
            <div className="bg-linear-to-br from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-gray-900">Thanh toán</h4>
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-white rounded-lg p-3 border-2 border-emerald-200">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-600">Đã thanh toán</span>
                    <span className="text-[10px] text-gray-500">{paymentStats.paid} giao dịch</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-600">
                    {paymentStats.totalPaid.toLocaleString("vi-VN")}đ
                  </span>
                </div>
                <div className="flex justify-between items-center bg-white rounded-lg p-3 border-2 border-orange-200">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-600">Chờ thanh toán</span>
                    <span className="text-[10px] text-gray-500">{paymentStats.pending} giao dịch</span>
                  </div>
                  <span className="text-xs font-bold text-orange-600">
                    {paymentStats.pendingAmount.toLocaleString("vi-VN")}đ
                  </span>
                </div>
                <div className="flex justify-between items-center bg-white rounded-lg p-3 border-2 border-red-200">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-600">Đã hoàn tiền</span>
                    <span className="text-[10px] text-gray-500">{paymentStats.refunded} giao dịch</span>
                  </div>
                  <span className="text-xs font-bold text-red-600">
                    {paymentStats.totalRefunded.toLocaleString("vi-VN")}đ
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions - 1 column */}
      <div className="space-y-3">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Hành động
          </h3>
          <div className="space-y-3">
            <button
              onClick={() => router.push(`/doctor/schedule?patientId=${patient._id}`)}
              className="w-full flex items-center gap-3 p-3 bg-primary/5 hover:bg-primary/10 rounded-xl text-left transition-colors group border border-primary/20"
            >
              <div className="w-10 h-10 bg-primary/10 group-hover:bg-primary/20 rounded-xl flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">Đặt lịch hẹn</p>
                <p className="text-xs font-semibold text-gray-500">Tạo lịch hẹn mới cho bệnh nhân</p>
              </div>
            </button>
            <button
              onClick={handleOpenChat}
              disabled={isCreatingChat}
              className="w-full flex items-center gap-3 p-3 bg-primary/5 hover:bg-primary/10 rounded-xl text-left transition-colors group border border-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 bg-primary/10 group-hover:bg-primary/20 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{isCreatingChat ? "Đang mở chat..." : "Nhắn tin"}</p>
                <p className="text-xs font-semibold text-gray-500">Trò chuyện với bệnh nhân</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
