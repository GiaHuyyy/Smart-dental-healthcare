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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Doanh thu theo loại
          </CardTitle>
          <CardDescription>Phân bổ doanh thu theo từng loại dịch vụ</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Chưa có dữ liệu
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="w-5 h-5" />
          Doanh thu theo loại
        </CardTitle>
        <CardDescription>Phân bổ doanh thu theo từng loại dịch vụ</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(revenueByType)
            .sort(([, a], [, b]) => b.netAmount - a.netAmount)
            .map(([type, data]) => {
              const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.other;
              const Icon = config.icon;
              const percentage = total > 0 ? (data.netAmount / total) * 100 : 0;

              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${config.color}`}></div>
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{config.label}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(data.netAmount)}</div>
                      <div className="text-xs text-muted-foreground">{data.count} giao dịch</div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${config.color} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    {percentage.toFixed(1)}% tổng doanh thu
                  </div>
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}
