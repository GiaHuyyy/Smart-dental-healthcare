"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Stethoscope,
  Star,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ArrowLeft,
  MessageSquare,
  Edit2,
  User,
  Cake,
  Briefcase,
  GraduationCap,
  BadgeDollarSign,
  Building2,
  Wrench,
  Clock,
  Save,
  X,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Image from "next/image";
import ReviewModal from "@/components/appointments/ReviewModal";

interface ClinicImage {
  url: string;
  caption?: string;
  order?: number;
}

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
  // Additional doctor fields
  dateOfBirth?: string;
  gender?: string;
  qualifications?: string;
  services?: string[];
  workAddress?: string;
  consultationFee?: number;
  workingHours?: WorkingHourItem[];
  // Clinic info
  clinicName?: string;
  clinicDescription?: string;
  clinicImages?: ClinicImage[];
}

interface WorkingHourItem {
  day: string;
  time: string;
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

interface DoctorProfileProps {
  doctorId: string;
  /** Chế độ xem: "patient" cho bệnh nhân xem, "doctor" cho bác sĩ xem profile của mình */
  viewMode: "patient" | "doctor";
  /** Callback khi click nút đặt lịch (chỉ dùng cho patient mode) */
  onBook?: () => void;
  /** Callback khi click nút chat (chỉ dùng cho patient mode) */
  onChat?: () => void;
  /** Link quay lại */
  backLink?: string;
  /** Highlight review từ URL params */
  highlightReviewId?: string;
  /** Appointment ID để highlight review */
  appointmentId?: string;
}

export default function DoctorProfile({
  doctorId,
  viewMode,
  onBook,
  onChat,
  backLink = "/patient/doctors",
  highlightReviewId,
  appointmentId,
}: DoctorProfileProps) {
  const { data: session } = useSession();

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

  // Inline edit states for Bio
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editBioValue, setEditBioValue] = useState("");
  const [savingBio, setSavingBio] = useState(false);

  // Inline edit states for Working Hours
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [editHoursValue, setEditHoursValue] = useState<WorkingHourItem[]>([]);
  const [savingHours, setSavingHours] = useState(false);

  // Inline edit states for Clinic Info
  const [isEditingClinic, setIsEditingClinic] = useState(false);
  const [editClinicName, setEditClinicName] = useState("");
  const [editClinicDescription, setEditClinicDescription] = useState("");
  const [editClinicImages, setEditClinicImages] = useState<ClinicImage[]>([]);
  const [pendingImageFiles, setPendingImageFiles] = useState<File[]>([]);
  const [savingClinic, setSavingClinic] = useState(false);
  const clinicImageInputRef = useRef<HTMLInputElement>(null);

  // Image lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Default working hours
  const defaultWorkingHours: WorkingHourItem[] = [
    { day: "Thứ 2 - Thứ 7", time: "08:00 - 17:00" },
    { day: "Chủ nhật", time: "Nghỉ" },
  ];

  // Default bio template
  const defaultBioTemplate = `Tôi là bác sĩ nha khoa với nhiều năm kinh nghiệm trong lĩnh vực chăm sóc sức khỏe răng miệng. Tôi luôn tận tâm với công việc và đặt sự hài lòng của bệnh nhân lên hàng đầu.

Chuyên môn của tôi bao gồm:
• Khám và tư vấn sức khỏe răng miệng
• Điều trị các bệnh lý nha khoa
• Chỉnh nha và thẩm mỹ răng

Tôi cam kết mang đến dịch vụ chất lượng cao, an toàn và hiệu quả cho mọi bệnh nhân.`;

