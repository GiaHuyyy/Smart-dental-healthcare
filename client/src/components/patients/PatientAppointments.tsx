"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Plus, Eye, TrendingUp } from "lucide-react";

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
  doctorId: {
    _id: string;
    fullName: string;
    specialty: string;
  };
}

interface PatientAppointmentsProps {
  appointments: Appointment[];
  patientId: string;
  onRefresh?: () => void;
}

export default function PatientAppointments({ appointments, patientId }: PatientAppointmentsProps) {
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  const getAppointmentStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { bg: string; text: string; label: string } } = {
      pending: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Chờ xử lý" },
      pending_payment: { bg: "bg-orange-100", text: "text-orange-800", label: "Chờ thanh toán" },
      confirmed: { bg: "bg-blue-100", text: "text-blue-800", label: "Đã xác nhận" },
      "in-progress": { bg: "bg-purple-100", text: "text-purple-800", label: "Đang khám" },
      completed: { bg: "bg-green-100", text: "text-green-800", label: "Hoàn thành" },
      cancelled: { bg: "bg-red-100", text: "text-red-800", label: "Đã hủy" },
    };
    const statusInfo = statusMap[status] || { bg: "bg-gray-100", text: "text-gray-800", label: status };
    return (
      <span
        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${statusInfo.bg} ${statusInfo.text}`}
      >
        {statusInfo.label}
      </span>
    );
  };

  const getPaymentStatusBadge = (paymentStatus?: string) => {
    if (!paymentStatus || paymentStatus === "unpaid") {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Chưa thanh toán</span>
      );
    }
    if (paymentStatus === "paid") {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Đã thanh toán</span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">{paymentStatus}</span>
    );
  };

  // Filter appointments based on status
  const filteredAppointments =
    filterStatus === "all"
      ? appointments
      : appointments.filter((app) => {
          if (filterStatus === "pending") {
            return app.status === "pending" || app.status === "pending_payment";
          }
          if (filterStatus === "confirmed") {
            return app.status === "confirmed";
          }
          if (filterStatus === "completed") {
            return app.status === "completed";
          }
          if (filterStatus === "cancelled") {
            return app.status === "cancelled";
          }
          return true;
        });

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Lịch sử lịch khám ({filteredAppointments.length}/{appointments.length})
        </h3>
        <button
          onClick={() => {
            router.push(`/doctor/schedule?patientId=${patientId}`);
          }}
          className="px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-600 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tạo lịch mới
        </button>
      </div>

      {/* Filter Tabs - 5 tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => setFilterStatus("all")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
            filterStatus === "all" ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Tổng ({appointments.length})
        </button>
        <button
          onClick={() => setFilterStatus("pending")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
            filterStatus === "pending" ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Chờ xác nhận ({appointments.filter((a) => a.status === "pending" || a.status === "pending_payment").length})
        </button>
        <button
          onClick={() => setFilterStatus("confirmed")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
            filterStatus === "confirmed" ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Đã xác nhận ({appointments.filter((a) => a.status === "confirmed").length})
        </button>
        <button
          onClick={() => setFilterStatus("completed")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
            filterStatus === "completed" ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Đã hoàn thành ({appointments.filter((a) => a.status === "completed").length})
        </button>
        <button
          onClick={() => setFilterStatus("cancelled")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
            filterStatus === "cancelled" ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Đã hủy ({appointments.filter((a) => a.status === "cancelled").length})
        </button>
      </div>

      <div className="space-y-3">
        {filteredAppointments.length > 0 ? (
          filteredAppointments.map((appointment) => (
            <div
              key={appointment._id}
              className="bg-white rounded-md p-4 border border-gray-200 hover:shadow-md hover:border-blue-200 hover:bg-blue-50/50 transition-all cursor-pointer group"
              onClick={() => {
                router.push(`/doctor/schedule?appointmentId=${appointment._id}`);
              }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-md bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center shrink-0 transition-colors duration-200">
                      <Calendar className="w-5 h-5 text-primary group-hover:text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-gray-900 text-base">{formatDate(appointment.appointmentDate)}</p>
                        <span className="text-gray-400">•</span>
                        <p className="text-gray-700 font-medium text-sm">
                          {appointment.startTime}
                          {appointment.endTime && ` - ${appointment.endTime}`}
                        </p>
                        <Eye className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-all duration-200 ml-auto" />
                      </div>

                      {appointment.appointmentType && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-primary bg-primary/10 group-hover:bg-primary/20 px-2 py-0.5 rounded transition-colors duration-200">
                            {appointment.appointmentType}
                          </span>
                          {appointment.duration && (
                            <span className="text-xs text-gray-500 group-hover:text-primary transition-colors duration-200">
                              ({appointment.duration} phút)
                            </span>
                          )}
                        </div>
                      )}

                      {appointment.consultationFee && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 group-hover:text-blue-600 transition-colors duration-200">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span className="font-semibold">
                            {appointment.consultationFee.toLocaleString("vi-VN")} VNĐ
                          </span>
                        </div>
                      )}

                      {appointment.notes && (
                        <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          <span className="font-medium">Ghi chú:</span> {appointment.notes}
                        </div>
                      )}

                      {appointment.paymentStatus && (
                        <div className="mt-2">{getPaymentStatusBadge(appointment.paymentStatus)}</div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="ml-3">{getAppointmentStatusBadge(appointment.status)}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">Chưa có lịch hẹn nào</h3>
            <p className="text-gray-500 text-sm mb-4">Bệnh nhân này chưa có lịch hẹn nào trong hệ thống</p>
            <button
              onClick={() => {
                router.push(`/doctor/schedule?patientId=${patientId}`);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Tạo lịch hẹn đầu tiên
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
