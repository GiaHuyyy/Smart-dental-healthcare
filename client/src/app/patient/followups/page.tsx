"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from "react";

interface FollowUpByDoctor {
  doctor: { _id: string; fullName: string; specialty?: string };
  lastAppointmentDate: string;
  followUps: { oneMonth: string; threeMonths: string; sixMonths: string };
}

export default function PatientFollowupsPage({ params }: any) {
  const [items, setItems] = useState<FollowUpByDoctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [patientId, setPatientId] = useState<string>(params?.patientId || "");
  const router = useRouter();

  useEffect(() => {
    if (!patientId && typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('patientId') || '';
      setPatientId(q);
    }
  }, [patientId, params]);

  useEffect(() => {
    if (!patientId) return;
    fetchData();
  }, [patientId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments/followup/patient/${patientId}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d?: string | Date) => d ? new Date(d).toLocaleDateString('vi-VN') : '-';

  const statusFor = (dateStr?: string) => {
    if (!dateStr) return { label: 'N/A', color: 'gray' };
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diff = Math.ceil((d.getTime() - today.getTime()) / (1000*60*60*24));
    if (diff < 0) return { label: 'Quá hạn', color: 'red' };
    if (diff <= 7) return { label: 'Sắp đến', color: 'orange' };
    if (diff <= 30) return { label: 'Trong tháng', color: 'yellow' };
    return { label: 'OK', color: 'green' };
  };

  const bookWithDoctor = (doctorId: string, doctorName?: string) => {
    const nameParam = doctorName ? `&doctorName=${encodeURIComponent(doctorName)}` : '';
    router.push(`/patient/appointments?doctorId=${encodeURIComponent(doctorId)}${nameParam}`);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="healthcare-card-elevated p-4">
          <h2 className="text-xl font-semibold">Lộ trình tái khám của bác sĩ</h2>
          <p className="text-sm text-gray-500">Hiển thị đề xuất tái khám 1/3/6 tháng cho từng bác sĩ đã khám bạn</p>
        </div>

        <div className="healthcare-card p-4">
          {loading ? (
            <div>Đang tải...</div>
          ) : items.length === 0 ? (
            <div>Không có đề xuất tái khám</div>
          ) : (
            <div className="space-y-3">
              {items.map((it) => (
                <div key={it.doctor._id} className="p-3 border rounded-md flex items-center justify-between">
                  <div>
                    <div className="font-medium">{it.doctor.fullName}</div>
                    <div className="text-sm text-gray-600">Chuyên khoa: {it.doctor.specialty || 'N/A'}</div>
                    <div className="text-sm text-gray-600">Lần khám gần nhất: {formatDate(it.lastAppointmentDate)}</div>
                  </div>
                  <div className="text-right text-sm flex flex-col items-end gap-2">
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      {['oneMonth','threeMonths','sixMonths'].map((k:any)=>(
                        <div key={k} className="px-2 py-1 rounded-md border" style={{minWidth:110}}>
                          <div className="text-[11px] text-gray-500">{k === 'oneMonth' ? '1 tháng' : k === 'threeMonths' ? '3 tháng' : '6 tháng'}</div>
                          <div className="font-medium text-sm">{formatDate((it.followUps as any)[k])}</div>
                          <div className="mt-1">
                            <span style={{color: statusFor((it.followUps as any)[k]).color}} className="text-xs">
                              {statusFor((it.followUps as any)[k]).label}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => bookWithDoctor(it.doctor._id, it.doctor.fullName)} className="btn-healthcare-primary px-3 py-1 text-sm">Đặt lịch</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
