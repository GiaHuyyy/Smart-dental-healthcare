"use client";

import Link from "next/link";
import LogoutButton from "./LogoutButton";
import { useSession } from "next-auth/react";

export default function Header({ role = "Bệnh nhân" }) {
  const { data: session } = useSession();

  return (
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
            <span
              className={`ml-4 px-2 py-1 bg-emerald-100 ${
                role === "Bệnh nhân" ? "text-emerald-700 " : "text-sky-700"
              } rounded-full text-sm`}
            >
              {role}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-400 hover:text-gray-600">🔔</button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
              <span className="text-sm font-medium">{session?.user?.email}</span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
