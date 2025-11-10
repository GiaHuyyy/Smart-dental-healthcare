"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  FileText,
  Calendar,
  User,
  Stethoscope,
  Pill,
  ChevronRight,
  X,
  Search,
  Clock,
  AlertCircle,
  CheckCircle,
  Eye,
  FileSearch,
  Printer,
} from "lucide-react";
import { toast } from "sonner";

interface MedicalRecord {
  _id: string;
  patientId?: {
    _id?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    gender?: string;
  };
  doctorId?: {
    _id?: string;
    fullName?: string;
    email?: string;
    specialty?: string;
    phoneNumber?: string;
  };
  recordDate: string;
  chiefComplaint: string;
  chiefComplaints?: string[];
  diagnosis: string;
  treatmentPlan: string;
  status: string;
  isFollowUpRequired: boolean;
  followUpDate?: string;
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
  medications?: string[];
  detailedMedications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  diagnosisGroups?: Array<{
    diagnosis: string;
    treatmentPlans: string[];
  }>;
  notes?: string;
}

export default function PatientRecordsPage() {
  const { data: session } = useSession();

  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Fetch medical records
  const fetchRecords = useCallback(async () => {
    if (!session?.user) return;

    setLoading(true);
    try {
      const userId = (session.user as { _id?: string })._id;
      const accessToken = (session as any)?.access_token;
      const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await fetch(`${API_URL}/api/v1/medical-records/patient/${userId}`, {
        headers: {
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
      });

      if (response.ok) {
        const data = await response.json();
        const recordsList = data?.data || data || [];
        console.log("Fetched medical records:", recordsList);
        setRecords(Array.isArray(recordsList) ? recordsList : []);
        setFilteredRecords(Array.isArray(recordsList) ? recordsList : []);
      } else {
        toast.error("Không thể tải hồ sơ điều trị");
      }
    } catch (error) {
      console.error("Error fetching records:", error);
      toast.error("Có lỗi xảy ra khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleViewDetail = useCallback((record: MedicalRecord) => {
    setSelectedRecord(record);
    setDetailModalOpen(true);
  }, []);

  // Handle appointmentId from URL to auto-open medical record modal
  useEffect(() => {
    const handleAppointmentParam = async () => {
      if (typeof window === "undefined" || !session?.user) {
        console.log("⏭️ Skipping appointmentParam: window or session not ready");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const appointmentId = params.get("appointmentId");

      if (appointmentId && records.length > 0) {
        try {
          const accessToken = (session as any)?.access_token;
          const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

          console.log("📡 Fetching medical record for appointmentId:", appointmentId);

          // Fetch medical record by appointmentId
          const response = await fetch(`${API_URL}/api/v1/medical-records/appointment/${appointmentId}`, {
            headers: {
              ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
            },
          });

          console.log("📥 Response status:", response.status, response.statusText);

          if (response.ok) {
            const data = await response.json();
            console.log("📦 Response data:", data);

            // API returns an array, get the first element
            const medicalRecord = Array.isArray(data) ? data[0] : data?.data || data;
            console.log("🏥 Medical record:", medicalRecord);

            if (medicalRecord && medicalRecord._id) {
              // Find the record in our list or use the fetched one
              const recordToShow = records.find((r) => r._id === medicalRecord._id) || medicalRecord;
              console.log("✅ Opening modal with record:", recordToShow._id);
              handleViewDetail(recordToShow);

              // Clean up URL
              window.history.replaceState({}, "", "/patient/records");
            } else {
              console.error("❌ No medical record found in response");
              toast.error("Không tìm thấy hồ sơ điều trị cho lịch hẹn này");
            }
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error("❌ API error:", response.status, errorData);
            toast.error("Không thể tải hồ sơ điều trị");
          }
        } catch (error) {
          console.error("💥 Error fetching medical record by appointmentId:", error);
          toast.error("Có lỗi xảy ra khi tải hồ sơ");
        }
      } else if (appointmentId && records.length === 0) {
        console.log("⏳ appointmentId present but records not loaded yet, will retry...");
      }
    };

    handleAppointmentParam();
  }, [records, session, handleViewDetail]);

  // Filter records
  useEffect(() => {
    let filtered = [...records];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (record) =>
          record.chiefComplaint?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.doctorId?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "followUp") {
        // Lọc những hồ sơ cần tái khám
        filtered = filtered.filter((record) => record.isFollowUpRequired);
      } else if (statusFilter === "treated") {
        // Lọc những hồ sơ đã điều trị (không cần tái khám)
        filtered = filtered.filter((record) => !record.isFollowUpRequired);
      }
    }

    // Date filter - improved logic
    if (startDate && !endDate) {
      // Chỉ chọn 1 calendar -> lọc ngày đó
      filtered = filtered.filter((record) => {
        const recordDate = new Date(record.recordDate);
        const start = new Date(startDate);
        recordDate.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        return recordDate.getTime() === start.getTime();
      });
    } else if (!startDate && endDate) {
      // Chỉ chọn endDate -> lọc ngày đó
      filtered = filtered.filter((record) => {
        const recordDate = new Date(record.recordDate);
        const end = new Date(endDate);
        recordDate.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        return recordDate.getTime() === end.getTime();
      });
    } else if (startDate && endDate) {
      // Chọn cả 2 calendar -> lọc từ ngày đến ngày
      filtered = filtered.filter((record) => {
        const recordDate = new Date(record.recordDate);
        const start = new Date(startDate);
        const end = new Date(endDate);
        recordDate.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        return recordDate >= start && recordDate <= end;
      });
    }

    setFilteredRecords(filtered);
  }, [records, searchTerm, statusFilter, startDate, endDate]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            Đã điều trị
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3" />
            Chờ xử lý
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setStatusFilter("all");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải hồ sơ điều trị...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="space-y-4">
            {/* Title Row */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Hồ sơ điều trị</h1>
                <p className="text-sm text-gray-600">Quản lý và theo dõi lịch sử điều trị của bạn</p>
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              {/* Search */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
                />
              </div>

              <span className="text-sm font-medium text-gray-700">Từ</span>

              {/* Start Date */}
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Từ ngày"
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
              />

              <span className="text-sm font-medium text-gray-700">đến</span>

              {/* End Date */}
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="Đến ngày"
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
              />

              {/* Clear Filter Button */}
              <button
                onClick={clearFilters}
                disabled={!searchTerm && !startDate && !endDate && statusFilter === "all"}
                className="px-4 py-2.5 text-sm bg-white text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium border border-gray-300"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tổng hồ sơ */}
          <button
            onClick={() => setStatusFilter("all")}
            className={`bg-white rounded-xl border-2 border-transparent shadow-sm p-6 text-left transition-all hover:shadow-md ${
              statusFilter === "all" ? " border-2 border-primary" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Tổng hồ sơ</p>
                <p className="text-3xl font-bold text-gray-900">{records.length}</p>
              </div>
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="w-7 h-7 text-primary" />
              </div>
            </div>
          </button>

          {/* Đã điều trị */}
          <button
            onClick={() => setStatusFilter("treated")}
            className={`bg-white rounded-xl border-2 border-transparent shadow-sm p-6 text-left transition-all hover:shadow-md ${
              statusFilter === "treated" ? " border-2 border-primary" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Đã điều trị</p>
                <p className="text-3xl font-bold text-gray-900">
                  {records.filter((r) => !r.isFollowUpRequired).length}
                </p>
              </div>
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
            </div>
          </button>

          {/* Cần tái khám */}
          <button
            onClick={() => setStatusFilter("followUp")}
            className={`bg-white rounded-xl border-2 border-transparent shadow-sm p-6 text-left transition-all hover:shadow-md ${
              statusFilter === "followUp" ? " border-2 border-primary" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Cần tái khám</p>
                <p className="text-3xl font-bold text-gray-900">{records.filter((r) => r.isFollowUpRequired).length}</p>
              </div>
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-amber-600" />
              </div>
            </div>
          </button>
        </div>

        {/* Records List */}
        {filteredRecords.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <FileSearch className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Không tìm thấy hồ sơ</h3>
            <p className="text-gray-600">
              {searchTerm || startDate || endDate || statusFilter !== "all"
                ? "Thử điều chỉnh bộ lọc để xem thêm kết quả"
                : "Bạn chưa có hồ sơ điều trị nào"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredRecords.map((record) => (
              <div
                key={record._id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Doctor Avatar */}
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-8 h-8 text-primary" />
                      </div>

                      {/* Record Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {record.doctorId?.fullName || "Bác sĩ"}
                          </h3>
                          {getStatusBadge(record.status)}
                        </div>
                        {record.doctorId?.specialty && (
                          <p className="text-sm text-primary mb-2">{record.doctorId.specialty}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(record.recordDate).toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </span>
                          {record.isFollowUpRequired && (
                            <span className="flex items-center gap-1 text-amber-600">
                              <AlertCircle className="w-4 h-4" />
                              Cần tái khám
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Record Details Preview */}
                  <div className="space-y-3 mb-4">
                    {/* Lý do khám */}
                    {record.chiefComplaint && (
                      <div className="flex gap-2">
                        <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 mb-1">Lý do khám:</p>
                          <p className="text-sm text-gray-600">{record.chiefComplaint}</p>
                        </div>
                      </div>
                    )}

                    {/* Chuẩn đoán - ưu tiên diagnosisGroups */}
                    {record.diagnosisGroups && record.diagnosisGroups.length > 0 ? (
                      <div className="flex gap-2">
                        <Stethoscope className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 mb-1">Chuẩn đoán:</p>
                          <div className="space-y-1">
                            {record.diagnosisGroups.map((group, idx) => (
                              <p key={idx} className="text-sm text-gray-600">
                                • {group.diagnosis}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      record.diagnosis && (
                        <div className="flex gap-2">
                          <Stethoscope className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700 mb-1">Chuẩn đoán:</p>
                            <p className="text-sm text-gray-600">{record.diagnosis}</p>
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleViewDetail(record)}
                      className="w-full px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Xem chi tiết
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {detailModalOpen && selectedRecord && (
          <RecordDetailModal
            record={selectedRecord}
            onClose={() => {
              setDetailModalOpen(false);
              setSelectedRecord(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

// Detail Modal Component
function RecordDetailModal({ record, onClose }: { record: MedicalRecord; onClose: () => void }) {
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

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-medical-record,
          .print-medical-record * {
            visibility: visible;
          }
          .print-medical-record {
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

      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 z-50" onClick={onClose}>
        <div
          className="print-medical-record bg-white rounded-lg max-w-5xl w-full max-h-[95vh] overflow-hidden shadow-xl border border-gray-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-linear-to-r from-primary/5 to-primary/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Chi tiết hồ sơ điều trị</h2>
                  <p className="text-gray-600 text-sm">
                    Bệnh nhân: {record.patientId?.fullName || "N/A"} • Ngày khám:{" "}
                    {new Date(record.recordDate).toLocaleDateString("vi-VN")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="no-print inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  In
                </button>
                <button onClick={onClose} className="no-print p-2 hover:bg-gray-100 rounded-lg" aria-label="Đóng">
                  <X className="w-5 h-5 text-gray-700" />
                </button>
              </div>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6 max-h-[calc(95vh-120px)] overflow-y-auto">
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Thông tin bệnh nhân
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Họ tên:</span>{" "}
                      <span className="text-gray-900">{record.patientId?.fullName || "N/A"}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Tuổi:</span>{" "}
                      <span className="text-gray-900">
                        {record.patientId?.dateOfBirth ? calculateAge(record.patientId.dateOfBirth) : "N/A"} tuổi
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Giới tính:</span>{" "}
                      <span className="text-gray-900">
                        {record.patientId?.gender === "male"
                          ? "Nam"
                          : record.patientId?.gender === "female"
                          ? "Nữ"
                          : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">SĐT:</span>{" "}
                      <span className="text-gray-900">{record.patientId?.phone || "N/A"}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Email:</span>{" "}
                      <span className="text-gray-900">{record.patientId?.email || "N/A"}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Thông tin bác sĩ
                  </h3>
                  <div className="space-y-2 text-sm">
                    {record.doctorId && (
                      <>
                        <div>
                          <span className="font-medium text-gray-700">Bác sĩ:</span>{" "}
                          <span className="text-gray-900">{record.doctorId.fullName}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Chuyên khoa:</span>{" "}
                          <span className="text-gray-900">{record.doctorId.specialty}</span>
                        </div>
                      </>
                    )}
                    <div>
                      <span className="font-medium text-gray-700">Ngày khám:</span>{" "}
                      <span className="text-gray-900">{new Date(record.recordDate).toLocaleDateString("vi-VN")}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Diagnosis Info */}
              {record.chiefComplaint && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Triệu chứng
                  </h3>
                  <p className="text-gray-800">{record.chiefComplaint}</p>
                </div>
              )}

              {/* Diagnosis Groups */}
              {record.diagnosisGroups && record.diagnosisGroups.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4" />
                    Chuẩn đoán
                  </h3>
                  <div className="space-y-3">
                    {record.diagnosisGroups.map((group, index) => (
                      <div key={index} className="bg-white rounded-md p-3 border border-blue-100">
                        <div className="flex items-start gap-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold shrink-0">
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <p className="text-gray-900 font-medium">{group.diagnosis}</p>
                            {group.treatmentPlans && group.treatmentPlans.length > 0 && (
                              <div className="mt-2 text-sm text-gray-600">
                                <span className="font-medium">Phương pháp điều trị:</span>
                                <ul className="mt-1 ml-4 list-disc">
                                  {group.treatmentPlans.map((plan, planIndex) => (
                                    <li key={planIndex}>{plan}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Medications - Enhanced Design */}
              {((record.detailedMedications && record.detailedMedications.length > 0) ||
                (record.medications && record.medications.length > 0)) && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Pill className="w-5 h-5 text-primary" />
                      Danh sách thuốc
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {/* Priority: Use detailedMedications if available, fallback to medications */}
                    {record.detailedMedications && record.detailedMedications.length > 0 ? (
                      // Render detailedMedications (NEW format with full info)
                      record.detailedMedications.map((med, index) => (
                        <div key={index} className="px-4 py-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start gap-4">
                            {/* Number Badge */}
                            <div className="shrink-0 w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-semibold text-primary">#{index + 1}</span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 text-base mb-3">{med.name}</h4>

                              {/* Details Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                <div>
                                  <span className="text-gray-500 block mb-0.5">Liều lượng:</span>
                                  <span className="text-gray-900 font-medium">{med.dosage}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 block mb-0.5">Tần suất:</span>
                                  <span className="text-gray-900 font-medium">{med.frequency}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 block mb-0.5">Thời gian:</span>
                                  <span className="text-gray-900 font-medium">{med.duration}</span>
                                </div>
                              </div>

                              {/* Instructions */}
                              {med.instructions && (
                                <div className="mt-3 p-2 bg-blue-50 rounded text-sm border border-blue-100">
                                  <span className="text-blue-700 font-medium">💊 Hướng dẫn:</span>{" "}
                                  <span className="text-gray-900">{med.instructions}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      // Fallback: Simple medications list (OLD format)
                      <div className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {record.medications?.map((med, index) => (
                            <span
                              key={index}
                              className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium"
                            >
                              {med}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dental Chart */}
              {record.dentalChart && record.dentalChart.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Sơ đồ răng</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {record.dentalChart.map((tooth, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">Răng {tooth.toothNumber}</span>
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                            {tooth.condition}
                          </span>
                        </div>
                        {tooth.treatment && (
                          <p className="text-sm text-gray-600 mb-1">
                            <span className="font-medium">Điều trị:</span> {tooth.treatment}
                          </p>
                        )}
                        {tooth.notes && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Ghi chú:</span> {tooth.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Procedures */}
              {record.procedures && record.procedures.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Thủ thuật đã thực hiện</h3>
                  <div className="space-y-3">
                    {record.procedures.map((procedure, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{procedure.name}</h4>
                          <span className="text-primary font-semibold">
                            {procedure.cost.toLocaleString("vi-VN")} VNĐ
                          </span>
                        </div>
                        {procedure.description && <p className="text-sm text-gray-600 mb-2">{procedure.description}</p>}
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>Ngày: {new Date(procedure.date).toLocaleDateString("vi-VN")}</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            {procedure.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Info */}
              {(record.notes || record.followUpDate) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {record.notes && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h3 className="font-semibold text-yellow-900 mb-2">Ghi chú</h3>
                      <p className="text-gray-800 text-sm">{record.notes}</p>
                    </div>
                  )}

                  {record.isFollowUpRequired && record.followUpDate && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Lịch tái khám
                      </h3>
                      <p className="text-gray-800 text-sm font-medium">
                        {new Date(record.followUpDate).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
                <p className="text-sm text-gray-600">Hồ sơ này được tạo bởi hệ thống quản lý nha khoa thông minh</p>
                <p className="text-xs text-gray-500 mt-1">Xem lúc: {new Date().toLocaleString("vi-VN")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
