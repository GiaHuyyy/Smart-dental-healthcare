"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { X, Calendar, Clock, User, Mail, Phone, MapPin, Plus, Download, CalendarDays } from "lucide-react";
import { AppointmentSocketProvider, useAppointmentSocket } from "@/contexts/AppointmentSocketContext";
import DoctorCalendar from "@/components/Calendar/DoctorCalendar";
import { View } from "react-big-calendar";
import Image from "next/image";

// Appointment type
interface Appointment {
  id: string;
  patientName: string;
  patientAvatar: string;
  date: string;
  startTime: string;
  endTime: string;
  visitType: string;
  reason: string;
  status: string;
  gender: string;
  location: string;
  email?: string;
  phone?: string;
}

// Helper to get current week dates
const getCurrentWeekDates = () => {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date.toISOString().split("T")[0]);
  }
  return dates;
};

const weekDates = getCurrentWeekDates();

// Sample data - Sử dụng tuần hiện tại
const SAMPLE_APPOINTMENTS = [
  {
    id: "1",
    patientName: "Nguyễn Văn A",
    patientAvatar: "https://ui-avatars.com/api/?name=Nguyen+Van+A&background=F59E0B&color=fff",
    date: weekDates[0], // Monday
    startTime: "08:00",
    endTime: "08:30",
    visitType: "Clinic Visit",
    reason: "Khám tổng quát",
    status: "confirmed",
    gender: "Nam",
    location: "Hà Nội",
  },
  {
    id: "2",
    patientName: "Trần Thị B",
    patientAvatar: "https://ui-avatars.com/api/?name=Tran+Thi+B&background=10B981&color=fff",
    date: weekDates[0], // Monday
    startTime: "08:30",
    endTime: "09:30",
    visitType: "Clinic Visit",
    reason: "Lấy cao răng",
    status: "confirmed",
    gender: "Nữ",
    location: "Hồ Chí Minh",
  },
  {
    id: "3",
    patientName: "Lê Văn C",
    patientAvatar: "https://ui-avatars.com/api/?name=Le+Van+C&background=EC4899&color=fff",
    date: weekDates[1], // Tuesday
    startTime: "09:00",
    endTime: "10:00",
    visitType: "Clinic Visit",
    reason: "Nhổ răng khôn",
    status: "confirmed",
    gender: "Nam",
    location: "Đà Nẵng",
  },
  {
    id: "4",
    patientName: "Phạm Thị D",
    patientAvatar: "https://ui-avatars.com/api/?name=Pham+Thi+D&background=F59E0B&color=fff",
    date: weekDates[2], // Wednesday
    startTime: "10:00",
    endTime: "10:30",
    visitType: "Clinic Visit",
    reason: "Tư vấn niềng răng",
    status: "confirmed",
    gender: "Nữ",
    location: "Hải Phòng",
  },
  {
    id: "5",
    patientName: "Hoàng Văn E",
    patientAvatar: "https://ui-avatars.com/api/?name=Hoang+Van+E&background=3B82F6&color=fff",
    date: weekDates[2], // Wednesday
    startTime: "10:30",
    endTime: "11:00",
    visitType: "Clinic Visit",
    reason: "Bọc răng sứ",
    status: "confirmed",
    gender: "Nam",
    location: "Cần Thơ",
  },
  {
    id: "6",
    patientName: "Đỗ Thị F",
    patientAvatar: "https://ui-avatars.com/api/?name=Do+Thi+F&background=8B5CF6&color=fff",
    date: weekDates[3], // Thursday
    startTime: "10:30",
    endTime: "11:30",
    visitType: "Clinic Visit",
    reason: "Điều trị tủy",
    status: "confirmed",
    gender: "Nữ",
    location: "Huế",
  },
  {
    id: "7",
    patientName: "Vũ Văn G",
    patientAvatar: "https://ui-avatars.com/api/?name=Vu+Van+G&background=EF4444&color=fff",
    date: weekDates[4], // Friday
    startTime: "09:00",
    endTime: "10:00",
    visitType: "Clinic Visit",
    reason: "Tẩy trắng răng",
    status: "confirmed",
    gender: "Nam",
    location: "Nha Trang",
  },
  {
    id: "8",
    patientName: "Bùi Thị H",
    patientAvatar: "https://ui-avatars.com/api/?name=Bui+Thi+H&background=06B6D4&color=fff",
    date: weekDates[4], // Friday
    startTime: "11:30",
    endTime: "12:30",
    visitType: "Clinic Visit",
    reason: "Hàn răng",
    status: "confirmed",
    gender: "Nữ",
    email: "buithih@gmail.com",
    phone: "+84 901 234 567",
    location: "Biên Hòa",
  },
  {
    id: "9",
    patientName: "Ngô Văn I",
    patientAvatar: "https://ui-avatars.com/api/?name=Ngo+Van+I&background=EC4899&color=fff",
    date: weekDates[5], // Saturday
    startTime: "08:00",
    endTime: "09:00",
    visitType: "Home Visit",
    reason: "Khám tại nhà",
    status: "confirmed",
    gender: "Nam",
    location: "Vũng Tàu",
  },
  {
    id: "10",
    patientName: "Đinh Thị K",
    patientAvatar: "https://ui-avatars.com/api/?name=Dinh+Thi+K&background=10B981&color=fff",
    date: weekDates[5], // Saturday
    startTime: "13:00",
    endTime: "14:00",
    visitType: "Clinic Visit",
    reason: "Trồng răng Implant",
    status: "pending",
    gender: "Nữ",
    location: "Quy Nhơn",
  },
];

