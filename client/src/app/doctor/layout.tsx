"use client";

import Header from "@/components/Header";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navigation = [
  { name: "Trang chủ", href: "/", icon: "🏠", isHome: true },
  { name: "Tổng quan", href: "/doctor", icon: "📊" },
  { name: "Lịch khám", href: "/doctor/schedule", icon: "📅" },
  { name: "Bệnh nhân", href: "/doctor/patients", icon: "👥" },
  { name: "Chat & Tư vấn", href: "/doctor/chat", icon: "💬" },
  { name: "Hồ sơ điều trị", href: "/doctor/treatments", icon: "📋" },
  { name: "Đơn thuốc", href: "/doctor/prescriptions", icon: "💊" },
  { name: "Báo cáo", href: "/doctor/reports", icon: "📈" },
  { name: "Cài đặt", href: "/doctor/settings", icon: "⚙️" },
];

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, [router]);

  const handleLogout = () => {
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">🦷</span>
          </div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header role="Bác sĩ" />

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white shadow-sm min-h-screen">
          <div className="p-4">
            <ul className="space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const isHomeItem = item.isHome;

                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`flex items-center px-4 py-2 text-sm rounded-md transition-colors ${
                        isHomeItem
                          ? "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                          : isActive
                          ? "bg-sky-100 text-sky-700"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
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

        {/* Main content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
