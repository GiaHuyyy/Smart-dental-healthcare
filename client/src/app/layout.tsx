import "@/app/globals.css";
import ClientProviders from "@/components/providers/ClientProviders";
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
    <html
      lang="vi"
      suppressHydrationWarning
      style={{ ["--vsc-domain" as any]: JSON.stringify(process.env.NEXT_PUBLIC_VSC_DOMAIN || "") }}
    >
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