function DoctorScheduleContent() {
  const { data: session } = useSession();
  const { isConnected } = useAppointmentSocket();

  const [view, setView] = useState<View>("week");
  const [appointments] = useState<Appointment[]>(SAMPLE_APPOINTMENTS);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [selectedTab, setSelectedTab] = useState<"all" | "pending" | "confirmed" | "cancelled">("all");

  // Filter appointments based on selected tab
  const getFilteredAppointments = () => {
    if (selectedTab === "all") {
      return filterStatus === "all" ? appointments : appointments.filter((apt) => apt.status === filterStatus);
    }
    return appointments.filter((apt) => apt.status === selectedTab);
  };

  const filteredAppointments = getFilteredAppointments();

  // Handle stat card click
  const handleStatCardClick = (status: "all" | "pending" | "confirmed" | "cancelled") => {
    setSelectedTab(status);
    setViewMode("list");
    if (status === "all") {
      setFilterStatus("all");
    } else {
      setFilterStatus(status);
    }
  };

  // Handle event selection
  const handleSelectEvent = (event: { id: string }) => {
    const appointment = appointments.find((apt) => apt.id === event.id);
    if (appointment) {
      setSelectedAppointment(appointment);
      setDetailModalOpen(true);
    }
  };

  // Handle slot selection (for creating new appointment)
  const handleSelectSlot = (slotInfo: { start: Date; end: Date; action: string }) => {
    console.log("Selected slot:", slotInfo);
    // TODO: Open new appointment modal
  };

  // Handle view change
  const handleViewChange = (newView: View) => {
    setView(newView);
  };

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Calendar className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Lịch Hẹn</h1>
                <p className="text-sm text-gray-500">Quản lý lịch hẹn của bạn</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Socket status */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-400"}`} />
                <span className="text-sm text-gray-600">{isConnected ? "Đang kết nối" : "Ngoại tuyến"}</span>
              </div>

              {/* Filters */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">Tất cả</option>
                <option value="pending">Chờ xác nhận</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="completed">Hoàn thành</option>
                <option value="cancelled">Đã hủy</option>
              </select>

              {/* Action buttons */}
              <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <Download className="w-4 h-4" />
                Xuất Excel
              </button>

              <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Thêm Lịch Hẹn
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => handleStatCardClick("all")}
            className={`bg-white rounded-lg p-4 border-2 transition-all hover:shadow-md text-left ${
              selectedTab === "all" ? "border-primary shadow-md" : "border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng lịch hẹn</p>
                <p className="text-2xl font-bold text-gray-900">{appointments.length}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
            </div>
          </button>

          <button
            onClick={() => handleStatCardClick("pending")}
            className={`bg-white rounded-lg p-4 border-2 transition-all hover:shadow-md text-left ${
              selectedTab === "pending" ? "border-yellow-500 shadow-md" : "border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Chờ xác nhận</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {appointments.filter((a) => a.status === "pending").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </button>

          <button
            onClick={() => handleStatCardClick("confirmed")}
            className={`bg-white rounded-lg p-4 border-2 transition-all hover:shadow-md text-left ${
              selectedTab === "confirmed" ? "border-primary shadow-md" : "border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đã xác nhận</p>
                <p className="text-2xl font-bold text-primary">
                  {appointments.filter((a) => a.status === "confirmed").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
            </div>
          </button>

          <button
            onClick={() => handleStatCardClick("cancelled")}
            className={`bg-white rounded-lg p-4 border-2 transition-all hover:shadow-md text-left ${
              selectedTab === "cancelled" ? "border-red-500 shadow-md" : "border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đã hủy</p>
                <p className="text-2xl font-bold text-red-600">
                  {appointments.filter((a) => a.status === "cancelled").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <X className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </button>
        </div>

        {/* View Toggle */}
        {viewMode === "list" && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {selectedTab === "all" && "Tất cả lịch hẹn"}
              {selectedTab === "pending" && "Chờ xác nhận"}
              {selectedTab === "confirmed" && "Đã xác nhận"}
              {selectedTab === "cancelled" && "Đã hủy"}
            </h2>
            <button
              onClick={() => {
                setViewMode("calendar");
                setSelectedTab("all");
              }}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-2"
            >
              <CalendarDays className="w-4 h-4" />
              Xem lịch
            </button>
          </div>
        )}

        {/* Calendar or List View */}
        {viewMode === "calendar" ? (
          <DoctorCalendar
            appointments={filteredAppointments}
            view={view}
            onViewChange={handleViewChange}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
          />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* List Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-700">
                <div className="col-span-3">Bệnh nhân</div>
                <div className="col-span-2">Ngày hẹn</div>
                <div className="col-span-2">Giờ</div>
                <div className="col-span-2">Lý do</div>
                <div className="col-span-1">Loại</div>
                <div className="col-span-2 text-center">Thao tác</div>
              </div>
            </div>

            {/* List Body */}
            <div className="divide-y divide-gray-200">
              {filteredAppointments.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Không có lịch hẹn nào</p>
                </div>
              ) : (
                filteredAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedAppointment(apt);
                      setDetailModalOpen(true);
                    }}
                  >
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Patient Info */}
                      <div className="col-span-3 flex items-center gap-3">
                        <Image
                          src={apt.patientAvatar}
                          alt={apt.patientName}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                        <div>
                          <p className="font-medium text-gray-900">{apt.patientName}</p>
                          <p className="text-sm text-gray-500">
                            {apt.gender} • {apt.location}
                          </p>
                        </div>
                      </div>

                      {/* Date */}
                      <div className="col-span-2">
                        <p className="text-sm text-gray-900">{new Date(apt.date).toLocaleDateString("vi-VN")}</p>
                      </div>

                      {/* Time */}
                      <div className="col-span-2">
                        <p className="text-sm text-gray-900">
                          {apt.startTime} - {apt.endTime}
                        </p>
                      </div>

                      {/* Reason */}
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600 truncate">{apt.reason}</p>
                      </div>

                      {/* Visit Type */}
                      <div className="col-span-1">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            apt.visitType === "Home Visit"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {apt.visitType === "Home Visit" ? "Tại nhà" : "Phòng khám"}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="col-span-2 flex items-center justify-center gap-2">
                        {apt.status === "pending" && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Confirm appointment
                                console.log("Confirm", apt.id);
                              }}
                              className="px-3 py-1 bg-primary text-white rounded text-xs font-medium hover:bg-primary/90"
                            >
                              Xác nhận
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Cancel appointment
                                console.log("Cancel", apt.id);
                              }}
                              className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
                            >
                              Hủy
                            </button>
                          </>
                        )}
                        {apt.status === "confirmed" && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Complete appointment
                                console.log("Complete", apt.id);
                              }}
                              className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
                            >
                              Hoàn thành
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Cancel appointment
                                console.log("Cancel", apt.id);
                              }}
                              className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
                            >
                              Hủy
                            </button>
                          </>
                        )}
                        {apt.status === "cancelled" && <span className="text-sm text-red-600 font-medium">Đã hủy</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailModalOpen && selectedAppointment && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Chi Tiết Lịch Hẹn</h2>
              <button onClick={() => setDetailModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Patient info */}
              <div className="flex items-center gap-4">
                <Image
                  src={selectedAppointment.patientAvatar}
                  alt={selectedAppointment.patientName}
                  width={64}
                  height={64}
                  className="rounded-full"
                />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedAppointment.patientName}</h3>
                  <p className="text-sm text-gray-600">
                    {selectedAppointment.gender} • {selectedAppointment.location}
                  </p>
                </div>
              </div>

              {/* Appointment details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Ngày hẹn</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedAppointment.date).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Thời gian</p>
                    <p className="font-medium text-gray-900">
                      {selectedAppointment.startTime} - {selectedAppointment.endTime}
                    </p>
                  </div>
                </div>

                {selectedAppointment.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium text-gray-900">{selectedAppointment.email}</p>
                    </div>
                  </div>
                )}

                {selectedAppointment.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Điện thoại</p>
                      <p className="font-medium text-gray-900">{selectedAppointment.phone}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Loại khám</p>
                    <p className="font-medium text-gray-900">
                      {selectedAppointment.visitType === "Clinic Visit" ? "Khám tại phòng" : "Khám tại nhà"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 rounded-full mt-0.5 ${
                      selectedAppointment.status === "confirmed"
                        ? "bg-green-500"
                        : selectedAppointment.status === "pending"
                        ? "bg-yellow-500"
                        : selectedAppointment.status === "cancelled"
                        ? "bg-red-500"
                        : "bg-indigo-500"
                    }`}
                  />
                  <div>
                    <p className="text-sm text-gray-600">Trạng thái</p>
                    <p className="font-medium text-gray-900">
                      {selectedAppointment.status === "confirmed"
                        ? "Đã xác nhận"
                        : selectedAppointment.status === "pending"
                        ? "Chờ xác nhận"
                        : selectedAppointment.status === "cancelled"
                        ? "Đã hủy"
                        : "Hoàn thành"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div>
                <p className="text-sm text-gray-600 mb-2">Lý do khám</p>
                <p className="text-gray-900 bg-gray-50 rounded-lg p-4">{selectedAppointment.reason}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                {selectedAppointment.status === "pending" && (
                  <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">
                    Xác Nhận
                  </button>
                )}
                {selectedAppointment.status === "confirmed" && (
                  <button className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90">
                    Hoàn Thành
                  </button>
                )}
                <button className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">
                  Hủy Lịch Hẹn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DoctorSchedulePage() {
  return (
    <AppointmentSocketProvider>
      <DoctorScheduleContent />
    </AppointmentSocketProvider>
  );
}
