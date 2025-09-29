"use client";

import { Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface FollowUpItem {
  patient: { _id: string; fullName: string; phone?: string; email?: string };
  lastAppointmentDate: string;
  followUps: { oneMonth: string; threeMonths: string; sixMonths: string };
}

export default function DoctorFollowupsPage({ params }: any) {
  const [items, setItems] = useState<FollowUpItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [doctorId, setDoctorId] = useState<string>(params?.doctorId || "");

  useEffect(() => {
    // fallback to query param if route param not provided
    if (!doctorId && typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search).get("doctorId") || "";
      setDoctorId(q);
    }
  }, [doctorId, params]);

  useEffect(() => {
    if (!doctorId) return;
    fetchData();
  }, [doctorId]);

  const fetchData = async () => {
    setLoading(true);
    try {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/followup/doctor/${doctorId}`);
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

  const router = useRouter();

  const statusFor = (dateStr?: string) => {
    if (!dateStr) return { label: 'N/A', color: 'gray' };
    const d = new Date(dateStr);
    const today = new Date();
    // normalize
    today.setHours(0,0,0,0);
    const diff = Math.ceil((d.getTime() - today.getTime()) / (1000*60*60*24));
    if (diff < 0) return { label: 'Quá hạn', color: 'red' };
    if (diff <= 7) return { label: 'Sắp đến', color: 'orange' };
    if (diff <= 30) return { label: 'Trong tháng', color: 'yellow' };
    return { label: 'OK', color: 'green' };
  };

  const openPatient = (patientId: string) => {
    router.push(`/doctor/patients/${patientId}`);
  };

  const bookForPatient = (patientId: string) => {
    // navigate to patient appointments page with prefilled doctor & patient
    router.push(`/patient/appointments?doctorId=${encodeURIComponent(doctorId)}&patientId=${encodeURIComponent(patientId)}`);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="healthcare-card-elevated p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Lộ trình tái khám - Bác sĩ</h2>
            <p className="text-sm text-gray-500">Hiển thị lộ trình tái khám 1/3/6 tháng dựa trên lần khám gần nhất</p>
          </div>
        </div>

        <div className="healthcare-card p-4">
          {loading ? (
            <div>Đang tải...</div>
          ) : items.length === 0 ? (
            <div>Không có dữ liệu tái khám</div>
          ) : (
            <div className="space-y-3">
              {items.map((it) => (
                  <div key={it.patient._id} className="p-3 border rounded-md flex items-center justify-between">
                    <div>
                      <div className="font-medium">{it.patient.fullName}</div>
                      <div className="text-sm text-gray-600">Gần nhất: {formatDate(it.lastAppointmentDate)}</div>
                      <div className="text-xs text-gray-500 mt-1">{it.patient.phone || it.patient.email}</div>
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
                        <button onClick={() => openPatient(it.patient._id)} className="btn-healthcare-secondary px-3 py-1 text-sm">Xem bệnh nhân</button>
                        <button onClick={() => bookForPatient(it.patient._id)} className="btn-healthcare-primary px-3 py-1 text-sm">Đặt lịch</button>
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
