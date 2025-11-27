"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { AlertCircle, Calendar, CheckCircle, Clock, FileText, Stethoscope, User } from "lucide-react";
import { useEffect, useState } from "react";

interface PatientStatistics {
  totalRecords: number;
  completedRecords: number;
  pendingRecords: number;
  followUpRecords: number;
  latestRecord: {
    _id: string;
    recordDate: string;
    chiefComplaint: string;
    diagnosis: string;
    doctorId: {
      fullName: string;
      specialty: string;
    };
  } | null;
}

interface PatientStatisticsProps {
  patientId: string;
}

export default function PatientStatistics({ patientId }: PatientStatisticsProps) {
  const [statistics, setStatistics] = useState<PatientStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, [patientId]);

  const fetchStatistics = async () => {
    try {
      const params = new URLSearchParams();
      params.append("patientId", patientId);

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/medical-records/statistics/patient?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">Không có dữ liệu thống kê</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tổng hồ sơ</p>
                <p className="text-2xl font-bold">{statistics.totalRecords}</p>
              </div>
              <FileText className="h-8 w-8" style={{ color: "var(--color-primary-600)" }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Đã hoàn thành</p>
                <p className="text-2xl font-bold" style={{ color: "var(--color-success)" }}>
                  {statistics.completedRecords}
                </p>
              </div>
              <CheckCircle className="h-8 w-8" style={{ color: "var(--color-success)" }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Đang chờ</p>
                <p className="text-2xl font-bold" style={{ color: "var(--color-warning)" }}>
                  {statistics.pendingRecords}
                </p>
              </div>
              <Clock className="h-8 w-8" style={{ color: "var(--color-warning)" }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cần tái khám</p>
                <p className="text-2xl font-bold" style={{ color: "var(--color-warning)" }}>
                  {statistics.followUpRecords}
                </p>
              </div>
              <AlertCircle className="h-8 w-8" style={{ color: "var(--color-warning)" }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Latest Record */}
      {statistics.latestRecord && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Hồ sơ gần nhất
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Bác sĩ:</span>
                  <span className="text-sm">{statistics.latestRecord.doctorId.fullName}</span>
                </div>
                <Badge variant="secondary">{statistics.latestRecord.doctorId.specialty}</Badge>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Ngày khám:</span>
                <span className="text-sm">
                  {format(new Date(statistics.latestRecord.recordDate), "dd/MM/yyyy", { locale: vi })}
                </span>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium">Lý do khám:</span>
                  <p className="text-sm text-gray-600 mt-1">{statistics.latestRecord.chiefComplaint}</p>
                </div>

                {statistics.latestRecord.diagnosis && (
                  <div>
                    <span className="text-sm font-medium">Chẩn đoán:</span>
                    <p className="text-sm text-gray-600 mt-1">{statistics.latestRecord.diagnosis}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Tóm tắt sức khỏe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Tổng số lần khám:</span>
                <span className="text-sm font-medium">{statistics.totalRecords}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Đã hoàn thành điều trị:</span>
                <span className="text-sm font-medium text-green-600">{statistics.completedRecords}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Đang điều trị:</span>
                <span className="text-sm font-medium text-yellow-600">{statistics.pendingRecords}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Cần tái khám:</span>
                <span className="text-sm font-medium text-orange-600">{statistics.followUpRecords}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Tỷ lệ hoàn thành:</span>
                <span className="text-sm font-medium text-blue-600">
                  {statistics.totalRecords > 0
                    ? ((statistics.completedRecords / statistics.totalRecords) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
