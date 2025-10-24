"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RevenueRecord } from "@/services/revenueService";
import { Calendar, CreditCard, DollarSign, PieChart, Receipt } from "lucide-react";

interface RevenueByTypeChartProps {
  revenues: RevenueRecord[];
}

export default function RevenueByTypeChart({ revenues }: RevenueByTypeChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  };

  // Calculate revenue by type
  const revenueByType = revenues.reduce((acc, revenue) => {
    const type = revenue.type || "other";
    if (!acc[type]) {
      acc[type] = {
        amount: 0,
        netAmount: 0,
        count: 0,
      };
    }
    acc[type].amount += revenue.amount;
    acc[type].netAmount += revenue.netAmount;
    acc[type].count += 1;
    return acc;
  }, {} as Record<string, { amount: number; netAmount: number; count: number }>);

  const total = Object.values(revenueByType).reduce((sum, item) => sum + item.netAmount, 0);

  const typeConfig = {
    appointment: { label: "Lịch khám", icon: Calendar, color: "bg-blue-500" },
    treatment: { label: "Điều trị", icon: Receipt, color: "bg-purple-500" },
    medicine: { label: "Thuốc", icon: CreditCard, color: "bg-green-500" },
    other: { label: "Khác", icon: DollarSign, color: "bg-orange-500" },
  };

  if (revenues.length === 0) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2 text-slate-700">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-lg shadow-md">
              <PieChart className="w-4 h-4 text-white" />
            </div>
            Doanh thu theo loại
          </CardTitle>
          <CardDescription className="text-slate-600">Phân bổ doanh thu theo từng loại dịch vụ</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <PieChart className="w-16 h-16 mb-3 opacity-20" />
            <p className="font-medium">Chưa có dữ liệu</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg hover:shadow-xl transition-all">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="flex items-center gap-2 text-slate-700">
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-lg shadow-md">
            <PieChart className="w-4 h-4 text-white" />
          </div>
          Doanh thu theo loại
        </CardTitle>
        <CardDescription className="text-slate-600">Phân bổ doanh thu theo từng loại dịch vụ</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6 pt-6">
          {Object.entries(revenueByType)
            .sort(([, a], [, b]) => b.netAmount - a.netAmount)
            .map(([type, data]) => {
              const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.other;
              const Icon = config.icon;
              const percentage = total > 0 ? (data.netAmount / total) * 100 : 0;

              return (
                <div key={type} className="group">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-blue-300 transition-all hover:shadow-md">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${config.color} shadow-md flex items-center justify-center`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block">{config.label}</span>
                          <span className="text-xs text-slate-500">{data.count} giao dịch</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
                          {formatCurrency(data.netAmount)}
                        </div>
                        <div className="text-xs font-semibold text-blue-600 mt-0.5">
                          {percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress bar with animation */}
                    <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                      <div
                        className={`h-full ${config.color} transition-all duration-1000 ease-out relative overflow-hidden`}
                        style={{ width: `${percentage}%` }}
                      >
                        {/* Shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:animate-shimmer"></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}
