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

const DOCTORS_PER_PAGE = 6;

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
  const [currentPage, setCurrentPage] = useState(1);

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

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query, specialty]);

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
        const url = new URL(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/users/doctors`, window.location.origin);
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Bác sĩ</h1>
              <p className="text-sm text-gray-600">Xem hồ sơ và đặt lịch với bác sĩ phù hợp</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm theo tên, email, chuyên khoa..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white"
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
          (() => {
            const totalPages = Math.ceil(filtered.length / DOCTORS_PER_PAGE);
            const startIndex = (currentPage - 1) * DOCTORS_PER_PAGE;
            const endIndex = startIndex + DOCTORS_PER_PAGE;
            const currentDoctors = filtered.slice(startIndex, endIndex);

            const handlePageChange = (page: number) => {
              setCurrentPage(page);
              window.scrollTo({ top: 0, behavior: "smooth" });
            };

            return (
              <div className="space-y-6 mt-6">
                {/* Header with pagination */}
                <div className="flex items-center justify-between">
                  <p className="text-gray-600">
                    Hiển thị{" "}
                    <span className="font-semibold text-gray-900">
                      {startIndex + 1}-{Math.min(endIndex, filtered.length)}
                    </span>{" "}
                    trong tổng số <span className="font-semibold text-gray-900">{filtered.length}</span> bác sĩ
                  </p>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
                      >
                        Trước
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                          return (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`w-8 h-8 rounded-lg transition text-sm ${
                                currentPage === page
                                  ? "bg-[var(--color-primary)] text-white"
                                  : "border border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              {page}
                            </button>
                          );
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                          return (
                            <span key={page} className="px-1">
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
                      >
                        Tiếp
                      </button>
                    </div>
                  )}
                </div>

                {/* Doctor Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentDoctors.map((d) => (
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
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
