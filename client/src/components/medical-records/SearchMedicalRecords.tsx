"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar, Eye, FileText, Filter, Search, User, X } from "lucide-react";
import { useEffect, useState } from "react";

interface MedicalRecord {
  _id: string;
  patientId?: {
    fullName?: string;
    email?: string;
    phone?: string;
  };
  doctorId?: {
    fullName?: string;
    email?: string;
    specialty?: string;
  };
  recordDate: string;
  chiefComplaint: string;
  diagnosis: string;
  status: string;
}

interface SearchMedicalRecordsProps {
  onRecordSelect: (record: MedicalRecord) => void;
  userRole: "doctor" | "patient";
}

export default function SearchMedicalRecords({ onRecordSelect, userRole }: SearchMedicalRecordsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (startDate) params.append("startDate", startDate.toISOString());
      if (endDate) params.append("endDate", endDate.toISOString());

      const response = await fetch(`${API_URL}/api/v1/medical-records/search?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRecords(data);
      }
    } catch (error) {
      console.error("Error searching records:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setStartDate(null);
    setEndDate(null);
    setRecords([]);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Hoàn thành
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Đang chờ
          </Badge>
        );
      case "cancelled":
        return <Badge variant="destructive">Đã hủy</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  useEffect(() => {
    if (searchTerm || statusFilter !== "all" || startDate || endDate) {
      handleSearch();
    }
  }, [searchTerm, statusFilter, startDate, endDate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Tìm kiếm hồ sơ bệnh án
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Tìm kiếm theo lý do khám, chẩn đoán, ghi chú..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Bộ lọc
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Trạng thái</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="completed">Hoàn thành</SelectItem>
                    <SelectItem value="pending">Đang chờ</SelectItem>
                    <SelectItem value="cancelled">Đã hủy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Từ ngày</label>
                <DatePicker
                  value={startDate ? startDate.toISOString().substring(0, 10) : ""}
                  onChange={(dateString) => setStartDate(dateString ? new Date(dateString) : null)}
                  placeholder="Chọn ngày bắt đầu"
                  className="w-full p-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Đến ngày</label>
                <DatePicker
                  value={endDate ? endDate.toISOString().substring(0, 10) : ""}
                  onChange={(dateString) => setEndDate(dateString ? new Date(dateString) : null)}
                  placeholder="Chọn ngày kết thúc"
                  className="w-full p-2 border rounded-md"
                />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2">
                <X className="h-4 w-4" />
                Xóa bộ lọc
              </Button>
              <span className="text-sm text-gray-500">{records.length} kết quả tìm thấy</span>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : records.length > 0 ? (
            records.map((record) => (
              <Card key={record._id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">
                          {userRole === "doctor"
                            ? record.patientId?.fullName || "Chưa cập nhật"
                            : record.doctorId?.fullName || "Chưa cập nhật"}
                        </span>
                        {getStatusBadge(record.status)}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(record.recordDate), "dd/MM/yyyy", { locale: vi })}
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="font-medium">Lý do khám:</span> {record.chiefComplaint}
                        </p>
                        {record.diagnosis && (
                          <p className="text-sm">
                            <span className="font-medium">Chẩn đoán:</span> {record.diagnosis}
                          </p>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRecordSelect(record)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Xem chi tiết
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Không tìm thấy hồ sơ bệnh án nào</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
