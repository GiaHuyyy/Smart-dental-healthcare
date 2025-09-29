"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import PrescriptionList from "../../../../components/PrescriptionList";

interface Patient {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
}

interface Appointment {
  _id: string;
  appointmentDate: string;
  startTime: string;
  status: string;
  doctorId: {
    _id: string;
    fullName: string;
    specialty: string;
  };
}

interface Prescription {
  _id: string;
  prescriptionDate: string;
  diagnosis: string;
  isDispensed: boolean;
  doctorId: {
    _id: string;
    fullName: string;
    specialty: string;
  };
}

interface MedicalRecord {
  _id: string;
  recordDate: string;
  chiefComplaint: string;
  diagnosis: string;
  treatmentPlan: string;
  status: string;
  doctorId: {
    _id: string;
    fullName: string;
    specialty: string;
  };
  isFollowUpRequired: boolean;
  followUpDate?: string;
  medications?: string[];
  notes?: string;
}

export default function PatientDetail() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [followUpEdits, setFollowUpEdits] = useState<Record<string, { isFollowUpRequired: boolean; followUpDate: string; saving?: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [followUpModal, setFollowUpModal] = useState<{ open: boolean; recordId?: string; date?: string }>({ open: false });
  const { toast } = useToast();

  useEffect(() => {
    if (patientId) {
      fetchPatientDetails();
      fetchPatientAppointments();
      fetchPatientPrescriptions();
      fetchMedicalRecords();
    }
  }, [patientId]);

  const fetchPatientDetails = async () => {
    try {
      const response = await fetch(`/api/users/patients/${patientId}/details`);
      const data = await response.json();

      if (data.success) {
        setPatient(data.data);
      } else {
        console.error('Error fetching patient details:', data.message, 'full payload:', data);
      }
    } catch (error) {
      console.error('Error fetching patient details:', error);
    }
  };

  const fetchPatientAppointments = async () => {
    try {
      const response = await fetch(`/api/appointments/patient/${patientId}/history?current=1&pageSize=5`);
      const data = await response.json();

      if (data.success) {
        setAppointments(data.data.appointments);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const fetchPatientPrescriptions = async () => {
    try {
      const response = await fetch(`/api/prescriptions/patient/${patientId}/recent?limit=5`);
      const data = await response.json();

      if (data.success) {
        setPrescriptions(data.data);
      }
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicalRecords = async () => {
    try {
      // Add authorization header if available
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/medical-records/patient/${patientId}`, {
        headers
      });

      if (!response.ok) {
        console.error('Failed to fetch medical records:', response.status, response.statusText);
        setMedicalRecords([]);
        return;
      }

      const data = await response.json();

      if (data && !data.error) {
        // Handle different response structures
        const records = data.data || data.results || data;
        const list = Array.isArray(records) ? records : [];
        setMedicalRecords(list);
        // initialize follow-up edit states
        const edits: Record<string, { isFollowUpRequired: boolean; followUpDate: string }> = {};
        list.forEach((r: MedicalRecord) => {
          edits[r._id] = {
            isFollowUpRequired: !!r.isFollowUpRequired,
            followUpDate: r.followUpDate ? new Date(r.followUpDate).toISOString().slice(0, 10) : ''
          };
        });
        setFollowUpEdits(edits);
      } else {
        console.error('API returned error:', data.error || data.details);
        setMedicalRecords([]);
      }
    } catch (error) {
      console.error('Error fetching medical records:', error);
      setMedicalRecords([]);
    }
  };

  const toInputDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toISOString().slice(0, 10);
    } catch (e) {
      return '';
    }
  };

  const handleFollowUpToggle = (recordId: string, checked: boolean) => {
    setFollowUpEdits((prev) => ({
      ...prev,
      [recordId]: {
        ...(prev[recordId] || { isFollowUpRequired: false, followUpDate: '' }),
        isFollowUpRequired: checked,
        // if enabling and there was no date, default to today
        followUpDate: checked && !(prev[recordId] && prev[recordId].followUpDate) ? new Date().toISOString().slice(0, 10) : (prev[recordId]?.followUpDate || '')
      }
    }));
  };

  const handleFollowUpDateChange = (recordId: string, value: string) => {
    setFollowUpEdits((prev) => ({
      ...prev,
      [recordId]: {
        ...(prev[recordId] || { isFollowUpRequired: false, followUpDate: '' }),
        followUpDate: value
      }
    }));
  };

  const handleSaveFollowUp = async (recordId: string) => {
    const edit = followUpEdits[recordId];
    if (!edit) return;

    setFollowUpEdits((prev) => ({ ...prev, [recordId]: { ...(prev[recordId] || {}), saving: true } }));

    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const body = {
        followUpDate: edit.isFollowUpRequired ? (edit.followUpDate || null) : null,
        isFollowUpRequired: !!edit.isFollowUpRequired
      };

      const res = await fetch(`/api/medical-records/${recordId}/follow-up`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.text();
        console.error('Failed to save follow-up:', res.status, err);
        // clear saving
        setFollowUpEdits((prev) => ({ ...prev, [recordId]: { ...(prev[recordId] || {}), saving: false } }));
        return;
      }

      const updated = await res.json();

      // Update medicalRecords list with new follow-up info (use server response when possible)
      const newRecordState = updated && updated._id ? updated : null;
      setMedicalRecords((prev) => prev.map((r) => {
        if (r._id !== recordId) return r;
        if (newRecordState) {
          return {
            ...r,
            isFollowUpRequired: !!newRecordState.isFollowUpRequired,
            followUpDate: newRecordState.followUpDate || undefined
          };
        }
        return {
          ...r,
          isFollowUpRequired: !!body.isFollowUpRequired,
          followUpDate: body.followUpDate || undefined
        };
      }));

      setFollowUpEdits((prev) => ({ ...prev, [recordId]: { ...(prev[recordId] || {}), saving: false } }));

      // Try to auto-create an appointment for this follow-up
      try {
        if (updated && updated.followUpDate) {
          // find record locally to get doctorId and patientId
          const rec = medicalRecords.find((x) => x._id === recordId) as any;
          const resolvedPatientId = patientId || (rec?.patientId?._id || rec?.patientId) || (updated.patientId && updated.patientId._id) || undefined;
          const doctorId = updated.doctorId?._id || rec?.doctorId?._id || undefined;

          if (patientId && doctorId) {
            const appointmentDate = new Date(updated.followUpDate);
            const isoDate = appointmentDate.toISOString();
            const startTime = '09:00';
            const endTime = '09:30';

            const token = localStorage.getItem('token');
            const headers: Record<string,string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const apptBody = {
              patientId: resolvedPatientId,
              doctorId,
              appointmentDate: isoDate,
              startTime,
              endTime,
              duration: 30,
              appointmentType: 'follow-up',
              notes: 'Tái khám từ hồ sơ',
              status: 'scheduled'
            };

            const apptRes = await fetch('/api/appointments', { method: 'POST', headers, body: JSON.stringify(apptBody) });
            if (apptRes.ok) {
              toast({ title: 'Lịch hẹn', description: 'Đã tạo lịch tái khám tự động' } as any);
            } else {
              const txt = await apptRes.text();
              toast({ title: 'Lưu ý', description: 'Không tạo được lịch tái khám tự động: ' + (txt || apptRes.statusText) } as any);
            }
          }
        }
      } catch (e) {
        console.error('Auto-create appointment failed', e);
      }
    } catch (error) {
      console.error('Error saving follow-up:', error);
      setFollowUpEdits((prev) => ({ ...prev, [recordId]: { ...(prev[recordId] || {}), saving: false } }));
    }
  };

  // Quick helpers for scheduling follow-ups relative to today
  const addMonthsToDate = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    // normalize to yyyy-mm-dd
    return d.toISOString().slice(0, 10);
  };

  const handleQuickFollowUp = async (recordId: string, months: number) => {
    const date = addMonthsToDate(months);
    // set the edit state and save
    setFollowUpEdits((prev) => ({
      ...prev,
      [recordId]: {
        ...(prev[recordId] || { isFollowUpRequired: false, followUpDate: '' }),
        isFollowUpRequired: true,
        followUpDate: date,
        saving: true
      }
    }));

    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const body = { followUpDate: date, isFollowUpRequired: true };

      const res = await fetch(`/api/medical-records/${recordId}/follow-up`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error('Failed quick follow-up', res.status, txt);
        setFollowUpEdits((prev) => ({ ...prev, [recordId]: { ...(prev[recordId] || {}), saving: false } }));
        return;
      }

      const updated = await res.json();
      setMedicalRecords((prev) => prev.map((r) => r._id === recordId ? { ...r, isFollowUpRequired: true, followUpDate: date } : r));
      setFollowUpEdits((prev) => ({ ...prev, [recordId]: { ...(prev[recordId] || {}), saving: false } }));
    } catch (err) {
      console.error('Error in quick follow-up', err);
      setFollowUpEdits((prev) => ({ ...prev, [recordId]: { ...(prev[recordId] || {}), saving: false } }));
    }
  };

  const openFollowUpModal = (recordId: string) => {
    const edit = followUpEdits[recordId];
    setFollowUpModal({ open: true, recordId, date: edit?.followUpDate || '' });
  };

  const closeFollowUpModal = () => setFollowUpModal({ open: false });

  const saveFollowUpFromModal = async (recordId: string | undefined, date: string | undefined) => {
    if (!recordId) return false;
    const followUpDate = date || null;
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const body = { followUpDate, isFollowUpRequired: !!followUpDate };

      const res = await fetch(`/api/medical-records/${recordId}/follow-up`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error('Failed to save follow-up from modal', res.status, txt);
        toast({ title: 'Lỗi', description: txt || 'Không thể cập nhật tái khám', variant: 'destructive' } as any);
        return false;
      }

  const updated = await res.json();
      // update local state
      setMedicalRecords((prev) => prev.map((r) => r._id === recordId ? { ...r, isFollowUpRequired: !!updated.isFollowUpRequired, followUpDate: updated.followUpDate || undefined } : r));
      setFollowUpEdits((prev) => ({ ...prev, [recordId]: { ...(prev[recordId] || {}), isFollowUpRequired: !!updated.isFollowUpRequired, followUpDate: updated.followUpDate ? new Date(updated.followUpDate).toISOString().slice(0,10) : '' } }));
      // Attempt to create appointment using today's default time (09:00) if followUpDate present
      try {
        if (updated && updated.followUpDate) {
          const rec = medicalRecords.find((x) => x._id === recordId) as any;
          const resolvedPatientId = patientId || (rec?.patientId?._id || rec?.patientId) || (updated.patientId && updated.patientId._id) || undefined;
          const doctorId = updated.doctorId?._id || rec?.doctorId?._id || undefined;
          if (resolvedPatientId && doctorId) {
            const appointmentDateObj = new Date(updated.followUpDate);
            const dayIso = new Date(appointmentDateObj.getFullYear(), appointmentDateObj.getMonth(), appointmentDateObj.getDate()).toISOString();
            const startTime = '09:00';
            const [h, m] = startTime.split(':').map((s) => parseInt(s, 10));
            const endDate = new Date(appointmentDateObj.getFullYear(), appointmentDateObj.getMonth(), appointmentDateObj.getDate(), h, m + 30);
            const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

            const token = localStorage.getItem('token');
            const headers: Record<string,string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const apptBody = {
              patientId: resolvedPatientId,
              doctorId,
              appointmentDate: dayIso,
              startTime,
              endTime,
              duration: 30,
              appointmentType: 'follow-up',
              notes: 'Tái khám từ hồ sơ',
              status: 'scheduled'
            };

            const apptRes = await fetch('/api/appointments', { method: 'POST', headers, body: JSON.stringify(apptBody) });
            if (apptRes.ok) {
              toast({ title: 'Lịch hẹn', description: 'Đã tạo lịch tái khám tự động' } as any);
            }
          }
        }
      } catch (e) {
        console.error('Auto-create appointment failed', e);
      }
      toast({ title: 'Thành công', description: 'Đã cập nhật lịch tái khám' } as any);
      return true;
    } catch (err) {
      console.error('Error saving follow-up from modal', err);
      toast({ title: 'Lỗi', description: 'Có lỗi khi lưu tái khám', variant: 'destructive' } as any);
      return false;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { bg: string; text: string; label: string } } = {
      'scheduled': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Đã lên lịch' },
      'confirmed': { bg: 'bg-green-100', text: 'text-green-800', label: 'Đã xác nhận' },
      'completed': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Hoàn thành' },
      'cancelled': { bg: 'bg-red-100', text: 'text-red-800', label: 'Đã hủy' },
      'rescheduled': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Đã đổi lịch' }
    };

    const statusInfo = statusMap[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };

    return (
      <span className={`px-2 py-1 rounded-full text-xs ${statusInfo.bg} ${statusInfo.text}`}>
        {statusInfo.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Không tìm thấy bệnh nhân</h2>
        <Link href="/doctor/patients" className="text-blue-600 hover:text-blue-800 mt-2 inline-block">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Link href="/doctor/patients" className="text-blue-600 hover:text-blue-800 mb-2 inline-block">
            ← Quay lại danh sách bệnh nhân

    // render modal
    return (
      <>
        {/* main component already returned earlier; this is unreachable, so instead mount modal via portalless approach */}
      </>
    );
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{patient.fullName}</h1>
          <p className="text-gray-600">Thông tin chi tiết bệnh nhân</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => router.push(`/doctor/schedule?patientId=${patientId}`)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Tạo lịch hẹn
          </button>
          <button
            onClick={() => router.push(`/doctor/prescriptions/create?patientId=${patientId}`)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            Tạo đơn thuốc
          </button>
          <button
            onClick={() => router.push(`/doctor/treatment?patientId=${patientId}`)}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
          >
            Tạo hồ sơ
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Tổng quan' },
            { id: 'appointments', label: 'Lịch hẹn' },
            { id: 'prescriptions', label: 'Đơn thuốc' },
            { id: 'medical-records', label: 'Hồ sơ bệnh án' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Info */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin cá nhân</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Họ và tên</label>
                  <p className="mt-1 text-sm text-gray-900">{patient.fullName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{patient.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Số điện thoại</label>
                  <p className="mt-1 text-sm text-gray-900">{patient.phone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ngày sinh</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {patient.dateOfBirth ? `${formatDate(patient.dateOfBirth)} (${calculateAge(patient.dateOfBirth)} tuổi)` : 'Chưa cập nhật'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Giới tính</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {patient.gender === 'male' ? 'Nam' : patient.gender === 'female' ? 'Nữ' : 'Chưa cập nhật'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Địa chỉ</label>
                  <p className="mt-1 text-sm text-gray-900">{patient.address || 'Chưa cập nhật'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Trạng thái</label>
                  <div className="mt-1">
                    {patient.isActive ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                        Đang hoạt động
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                        Không hoạt động
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ngày đăng ký</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(patient.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Thống kê nhanh</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Tổng lịch hẹn</span>
                  <span className="text-sm font-medium text-gray-900">{appointments.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Tổng đơn thuốc</span>
                  <span className="text-sm font-medium text-gray-900">{prescriptions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Hồ sơ bệnh án</span>
                  <span className="text-sm font-medium text-gray-900">{medicalRecords.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Lịch hẹn sắp tới</span>
                  <span className="text-sm font-medium text-gray-900">
                    {appointments.filter(apt => apt.status === 'scheduled' || apt.status === 'confirmed').length}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Hành động nhanh</h3>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md">
                  📅 Tạo lịch hẹn mới
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-md">
                  💊 Tạo đơn thuốc
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-md">
                  📋 Tạo hồ sơ bệnh án
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-md">
                  📞 Gọi điện
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'appointments' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Lịch sử lịch hẹn</h3>
              <Link href={`/api/appointments/patient/${patientId}/history`} className="text-blue-600 hover:text-blue-800 text-sm">
                Xem tất cả
              </Link>
            </div>
          </div>
          <div className="p-6">
            {appointments.length > 0 ? (
              <div className="space-y-4">
                {appointments.map((appointment) => (
                  <div key={appointment._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatDate(appointment.appointmentDate)} - {formatTime(appointment.startTime)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Bác sĩ: {appointment.doctorId.fullName} ({appointment.doctorId.specialty})
                        </p>
                      </div>
                      {getStatusBadge(appointment.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Chưa có lịch hẹn nào</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'prescriptions' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Đơn thuốc</h3>
              <Link href={`/doctor/prescriptions?patientId=${patientId}`} className="text-blue-600 hover:text-blue-800 text-sm">
                Xem tất cả
              </Link>
            </div>
          </div>
          <div className="p-6">
            <PrescriptionList
              patientId={patientId}
              showDoctorInfo={true}
              showPatientInfo={false}
              limit={10}
            />
          </div>
        </div>
      )}

      {activeTab === 'medical-records' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Hồ sơ bệnh án</h3>
              <button
                onClick={() => router.push(`/doctor/treatment?patientId=${patientId}`)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
              >
                + Tạo hồ sơ mới
              </button>
            </div>
          </div>
          <div className="p-6">
            {medicalRecords.length > 0 ? (
              <div className="space-y-6">
                {medicalRecords.map((record) => (
                  <div key={record._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          Khám ngày {formatDate(record.recordDate)}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Bác sĩ: {record.doctorId.fullName} ({record.doctorId.specialty})
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        record.status === 'completed' ? 'bg-green-100 text-green-800' :
                        record.status === 'active' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {record.status === 'completed' ? 'Hoàn thành' :
                         record.status === 'active' ? 'Đang điều trị' :
                         'Chờ xử lý'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Triệu chứng chính</h5>
                        <p className="text-gray-700 bg-gray-50 p-3 rounded-md">
                          {record.chiefComplaint}
                        </p>
                      </div>

                      {record.diagnosis && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Chẩn đoán</h5>
                          <p className="text-gray-700 bg-blue-50 p-3 rounded-md">
                            {record.diagnosis}
                          </p>
                        </div>
                      )}

                      {record.treatmentPlan && (
                        <div className="md:col-span-2">
                          <h5 className="font-medium text-gray-900 mb-2">Kế hoạch điều trị</h5>
                          <p className="text-gray-700 bg-green-50 p-3 rounded-md">
                            {record.treatmentPlan}
                          </p>
                        </div>
                      )}

                      {record.medications && record.medications.length > 0 && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Thuốc được kê</h5>
                          <ul className="bg-purple-50 p-3 rounded-md space-y-1">
                            {record.medications.map((medication, index) => (
                              <li key={index} className="text-gray-700 flex items-start">
                                <span className="text-purple-600 mr-2">•</span>
                                {medication}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {record.notes && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Ghi chú</h5>
                          <p className="text-gray-700 bg-yellow-50 p-3 rounded-md">
                            {record.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Follow-up edit controls: allow doctor to toggle and set follow-up date */}
                    <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                      <div className="flex items-center space-x-3">
                        <input
                          id={`followUp-${record._id}`}
                          type="checkbox"
                          checked={!!followUpEdits[record._id]?.isFollowUpRequired}
                          onChange={(e) => handleFollowUpToggle(record._id, e.target.checked)}
                          className="w-4 h-4 text-orange-600"
                        />
                        <label htmlFor={`followUp-${record._id}`} className="font-medium text-orange-800">Yêu cầu tái khám</label>

                        <div className="ml-4 flex items-center space-x-2">
                          <input
                            type="date"
                            value={followUpEdits[record._id]?.followUpDate || toInputDate(record.followUpDate)}
                            onChange={(e) => handleFollowUpDateChange(record._id, e.target.value)}
                            disabled={!followUpEdits[record._id]?.isFollowUpRequired}
                            className="border rounded px-2 py-1 text-sm"
                          />

                          <button
                            onClick={() => handleSaveFollowUp(record._id)}
                            className="bg-orange-600 text-white px-3 py-1 rounded text-sm"
                            disabled={followUpEdits[record._id]?.saving}
                          >
                            {followUpEdits[record._id]?.saving ? 'Đang lưu...' : 'Lưu'}
                          </button>
                        </div>
                      </div>

                      {/* Quick follow-up buttons */}
                      <div className="mt-3 flex items-center gap-2">
                        <button onClick={() => handleQuickFollowUp(record._id, 1)} className="text-sm px-2 py-1 border rounded bg-white hover:bg-gray-50">+1 tháng</button>
                        <button onClick={() => handleQuickFollowUp(record._id, 3)} className="text-sm px-2 py-1 border rounded bg-white hover:bg-gray-50">+3 tháng</button>
                        <button onClick={() => handleQuickFollowUp(record._id, 6)} className="text-sm px-2 py-1 border rounded bg-white hover:bg-gray-50">+6 tháng</button>
                      </div>

                      {/* Display current follow-up info if present */}
                      {record.isFollowUpRequired && record.followUpDate && (
                        <div className="mt-2 text-sm text-orange-700">Hiện tại: Ngày {formatDate(record.followUpDate)}</div>
                      )}
                    </div>

                    <div className="mt-4 flex justify-end space-x-2">
                      <button className="text-orange-600 hover:text-orange-800 text-sm font-medium" onClick={() => openFollowUpModal(record._id)}>
                        Tái khám
                      </button>
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        Chỉnh sửa
                      </button>
                      <button className="text-green-600 hover:text-green-800 text-sm font-medium">
                        In hồ sơ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có hồ sơ bệnh án</h3>
                <p className="text-gray-500 mb-4">Bệnh nhân này chưa có hồ sơ bệnh án nào được tạo.</p>
                <button className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
                  Tạo hồ sơ đầu tiên
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <FollowUpModal
        open={followUpModal.open}
        recordId={followUpModal.recordId}
        date={followUpModal.date}
        onClose={closeFollowUpModal}
        onSave={saveFollowUpFromModal}
      />
    </div>
  );
}

// Modal component styles are inline to keep this file self-contained
function FollowUpModal({ open, recordId, date, onClose, onSave }: { open: boolean; recordId?: string; date?: string; onClose: () => void; onSave: (id?: string, date?: string, time?: string) => Promise<boolean> | boolean }) {
  const [selectedDate, setSelectedDate] = useState<string>(date || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => setSelectedDate(date || ''), [date]);

  if (!open) return null;

  const choose = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    setSelectedDate(d.toISOString().slice(0,10));
  };

  const [selectedTime, setSelectedTime] = useState<string>('09:00');

  const handleSave = async () => {
    setSaving(true);
    try {
      const ok = await onSave(recordId, selectedDate, selectedTime);
      if (ok) {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => { if (!saving) onClose(); }}></div>
      <div className="bg-white rounded-lg shadow-lg z-60 p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-3">Đặt lịch tái khám</h3>
        <div className="flex gap-2 mb-3">
          <button onClick={() => choose(1)} className="px-3 py-1 border rounded">+1 tháng</button>
          <button onClick={() => choose(3)} className="px-3 py-1 border rounded">+3 tháng</button>
          <button onClick={() => choose(6)} className="px-3 py-1 border rounded">+6 tháng</button>
        </div>
        <div className="mb-4">
          <label className="text-sm">Ngày tái khám (tùy chọn)</label>
          <input type="date" className="block mt-1 p-2 border rounded w-full" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </div>
        <div className="mb-4">
          <label className="text-sm">Giờ (tùy chọn)</label>
          <input type="time" className="block mt-1 p-2 border rounded w-full" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={() => { if (!saving) onClose(); }} className="px-3 py-1 border rounded" disabled={saving}>Hủy</button>
          <button onClick={handleSave} className="px-3 py-1 bg-blue-600 text-white rounded" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
        </div>
      </div>
    </div>
  );
}
