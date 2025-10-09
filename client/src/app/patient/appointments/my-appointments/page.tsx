"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Building2,
  Home,
  User,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreVertical,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import appointmentService from "@/services/appointmentService";
import { Appointment, AppointmentStatus, ConsultType } from "@/types/appointment";

export default function MyAppointmentsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | AppointmentStatus>("all");

  useEffect(() => {
    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }
    fetchAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const userId = (session?.user as { _id?: string })._id;
      if (!userId) {
        toast.error("Vui lòng đăng nhập");
        router.push("/auth/signin");
        return;
      }

      // Call API to get patient appointments
      const accessToken = (session as { accessToken?: string })?.accessToken;
      const result = await appointmentService.getPatientAppointments(userId, {}, accessToken);

      if (!result.success) {
        throw new Error(result.error || "Không thể tải danh sách lịch hẹn");
      }

      setAppointments(result.data || []);
      toast.success("Đã tải danh sách lịch hẹn");
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Không thể tải danh sách lịch hẹn");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.CONFIRMED:
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case AppointmentStatus.CANCELLED:
        return <XCircle className="w-5 h-5 text-red-600" />;
      case AppointmentStatus.PENDING:
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case AppointmentStatus.COMPLETED:
        return <CheckCircle className="w-5 h-5 text-primary" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusText = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.CONFIRMED:
        return "Đã xác nhận";
      case AppointmentStatus.CANCELLED:
        return "Đã hủy";
      case AppointmentStatus.PENDING:
        return "Chờ xác nhận";
      case AppointmentStatus.COMPLETED:
        return "Hoàn thành";
      case AppointmentStatus.IN_PROGRESS:
        return "Đang khám";
      case AppointmentStatus.NO_SHOW:
        return "Không đến";
      default:
        return status;
    }
  };

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.CONFIRMED:
        return "bg-green-100 text-green-700 border-green-200";
      case AppointmentStatus.CANCELLED:
        return "bg-red-100 text-red-700 border-red-200";
      case AppointmentStatus.PENDING:
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case AppointmentStatus.COMPLETED:
        return "bg-primary/10 text-primary border-primary/20";
      case AppointmentStatus.IN_PROGRESS:
        return "bg-primary/10 text-primary border-primary/20";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getConsultTypeIcon = (type: ConsultType) => {
    switch (type) {
      case ConsultType.TELEVISIT:
        return <Video className="w-4 h-4" />;
      case ConsultType.ON_SITE:
        return <Building2 className="w-4 h-4" />;
      case ConsultType.HOME_VISIT:
        return <Home className="w-4 h-4" />;
      default:
        return <Building2 className="w-4 h-4" />;
    }
  };

  const getConsultTypeText = (type: ConsultType) => {
    switch (type) {
      case ConsultType.TELEVISIT:
        return "Tư vấn từ xa";
      case ConsultType.ON_SITE:
        return "Khám tại phòng khám";
      case ConsultType.HOME_VISIT:
        return "Khám tại nhà";
      default:
        return type;
    }
  };

  const filteredAppointments = filter === "all" ? appointments : appointments.filter((apt) => apt.status === filter);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/patient/appointments")}
            className="flex items-center gap-2 text-gray-600 hover:text-primary mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Quay lại đặt lịch hẹn</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Lịch hẹn của tôi</h1>
          <p className="text-gray-600">Quản lý và theo dõi các lịch hẹn khám bệnh của bạn</p>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-sm p-2 mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === "all" ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilter(AppointmentStatus.PENDING)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === AppointmentStatus.PENDING ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Chờ xác nhận
          </button>
          <button
            onClick={() => setFilter(AppointmentStatus.CONFIRMED)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === AppointmentStatus.CONFIRMED ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Đã xác nhận
          </button>
          <button
            onClick={() => setFilter(AppointmentStatus.COMPLETED)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === AppointmentStatus.COMPLETED ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Hoàn thành
          </button>
          <button
            onClick={() => setFilter(AppointmentStatus.CANCELLED)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === AppointmentStatus.CANCELLED ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Đã hủy
          </button>
        </div>

        {/* Appointments List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Chưa có lịch hẹn</h3>
            <p className="text-gray-600 mb-6">
              {filter === "all"
                ? "Bạn chưa có lịch hẹn nào. Hãy đặt lịch khám ngay!"
                : `Không có lịch hẹn nào ${getStatusText(filter as AppointmentStatus).toLowerCase()}`}
            </p>
            <button
              onClick={() => router.push("/patient/appointments")}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Đặt lịch khám
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredAppointments.map((appointment) => (
              <div
                key={appointment._id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Doctor Avatar */}
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {appointment.doctor?.profileImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={appointment.doctor.profileImage}
                            alt={appointment.doctor.fullName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-8 h-8 text-primary" />
                        )}
                      </div>

                      {/* Appointment Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {appointment.doctor?.fullName || "Bác sĩ"}
                        </h3>
                        <p className="text-sm text-primary mb-2">{appointment.doctor?.specialty || "Nha khoa"}</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>
                              {new Date(appointment.appointmentDate).toLocaleDateString("vi-VN", {
                                weekday: "short",
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span>{appointment.startTime}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            {getConsultTypeIcon(appointment.consultType)}
                            <span>{getConsultTypeText(appointment.consultType)}</span>
                          </div>
                          {appointment.doctor?.clinicAddress && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="truncate">{appointment.doctor.clinicAddress}</span>
                            </div>
                          )}
                        </div>

                        {appointment.chiefComplaint && (
                          <div className="flex items-start gap-2 text-sm text-gray-600 mb-3">
                            <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{appointment.chiefComplaint}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2 ml-4">
                      <span
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 ${getStatusColor(
                          appointment.status
                        )}`}
                      >
                        {getStatusIcon(appointment.status)}
                        {getStatusText(appointment.status)}
                      </span>
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <MoreVertical className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                    {appointment.status === AppointmentStatus.PENDING && (
                      <button className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium">
                        Hủy lịch
                      </button>
                    )}
                    {appointment.status === AppointmentStatus.CONFIRMED && (
                      <>
                        <button className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium">
                          Tham gia khám
                        </button>
                        <button className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                          Đổi lịch
                        </button>
                      </>
                    )}
                    {appointment.status === AppointmentStatus.COMPLETED && (
                      <button className="px-4 py-2 text-sm border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors font-medium">
                        Xem kết quả
                      </button>
                    )}
                    <button className="ml-auto px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                      Chi tiết
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
