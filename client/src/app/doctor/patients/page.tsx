"use client";

import { useToast } from "@/hooks/use-toast";
import { Activity, Calendar, Check, Eye, FileText, Filter, Mail, MapPin, MessageCircle, Phone, Pill, Plus, Printer, Search, TrendingUp, User, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
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
  avatarUrl?: string;
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
  medications?: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }[];
  notes?: string;
  followUpDate?: string;
  totalCost?: number;
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

interface PatientStats {
  totalPatients: number;
  activePatients: number;
  newPatientsThisMonth: number;
  inactivePatients: number;
}

export default function DoctorPatients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<PatientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(12);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [modalLoading, setModalLoading] = useState(false);
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [patientPrescriptions, setPatientPrescriptions] = useState<Prescription[]>([]);
  const [patientMedicalRecords, setPatientMedicalRecords] = useState<MedicalRecord[]>([]);
  const [patientPayments, setPatientPayments] = useState<any[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    testConnection();
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    fetchPatients();
    fetchStats();
  }, [currentPage, debouncedSearch, selectedFilter]);

  const testConnection = async () => {
    try {
      const response = await fetch("/api/test");
      const data = await response.json();
      console.log("Connection test:", data);
    } catch (error) {
      console.error("Connection test failed:", error);
    }
  };

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append("current", currentPage.toString());
      params.append("pageSize", pageSize.toString());
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (selectedFilter) params.append("status", selectedFilter);

      const response = await fetch(`/api/users/patients/search?${params}`);
      const data = await response.json();

      if (data?.success === true) {
        const patientsResult = data.data?.patients ?? data.data ?? [];
        setPatients(Array.isArray(patientsResult) ? patientsResult : []);
        const tp = data.data?.pagination?.totalPages ?? data.data?.totalPages ?? 1;
        setTotalPages(typeof tp === "number" ? tp : Number(tp) || 1);
      } else if (Array.isArray(data)) {
        setPatients(data);
        setTotalPages(1);
      } else if (data?.patients) {
        setPatients(Array.isArray(data.patients) ? data.patients : []);
        setTotalPages(data.pagination?.totalPages ?? 1);
      } else {
        console.error("Error fetching patients:", data?.message ?? "Unknown response");
        setError(data?.message || "Không thể tải danh sách bệnh nhân");
        setPatients([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
      setError("Lỗi kết nối server");
      setPatients([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      const response = await fetch(`/api/users/patients/stats?${params}`);
      const data = await response.json();

      if (data?.success === true) {
        setStats(data.data ?? null);
      } else {
        const raw = data?.data ?? data;
        if (raw && typeof raw === "object") {
          setStats(raw as PatientStats);
        } else {
          console.error("Error fetching stats:", data?.message ?? "Unknown response");
          setStats({
            totalPatients: 0,
            activePatients: 0,
            newPatientsThisMonth: 0,
            inactivePatients: 0,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      setStats({
        totalPatients: 0,
        activePatients: 0,
        newPatientsThisMonth: 0,
        inactivePatients: 0,
      });
    }
  };

  const handlePatientClick = async (patient: Patient) => {
    setSelectedPatient(patient);
    setIsModalOpen(true);
    setActiveTab('overview');
    setModalLoading(true);
    
    try {
      await Promise.all([
        fetchPatientAppointments(patient._id),
        fetchPatientPrescriptions(patient._id),
        fetchPatientMedicalRecords(patient._id),
        fetchPatientPayments(patient._id)
      ]);
    } catch (error) {
      console.error('Error fetching patient details:', error);
       toast({
         title: "Lỗi",
         description: "Không thể tải thông tin chi tiết bệnh nhân",
         type: "error"
       });
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPatient(null);
    setActiveTab('overview');
    setPatientAppointments([]);
    setPatientPrescriptions([]);
    setPatientMedicalRecords([]);
    setPatientPayments([]);
  };

  const handlePrescriptionClick = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setIsPrescriptionModalOpen(true);
  };

  const closePrescriptionModal = () => {
    setIsPrescriptionModalOpen(false);
    setSelectedPrescription(null);
  };

  const handlePrintPrescription = () => {
    window.print();
  };

  const fetchPatientAppointments = async (patientId: string) => {
    try {
      const response = await fetch(`/api/appointments/patient/${patientId}/history?current=1&pageSize=5`);
      const data = await response.json();
      if (data.success) {
        setPatientAppointments(data.data.appointments || []);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const fetchPatientPrescriptions = async (patientId: string) => {
    try {
      const response = await fetch(`/api/prescriptions/patient/${patientId}/recent?limit=5`);
      const data = await response.json();
      if (data.success) {
        setPatientPrescriptions(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    }
  };

  const fetchPatientMedicalRecords = async (patientId: string) => {
    try {
      const response = await fetch(`/api/medical-records/patient/${patientId}`);
      const data = await response.json();
      if (data && !data.error) {
        const records = data.data || data.results || data;
        setPatientMedicalRecords(Array.isArray(records) ? records : []);
      }
    } catch (error) {
      console.error('Error fetching medical records:', error);
    }
  };

  const fetchPatientPayments = async (patientId: string) => {
    try {
      // Try client proxy route first, then fall back to server path if needed
      const res = await fetch(`/api/payments/patient/${patientId}`);
      const data = await res.json();
      if (data?.success && Array.isArray(data.data)) {
        setPatientPayments(data.data);
        return;
      }
      // Fallback attempt (optional): ignore if fails due to CORS
      // const res2 = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/payments/patient/${patientId}`);
      // const data2 = await res2.json();
      // if (data2?.success && Array.isArray(data2.data)) setPatientPayments(data2.data);
    } catch (err) {
      console.warn('fetchPatientPayments failed (non-blocking):', err);
    }
  };

  const nextAppointment = (() => {
    if (!patientAppointments?.length) return null;
    const now = new Date();
    const upcoming = patientAppointments
      .map((a) => ({ ...a, dt: new Date(a.appointmentDate) }))
      .filter((a) => a.dt >= now && (a.status === 'scheduled' || a.status === 'confirmed'))
      .sort((a, b) => a.dt.getTime() - b.dt.getTime());
    return upcoming[0] || null;
  })();

  const lastVisitDate = (() => {
    if (!patientMedicalRecords?.length) return null;
    const sorted = [...patientMedicalRecords].sort(
      (a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime()
    );
    return sorted[0]?.recordDate || null;
  })();

  const unpaidPaymentsCount = (() => {
    if (!patientPayments?.length) return 0;
    return patientPayments.filter((p: any) => p.paymentStatus === 'unpaid').length;
  })();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN");
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

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
          <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></div>
          Đang hoạt động
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
          Không hoạt động
        </span>
      );
    }
  };

  const getAppointmentStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { bg: string; text: string; label: string } } = {
      'scheduled': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Đã lên lịch' },
      'confirmed': { bg: 'bg-green-100', text: 'text-green-800', label: 'Đã xác nhận' },
      'completed': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Hoàn thành' },
      'cancelled': { bg: 'bg-red-100', text: 'text-red-800', label: 'Đã hủy' },
      'rescheduled': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Đã đổi lịch' }
    };
    const statusInfo = statusMap[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}>
        {statusInfo.label}
      </span>
    );
  };

   return (
     <>
       <style jsx global>{`
         @media print {
           body * {
             visibility: hidden;
           }
           .print-prescription, .print-prescription * {
             visibility: visible;
           }
           .print-prescription {
             position: absolute;
             left: 0;
             top: 0;
             width: 100%;
             background: white;
           }
           .no-print {
             display: none !important;
           }
         }
       `}</style>
       <div className="min-h-screen bg-neutral-50">
      <div className="p-3 lg:p-4">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Header Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-10 h-10 rounded-lg bg-blue-600/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-700" />
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    Quản lý bệnh nhân
                  </h1>
                  <p className="text-gray-500 text-sm">Danh sách và thông tin chi tiết bệnh nhân</p>
                </div>
              </div>
              <button className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                Thêm bệnh nhân
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="backdrop-blur-xl bg-red-50/80 border border-red-200/50 rounded-2xl p-6 shadow-xl">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center">
                  <X className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-800">Lỗi</h3>
                  <p className="text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Search and Filter */}
          <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1 max-w-md">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tên, số điện thoại, email..."
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 placeholder-gray-500 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-md border border-gray-200">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select
                    className="bg-transparent border-none outline-none text-gray-700 font-medium text-sm"
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value)}
                  >
                    <option value="all">Tất cả</option>
                    <option value="active">Đang hoạt động</option>
                    <option value="inactive">Không hoạt động</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-blue-600/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">Tổng bệnh nhân</p>
                  <p className="text-lg font-semibold text-gray-900">{stats ? stats.totalPatients : "..."}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-emerald-600/10 flex items-center justify-center">
                  <Check className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">Đang hoạt động</p>
                  <p className="text-lg font-semibold text-gray-900">{stats ? stats.activePatients : "..."}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-purple-600/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-700" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">Mới tháng này</p>
                  <p className="text-lg font-semibold text-gray-900">{stats ? stats.newPatientsThisMonth : "..."}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-orange-600/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-orange-700" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">Không hoạt động</p>
                  <p className="text-lg font-semibold text-gray-900">{stats ? stats.inactivePatients : "..."}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Patients Table */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200/50">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">Danh sách bệnh nhân</h2>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md font-medium text-xs">
                    {patients.length} bệnh nhân
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                  <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-purple-400 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                </div>
                <p className="mt-4 text-gray-600 font-medium">Đang tải danh sách bệnh nhân...</p>
              </div>
            ) : patients.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Không có bệnh nhân nào</h3>
                <p className="text-gray-500 text-sm">Chưa có bệnh nhân nào được đăng ký trong hệ thống</p>
                {error && (
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-xl mt-4">
                    <X className="w-4 h-4" />
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Bệnh nhân</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Thông tin liên hệ</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tuổi/Giới tính</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Trạng thái</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ngày đăng ký</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {patients.map((patient) => (
                        <tr 
                          key={patient._id}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => handlePatientClick(patient)}
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="w-9 h-9 rounded-md bg-gray-100 flex items-center justify-center text-gray-700 font-semibold text-sm">
                                  {patient.fullName.charAt(0).toUpperCase()}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center border border-gray-200">
                                  <div className={`w-2 h-2 rounded-full ${patient.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`}></div>
                                </div>
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 text-sm">{patient.fullName}</div>
                                <div className="text-xs text-gray-500">ID: {patient._id.slice(-8)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Phone className="w-3 h-3 text-blue-500" />
                                <span className="font-medium">{patient.phone}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Mail className="w-3 h-3 text-emerald-500" />
                                <span className="font-medium truncate max-w-[200px]">{patient.email}</span>
                              </div>
                              {patient.address && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <MapPin className="w-3 h-3 text-purple-500" />
                                  <span className="font-medium truncate max-w-[200px]">{patient.address}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-900">
                              <div className="font-medium">
                                {patient.dateOfBirth ? `${calculateAge(patient.dateOfBirth)} tuổi` : "Chưa cập nhật"}
                              </div>
                              <div className="text-gray-500 text-xs">
                                {patient.gender === "male" ? "Nam" : patient.gender === "female" ? "Nữ" : "Chưa cập nhật"}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {getStatusBadge(patient.isActive)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-900 font-medium">
                              {formatDate(patient.createdAt)}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <button
                              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePatientClick(patient);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                              Xem
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-700 font-medium">
                        Trang {currentPage} của {totalPages}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-2 bg-white border border-gray-300 rounded-md text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Trước
                        </button>
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-2 bg-white border border-gray-300 rounded-md text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Sau
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Patient Detail Modal */}
          {isModalOpen && selectedPatient && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 z-50" onClick={closeModal}>
              <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-hidden shadow-xl border border-gray-200" onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="px-5 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center text-gray-700 font-semibold">
                        {selectedPatient.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-base font-semibold text-gray-900">{selectedPatient.fullName}</h2>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {selectedPatient.dateOfBirth ? `${calculateAge(selectedPatient.dateOfBirth)} tuổi` : "Chưa cập nhật"}
                          {selectedPatient.gender && ` • ${selectedPatient.gender === "male" ? "Nam" : "Nữ"}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(selectedPatient.isActive)}
                      <button
                        onClick={closeModal}
                        className="p-2 hover:bg-gray-100 rounded-md"
                        aria-label="Đóng"
                      >
                        <X className="w-5 h-5 text-gray-700" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 bg-white">
                  <nav className="flex space-x-2 px-4">
                    {[
                      { id: 'overview', label: 'Tổng quan', icon: User },
                      { id: 'appointments', label: 'Lịch hẹn', icon: Calendar },
                      { id: 'prescriptions', label: 'Đơn thuốc', icon: Pill },
                      { id: 'medical-records', label: 'Hồ sơ bệnh án', icon: FileText }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-2 px-3 border-b-2 text-sm flex items-center gap-2 ${
                          activeTab === tab.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Modal Content */}
                <div className="p-5 max-h-[70vh] overflow-y-auto">
                  {modalLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="w-10 h-10 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <>
                      {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                          {/* Patient Info - 2 columns */}
                          <div className="xl:col-span-2 space-y-3">
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <User className="w-5 h-5 text-gray-700" />
                                Thông tin cá nhân
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Họ và tên</label>
                                  <p className="text-gray-900 font-semibold text-sm">{selectedPatient.fullName}</p>
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Email</label>
                                  <p className="text-gray-900 font-medium text-sm break-all">{selectedPatient.email}</p>
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Số điện thoại</label>
                                  <p className="text-gray-900 font-medium text-sm">{selectedPatient.phone}</p>
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Ngày sinh</label>
                                  <p className="text-gray-900 font-medium text-sm">
                                    {selectedPatient.dateOfBirth ? `${formatDate(selectedPatient.dateOfBirth)} (${calculateAge(selectedPatient.dateOfBirth)} tuổi)` : 'Chưa cập nhật'}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Giới tính</label>
                                  <p className="text-gray-900 font-medium text-sm">
                                    {selectedPatient.gender === 'male' ? 'Nam' : selectedPatient.gender === 'female' ? 'Nữ' : 'Chưa cập nhật'}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Trạng thái</label>
                                  <div className="mt-1">
                                    {getStatusBadge(selectedPatient.isActive)}
                                  </div>
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Địa chỉ</label>
                                  <p className="text-gray-900 font-medium text-sm">{selectedPatient.address || 'Chưa cập nhật'}</p>
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Ngày đăng ký</label>
                                  <p className="text-gray-900 font-medium text-sm">{formatDate(selectedPatient.createdAt)}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Quick Stats - 1 column */}
                          <div className="space-y-3">
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-gray-700" />
                                Tổng quan nhanh
                              </h3>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 text-sm">Tổng lịch hẹn</span>
                                  <span className="text-base font-semibold text-gray-900">{patientAppointments.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 text-sm">Tổng đơn thuốc</span>
                                  <span className="text-base font-semibold text-gray-900">{patientPrescriptions.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600 text-sm">Hồ sơ bệnh án</span>
                                  <span className="text-base font-semibold text-gray-900">{patientMedicalRecords.length}</span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h3 className="text-lg font-bold text-gray-900 mb-3">Dữ liệu khám</h3>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Lần khám gần nhất</span>
                                  <span className="font-medium text-gray-900">{lastVisitDate ? formatDate(lastVisitDate) : 'Chưa có'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Lịch hẹn sắp tới</span>
                                  <span className="font-medium text-gray-900">{nextAppointment ? `${formatDate(nextAppointment.appointmentDate)} ${nextAppointment.startTime}` : 'Không có'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Thanh toán chưa hoàn tất</span>
                                  <span className="font-medium text-gray-900">{unpaidPaymentsCount}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Quick Actions - 1 column */}
                          <div className="space-y-3">
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-gray-700" />
                                Hành động
                              </h3>
                              <div className="space-y-2">
                                <button 
                                  onClick={() => {
                                    closeModal();
                                    router.push(`/doctor/appointments?patientId=${selectedPatient._id}&patientName=${encodeURIComponent(selectedPatient.fullName)}`);
                                  }}
                                  className="w-full text-left px-3 py-2 text-blue-700 hover:bg-gray-50 rounded-md font-medium flex items-center gap-2 text-sm"
                                >
                                  <Calendar className="w-4 h-4" />
                                  Tạo lịch hẹn
                                </button>
                                <button 
                                  onClick={() => {
                                    closeModal();
                                    router.push(`/doctor/prescriptions/create?patientId=${selectedPatient._id}`);
                                  }}
                                  className="w-full text-left px-3 py-2 text-emerald-700 hover:bg-gray-50 rounded-md font-medium flex items-center gap-2 text-sm"
                                >
                                  <Pill className="w-4 h-4" />
                                  Tạo đơn thuốc
                                </button>
                                <button 
                                  onClick={() => {
                                    closeModal();
                                    router.push(`/doctor/treatment?patientId=${selectedPatient._id}`);
                                  }}
                                  className="w-full text-left px-3 py-2 text-purple-700 hover:bg-gray-50 rounded-md font-medium flex items-center gap-2 text-sm"
                                >
                                  <FileText className="w-4 h-4" />
                                  Tạo hồ sơ
                                </button>
                                <button 
                                  onClick={() => {
                                    closeModal();
                                    router.push(`/doctor/chat?patientId=${selectedPatient._id}&patientName=${encodeURIComponent(selectedPatient.fullName)}`);
                                  }}
                                  className="w-full text-left px-3 py-2 text-orange-700 hover:bg-gray-50 rounded-md font-medium flex items-center gap-2 text-sm"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  Nhắn tin
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === 'appointments' && (
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                              <Calendar className="w-5 h-5 text-gray-700" />
                              Lịch sử lịch hẹn ({patientAppointments.length})
                            </h3>
                          </div>
                          <div className="space-y-3">
                            {patientAppointments.length > 0 ? (
                              patientAppointments.map((appointment) => (
                                <div key={appointment._id} className="bg-white rounded-md p-3 border border-gray-200">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center">
                                          <Calendar className="w-4 h-4 text-gray-700" />
                                        </div>
                                        <div>
                                          <p className="font-semibold text-gray-900 text-sm">
                                            {formatDate(appointment.appointmentDate)} - {appointment.startTime}
                                          </p>
                                          <p className="text-gray-600 text-xs">
                                            Bác sĩ: {appointment.doctorId.fullName} ({appointment.doctorId.specialty})
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="ml-3">
                                      {getAppointmentStatusBadge(appointment.status)}
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-8">
                                <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-500 text-sm">Chưa có lịch hẹn nào</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {activeTab === 'prescriptions' && (
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                              <Pill className="w-5 h-5 text-gray-700" />
                              Đơn thuốc ({patientPrescriptions.length})
                            </h3>
                          </div>
                           <div className="space-y-3">
                             {patientPrescriptions.length > 0 ? (
                               patientPrescriptions.map((prescription) => (
                                 <div 
                                   key={prescription._id} 
                                   className="bg-white rounded-md p-3 border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                                   onClick={() => handlePrescriptionClick(prescription)}
                                 >
                                   <div className="flex justify-between items-start">
                                     <div className="flex-1">
                                       <div className="flex items-center gap-3 mb-2">
                                         <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center">
                                           <Pill className="w-4 h-4 text-gray-700" />
                                         </div>
                                         <div>
                                           <p className="font-semibold text-gray-900 text-sm">
                                             {formatDate(prescription.prescriptionDate)}
                                           </p>
                                           <p className="text-gray-600 text-xs">
                                             Bác sĩ: {prescription.doctorId.fullName}
                                           </p>
                                         </div>
                                       </div>
                                       <div className="ml-11">
                                         <p className="text-gray-700 text-xs">
                                           <span className="font-medium">Chẩn đoán:</span> {prescription.diagnosis}
                                         </p>
                                       </div>
                                     </div>
                                     <div className="ml-3 flex items-center gap-2">
                                       <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                         prescription.isDispensed ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'
                                       }`}>
                                         {prescription.isDispensed ? 'Đã cấp thuốc' : 'Chờ cấp thuốc'}
                                       </span>
                                       <Eye className="w-4 h-4 text-gray-400" />
                                     </div>
                                   </div>
                                 </div>
                               ))
                             ) : (
                               <div className="text-center py-8">
                                 <Pill className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                 <p className="text-gray-500 text-sm">Chưa có đơn thuốc nào</p>
                               </div>
                             )}
                           </div>
                        </div>
                      )}

                      {activeTab === 'medical-records' && (
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                              <FileText className="w-5 h-5 text-gray-700" />
                              Hồ sơ bệnh án ({patientMedicalRecords.length})
                            </h3>
                          </div>
                          <div className="space-y-4">
                            {patientMedicalRecords.length > 0 ? (
                              patientMedicalRecords.map((record) => (
                                <div key={record._id} className="bg-white rounded-md p-3 border border-gray-200">
                                  <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center">
                                        <FileText className="w-4 h-4 text-gray-700" />
                                      </div>
                                      <div>
                                        <h4 className="font-semibold text-gray-900 text-sm">
                                          Khám ngày {formatDate(record.recordDate)}
                                        </h4>
                                        <p className="text-gray-600 text-xs">
                                          Bác sĩ: {record.doctorId.fullName} ({record.doctorId.specialty})
                                        </p>
                                      </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      record.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                                      record.status === 'active' ? 'bg-blue-100 text-blue-800' :
                                      'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {record.status === 'completed' ? 'Hoàn thành' :
                                       record.status === 'active' ? 'Đang điều trị' :
                                       'Chờ xử lý'}
                                    </span>
                                  </div>

                                  <div className="ml-11 space-y-3">
                                    <div>
                                      <h5 className="font-semibold text-gray-900 text-xs mb-1">Triệu chứng chính</h5>
                                      <p className="text-gray-700 bg-gray-50 p-2 rounded-md text-xs">
                                        {record.chiefComplaint}
                                      </p>
                                    </div>

                                    {record.diagnosis && (
                                      <div>
                                        <h5 className="font-semibold text-gray-900 text-xs mb-1">Chẩn đoán</h5>
                                        <p className="text-gray-700 bg-blue-50 p-2 rounded-md text-xs">
                                          {record.diagnosis}
                                        </p>
                                      </div>
                                    )}

                                    {record.treatmentPlan && (
                                      <div>
                                        <h5 className="font-semibold text-gray-900 text-xs mb-1">Kế hoạch điều trị</h5>
                                        <p className="text-gray-700 bg-emerald-50 p-2 rounded-md text-xs">
                                          {record.treatmentPlan}
                                        </p>
                                      </div>
                                    )}

                                    {record.medications && record.medications.length > 0 && (
                                      <div>
                                        <h5 className="font-semibold text-gray-900 text-xs mb-1">Thuốc được kê</h5>
                                        <ul className="bg-purple-50 p-2 rounded-md space-y-1">
                                          {record.medications.map((medication, index) => (
                                            <li key={index} className="text-gray-700 flex items-start text-xs">
                                              <span className="text-purple-600 mr-2">•</span>
                                              {medication}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {record.notes && (
                                      <div>
                                        <h5 className="font-semibold text-gray-900 text-xs mb-1">Ghi chú</h5>
                                        <p className="text-gray-700 bg-yellow-50 p-2 rounded-md text-xs">
                                          {record.notes}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-8">
                                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                <h3 className="text-sm font-semibold text-gray-900 mb-2">Chưa có hồ sơ bệnh án</h3>
                                <p className="text-gray-500 text-xs mb-4">Bệnh nhân này chưa có hồ sơ bệnh án nào được tạo.</p>
                                <button 
                                  onClick={() => {
                                    closeModal();
                                    router.push(`/doctor/treatment?patientId=${selectedPatient._id}`);
                                  }}
                                  className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 font-medium text-sm"
                                >
                                  Tạo hồ sơ đầu tiên
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
           )}

           {/* Prescription Detail Modal */}
           {isPrescriptionModalOpen && selectedPrescription && selectedPatient && (
             <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 z-50" onClick={closePrescriptionModal}>
               <div className="print-prescription bg-white rounded-lg max-w-4xl w-full max-h-[95vh] overflow-hidden shadow-xl border border-gray-200" onClick={(e) => e.stopPropagation()}>
                 {/* Modal Header */}
                 <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                         <Pill className="w-6 h-6 text-blue-600" />
                       </div>
                       <div>
                         <h2 className="text-xl font-bold text-gray-900">Đơn thuốc chi tiết</h2>
                         <p className="text-gray-600 text-sm">
                           Bệnh nhân: {selectedPatient.fullName} • Ngày kê: {formatDate(selectedPrescription.prescriptionDate)}
                         </p>
                       </div>
                     </div>
                     <div className="flex items-center gap-3">
                       <button
                         onClick={handlePrintPrescription}
                         className="no-print inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                       >
                         <Printer className="w-4 h-4" />
                         In đơn thuốc
                       </button>
                       <button
                         onClick={closePrescriptionModal}
                         className="no-print p-2 hover:bg-gray-100 rounded-lg"
                         aria-label="Đóng"
                       >
                         <X className="w-5 h-5 text-gray-700" />
                       </button>
                     </div>
                   </div>
                 </div>

                 {/* Prescription Content */}
                 <div className="p-6 max-h-[calc(95vh-120px)] overflow-y-auto">
                   <div className="space-y-6">
                     {/* Header Info */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="bg-gray-50 rounded-lg p-4">
                         <h3 className="font-semibold text-gray-900 mb-3">Thông tin bệnh nhân</h3>
                         <div className="space-y-2 text-sm">
                           <div><span className="font-medium">Họ tên:</span> {selectedPatient.fullName}</div>
                           <div><span className="font-medium">Tuổi:</span> {selectedPatient.dateOfBirth ? calculateAge(selectedPatient.dateOfBirth) : 'N/A'} tuổi</div>
                           <div><span className="font-medium">Giới tính:</span> {selectedPatient.gender === 'male' ? 'Nam' : selectedPatient.gender === 'female' ? 'Nữ' : 'N/A'}</div>
                           <div><span className="font-medium">SĐT:</span> {selectedPatient.phone}</div>
                         </div>
                       </div>
                       
                       <div className="bg-gray-50 rounded-lg p-4">
                         <h3 className="font-semibold text-gray-900 mb-3">Thông tin bác sĩ</h3>
                         <div className="space-y-2 text-sm">
                           <div><span className="font-medium">Bác sĩ:</span> {selectedPrescription.doctorId.fullName}</div>
                           <div><span className="font-medium">Chuyên khoa:</span> {selectedPrescription.doctorId.specialty}</div>
                           <div><span className="font-medium">Ngày kê:</span> {formatDate(selectedPrescription.prescriptionDate)}</div>
                           <div><span className="font-medium">Trạng thái:</span> 
                             <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                               selectedPrescription.isDispensed ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'
                             }`}>
                               {selectedPrescription.isDispensed ? 'Đã cấp thuốc' : 'Chờ cấp thuốc'}
                             </span>
                           </div>
                         </div>
                       </div>
                     </div>

                     {/* Diagnosis */}
                     <div className="bg-blue-50 rounded-lg p-4">
                       <h3 className="font-semibold text-gray-900 mb-2">Chẩn đoán</h3>
                       <p className="text-gray-700">{selectedPrescription.diagnosis}</p>
                     </div>

                     {/* Medications */}
                     <div className="bg-white border border-gray-200 rounded-lg p-4">
                       <h3 className="font-semibold text-gray-900 mb-4">Danh sách thuốc</h3>
                       {selectedPrescription.medications && selectedPrescription.medications.length > 0 ? (
                         <div className="space-y-4">
                           {selectedPrescription.medications.map((med, index) => (
                             <div key={index} className="bg-gray-50 rounded-lg p-4">
                               <div className="flex justify-between items-start mb-2">
                                 <h4 className="font-medium text-gray-900">{med.name}</h4>
                                 <span className="text-sm text-gray-500">#{index + 1}</span>
                               </div>
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                 <div>
                                   <span className="font-medium text-gray-600">Liều lượng:</span>
                                   <p className="text-gray-900">{med.dosage}</p>
                                 </div>
                                 <div>
                                   <span className="font-medium text-gray-600">Tần suất:</span>
                                   <p className="text-gray-900">{med.frequency}</p>
                                 </div>
                                 <div>
                                   <span className="font-medium text-gray-600">Thời gian:</span>
                                   <p className="text-gray-900">{med.duration}</p>
                                 </div>
                               </div>
                               {med.instructions && (
                                 <div className="mt-3">
                                   <span className="font-medium text-gray-600 text-sm">Hướng dẫn sử dụng:</span>
                                   <p className="text-gray-700 text-sm mt-1">{med.instructions}</p>
                                 </div>
                               )}
                             </div>
                           ))}
                         </div>
                       ) : (
                         <div className="text-center py-8">
                           <Pill className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                           <p className="text-gray-500">Chưa có thông tin thuốc chi tiết</p>
                         </div>
                       )}
                     </div>

                     {/* Additional Info */}
                     {(selectedPrescription.notes || selectedPrescription.followUpDate || selectedPrescription.totalCost) && (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {selectedPrescription.notes && (
                           <div className="bg-yellow-50 rounded-lg p-4">
                             <h3 className="font-semibold text-gray-900 mb-2">Ghi chú</h3>
                             <p className="text-gray-700 text-sm">{selectedPrescription.notes}</p>
                           </div>
                         )}
                         
                         {selectedPrescription.followUpDate && (
                           <div className="bg-green-50 rounded-lg p-4">
                             <h3 className="font-semibold text-gray-900 mb-2">Lịch tái khám</h3>
                             <p className="text-gray-700 text-sm">{formatDate(selectedPrescription.followUpDate)}</p>
                           </div>
                         )}
                         
                         {selectedPrescription.totalCost && (
                           <div className="bg-purple-50 rounded-lg p-4">
                             <h3 className="font-semibold text-gray-900 mb-2">Tổng chi phí</h3>
                             <p className="text-gray-700 text-sm font-medium">{selectedPrescription.totalCost.toLocaleString('vi-VN')} VNĐ</p>
                           </div>
                         )}
                       </div>
                     )}

                     {/* Footer */}
                     <div className="bg-gray-50 rounded-lg p-4 text-center">
                       <p className="text-sm text-gray-600">
                         Đơn thuốc này được tạo bởi hệ thống quản lý nha khoa thông minh
                       </p>
                       <p className="text-xs text-gray-500 mt-1">
                         In lúc: {new Date().toLocaleString('vi-VN')}
                       </p>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           )}
         </div>
       </div>
     </div>
     </>
   );
 }