"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navigation = [
  { name: "Tổng quan", href: "/patient", icon: "🏠" },
  { name: "Đặt lịch hẹn", href: "/patient/appointments", icon: "📅" },
  { name: "Hồ sơ điều trị", href: "/patient/records", icon: "📋" },
  { name: "Đơn thuốc", href: "/patient/prescriptions", icon: "💊" },
  { name: "Thanh toán", href: "/patient/payments", icon: "💳" },
  { name: "Cài đặt", href: "/patient/settings", icon: "⚙️" },
];

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    const authStatus = localStorage.getItem("isAuthenticated");
    const userType = localStorage.getItem("userType");
    const email = localStorage.getItem("userEmail");

    if (!authStatus || userType !== "patient") {
      router.push("/auth/login");
      return;
    }

    setIsAuthenticated(true);
    setUserEmail(email || "");
    setIsLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("userType");
    localStorage.removeItem("userEmail");
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-sky-500 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">🦷</span>
          </div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">🦷</span>
                </div>
                <span className="ml-2 text-xl font-bold text-gray-900">Smart Dental</span>
              </Link>
              <span className="ml-4 px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm">Bệnh nhân</span>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600">🔔</button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                <span className="text-sm font-medium">{userEmail}</span>
                <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-800">
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white shadow-sm min-h-screen">
          <div className="p-4">
            <ul className="space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`flex items-center px-4 py-2 text-sm rounded-md transition-colors ${
                        isActive ? "bg-emerald-100 text-emerald-700" : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <span className="mr-3">{item.icon}</span>
                      {item.name}
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
