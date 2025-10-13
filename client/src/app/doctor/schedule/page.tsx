"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { X, Calendar, Clock, User, Mail, Phone, MapPin, Plus, Download, CalendarDays } from "lucide-react";
import { AppointmentSocketProvider, useAppointmentSocket } from "@/contexts/AppointmentSocketContext";
import DoctorCalendar from "@/components/Calendar/DoctorCalendar";
import { View } from "react-big-calendar";
import Image from "next/image";
import { toast } from "sonner";
import appointmentService from "@/services/appointmentService";

// Appointment type
interface Appointment {
  _id?: string;
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

// Session type with accessToken
interface ExtendedSession {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  accessToken?: string;
  expires: string;
}

function DoctorScheduleContent() {
  const { data: session } = useSession();
  const { isConnected, socket } = useAppointmentSocket();

  const [view, setView] = useState<View>("week");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [selectedTab, setSelectedTab] = useState<"all" | "pending" | "confirmed" | "cancelled">("all");
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch appointments from API
  const fetchAppointments = useCallback(async () => {
    const userId = (session?.user as { _id?: string })?._id;
    if (!userId) return;

    try {
      setLoading(true);
      const accessToken = (session as ExtendedSession).accessToken;
      const result = await appointmentService.getDoctorAppointments(userId, {}, accessToken);

      if (result.success && result.data) {
        // Transform API data to match our Appointment interface
        const transformedData: Appointment[] = result.data
          .filter((apt) => apt._id) // Only include appointments with valid _id
          .map((apt) => ({
            _id: apt._id!,
            id: apt._id!,
            patientName: (apt.patientId as { fullName?: string })?.fullName || "N/A",
            patientAvatar:
              (apt.patientId as { avatar?: string; fullName?: string })?.avatar ||
              `https://ui-avatars.com/api/?name=${
                (apt.patientId as { fullName?: string })?.fullName || "Patient"
              }&background=random`,
            date: new Date(apt.appointmentDate).toISOString().split("T")[0],
            startTime: apt.startTime || "08:00",
            endTime: apt.endTime || "09:00",
            visitType: apt.appointmentType === "home_visit" ? "Home Visit" : "Clinic Visit",
            reason: apt.notes || "Không có ghi chú",
            status: apt.status,
            gender: (apt.patientId as { gender?: string })?.gender || "N/A",
            location: (apt.patientId as { address?: string })?.address || "N/A",
            email: (apt.patientId as { email?: string })?.email,
            phone: (apt.patientId as { phone?: string })?.phone,
          }));

        setAppointments(transformedData);
      } else {
        toast.error(result.error || "Không thể tải danh sách lịch hẹn");
      }
    } catch (error) {
      console.error("Fetch appointments error:", error);
      toast.error("Lỗi khi tải danh sách lịch hẹn");
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Initial fetch
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Socket event listeners for real-time updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log("🎧 Doctor schedule: Setting up socket listeners");

    // When patient creates new appointment → Refresh list
    socket.on("appointment:new", () => {
      console.log("📅 New appointment received, refreshing list...");
      fetchAppointments();
    });

    // When appointment is confirmed → Refresh list
    socket.on("appointment:confirmed", () => {
      console.log("✅ Appointment confirmed, refreshing list...");
      fetchAppointments();
    });

    // When appointment is cancelled → Refresh list
    socket.on("appointment:cancelled", () => {
      console.log("❌ Appointment cancelled, refreshing list...");
      fetchAppointments();
    });

    // When appointment is rescheduled → Refresh list
    socket.on("appointment:rescheduled", () => {
      console.log("🔄 Appointment rescheduled, refreshing list...");
      fetchAppointments();
    });

    return () => {
      console.log("🔇 Doctor schedule: Cleaning up socket listeners");
      socket.off("appointment:new");
      socket.off("appointment:confirmed");
      socket.off("appointment:cancelled");
      socket.off("appointment:rescheduled");
    };
  }, [socket, isConnected, fetchAppointments]);

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

  // Handle confirm appointment
  const handleConfirmAppointment = async (appointmentId: string) => {
    if (!session || actionLoading) return;

    try {
      setActionLoading(true);
      const accessToken = (session as ExtendedSession).accessToken;
      const result = await appointmentService.confirmAppointment(appointmentId, accessToken);

      if (result.success) {
        toast.success("Đã xác nhận lịch hẹn");
        // Update local state
        setAppointments((prev) =>
          prev.map((apt) => (apt.id === appointmentId ? { ...apt, status: "confirmed" } : apt))
        );
      } else {
        toast.error(result.error || "Không thể xác nhận lịch hẹn");
      }
    } catch (error) {
      console.error("Confirm appointment error:", error);
      toast.error("Lỗi khi xác nhận lịch hẹn");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle complete appointment
  const handleCompleteAppointment = async (appointmentId: string) => {
    if (!session || actionLoading) return;

    try {
      setActionLoading(true);
      const accessToken = (session as ExtendedSession).accessToken;
      const result = await appointmentService.completeAppointment(appointmentId, accessToken);

      if (result.success) {
        toast.success("Đã hoàn thành lịch hẹn");
        // Update local state
        setAppointments((prev) =>
          prev.map((apt) => (apt.id === appointmentId ? { ...apt, status: "completed" } : apt))
        );
      } else {
        toast.error(result.error || "Không thể hoàn thành lịch hẹn");
      }
    } catch (error) {
      console.error("Complete appointment error:", error);
      toast.error("Lỗi khi hoàn thành lịch hẹn");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle cancel appointment
  const handleCancelAppointment = async (appointmentId: string, reason: string = "Bác sĩ hủy lịch hẹn") => {
    if (!session || actionLoading) return;

    try {
      setActionLoading(true);
      const accessToken = (session as ExtendedSession).accessToken;
      const result = await appointmentService.cancelAppointment(appointmentId, reason, accessToken);

      if (result.success) {
        toast.success("Đã hủy lịch hẹn");
        // Remove from local state (since backend deletes the appointment)
        setAppointments((prev) => prev.filter((apt) => apt.id !== appointmentId));
        if (detailModalOpen && selectedAppointment?.id === appointmentId) {
          setDetailModalOpen(false);
          setSelectedAppointment(null);
        }
      } else {
        toast.error(result.error || "Không thể hủy lịch hẹn");
      }
    } catch (error) {
      console.error("Cancel appointment error:", error);
      toast.error("Lỗi khi hủy lịch hẹn");
    } finally {
      setActionLoading(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
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
                                handleConfirmAppointment(apt._id || apt.id);
                              }}
                              disabled={actionLoading}
                              className="px-3 py-1 bg-primary text-white rounded text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading ? "..." : "Xác nhận"}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelAppointment(apt._id || apt.id);
                              }}
                              disabled={actionLoading}
                              className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading ? "..." : "Hủy"}
                            </button>
                          </>
                        )}
                        {apt.status === "confirmed" && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCompleteAppointment(apt._id || apt.id);
                              }}
                              disabled={actionLoading}
                              className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading ? "..." : "Hoàn thành"}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelAppointment(apt._id || apt.id);
                              }}
                              disabled={actionLoading}
                              className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading ? "..." : "Hủy"}
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
                  <button
                    onClick={() => {
                      handleConfirmAppointment(selectedAppointment._id || selectedAppointment.id);
                      setDetailModalOpen(false);
                    }}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? "Đang xử lý..." : "Xác Nhận"}
                  </button>
                )}
                {selectedAppointment.status === "confirmed" && (
                  <button
                    onClick={() => {
                      handleCompleteAppointment(selectedAppointment._id || selectedAppointment.id);
                      setDetailModalOpen(false);
                    }}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? "Đang xử lý..." : "Hoàn Thành"}
                  </button>
                )}
                {(selectedAppointment.status === "pending" || selectedAppointment.status === "confirmed") && (
                  <button
                    onClick={() => {
                      handleCancelAppointment(selectedAppointment._id || selectedAppointment.id);
                      setDetailModalOpen(false);
                    }}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? "Đang xử lý..." : "Hủy Lịch Hẹn"}
                  </button>
                )}
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
