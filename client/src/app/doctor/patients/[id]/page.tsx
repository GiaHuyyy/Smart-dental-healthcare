"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

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
        setMedicalRecords(Array.isArray(records) ? records : []);
      } else {
        console.error('API returned error:', data.error || data.details);
        setMedicalRecords([]);
      }
    } catch (error) {
      console.error('Error fetching medical records:', error);
      setMedicalRecords([]);
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
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{patient.fullName}</h1>
          <p className="text-gray-600">Thông tin chi tiết bệnh nhân</p>
        </div>
        <div className="flex space-x-3">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Tạo lịch hẹn
          </button>
          <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
            Tạo đơn thuốc
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
              <h3 className="text-lg font-semibold text-gray-900">Đơn thuốc gần đây</h3>
              <Link href={`/api/prescriptions/patient/${patientId}/history`} className="text-blue-600 hover:text-blue-800 text-sm">
                Xem tất cả
              </Link>
            </div>
          </div>
          <div className="p-6">
            {prescriptions.length > 0 ? (
              <div className="space-y-4">
                {prescriptions.map((prescription) => (
                  <div key={prescription._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatDate(prescription.prescriptionDate)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Chẩn đoán: {prescription.diagnosis}
                        </p>
                        <p className="text-sm text-gray-600">
                          Bác sĩ: {prescription.doctorId.fullName} ({prescription.doctorId.specialty})
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        prescription.isDispensed 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {prescription.isDispensed ? 'Đã phát thuốc' : 'Chưa phát thuốc'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Chưa có đơn thuốc nào</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'medical-records' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Hồ sơ bệnh án</h3>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm">
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

                    {record.isFollowUpRequired && (
                      <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                        <div className="flex items-center">
                          <span className="text-orange-600 mr-2">⚠️</span>
                          <span className="font-medium text-orange-800">Cần tái khám</span>
                          {record.followUpDate && (
                            <span className="ml-2 text-orange-700">
                              - Ngày {formatDate(record.followUpDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex justify-end space-x-2">
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
    </div>
  );
}
