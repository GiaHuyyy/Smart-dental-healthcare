"use client";

import React, { useState } from "react";
import { Search, Filter, X } from "lucide-react";
import { SearchFilters, ConsultType } from "@/types/appointment";

interface SearchDoctorsProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: () => void;
}

const inputClassName =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition";
const inputStyle = { "--tw-ring-color": "var(--color-primary)" } as React.CSSProperties;

export default function SearchDoctors({ filters, onFiltersChange, onSearch }: SearchDoctorsProps) {
  const [showFilters, setShowFilters] = useState(true);

  const handleInputChange = (field: keyof SearchFilters, value: unknown) => {
    onFiltersChange({ ...filters, [field]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      searchQuery: "",
      specialty: "",
      gender: "all",
      consultType: "all",
      availability: "all",
    });
  };

  const activeFilterCount = Object.keys(filters).filter((key) => {
    const value = filters[key as keyof SearchFilters];
    if (key === "searchQuery" || key === "specialty") return false;
    if (key === "gender" && value === "all") return false;
    if (key === "consultType" && value === "all") return false;
    if (key === "availability" && value === "all") return false;
    return value !== undefined && value !== null;
  }).length;

  return (
    <div className="healthcare-card p-6 space-y-4">
      {/* Search Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Tìm theo tên bác sĩ, chuyên khoa hoặc vấn đề sức khỏe..."
            value={filters.searchQuery || ""}
            onChange={(e) => handleInputChange("searchQuery", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition"
            style={inputStyle}
          />
        </div>
        <button
          onClick={onSearch}
          className="px-6 py-3 text-white rounded-lg hover:brightness-95 transition font-medium whitespace-nowrap"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          Tìm kiếm
        </button>
      </div>

      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-gray-700 transition-colors"
          style={{ color: showFilters ? "var(--color-primary)" : undefined }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-primary)")}
          onMouseLeave={(e) => !showFilters && (e.currentTarget.style.color = "")}
        >
          <Filter className="w-5 h-5" />
          <span className="font-medium">Bộ lọc nâng cao</span>
          {activeFilterCount > 0 && (
            <span
              className="text-white text-xs px-2 py-1 rounded-full"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="text-sm text-gray-600 hover:text-red-600 flex items-center gap-1">
            <X className="w-4 h-4" />
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          {/* Gender Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Giới tính</label>
            <select
              value={filters.gender || "all"}
              onChange={(e) => handleInputChange("gender", e.target.value as "all" | "male" | "female")}
              className={inputClassName}
              style={inputStyle}
            >
              <option value="all">Tất cả</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
            </select>
          </div>

          {/* Experience Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Kinh nghiệm (năm)</label>
            <select
              value={filters.experienceRange?.[0] || ""}
              onChange={(e) => {
                const min = parseInt(e.target.value) || 0;
                handleInputChange("experienceRange", [min, 50]);
              }}
              className={inputClassName}
              style={inputStyle}
            >
              <option value="">Tất cả</option>
              <option value="5">5+ năm</option>
              <option value="8">8+ năm</option>
              <option value="10">10+ năm</option>
              <option value="15">15+ năm</option>
            </select>
          </div>

          {/* Fee Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phí khám</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Từ"
                value={filters.feeRange?.[0] || ""}
                onChange={(e) => {
                  const min = parseInt(e.target.value) || 0;
                  const max = filters.feeRange?.[1] || 1000;
                  handleInputChange("feeRange", [min, max]);
                }}
                className={inputClassName}
                style={inputStyle}
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                placeholder="Đến"
                value={filters.feeRange?.[1] || ""}
                onChange={(e) => {
                  const min = filters.feeRange?.[0] || 0;
                  const max = parseInt(e.target.value) || 1000;
                  handleInputChange("feeRange", [min, max]);
                }}
                className={inputClassName}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Availability Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Thời gian khả dụng</label>
            <select
              value={filters.availability || "all"}
              onChange={(e) =>
                handleInputChange("availability", e.target.value as "morning" | "afternoon" | "evening" | "all")
              }
              className={inputClassName}
              style={inputStyle}
            >
              <option value="all">Tất cả</option>
              <option value="morning">Sáng (8h-12h)</option>
              <option value="afternoon">Chiều (12h-17h)</option>
              <option value="evening">Tối (17h-20h)</option>
            </select>
          </div>

          {/* Consult Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Loại tư vấn</label>
            <select
              value={filters.consultType || "all"}
              onChange={(e) => handleInputChange("consultType", e.target.value as ConsultType | "all")}
              className={inputClassName}
              style={inputStyle}
            >
              <option value="all">Tất cả</option>
              <option value={ConsultType.TELEVISIT}>Từ xa (Televisit)</option>
              <option value={ConsultType.ON_SITE}>Tại phòng khám</option>
              <option value={ConsultType.HOME_VISIT}>Khám tại nhà</option>
            </select>
          </div>

          {/* Min Rating Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Đánh giá tối thiểu</label>
            <select
              value={filters.rating || ""}
              onChange={(e) => handleInputChange("rating", parseFloat(e.target.value) || undefined)}
              className={inputClassName}
              style={inputStyle}
            >
              <option value="">Tất cả</option>
              <option value="3">3+ sao</option>
              <option value="4">4+ sao</option>
              <option value="4.5">4.5+ sao</option>
            </select>
          </div>
        </div>
      )}

      {/* Search by tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          className="px-4 py-2 text-sm font-medium border-b-2"
          style={{ color: "var(--color-primary)", borderColor: "var(--color-primary)" }}
        >
          Bác sĩ
        </button>
        <button
          className="px-4 py-2 text-sm font-medium text-gray-600 transition-colors"
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "")}
        >
          Chuyên khoa
        </button>
        <button
          className="px-4 py-2 text-sm font-medium text-gray-600 transition-colors"
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "")}
        >
          Vấn đề sức khỏe
        </button>
      </div>
    </div>
  );
}
