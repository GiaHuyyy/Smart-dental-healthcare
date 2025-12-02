"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Search, Users, Check, Calendar, Activity, Mail, Phone, MapPin, X, User } from "lucide-react";
import PatientDetailView from "@/components/patients/PatientDetailView";

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

interface PatientStats {
  totalPatients: number;
  activePatients: number;
  newPatientsThisMonth: number;
  inactivePatients: number;
}

interface Appointment {
  _id: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  status: string;
  appointmentType?: string;
  consultationFee?: number;
  notes?: string;
  paymentStatus?: string;
  duration?: number;
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
  appointmentId?:
    | string
    | {
        _id: string;
        patientId: string;
        doctorId: string;
        appointmentDate: string;
        startTime: string;
        endTime: string;
        status: string;
        [key: string]: unknown;
      };
  doctorId?: {
    _id: string;
    fullName: string;
    specialty: string;
    email?: string;
  };
  patientId?: {
    _id: string;
    fullName: string;
    email: string;
    phone: string;
  };
  isFollowUpRequired?: boolean;
  followUpDate?: string;
  medications?: string[];
  notes?: string;
  vitalSigns?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
  };
  procedures?: Array<{
    name: string;
    description: string;
    date: string;
    cost: number;
    status: string;
  }>;
  dentalChart?: Array<{
    toothNumber: number;
    condition: string;
    treatment: string;
    notes: string;
  }>;
  attachments?: string[];
}

interface Payment {
  _id: string;
  amount: number;
  status: string;
  type: string;
  paymentDate?: string;
  paymentMethod?: string;
  transactionId?: string;
  refId?: string;
  refModel?: string;
}

