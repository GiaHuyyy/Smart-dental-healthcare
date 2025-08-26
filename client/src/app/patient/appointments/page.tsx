"use client";

import { sendRequest } from "@/utils/api";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function PatientAppointments() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [appointmentType, setAppointmentType] = useState("Khám định kỳ");
  const [notes, setNotes] = useState("");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctorBusyTimes, setDoctorBusyTimes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [prefilledData, setPrefilledData] = useState<{
    doctorId?: string;
    doctorName?: string;
    specialty?: string;
    notes?: string;
    urgency?: string;
    symptoms?: string;
  } | null>(null);

  const availableTimes = [
    "08:00",
    "08:30",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
  ];

  function getDateTimeFrom(dateStr: string, timeStr: string) {
    if (!dateStr || !timeStr) return null;
    const [y, m, d] = dateStr.split("-").map(Number);
    const [hh, mm] = timeStr.split(":" ).map(Number);
    return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
  }

  useEffect(() => {
    async function loadDoctors() {
      try {
        const res = await sendRequest<any>({
          method: "GET",
          url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/users/doctors`,
        });
        const list = res?.data || res?.users || res || [];
        setDoctors(Array.isArray(list) ? list : []);
      } catch (e) {
        setDoctors([
          { _id: "1", fullName: "bác sĩ ảo", specialty: "Nha khoa tổng quát" },
          { _id: "2", fullName: "server chưa hiện bác sĩ", specialty: "Thẩm mỹ răng" },
        ]);
      }
    }

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
        // ignore
      }
    }

    loadDoctors();
    loadAppointments();
  }, [session]);

  // Process URL parameters for pre-filling data
  useEffect(() => {
    const doctorId = searchParams.get('doctorId');
    const doctorName = searchParams.get('doctorName');
    const specialty = searchParams.get('specialty');
    const notesParam = searchParams.get('notes');
    const urgency = searchParams.get('urgency');
    const symptoms = searchParams.get('symptoms');

         if (doctorId || doctorName || notesParam || urgency || symptoms) {
       setPrefilledData({
         doctorId: doctorId || undefined,
         doctorName: doctorName || undefined,
         specialty: specialty || undefined,
         notes: notesParam || undefined,
         urgency: urgency || undefined,
         symptoms: symptoms || undefined
       });

      // Auto-fill doctor if doctorId is provided - set immediately
      if (doctorId) {
        setSelectedDoctorId(doctorId);
      }

      // Auto-fill notes
      if (notesParam) {
        setNotes(notesParam);
      }

      // Auto-fill appointment type based on urgency
      if (urgency === 'high') {
        setAppointmentType('Khám cấp cứu');
      } else if (urgency === 'medium') {
        setAppointmentType('Khám định kỳ');
      }

      // Show success message only if coming from chatbot
      if (doctorName || notesParam) {
        setTimeout(() => {
          alert(`Đã chuyển từ chatbot với thông tin:\n${doctorName ? `Bác sĩ: ${doctorName}\n` : ''}${notesParam ? `Triệu chứng: ${notesParam.substring(0, 100)}...` : ''}`);
        }, 500);
      }
    }
  }, [searchParams]);

  // Auto-select doctor when doctors are loaded and we have a doctorId
  useEffect(() => {
    if (doctors.length > 0 && prefilledData?.doctorId) {
      const doctor = doctors.find(d => d._id === prefilledData.doctorId || d.id === prefilledData.doctorId);
      if (doctor) {
        setSelectedDoctorId(doctor._id || doctor.id);
      }
    }
  }, [doctors, prefilledData?.doctorId]);

  // Additional effect to ensure doctor is selected when coming from chatbot
  useEffect(() => {
    if (doctors.length > 0 && searchParams.get('doctorId') && !selectedDoctorId) {
      const doctorId = searchParams.get('doctorId');
      const doctor = doctors.find(d => d._id === doctorId || d.id === doctorId);
      if (doctor) {
        setSelectedDoctorId(doctor._id || doctor.id);
      }
    }
  }, [doctors, searchParams, selectedDoctorId]);

  useEffect(() => {
    async function fetchBusy() {
      setDoctorBusyTimes(new Set());
      if (!selectedDoctorId || !selectedDate) return;
      try {
        const res = await sendRequest<any>({
          method: "GET",
          url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/doctor/${selectedDoctorId}`,
        });
        const list = res?.data || res || [];
        const arr = Array.isArray(list) ? list : list?.results || [];
        const busy = new Set<string>();
        for (const a of arr) {
          const d = a.appointmentDate || a.date;
          if (!d) continue;
          const sameDay = new Date(d).toISOString().slice(0, 10) === selectedDate;
          if (!sameDay) continue;
          const status = (a.status || "").toString().toLowerCase();
          if (status === "cancelled" || status === "canceled") continue;
          const start = a.startTime || a.time || a.appointmentTime;
          if (!start) continue;
          const m = start.toString().match(/(\d{1,2}:\d{2})/);
          if (m) busy.add(m[1]);
        }
        setDoctorBusyTimes(busy);
      } catch (e) {
        console.warn("fetch doctor busy times failed", e);
      }
    }
    fetchBusy();
  }, [selectedDoctorId, selectedDate]);

  function addMinutesToTime(time: string, minsToAdd: number) {
    const [hh, mm] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(hh, mm + minsToAdd, 0, 0);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function isTimeDisabledForBooking(dateStr: string, timeStr: string) {
    const dt = getDateTimeFrom(dateStr, timeStr);
    if (!dt) return true;
    const now = new Date();
    if (dt.getTime() <= now.getTime()) return true;
    const minLead = 2 * 60 * 60 * 1000;
    if (dt.getTime() - now.getTime() < minLead) return true;
    return false;
  }

  function formatAppointmentDate(appt: any) {
    const d = appt?.appointmentDate || appt?.date;
    if (!d) return "—";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "—";
    return dt.toLocaleDateString();
  }

  function formatAppointmentTime(appt: any) {
    const t = appt?.startTime || appt?.time || appt?.appointmentTime;
    return t || "—";
  }

  function getAuthHeaders() {
    const token = (session as any)?.access_token || (session as any)?.user?.access_token || (session as any)?.user?.accessToken || (session as any)?.token?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!session?.user?._id) {
      alert("Vui lòng đăng nhập để đặt lịch");
      return;
    }

    if (!selectedDoctorId) {
      alert("Vui lòng chọn bác sĩ");
      return;
    }
    if (!selectedDate || !selectedTime) {
      alert("Vui lòng chọn ngày và giờ");
      return;
    }

    const chosen = getDateTimeFrom(selectedDate, selectedTime);
    if (!chosen) {
      alert("Ngày hoặc giờ không hợp lệ");
      return;
    }
    const now = new Date();
    if (chosen.getTime() <= now.getTime()) {
      alert("Không thể đặt lịch vào thời gian đã qua");
      return;
    }
    const minLead = 2 * 60 * 60 * 1000;
    if (chosen.getTime() - now.getTime() < minLead) {
      alert("Vui lòng đặt lịch ít nhất 2 tiếng trước giờ hẹn");
      return;
    }

    setLoading(true);

    try {
      const duration = 30;
      const endTime = addMinutesToTime(selectedTime, duration);

  // Normalize appointmentDate to UTC midnight ISO to avoid timezone shifts (store date-only)
  const [y, m, d] = selectedDate.split('-').map(Number);
  const appointmentDateISO = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 0, 0, 0)).toISOString();

      const body = {
        patientId: session.user._id,
        doctorId: selectedDoctorId,
        appointmentDate: appointmentDateISO,
        startTime: selectedTime,
        endTime,
        appointmentType,
        notes,
        duration: Number(duration),
      };

      console.log('Creating appointment payload:', body);

      const res = await sendRequest<any>({
        method: "POST",
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments`,
        body,
      });

      console.log('Create appointment response:', res);

      if (res && (res as any).statusCode && (res as any).statusCode >= 400) {
        const msg = (res as any).message || (res as any).error || "Lỗi server";
        throw new Error(msg);
      }

      const created = res?.data || res;
      setAppointments((prev) => (Array.isArray(prev) ? [created, ...prev] : prev));
      alert("Tạo lịch hẹn thành công");
      setSelectedDate("");
      setSelectedTime("");
      setNotes("");
    } catch (err: any) {
      console.error("Create appointment error:", err);
      const message = err?.message || err?.error || "Tạo lịch hẹn thất bại";
      
      // Hiển thị thông báo lỗi cụ thể
      if (message.includes("Bác sĩ đã có lịch hẹn vào khung giờ này")) {
        alert("Bác sĩ đã có lịch hẹn vào khung giờ này. Vui lòng chọn khung giờ khác.");
      } else {
        alert(`Lỗi: ${message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(appointmentId: string) {
    if (!confirm('Bạn có chắc muốn hủy lịch hẹn này không?')) return;
    try {
      const headers = getAuthHeaders();
      const res = await sendRequest<any>({
        method: 'DELETE',
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/${appointmentId}/cancel`,
        body: { reason: 'Hủy bởi bệnh nhân' },
        headers,
      });
      console.log('cancel response', res);
      // Xóa lịch hẹn khỏi danh sách vì đã bị xóa khỏi database
      setAppointments((prev) => prev.filter(a => a._id !== appointmentId));
      alert('Đã hủy lịch hẹn');
    } catch (err: any) {
      console.error('Cancel error', err);
      alert('Hủy lịch thất bại');
    }
  }

  async function handleEdit(appointment: any) {
    // Simple prompt-based reschedule for now (date + time)
    if (appointment.status === 'confirmed') {
      alert('Lịch đã được xác nhận, không thể sửa.');
      return;
    }
  const newDate = prompt('Nhập ngày mới (YYYY-MM-DD)', appointment.appointmentDate ? new Date(appointment.appointmentDate).toISOString().slice(0,10) : '');
    if (!newDate) return;
    const newTime = prompt('Nhập giờ mới (HH:MM)', appointment.startTime || '08:00');
    if (!newTime) return;

    try {
  const [yy, mm, dd] = newDate.split('-').map(Number);
  const appointmentDateISO = new Date(Date.UTC(yy, (mm || 1) - 1, dd || 1, 0, 0, 0)).toISOString();
      const res = await sendRequest<any>({
        method: 'PATCH',
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/${appointment._id}/reschedule`,
        body: { appointmentDate: appointmentDateISO, appointmentTime: newTime },
      });
      console.log('reschedule response', res);
      // update local list: mark as pending/rescheduled
      setAppointments((prev) => prev.map(a => a._id === appointment._id ? { ...a, appointmentDate: appointmentDateISO, startTime: newTime, status: 'pending' } : a));
      alert('Đã gửi yêu cầu đổi lịch');
    } catch (err: any) {
      console.error('Reschedule error', err);
      alert('Đổi lịch thất bại');
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
                             {prefilledData?.doctorName && !selectedDoctorId && doctors.length > 0 && (
                 <p className="text-sm text-blue-600 mt-1">
                   💡 Gợi ý từ chatbot: {prefilledData.doctorName} - {prefilledData.specialty}
                 </p>
               )}
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
                {availableTimes.map((time) => {
                  const slotOccupiedByDoctor = doctorBusyTimes.has(time);
                  const disabledByRules = isTimeDisabledForBooking(selectedDate, time) || slotOccupiedByDoctor;
                  return (
                    <button
                      key={time}
                      type="button"
                      className={`p-2 text-sm rounded border flex items-center justify-center ${
                        selectedTime === time
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      } ${disabledByRules ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => {
                        if (!disabledByRules) setSelectedTime(time);
                      }}
                    >
                      <span>{time}</span>
                      {slotOccupiedByDoctor ? <span className="ml-2 text-xs text-red-600">(Bận)</span> : null}
                    </button>
                  );
                })}
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
                 className={`w-full border border-gray-300 rounded-md px-3 py-2 ${
                   prefilledData?.notes && prefilledData.notes.includes('🔍 KẾT QUẢ PHÂN TÍCH AI') 
                     ? 'border-blue-300 bg-blue-50' 
                     : ''
                 }`}
                 rows={6}
                 placeholder="Mô tả triệu chứng hoặc yêu cầu đặc biệt..."
                 value={notes}
                 onChange={(e) => setNotes(e.target.value)}
               />
               {prefilledData?.notes && prefilledData.notes.includes('🔍 KẾT QUẢ PHÂN TÍCH AI') && (
                 <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                   <p className="text-sm text-blue-800 font-medium mb-2">
                     💡 Thông tin từ chatbot đã được điền sẵn:
                   </p>
                   <div className="text-xs text-blue-700 space-y-1">
                     {prefilledData.notes.includes('📋 TRIỆU CHỨNG:') && (
                       <div className="flex items-start">
                         <span className="font-medium mr-2">📋</span>
                         <span>Triệu chứng đã được ghi nhận</span>
                       </div>
                     )}
                     {prefilledData.notes.includes('🔍 KẾT QUẢ PHÂN TÍCH AI:') && (
                       <div className="flex items-start">
                         <span className="font-medium mr-2">🔍</span>
                         <span>Kết quả phân tích AI đã được bao gồm</span>
                       </div>
                     )}
                     {prefilledData.notes.includes('🖼️ HÌNH ẢNH:') && (
                       <div className="flex items-start">
                         <span className="font-medium mr-2">🖼️</span>
                         <span>Hình ảnh X-quang đã được phân tích</span>
                       </div>
                     )}
                     {prefilledData.notes.includes('💬 LỊCH SỬ CHAT:') && (
                       <div className="flex items-start">
                         <span className="font-medium mr-2">💬</span>
                         <span>Lịch sử chat đã được ghi nhận</span>
                       </div>
                     )}
                     {prefilledData.notes.includes('💡 KHUYẾN NGHỊ:') && (
                       <div className="flex items-start">
                         <span className="font-medium mr-2">💡</span>
                         <span>Khuyến nghị điều trị đã được đưa ra</span>
                       </div>
                     )}
                   </div>
                   <div className="mt-2 flex space-x-2">
                     <button
                       type="button"
                       onClick={() => {
                         const textarea = document.querySelector('textarea[placeholder*="triệu chứng"]') as HTMLTextAreaElement;
                         if (textarea) {
                           textarea.focus();
                           textarea.setSelectionRange(0, textarea.value.length);
                         }
                       }}
                       className="text-xs text-blue-600 hover:text-blue-800 underline"
                       title="Click để xem toàn bộ nội dung ghi chú"
                     >
                       📝 Xem chi tiết ghi chú
                     </button>
                     <button
                       type="button"
                       onClick={() => {
                         const textarea = document.querySelector('textarea[placeholder*="triệu chứng"]') as HTMLTextAreaElement;
                         if (textarea) {
                           textarea.focus();
                         }
                       }}
                       className="text-xs text-green-600 hover:text-green-800 underline"
                     >
                       ✏️ Chỉnh sửa ghi chú
                     </button>
                   </div>
                 </div>
               )}
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
            {appointments.map((appointment, idx) => (
              <div key={appointment._id || appointment.id || `${appointment.appointmentDate || appointment.date}-${appointment.startTime || appointment.time}` || idx} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{appointment.appointmentType || appointment.type}</h3>
                    <p className="text-sm text-gray-600">{appointment.doctor?.fullName || appointment.doctor}</p>
                    <p className="text-sm text-gray-500">{formatAppointmentDate(appointment)} - {formatAppointmentTime(appointment)}</p>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${appointment.status === "confirmed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                      {appointment.status === "confirmed" ? "Đã xác nhận" : "Chờ xác nhận"}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(appointment)}
                        className={`text-blue-600 hover:text-blue-800 text-sm ${appointment.status === 'confirmed' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={appointment.status === 'confirmed'}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancel(appointment._id)}
                        className={`text-red-600 hover:text-red-800 text-sm ${appointment.status === 'confirmed' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={appointment.status === 'confirmed'}
                      >
                        Hủy
                      </button>
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
 
