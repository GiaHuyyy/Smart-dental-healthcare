"use client";

import dynamic from "next/dynamic";
const DentalChart = dynamic(() => import("@/components/medical-records/DentalChart"), { ssr: false });
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Filter,
  Search,
  Stethoscope,
  TrendingUp,
} from "lucide-react";
import React, { useState } from "react";

interface MedicalRecord {
  _id: string;
  patientId?: {
    _id?: string;
    fullName?: string;
    email?: string;
    phone?: string;
  };
  doctorId?: {
    _id?: string;
    fullName?: string;
    email?: string;
    phone?: string;
  };
  recordDate: string;
  chiefComplaint: string;
  diagnosis: string;
  treatmentPlan: string;
  status: string;
  isFollowUpRequired: boolean;
  followUpDate?: string;
  procedures: Array<{
    name: string;
    description: string;
    date: string;
    cost: number;
    status: string;
  }>;
  dentalChart: Array<{
    toothNumber: number;
    condition: string;
    treatment: string;
    notes: string;
  }>;
}

export default function PatientRecordsPage() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();

  const fetchMedicalRecords = React.useCallback(async () => {
    try {
      const response = await fetch("/api/medical-records/patient", {
        headers: {
          Authorization: localStorage.getItem("token") ? `Bearer ${localStorage.getItem("token")}` : "",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRecords(data);
      } else {
        const errorData = await response.json();
        toast({
          title: "Lỗi",
          description: errorData.message || "Không thể tải danh sách hồ sơ bệnh án",
        });
      }
    } catch {
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi tải dữ liệu",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const filterRecords = React.useCallback(() => {
    let filtered = records;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (record) =>
          (record.patientId?.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.chiefComplaint.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.treatmentPlan?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((record) => record.status === statusFilter);
    }

    // Filter by tab
    switch (activeTab) {
      case "recent":
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        filtered = filtered.filter((record) => new Date(record.recordDate) >= oneWeekAgo);
        break;
      case "follow-up":
        filtered = filtered.filter((record) => record.isFollowUpRequired);
        break;
      case "active":
        filtered = filtered.filter((record) => record.status === "active");
        break;
    }

    setFilteredRecords(filtered);
  }, [records, searchTerm, statusFilter, activeTab]);

  React.useEffect(() => {
    fetchMedicalRecords();
  }, [fetchMedicalRecords]);

  React.useEffect(() => {
    filterRecords();
  }, [filterRecords]);

  // filterRecords is memoized above with React.useCallback

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: "Đang điều trị", bg: "var(--color-primary-50)", color: "var(--color-primary-contrast)" },
      completed: { label: "Hoàn thành", bg: "var(--color-success-light)", color: "var(--color-primary-contrast)" },
      pending: { label: "Chờ xử lý", bg: "var(--color-primary-50)", color: "var(--color-primary-contrast)" },
      cancelled: { label: "Đã hủy", bg: "var(--color-warning-light)", color: "var(--color-primary-contrast)" },
    } as const;
    const cfg = (statusConfig as any)[status] || statusConfig.active;
    return (
      <span className="px-2 py-1 rounded-full text-xs" style={{ background: cfg.bg, color: cfg.color, border: "1px solid var(--color-border)" }}>
        {cfg.label}
      </span>
    );
  };

  const getStatusCount = (status: string) => {
    return records.filter((record) => record.status === status).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "linear-gradient(135deg, var(--color-primary-50) 0%, #ffffff 50%, var(--color-primary-100) 100%)" }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4" style={{ borderColor: "var(--color-primary)" }}></div>
          <p className="text-gray-600">Đang tải hồ sơ bệnh án...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, var(--color-primary-50) 0%, #ffffff 50%, var(--color-primary-100) 100%)" }}>
      <div className="container mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="healthcare-card p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Hồ sơ bệnh án của tôi</h1>
              <p className="text-gray-600 mt-2">Xem và theo dõi lịch sử điều trị của bạn</p>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6" style={{ color: "var(--color-primary)" }} />
              <span className="font-medium" style={{ color: "var(--color-primary)" }}>
                Tổng cộng: {records.length} hồ sơ
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="kpi-card group hover:scale-[1.02] transition-transform duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tổng hồ sơ</p>
                  <p className="text-3xl font-bold text-gray-900">{records.length}</p>
                </div>
                <FileText className="h-8 w-8" style={{ color: "var(--color-primary)" }} />
              </div>
            </CardContent>
          </Card>

          <Card className="kpi-card group hover:scale-[1.02] transition-transform duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Đang điều trị</p>
                  <p className="text-3xl font-bold text-gray-900">{getStatusCount("active")}</p>
                </div>
                <Activity className="h-8 w-8" style={{ color: "var(--color-primary)" }} />
              </div>
            </CardContent>
          </Card>

          <Card className="kpi-card group hover:scale-[1.02] transition-transform duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Hoàn thành</p>
                  <p className="text-3xl font-bold text-gray-900">{getStatusCount("completed")}</p>
                </div>
                <CheckCircle className="h-8 w-8" style={{ color: "var(--color-primary)" }} />
              </div>
            </CardContent>
          </Card>

          <Card className="kpi-card group hover:scale-[1.02] transition-transform duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cần tái khám</p>
                  <p className="text-3xl font-bold text-gray-900">{records.filter((r) => r.isFollowUpRequired).length}</p>
                </div>
                <AlertCircle className="h-8 w-8" style={{ color: "var(--color-primary)" }} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dental Chart Section */}
        <div className="healthcare-card p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Stethoscope className="h-6 w-6" style={{ color: "var(--color-primary)" }} />
            Sơ đồ răng
          </h2>
          <DentalChart records={records} />
        </div>

        {/* Main Content */}
        <div className="healthcare-card overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-gray-100">
              <TabsList className="grid w-full grid-cols-4 bg-transparent border-0 p-0 h-auto">
                <TabsTrigger value="all" className="data-[state=active]:bg-primary-100 data-[state=active]:text-primary data-[state=active]:border-primary-outline rounded-none border-b-2 data-[state=active]:border-b-primary-600 h-12">
                  Tất cả ({records.length})
                </TabsTrigger>
                <TabsTrigger value="recent" className="data-[state=active]:bg-primary-100 data-[state=active]:text-primary data-[state=active]:border-primary-outline rounded-none border-b-2 data-[state=active]:border-b-primary-600 h-12">
                  Gần đây
                </TabsTrigger>
                <TabsTrigger value="follow-up" className="data-[state=active]:bg-primary-100 data-[state=active]:text-primary data-[state=active]:border-primary-outline rounded-none border-b-2 data-[state=active]:border-b-primary-600 h-12">
                  Cần tái khám ({records.filter((r) => r.isFollowUpRequired).length})
                </TabsTrigger>
                <TabsTrigger value="active" className="data-[state=active]:bg-primary-100 data-[state=active]:text-primary data-[state=active]:border-primary-outline rounded-none border-b-2 data-[state=active]:border-b-primary-600 h-12">
                  Đang điều trị ({getStatusCount("active")})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="p-6 space-y-6">
              {/* Search and Filter */}
              <div className="flex flex-col lg:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="Tìm kiếm theo triệu chứng, chẩn đoán, kế hoạch điều trị..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 text-lg border-gray-200 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] bg-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-gray-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-12 px-4 border border-gray-200 rounded-lg focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] bg-white"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="active">Đang điều trị</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="pending">Chờ xử lý</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </div>
              </div>

              {/* Records List */}
              <div className="space-y-4">
                {filteredRecords.length === 0 ? (
                  <Card className="border-2 border-dashed border-gray-200 bg-gray-50">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <FileText className="h-16 w-16 text-gray-400 mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Không có hồ sơ nào</h3>
                      <p className="text-gray-500 text-center max-w-md">
                        {activeTab === "all"
                          ? "Bạn chưa có hồ sơ bệnh án nào. Hãy liên hệ với bác sĩ để được khám và tạo hồ sơ."
                          : activeTab === "follow-up"
                          ? "Không có lịch tái khám nào trong thời gian này."
                          : "Không có hồ sơ nào phù hợp với bộ lọc hiện tại."}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredRecords.map((record) => (
                    <Card key={record._id} className="healthcare-card group hover:shadow-card-hover transition-all duration-200">
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                          <div className="flex-1 space-y-4">
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg" style={{ background: "var(--color-primary)" }}>
                                  <Stethoscope className="h-6 w-6" />
                                </div>
                                <div>
                                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-[var(--color-primary)] transition-colors">
                                    Khám ngày {format(new Date(record.recordDate), "dd/MM/yyyy", { locale: vi })}
                                  </h3>
                                  <p className="text-gray-500 text-sm">Bác sĩ: {record.doctorId?.fullName || "Chưa cập nhật"}</p>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {getStatusBadge(record.status)}
                                {record.isFollowUpRequired && (
                                  <span className="px-2 py-1 rounded-full text-xs" style={{ background: "var(--color-warning-light)", color: "var(--color-primary-contrast)", border: "1px solid var(--color-border)" }}>
                                    <AlertCircle className="h-3 w-3 mr-1 inline" />
                                    Cần tái khám
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              <div className="space-y-3">
                                <div className="flex items-center gap-3 text-gray-700">
                                  <Calendar className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
                                  <span className="font-medium">Ngày khám:</span>
                                  <span>{format(new Date(record.recordDate), "dd/MM/yyyy", { locale: vi })}</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-700">
                                  <Stethoscope className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
                                  <span className="font-medium">Triệu chứng:</span>
                                  <span className="text-gray-600">{record.chiefComplaint}</span>
                                </div>
                                {record.followUpDate && (
                                  <div className="flex items-center gap-3" style={{ color: "var(--color-primary)" }}>
                                    <Clock className="h-5 w-5" />
                                    <span className="font-medium">Tái khám:</span>
                                    <span>{format(new Date(record.followUpDate), "dd/MM/yyyy", { locale: vi })}</span>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-3">
                                {record.diagnosis && (
                                  <div className="text-gray-700">
                                    <span className="font-medium text-gray-900">Chẩn đoán:</span>
                                    <p className="text-gray-600 mt-1 leading-relaxed">{record.diagnosis}</p>
                                  </div>
                                )}
                                {record.treatmentPlan && (
                                  <div className="text-gray-700">
                                    <span className="font-medium text-gray-900">Kế hoạch điều trị:</span>
                                    <p className="text-gray-600 mt-1 leading-relaxed">{record.treatmentPlan}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
