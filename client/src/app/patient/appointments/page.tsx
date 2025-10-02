"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearAppointmentData } from "@/store/slices/appointmentSlice";
import { sendRequest } from "@/utils/api";
import { useSession } from "next-auth/react";
import Image from "next/image";
// Note: avoid `useSearchParams` here to prevent Next.js prerender issues.
// We'll read window.location.search inside an effect when running in the browser.
import { useCallback, useEffect, useState } from "react";
import { Search, FileText } from "lucide-react";

export default function PatientAppointments() {
  const { data: session } = useSession();
  // searchParams replaced by client-side URLSearchParams in effect
  // const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const appointmentState = useAppSelector((state: any) => state.appointment);
  const { appointmentData, selectedDoctor, symptoms, urgencyLevel, notes: chatNotes } = appointmentState;
  const patientId = session?.user?._id;

  const loadAppointments = useCallback(async () => {
    if (!patientId) return;
    try {
      const res = await sendRequest<any>({
        method: "GET",
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/patient/${patientId}`,
      });
      const list = res?.data || res || [];
      if (Array.isArray(list)) {
        setAppointments(list);
      } else if (Array.isArray((list as any)?.results)) {
        setAppointments((list as any).results);
      } else {
        setAppointments([]);
      }
    } catch (e) {
      // ignore fetch failures; UI retains previous state and polling will retry
      console.warn("loadAppointments failed", e);
    }
  }, [patientId]);

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
    uploadedImage?: string;
    analysisResult?: any;
    imageUrl?: string;
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
    const [hh, mm] = timeStr.split(":").map(Number);
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

    loadDoctors();
    void loadAppointments();
  }, [session, loadAppointments]);

  // Process Redux data for pre-filling data
  useEffect(() => {
    // Check if we have data from Redux (coming from chat)
    if (appointmentData || selectedDoctor || symptoms || chatNotes) {
      const data = {
        doctorId: appointmentData?.doctorId || selectedDoctor?._id || "",
        doctorName: appointmentData?.doctorName || selectedDoctor?.fullName || "",
        specialty: appointmentData?.specialty || selectedDoctor?.specialty || "",
        notes: appointmentData?.notes || chatNotes || "",
        urgency: appointmentData?.urgency || urgencyLevel || "low",
        symptoms: appointmentData?.symptoms || symptoms || "",
        uploadedImage: appointmentData?.uploadedImage || "",
        analysisResult: appointmentData?.analysisResult || "",
        imageUrl: appointmentData?.imageUrl || "",
      };

      setPrefilledData(data);

      if (data.doctorId) {
        setSelectedDoctorId(data.doctorId);
      }

      if (data.notes) {
        let normalized = data.notes.replace(/🔍\s*/g, "");
        normalized = normalized.replace("KẾT QUẢ PHÂN TÍCH AI", "KẾT QUẢ PHÂN TÍCH AI");
        setNotes(normalized);
      }

      if (data.urgency === "high") {
        setAppointmentType("Khám cấp cứu");
      } else if (data.urgency === "medium") {
        setAppointmentType("Khám định kỳ");
      }
    }
  }, [appointmentData, selectedDoctor, symptoms, chatNotes, urgencyLevel]);

  useEffect(() => {
    if (doctors.length > 0 && prefilledData?.doctorId) {
      const doctor = doctors.find((d) => d._id === prefilledData.doctorId || d.id === prefilledData.doctorId);
      if (doctor) {
        setSelectedDoctorId(doctor._id || doctor.id);
      }
    }
  }, [doctors, prefilledData?.doctorId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!patientId) return;

    const intervalId = window.setInterval(() => {
      void loadAppointments();
    }, 20000);

    return () => window.clearInterval(intervalId);
  }, [patientId, loadAppointments]);

  useEffect(() => {
    // Only run in browser
    if (typeof window === "undefined") return;

    try {
      const params = new URLSearchParams(window.location.search);
      const doctorId = params.get("doctorId");
      if (doctors.length > 0 && doctorId && !selectedDoctorId) {
        const doctor = doctors.find((d) => d._id === doctorId || d.id === doctorId);
        if (doctor) {
          setSelectedDoctorId(doctor._id || doctor.id);
        }
      }
    } catch (e) {
      // ignore malformed URL
    }
  }, [doctors, selectedDoctorId]);

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
    const token =
      (session as any)?.access_token ||
      (session as any)?.user?.access_token ||
      (session as any)?.user?.accessToken ||
      (session as any)?.token?.access_token;
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

      const [y, m, d] = selectedDate.split("-").map(Number);
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

      const res = await sendRequest<any>({
        method: "POST",
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments`,
        body,
      });

      if (res && (res as any).statusCode && (res as any).statusCode >= 400) {
        const msg = (res as any).message || (res as any).error || "Lỗi server";
        throw new Error(msg);
      }

  await loadAppointments();
      alert("Tạo lịch hẹn thành công");
      setSelectedDate("");
      setSelectedTime("");
      setNotes("");

      dispatch(clearAppointmentData());
    } catch (err: any) {
      const message = err?.message || err?.error || "Tạo lịch hẹn thất bại";
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
    if (!confirm("Bạn có chắc muốn hủy lịch hẹn này không?")) return;
    try {
      const headers = getAuthHeaders();
      const res = await sendRequest<any>({
        method: "DELETE",
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/${appointmentId}/cancel`,
        body: { reason: "Hủy bởi bệnh nhân" },
        headers,
      });
      setAppointments((prev) => prev.filter((a) => a._id !== appointmentId));
      alert("Đã hủy lịch hẹn");
      await loadAppointments();
    } catch (err: any) {
      alert("Hủy lịch thất bại");
    }
  }

  async function handleEdit(appointment: any) {
    if (appointment.status === "confirmed") {
      alert("Lịch đã được xác nhận, không thể sửa.");
      return;
    }
    const newDate = prompt(
      "Nhập ngày mới (YYYY-MM-DD)",
      appointment.appointmentDate ? new Date(appointment.appointmentDate).toISOString().slice(0, 10) : ""
    );
    if (!newDate) return;
    const newTime = prompt("Nhập giờ mới (HH:MM)", appointment.startTime || "08:00");
    if (!newTime) return;

    try {
      const [yy, mm, dd] = newDate.split("-").map(Number);
      const appointmentDateISO = new Date(Date.UTC(yy, (mm || 1) - 1, dd || 1, 0, 0, 0)).toISOString();
      await sendRequest<any>({
        method: "PATCH",
        url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/${appointment._id}/reschedule`,
        body: { appointmentDate: appointmentDateISO, appointmentTime: newTime },
      });
      setAppointments((prev) =>
        prev.map((a) =>
          a._id === appointment._id
            ? { ...a, appointmentDate: appointmentDateISO, startTime: newTime, status: "pending" }
            : a
        )
      );
      alert("Đã gửi yêu cầu đổi lịch");
    } catch (err: any) {
      alert("Đổi lịch thất bại");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 to-indigo-50/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="healthcare-card-elevated p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                style={{
                  backgroundImage: `linear-gradient(to bottom right, var(--color-primary), var(--color-primary-600))`,
                }}
              >
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="healthcare-heading text-2xl">Đặt lịch hẹn</h1>
                <p className="healthcare-body mt-1">Quản lý và đặt lịch khám mới</p>

                {prefilledData?.notes && prefilledData.notes.includes("KẾT QUẢ PHÂN TÍCH AI") && (
                  <div className="mt-3 p-3 bg-blue-50 border rounded-lg border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="mr-2" style={{ color: "var(--color-primary)" }}>
                          🤖
                        </span>
                        <span className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
                          Đã chuyển từ chatbot với phân tích AI và hình ảnh X-ray
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          dispatch(clearAppointmentData());
                          setPrefilledData(null);
                          setNotes("");
                          setSelectedDoctorId("");
                          setAppointmentType("Khám định kỳ");
                        }}
                        className="text-xs underline"
                        style={{ color: "var(--color-primary)" }}
                      >
                        Xóa dữ liệu chatbot
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button className="btn-healthcare-primary">Đặt lịch mới</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Booking Form */}
          <div className="healthcare-card p-6">
            <h2 className="healthcare-heading text-xl mb-4">Đặt lịch khám mới</h2>
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
                  <div className="mt-2 p-3 bg-primary-100 border border-primary-outline rounded-lg">
                    <div className="flex items-center">
                      <span className="mr-2" style={{ color: "var(--color-primary)" }}>
                        🤖
                      </span>
                      <div className="text-sm">
                        <p className="font-medium" style={{ color: "var(--color-primary-600)" }}>
                          Gợi ý bác sĩ từ chatbot:
                        </p>
                        <p style={{ color: "var(--color-primary-700)" }}>
                          {prefilledData.doctorName} - {prefilledData.specialty}
                        </p>
                      </div>
                    </div>
                  </div>
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
                            ? "bg-primary-100 text-primary border-primary-outline"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        } ${
                          disabledByRules ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02] transition-transform"
                        }`}
                        onClick={() => {
                          if (!disabledByRules) setSelectedTime(time);
                        }}
                      >
                        <span>{time}</span>
                        {slotOccupiedByDoctor ? (
                          <span className="ml-2 text-xs" style={{ color: "var(--color-primary)" }}>
                            (Bận)
                          </span>
                        ) : null}
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

                {prefilledData?.symptoms && (
                  <div
                    className="mt-2 p-2 rounded border text-xs"
                    style={{ background: "var(--color-primary-outline)", borderColor: "var(--color-primary-outline)" }}
                  >
                    <p className="font-medium mb-1" style={{ color: "var(--color-primary-contrast)" }}>
                      <Search className="inline w-4 h-4 mr-1" /> Triệu chứng từ chatbot:
                    </p>
                    <p style={{ color: "var(--color-primary-contrast)" }}>{prefilledData.symptoms}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi chú
                  {prefilledData?.notes && prefilledData.notes.includes("🔍 KẾT QUẢ PHÂN TÍCH AI") && (
                    <span
                      className="ml-2 text-xs px-2 py-1 rounded-full"
                      style={{ background: "var(--color-primary-outline)", color: "var(--color-primary-contrast)" }}
                    >
                      🤖 Từ chatbot
                    </span>
                  )}
                </label>
                <textarea
                  className={`w-full border border-gray-300 rounded-md px-3 py-2`}
                  style={
                    prefilledData?.notes && prefilledData.notes.includes("🔍 KẾT QUẢ PHÂN TÍCH AI")
                      ? {
                          borderColor: "rgba(var(--color-primary-rgb),0.12)",
                          background: "var(--color-primary-outline)",
                        }
                      : undefined
                  }
                  rows={6}
                  placeholder="Mô tả triệu chứng hoặc yêu cầu đặc biệt..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />

                {prefilledData?.imageUrl && (
                  <div
                    className="mt-4 p-4 rounded-lg"
                    style={{
                      background: "var(--color-primary-outline)",
                      border: "1px solid rgba(var(--color-primary-rgb),0.12)",
                    }}
                  >
                    <h4
                      className="text-sm font-medium mb-2 flex items-center"
                      style={{ color: "var(--color-primary-contrast)" }}
                    >
                      <span className="mr-2">🖼️</span>
                      Hình ảnh X-ray từ chatbot
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative w-full h-64">
                        <Image
                          src={prefilledData.imageUrl}
                          alt="X-ray image from chat"
                          fill
                          className="object-contain rounded-lg border border-gray-300"
                        />
                      </div>
                      {prefilledData.analysisResult && (
                        <div className="text-sm" style={{ color: "var(--color-primary-contrast)" }}>
                          <p className="font-medium mb-2 flex items-center">
                            <span className="mr-1">
                              <Search className="w-4 h-4" />
                            </span>
                            Kết quả phân tích AI:
                          </p>
                          <div className="bg-white p-3 rounded border text-xs max-h-48 overflow-y-auto">
                            {prefilledData.analysisResult.richContent?.analysis ? (
                              <div>
                                <p className="font-medium mb-1">Chẩn đoán:</p>
                                <p className="mb-2">{prefilledData.analysisResult.richContent.analysis}</p>
                                {prefilledData.analysisResult.richContent.recommendations && (
                                  <div>
                                    <p className="font-medium mb-1">Khuyến nghị:</p>
                                    <ul className="list-disc list-inside space-y-1">
                                      {prefilledData.analysisResult.richContent.recommendations.map(
                                        (rec: string, index: number) => (
                                          <li key={index}>{rec}</li>
                                        )
                                      )}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p>{prefilledData.analysisResult.analysis || "Đã phân tích hình ảnh X-ray"}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-healthcare-primary py-3 rounded-md"
                style={loading ? { opacity: 0.6, pointerEvents: "none" } : undefined}
              >
                {loading ? "Đang xử lý..." : "Đặt lịch hẹn"}
              </button>
            </form>
          </div>

          {/* Current Appointments */}
          <div className="healthcare-card">
            <div className="p-6 border-b border-gray-100">
              <h2 className="healthcare-heading text-xl">Lịch hẹn của bạn</h2>
            </div>
            <div className="p-6 space-y-4">
              {appointments.length === 0 && <p className="text-sm text-gray-500">Chưa có lịch hẹn nào.</p>}
              {appointments.map((appointment, idx) => (
                <div
                  key={
                    appointment._id ||
                    appointment.id ||
                    `${appointment.appointmentDate || appointment.date}-${appointment.startTime || appointment.time}` ||
                    idx
                  }
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{appointment.appointmentType || appointment.type}</h3>
                      <p className="text-sm text-gray-600">{appointment.doctor?.fullName || appointment.doctor}</p>
                      <p className="text-sm text-gray-500">
                        {formatAppointmentDate(appointment)} - {formatAppointmentTime(appointment)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          appointment.status === "confirmed"
                            ? "bg-primary-100 text-primary"
                            : "bg-primary-100 text-primary"
                        }`}
                      >
                        {appointment.status === "confirmed" ? "Đã xác nhận" : "Chờ xác nhận"}
                      </span>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(appointment)}
                          className={`text-primary text-sm ${
                            appointment.status === "confirmed" ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          disabled={appointment.status === "confirmed"}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancel(appointment._id)}
                          className={`text-gray-600 hover:text-gray-800 text-sm ${
                            appointment.status === "confirmed" ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          disabled={appointment.status === "confirmed"}
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
    </div>
  );
}
