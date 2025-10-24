"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthlyTrend } from "@/services/revenueService";
import { BarChart3 } from "lucide-react";

interface RevenueChartProps {
  data: MonthlyTrend[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  };

  const getMonthName = (month: number) => {
    return `Tháng ${month}`;
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Biểu đồ doanh thu
          </CardTitle>
          <CardDescription>Theo dõi xu hướng doanh thu theo tháng</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Chưa có dữ liệu
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate max value for scaling
  const maxValue = Math.max(...data.map((item) => item.revenue || 0));
  const chartMax = maxValue;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Biểu đồ doanh thu
        </CardTitle>
        <CardDescription>Theo dõi xu hướng doanh thu theo tháng</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>Doanh thu thực nhận</span>
            </div>
          </div>

          {/* Chart */}
          <div className="space-y-4">
            {data.map((item, index) => {
              const revenueHeight = ((item.revenue || 0) / chartMax) * 100;

              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {getMonthName(item.month)}/{item.year}
                    </span>
                    <span className="text-muted-foreground">{item.count} giao dịch</span>
                  </div>
                  <div className="flex gap-2 items-end h-16">
                    {/* Revenue bar */}
                    <div className="flex-1 relative group">
                      <div
                        className="bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                        style={{ height: `${revenueHeight}%`, minHeight: "4px" }}
                      >
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          {formatCurrency(item.revenue || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
