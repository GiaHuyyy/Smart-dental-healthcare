"use client";

import { useState } from "react";

export default function DoctorSchedule() {
  const [selectedDate, setSelectedDate] = useState("2024-01-15");
  const [selectedView, setSelectedView] = useState("day");

  const appointments = [
    {
      id: 1,
      time: "09:00",
      duration: 30,
      patient: "Nguyễn Văn A",
      type: "Khám định kỳ",
      phone: "0123456789",
      status: "confirmed",
    },
    {
      id: 2,
      time: "10:00",
      duration: 45,
      patient: "Trần Thị B",
      type: "Nhổ răng khôn",
      phone: "0987654321",
      status: "in-progress",
    },
    {
      id: 3,
      time: "11:00",
      duration: 60,
      patient: "Lê Văn C",
      type: "Tẩy trắng răng",
      phone: "0365478912",
      status: "waiting",
    },
  ];

  const timeSlots = Array.from({ length: 20 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lịch khám</h1>
          <p className="text-gray-600">Quản lý lịch khám và cuộc hẹn</p>
        </div>
        <div className="flex space-x-2">
          <button
            className={`px-4 py-2 rounded-md ${
              selectedView === "day" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
            }`}
            onClick={() => setSelectedView("day")}
          >
            Ngày
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              selectedView === "week" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
            }`}
            onClick={() => setSelectedView("week")}
          >
            Tuần
          </button>
        </div>
      </div>

      {/* Date Picker */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Thứ 2, 15 tháng 1, 2024</h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          />
        </div>

        {/* Today's Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">8</p>
            <p className="text-sm text-gray-600">Tổng lịch hẹn</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">5</p>
            <p className="text-sm text-gray-600">Hoàn thành</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">1</p>
            <p className="text-sm text-gray-600">Đang khám</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">2</p>
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
                const appointment = appointments.find((apt) => apt.time === time);
                return (
                  <div key={time} className="flex items-center min-h-[50px] border-b border-gray-100">
                    <div className="w-16 text-sm text-gray-500 font-mono">{time}</div>
                    <div className="flex-1 ml-4">
                      {appointment ? (
                        <div
                          className={`p-2 rounded border-l-4 ${
                            appointment.status === "confirmed"
                              ? "bg-blue-50 border-blue-500"
                              : appointment.status === "in-progress"
                              ? "bg-green-50 border-green-500"
                              : "bg-yellow-50 border-yellow-500"
                          }`}
                        >
                          <p className="font-medium text-sm">{appointment.patient}</p>
                          <p className="text-xs text-gray-600">{appointment.type}</p>
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
              {appointments.map((appointment) => (
                <div key={appointment.id} className="bg-gray-50 rounded-lg p-4 border">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{appointment.patient}</h4>
                      <p className="text-sm text-gray-600">{appointment.type}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        appointment.status === "confirmed"
                          ? "bg-blue-100 text-blue-800"
                          : appointment.status === "in-progress"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {appointment.status === "confirmed" && "Đã xác nhận"}
                      {appointment.status === "in-progress" && "Đang khám"}
                      {appointment.status === "waiting" && "Chờ khám"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      ⏰ {appointment.time} ({appointment.duration} phút)
                    </p>
                    <p>📞 {appointment.phone}</p>
                  </div>
                  <div className="mt-3 flex space-x-2">
                    <button className="text-blue-600 hover:text-blue-800 text-sm">Xem hồ sơ</button>
                    <button className="text-green-600 hover:text-green-800 text-sm">Bắt đầu khám</button>
                    <button className="text-gray-600 hover:text-gray-800 text-sm">Hủy lịch</button>
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
