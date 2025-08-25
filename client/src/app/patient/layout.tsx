"use client";

import Header from "@/components/Header";
import { sendRequest } from "@/utils/api";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const navigation = [
  { name: "Trang chủ", href: "/", icon: "🏠", isHome: true },
  { name: "Tổng quan", href: "/patient", icon: "📊" },
  { name: "Đặt lịch hẹn", href: "/patient/appointments", icon: "📅" },
  { name: "Hồ sơ điều trị", href: "/patient/records", icon: "📋" },
  { name: "Đơn thuốc", href: "/patient/prescriptions", icon: "💊" },
  { name: "Thanh toán", href: "/patient/payments", icon: "💳" },
  { name: "Cài đặt", href: "/patient/settings", icon: "⚙️" },
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
    const t = setInterval(fetchNotifications, 6000);

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
            setBroadcastModal({ id, title: payload.title || "Thông báo", message: payload.message || "" });
            if (id && typeof id === "string")
              sendRequest<any>({
                method: "PATCH",
                url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/notifications/${id}/read`,
              }).catch(() => {});
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
    <div className="min-h-screen bg-gray-50">
      <Header role="Bệnh nhân" />

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white shadow-sm min-h-screen">
          <div className="p-4">
            <ul className="space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const isHomeItem = item.isHome;

                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`flex items-center px-4 py-2 text-sm rounded-md transition-colors ${
                        isHomeItem
                          ? "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                          : isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <span className="mr-3">{item.icon}</span>
                      {item.name}
                      {isHomeItem && <span className="ml-auto text-xs">↗</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 p-6">{children}</main>
      </div>

      {/* Centered broadcast modal overlay (blocks background until closed) */}
      {broadcastModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="flex-none">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-xl">
                  📅
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{broadcastModal.title}</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Bác sĩ đã cập nhật thời gian khám của bạn — vui lòng kiểm tra chi tiết bên dưới.
                </p>
              </div>
            </div>

            {(() => {
              const parsed = parseRescheduleMessage(broadcastModal.message);
              if (parsed) {
                return (
                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border border-red-100 bg-red-50 shadow-sm">
                      <div className="text-xs font-medium text-red-600">Giờ cũ</div>
                      <div className="mt-1 text-sm text-red-800 font-semibold">
                        {formatDateTime(parsed.oldDate, parsed.oldTime)}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border border-emerald-100 bg-emerald-50 shadow-md">
                      <div className="text-xs font-medium text-emerald-700">Giờ mới</div>
                      <div className="mt-1 text-lg font-bold text-emerald-900">
                        {formatDateTime(parsed.newDate, parsed.newTime)}
                      </div>
                    </div>
                    <div className="md:col-span-2 text-sm text-gray-600 mt-2">
                      Nếu giờ mới không phù hợp, vui lòng liên hệ phòng khám hoặc nhấn "Liên hệ" để được trợ giúp.
                    </div>
                  </div>
                );
              }
              return <p className="mt-4 text-sm text-gray-700">{broadcastModal.message}</p>;
            })()}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  window.location.href = "/patient/settings";
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Liên hệ
              </button>
              <button
                ref={modalCloseRef}
                onClick={closeBroadcastModal}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
