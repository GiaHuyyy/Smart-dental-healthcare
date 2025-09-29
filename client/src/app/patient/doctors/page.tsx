"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Users, Star, Search, Filter, MessageSquare, Calendar, Phone, MapPin, Stethoscope } from "lucide-react";

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
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [query, setQuery] = useState<string>(searchParams.get("q") || "");
  const [specialty, setSpecialty] = useState<string>(searchParams.get("specialty") || "all");

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
      } catch (e) {
        console.error("load doctors failed", e);
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

  const onChat = (doctor: Doctor) => {
    const name = doctor.fullName;
    const qs = new URLSearchParams();
    if (name) qs.set("to", name);
    router.push(`/patient/chat?${qs.toString()}`);
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
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="healthcare-card-elevated p-6">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
              style={{
                backgroundImage: `linear-gradient(to bottom right, var(--color-primary), var(--color-primary-600))`,
              }}
            >
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="healthcare-heading text-3xl">Bác sĩ</h1>
              <p className="healthcare-body mt-1">Xem hồ sơ và đặt lịch với bác sĩ phù hợp</p>
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
            {filtered.map((d) => {
              const id = d._id || d.id;
              const name = d.fullName || "Chưa rõ tên";
              const sp = d.specialty || d.specialization || "Đa khoa";
              const rating = d.rating ?? 4.7;
              const exp = d.experienceYears ?? 5;
              return (
                <div key={id || name} className="healthcare-card group">
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      {d.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.avatarUrl} alt={name} className="w-14 h-14 rounded-full object-cover" />
                      ) : (
                        <div
                          className="w-14 h-14 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: "var(--color-primary-50)" }}
                        >
                          <Users className="w-7 h-7" style={{ color: "var(--color-primary)" }} />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-gray-900">{name}</div>
                        <div className="text-sm text-gray-600">{sp}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      {rating} • {exp}+ năm kinh nghiệm
                    </div>
                    {d.address && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <MapPin className="w-4 h-4" /> {d.address}
                      </div>
                    )}
                    {d.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                        <Phone className="w-4 h-4" /> {d.phone}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {id && (
                        <Link href={`/patient/doctors/${id}`} className="btn-healthcare-secondary flex-1 text-center">
                          Xem chi tiết
                        </Link>
                      )}
                      <button className="btn-healthcare-primary flex-1" onClick={() => onBook(d)}>
                        <Calendar className="w-4 h-4 mr-1" /> Đặt lịch
                      </button>
                      <button className="btn-healthcare ghost flex-1 border" onClick={() => onChat(d)}>
                        <MessageSquare className="w-4 h-4 mr-1" /> Chat
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
