"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

type NavItem = { name: string; href: string; icon?: React.ReactNode };

export default function ShellLayout({ navigation, children }: { navigation: NavItem[]; children: React.ReactNode }) {
  // usePathname can't be used here because some callers may import server-side
  // but our layouts call this client component. Consumers pass already-known pathname when needed.
  const pathname = usePathname();
  const isChatRoute = pathname?.includes("/chat");
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="w-30 bg-white shadow-sm fixed top-0 left-0 bottom-0 z-30 overflow-y-auto">
        <div className="py-4 px-2">
          <div className="flex items-center justify-center mb-6">
            <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-100 to-[#00a6f4]">
                <Image src="/tooth.svg" alt="Logo" width={40} height={40} className="w-6 h-6" />
              </div>
            </Link>
          </div>

          <ul className="space-y-2">
            {navigation.map((item) => {
              // Exact match for root routes, startsWith for sub-routes
              const isExactMatch = pathname === item.href;
              const isSubRoute = item.href !== "/patient" && pathname?.startsWith(item.href + "/");
              const isActive = isExactMatch || isSubRoute;

              const linkClasses = `flex flex-col items-center justify-center py-2 text-sm rounded-md transition-colors ${
                isActive ? "bg-primary-100 text-primary" : "text-gray-600 hover:bg-gray-100"
              }`;

              const iconEl = item.icon ? (
                <span className="w-4 h-4 inline-flex items-center justify-center">{item.icon}</span>
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

      <div className="flex h-screen pt-16">
        <main className={`flex-1 ml-30 ${isChatRoute ? "p-0 overflow-hidden" : "p-6 overflow-y-auto"} h-full`}>
          {children}
        </main>
      </div>
    </div>
  );
}
