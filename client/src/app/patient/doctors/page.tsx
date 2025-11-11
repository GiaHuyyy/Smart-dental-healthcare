"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, Stethoscope } from "lucide-react";
import { useRealtimeChat } from "@/contexts/RealtimeChatContext";
import realtimeChatService from "@/services/realtimeChatService";
import DoctorCard from "@/components/ui/DoctorCard";
import { toast } from "sonner";

interface Doctor {
  _id: string;
  id?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  specialty?: string;
  specialization?: string; // sometimes used
  rating?: number;
  experienceYears?: number;
  bio?: string;
  address?: string;
  avatarUrl?: string;
  isActive?: boolean;
}

const specialtiesFallback = [
  "Nha khoa tổng quát",
  "Chỉnh nha",
  "Răng - Hàm - Mặt",
  "Nhổ răng khôn",
  "Điều trị tủy",
  "Thẩm mỹ răng",
];

function DoctorSkeleton() {
  return (
    <div className="healthcare-card animate-pulse">
      <div className="p-6 flex gap-4">
        <div className="w-14 h-14 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-200 rounded w-1/4" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    </div>
  );
}

export default function PatientDoctorsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [query, setQuery] = useState<string>("");
  const [specialty, setSpecialty] = useState<string>("all");

  // Read initial query params on client only to avoid prerender issues
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q");
      const sp = params.get("specialty");
      if (q) setQuery(q);
      if (sp) setSpecialty(sp);
    } catch {
      // ignore
    }
  }, []);

  const filtered = useMemo(() => {
    let list = doctors;
    if (specialty && specialty !== "all") {
      list = list.filter((d) =>
        (d.specialty || d.specialization || "").toLowerCase().includes(specialty.toLowerCase())
      );
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (d) =>
          (d.fullName || "").toLowerCase().includes(q) ||
          (d.email || "").toLowerCase().includes(q) ||
          (d.specialty || d.specialization || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [doctors, specialty, query]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Use Next API route that proxies to backend
        const url = new URL("/api/users/doctors", window.location.origin);
        const sp = new URLSearchParams();
        // allow backend filters if exist, e.g., search, specialty
        if (query) sp.set("search", query);
        if (specialty && specialty !== "all") sp.set("specialty", specialty);
        url.search = sp.toString();

        const res = await fetch(url.toString(), { method: "GET" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = data?.data || data?.users || data?.results || data || [];
        const arr: Doctor[] = Array.isArray(list) ? list : list?.result || [];
        setDoctors(arr);
      } catch {
        console.error("load doctors failed");
        setError("Không tải được danh sách bác sĩ. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    }

    load();
    // Sync URL params (for shareable filter URLs)
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (specialty && specialty !== "all") params.set("specialty", specialty);
    const qs = params.toString();
    const newUrl = qs ? `/patient/doctors?${qs}` : "/patient/doctors";
    window.history.replaceState(null, "", newUrl);
  }, [query, specialty]);

  const onBook = (doctor: Doctor) => {
    const id = doctor._id || doctor.id;
    const name = doctor.fullName;
    const qs = new URLSearchParams();
    if (id) qs.set("doctorId", id);
    if (name) qs.set("doctorName", name);
    router.push(`/patient/appointments?${qs.toString()}`);
  };

  useRealtimeChat();
  const [creatingConvFor, setCreatingConvFor] = useState<string | null>(null);

  // Use SharedChatView's localStorage/newConversation flow: store doctorId into localStorage
  // and navigate to /patient/chat?newConversation=true. SharedChatView will create via socket if needed.
  const onChat = async (doctor: Doctor) => {
    const doctorId = doctor._id || doctor.id;
    if (!doctorId) return;
    try {
      setCreatingConvFor(doctorId);
      // If socket is connected, try to create conversation immediately via socket
      if (realtimeChatService.isConnected()) {
        try {
          const userInfo = realtimeChatService.getUserInfo();
          const resp = await realtimeChatService.createConversation(userInfo.userId || "", doctorId);

          // store the returned conversation or its id into localStorage for SharedChatView to pick up
          try {
            localStorage.setItem("newConversation", JSON.stringify(resp));
          } catch {
            // ignore
          }

          router.push(`/patient/chat?newConversation=true`);
          toast.success("Đang mở cửa sổ chat", { description: "Cuộc hội thoại đã được tạo và mở" });
          return;
        } catch (socketErr) {
          console.warn("Socket createConversation failed, falling back to doctorId flow", socketErr);
          // fallback to doctorId-based flow below
        }
      }

      // Fallback: Save data for SharedChatView to pick up and create via socket on chat page
      const payload = { doctorId };
      try {
        localStorage.setItem("newConversation", JSON.stringify(payload));
      } catch {
        // ignore storage errors
      }

      // Navigate to chat page which will read localStorage and create/join via socket
      router.push(`/patient/chat?newConversation=true`);
      // Optionally show a quick success toast
      toast.success("Đang mở cửa sổ chat", { description: "Đang tạo/khôi phục cuộc hội thoại với bác sĩ" });
    } catch (err) {
      console.error("Failed to start/open conversation", err);
      toast.error("Không thể mở chat", { description: "Vui lòng thử lại sau" });
    } finally {
      setCreatingConvFor(null);
    }
  };

  const uniqueSpecialties = useMemo(() => {
    const s = new Set<string>();
    doctors.forEach((d) => {
      const sp = (d.specialty || d.specialization || "").trim();
      if (sp) s.add(sp);
    });
    const arr = Array.from(s);
    return arr.length ? arr : specialtiesFallback;
  }, [doctors]);

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"
            >
              <Stethoscope className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Bác sĩ</h1>
              <p className="text-sm text-gray-600">Xem hồ sơ và đặt lịch với bác sĩ phù hợp</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="healthcare-card p-4">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
            <div className="flex-1 flex items-center gap-3 bg-white border rounded-xl px-3 py-2">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm theo tên, email, chuyên khoa..."
                className="flex-1 outline-none text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="border rounded-xl px-3 py-2 text-sm bg-white"
              >
                <option value="all">Tất cả chuyên khoa</option>
                {uniqueSpecialties.map((sp) => (
                  <option key={sp} value={sp}>
                    {sp}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <DoctorSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="healthcare-card p-6 text-center text-red-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="healthcare-card p-6 text-center">Không tìm thấy bác sĩ phù hợp.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((d) => (
              <DoctorCard
                key={d._id || d.id || d.fullName}
                doctor={d}
                creatingConvFor={creatingConvFor}
                onView={(doc) => router.push(`/patient/doctors/${doc._id || doc.id}`)}
                onBook={onBook}
                onChat={onChat}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
