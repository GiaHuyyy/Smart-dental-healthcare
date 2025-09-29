"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Star, Calendar, Phone, Mail, MapPin, ArrowLeft, Stethoscope, Clock, MessageSquare } from "lucide-react";

interface Doctor {
  _id: string;
  id?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  specialty?: string;
  specialization?: string;
  rating?: number;
  experienceYears?: number;
  bio?: string;
  address?: string;
  avatarUrl?: string;
}

export default function DoctorDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const doctorId = (params?.id as string) || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [related, setRelated] = useState<Doctor[]>([]);

  useEffect(() => {
    if (!doctorId) return;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Fetch single doctor
        const res = await fetch(`/api/users/${doctorId}`);
        const data = await res.json();
        const item: Doctor | null = (data?.data || data) as Doctor;
        setDoctor(item);
        // Related by specialty
        const spec = item?.specialty || item?.specialization || "";
        if (spec) {
          const relRes = await fetch(`/api/users/doctors?specialty=${encodeURIComponent(spec)}`);
          const relData = await relRes.json();
          const list = relData?.data || relData?.users || relData?.results || relData || [];
          const maybe = list as unknown as { result?: Doctor[] };
          const arr: Doctor[] = Array.isArray(list) ? (list as Doctor[]) : maybe?.result || [];
          const rel = arr.filter((d) => (d._id || d.id) !== doctorId).slice(0, 3);
          setRelated(rel);
        } else {
          setRelated([]);
        }
      } catch (e) {
        console.error("load doctor failed", e);
        setError("Không tải được thông tin bác sĩ.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [doctorId]);

  const onBook = () => {
    if (!doctor) return;
    const qs = new URLSearchParams();
    const id = doctor._id || doctor.id;
    if (id) qs.set("doctorId", id);
    if (doctor.fullName) qs.set("doctorName", doctor.fullName);
    router.push(`/patient/appointments?${qs.toString()}`);
  };

  const onChat = () => {
    if (!doctor) return;
    const qs = new URLSearchParams();
    if (doctor.fullName) qs.set("to", doctor.fullName);
    router.push(`/patient/chat?${qs.toString()}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="healthcare-card p-6 animate-pulse h-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="healthcare-card p-6 animate-pulse h-56" />
            <div className="healthcare-card p-6 animate-pulse h-56" />
            <div className="healthcare-card p-6 animate-pulse h-56" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-3xl mx-auto">
          <div className="healthcare-card p-6 text-center">
            <p className="text-gray-600">{error || "Không tìm thấy bác sĩ"}</p>
            <Link href="/patient/doctors" className="btn-healthcare-secondary mt-4 inline-flex items-center">
              <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại danh sách
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const name = doctor.fullName || "Chưa rõ tên";
  const sp = doctor.specialty || doctor.specialization || "Đa khoa";
  const rating = doctor.rating ?? 4.8;
  const exp = doctor.experienceYears ?? 5;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="healthcare-card-elevated p-6">
          <div className="flex items-start gap-4">
            {doctor.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={doctor.avatarUrl} alt={name} className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "var(--color-primary-50)" }}
              >
                <Users className="w-10 h-10" style={{ color: "var(--color-primary)" }} />
              </div>
            )}
            <div className="flex-1">
              <h1 className="healthcare-heading text-3xl">{name}</h1>
              <p className="healthcare-body">{sp}</p>
              <div className="flex items-center gap-3 text-sm text-gray-600 mt-2">
                <Star className="w-4 h-4 text-yellow-400 fill-current" /> {rating} • {exp}+ năm kinh nghiệm
              </div>
              <div className="flex gap-2 mt-4">
                <button className="btn-healthcare-primary" onClick={onBook}>
                  <Calendar className="w-4 h-4 mr-1" /> Đặt lịch
                </button>
                <button className="btn-healthcare ghost border" onClick={onChat}>
                  <MessageSquare className="w-4 h-4 mr-1" /> Chat
                </button>
                <Link href="/patient/doctors" className="btn-healthcare-secondary">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="healthcare-card p-6 space-y-3">
            <div className="flex items-center gap-2 text-gray-700">
              <Phone className="w-4 h-4" /> {doctor.phone || "Chưa cập nhật"}
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Mail className="w-4 h-4" /> {doctor.email || "Chưa cập nhật"}
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <MapPin className="w-4 h-4" /> {doctor.address || "Chưa cập nhật"}
            </div>
          </div>
          <div className="healthcare-card p-6">
            <div className="flex items-center gap-2 mb-2">
              <Stethoscope className="w-4 h-4" />
              <h3 className="font-semibold">Giới thiệu</h3>
            </div>
            <p className="text-gray-700 text-sm leading-6">
              {doctor.bio ||
                "Bác sĩ tận tâm, nhiều năm kinh nghiệm trong khám và điều trị nha khoa. Luôn đặt lợi ích và trải nghiệm của bệnh nhân lên hàng đầu."}
            </p>
          </div>
          <div className="healthcare-card p-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4" />
              <h3 className="font-semibold">Thời gian làm việc</h3>
            </div>
            <p className="text-gray-700 text-sm">Thứ 2 - Thứ 7: 08:00 - 17:00</p>
            <p className="text-gray-700 text-sm">Chủ nhật: Nghỉ</p>
          </div>
        </div>

        {/* Related doctors */}
        {related.length > 0 && (
          <div className="space-y-3">
            <h3 className="healthcare-subheading">Bác sĩ cùng chuyên khoa</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map((r) => {
                const rid = r._id || r.id;
                const rname = r.fullName || "Chưa rõ";
                return (
                  <Link key={rid || rname} href={`/patient/doctors/${rid}`} className="healthcare-card p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "var(--color-primary-50)" }}
                      >
                        <Users className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                      </div>
                      <div>
                        <div className="font-medium">{rname}</div>
                        <div className="text-sm text-gray-600">{r.specialty || r.specialization}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
