"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { AlertCircle, Calendar, CheckCircle, Clock, FileText, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface Statistics {
  totalRecords: number;
  completedRecords: number;
  pendingRecords: number;
  followUpRecords: number;
  completionRate: number;
}

interface DoctorStatisticsProps {
  doctorId: string;
}

export default function DoctorStatistics({ doctorId }: DoctorStatisticsProps) {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const fetchStatistics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("doctorId", doctorId);
      if (startDate) params.append("startDate", startDate.toISOString());
      if (endDate) params.append("endDate", endDate.toISOString());

      const response = await fetch(`/api/medical-records/statistics/doctor?${params}`, {
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
  }, [doctorId, endDate, startDate]);

  useEffect(() => {
    void fetchStatistics();
  }, [fetchStatistics]);

  const chartData = statistics
    ? [
        { name: "Hoàn thành", value: statistics.completedRecords, color: "#00C49F" },
        { name: "Đang chờ", value: statistics.pendingRecords, color: "#FFBB28" },
        { name: "Tái khám", value: statistics.followUpRecords, color: "#FF8042" },
      ]
    : [];

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
      {/* Date Range Picker */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Chọn khoảng thời gian
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Từ ngày</label>
              <DatePicker
                value={startDate ? startDate.toISOString().slice(0, 10) : ""}
                onChange={(dateStr) => setStartDate(dateStr ? new Date(dateStr) : null)}
                placeholder="Chọn ngày bắt đầu"
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Đến ngày</label>
              <DatePicker
                value={endDate ? endDate.toISOString().slice(0, 10) : ""}
                onChange={(dateStr) => setEndDate(dateStr ? new Date(dateStr) : null)}
                placeholder="Chọn ngày kết thúc"
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
        </CardContent>
      </Card>

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
                <p className="text-sm font-medium text-gray-600">Tỷ lệ hoàn thành</p>
                <p className="text-2xl font-bold" style={{ color: "var(--color-primary-600)" }}>
                  {statistics.completionRate.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8" style={{ color: "var(--color-primary-600)" }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Phân bố trạng thái hồ sơ</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => {
                    const pct = (percent ?? 0) * 100;
                    return `${name} ${pct.toFixed(0)}%`;
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hồ sơ cần tái khám</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
                <p className="text-3xl font-bold text-orange-600">{statistics.followUpRecords}</p>
                <p className="text-gray-600">Hồ sơ cần tái khám</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
