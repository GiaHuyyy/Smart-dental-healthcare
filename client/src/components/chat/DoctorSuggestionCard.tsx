"use client";

interface Doctor {
  _id: string;
  fullName: string;
  specialty: string;
  email?: string;
  phone?: string;
  avatar?: string;
  rating?: number;
  experience?: string;
}

interface DoctorSuggestionCardProps {
  doctor: Doctor;
  isLoading?: boolean;
  onContact?: () => void;
  onViewProfile?: () => void;
  onBookAppointment?: () => void;
  className?: string;
}

export default function DoctorSuggestionCard({
  doctor,
  isLoading = false,
  onContact,
  onViewProfile,
  onBookAppointment,
  className = "",
}: DoctorSuggestionCardProps) {
  if (isLoading) {
    return (
      <div className={`p-4 bg-gray-50 border border-gray-200 rounded-lg animate-pulse ${className}`}>
        <div className="flex items-center">
          <div className="w-12 h-12 bg-gray-300 rounded-full mr-3"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  const getAvatarColor = (name: string) => {
    const colors = ["var(--color-primary)", "#10b981", "#7c3aed", "#ef4444", "#f59e0b", "#6366f1"];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div
      className={`p-4 rounded-lg ${className}`}
      style={{ background: "var(--color-primary-outline)", border: "1px solid rgba(0,166,244,0.08)" }}
    >
      <div className="flex items-start">
        {/* Avatar thay vì icon */}
        <div
          style={{ background: getAvatarColor(doctor.fullName) }}
          className={`w-12 h-12 rounded-full flex items-center justify-center mr-3 flex-shrink-0`}
        >
          <span className="text-white font-medium text-sm">{getInitials(doctor.fullName)}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium" style={{ color: "var(--color-primary-contrast)" }}>
                Bác sĩ được đề xuất
              </h4>
              <p className="text-sm font-semibold mt-1" style={{ color: "var(--color-primary-600)" }}>
                {doctor.fullName}
              </p>
              <p className="text-sm" style={{ color: "var(--color-primary-600)" }}>
                {doctor.specialty}
              </p>

              {doctor.rating && (
                <div className="flex items-center mt-1">
                  <span className="text-yellow-500 text-sm">⭐</span>
                  <span className="text-xs ml-1" style={{ color: "var(--color-primary-600)" }}>
                    {doctor.rating}/5
                  </span>
                </div>
              )}

              {doctor.experience && (
                <p className="text-xs mt-1" style={{ color: "var(--color-primary-600)" }}>
                  {doctor.experience}
                </p>
              )}
            </div>
          </div>

          {/* Buttons without icons */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={onContact}
              className="px-4 py-1.5 text-sm rounded-md"
              style={{ background: "var(--color-primary)", color: "white" }}
            >
              Liên hệ
            </button>

            <button
              onClick={onViewProfile}
              className="px-4 py-1.5 text-sm rounded-md"
              style={{ background: "var(--color-primary-outline)", color: "var(--color-primary-600)" }}
            >
              Hồ sơ
            </button>

            <button
              onClick={onBookAppointment}
              className="px-4 py-1.5 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            >
              Đặt lịch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
