"use client";

import React from "react";
import Link from "next/link";
import { Smile } from "lucide-react";
import { usePathname } from "next/navigation";

type NavItem = { name: string; href: string; icon?: React.ReactNode };

export default function ShellLayout({ navigation, children }: { navigation: NavItem[]; children: React.ReactNode }) {
  // usePathname can't be used here because some callers may import server-side
  // but our layouts call this client component. Consumers pass already-known pathname when needed.
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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

      <div className="flex h-screen pt-16">
        <main className="flex-1 ml-30 p-6 overflow-y-auto h-full">{children}</main>
      </div>
    </div>
  );
}
