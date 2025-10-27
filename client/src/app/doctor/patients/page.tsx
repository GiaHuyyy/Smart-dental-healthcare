"use client";

import TreatmentModal from "@/components/appointments/TreatmentModal";
import MedicalRecordDetailModal from "@/components/medical-records/MedicalRecordDetailModal";
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
  status: string; // pending, completed, failed, refunded
  type: string; // appointment, treatment, medicine, other
  paymentDate?: string;
  paymentMethod?: string;
  transactionId?: string;
  refId?: string;
  refModel?: string;
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
  const [patientPayments, setPatientPayments] = useState<Payment[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [selectedMedicalRecord, setSelectedMedicalRecord] = useState<MedicalRecord | null>(null);
  const [isMedicalRecordModalOpen, setIsMedicalRecordModalOpen] = useState(false);
  const [medicalRecordDetails, setMedicalRecordDetails] = useState<MedicalRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleMedicalRecordClick = async (record: MedicalRecord) => {
    try {
      setMedicalRecordDetails(null);
      setSelectedMedicalRecord(record);
      setIsMedicalRecordModalOpen(true);
      
      // Fetch full details
      const response = await fetch(`/api/medical-records/${record._id}`);
      const data = await response.json();
      
      if (data && !data.error) {
        setMedicalRecordDetails(data.data || data);
      } else {
        setMedicalRecordDetails(record);
      }
    } catch (error) {
      console.error('Error fetching medical record details:', error);
      setMedicalRecordDetails(record);
    }
  };

  const closeMedicalRecordModal = () => {
    setIsMedicalRecordModalOpen(false);
    setSelectedMedicalRecord(null);
    setMedicalRecordDetails(null);
  };

  const handleEditMedicalRecord = () => {
    setIsMedicalRecordModalOpen(false);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    // Refetch medical records after edit
    if (selectedPatient) {
      fetchPatientMedicalRecords(selectedPatient._id);
    }
  };

  const handleSubmitTreatment = async (formData: {
    chiefComplaints?: string[];
    diagnosisGroups?: Array<{ diagnosis: string; treatmentPlans: string[] }>;
    medications?: Array<{ name: string; dosage: string; frequency: string; duration: string; instructions?: string }>;
    notes?: string;
  }) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/medical-records/${selectedMedicalRecord?._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           chiefComplaint: formData.chiefComplaints?.join(', ') || medicalRecordDetails?.chiefComplaint,
           diagnosis: formData.diagnosisGroups?.map((g) => g.diagnosis).join(', ') || medicalRecordDetails?.diagnosis,
           treatmentPlan: formData.diagnosisGroups?.map((g) => g.treatmentPlans.join(', ')).join('; ') || medicalRecordDetails?.treatmentPlan,
          medications: formData.medications?.map((m) => `${m.name} - ${m.dosage} - ${m.frequency}`) || medicalRecordDetails?.medications,
          notes: formData.notes || medicalRecordDetails?.notes,
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Thành công",
          description: "Cập nhật hồ sơ bệnh án thành công",
        });
        closeEditModal();
        // Refetch to update list
        if (selectedPatient) {
          await fetchPatientMedicalRecords(selectedPatient._id);
        }
      } else {
        toast({
          title: "Lỗi",
          description: result.message || "Không thể cập nhật hồ sơ",
          type: "error"
        });
      }
    } catch (error) {
      console.error('Error updating medical record:', error);
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi cập nhật hồ sơ",
        type: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
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
      console.log('Fetching payments for patient:', patientId);
      const res = await fetch(`/api/payments/patient/${patientId}`);
      const data = await res.json();
      
      console.log('Payments response:', data);
      
      // Handle different response formats
      let payments = [];
      if (data?.success && Array.isArray(data.data)) {
        payments = data.data;
      } else if (Array.isArray(data)) {
        payments = data;
      } else if (data?.data && Array.isArray(data.data)) {
        payments = data.data;
      }
      
      console.log('Setting payments:', payments.length);
      setPatientPayments(payments);
    } catch (err) {
      console.error('fetchPatientPayments failed:', err);
      setPatientPayments([]);
    }
  };

  const nextAppointment = (() => {
    if (!patientAppointments?.length) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const upcoming = patientAppointments
      .map((a) => ({ 
        ...a, 
        dt: new Date(a.appointmentDate),
        appointmentDateTime: new Date(`${a.appointmentDate}T${a.startTime}`)
      }))
      .filter((a) => {
        const appointmentDate = new Date(a.appointmentDate);
        appointmentDate.setHours(0, 0, 0, 0);
        
        // Include upcoming appointments that are not cancelled or completed
        return appointmentDate >= now && 
               a.status !== 'cancelled' && 
               a.status !== 'completed';
      })
      .sort((a, b) => a.appointmentDateTime.getTime() - b.appointmentDateTime.getTime());
    return upcoming[0] || null;
  })();

  const lastVisitDate = (() => {
    if (!patientMedicalRecords?.length) return null;
    const sorted = [...patientMedicalRecords].sort(
      (a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime()
    );
    return sorted[0]?.recordDate || null;
  })();

  // Payment statistics
  const paymentStats = (() => {
    // Log để debug
    console.log('=== Payment Stats Debug ===');
    console.log('Patient payments count:', patientPayments.length);
    console.log('Patient payments data:', JSON.stringify(patientPayments, null, 2));
    console.log('Patient appointments count:', patientAppointments.length);
    
    // Check status values
    const statusCounts = patientPayments.reduce((acc, p: Payment) => {
      const status = p.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('Payment status counts:', statusCounts);
    
    // Count completed payments từ payments table
    // Backend trả về status: 'completed', 'pending', 'failed', 'refunded'
    const completedPayments = patientPayments.filter((p: Payment) => {
      const status = p.status?.toLowerCase() || '';
      return status === 'completed';
    });
    
    const pendingPayments = patientPayments.filter((p: Payment) => {
      const status = p.status?.toLowerCase() || '';
      return status === 'pending';
    });
    
    console.log('Completed payments:', completedPayments.length);
    console.log('Pending payments:', pendingPayments.length);
    console.log('Sample completed payment:', completedPayments[0]);
    
    // Tính tổng tiền đã thanh toán
    const totalPaid = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPending = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    console.log('Total paid amount:', totalPaid);
    console.log('Total pending amount:', totalPending);
    
    // Count unpaid appointments
    const unpaidAppointments = patientAppointments.filter(a => {
      if (a.status === 'completed' && (a.paymentStatus === 'unpaid' || !a.paymentStatus)) {
        return true;
      }
      if ((a.status === 'pending' || a.status === 'confirmed' || a.status === 'in-progress') 
          && a.paymentStatus === 'unpaid') {
        return true;
      }
      return false;
    }).length;

    console.log('Unpaid appointments:', unpaidAppointments);
    
    const result = {
      unpaid: unpaidAppointments,
      paid: completedPayments.length,
      totalPaid: totalPaid,
      pendingAmount: totalPending,
      totalFromAllPayments: patientPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
      totalPayments: patientPayments.length,
    };
    
    console.log('Final stats:', result);
    
    return result;
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
      'pending': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Chờ xử lý' },
      'pending_payment': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Chờ thanh toán' },
      'confirmed': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Đã xác nhận' },
      'in-progress': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Đang khám' },
      'completed': { bg: 'bg-green-100', text: 'text-green-800', label: 'Hoàn thành' },
      'cancelled': { bg: 'bg-red-100', text: 'text-red-800', label: 'Đã hủy' }
    };
    const statusInfo = statusMap[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
    return (
      <span className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${statusInfo.bg} ${statusInfo.text}`}>
        {statusInfo.label}
      </span>
    );
  };

  const getPaymentStatusBadge = (paymentStatus?: string) => {
    if (!paymentStatus || paymentStatus === 'unpaid') {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Chưa thanh toán
        </span>
      );
    }
    if (paymentStatus === 'paid') {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Đã thanh toán
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        {paymentStatus}
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

                            <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                              <h3 className="text-base font-bold text-gray-900 mb-4 pb-3 border-b border-gray-200">Dữ liệu khám</h3>
                              
                              <div className="space-y-4">
                                {/* Lần khám gần nhất */}
                                <div className="pb-3 border-b border-gray-100">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 font-medium">Lần khám gần nhất</span>
                                    <span className="text-sm font-bold text-gray-900">
                                      {lastVisitDate ? formatDate(lastVisitDate) : 'Chưa có'}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Lịch hẹn sắp tới */}
                                {nextAppointment && (
                                  <div 
                                    className="pb-3 border-b border-gray-100 cursor-pointer group"
                                    onClick={() => {
                                      closeModal();
                                      router.push(`/doctor/schedule?appointmentId=${nextAppointment._id}`);
                                    }}
                                  >
                                    <div className="flex items-center justify-between mb-3">
                                      <span className="text-sm text-gray-600 font-medium">Lịch hẹn sắp tới</span>
                                      {getAppointmentStatusBadge(nextAppointment.status)}
                                    </div>
                                    
                                    <div className="group-hover:bg-blue-50 group-hover:border-blue-200 border border-transparent p-3 rounded-lg transition-all duration-200">
                                      <div className="flex items-start gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center flex-shrink-0 border border-gray-200 group-hover:border-blue-300 transition-all duration-200">
                                          <Calendar className="w-4 h-4 text-gray-700 group-hover:text-blue-600 transition-colors duration-200" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex flex-wrap items-center gap-2 mb-2.5">
                                            <span className="font-bold text-gray-900 text-base">
                                              {formatDate(nextAppointment.appointmentDate)}
                                            </span>
                                            <span className="text-gray-300 text-lg">•</span>
                                            <span className="font-semibold text-gray-700">
                                              {nextAppointment.startTime}
                                              {nextAppointment.endTime && ` - ${nextAppointment.endTime}`}
                                            </span>
                                            <Eye className="w-4 h-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-all duration-200 ml-auto" />
                                          </div>
                                          
                                          <div className="flex flex-wrap items-center gap-2">
                                            {nextAppointment.appointmentType && (
                                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 group-hover:bg-blue-100 text-gray-700 group-hover:text-blue-700 border border-gray-200 group-hover:border-blue-300 transition-all duration-200">
                                                {nextAppointment.appointmentType}
                                              </span>
                                            )}
                                            {nextAppointment.duration && (
                                              <span className="text-xs text-gray-600 group-hover:text-blue-600 transition-colors duration-200">
                                                ~{nextAppointment.duration} phút
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Thông tin thanh toán */}
                                <div className="space-y-2.5 pt-1">
                                  <div className="flex items-center justify-between py-1.5">
                                    <span className="text-sm text-gray-600 font-medium">Tổng thanh toán</span>
                                    <span className="text-sm font-bold text-gray-900">
                                      {paymentStats.totalPaid > 0 ? paymentStats.totalPaid.toLocaleString('vi-VN') + ' VNĐ' : '0 VNĐ'}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between py-1.5">
                                    <span className="text-sm text-gray-600 font-medium">Lượt thanh toán</span>
                                    <span className="text-sm font-bold text-gray-900">
                                      {paymentStats.paid} lượt
                                    </span>
                                  </div>
                                  {paymentStats.unpaid > 0 && (
                                    <div className="flex items-center justify-between py-1.5 border-t border-gray-100 pt-2.5">
                                      <span className="text-sm text-gray-600 font-medium">Chưa thanh toán</span>
                                      <span className="text-sm font-bold text-gray-900">
                                        {paymentStats.unpaid} lượt
                                      </span>
                                    </div>
                                  )}
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
                                  onClick={async () => {
                                    try {
                                      const payload = { 
                                        patientId: selectedPatient._id,
                                        patientName: selectedPatient.fullName 
                                      };
                                      localStorage.setItem("newConversation", JSON.stringify(payload));
                                      closeModal();
                                      router.push(`/doctor/chat?newConversation=true`);
                                      toast({
                                        title: "Đang mở cửa sổ chat",
                                        description: "Đang tạo/khôi phục cuộc hội thoại với bệnh nhân",
                                      });
                                    } catch (err) {
                                      console.error("Failed to start conversation", err);
                                      toast({
                                        title: "Lỗi",
                                        description: "Không thể mở chat. Vui lòng thử lại.",
                                        type: "error"
                                      });
                                    }
                                  }}
                                  className="w-full text-left px-3 py-2 text-orange-700 hover:bg-gray-50 rounded-md font-medium flex items-center gap-2 text-sm"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  Nhắn tin
                                </button>
                                <button 
                                  onClick={() => {
                                    closeModal();
                                    router.push(`/doctor/appointments?patientId=${selectedPatient._id}&patientName=${encodeURIComponent(selectedPatient.fullName)}&mode=create`);
                                  }}
                                  className="w-full text-left px-3 py-2 text-blue-700 hover:bg-gray-50 rounded-md font-medium flex items-center gap-2 text-sm"
                                >
                                  <Calendar className="w-4 h-4" />
                                  Tái khám
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
                            <button
                              onClick={() => {
                                closeModal();
                                router.push(`/doctor/schedule?patientId=${selectedPatient._id}`);
                              }}
                              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              Tạo lịch mới
                            </button>
                          </div>
                          <div className="space-y-3">
                            {patientAppointments.length > 0 ? (
                              patientAppointments.map((appointment) => (
                                <div 
                                  key={appointment._id} 
                                  className="bg-white rounded-md p-4 border border-gray-200 hover:shadow-md hover:border-blue-200 hover:bg-blue-50/50 transition-all cursor-pointer group"
                                  onClick={() => {
                                    closeModal();
                                    router.push(`/doctor/schedule?appointmentId=${appointment._id}`);
                                  }}
                                >
                                  <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                      <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-md bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center flex-shrink-0 transition-colors duration-200">
                                          <Calendar className="w-5 h-5 text-blue-600 group-hover:text-blue-700" />
                                        </div>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <p className="font-bold text-gray-900 text-base">
                                              {formatDate(appointment.appointmentDate)}
                                            </p>
                                            <span className="text-gray-400">•</span>
                                            <p className="text-gray-700 font-medium text-sm">
                                              {appointment.startTime}
                                              {appointment.endTime && ` - ${appointment.endTime}`}
                                            </p>
                                            <Eye className="w-4 h-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-all duration-200 ml-auto" />
                                          </div>
                                          
                                          {appointment.appointmentType && (
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className="text-xs font-medium text-blue-600 bg-blue-50 group-hover:bg-blue-100 px-2 py-0.5 rounded transition-colors duration-200">
                                                {appointment.appointmentType}
                                              </span>
                                              {appointment.duration && (
                                                <span className="text-xs text-gray-500 group-hover:text-blue-600 transition-colors duration-200">
                                                  ({appointment.duration} phút)
                                                </span>
                                              )}
                                            </div>
                                          )}

                                          {appointment.consultationFee && (
                                            <div className="flex items-center gap-1 text-sm text-gray-600 group-hover:text-blue-600 transition-colors duration-200">
                                              <TrendingUp className="w-3.5 h-3.5" />
                                              <span className="font-semibold">
                                                {appointment.consultationFee.toLocaleString('vi-VN')} VNĐ
                                              </span>
                                            </div>
                                          )}

                                          {appointment.notes && (
                                            <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                              <span className="font-medium">Ghi chú:</span> {appointment.notes}
                                            </div>
                                          )}

                                          {appointment.paymentStatus && (
                                            <div className="mt-2">
                                              {getPaymentStatusBadge(appointment.paymentStatus)}
                                            </div>
                                          )}
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
                              <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                  <Calendar className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-base font-semibold text-gray-900 mb-2">Chưa có lịch hẹn nào</h3>
                                <p className="text-gray-500 text-sm mb-4">Bệnh nhân này chưa có lịch hẹn nào trong hệ thống</p>
                                <button
                                  onClick={() => {
                                    closeModal();
                                    router.push(`/doctor/schedule?patientId=${selectedPatient._id}`);
                                  }}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                                >
                                  <Plus className="w-4 h-4" />
                                  Tạo lịch hẹn đầu tiên
                                </button>
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
                            <button
                              onClick={() => {
                                closeModal();
                                router.push(`/doctor/treatment?patientId=${selectedPatient._id}`);
                              }}
                              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              Tạo hồ sơ mới
                            </button>
                          </div>
                          <div className="space-y-4">
                            {patientMedicalRecords.length > 0 ? (
                              patientMedicalRecords.map((record) => (
                                <div 
                                  key={record._id} 
                                  className="bg-white rounded-md p-3 border border-gray-200 hover:border-blue-200 hover:bg-blue-50/50 transition-all cursor-pointer group"
                                  onClick={() => handleMedicalRecordClick(record)}
                                >
                                  <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-md bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors duration-200">
                                        <FileText className="w-4 h-4 text-gray-700 group-hover:text-blue-600" />
                                      </div>
                                      <div className="flex-1">
                                        <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                                          Khám ngày {formatDate(record.recordDate)}
                                          <Eye className="w-3.5 h-3.5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                        </h4>
                                        <p className="text-gray-600 text-xs">
                                          Bác sĩ: {record.doctorId?.fullName || 'N/A'} ({record.doctorId?.specialty || 'N/A'})
                                        </p>
                                      </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
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

           {/* Medical Record Detail Modal */}
           {isMedicalRecordModalOpen && selectedMedicalRecord && medicalRecordDetails && (
             <MedicalRecordDetailModal
               isOpen={isMedicalRecordModalOpen}
               onClose={closeMedicalRecordModal}
               record={{
                 _id: medicalRecordDetails._id,
                 recordDate: medicalRecordDetails.recordDate,
                 chiefComplaint: medicalRecordDetails.chiefComplaint,
                 diagnosis: medicalRecordDetails.diagnosis,
                 treatmentPlan: medicalRecordDetails.treatmentPlan,
                 status: medicalRecordDetails.status,
                 isFollowUpRequired: medicalRecordDetails.isFollowUpRequired || false,
                 followUpDate: medicalRecordDetails.followUpDate,
                 doctorId: medicalRecordDetails.doctorId ? {
                   _id: medicalRecordDetails.doctorId._id,
                   fullName: medicalRecordDetails.doctorId.fullName,
                   email: medicalRecordDetails.doctorId.email || '',
                   specialty: medicalRecordDetails.doctorId.specialty,
                 } : undefined,
                 patientId: medicalRecordDetails.patientId,
                 medications: (medicalRecordDetails.medications || []) as string[],
                 notes: medicalRecordDetails.notes || '',
                 procedures: medicalRecordDetails.procedures || [],
                 dentalChart: medicalRecordDetails.dentalChart || [],
                 attachments: medicalRecordDetails.attachments || [],
                 vitalSigns: medicalRecordDetails.vitalSigns || {},
               }}
               onEdit={handleEditMedicalRecord}
               isPatientView={false}
             />
           )}

           {/* Edit Medical Record Modal - Using TreatmentModal */}
           {isEditModalOpen && medicalRecordDetails && selectedPatient && (
             <TreatmentModal
               isOpen={isEditModalOpen}
               onClose={closeEditModal}
               appointment={{
                 id: medicalRecordDetails._id,
                 patientId: selectedPatient._id,
                 patientName: selectedPatient.fullName,
                 patientAvatar: selectedPatient.avatarUrl,
                 date: medicalRecordDetails.recordDate,
                 startTime: '',
                 phone: selectedPatient.phone,
                 email: selectedPatient.email,
               }}
               onSubmit={handleSubmitTreatment}
               isSubmitting={isSubmitting}
               mode="update"
               initialData={{
                 chiefComplaints: medicalRecordDetails.chiefComplaint?.split(/[,，]/).map(c => c.trim()).filter(Boolean) || [],
                 diagnosisGroups: medicalRecordDetails.diagnosis ? [{
                   diagnosis: medicalRecordDetails.diagnosis,
                   treatmentPlans: medicalRecordDetails.treatmentPlan?.split(/[;，]/).map(t => t.trim()).filter(Boolean) || ['']
                 }] : [{ diagnosis: '', treatmentPlans: [''] }],
                 medications: medicalRecordDetails.medications?.map((med) => {
                   const parts = med.includes(' - ') ? med.split(' - ') : [med, '', '', ''];
                   return {
                     name: parts[0] || '',
                     dosage: parts[1] || '',
                     frequency: parts[2] || '',
                     duration: parts[3] || '',
                     instructions: ''
                   };
                 }) || [],
                 notes: medicalRecordDetails.notes || '',
                 status: medicalRecordDetails.status || 'active',
               }}
             />
           )}
         </div>
       </div>
     </div>
     </>
   );
 }