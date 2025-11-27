"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Star,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ArrowLeft,
  Stethoscope,
  Clock,
  MessageSquare,
  Edit2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import ReviewModal from "@/components/appointments/ReviewModal";

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

interface Review {
  _id: string;
  rating: number;
  comment: string;
  patientId?: {
    _id?: string;
    fullName?: string;
    name?: string;
  };
  createdAt: string;
  editCount?: number;
  editedAt?: string;
}

export default function DoctorDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const doctorId = (params?.id as string) || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [related, setRelated] = useState<Doctor[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewStats, setReviewStats] = useState<{ averageRating: number; totalReviews: number } | null>(null);

  // Edit review states
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Ref for scrolling to highlighted review
  const reviewRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!doctorId) return;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Fetch single doctor
        const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
        const res = await fetch(`${API_URL}/api/v1/users/${doctorId}`);
        const data = await res.json();
        const item: Doctor | null = (data?.data || data) as Doctor;
        setDoctor(item);
        // Related by specialty
        const spec = item?.specialty || item?.specialization || "";
        if (spec) {
          const relRes = await fetch(`${API_URL}/api/v1/users/doctors?specialty=${encodeURIComponent(spec)}`);
          const relData = await relRes.json();
          const list = relData?.data || relData?.users || relData?.results || relData || [];
          const maybe = list as unknown as { result?: Doctor[] };
          const arr: Doctor[] = Array.isArray(list) ? (list as Doctor[]) : maybe?.result || [];
          const rel = arr.filter((d) => (d._id || d.id) !== doctorId).slice(0, 3);
          setRelated(rel);
        } else {
          setRelated([]);
        }

        // Load reviews
        setLoadingReviews(true);
        try {
          const reviewsRes = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/reviews/doctor/${doctorId}?page=1&limit=10`
          );
          const reviewsData = await reviewsRes.json();
          const reviewsList = reviewsData?.data?.data || reviewsData?.data || [];
          setReviews(Array.isArray(reviewsList) ? reviewsList : []);

          // Load rating stats
          const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/reviews/doctor/${doctorId}/rating`);
          if (res.ok) {
            const statsData = await res.json();
            setReviewStats({
              averageRating: statsData.averageRating || 0,
              totalReviews: statsData.totalReviews || 0,
            });
          }
        } catch (e) {
          console.warn("Failed to load reviews", e);
        } finally {
          setLoadingReviews(false);
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

  // Scroll to highlighted review
  useEffect(() => {
    const highlightReview = searchParams?.get("highlightReview");
    const appointmentId = searchParams?.get("appointmentId");

    if (highlightReview === "true" && appointmentId && reviews.length > 0) {
      // Find the review for this appointment
      const targetReview = reviews.find((r) => {
        // We need to match by appointmentId stored in refId
        // Since reviews don't directly include appointmentId in the list response,
        // we'll scroll to the first review by the current user
        const userId = (session?.user as { _id?: string })?._id;
        return r.patientId?._id === userId;
      });

      if (targetReview && reviewRefs.current[targetReview._id]) {
        setTimeout(() => {
          reviewRefs.current[targetReview._id]?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          // Add highlight animation
          const element = reviewRefs.current[targetReview._id];
          if (element) {
            element.classList.add("ring-2", "ring-primary", "ring-offset-2");
            setTimeout(() => {
              element.classList.remove("ring-2", "ring-primary", "ring-offset-2");
            }, 3000);
          }
        }, 500);
      }
    }
  }, [reviews, searchParams, session]);

  const handleEditReview = (review: Review) => {
    if (review.editCount && review.editCount >= 1) {
      toast.error("Bạn đã sửa đánh giá này rồi", {
        description: "Mỗi đánh giá chỉ được phép sửa một lần",
      });
      return;
    }
    setEditingReview(review);
    setEditModalOpen(true);
  };

  const handleSubmitEditReview = async (rating: number, comment: string) => {
    if (!editingReview || !session?.user) return;

    try {
      const accessToken = (session as any)?.access_token;
      const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await fetch(`${API_URL}/api/v1/reviews/${editingReview._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({
          rating,
          comment,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Update review error response:", errorData);
        throw new Error(errorData.error || errorData.message || "Không thể cập nhật đánh giá");
      }

      toast.success("Đã cập nhật đánh giá!");
      setEditModalOpen(false);
      setEditingReview(null);

      // Reload reviews
      const reviewsRes = await fetch(`${API_URL}/api/v1/reviews/doctor/${doctorId}?page=1&limit=10`);
      const reviewsData = await reviewsRes.json();
      const reviewsList = reviewsData?.data?.data || reviewsData?.data || [];
      setReviews(Array.isArray(reviewsList) ? reviewsList : []);

      // Reload rating stats
      const statsRes = await fetch(`${API_URL}/api/v1/reviews/doctor/${doctorId}/rating`);
      const statsData = await statsRes.json();
      if (statsData?.data) {
        setReviewStats({
          averageRating: statsData.data.averageRating || 0,
          totalReviews: statsData.data.totalReviews || 0,
        });
      }
    } catch (error) {
      console.error("Update review error:", error);
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật đánh giá");
      throw error;
    }
  };

  const canEditReview = (review: Review): boolean => {
    const userId = (session?.user as { _id?: string })?._id;
    return review.patientId?._id === userId && (!review.editCount || review.editCount < 1);
  };

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
  const displayRating = reviewStats?.averageRating ? reviewStats.averageRating.toFixed(1) : "Chưa có";
  const exp = doctor.experienceYears ?? 5;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
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
                <Star className="w-4 h-4 text-yellow-400 fill-current" /> {displayRating} • {exp}+ năm kinh nghiệm
              </div>
              <div className="flex items-center gap-3 mt-4">
                <Link
                  href="/patient/doctors"
                  className="inline-flex items-center justify-center border-2 border-primary text-primary rounded-xl py-3 px-4 text-sm font-medium hover:shadow-sm transition"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
                </Link>

                <button
                  className="flex-1 cursor-pointer inline-flex items-center justify-center bg-primary text-white rounded-xl py-3 px-6 text-sm font-semibold shadow-md hover:brightness-95 transition"
                  onClick={onBook}
                >
                  <Calendar className="w-4 h-4 mr-2" /> Đặt lịch
                </button>

                <button
                  className="inline-flex border-primary text-primary items-center cursor-pointer hover:bg-gray-50 transition"
                  onClick={onChat}
                  aria-label={`Chat với ${name}`}
                >
                  <span className="w-10 h-10 flex items-center justify-center border rounded-lg">
                    <MessageSquare className="w-5 h-5" />
                  </span>
                </button>
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

        {/* Reviews Section */}
        <div className="healthcare-card-elevated p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="healthcare-subheading">Đánh giá từ bệnh nhân</h3>
            {reviewStats && (
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                <span className="text-lg font-bold text-gray-900">{reviewStats.averageRating.toFixed(1)}</span>
                <span className="text-sm text-gray-600">({reviewStats.totalReviews} đánh giá)</span>
              </div>
            )}
          </div>

          {loadingReviews ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-primary"></div>
              <p className="text-gray-600 mt-2 text-sm">Đang tải đánh giá...</p>
            </div>
          ) : reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review._id}
                  ref={(el) => {
                    reviewRefs.current[review._id] = el;
                  }}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900">
                          {review.patientId?.fullName || review.patientId?.name || "Bệnh nhân"}
                        </h4>
                        {canEditReview(review) && (
                          <button
                            onClick={() => handleEditReview(review)}
                            className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Sửa
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(review.createdAt).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                        {review.editedAt && <span className="ml-2 text-gray-400">(đã chỉnh sửa)</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg ml-3">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm font-semibold text-yellow-700">{review.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">{review.comment}</p>
                  {review.editCount && review.editCount >= 1 ? (
                    <p className="text-xs text-gray-400 mt-2 italic">
                      * Đánh giá này đã được chỉnh sửa và không thể sửa lại
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
              <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 text-sm">Chưa có đánh giá nào</p>
              <p className="text-gray-500 text-xs mt-1">Hãy là người đầu tiên đánh giá bác sĩ sau khi khám</p>
            </div>
          )}
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

      {/* Edit Review Modal */}
      {editModalOpen && editingReview && (
        <ReviewModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditingReview(null);
          }}
          doctorName={doctor?.fullName || ""}
          doctorId={doctorId}
          appointmentId={editingReview._id}
          onSubmit={handleSubmitEditReview}
          initialRating={editingReview.rating}
          initialComment={editingReview.comment}
          isEditing={true}
          warningMessage="⚠️ Lưu ý: Một khi đã gửi chỉnh sửa, bạn sẽ không thể sửa lại lần nữa."
        />
      )}
    </div>
  );
}
