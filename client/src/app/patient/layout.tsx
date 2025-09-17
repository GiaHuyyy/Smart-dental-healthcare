"use client";

import Header from "@/components/Header";
import { BarChart2, Calendar, MessageSquare, FileText, Pill, CreditCard, Settings, Smile } from "lucide-react";
import { sendRequest } from "@/utils/api";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import ShellLayout from "@/components/ShellLayout";

const navigation = [
  { name: "Tổng quan", href: "/patient", icon: <BarChart2 className="w-4 h-4" /> },
  { name: "Đặt lịch hẹn", href: "/patient/appointments", icon: <Calendar className="w-4 h-4" /> },
  { name: "Chat & Tư vấn", href: "/patient/chat", icon: <MessageSquare className="w-4 h-4" /> },
  { name: "Hồ sơ điều trị", href: "/patient/records", icon: <FileText className="w-4 h-4" /> },
  { name: "Đơn thuốc", href: "/patient/prescriptions", icon: <Pill className="w-4 h-4" /> },
  { name: "Thanh toán", href: "/patient/payments", icon: <CreditCard className="w-4 h-4" /> },
  { name: "Cài đặt", href: "/patient/settings", icon: <Settings className="w-4 h-4" /> },
];

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const seenRef = useRef<Set<string>>(new Set());
  const [broadcastModal, setBroadcastModal] = useState<{ id?: string; title: string; message: string } | null>(null);
  const modalCloseRef = useRef<HTMLButtonElement | null>(null);

  // helpers: parse the reschedule message and format dates/times nicely
  function safeParseDate(d: string) {
    if (!d) return null;
    // try ISO or YYYY-MM-DD
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) return parsed;
    // fallback: try replacing only date portion
    const maybe = d.split("T")[0];
    const p2 = new Date(maybe);
    return isNaN(p2.getTime()) ? null : p2;
  }

  function pad(n: number) {
    return n.toString().padStart(2, "0");
  }

  function formatDateTime(dateStr?: string, timeStr?: string) {
    if (!dateStr && !timeStr) return "";
    let dt: Date | null = null;
    if (dateStr) dt = safeParseDate(dateStr);
    // if date is present and time given as HH:MM, compose a Date
    if (dt && timeStr && /^\d{1,2}:\d{2}$/.test(timeStr)) {
      const [hh, mm] = timeStr.split(":").map(Number);
      dt.setHours(hh, mm, 0, 0);
    }
    if (dt) {
      // Vietnamese short format: DD/MM/YYYY HH:MM
      const datePart = `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
      const timePart = `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
      return `${datePart} ${timePart}`;
    }
    // fallback: combine raw strings
    return [dateStr, timeStr].filter(Boolean).join(" ");
  }

  function parseRescheduleMessage(msg: string | undefined) {
    if (!msg) return null;
    // Accept multiple date/time formats. Examples:
    // 'Giờ cũ: 2025-08-21T00:00:00.000Z 10:00. Giờ mới: 2025-08-21 09:30'
    // 'Giờ cũ: 2025-08-21 09:30. Giờ mới: 2025-08-21 10:00'
    const re =
      /Giờ cũ:\s*([0-9T:\-\.Z]+)\s+([0-9]{1,2}:[0-9]{2})\D+Giờ mới:\s*([0-9T:\-\.Z]+)\s+([0-9]{1,2}:[0-9]{2})/i;
    const m = msg.match(re);
    if (!m) return null;
    return { oldDate: m[1], oldTime: m[2], newDate: m[3], newTime: m[4] };
  }

  useEffect(() => {
    let mounted = true;
    const userId = (session as any)?.user?._id || (session as any)?.user?.id || (session as any)?.user?.sub;
    if (!userId) return;

    async function fetchNotifications() {
      try {
        const res = await sendRequest<any>({
          method: "GET",
          url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/notifications/user/${userId}`,
        });
        const list = res?.data || res || [];
        if (!Array.isArray(list)) return;
        // Filter to appointment-related notifications (reschedules) and pick the newest one only
        const apptNotifs = list.filter(
          (n: any) =>
            n &&
            (n.type === "appointment" || n.type === "appointment:update" || n.type === "appointment_change") &&
            (n.refModel === "Appointment" || !n.refModel)
        );
        if (!apptNotifs || apptNotifs.length === 0) return;
        // sort newest-first using createdAt if available
        apptNotifs.sort((a: any, b: any) => {
          const ta = new Date(a?.createdAt || a?.updatedAt || 0).getTime() || 0;
          const tb = new Date(b?.createdAt || b?.updatedAt || 0).getTime() || 0;
          return tb - ta;
        });
        const latest = apptNotifs[0];
        const id = latest._id || latest.id || JSON.stringify(latest);
        // show only if unread/unanseen
        const isRead = !!latest.isRead || !!latest.read || false;
        if (!seenRef.current.has(id) && !isRead) {
          seenRef.current.add(id);
          if (!mounted) return;
          try {
            setBroadcastModal({ id, title: latest.title || "Thông báo", message: latest.message || "" });
            // mark read on server so it won't reappear
            if (id && typeof id === "string") {
              sendRequest<any>({
                method: "PATCH",
                url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/notifications/${id}/read`,
              }).catch(() => {});
            }
          } catch (e) {
            console.warn("failed to display notification modal", latest.title, latest.message, e);
          }
        }
      } catch (err) {
        console.warn("poll notifications failed", err);
      }
    }

    // initial fetch
    fetchNotifications();
    // poll less frequently to reduce network churn during navigation
    const t = setInterval(fetchNotifications, 30000);

    // listen for BroadcastChannel messages for immediate intra-browser delivery
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc = new BroadcastChannel("sdh_notifications");
        bc.onmessage = (ev) => {
          try {
            const payload = ev.data;
            if (!payload) return;
            // Only surface appointment notifications (reschedules)
            if (
              !(
                payload.type === "appointment" ||
                payload.type === "appointment:update" ||
                payload.type === "appointment_change"
              )
            )
              return;
            if (payload.refModel && payload.refModel !== "Appointment") return;
            const id = payload._id || payload.id || JSON.stringify(payload);
            if (seenRef.current.has(id)) return;
            seenRef.current.add(id);
            // show centered modal immediately and mark read
            setBroadcastModal({
              id: payload.id || id,
              title: payload.title || "Thông báo",
              message: payload.message || "",
            });
            if (id && typeof id === "string") {
              // best-effort mark-as-read; don't await
              try {
                sendRequest<any>({
                  method: "PATCH",
                  url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/notifications/${id}/read`,
                }).catch(() => {});
              } catch (e) {}
            }
          } catch (e) {
            console.warn("bc onmessage handler failed", e);
          }
        };
      }
    } catch (e) {
      console.warn("setup BroadcastChannel failed", e);
    }

    return () => {
      mounted = false;
      clearInterval(t);
      if (bc) bc.close();
    };
  }, [session]);

  function closeBroadcastModal() {
    setBroadcastModal(null);
  }

  // lock scroll and focus modal close button while modal is open to enforce blocking behavior
  useEffect(() => {
    if (broadcastModal) {
      // disable background scroll
      try {
        document.body.style.overflow = "hidden";
      } catch (e) {}
      // focus close button
      setTimeout(() => {
        try {
          modalCloseRef.current?.focus();
        } catch (e) {}
      }, 0);
    } else {
      try {
        document.body.style.overflow = "";
      } catch (e) {}
    }
    return () => {
      try {
        document.body.style.overflow = "";
      } catch (e) {}
    };
  }, [broadcastModal]);

  // prevent key events (Esc) from closing modal unintentionally
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!broadcastModal) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [broadcastModal]);

  return (
    <ShellLayout navigation={navigation}>
      <div className="fixed top-0 left-30 right-0 z-40">
        <Header />
      </div>

      <>{children}</>
    </ShellLayout>
  );
}
