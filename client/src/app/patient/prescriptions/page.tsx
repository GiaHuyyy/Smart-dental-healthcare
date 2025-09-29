"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { sendRequest } from "@/utils/api";
import { Search, Pill, Calendar, User, FileText, CheckCircle, AlertCircle, Clock } from "lucide-react";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface Prescription {
  _id: string;
  doctor: {
    fullName: string;
    specialization: string;
  };
  patient: {
    fullName: string;
  };
  medications: Medication[];
  diagnosis: string;
  notes: string;
  issuedDate: string;
  status: "active" | "completed" | "cancelled";
  medicalRecordId: string;
}

export default function PatientPrescriptions() {
  const { data: session } = useSession();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (session) {
      fetchPrescriptions();
    }
  }, [session]);

  const fetchPrescriptions = async () => {
    try {
      const response = await sendRequest<any>({
        url: "/api/prescriptions/patient",
        method: "GET",
        headers: {
          Authorization: `Bearer ${(session as any)?.access_token}`,
        },
      });

      if (response && response.data) {
        setPrescriptions(response.data);
      }
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Clock className="w-4 h-4 text-blue-500" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "cancelled":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Đang sử dụng";
      case "completed":
        return "Đã hoàn thành";
      case "cancelled":
        return "Đã hủy";
      default:
        return "Không xác định";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      case "completed":
        return "bg-green-50 text-green-700 border border-green-200";
      case "cancelled":
        return "bg-red-50 text-red-700 border border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border border-gray-200";
    }
  };

  const filteredPrescriptions = prescriptions.filter((prescription) => {
    const matchesSearch =
      prescription.doctor.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prescription.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prescription.medications.some((med) => med.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "all" || prescription.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/30 to-indigo-50/20 flex items-center justify-center">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: "var(--color-primary)" }}
        ></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 to-indigo-50/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="healthcare-card-elevated p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                style={{
                  backgroundImage: `linear-gradient(to bottom right, var(--color-primary), var(--color-primary-600))`,
                }}
              >
                <Pill className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="healthcare-heading text-2xl">Đơn thuốc của tôi</h1>
                <p className="healthcare-body mt-1">Quản lý và theo dõi đơn thuốc được kê bởi bác sĩ</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="healthcare-body text-sm">
                Tổng: <span className="font-semibold">{prescriptions.length}</span> đơn thuốc
              </span>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="healthcare-card p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Tìm kiếm theo bác sĩ, chẩn đoán hoặc tên thuốc..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang sử dụng</option>
              <option value="completed">Đã hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
        </div>

        {/* Prescriptions List */}
        <div className="space-y-4">
          {filteredPrescriptions.length === 0 ? (
            <div className="healthcare-card p-12 text-center">
              <Pill className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="healthcare-heading text-xl mb-2">Chưa có đơn thuốc nào</h3>
              <p className="healthcare-body">
                {searchTerm || statusFilter !== "all"
                  ? "Không tìm thấy đơn thuốc phù hợp với tiêu chí tìm kiếm"
                  : "Bạn chưa có đơn thuốc nào được kê bởi bác sĩ"}
              </p>
            </div>
          ) : (
            filteredPrescriptions.map((prescription) => (
              <div key={prescription._id} className="healthcare-card p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                  {/* Prescription Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="healthcare-heading text-xl">{prescription.diagnosis}</h3>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getStatusBadgeClass(
                              prescription.status
                            )}`}
                          >
                            {getStatusIcon(prescription.status)}
                            {getStatusText(prescription.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>BS. {prescription.doctor.fullName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(prescription.issuedDate)}</span>
                          </div>
                        </div>
                        <p className="healthcare-body text-sm">Chuyên khoa: {prescription.doctor.specialization}</p>
                      </div>
                    </div>

                    {/* Medications */}
                    <div className="space-y-4">
                      <h4 className="healthcare-heading text-lg">Thuốc được kê:</h4>
                      <div className="grid gap-3">
                        {prescription.medications.map((medication, index) => (
                          <div key={index} className="bg-blue-50/50 rounded-lg p-4 border border-blue-100">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-semibold text-gray-900 mb-1">{medication.name}</h5>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                                  <div>
                                    <span className="font-medium">Liều dùng:</span> {medication.dosage}
                                  </div>
                                  <div>
                                    <span className="font-medium">Tần suất:</span> {medication.frequency}
                                  </div>
                                  <div>
                                    <span className="font-medium">Thời gian:</span> {medication.duration}
                                  </div>
                                </div>
                                {medication.instructions && (
                                  <p className="text-sm text-gray-700 mt-2">
                                    <span className="font-medium">Hướng dẫn:</span> {medication.instructions}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    {prescription.notes && (
                      <div className="mt-4 p-4 bg-amber-50/50 rounded-lg border border-amber-100">
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-amber-800 text-sm mb-1">Ghi chú từ bác sĩ:</p>
                            <p className="text-sm text-amber-700">{prescription.notes}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
