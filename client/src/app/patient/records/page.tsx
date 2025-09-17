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
      active: { label: "Đang điều trị", variant: "default" as const, icon: Activity },
      completed: { label: "Hoàn thành", variant: "secondary" as const, icon: CheckCircle },
      pending: { label: "Chờ xử lý", variant: "outline" as const, icon: Clock },
      cancelled: { label: "Đã hủy", variant: "destructive" as const, icon: AlertCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getStatusCount = (status: string) => {
    return records.filter((record) => record.status === status).length;
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{
          background: "linear-gradient(135deg, #dcfce7 0%, #ffffff 50%, #bbf7d0 100%)",
          backgroundAttachment: "fixed",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          minHeight: "100vh",
        }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải hồ sơ bệnh án...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(135deg, #dcfce7 0%, #ffffff 50%, #bbf7d0 100%)",
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        minHeight: "100vh",
      }}
    >
      <div className="container mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h1 className="text-4xl font-bold" style={{ color: "var(--color-primary)" }}>
                Hồ sơ bệnh án của tôi
              </h1>
              <p className="text-gray-600 mt-2 text-lg">Xem và theo dõi lịch sử điều trị của bạn</p>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6" style={{ color: "var(--color-primary)" }} />
              <span style={{ color: "var(--color-primary)" }} className="font-medium">
                Tổng cộng: {records.length} hồ sơ
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-primary to-primary-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-primary-100 text-sm font-medium">Tổng hồ sơ</p>
                  <p className="text-3xl font-bold">{records.length}</p>
                </div>
                <FileText className="h-8 w-8" style={{ color: "var(--color-primary-200, #bfe9ff)" }} />
              </div>
            </CardContent>
          </Card>

          <Card
            className="text-white border-0 shadow-lg"
            style={{ background: "linear-gradient(to right, var(--color-primary), var(--color-primary-600))" }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Đang điều trị</p>
                  <p className="text-3xl font-bold">{getStatusCount("active")}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Hoàn thành</p>
                  <p className="text-3xl font-bold">{getStatusCount("completed")}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Cần tái khám</p>
                  <p className="text-3xl font-bold">{records.filter((r) => r.isFollowUpRequired).length}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dental Chart Section */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Stethoscope className="h-6 w-6" style={{ color: "var(--color-primary)" }} />
            Sơ đồ răng
          </h2>
          <DentalChart records={records} />
        </div>

        {/* Main Content */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-gray-100">
              <TabsList className="grid w-full grid-cols-4 bg-transparent border-0 p-0 h-auto">
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:bg-primary-100 data-[state=active]:text-primary data-[state=active]:border-primary-outline rounded-none border-b-2 data-[state=active]:border-b-primary-600 h-12"
                >
                  Tất cả ({records.length})
                </TabsTrigger>
                <TabsTrigger
                  value="recent"
                  className="data-[state=active]:bg-primary-100 data-[state=active]:text-primary data-[state=active]:border-primary-outline rounded-none border-b-2 data-[state=active]:border-b-primary-600 h-12"
                >
                  Gần đây
                </TabsTrigger>
                <TabsTrigger
                  value="follow-up"
                  className="data-[state=active]:bg-primary-100 data-[state=active]:text-primary data-[state=active]:border-primary-outline rounded-none border-b-2 data-[state=active]:border-b-primary-600 h-12"
                >
                  Cần tái khám ({records.filter((r) => r.isFollowUpRequired).length})
                </TabsTrigger>
                <TabsTrigger
                  value="active"
                  className="data-[state=active]:bg-primary-100 data-[state=active]:text-primary data-[state=active]:border-primary-outline rounded-none border-b-2 data-[state=active]:border-b-primary-600 h-12"
                >
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
                    className="pl-12 h-12 text-lg border-gray-200 focus:border-green-500 focus:ring-green-500 bg-white/80 backdrop-blur-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-gray-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-12 px-4 border border-gray-200 rounded-lg focus:border-green-500 focus:ring-green-500 bg-white/80 backdrop-blur-sm"
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
                  <Card className="border-2 border-dashed border-gray-200 bg-gray-50/80 backdrop-blur-sm">
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
                    <Card
                      key={record._id}
                      className="hover:shadow-lg transition-all duration-300 border-gray-100 hover:border-green-200 group bg-white/80 backdrop-blur-sm"
                    >
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                          <div className="flex-1 space-y-4">
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                                  <Stethoscope className="h-6 w-6" />
                                </div>
                                <div>
                                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                                    Khám ngày {format(new Date(record.recordDate), "dd/MM/yyyy", { locale: vi })}
                                  </h3>
                                  <p className="text-gray-500 text-sm">
                                    Bác sĩ: {record.doctorId?.fullName || "Chưa cập nhật"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {getStatusBadge(record.status)}
                                {record.isFollowUpRequired && (
                                  <Badge variant="outline" className="text-orange-600 border-orange-600 bg-orange-50">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Cần tái khám
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              <div className="space-y-3">
                                <div className="flex items-center gap-3 text-gray-700">
                                  <Calendar className="h-5 w-5 text-green-500" />
                                  <span className="font-medium">Ngày khám:</span>
                                  <span>{format(new Date(record.recordDate), "dd/MM/yyyy", { locale: vi })}</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-700">
                                  <Stethoscope className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
                                  <span className="font-medium">Triệu chứng:</span>
                                  <span className="text-gray-600">{record.chiefComplaint}</span>
                                </div>
                                {record.followUpDate && (
                                  <div className="flex items-center gap-3 text-orange-600">
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
