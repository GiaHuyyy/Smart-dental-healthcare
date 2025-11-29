"use client";

import { useSession } from "next-auth/react";
import DoctorProfile from "@/components/doctors/DoctorProfile";

export default function DoctorAboutPage() {
  const { data: session } = useSession();
  const doctorId = (session?.user as { _id?: string })?._id || "";

  if (!doctorId) {
    return (
      <div className="min-h-screen p-6 pt-20">
        <div className="max-w-3xl mx-auto">
          <div className="healthcare-card p-6 text-center">
            <p className="text-gray-600">Vui lòng đăng nhập để xem thông tin của bạn</p>
          </div>
        </div>
      </div>
    );
  }

  return <DoctorProfile doctorId={doctorId} viewMode="doctor" />;
}
