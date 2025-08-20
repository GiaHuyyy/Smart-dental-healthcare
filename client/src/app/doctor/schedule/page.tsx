"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { sendRequest } from "@/utils/api";

export default function DoctorSchedule() {
  const { data: session } = useSession();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedView, setSelectedView] = useState("day");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const timeSlots = Array.from({ length: 20 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        console.debug("session:", session);

        let doctorId = session?.user?._id;

        // Fallback: resolve doctor id by email if _id not present
        if (!doctorId && session?.user?.email) {
          try {
            const userRes = await sendRequest<any>({
              method: "GET",
              url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/users`,
              queryParams: { email: session.user.email },
            });

            // users.findAll returns { results } or { data }
            const usersList = userRes?.results || userRes?.data || userRes;
            const u = Array.isArray(usersList) ? usersList[0] : (usersList?.[0] || null);
            if (u) doctorId = u._id || u.id;
            console.debug('Resolved doctorId by email:', doctorId, 'userRes:', userRes);
          } catch (err) {
            console.warn('Failed to resolve doctorId by email', err);
          }
        }

        if (!doctorId) {
          console.warn('No doctorId available in session and fallback failed');
          setAppointments([]);
          return;
        }

        // Fetch appointments for doctor and filter by date client-side if needed
        const res = await sendRequest<any>({
          method: "GET",
          url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/doctor/${doctorId}`,
        });

        console.debug('appointments response:', res);
        const list = res?.data || res || [];
        const arr = Array.isArray(list) ? list : (list?.results || []);

        // filter by selectedDate (compare date portion)
        const filtered = arr.filter((a: any) => {
          const d = a.appointmentDate || a.date;
          if (!d) return true;
          const iso = new Date(d).toISOString().slice(0, 10);
          return iso === selectedDate;
        });

        setAppointments(filtered);
      } catch (e) {
        console.error("Failed to load appointments", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [session, selectedDate]);

  async function updateStatus(id: string, action: "confirm" | "complete" | "cancel") {
    try {
      setLoading(true);
      let res;
      if (action === "confirm") {
        res = await sendRequest<any>({ method: "POST", url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/${id}/confirm` });
      } else if (action === "complete") {
        res = await sendRequest<any>({ method: "POST", url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/${id}/complete` });
      } else {
        res = await sendRequest<any>({ method: "POST", url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/${id}/cancel`, body: { reason: "Hủy bởi bác sĩ" } });
      }

      // optimistic update: replace appointment in list
      const updated = res?.data || res;
      setAppointments((prev) => prev.map((p) => (p._id === id || p.id === id ? { ...(p), ...(updated || {}) } : p)));
    } catch (err) {
      console.error(err);
      alert("Cập nhật trạng thái thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lịch khám</h1>
          <p className="text-gray-600">Quản lý lịch khám và cuộc hẹn</p>
        </div>
        <div className="flex space-x-2">
          <button
            className={`px-4 py-2 rounded-md ${selectedView === "day" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
            onClick={() => setSelectedView("day")}
          >
            Ngày
          </button>
          <button
            className={`px-4 py-2 rounded-md ${selectedView === "week" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
            onClick={() => setSelectedView("week")}
          >
            Tuần
          </button>
        </div>
      </div>

      {/* Date Picker */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{new Date(selectedDate).toLocaleDateString()}</h2>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2" />
        </div>

        {/* Today's Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{appointments.length}</p>
            <p className="text-sm text-gray-600">Tổng lịch hẹn</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{appointments.filter(a => a.status === 'completed').length}</p>
            <p className="text-sm text-gray-600">Hoàn thành</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{appointments.filter(a => a.status === 'in-progress').length}</p>
            <p className="text-sm text-gray-600">Đang khám</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{appointments.filter(a => a.status === 'waiting').length}</p>
            <p className="text-sm text-gray-600">Chờ khám</p>
          </div>
        </div>

        {/* Schedule Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Time Schedule */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Lịch theo giờ</h3>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {timeSlots.map((time) => {
                const appointment = appointments.find((apt) => apt.startTime?.startsWith(time) || apt.time === time);
                return (
                  <div key={time} className="flex items-center min-h-[50px] border-b border-gray-100">
                    <div className="w-16 text-sm text-gray-500 font-mono">{time}</div>
                    <div className="flex-1 ml-4">
                      {appointment ? (
                        <div className={`p-2 rounded border-l-4 ${appointment.status === "confirmed" ? "bg-blue-50 border-blue-500" : appointment.status === "in-progress" ? "bg-green-50 border-green-500" : "bg-yellow-50 border-yellow-500"}`}>
                          <p className="font-medium text-sm">{appointment.patient?.fullName || appointment.patient}</p>
                          <p className="text-xs text-gray-600">{appointment.appointmentType || appointment.type}</p>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">Trống</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Appointment Details */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Chi tiết cuộc hẹn</h3>
            <div className="space-y-3">
              {appointments.length === 0 && <p className="text-sm text-gray-500">Không có lịch hẹn.</p>}
              {appointments.map((appointment) => (
                <div key={appointment._id || appointment.id} className="bg-gray-50 rounded-lg p-4 border">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{appointment.patient?.fullName || appointment.patient}</h4>
                      <p className="text-sm text-gray-600">{appointment.appointmentType || appointment.type}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${appointment.status === "confirmed" ? "bg-blue-100 text-blue-800" : appointment.status === "in-progress" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                      {appointment.status === "confirmed" && "Đã xác nhận"}
                      {appointment.status === "in-progress" && "Đang khám"}
                      {appointment.status === "waiting" && "Chờ khám"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>⏰ {appointment.startTime || appointment.time} ({appointment.duration || appointment.durationMinutes || 30} phút)</p>
                    <p>📞 {appointment.patient?.phone || appointment.phone}</p>
                  </div>
                  <div className="mt-3 flex space-x-2">
                    <button className="text-blue-600 hover:text-blue-800 text-sm">Xem hồ sơ</button>
                    {appointment.status !== 'in-progress' && (
                      <button onClick={() => updateStatus(appointment._id || appointment.id, 'confirm')} className="text-green-600 hover:text-green-800 text-sm">Xác nhận</button>
                    )}
                    {appointment.status !== 'completed' && (
                      <button onClick={() => updateStatus(appointment._id || appointment.id, 'complete')} className="text-purple-600 hover:text-purple-800 text-sm">Hoàn thành</button>
                    )}
                    <button onClick={() => updateStatus(appointment._id || appointment.id, 'cancel')} className="text-gray-600 hover:text-gray-800 text-sm">Hủy lịch</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
