"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LogoutButton from "./auth/LogoutButton";
import { User, Bell, Smile } from "lucide-react";

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
    <header style={{ backgroundColor: "var(--color-surface)" }} className="shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
              <div
                style={{ backgroundColor: "var(--color-primary)" }}
                className="w-9 h-9 rounded-lg flex items-center justify-center"
              >
                <Smile className="w-5 h-5 text-white" />
              </div>
              <span className="ml-3 text-xl font-bold text-gray-900">Smart Dental</span>
            </Link>
            {!isHomePage && (
              <span
                style={{ backgroundColor: "var(--color-accent)", color: "var(--color-primary-600)" }}
                className={`ml-4 px-2 py-1 rounded-full text-sm`}
              >
                {role}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {session?.user ? (
              <>
                {!isHomePage && (
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <Bell className="w-5 h-5" />
                  </button>
                )}

                <div className="relative" ref={dropdownRef}>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">{session.user.email}</span>
                    <button
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="w-8 h-8 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors cursor-pointer flex items-center justify-center"
                      aria-label="User menu"
                    >
                      <User className="w-5 h-5 text-gray-700" />
                    </button>
                  </div>

                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
                      <div className="px-4 py-2 text-sm text-gray-500 border-b">{dashboardInfo?.role}</div>

                      {dashboardInfo && isHomePage && (
                        <Link
                          href={dashboardInfo.dashboardPath}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setShowDropdown(false)}
                        >
                          {dashboardInfo.buttonText}
                        </Link>
                      )}

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
                <Link href="/auth/register" className="btn-primary">
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
