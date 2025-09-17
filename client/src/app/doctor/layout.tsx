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
      {/* Fixed Sidebar */}
      <nav className="w-30 bg-white shadow-sm fixed top-0 left-0 bottom-0 z-30 overflow-y-auto">
        <div className="py-4 px-2">
          <div className="flex items-center justify-center mb-6">
            <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
              <div
                style={{ backgroundColor: "var(--color-primary)" }}
                className="w-9 h-9 rounded-lg flex items-center justify-center"
              >
                <Smile className="w-5 h-5 text-white" />
              </div>
            </Link>
          </div>
          <ul className="space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;

              const linkClasses = `flex flex-col items-center justify-center py-2 text-sm rounded-md transition-colors ${
                isActive ? "bg-primary-100 text-primary" : "text-gray-600 hover:bg-gray-100"
              }`;

              const iconEl = item.icon ? (
                <span
                  className="w-4 h-4 inline-flex items-center justify-center"
                  style={{ color: isActive ? "var(--color-primary-600)" : undefined }}
                >
                  {item.icon}
                </span>
              ) : null;

              return (
                <li key={item.name}>
                  <Link href={item.href} className={linkClasses}>
                    <span>{iconEl}</span>
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Fixed Header */}
      <div className="fixed top-0 left-30 right-0 z-40">
        <Header role="Bác sĩ" />
      </div>

      <div className="flex h-screen pt-16">
        {/* Main content - scrollable */}
        <main className="flex-1 ml-30 p-6 overflow-y-auto h-full">{children}</main>
      </div>
    </div>
  );
}
