"use client";

import Header from "@/components/Header";
import ShellLayout from "@/components/ShellLayout";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart2, Calendar, Users, MessageSquare, FileText, Pill, TrendingUp, Settings, Smile } from "lucide-react";

const navigation = [
  { name: "Tổng quan", href: "/doctor", icon: <BarChart2 className="w-4 h-4" /> },
  { name: "Lịch khám", href: "/doctor/schedule", icon: <Calendar className="w-4 h-4" /> },
  { name: "Bệnh nhân", href: "/doctor/patients", icon: <Users className="w-4 h-4" /> },
  { name: "Chat & Tư vấn", href: "/doctor/chat", icon: <MessageSquare className="w-4 h-4" /> },
  { name: "Hồ sơ điều trị", href: "/doctor/medical-records", icon: <FileText className="w-4 h-4" /> },
  { name: "Đơn thuốc", href: "/doctor/prescriptions", icon: <Pill className="w-4 h-4" /> },
  { name: "Báo cáo", href: "/doctor/reports", icon: <TrendingUp className="w-4 h-4" /> },
  { name: "Cài đặt", href: "/doctor/settings", icon: <Settings className="w-4 h-4" /> },
];

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div
            style={{ backgroundColor: "var(--color-primary)" }}
            className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4"
          >
            <Smile className="w-8 h-8 text-white" />
          </div>
          <p className="text-[var(--color-muted)]">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <ShellLayout navigation={navigation}>
      <div className="fixed top-0 left-30 right-0 z-40">
        <Header role="Bác sĩ" />
      </div>

      <>{children}</>
    </ShellLayout>
  );
}
