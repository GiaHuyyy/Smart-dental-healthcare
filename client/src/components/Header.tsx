"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LogoutButton from "./auth/LogoutButton";

export default function Header({ role = "Bệnh nhân" }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isHomePage = pathname === "/";
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
      };
    } else if (userRole === "patient") {
      return {
        role: "Bệnh nhân",
        dashboardPath: "/patient",
        buttonText: "Vào trang Bệnh nhân",
      };
    }
    return null;
  };

  const dashboardInfo = getUserDashboardInfo();

  console.log("Session data in Header:", session);
  console.log("Session data in dashboardInfo:", dashboardInfo);

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">🦷</span>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">Smart Dental</span>
            </Link>
            {!isHomePage && (
              <span
                className={`ml-4 px-2 py-1 bg-emerald-100 ${
                  role === "Bệnh nhân" ? "text-emerald-700 " : "text-sky-700"
                } rounded-full text-sm`}
              >
                {role}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {session?.user ? (
              // Logged in user
              <>
                {!isHomePage && <button className="p-2 text-gray-400 hover:text-gray-600">🔔</button>}

                {/* User info and dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{session.user.email}</span>
                    <button
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="w-8 h-8 bg-gray-300 rounded-full hover:bg-gray-400 transition-colors cursor-pointer"
                      aria-label="User menu"
                    >
                      👤
                    </button>
                  </div>

                  {/* Dropdown menu */}
                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
                      <div className="px-4 py-2 text-sm text-gray-500 border-b">{dashboardInfo?.role}</div>

                      {/* Show dashboard link when on homepage */}
                      {dashboardInfo && isHomePage && (
                        <Link
                          href={dashboardInfo.dashboardPath}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setShowDropdown(false)}
                        >
                          {dashboardInfo.buttonText}
                        </Link>
                      )}

                      {/* Show home link when not on homepage */}
                      {!isHomePage && (
                        <Link
                          href="/"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setShowDropdown(false)}
                        >
                          Trang chủ
                        </Link>
                      )}

                      <div className="border-t">
                        <div className="px-4 py-2">
                          <LogoutButton />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Not logged in - show on all pages including home
              <>
                {isHomePage && (
                  <nav className="flex items-center space-x-8">
                    <Link href="#services" className="text-gray-600 hover:text-gray-900">
                      Dịch vụ
                    </Link>
                    <Link href="#doctors" className="text-gray-600 hover:text-gray-900">
                      Bác sĩ
                    </Link>
                    <Link href="#about" className="text-gray-600 hover:text-gray-900">
                      Về chúng tôi
                    </Link>
                  </nav>
                )}
                <Link href="/auth/login" className="text-gray-600 hover:text-gray-900">
                  Đăng nhập
                </Link>
                <Link href="/auth/register" className="bg-sky-500 text-white px-4 py-2 rounded-md hover:bg-sky-600">
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