export default function DoctorPatients() {
  const { data: session } = useSession();

  // Patient Detail States
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [patientMedicalRecords, setPatientMedicalRecords] = useState<MedicalRecord[]>([]);
  const [patientPayments, setPatientPayments] = useState<Payment[]>([]);

  // Patient List States
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<PatientStats | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(12);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Fetch patients and stats
  useEffect(() => {
    if (!selectedPatient) {
      fetchPatients();
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearch, selectedFilter, startDate, endDate, selectedPatient]);

  const fetchPatients = async () => {
    try {
      const params = new URLSearchParams();
      params.append("current", currentPage.toString());
      params.append("pageSize", pageSize.toString());
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (selectedFilter && selectedFilter !== "all") params.append("status", selectedFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      // Thêm doctorId để chỉ lấy bệnh nhân có lịch hẹn completed với bác sĩ này
      if (session?.user?._id) params.append("doctorId", session.user._id);
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/users/patients/search?${params}`);
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
        setPatients([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
      setPatients([]);
      setTotalPages(1);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      // Thêm doctorId để chỉ lấy thống kê bệnh nhân có lịch hẹn completed với bác sĩ này
      if (session?.user?._id) params.append("doctorId", session.user._id);
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/users/patients/stats?${params}`);
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

  const handlePatientSelect = async (patient: Patient) => {
    setSelectedPatient(patient);
    setLoading(true);

    try {
      await Promise.all([
        fetchPatientAppointments(patient._id),
        fetchPatientMedicalRecords(patient._id),
        fetchPatientPayments(patient._id),
      ]);
    } catch (error) {
      console.error("Error fetching patient details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToList = () => {
    setSelectedPatient(null);
    setPatientAppointments([]);
    setPatientMedicalRecords([]);
    setPatientPayments([]);
  };

  const handleRefreshPatientData = async () => {
    if (selectedPatient) {
      setLoading(true);
      try {
        await Promise.all([
          fetchPatientAppointments(selectedPatient._id),
          fetchPatientMedicalRecords(selectedPatient._id),
          fetchPatientPayments(selectedPatient._id),
        ]);
      } catch (error) {
        console.error("Error refreshing patient data:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const fetchPatientAppointments = async (patientId: string) => {
    try {
      // Get doctor ID from session to filter only appointments with this doctor
      const doctorId = (session?.user as { _id?: string })?._id;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/appointments/patient/${patientId}/history?current=1&pageSize=50&doctorId=${doctorId}`
      );
      const data = await response.json();
      if (data.success) {
        const appointments = data.data.appointments || [];
        setPatientAppointments(appointments);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    }
  };

  const fetchPatientMedicalRecords = async (patientId: string) => {
    try {
      // Get doctor ID from session to filter only records treated by this doctor
      const doctorId = (session?.user as { _id?: string })?._id;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/medical-records/patient/${patientId}?doctorId=${doctorId}`
      );
      const data = await response.json();
      if (data && !data.error) {
        const records = data.data || data.results || data;
        setPatientMedicalRecords(Array.isArray(records) ? records : []);
      }
    } catch (error) {
      console.error("Error fetching medical records:", error);
    }
  };

  const fetchPatientPayments = async (patientId: string) => {
    try {
      // Get doctor ID from session
      const doctorId = (session?.user as { _id?: string })?._id;
      if (!doctorId) {
        console.error("Doctor ID not found in session");
        setPatientPayments([]);
        return;
      }

      // Fetch revenue data for doctor filtered by patient ID
      // Use period=all to get all revenue records, not just last month
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/revenue/doctor/${doctorId}?patientId=${patientId}&period=all&pageSize=100`
      );
      const data = await res.json();
      let payments = [];
      if (data?.success && data?.data?.results) {
        payments = data.data.results;
      } else if (data?.data && Array.isArray(data.data)) {
        payments = data.data;
      } else if (Array.isArray(data)) {
        payments = data;
      }

      setPatientPayments(payments);
    } catch (err) {
      console.error("fetchPatientPayments failed:", err);
      setPatientPayments([]);
    }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN");
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

  const handleStatCardClick = (filter: string) => {
    setSelectedFilter(filter);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSearchTerm("");
    setSelectedFilter("all");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-6">
        {/* Header - Schedule Style - Always visible */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {/* Title Row */}
          <div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Quản lý bệnh nhân</h1>
                <p className="text-sm text-gray-600">Danh sách và thông tin chi tiết bệnh nhân</p>
              </div>
            </div>

            {/* Filters Row - Only show when not viewing patient detail */}
            <div className="flex flex-col md:flex-row items-center gap-3 mt-3">
              {/* Search Input */}
              <div className="relative flex-1 w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên, số điện thoại, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
                />
              </div>

              <span className="text-sm font-medium text-gray-700">Từ</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
              />
              <span className="text-sm font-medium text-gray-700">đến</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
              />
              <button
                onClick={handleClearFilters}
                disabled={!startDate && !endDate && !searchTerm}
                className="px-4 py-2.5 text-sm bg-white text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium border border-gray-300"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6 mb-6">
          <button
            onClick={() => handleStatCardClick("all")}
            className={`bg-white rounded-lg p-4 border-2 transition-all hover:shadow-md text-left ${
              selectedFilter === "all" ? "border-primary shadow-md" : "border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng bệnh nhân</p>
                <p className="text-2xl font-bold text-gray-900">{stats ? stats.totalPatients ?? 0 : "..."}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </button>

          <button
            onClick={() => handleStatCardClick("active")}
            className={`bg-white rounded-lg p-4 border-2 transition-all hover:shadow-md text-left ${
              selectedFilter === "active" ? "border-emerald-500 shadow-md" : "border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đang hoạt động</p>
                <p className="text-2xl font-bold text-emerald-600">{stats ? stats.activePatients ?? 0 : "..."}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Check className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </button>

          <button
            onClick={() => handleStatCardClick("new")}
            className={`bg-white rounded-lg p-4 border-2 transition-all hover:shadow-md text-left ${
              selectedFilter === "new" ? "border-primary shadow-md" : "border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Mới tháng này</p>
                <p className="text-2xl font-bold text-primary">{stats ? stats.newPatientsThisMonth ?? 0 : "..."}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
            </div>
          </button>

          <button
            onClick={() => handleStatCardClick("inactive")}
            className={`bg-white rounded-lg p-4 border-2 transition-all hover:shadow-md text-left ${
              selectedFilter === "inactive" ? "border-orange-500 shadow-md" : "border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Không hoạt động</p>
                <p className="text-2xl font-bold text-orange-600">{stats ? stats.inactivePatients ?? 0 : "..."}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </button>
        </div>

        {/* Patient Detail View or Patient List Table */}
        {selectedPatient ? (
          <PatientDetailView
            patient={selectedPatient}
            appointments={patientAppointments}
            medicalRecords={patientMedicalRecords}
            payments={patientPayments}
            loading={loading}
            onBack={handleBackToList}
            onRefresh={handleRefreshPatientData}
          />
        ) : (
          <>
            {/* Patients Table */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200/50">
                <h2 className="text-base font-semibold text-gray-900">Danh sách bệnh nhân</h2>
              </div>

              {patients.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Không có bệnh nhân nào</h3>
                  <p className="text-gray-500 text-sm">Chưa có bệnh nhân nào được đăng ký trong hệ thống</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Bệnh nhân
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Thông tin liên hệ
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Tuổi/Giới tính
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Trạng thái
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Ngày đăng ký
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {patients.map((patient) => (
                          <tr
                            key={patient._id}
                            className="hover:bg-primary/5 transition-colors cursor-pointer"
                            onClick={() => handlePatientSelect(patient)}
                          >
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                {patient.avatarUrl ? (
                                  <img
                                    src={patient.avatarUrl}
                                    alt={patient.fullName}
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="w-5 h-5 text-primary" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-semibold text-gray-900">{patient.fullName}</p>
                                  <p className="text-sm text-gray-500">ID: {patient._id.slice(-6)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm text-gray-900">
                                  <Mail className="w-4 h-4 text-gray-400" />
                                  {patient.email}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-900">
                                  <Phone className="w-4 h-4 text-gray-400" />
                                  {patient.phone}
                                </div>
                                {patient.address && (
                                  <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    {patient.address}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm text-gray-900">
                                {patient.dateOfBirth ? (
                                  <span className="font-medium">{calculateAge(patient.dateOfBirth)} tuổi</span>
                                ) : (
                                  <span className="text-gray-400">N/A</span>
                                )}
                                {patient.gender && (
                                  <span className="ml-2 text-gray-600">
                                    • {patient.gender === "male" ? "Nam" : "Nữ"}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">{getStatusBadge(patient.isActive)}</td>
                            <td className="px-4 py-4">
                              <div className="text-sm text-gray-900 font-semibold">{formatDate(patient.createdAt)}</div>
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
          </>
        )}
      </div>
    </div>
  );
}
