"use client";

import Header from "@/components/Header";
import ShellLayout from "@/components/ShellLayout";
import { BarChart2, Calendar, CreditCard, FileText, MessageSquare, Settings, Users, Ticket } from "lucide-react";

const navigation = [
  { name: "Tổng quan", href: "/patient", icon: <BarChart2 className="w-4 h-4" /> },
  { name: "Đặt lịch hẹn", href: "/patient/appointments", icon: <Calendar className="w-4 h-4" /> },
  { name: "Bác sĩ", href: "/patient/doctors", icon: <Users className="w-4 h-4" /> },
  { name: "Chat & Tư vấn", href: "/patient/chat", icon: <MessageSquare className="w-4 h-4" /> },
  { name: "Hồ sơ điều trị", href: "/patient/records", icon: <FileText className="w-4 h-4" /> },
  { name: "Thanh toán", href: "/patient/payments", icon: <CreditCard className="w-4 h-4" /> },
  { name: "Voucher của tôi", href: "/patient/vouchers", icon: <Ticket className="w-4 h-4" /> },
  { name: "Cài đặt", href: "/patient/settings", icon: <Settings className="w-4 h-4" /> },
];

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ShellLayout navigation={navigation}>
      <div className="fixed top-0 left-30 right-0 z-40">
        <Header />
      </div>

      <div className="bg-linear-to-br from-blue-50/30 to-indigo-50/20 h-full">{children}</div>
    </ShellLayout>
  );
}
