"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LogoutButton from "./auth/LogoutButton";
import { User, Smile, Settings, Activity, Calendar, Home } from "lucide-react";
import Image from "next/image";
import { NotificationButton } from "./NotificationButton";

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const isPatientOrDoctor = pathname?.startsWith("/patient") || pathname?.startsWith("/doctor");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Determine user role and dashboard path
  const getUserDashboardInfo = () => {
    if (!session?.user) return null;

    const userRole = session.user.role;
    if (userRole === "doctor") {
      return {
        role: "Bác sĩ",
        dashboardPath: "/doctor",
        buttonText: "Vào trang Bác sĩ",
        icon: <Activity className="w-4 h-4" />,
        statusColor: "bg-blue-50 text-blue-700 border border-blue-200",
      };
    } else if (userRole === "patient") {
      return {
        role: "Bệnh nhân",
        dashboardPath: "/patient",
        buttonText: "Vào trang Bệnh nhân",
        icon: <User className="w-4 h-4" />,
        statusColor: "bg-blue-50 text-blue-700 border border-blue-200",
      };
    }
    return null;
  };

  const dashboardInfo = getUserDashboardInfo();

  return (
    <header className="healthcare-card !rounded-none border-b border-gray-100 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="flex justify-between items-center py-4">
          {/* Logo and Branding */}
          <div className="flex items-center gap-4">
            {isHomePage ? (
              <Link href="/" className="flex items-center hover:opacity-90 transition-opacity group">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-100 to-[#00a6f4]">
                  <Image src="/tooth.svg" alt="Logo" width={40} height={40} className="w-6 h-6" />
                </div>
                <div className="ml-3">
                  <span className="text-xl font-bold text-gray-900">Smart Dental</span>
                  <div className="text-xs text-gray-500 -mt-1">Healthcare Platform</div>{" "}
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                {dashboardInfo && (
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-2 px-4 py-1 rounded-full text-[18px] font-semibold border border-[#8bd9fd] bg-gradient-to-r from-[60%] to-[100%] from-blue-100 to-[#80d7ff] text-[#00a6f4] shadow-sm tracking-wide"
                      style={{
                        letterSpacing: "0.03em",
                        fontFamily: "Montserrat, Arial, sans-serif",
                        boxShadow: "0 2px 8px rgba(0,166,244,0.08)",
                      }}
                    >
                      <span className="ml-1">{dashboardInfo.role}</span>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation and User Menu */}
          <div className="flex items-center gap-4">
            {session?.user ? (
              <>
                {/* Quick Actions for logged-in users */}
                {!isHomePage && (
                  <div className="flex items-center gap-2">
                    <button className="p-2.5 text-gray-600 hover:text-[#00a6f4] hover:bg-blue-50 rounded-lg transition-colors relative">
                      <Calendar className="w-5 h-5" />
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full"></span>
                    </button>
                    <NotificationButton />
                  </div>
                )}

                {/* User Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:block text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {session.user.username || session.user.email}
                      </div>
                      <div className="text-xs text-gray-500">{session.user.email}</div>
                    </div>
                    <button
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full hover:from-blue-50 hover:to-blue-100 transition-all duration-200 cursor-pointer flex items-center justify-center border-2 border-white shadow-md"
                      aria-label="User menu"
                    >
                      <User className="w-5 h-5 text-gray-600 hover:text-[#00a6f4]" />
                    </button>
                  </div>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div className="absolute right-0 mt-3 w-80 healthcare-card-elevated shadow-xl border border-gray-100 rounded-xl overflow-hidden z-50">
                      {/* User Info Header */}
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-[#00a6f4] rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{session.user.username || "User"}</div>
                            <div className="text-sm text-gray-600">{session.user.email}</div>
                            {dashboardInfo && (
                              <div
                                className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${dashboardInfo.statusColor}`}
                              >
                                <span className="text-[#00a6f4]">{dashboardInfo.icon}</span>
                                <span
                                  style={{
                                    background: "var(--color-primary-50)",
                                    color: "var(--color-primary)",
                                    borderRadius: 6,
                                    padding: "2px 6px",
                                    marginLeft: 6,
                                    fontWeight: 600,
                                    fontSize: 12,
                                    border: "1px solid rgba(var(--color-primary-rgb),0.12)",
                                  }}
                                >
                                  {dashboardInfo.role}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="p-2">
                        {dashboardInfo && isHomePage ? (
                          <Link
                            href={dashboardInfo.dashboardPath}
                            className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-[#00a6f4] rounded-lg transition-colors"
                            onClick={() => setShowDropdown(false)}
                          >
                            {dashboardInfo.icon}
                            {dashboardInfo.buttonText}
                          </Link>
                        ) : (
                          <Link
                            href={"/"}
                            className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-[#00a6f4] rounded-lg transition-colors"
                            onClick={() => setShowDropdown(false)}
                          >
                            <Home className="w-4 h-4" />
                            Trang chủ
                          </Link>
                        )}

                        <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-[#00a6f4] rounded-lg transition-colors">
                          <Settings className="w-4 h-4" />
                          Cài đặt tài khoản
                        </button>

                        <div className="border-t border-gray-100 my-2"></div>

                        <div className="px-3 py-1">
                          <LogoutButton className="w-full btn-healthcare-secondary text-sm py-2" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Login/Register buttons for non-authenticated users */
              <div className="flex items-center gap-3">
                <Link href="/auth/login" className="btn-healthcare-secondary text-sm px-4 py-2">
                  Đăng nhập
                </Link>
                <Link href="/auth/register" className="btn-healthcare-primary text-sm px-4 py-2">
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
