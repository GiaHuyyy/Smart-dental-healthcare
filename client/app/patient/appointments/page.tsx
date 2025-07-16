"use client";

import { useState } from "react";

export default function PatientAppointments() {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");

  const appointments = [
    {
      id: 1,
      date: "15/01/2024",
      time: "09:00",
      doctor: "BS. Nguyễn Thị B",
      type: "Khám định kỳ",
      status: "confirmed",
    },
    {
      id: 2,
      date: "20/01/2024",
      time: "14:00",
      doctor: "BS. Trần Văn C",
      type: "Tẩy trắng răng",
      status: "pending",
    },
  ];

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

  const doctors = [
    { id: 1, name: "BS. Nguyễn Thị B", specialty: "Nha khoa tổng quát" },
    { id: 2, name: "BS. Trần Văn C", specialty: "Thẩm mỹ răng" },
    { id: 3, name: "BS. Lê Thị D", specialty: "Chỉnh nha" },
  ];

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
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chọn bác sĩ</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
              >
                <option value="">Chọn bác sĩ</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.name}>
                    {doctor.name} - {doctor.specialty}
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
              <select className="w-full border border-gray-300 rounded-md px-3 py-2">
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
              />
            </div>

            <button type="submit" className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700">
              Đặt lịch hẹn
            </button>
          </form>
        </div>

        {/* Current Appointments */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Lịch hẹn của bạn</h2>
          </div>
          <div className="p-6 space-y-4">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{appointment.type}</h3>
                    <p className="text-sm text-gray-600">{appointment.doctor}</p>
                    <p className="text-sm text-gray-500">
                      {appointment.date} - {appointment.time}
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
