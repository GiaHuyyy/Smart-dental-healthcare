"use client";

import { sendRequest } from "@/utils/api";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DoctorSchedule() {
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedView, setSelectedView] = useState("day");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [apptLoading, setApptLoading] = useState<Record<string, boolean>>({});
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleApptId, setRescheduleApptId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [rescheduleSlot, setRescheduleSlot] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: string; text: string; type?: 'success' | 'error' }[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  function addToast(text: string, type: 'success' | 'error' = 'success') {
    setToasts(prev => [{ id: Date.now().toString(), text, type }, ...prev].slice(0, 5));
  }

  const timeSlots = Array.from({ length: 20 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  });

  function normalizeStatus(rawStatus: any) {
    const r = (rawStatus || '').toString().toLowerCase();
    if (!r) return '';
    if (r === 'waiting') return 'pending';
    if (r === 'inprogress') return 'in-progress';
    return r;
  }

  const statusLabelMap: Record<string, string> = {
    'pending': 'Chờ khám',
    'confirmed': 'Đã xác nhận',
    'in-progress': 'Đang khám',
    'completed': 'Hoàn thành',
    'cancelled': 'Đã hủy',
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        let doctorId = session?.user?._id;

        // fallback: resolve doctor by email
        if (!doctorId && session?.user?.email) {
          try {
            const userRes = await sendRequest<any>({ method: 'GET', url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/users`, queryParams: { email: session.user.email } });
            const usersList = userRes?.results || userRes?.data || userRes;
            const u = Array.isArray(usersList) ? usersList[0] : (usersList?.[0] || null);
            if (u) doctorId = u._id || u.id;
          } catch (e) {
            console.warn('resolve doctorId failed', e);
          }
        }

        if (!doctorId) { setAppointments([]); return; }

        const res = await sendRequest<any>({ method: 'GET', url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/doctor/${doctorId}`, });
        const list = res?.data || res || [];
        const arr = Array.isArray(list) ? list : (list?.results || []);

        // filter by date
        const filtered = arr.filter((a: any) => {
          const d = a.appointmentDate || a.date;
          if (!d) return true;
          return new Date(d).toISOString().slice(0, 10) === selectedDate;
        });

        // if patient not populated, fetch missing users
        const missingPatientIds = Array.from(new Set(filtered.map((a: any) => {
          const pid = (a.patient && (a.patient._id || a.patient.id)) || a.patientId || (typeof a.patient === 'string' ? a.patient : null);
          return pid && typeof pid === 'string' ? pid : null;
        }).filter(Boolean)));

        if (missingPatientIds.length > 0) {
          const tokenForFetch = (session as any)?.access_token || (session as any)?.user?.access_token || (session as any)?.user?.accessToken || (session as any)?.token?.access_token;
          const fetchHeaders = tokenForFetch ? { Authorization: `Bearer ${tokenForFetch}` } : {};
          const users = await Promise.all(missingPatientIds.map(id => sendRequest<any>({ method: 'GET', url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/users/${id}`, headers: fetchHeaders }).then(r => r?.data || r).catch(() => null)));
          const byId: Record<string, any> = {};
          users.forEach(u => { if (u && (u._id || u.id)) byId[u._id || u.id] = u; });
          const enriched = filtered.map((a: any) => {
            const pid = (a.patient && (a.patient._id || a.patient.id)) || a.patientId || (typeof a.patient === 'string' ? a.patient : null);
            if (pid && typeof pid === 'string' && byId[pid]) return { ...a, patient: byId[pid] };
            return a;
          });
          setAppointments(enriched);
        } else {
          setAppointments(filtered);
        }
      } catch (e) {
        console.error('load appointments failed', e);
        addToast('Không thể tải lịch khám', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [session, selectedDate]);

  // aggregated counts
  const statusCounts = appointments.reduce((acc: Record<string, number>, a: any) => {
    const s = normalizeStatus(a?.status);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  async function updateStatus(id: string, action: 'confirm' | 'complete' | 'cancel') {
    try {
      setApptLoading(s => ({ ...s, [id]: true }));
      let res;
      console.log('updateStatus', { id, action });
      const token = (session as any)?.access_token || (session as any)?.user?.access_token || (session as any)?.user?.accessToken || (session as any)?.token?.access_token;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      if (action === 'confirm') res = await sendRequest<any>({ method: 'POST', url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/${id}/confirm`, headers });
      else if (action === 'complete') res = await sendRequest<any>({ method: 'POST', url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/${id}/complete`, headers });
  else res = await sendRequest<any>({ method: 'DELETE', url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/${id}/cancel`, body: { reason: 'Hủy bởi bác sĩ' }, headers });

      const updated = res?.data || res;
      setAppointments(prev => prev.map(p => (p._id === id || p.id === id ? { ...(p), ...(updated || {}) } : p)));
      addToast('Cập nhật thành công', 'success');
    } catch (e) {
      console.error('updateStatus', e);
      addToast('Cập nhật thất bại', 'error');
    } finally {
      setApptLoading(s => ({ ...s, [id]: false }));
    }
  }

  async function rescheduleAppointment(id: string) {
    // open modal to choose date & slot
    console.log('open reschedule modal for', id);
    setRescheduleApptId(id);
    setRescheduleDate(selectedDate || new Date().toISOString().slice(0, 10));
    setRescheduleSlot(null);
    setRescheduleOpen(true);
  }

  function getAuthHeaders() {
    const token = (session as any)?.access_token || (session as any)?.user?.access_token || (session as any)?.user?.accessToken || (session as any)?.token?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData('text/plain', id);
  }

  function handleSlotDrop(e: React.DragEvent, time: string) {
    e.preventDefault();
    setRescheduleSlot(time);
  }

  function handleSlotClick(time: string) {
    setRescheduleSlot(time);
  }

  async function confirmReschedule() {
    if (!rescheduleApptId || !rescheduleSlot || !rescheduleDate) return addToast('Vui lòng chọn ngày và khung giờ', 'error');
    try {
      setApptLoading(s => ({ ...s, [rescheduleApptId]: true }));
      // capture old appointment date/time for notification
      const oldAppt = appointments.find(a => (a._id || a.id) === rescheduleApptId);
      const oldDate = oldAppt?.appointmentDate || oldAppt?.date || '';
      const oldTime = oldAppt?.startTime || oldAppt?.time || '';
      const headers = getAuthHeaders();
      console.log('Reschedule request', { id: rescheduleApptId, appointmentDate: rescheduleDate, appointmentTime: rescheduleSlot, headers });
      const res = await sendRequest<any>({ method: 'PATCH', url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/${rescheduleApptId}/reschedule`, body: { appointmentDate: rescheduleDate, appointmentTime: rescheduleSlot }, headers });
      console.log('Reschedule response', res);
      // sendRequest returns { statusCode, message } on non-ok responses
      if (res && (res as any).statusCode) {
        const msg = (res as any).message || 'Đổi lịch thất bại';
        
        // Hiển thị thông báo lỗi cụ thể
        if (msg.includes('Bác sĩ đã có lịch hẹn vào khung giờ này')) {
          addToast('Bạn đã có lịch hẹn vào khung giờ này. Vui lòng chọn khung giờ khác.', 'error');
        } else {
          addToast(msg, 'error');
        }
        return;
      }
      const updated = res?.data || res;
      // optimistic update: if backend returns updated appointment, use it; otherwise set date/time locally
      setAppointments(prev => prev.map(p => {
        if (p._id === rescheduleApptId || p.id === rescheduleApptId) {
          const newA = updated && (updated._id || updated.id) ? { ...(p), ...(updated || {}) } : { ...(p), appointmentDate: rescheduleDate, startTime: rescheduleSlot, time: rescheduleSlot };
          // send notification to patient
          try {
            const patientId = newA.patient?._id || newA.patient?.id || newA.patientId;
            if (patientId) {
              const noteBody = {
                title: 'Bác sĩ đã đổi lịch khám',
                message: `Bác sĩ đã đổi lịch của bạn. Giờ cũ: ${oldDate} ${oldTime}. Giờ mới: ${rescheduleDate} ${rescheduleSlot}`,
                userId: patientId,
                type: 'appointment',
                refId: rescheduleApptId,
                refModel: 'Appointment'
              } as any;
              // fire-and-forget
              sendRequest<any>({ method: 'POST', url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/notifications`, body: noteBody }).catch(err => console.warn('notify patient failed', err));
              // also broadcast locally so other tabs/windows on same origin see it immediately
              try {
                if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                  const bc = new BroadcastChannel('sdh_notifications');
                  bc.postMessage({ ...noteBody, _localBroadcast: true });
                  bc.close();
                }
              } catch (bcErr) {
                console.warn('broadcast notify failed', bcErr);
              }
            }
          } catch (err) {
            console.warn('create notification failed', err);
          }
          return newA;
        }
        return p;
      }));
      addToast('Đã đặt lại lịch', 'success');
      setRescheduleOpen(false);
    } catch (e) {
      console.error('reschedule failed', e);
      addToast('Đổi lịch thất bại: ' + ((e as any)?.message || ''), 'error');
    } finally {
      if (rescheduleApptId) setApptLoading(s => ({ ...s, [rescheduleApptId]: false }));
      setRescheduleApptId(null);
    }
  }

  function closeReschedule() {
    setRescheduleOpen(false);
    setRescheduleApptId(null);
    setRescheduleSlot(null);
  }

  function viewRecord(patient: any) {
    const pid = patient?._id || patient?.id || patient;
    if (!pid) return addToast('Không tìm thấy hồ sơ bệnh nhân', 'error');
    router.push(`/patient/records`);
  }

  function confirmAndCancel(id: string) {
    if (!confirm('Bạn có chắc muốn hủy lịch này không?')) return;
    updateStatus(id, 'cancel');
  }

  // filters
  const visibleAppointments = appointments.filter(a => {
    const s = normalizeStatus(a?.status);
    if (statusFilter !== 'all' && s !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const name = (a.patient?.fullName || a.patient || '').toString().toLowerCase();
      const phone = (a.patient?.phone || a.phone || '').toString().toLowerCase();
      return name.includes(q) || phone.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lịch khám</h1>
          <p className="text-gray-600">Quản lý lịch khám và cuộc hẹn</p>
        </div>
        <div className="flex space-x-2">
          <button className={`px-4 py-2 rounded-md ${selectedView === "day" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`} onClick={() => setSelectedView('day')}>Ngày</button>
          <button className={`px-4 py-2 rounded-md ${selectedView === "week" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`} onClick={() => setSelectedView('week')}>Tuần</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{new Date(selectedDate).toLocaleDateString()}</h2>
          <div className="flex items-center space-x-2">
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2" />
            <input placeholder="Tìm tên hoặc số điện thoại" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="border border-gray-200 rounded px-2 py-1" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-200 rounded px-2 py-1">
              <option value="all">Tất cả</option>
              <option value="pending">Chờ khám</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="in-progress">Đang khám</option>
              <option value="completed">Hoàn thành</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{appointments.length}</p>
            <p className="text-sm text-gray-600">Tổng lịch hẹn</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{statusCounts['completed'] || 0}</p>
            <p className="text-sm text-gray-600">Hoàn thành</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{statusCounts['in-progress'] || 0}</p>
            <p className="text-sm text-gray-600">Đang khám</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{statusCounts['pending'] || 0}</p>
            <p className="text-sm text-gray-600">Chờ khám</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Lịch theo giờ</h3>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {timeSlots.map(time => {
                const appointment = visibleAppointments.find((apt: any) => apt.startTime?.startsWith(time) || apt.time === time);
                const apptStatus = appointment ? normalizeStatus(appointment.status) : '';
                return (
                  <div key={time} className="flex items-center min-h-[50px] border-b border-gray-100">
                    <div className="w-16 text-sm text-gray-500 font-mono">{time}</div>
                    <div className="flex-1 ml-4">
                      {appointment ? (
                        <div className={`p-2 rounded border-l-4 ${apptStatus === 'confirmed' ? 'bg-blue-50 border-blue-500' : apptStatus === 'in-progress' ? 'bg-green-50 border-green-500' : 'bg-yellow-50 border-yellow-500'}`}>
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

          <div>
            <h3 className="font-medium text-gray-900 mb-3">Chi tiết cuộc hẹn</h3>
            <div className="space-y-3">
              {visibleAppointments.length === 0 && <p className="text-sm text-gray-500">Không có lịch hẹn.</p>}
              {visibleAppointments.map((appointment: any) => {
                const apptStatus = normalizeStatus(appointment.status);
                const id = appointment._id || appointment.id;
                return (
                  <div key={id} className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{appointment.patient?.fullName || appointment.patient}</h4>
                        <p className="text-sm text-gray-600">{appointment.appointmentType || appointment.type}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${apptStatus === 'confirmed' ? 'bg-blue-100 text-blue-800' : apptStatus === 'in-progress' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {statusLabelMap[apptStatus] || (appointment.status && appointment.status.toString())}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>⏰ {appointment.startTime || appointment.time} ({appointment.duration || appointment.durationMinutes || 30} phút)</p>
                      <p>📞 {appointment.patient?.phone || appointment.phone || '—'}</p>
                      {appointment.notes && <p>📝 {appointment.notes}</p>}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => viewRecord(appointment.patient)} className="text-blue-600 hover:text-blue-800 text-sm">Xem hồ sơ</button>
                      {apptStatus !== 'in-progress' && <button disabled={!!apptLoading[id]} onClick={() => updateStatus(id, 'confirm')} className="text-green-600 hover:text-green-800 text-sm">{apptLoading[id] ? '...' : 'Xác nhận'}</button>}
                      {apptStatus !== 'completed' && <button disabled={!!apptLoading[id]} onClick={() => updateStatus(id, 'complete')} className="text-purple-600 hover:text-purple-800 text-sm">{apptLoading[id] ? '...' : 'Hoàn thành'}</button>}
                      <button disabled={!!apptLoading[id]} onClick={() => confirmAndCancel(id)} className="text-gray-600 hover:text-gray-800 text-sm">{apptLoading[id] ? '...' : 'Hủy'}</button>
                      <button disabled={!!apptLoading[id]} onClick={() => rescheduleAppointment(id)} className="text-yellow-600 hover:text-yellow-800 text-sm">Đổi lịch</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* toasts */}
        <div className="fixed right-4 bottom-4 space-y-2 z-50">
          {toasts.map(t => (
            <div key={t.id} className={`px-4 py-2 rounded shadow ${t.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {t.text}
            </div>
          ))}
        </div>
        {/* Reschedule Modal */}
        {rescheduleOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg w-full max-w-3xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Đổi lịch cuộc hẹn</h3>
                <button onClick={closeReschedule} className="text-gray-600">Đóng</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-sm text-gray-600 mb-2">Chọn ngày</label>
                  <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} className="border p-2 rounded w-full" />
                  <div className="mt-4">
                    <p className="text-sm text-gray-600">Chọn khung giờ (nhấn hoặc kéo thả)</p>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map(time => {
                      const occupied = visibleAppointments.some((apt: any) => (apt.appointmentDate || apt.date) && (new Date(apt.appointmentDate || apt.date).toISOString().slice(0, 10) === rescheduleDate) && ((apt.startTime && apt.startTime.startsWith(time)) || apt.time === time));
                      return (
                        <div key={time}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleSlotDrop(e, time)}
                          onClick={() => handleSlotClick(time)}
                          className={`p-3 rounded border cursor-pointer text-center ${rescheduleSlot === time ? 'bg-blue-100 border-blue-400' : occupied ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-blue-50'}`}>
                          <div className="text-sm font-mono">{time}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end space-x-2">
                <button onClick={closeReschedule} className="px-4 py-2 border rounded">Hủy</button>
                <button disabled={!rescheduleSlot} onClick={confirmReschedule} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">Xác nhận</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
