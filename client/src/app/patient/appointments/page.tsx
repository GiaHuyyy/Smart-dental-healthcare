"use client";

import { sendRequest } from "@/utils/api";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function PatientAppointments() {
  const { data: session } = useSession();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [appointmentType, setAppointmentType] = useState("Khám định kỳ");
  const [notes, setNotes] = useState("");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const availableTimes = [
    "08:00",
    "08:30",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
  ];

  useEffect(() => {
    // Fetch doctors list (best-effort). Endpoint: /api/v1/users/doctors
    async function loadDoctors() {
      try {
        const res = await sendRequest<any>({
          method: "GET",
          url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/users/doctors`,
        });

        // res may be wrapped; try to extract list
        const list = res?.data || res?.users || res || [];
        setDoctors(Array.isArray(list) ? list : []);
      } catch (e) {
        // fallback to mock if fetch fails
        setDoctors([
          { _id: "1", fullName: "bác sĩ ảo", specialty: "Nha khoa tổng quát" },
          { _id: "2", fullName: "server chưa hiện bác sĩ", specialty: "Thẩm mỹ răng" },
        ]);
      }
    }

    // Load patient's upcoming appointments if session available
    async function loadAppointments() {
      if (!session?.user?._id) return;
      try {
        const res = await sendRequest<any>({
          method: "GET",
          url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/patient/${session.user._id}`,
        });

        const list = res?.data || res || [];
        setAppointments(Array.isArray(list) ? list : []);
      } catch (e) {
        // leave appointments empty on error
      }
    }

    loadDoctors();
    loadAppointments();
  }, [session]);

  function addMinutesToTime(time: string, minsToAdd: number) {
    const [hh, mm] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(hh, mm + minsToAdd, 0, 0);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDoctorId) {
      alert("Vui lòng chọn bác sĩ");
      return;
    }
    if (!selectedDate || !selectedTime) {
      alert("Vui lòng chọn ngày và giờ");
      return;
    }

    setLoading(true);

    try {
      const duration = 30; // default duration
      const endTime = addMinutesToTime(selectedTime, duration);

      const body = {
        patientId: session?.user?._id || undefined,
        doctorId: selectedDoctorId,
        appointmentDate: new Date(selectedDate).toISOString(),
        startTime: selectedTime,
        endTime,
        appointmentType,
        notes,
        duration,
      };

      const res = await sendRequest<any>({
        method: "POST",
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments`,
        body,
      });

      // Try to extract created appointment
      const created = res?.data || res;
      // prepend to appointments list if created
      setAppointments((prev) => (Array.isArray(prev) ? [created, ...prev] : prev));
      alert("Tạo lịch hẹn thành công");
      // reset form
      setSelectedDate("");
      setSelectedTime("");
      setNotes("");
    } catch (err: any) {
      console.error(err);
      alert("Tạo lịch hẹn thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Đặt lịch hẹn</h1>
          <p className="text-gray-600">Quản lý và đặt lịch khám mới</p>
        </div>
        <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">Đặt lịch mới</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Đặt lịch khám mới</h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chọn bác sĩ</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
              >
                <option value="">Chọn bác sĩ</option>
                {doctors.map((doctor) => (
                  <option key={doctor._id || doctor.id} value={doctor._id || doctor.id}>
                    {doctor.fullName || doctor.name} - {doctor.specialty}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chọn ngày</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chọn giờ</label>
              <div className="grid grid-cols-3 gap-2">
                {availableTimes.map((time) => (
                  <button
                    key={time}
                    type="button"
                    className={`p-2 text-sm rounded border ${
                      selectedTime === time
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedTime(time)}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loại khám</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={appointmentType}
                onChange={(e) => setAppointmentType(e.target.value)}
              >
                <option>Khám định kỳ</option>
                <option>Khám cấp cứu</option>
                <option>Tẩy trắng răng</option>
                <option>Chỉnh nha</option>
                <option>Nhổ răng</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
              <textarea
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                rows={3}
                placeholder="Mô tả triệu chứng hoặc yêu cầu đặc biệt..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-60"
            >
              {loading ? "Đang xử lý..." : "Đặt lịch hẹn"}
            </button>
          </form>
        </div>

        {/* Current Appointments */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Lịch hẹn của bạn</h2>
          </div>
          <div className="p-6 space-y-4">
            {appointments.length === 0 && <p className="text-sm text-gray-500">Chưa có lịch hẹn nào.</p>}
            {appointments.map((appointment) => (
              <div key={appointment._id || appointment.id || appointment.startTime} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{appointment.appointmentType || appointment.type}</h3>
                    <p className="text-sm text-gray-600">{appointment.doctor?.fullName || appointment.doctor}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(appointment.appointmentDate || appointment.date).toLocaleDateString()} - {appointment.startTime || appointment.time}
                    </p>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        appointment.status === "confirmed"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {appointment.status === "confirmed" ? "Đã xác nhận" : "Chờ xác nhận"}
                    </span>
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-800 text-sm">Sửa</button>
                      <button className="text-red-600 hover:text-red-800 text-sm">Hủy</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
