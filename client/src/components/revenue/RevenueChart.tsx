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
      <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2 text-slate-700">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-500 p-2 rounded-lg shadow-md">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            Biểu đồ doanh thu
          </CardTitle>
          <CardDescription className="text-slate-600">Theo dõi xu hướng doanh thu theo tháng</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <BarChart3 className="w-16 h-16 mb-3 opacity-20" />
            <p className="font-medium">Chưa có dữ liệu</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate max value for scaling
  const maxValue = Math.max(...data.map((item) => item.revenue || 0));
  const chartMax = maxValue;

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg hover:shadow-xl transition-all">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="flex items-center gap-2 text-slate-700">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-500 p-2 rounded-lg shadow-md">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          Biểu đồ doanh thu
        </CardTitle>
        <CardDescription className="text-slate-600">Theo dõi xu hướng doanh thu theo tháng</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6 pt-6">
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 text-sm bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-md shadow-sm"></div>
              <span className="font-semibold text-slate-700">Doanh thu thực nhận</span>
            </div>
          </div>

          {/* Chart */}
          <div className="space-y-5">
            {data.map((item, index) => {
              const revenueHeight = ((item.revenue || 0) / chartMax) * 100;

              return (
                <div key={index} className="space-y-2.5 group">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                      Tháng {item.month}/{item.year}
                    </span>
                    <span className="text-slate-500 text-xs bg-blue-50 px-3 py-1 rounded-full border border-blue-200 font-medium">
                      {item.count} giao dịch
                    </span>
                  </div>
                  <div className="flex gap-3 items-end h-20 bg-slate-50 rounded-lg p-3 border border-slate-200">
                    {/* Revenue bar */}
                    <div className="flex-1 relative">
                      <div
                        className="bg-gradient-to-t from-blue-600 via-blue-500 to-indigo-400 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/50 relative overflow-hidden group/bar"
                        style={{ height: `${revenueHeight}%`, minHeight: "8px" }}
                      >
                        {/* Shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover/bar:animate-shimmer"></div>
                        
                        {/* Tooltip */}
                        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-all duration-200 z-10">
                          <div className="bg-slate-900 text-white text-xs px-4 py-2 rounded-lg whitespace-nowrap shadow-xl font-bold">
                            {formatCurrency(item.revenue || 0)}
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-900"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Amount label */}
                  <div className="text-right text-xs text-slate-600 font-medium">
                    {formatCurrency(item.revenue || 0)}
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
