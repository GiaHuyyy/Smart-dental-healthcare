"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import LogoutButton from "./auth/LogoutButton";
import { User, Settings, Activity, Home, FileText, Drone } from "lucide-react";
import Image from "next/image";
import { PolicyModal } from "@/components/PolicyModal";
import { NotificationButton } from "./NotificationButton";
import tooth from "../../public/tooth.svg";
import toothWhite from "../../public/tooth-white.svg";

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const [showDropdown, setShowDropdown] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle scroll for transparent header on homepage
  const handleScroll = useCallback(() => {
    if (isHomePage) {
      setIsScrolled(window.scrollY > 10);
    }
  }, [isHomePage]);

  useEffect(() => {
    if (isHomePage) {
      window.addEventListener("scroll", handleScroll);
      handleScroll(); // Check initial scroll position
      return () => window.removeEventListener("scroll", handleScroll);
    } else {
      setIsScrolled(true); // Always show solid header on other pages
    }
  }, [isHomePage, handleScroll]);

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

  // Determine header styles based on scroll and page
  const headerBg = isHomePage && !isScrolled ? "bg-transparent border-transparent" : "bg-white/95 border-gray-100";

  const textColor = isHomePage && !isScrolled ? "text-white" : "text-gray-900";
  const textColorSecondary = isHomePage && !isScrolled ? "text-white/80" : "text-gray-500";
  const logoTextColor = isHomePage && !isScrolled ? "text-white" : "text-primary";

  return (
    <header
      className={`rounded-none! border-b sticky top-0 z-50 backdrop-blur-sm transition-all duration-300 ${headerBg}`}
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="flex justify-between items-center py-4">
          {/* Logo and Branding */}
          <div className="flex items-center gap-4">
            {isHomePage ? (
              <Link href="/" className="flex items-center hover:opacity-90 transition-opacity group">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    isScrolled ? "bg-linear-to-br from-blue-100 to-[#00a6f4]" : "bg-white/20 backdrop-blur-sm"
                  }`}
                >
                  <Image src={isScrolled ? tooth : toothWhite} alt="Logo" width={24} height={24} />
                </div>
                <div className="ml-3">
                  <span className={`text-xl font-bold transition-colors duration-300 ${logoTextColor}`}>
                    Smart Dental
                  </span>
                  <div className={`text-xs -mt-1 transition-colors duration-300 ${textColorSecondary}`}>
                    Healthcare Platform
                  </div>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                {dashboardInfo && (
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-2 px-4 py-1 rounded-full text-[18px] font-semibold border border-[#8bd9fd] bg-linear-to-r from-60 to-100 from-blue-100 to-[#80d7ff] text-primary shadow-sm tracking-wide"
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
            {/* Policy button (Header) - small, non-intrusive */}
            <div className="hidden sm:block">
              <PolicyModal
                trigger={
                  <button className="flex items-center gap-2  px-3 py-2 rounded-lg text-sm font-medium ring bg-primary/10 ring-primary text-primary hover:opacity-75 transition-colors">
                    <FileText className="w-4 h-4" />
                    Chính sách Đặt lịch
                  </button>
                }
              />
            </div>
            {session?.user ? (
              <>
                {/* Chat AI button - only for patients */}
                {!isHomePage && session.user.role === "patient" && (
                  <Link
                    href="/patient/chat"
                    className="flex items-center ring ring-primary gap-2 px-3 hover:opacity-75 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                  >
                    <Drone className="w-5 h-5" />
                    <span className="hidden sm:inline">Chat AI</span>
                  </Link>
                )}

                {/* Notification button for logged-in users */}
                {!isHomePage && (
                  <div className="flex items-center gap-2">
                    <NotificationButton />
                  </div>
                )}

                {/* User Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:block text-right">
                      <div className={`text-sm font-medium transition-colors duration-300 ${textColor}`}>
                        {session.user.fullName}
                      </div>
                      <div className={`text-xs transition-colors duration-300 ${textColorSecondary}`}>
                        {session.user.email}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="w-10 h-10 bg-linear-to-br from-gray-100 to-gray-200 rounded-full hover:from-blue-50 hover:to-blue-100 transition-all duration-200 cursor-pointer flex items-center justify-center ring-2 ring-primary shadow-md overflow-hidden"
                      aria-label="User menu"
                    >
                      {session.user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={session.user.avatarUrl}
                          alt={session.user.fullName || "User"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-gray-600 hover:text-[#00a6f4]" />
                      )}
                    </button>
                  </div>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div className="absolute right-0 mt-3 w-80 healthcare-card-elevated shadow-xl border border-gray-100 rounded-xl overflow-hidden z-50">
                      {/* User Info Header */}
                      <div className="p-4 bg-linear-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-linear-to-br from-blue-100 to-[#00a6f4] rounded-full flex items-center justify-center overflow-hidden">
                            {session.user.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={session.user.avatarUrl}
                                alt={session.user.fullName || "User"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-6 h-6 text-white" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{session.user.fullName || "User"}</div>
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
