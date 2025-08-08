"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header role="Bệnh nhân" />

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
