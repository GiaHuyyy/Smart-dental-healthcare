import "@/app/globals.css";
import ClientProviders from "@/components/providers/ClientProviders";
import { PolicyModal } from "@/components/PolicyModal";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart Dental Healthcare",
  description: "Hệ thống chăm sóc sức khỏe răng miệng thông minh",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" style={{ ["--vsc-domain" as any]: JSON.stringify(process.env.NEXT_PUBLIC_VSC_DOMAIN || "") }}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
        <ClientProviders>{children}</ClientProviders>
        <footer className="bg-gray-100 border-t border-gray-200 mt-auto">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
              <PolicyModal buttonText="Chính sách Đặt lịch" />
              <a href="#" className="hover:text-gray-900 transition-colors">
                Chính sách bảo mật
              </a>
              <a href="#" className="hover:text-gray-900 transition-colors">
                Điều khoản sử dụng
              </a>
              <a href="#" className="hover:text-gray-900 transition-colors">
                Liên hệ
              </a>
            </div>
            <div className="text-center text-xs text-gray-500 mt-4">
              © 2025 Smart Dental Healthcare. Tất cả quyền được bảo lưu.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
