"use client";

import React, { useState, useEffect, Suspense, lazy } from "react";
import { Building2, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Doctor } from "@/types/appointment";
import DoctorCard from "@/components/ui/DoctorCard";

// Lazy load MapLibre component
const AppointmentsMapComponent = lazy(() => import("./AppointmentsMap"));

interface DoctorListProps {
  doctors: Doctor[];
  loading?: boolean;
  viewMode: "list" | "map";
  onDoctorSelect: (doctor: Doctor) => void;
  onBookAppointment: (doctor: Doctor) => void;
  selectedDoctor?: Doctor | null;
}

const DOCTORS_PER_PAGE = 6;

export default function DoctorList({
  doctors,
  loading = false,
  viewMode,
  onDoctorSelect,
  onBookAppointment,
  selectedDoctor,
}: DoctorListProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when doctors list changes
  useEffect(() => {
    setCurrentPage(1);
  }, [doctors.length]);

  const totalPages = Math.ceil(doctors.length / DOCTORS_PER_PAGE);
  const startIndex = (currentPage - 1) * DOCTORS_PER_PAGE;
  const endIndex = startIndex + DOCTORS_PER_PAGE;
  const currentDoctors = doctors.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <DoctorCardSkeleton key={i} />
        ))}
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
    return <MapView doctors={doctors} onDoctorSelect={onDoctorSelect} onBookAppointment={onBookAppointment} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          Hiển thị{" "}
          <span className="font-semibold text-gray-900">
            {startIndex + 1}-{Math.min(endIndex, doctors.length)}
          </span>{" "}
          trong tổng số <span className="font-semibold text-gray-900">{doctors.length}</span> bác sĩ
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentDoctors.map((doctor) => {
          const doctorId = doctor._id || doctor.id;
          const selectedId = selectedDoctor?._id || selectedDoctor?.id;
          const isSelected = selectedDoctor && doctorId && selectedId ? doctorId === selectedId : false;
          return (
            <div
              key={doctor._id || doctor.id}
              className={`${isSelected ? "ring-2 ring-[var(--color-primary)] rounded-2xl" : ""}`}
            >
              <DoctorCard
                doctor={doctor}
                onView={() => onDoctorSelect(doctor)}
                onBook={() => onBookAppointment(doctor)}
              />
            </div>
          );
        })}}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`px-4 py-2 rounded-lg transition ${
                currentPage === page
                  ? "bg-[var(--color-primary)] text-white"
                  : "border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

function DoctorCardSkeleton() {
  return (
    <div className="healthcare-card animate-pulse">
      <div className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-2/3" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
        <div className="space-y-2 mb-4">
          <div className="h-3 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-full" />
          <div className="h-3 bg-gray-200 rounded w-5/6" />
        </div>
        <div className="flex gap-3 mt-4">
          <div className="flex-1 h-11 bg-gray-200 rounded-xl" />
          <div className="flex-1 h-11 bg-gray-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function MapView({
  doctors,
  onDoctorSelect,
  onBookAppointment,
}: {
  doctors: Doctor[];
  onDoctorSelect: (doctor: Doctor) => void;
  onBookAppointment: (doctor: Doctor) => void;
}) {
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const hasMapLibreConfig = Boolean(
    process.env.NEXT_PUBLIC_MAPTILER_STYLE_URL || process.env.NEXT_PUBLIC_STADIA_STYLE_URL
  );

  const handleDoctorClick = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    onDoctorSelect(doctor);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
      {/* Map */}
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
              selectedDoctor={selectedDoctor}
              onDoctorSelect={handleDoctorClick}
              onBookAppointment={onBookAppointment}
            />
          </Suspense>
        ) : (
          <div className="w-full h-full bg-gray-50 flex items-center justify-center">
            <div className="text-center max-w-md p-8">
              <MapPin className="w-20 h-20 mx-auto mb-6" style={{ color: "var(--color-primary)" }} />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Bản đồ chưa được cấu hình</h3>
              <p className="text-gray-600 mb-4">
                Để hiển thị vị trí phòng khám trên bản đồ, vui lòng thêm cấu hình MapLibre với MapTiler hoặc Stadia
                Maps.
              </p>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-left space-y-2">
                <p className="text-sm font-mono text-gray-700">.env</p>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded block">
                  NEXT_PUBLIC_MAPTILER_API_KEY=your_maptiler_key
                </code>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded block break-all">
                  NEXT_PUBLIC_MAPTILER_STYLE_URL=https://api.maptiler.com/maps/streets-v2/style.json?key={"{key}"}
                </code>
                <p className="text-xs text-gray-500">
                  Hoặc dùng Stadia:
                  <br />
                  <span className="font-mono">
                    NEXT_PUBLIC_STADIA_STYLE_URL=https://tiles.stadiamaps.com/styles/your_style/style.json?api_key=YOUR_KEY
                  </span>
                </p>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                📖 Xem hướng dẫn trong tài liệu cấu hình MapLibre để hoàn tất.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Doctor List */}
      <div className="healthcare-card overflow-y-auto p-4">
        <h3 className="font-semibold text-gray-900 mb-4">{doctors.length} bác sĩ gần bạn</h3>
        <div className="space-y-4">
          {doctors.map((doctor) => {
            const doctorId = doctor._id || doctor.id;
            const selectedId = selectedDoctor?._id || selectedDoctor?.id;
            const isSelected = selectedDoctor && doctorId && selectedId ? doctorId === selectedId : false;

            return (
              <div
                key={doctor._id || doctor.id}
                className={`rounded-2xl transition-shadow ${
                  isSelected ? "ring-2 ring-[var(--color-primary)] shadow-lg" : "hover:shadow-md"
                }`}
              >
                <DoctorCard
                  doctor={doctor as unknown as Parameters<NonNullable<typeof DoctorCard>>[0]["doctor"]}
                  onView={() => handleDoctorClick(doctor)}
                  onBook={() => onBookAppointment(doctor)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
