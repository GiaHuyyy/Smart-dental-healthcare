"use client";

import Header from "@/components/Header";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  BarChart2,
  Calendar,
  Users,
  MessageSquare,
  FileText,
  Pill,
  TrendingUp,
  Settings,
  Smile,
} from "lucide-react";

const navigation = [
  { name: "Trang chủ", href: "/", icon: <Home className="w-4 h-4" />, isHome: true },
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
  const pathname = usePathname();
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-40">
        <Header role="Bác sĩ" />
      </div>

      <div className="flex h-screen pt-16">
        {/* Fixed Sidebar */}
        <nav className="w-64 bg-white shadow-sm fixed top-16 left-0 bottom-0 z-30 overflow-y-auto">
          <div className="p-4">
            <ul className="space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const isHomeItem = item.isHome;

                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`flex items-center px-4 py-2 text-sm rounded-md transition-colors`}
                      style={{
                        backgroundColor: isHomeItem
                          ? "rgba(106,166,177,0.06)"
                          : isActive
                          ? "rgba(106,166,177,0.08)"
                          : undefined,
                        color: isHomeItem || isActive ? "var(--color-primary-600)" : undefined,
                        border: isHomeItem ? `1px solid rgba(90,152,162,0.12)` : undefined,
                      }}
                    >
                      <span className="mr-3">{item.icon}</span>
                      {item.name}
                      {isHomeItem && <span className="ml-auto text-xs">↗</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Main content - scrollable */}
        <main className="flex-1 ml-64 p-6 overflow-y-auto h-full">{children}</main>
      </div>
    </div>
  );
}
