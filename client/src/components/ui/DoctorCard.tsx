"use client";

import React from "react";
import { Users, Star, Calendar, Phone, MapPin, MessageSquare } from "lucide-react";

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

interface Props {
  doctor: Doctor;
  onView?: (doctor: Doctor) => void;
  onBook?: (doctor: Doctor) => void;
  onChat?: (doctor: Doctor) => void;
  creatingConvFor?: string | null;
}

export default function DoctorCard({ doctor, onView, onBook, onChat, creatingConvFor }: Props) {
  const id = doctor._id || doctor.id;
  const name = doctor.fullName || "Chưa rõ tên";
  const sp = doctor.specialty || doctor.specialization || "Đa khoa";
  const rating = doctor.rating ?? 4.7;
  const exp = doctor.experienceYears ?? 5;

  return (
    <div className="healthcare-card group">
      <div className="p-6">
        <div className="flex items-center gap-4 mb-4">
          {doctor.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doctor.avatarUrl} alt={name} className="w-14 h-14 rounded-full object-cover" />
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
        {doctor.address && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <MapPin className="w-4 h-4" /> {doctor.address}
          </div>
        )}
        {doctor.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Phone className="w-4 h-4" /> {doctor.phone}
          </div>
        )}

        <div className="flex items-center gap-3">
          {id && (
            <button
              onClick={() => onView && onView(doctor)}
              className="flex-1 cursor-pointer inline-flex items-center justify-center border-2 border-[var(--color-primary)] text-[var(--color-primary)] rounded-xl py-3 px-4 text-sm font-medium hover:shadow-sm transition"
            >
              Xem chi tiết
            </button>
          )}

          <button
            className="flex-1 cursor-pointer inline-flex items-center justify-center bg-[var(--color-primary)] text-white rounded-xl py-3 px-6 text-sm font-semibold shadow-md hover:brightness-95 transition"
            onClick={() => onBook && onBook(doctor)}
          >
            <Calendar className="w-4 h-4 mr-2" /> Đặt lịch
          </button>

          <button
            onClick={() => onChat && onChat(doctor)}
            aria-label={`Chat với ${name}`}
            className="inline-flex cursor-pointer items-center border-[var(--color-primary)] text-[var(--color-primary)] rounded-lg p-1"
          >
            <span className="w-10 h-10 flex items-center justify-center border rounded-lg">
              {creatingConvFor === id ? (
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
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
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
}
