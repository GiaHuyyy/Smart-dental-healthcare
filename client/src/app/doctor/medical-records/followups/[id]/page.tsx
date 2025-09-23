"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface MedicalRecord {
  _id: string;
  patientId: { _id: string; fullName?: string } | string;
  doctorId: { _id: string; fullName?: string } | string;
  isFollowUpRequired: boolean;
  followUpDate?: string;
  recordDate?: string;
  chiefComplaint?: string;
  diagnosis?: string;
  treatmentPlan?: string;
}

export default function FollowUpDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/medical-records/${id}`);
        if (!res.ok) {
          console.error('Failed to load medical record', res.statusText);
          setRecord(null);
          return;
        }
        const data = await res.json();
        // the server returns the record (maybe wrapped); handle both
        const rec = data.data || data || null;
        setRecord(rec);
      } catch (err) {
        console.error('Error fetching medical record:', err);
        setRecord(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString('vi-VN') : '-');

  if (loading) return <div className="p-6">Đang tải...</div>;
  if (!record) return <div className="p-6">Không tìm thấy hồ sơ</div>;

  const patientId = typeof record.patientId === 'string' ? record.patientId : (record.patientId as any)?._id;
  const doctorId = typeof record.doctorId === 'string' ? record.doctorId : (record.doctorId as any)?._id;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold">Chi tiết tái khám</h2>
        <p className="text-sm text-gray-600 mt-2">Hồ sơ: {record._id}</p>

        <div className="mt-4 space-y-2">
          <div>Bác sĩ: {(record.doctorId as any)?.fullName || doctorId}</div>
          <div>Bệnh nhân: {(record.patientId as any)?.fullName || patientId}</div>
          <div>Ngày khám gốc: {formatDate(record.recordDate)}</div>
          <div>Yêu cầu tái khám: {record.isFollowUpRequired ? 'Có' : 'Không'}</div>
          <div>Ngày tái khám: {formatDate(record.followUpDate)}</div>
        </div>

        <div className="mt-6 flex space-x-3">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            onClick={() => router.push(`/doctor/schedule?patientId=${patientId}&doctorId=${doctorId}`)}
          >
            Đặt lịch cho lần tái khám
          </button>

          <button
            className="bg-gray-200 px-3 py-2 rounded"
            onClick={() => router.push(`/doctor/patients/${patientId}`)}
          >
            Quay lại hồ sơ bệnh án
          </button>
        </div>
      </div>
    </div>
  );
}
