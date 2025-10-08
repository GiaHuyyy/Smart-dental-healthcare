"use client";

import React, { useState, useEffect, Suspense, lazy } from "react";
import { Building2, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Doctor } from "@/types/appointment";

const AppointmentsMapComponent = lazy(() => import("./AppointmentsMap"));

interface DoctorListProps {
  doctors: Doctor[];
  loading?: boolean;
  viewMode: "list" | "map";
  onDoctorSelect: (doctor: Doctor | null) => void; // Cho phép null
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
        {[1, 2, 3, 4, 5, 6].map((i) => (<DoctorCardSkeleton key={i} />))}
      </div>
    );
  }

  if (doctors.length === 0) {
    return (
      <div className="healthcare-card p-12 text-center">
        <div className="text-gray-400 mb-4"><Building2 className="w-16 h-16 mx-auto" /></div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Không tìm thấy bác sĩ</h3>
        <p className="text-gray-600">Vui lòng thử điều chỉnh bộ lọc hoặc tìm kiếm khác</p>
      </div>
    );
  }

  if (viewMode === "map") {
    return (
      <MapView
        doctors={doctors}
        onDoctorSelect={onDoctorSelect}
        onBookAppointment={onBookAppointment}
        selectedDoctor={selectedDoctor}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          Hiển thị <span className="font-semibold text-gray-900">{startIndex + 1}-{Math.min(endIndex, doctors.length)}</span> trong tổng số <span className="font-semibold text-gray-900">{doctors.length}</span> bác sĩ
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentDoctors.map((doctor) => {
          const isSelected = selectedDoctor?._id === doctor._id;
          return (
            <div
              key={doctor._id || doctor.id}
              onClick={() => {
                if (isSelected) { onDoctorSelect(null); }
                else { onDoctorSelect(doctor); }
              }}
              className={`healthcare-card cursor-pointer transition-all ${isSelected ? "ring-2 ring-blue-500 shadow-lg" : "hover:shadow-md"}`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0"><h4 className="font-semibold text-gray-900 text-base truncate">{doctor.fullName}</h4><p className="text-sm text-blue-600 mt-1">{doctor.specialty || "Bác sĩ"}</p></div>
                </div>
                {doctor.address && <p className="text-xs text-gray-500 mb-2 line-clamp-2">📍 {doctor.address}</p>}
                {doctor.rating && (<div className="flex items-center gap-1 mb-3"><span className="text-sm text-yellow-500">⭐</span><span className="text-sm font-medium text-gray-700">{doctor.rating}</span>{doctor.reviewCount && <span className="text-xs text-gray-400">({doctor.reviewCount})</span>}</div>)}
                <div className="flex gap-2 mt-4">
                  <button onClick={(e) => { e.stopPropagation(); onDoctorSelect(doctor); }} className="flex-1 px-3 py-2 border border-blue-600 text-blue-600 text-sm rounded-lg hover:bg-blue-50 transition-colors">Xem chi tiết</button>
                  <button onClick={(e) => { e.stopPropagation(); onBookAppointment(doctor); }} className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">Đặt lịch</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"><ChevronLeft className="w-5 h-5" /></button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (<button key={page} onClick={() => handlePageChange(page)} className={`px-4 py-2 rounded-lg transition ${currentPage === page ? "bg-[var(--color-primary)] text-white" : "border border-gray-300 hover:bg-gray-50"}`}>{page}</button>))}
          <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"><ChevronRight className="w-5 h-5" /></button>
        </div>
      )}
    </div>
  );
}

function DoctorCardSkeleton() {
  return (<div className="healthcare-card animate-pulse"><div className="p-6"><div className="flex items-center gap-4 mb-4"><div className="w-14 h-14 rounded-full bg-gray-200" /><div className="flex-1 space-y-2"><div className="h-4 bg-gray-200 rounded w-2/3" /><div className="h-3 bg-gray-200 rounded w-1/2" /></div></div><div className="space-y-2 mb-4"><div className="h-3 bg-gray-200 rounded w-3/4" /><div className="h-3 bg-gray-200 rounded w-full" /><div className="h-3 bg-gray-200 rounded w-5/6" /></div><div className="flex gap-3 mt-4"><div className="flex-1 h-11 bg-gray-200 rounded-xl" /><div className="flex-1 h-11 bg-gray-200 rounded-xl" /></div></div></div>);
}

function MapView({
  doctors,
  onDoctorSelect,
  onBookAppointment,
  selectedDoctor,
}: {
  doctors: Doctor[];
  onDoctorSelect: (doctor: Doctor | null) => void; // Cho phép null
  onBookAppointment: (doctor: Doctor) => void;
  selectedDoctor?: Doctor | null;
}) {
  const hasMapLibreConfig = Boolean(process.env.NEXT_PUBLIC_MAPTILER_API_KEY);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
      <div className="lg:col-span-2 healthcare-card overflow-hidden">
        {hasMapLibreConfig ? (
          <Suspense fallback={<div className="w-full h-full bg-gray-100 flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: "var(--color-primary)" }}></div><p className="text-gray-600">Đang tải bản đồ...</p></div></div>}>
            <AppointmentsMapComponent
              doctors={doctors}
              selectedDoctor={selectedDoctor || null}
              onDoctorSelect={onDoctorSelect}
              onBookAppointment={onBookAppointment}
            />
          </Suspense>
        ) : (
          <div className="w-full h-full bg-gray-50 flex items-center justify-center">
            {/* ... Fallback UI ... */}
          </div>
        )}
      </div>
      <div className="healthcare-card overflow-y-auto p-4">
        <h3 className="font-semibold text-gray-900 mb-4">{doctors.length} bác sĩ gần bạn</h3>
        <div className="space-y-3">
          {doctors.map((doctor) => {
            // SỬA LỖI 1: Chuẩn hóa lại logic isSelected
            const isSelected = selectedDoctor?._id === doctor._id;

            return (
              <div
                key={doctor._id || doctor.id}
                // SỬA LỖI 2: Thêm logic hủy chọn cho nhất quán
                onClick={() => {
                  if (isSelected) {
                    onDoctorSelect(null);
                  } else {
                    onDoctorSelect(doctor);
                  }
                }}
                className={`p-4 rounded-xl cursor-pointer transition-all ${
                  isSelected
                    ? "bg-blue-50 border-2 border-blue-500 shadow-md"
                    : "bg-white border border-gray-200 hover:border-blue-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">{doctor.fullName}</h4>
                    <p className="text-xs text-blue-600 mt-1">{doctor.specialty || "Bác sĩ"}</p>
                    {doctor.address && <p className="text-xs text-gray-500 mt-1 line-clamp-2">📍 {doctor.address}</p>}
                    {doctor.rating && (
                      <div className="flex items-center gap-1 mt-2">
                        <span className="text-xs text-yellow-500">⭐</span>
                        <span className="text-xs font-medium text-gray-700">{doctor.rating}</span>
                        {doctor.reviewCount && <span className="text-xs text-gray-400">({doctor.reviewCount})</span>}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onBookAppointment(doctor);
                    }}
                    className="flex-shrink-0 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Đặt lịch
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}