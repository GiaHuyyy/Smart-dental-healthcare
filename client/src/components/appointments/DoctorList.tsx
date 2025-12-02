"use client";

import React, { useState, useEffect, Suspense, lazy, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Building2, Stethoscope, Star, Calendar, Phone, MapPin, MessageSquare } from "lucide-react";
import { Doctor } from "@/types/appointment";
import { useRealtimeChat } from "@/contexts/RealtimeChatContext";
import realtimeChatService from "@/services/realtimeChatService";
import { toast } from "sonner";

const AppointmentsMapComponent = lazy(() => import("./AppointmentsMap"));

interface DoctorListProps {
  doctors: Doctor[];
  loading?: boolean;
  viewMode: "list" | "map";
  onDoctorSelect: (doctor: Doctor | null) => void;
  onBookAppointment: (doctor: Doctor) => void;
  selectedDoctor?: Doctor | null;
}

// Store ratings cache
const ratingsCache: Record<string, { averageRating: number; totalReviews: number }> = {};

const DOCTORS_PER_PAGE = 6;

export default function DoctorList({
  doctors,
  loading = false,
  viewMode,
  onDoctorSelect,
  onBookAppointment,
  selectedDoctor,
}: DoctorListProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [doctorRatings, setDoctorRatings] = useState<Record<string, { averageRating: number; totalReviews: number }>>(
    {}
  );
  const [creatingConvFor, setCreatingConvFor] = useState<string | null>(null);

  // Use realtime chat context
  useRealtimeChat();

  // Reset page when doctors list changes
  useEffect(() => {
    setCurrentPage(1);
  }, [doctors.length]);

  // Fetch ratings for all doctors
  useEffect(() => {
    const fetchRatings = async () => {
      const newRatings: Record<string, { averageRating: number; totalReviews: number }> = {};

      await Promise.all(
        doctors.map(async (doctor) => {
          const doctorId = doctor._id || doctor.id;
          if (!doctorId) return;

          // Check cache first
          if (ratingsCache[doctorId]) {
            newRatings[doctorId] = ratingsCache[doctorId];
            return;
          }

          try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/reviews/doctor/${doctorId}/rating`);
            // console.log(`Fetched rating for doctor ${doctorId}:`, res);
            if (res.ok) {
              const data = await res.json();
              const ratingData = {
                averageRating: data?.averageRating || 0,
                totalReviews: data?.totalReviews || 0,
              };
              newRatings[doctorId] = ratingData;
              ratingsCache[doctorId] = ratingData; // Cache it
            }
          } catch (error) {
            console.error(`Failed to fetch rating for doctor ${doctorId}:`, error);
          }
        })
      );

      setDoctorRatings((prev) => ({ ...prev, ...newRatings }));
    };

    if (doctors.length > 0) {
      fetchRatings();
    }
  }, [doctors]);

  const totalPages = Math.ceil(doctors.length / DOCTORS_PER_PAGE);
  const startIndex = (currentPage - 1) * DOCTORS_PER_PAGE;
  const endIndex = startIndex + DOCTORS_PER_PAGE;
  const currentDoctors = doctors.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleViewDoctor = useCallback(
    (doctor: Doctor) => {
      const id = doctor._id || doctor.id;
      if (id) {
        router.push(`/patient/doctors/${id}`);
      }
    },
    [router]
  );

  const handleChat = useCallback(
    async (doctor: Doctor) => {
      const doctorId = doctor._id || doctor.id;
      if (!doctorId) return;

      try {
        setCreatingConvFor(doctorId);

        if (realtimeChatService.isConnected()) {
          try {
            const userInfo = realtimeChatService.getUserInfo();
            const resp = await realtimeChatService.createConversation(userInfo.userId || "", doctorId);

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
          }
        }

        const payload = { doctorId };
        try {
          localStorage.setItem("newConversation", JSON.stringify(payload));
        } catch {
          // ignore storage errors
        }

        router.push(`/patient/chat?newConversation=true`);
        toast.success("Đang mở cửa sổ chat", { description: "Đang tạo/khôi phục cuộc hội thoại với bác sĩ" });
      } catch (err) {
        console.error("Failed to start/open conversation", err);
        toast.error("Không thể mở chat", { description: "Vui lòng thử lại sau" });
      } finally {
        setCreatingConvFor(null);
      }
    },
    [router]
  );

  // Show simple loading spinner instead of skeleton
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-4"
            style={{ borderColor: "var(--color-primary)" }}
          ></div>
          <p className="text-gray-600">Đang tải danh sách bác sĩ...</p>
        </div>
      </div>
    );
  }

  if (doctors.length === 0) {
    return (
      <div className="healthcare-card p-12 text-center">
        <div className="text-gray-400 mb-4">
          <Building2 className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Không tìm thấy bác sĩ</h3>
        <p className="text-gray-600">Vui lòng thử điều chỉnh bộ lọc hoặc tìm kiếm khác</p>
      </div>
    );
  }

  if (viewMode === "map") {
    return (
      <MapView
        doctors={doctors}
        doctorRatings={doctorRatings}
        onDoctorSelect={onDoctorSelect}
        onBookAppointment={onBookAppointment}
        onViewDoctor={handleViewDoctor}
        selectedDoctor={selectedDoctor}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with pagination on top */}
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          Hiển thị{" "}
          <span className="font-semibold text-gray-900">
            {startIndex + 1}-{Math.min(endIndex, doctors.length)}
          </span>{" "}
          trong tổng số <span className="font-semibold text-gray-900">{doctors.length}</span> bác sĩ
        </p>
        {/* Pagination on top */}
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
              // Show first, last, current, and adjacent pages
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

      {/* Doctor Cards - Same style as patient/doctors page */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentDoctors.map((doctor) => {
          const doctorId = doctor._id || doctor.id || "";
          const rating = doctorRatings[doctorId];
          const name = doctor.fullName || "Chưa rõ tên";
          const sp = doctor.specialty || "Bác sĩ";
          const exp = doctor.experienceYears ?? 5;

          return (
            <div key={doctorId} className="healthcare-card group">
              <div className="p-6">
                {/* Doctor Info Header */}
                <div className="flex items-center gap-4 mb-4">
                  {doctor.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={doctor.avatarUrl} alt={name} className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "var(--color-primary-50)" }}
                    >
                      <Stethoscope className="w-7 h-7" style={{ color: "var(--color-primary)" }} />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-gray-900">{name}</div>
                    <div className="text-sm text-gray-600">{sp}</div>
                  </div>
                </div>

                {/* Rating and Experience */}
                <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  {rating?.averageRating ? rating.averageRating.toFixed(1) : "Chưa có"} • {exp}+ năm kinh nghiệm
                </div>

                {/* Address */}
                {doctor.address && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <MapPin className="w-4 h-4" /> {doctor.address}
                  </div>
                )}

                {/* Phone */}
                {doctor.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                    <Phone className="w-4 h-4" /> {doctor.phone}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDoctor(doctor);
                    }}
                    className="flex-1 cursor-pointer inline-flex items-center justify-center border-2 border-[var(--color-primary)] text-[var(--color-primary)] rounded-xl py-3 px-4 text-sm font-medium hover:shadow-sm transition"
                  >
                    Xem chi tiết
                  </button>

                  <button
                    type="button"
                    className="flex-1 cursor-pointer inline-flex items-center justify-center bg-[var(--color-primary)] text-white rounded-xl py-3 px-6 text-sm font-semibold shadow-md hover:brightness-95 transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      onBookAppointment(doctor);
                    }}
                  >
                    <Calendar className="w-4 h-4 mr-2" /> Đặt lịch
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChat(doctor);
                    }}
                    aria-label={`Chat với ${name}`}
                    className="inline-flex cursor-pointer items-center border-[var(--color-primary)] text-[var(--color-primary)] rounded-lg p-1"
                  >
                    <span className="w-10 h-10 flex items-center justify-center border rounded-lg">
                      {creatingConvFor === doctorId ? (
                        <svg className="w-5 h-5 animate-spin text-[var(--color-primary)]" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                          ></path>
                        </svg>
                      ) : (
                        <MessageSquare className="w-5 h-5" />
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MapView({
  doctors,
  doctorRatings,
  onDoctorSelect,
  onBookAppointment,
  onViewDoctor,
  selectedDoctor,
}: {
  doctors: Doctor[];
  doctorRatings: Record<string, { averageRating: number; totalReviews: number }>;
  onDoctorSelect: (doctor: Doctor | null) => void;
  onBookAppointment: (doctor: Doctor) => void;
  onViewDoctor: (doctor: Doctor) => void;
  selectedDoctor?: Doctor | null;
}) {
  const hasMapLibreConfig = Boolean(process.env.NEXT_PUBLIC_MAPTILER_API_KEY);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
      <div className="lg:col-span-2 healthcare-card overflow-hidden">
        {hasMapLibreConfig ? (
          <Suspense
            fallback={
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                  <div
                    className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
                    style={{ borderColor: "var(--color-primary)" }}
                  ></div>
                  <p className="text-gray-600">Đang tải bản đồ...</p>
                </div>
              </div>
            }
          >
            <AppointmentsMapComponent
              doctors={doctors}
              selectedDoctor={selectedDoctor || null}
              onDoctorSelect={onDoctorSelect}
              onBookAppointment={onBookAppointment}
            />
          </Suspense>
        ) : (
          <div className="w-full h-full bg-gray-50 flex items-center justify-center">
            <p className="text-gray-500">Bản đồ không khả dụng</p>
          </div>
        )}
      </div>

      {/* Sidebar - Doctor List */}
      <div className="healthcare-card overflow-y-auto p-4">
        <h3 className="font-semibold text-gray-900 mb-4">{doctors.length} bác sĩ gần bạn</h3>
        <div className="space-y-3">
          {doctors.map((doctor) => {
            const doctorId = doctor._id || doctor.id || "";
            const isSelected = selectedDoctor?._id === doctor._id;
            const rating = doctorRatings[doctorId];

            return (
              <div
                key={doctorId}
                onClick={() => {
                  if (isSelected) {
                    onDoctorSelect(null);
                  } else {
                    onDoctorSelect(doctor);
                  }
                }}
                className={`p-4 rounded-xl cursor-pointer transition-all ${
                  isSelected
                    ? "bg-blue-50 border-2 border-primary shadow-md"
                    : "bg-white border border-gray-200 hover:border-blue-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">{doctor.fullName}</h4>
                    <p className="text-xs text-primary mt-1">{doctor.specialty || "Bác sĩ"}</p>
                    {doctor.address && <p className="text-xs text-gray-500 mt-1 line-clamp-2">📍 {doctor.address}</p>}
                    {rating && rating.averageRating > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span className="text-xs font-medium text-gray-700">{rating.averageRating.toFixed(1)}</span>
                        <span className="text-xs text-gray-400">({rating.totalReviews})</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDoctor(doctor);
                      }}
                      className="px-3 py-1.5 border border-primary text-primary text-xs rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      Xem chi tiết
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onBookAppointment(doctor);
                      }}
                      className="px-3 py-1.5 bg-primary text-white text-xs rounded-lg hover:opacity-90 transition-colors"
                    >
                      Đặt lịch
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
