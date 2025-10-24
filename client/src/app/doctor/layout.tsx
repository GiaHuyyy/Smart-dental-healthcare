"use client";

import Header from "@/components/Header";
import ShellLayout from "@/components/ShellLayout";
import {
    Activity,
    BarChart2,
    Calendar,
    FileText,
    MessageSquare,
    Pill,
    Settings,
    Stethoscope,
    Users,
    Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navigation = [
  { name: "Tổng quan", href: "/doctor", icon: <BarChart2 className="w-4 h-4" /> },
  { name: "Lịch khám", href: "/doctor/schedule", icon: <Calendar className="w-4 h-4" /> },
  { name: "Bệnh nhân", href: "/doctor/patients", icon: <Users className="w-4 h-4" /> },
  { name: "Chat & Tư vấn", href: "/doctor/chat", icon: <MessageSquare className="w-4 h-4" /> },
  { name: "Hồ sơ điều trị", href: "/doctor/medical-records", icon: <FileText className="w-4 h-4" /> },
  { name: "Điều trị", href: "/doctor/treatment", icon: <Activity className="w-4 h-4" /> },
  { name: "Đơn thuốc", href: "/doctor/prescriptions", icon: <Pill className="w-4 h-4" /> },
  { name: "Doanh thu", href: "/doctor/revenue", icon: <Wallet className="w-4 h-4" /> },
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50/30 to-indigo-50/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <div className="healthcare-card p-6 max-w-sm">
            <h3 className="healthcare-subheading mb-2">Đang khởi động hệ thống</h3>
            <p className="healthcare-caption">Vui lòng chờ trong giây lát...</p>
            <div className="mt-4 w-full bg-blue-100 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full animate-pulse"
                style={{ width: "60%" }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ShellLayout navigation={navigation}>
      <div className="fixed top-0 left-30 right-0 z-40">
        <Header />
      </div>

      <div className="bg-gradient-to-br from-blue-50/30 to-indigo-50/20 h-full">{children}</div>
    </ShellLayout>
  );
}