  // Ref for scrolling to highlighted review
  const reviewRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!doctorId) return;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Fetch single doctor (user info)
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/users/${doctorId}`);
        const data = await res.json();
        let item: Doctor | null = (data?.data || data) as Doctor;

        // Fetch doctor profile (bio, workingHours) - merge with user info
        try {
          const profileRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/doctor-profile/${doctorId}`);
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            const profile = profileData?.data;
            if (profile && item) {
              item = {
                ...item,
                bio: profile.bio || item.bio,
                workingHours: profile.workingHours || item.workingHours,
                clinicName: profile.clinicName || item.clinicName,
                clinicDescription: profile.clinicDescription || item.clinicDescription,
                clinicImages: profile.clinicImages || item.clinicImages,
              };
            }
          }
        } catch (profileError) {
          console.warn("Failed to load doctor profile:", profileError);
        }

        setDoctor(item);

        // Related by specialty (only for patient view)
        if (viewMode === "patient") {
          const spec = item?.specialty || item?.specialization || "";
          if (spec) {
            const relRes = await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/users/doctors?specialty=${encodeURIComponent(spec)}`
            );
            const relData = await relRes.json();
            const list = relData?.data || relData?.users || relData?.results || relData || [];
            const maybe = list as unknown as { result?: Doctor[] };
            const arr: Doctor[] = Array.isArray(list) ? (list as Doctor[]) : maybe?.result || [];
            const rel = arr.filter((d) => (d._id || d.id) !== doctorId).slice(0, 3);
            setRelated(rel);
          } else {
            setRelated([]);
          }
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
          const statsRes = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/reviews/doctor/${doctorId}/rating`
          );
          if (statsRes.ok) {
            const statsData = await statsRes.json();
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
  }, [doctorId, viewMode]);

  // Scroll to highlighted review
  useEffect(() => {
    if (highlightReviewId === "true" && appointmentId && reviews.length > 0) {
      const userId = (session?.user as { _id?: string })?._id;
      const targetReview = reviews.find((r) => r.patientId?._id === userId);

      if (targetReview && reviewRefs.current[targetReview._id]) {
        setTimeout(() => {
          reviewRefs.current[targetReview._id]?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
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
  }, [reviews, highlightReviewId, appointmentId, session]);

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
      const accessToken = (session as unknown as { access_token?: string })?.access_token;
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/reviews/${editingReview._id}`, {
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
      const reviewsRes = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/reviews/doctor/${doctorId}?page=1&limit=10`
      );
      const reviewsData = await reviewsRes.json();
      const reviewsList = reviewsData?.data?.data || reviewsData?.data || [];
      setReviews(Array.isArray(reviewsList) ? reviewsList : []);

      // Reload rating stats
      const statsRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/reviews/doctor/${doctorId}/rating`);
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
    if (viewMode === "doctor") return false; // Bác sĩ không được sửa review
    const userId = (session?.user as { _id?: string })?._id;
    return review.patientId?._id === userId && (!review.editCount || review.editCount < 1);
  };

  // Handle Bio inline editing
  const handleStartEditBio = () => {
    // If bio is empty, load default template
    const bioToEdit = doctor?.bio?.trim() ? doctor.bio : defaultBioTemplate;
    setEditBioValue(bioToEdit);
    setIsEditingBio(true);
  };

  const handleCancelEditBio = () => {
    setIsEditingBio(false);
    setEditBioValue("");
  };

  const handleSaveBio = async () => {
    if (!doctor || !session) return;

    setSavingBio(true);
    try {
      const accessToken = (session as unknown as { access_token?: string })?.access_token;
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/doctor-profile/me/bio`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({
          bio: editBioValue,
        }),
      });

      if (!response.ok) {
        throw new Error("Không thể cập nhật giới thiệu");
      }

      // Update local state
      setDoctor({ ...doctor, bio: editBioValue });
      setIsEditingBio(false);
      toast.success("Đã cập nhật giới thiệu!");
    } catch (error) {
      console.error("Update bio error:", error);
      toast.error("Không thể cập nhật giới thiệu");
    } finally {
      setSavingBio(false);
    }
  };

  // Handle Working Hours inline editing
  const handleStartEditHours = () => {
    const currentHours = doctor?.workingHours || defaultWorkingHours;
    setEditHoursValue([...currentHours]);
    setIsEditingHours(true);
  };

  const handleCancelEditHours = () => {
    setIsEditingHours(false);
    setEditHoursValue([]);
  };

  const handleAddHourItem = () => {
    setEditHoursValue([...editHoursValue, { day: "", time: "" }]);
  };

  const handleRemoveHourItem = (index: number) => {
    setEditHoursValue(editHoursValue.filter((_, i) => i !== index));
  };

  const handleUpdateHourItem = (index: number, field: "day" | "time", value: string) => {
    const updated = [...editHoursValue];
    updated[index] = { ...updated[index], [field]: value };
    setEditHoursValue(updated);
  };

  const handleSaveHours = async () => {
    if (!doctor || !session) return;

    // Validate
    const validHours = editHoursValue.filter((h) => h.day.trim() && h.time.trim());
    if (validHours.length === 0) {
      toast.error("Vui lòng thêm ít nhất một mục thời gian làm việc");
      return;
    }

    setSavingHours(true);
    try {
      const accessToken = (session as unknown as { access_token?: string })?.access_token;
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/doctor-profile/me/working-hours`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({
          workingHours: validHours,
        }),
      });

      if (!response.ok) {
        throw new Error("Không thể cập nhật thời gian làm việc");
      }

      // Update local state
      setDoctor({ ...doctor, workingHours: validHours });
      setIsEditingHours(false);
      toast.success("Đã cập nhật thời gian làm việc!");
    } catch (error) {
      console.error("Update working hours error:", error);
      toast.error("Không thể cập nhật thời gian làm việc");
    } finally {
      setSavingHours(false);
    }
  };

  // Handle Clinic Info inline editing
  const handleStartEditClinic = () => {
    setEditClinicName(doctor?.clinicName || "");
    setEditClinicDescription(doctor?.clinicDescription || "");
    setEditClinicImages(doctor?.clinicImages || []);
    setPendingImageFiles([]);
    setIsEditingClinic(true);
  };

  const handleCancelEditClinic = () => {
    setIsEditingClinic(false);
    setEditClinicName("");
    setEditClinicDescription("");
    setEditClinicImages([]);
    setPendingImageFiles([]);
  };

  const handleClinicImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    // Validate file types
    const validFiles = newFiles.filter((file) => file.type.startsWith("image/"));
    if (validFiles.length !== newFiles.length) {
      toast.error("Chỉ được upload file ảnh");
    }

    setPendingImageFiles((prev) => [...prev, ...validFiles]);

    // Reset input
    if (clinicImageInputRef.current) {
      clinicImageInputRef.current.value = "";
    }
  };

  const handleRemovePendingImage = (index: number) => {
    setPendingImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingImage = (imageUrl: string) => {
    setEditClinicImages((prev) => prev.filter((img) => img.url !== imageUrl));
  };

  const handleSaveClinic = async () => {
    if (!doctor || !session) return;

    setSavingClinic(true);
    try {
      const accessToken = (session as unknown as { access_token?: string })?.access_token;

      // Upload pending images first
      const uploadedImages: ClinicImage[] = [];
      for (const file of pendingImageFiles) {
        const formData = new FormData();
        formData.append("image", file);

        const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/doctor-profile/me/clinic-images`, {
          method: "POST",
          headers: {
            ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
          },
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          if (uploadData.imageUrl) {
            uploadedImages.push({ url: uploadData.imageUrl, order: editClinicImages.length + uploadedImages.length });
          }
        }
      }

      // Update clinic info
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/doctor-profile/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({
          clinicName: editClinicName,
          clinicDescription: editClinicDescription,
          clinicImages: [...editClinicImages, ...uploadedImages],
        }),
      });

      if (!response.ok) {
        throw new Error("Không thể cập nhật thông tin phòng khám");
      }

      // Update local state
      setDoctor({
        ...doctor,
        clinicName: editClinicName,
        clinicDescription: editClinicDescription,
        clinicImages: [...editClinicImages, ...uploadedImages],
      });
      setIsEditingClinic(false);
      setPendingImageFiles([]);
      toast.success("Đã cập nhật thông tin phòng khám!");
    } catch (error) {
      console.error("Update clinic error:", error);
      toast.error("Không thể cập nhật thông tin phòng khám");
    } finally {
      setSavingClinic(false);
    }
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
            <p className="text-gray-600">{error || "Không tìm thấy thông tin bác sĩ"}</p>
            {backLink && (
              <Link href={backLink} className="btn-healthcare-secondary mt-4 inline-flex items-center">
                <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const name = doctor.fullName || "Chưa rõ tên";
  const sp = doctor.specialty || doctor.specialization || "Đa khoa";
  const displayRating = reviewStats?.averageRating ? reviewStats.averageRating.toFixed(1) : "Chưa có";
  const exp = doctor.experienceYears ?? 0;

  // Format date of birth
  const formatDateOfBirth = (dateStr?: string) => {
    if (!dateStr) return "Chưa cập nhật";
    try {
      return new Date(dateStr).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "Chưa cập nhật";
    }
  };

  // Format consultation fee
  const formatConsultationFee = (fee?: number) => {
    if (!fee) return "Chưa cập nhật";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(fee);
  };

  // Format gender
  const formatGender = (gender?: string) => {
    if (!gender) return "Chưa cập nhật";
    switch (gender.toLowerCase()) {
      case "male":
        return "Nam";
      case "female":
        return "Nữ";
      default:
        return gender;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8 pb-6">
        {/* Doctor Information Section */}
        <div className="healthcare-card-elevated p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="healthcare-subheading flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Thông tin bác sĩ
            </h2>
            {viewMode === "doctor" && (
              <Link
                href="/doctor/settings"
                className="inline-flex items-center justify-center bg-primary text-white rounded-xl py-2 px-4 text-sm font-semibold shadow-md hover:brightness-95 transition"
              >
                <Edit2 className="w-4 h-4 mr-2" /> Chỉnh sửa thông tin
              </Link>
            )}
            {viewMode === "patient" && backLink && (
              <Link
                href={backLink}
                className="inline-flex items-center justify-center border-2 border-primary text-primary rounded-xl py-2 px-4 text-sm font-medium hover:shadow-sm transition"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
              </Link>
            )}
          </div>

          {/* Avatar and Basic Info */}
          <div className="flex items-start gap-6 mb-8">
            {doctor.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={doctor.avatarUrl}
                alt={name}
                className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
              />
            ) : (
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center border-4 border-primary/20"
                style={{ backgroundColor: "var(--color-primary-50)" }}
              >
                <Stethoscope className="w-12 h-12 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="healthcare-heading text-2xl mb-1">{name}</h1>
              <p className="text-primary font-medium mb-2">{sp}</p>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="font-medium">{displayRating}</span>
                  {reviewStats && <span className="text-gray-400">({reviewStats.totalReviews} đánh giá)</span>}
                </div>
                <span className="text-gray-300">|</span>
                <div className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4" />
                  <span>{exp}+ năm kinh nghiệm</span>
                </div>
              </div>

              {/* Action buttons for patient view */}
              {viewMode === "patient" && (
                <div className="flex items-center gap-3 mt-4">
                  {onBook && (
                    <button
                      className="cursor-pointer inline-flex items-center justify-center bg-primary text-white rounded-xl py-2.5 px-5 text-sm font-semibold shadow-md hover:brightness-95 transition"
                      onClick={onBook}
                    >
                      <Calendar className="w-4 h-4 mr-2" /> Đặt lịch khám
                    </button>
                  )}
                  {onChat && (
                    <button
                      className="inline-flex items-center justify-center border-2 border-primary text-primary rounded-xl py-2.5 px-5 text-sm font-semibold hover:bg-primary/5 transition"
                      onClick={onChat}
                      aria-label={`Chat với ${name}`}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" /> Nhắn tin
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Personal Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Email */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Email</p>
                <p className="text-sm font-medium text-gray-900">{doctor.email || "Chưa cập nhật"}</p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Số điện thoại</p>
                <p className="text-sm font-medium text-gray-900">{doctor.phone || "Chưa cập nhật"}</p>
              </div>
            </div>

            {/* Date of Birth */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Cake className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Ngày sinh</p>
                <p className="text-sm font-medium text-gray-900">{formatDateOfBirth(doctor.dateOfBirth)}</p>
              </div>
            </div>

            {/* Gender */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Giới tính</p>
                <p className="text-sm font-medium text-gray-900">{formatGender(doctor.gender)}</p>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Địa chỉ</p>
                <p className="text-sm font-medium text-gray-900">{doctor.address || "Chưa cập nhật"}</p>
              </div>
            </div>

            {/* Specialty */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Stethoscope className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Chuyên khoa</p>
                <p className="text-sm font-medium text-gray-900">{sp}</p>
              </div>
            </div>

            {/* Experience Years */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Số năm kinh nghiệm</p>
                <p className="text-sm font-medium text-gray-900">{exp > 0 ? `${exp} năm` : "Chưa cập nhật"}</p>
              </div>
            </div>

            {/* Qualifications */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Bằng cấp / Chứng chỉ</p>
                <p className="text-sm font-medium text-gray-900">{doctor.qualifications || "Chưa cập nhật"}</p>
              </div>
            </div>

            {/* Work Address */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Địa chỉ làm việc</p>
                <p className="text-sm font-medium text-gray-900">{doctor.workAddress || "Chưa cập nhật"}</p>
              </div>
            </div>

            {/* Consultation Fee */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <BadgeDollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Phí khám</p>
                <p className="text-sm font-medium text-gray-900">{formatConsultationFee(doctor.consultationFee)}</p>
              </div>
            </div>
          </div>

          {/* Services */}
          {doctor.services && doctor.services.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-gray-900">Dịch vụ chuyên môn</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {doctor.services.map((service, index) => (
                  <span key={index} className="px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-full">
                    {service}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Introduction and Working Hours Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Introduction Card */}
          <div className="healthcare-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-gray-900">Giới thiệu</h3>
              </div>
              {viewMode === "doctor" && !isEditingBio && (
                <button
                  onClick={handleStartEditBio}
                  className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Chỉnh sửa
                </button>
              )}
              {viewMode === "doctor" && isEditingBio && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveBio}
                    disabled={savingBio}
                    className="text-sm text-white bg-primary hover:bg-primary/90 transition-colors flex items-center gap-1 px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    {savingBio ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Lưu
                  </button>
                  <button
                    onClick={handleCancelEditBio}
                    disabled={savingBio}
                    className="text-sm text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Hủy
                  </button>
                </div>
              )}
            </div>
            {isEditingBio ? (
              <textarea
                value={editBioValue}
                onChange={(e) => setEditBioValue(e.target.value)}
                placeholder="Nhập giới thiệu về bản thân..."
                className="w-full min-h-[120px] p-3 border border-gray-300 rounded-lg text-sm text-gray-700 leading-6 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-y"
              />
            ) : (
              <p className="text-gray-700 text-sm leading-6 whitespace-pre-line">
                {doctor.bio ||
                  "Bác sĩ tận tâm, nhiều năm kinh nghiệm trong khám và điều trị nha khoa. Luôn đặt lợi ích và trải nghiệm của bệnh nhân lên hàng đầu."}
              </p>
            )}
          </div>

          {/* Working Hours Card */}
          <div className="healthcare-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-gray-900">Thời gian làm việc</h3>
              </div>
              {viewMode === "doctor" && !isEditingHours && (
                <button
                  onClick={handleStartEditHours}
                  className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Chỉnh sửa
                </button>
              )}
              {viewMode === "doctor" && isEditingHours && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveHours}
                    disabled={savingHours}
                    className="text-sm text-white bg-primary hover:bg-primary/90 transition-colors flex items-center gap-1 px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    {savingHours ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Lưu
                  </button>
                  <button
                    onClick={handleCancelEditHours}
                    disabled={savingHours}
                    className="text-sm text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Hủy
                  </button>
                </div>
              )}
            </div>
            {isEditingHours ? (
              <div className="space-y-3">
                {editHoursValue.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.day}
                      onChange={(e) => handleUpdateHourItem(index, "day", e.target.value)}
                      placeholder="Ví dụ: Thứ 2 - Thứ 6"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                    <span className="text-gray-400">:</span>
                    <input
                      type="text"
                      value={item.time}
                      onChange={(e) => handleUpdateHourItem(index, "time", e.target.value)}
                      placeholder="Ví dụ: 08:00 - 17:00"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                    <button
                      onClick={() => handleRemoveHourItem(index)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleAddHourItem}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Thêm thời gian
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {(doctor.workingHours && doctor.workingHours.length > 0
                  ? doctor.workingHours
                  : defaultWorkingHours
                ).map((item, index) => (
                  <p key={index} className="text-gray-700 text-sm">
                    {item.day}: {item.time}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Clinic Info Section - Always visible for both */}
        <div className="healthcare-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-gray-900">Về phòng khám</h3>
            </div>
            {viewMode === "doctor" && !isEditingClinic && (
              <button
                onClick={handleStartEditClinic}
                className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Chỉnh sửa
              </button>
            )}
            {viewMode === "doctor" && isEditingClinic && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveClinic}
                  disabled={savingClinic}
                  className="text-sm text-white bg-primary hover:bg-primary/90 transition-colors flex items-center gap-1 px-3 py-1.5 rounded-lg disabled:opacity-50"
                >
                  {savingClinic ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Lưu
                </button>
                <button
                  onClick={handleCancelEditClinic}
                  disabled={savingClinic}
                  className="text-sm text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                  Hủy
                </button>
              </div>
            )}
          </div>

          {viewMode === "doctor" && isEditingClinic ? (
            <div className="space-y-4">
              {/* Clinic Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên phòng khám</label>
                <input
                  type="text"
                  value={editClinicName}
                  onChange={(e) => setEditClinicName(e.target.value)}
                  placeholder="Nhập tên phòng khám..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              {/* Clinic Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả phòng khám</label>
                <textarea
                  value={editClinicDescription}
                  onChange={(e) => setEditClinicDescription(e.target.value)}
                  placeholder="Nhập mô tả về phòng khám..."
                  className="w-full min-h-20 p-3 border border-gray-300 rounded-lg text-sm text-gray-700 leading-6 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-y"
                />
              </div>

              {/* Clinic Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hình ảnh phòng khám</label>

                {/* Existing Images */}
                {editClinicImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
                    {editClinicImages.map((img, index) => (
                      <div
                        key={`existing-${index}`}
                        className="relative group aspect-video rounded-lg overflow-hidden border border-gray-200"
                      >
                        <Image
                          src={img.url}
                          alt={img.caption || `Ảnh phòng khám ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                        <button
                          onClick={() => handleRemoveExistingImage(img.url)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          title="Xóa ảnh"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pending Images Preview */}
                {pendingImageFiles.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
                    {pendingImageFiles.map((file, index) => (
                      <div
                        key={`pending-${index}`}
                        className="relative group aspect-video rounded-lg overflow-hidden border border-primary border-dashed"
                      >
                        <Image
                          src={URL.createObjectURL(file)}
                          alt={`Ảnh mới ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-primary/10" />
                        <span className="absolute bottom-1 left-1 text-xs bg-primary text-white px-1.5 py-0.5 rounded">
                          Mới
                        </span>
                        <button
                          onClick={() => handleRemovePendingImage(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          title="Xóa ảnh"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Button */}
                <input
                  ref={clinicImageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleClinicImageSelect}
                  className="hidden"
                />
                <button
                  onClick={() => clinicImageInputRef.current?.click()}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Thêm ảnh phòng khám
                </button>
                <p className="text-xs text-gray-500 mt-1">Chỉ upload file ảnh. Ảnh sẽ được tải lên khi bấm Lưu.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Display clinic name and description */}
              {doctor.clinicName && (
                <div>
                  <h4 className="font-medium text-gray-900">{doctor.clinicName}</h4>
                  {doctor.clinicDescription && (
                    <p className="text-gray-700 text-sm leading-6 mt-1 whitespace-pre-line">
                      {doctor.clinicDescription}
                    </p>
                  )}
                </div>
              )}

              {/* Display clinic images */}
              {doctor.clinicImages && doctor.clinicImages.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {doctor.clinicImages.map((img, index) => (
                    <div
                      key={index}
                      className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 cursor-pointer"
                      onClick={() => {
                        setLightboxImages(doctor.clinicImages!.map((i) => i.url));
                        setLightboxIndex(index);
                        setLightboxOpen(true);
                      }}
                    >
                      <Image
                        src={img.url}
                        alt={img.caption || `Ảnh phòng khám ${index + 1}`}
                        fill
                        className="object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                  <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Chưa có thông tin phòng khám</p>
                  {viewMode === "doctor" && (
                    <p className="text-gray-400 text-xs mt-1">
                      Thêm ảnh và mô tả để bệnh nhân hiểu rõ hơn về phòng khám của bạn
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reviews Section */}
        <div className="healthcare-card-elevated p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="healthcare-subheading">
              {viewMode === "doctor" ? "Đánh giá từ bệnh nhân của tôi" : "Đánh giá từ bệnh nhân"}
            </h3>
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
              <p className="text-gray-500 text-xs mt-1">
                {viewMode === "doctor"
                  ? "Bạn chưa có đánh giá nào từ bệnh nhân"
                  : "Hãy là người đầu tiên đánh giá bác sĩ sau khi khám"}
              </p>
            </div>
          )}
        </div>

        {/* Related doctors - only for patient view */}
        {viewMode === "patient" && related.length > 0 && (
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
                        <Stethoscope className="w-5 h-5 text-primary" />
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

      {/* Edit Review Modal - only for patient view */}
      {viewMode === "patient" && editModalOpen && editingReview && (
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

      {/* Image Lightbox Modal */}
      {lightboxOpen && lightboxImages.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 text-white hover:text-gray-300 transition-colors z-10"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Image counter */}
          <div className="absolute top-4 left-4 text-white text-sm z-10">
            {lightboxIndex + 1} / {lightboxImages.length}
          </div>

          {/* Previous button */}
          {lightboxImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) => (prev === 0 ? lightboxImages.length - 1 : prev - 1));
              }}
              className="absolute left-4 p-2 text-white hover:text-gray-300 transition-colors z-10"
            >
              <ArrowLeft className="w-8 h-8" />
            </button>
          )}

          {/* Next button */}
          {lightboxImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) => (prev === lightboxImages.length - 1 ? 0 : prev + 1));
              }}
              className="absolute right-4 p-2 text-white hover:text-gray-300 transition-colors z-10 rotate-180"
            >
              <ArrowLeft className="w-8 h-8" />
            </button>
          )}

          {/* Main image */}
          <div className="relative w-full h-full max-w-5xl max-h-[85vh] mx-4" onClick={(e) => e.stopPropagation()}>
            <Image
              src={lightboxImages[lightboxIndex]}
              alt={`Ảnh phòng khám ${lightboxIndex + 1}`}
              fill
              className="object-contain"
              sizes="(max-width: 1280px) 100vw, 1280px"
              priority
            />
          </div>

          {/* Thumbnail strip */}
          {lightboxImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[90vw] p-2">
              {lightboxImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex(idx);
                  }}
                  className={`relative w-16 h-12 rounded overflow-hidden flex-shrink-0 border-2 transition-all ${
                    idx === lightboxIndex ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <Image src={img} alt={`Thumbnail ${idx + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
