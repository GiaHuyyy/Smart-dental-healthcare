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
    const colors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-red-500", "bg-yellow-500", "bg-indigo-500"];
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
    <div className={`p-4 bg-blue-50 border border-blue-200 rounded-lg ${className}`}>
      <div className="flex items-start">
        {/* Avatar thay vì icon */}
        <div
          className={`w-12 h-12 ${getAvatarColor(
            doctor.fullName
          )} rounded-full flex items-center justify-center mr-3 flex-shrink-0`}
        >
          <span className="text-white font-medium text-sm">{getInitials(doctor.fullName)}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-blue-900">Bác sĩ được đề xuất</h4>
              <p className="text-sm text-blue-800 font-semibold mt-1">{doctor.fullName}</p>
              <p className="text-sm text-blue-700">{doctor.specialty}</p>

              {doctor.rating && (
                <div className="flex items-center mt-1">
                  <span className="text-yellow-500 text-sm">⭐</span>
                  <span className="text-xs text-blue-600 ml-1">{doctor.rating}/5</span>
                </div>
              )}

              {doctor.experience && <p className="text-xs text-blue-600 mt-1">{doctor.experience}</p>}
            </div>
          </div>

          {/* Buttons without icons */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={onContact}
              className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Liên hệ
            </button>

            <button
              onClick={onViewProfile}
              className="px-4 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
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
