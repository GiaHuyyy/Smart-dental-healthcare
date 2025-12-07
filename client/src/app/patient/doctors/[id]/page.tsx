"use client";

import { Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import DoctorProfile from "@/components/doctors/DoctorProfile";

function DoctorDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const doctorId = (params?.id as string) || "";

  const highlightReview = searchParams?.get("highlightReview") || undefined;
  const appointmentId = searchParams?.get("appointmentId") || undefined;

  const onBook = () => {
    router.push(`/patient/appointments?doctorId=${doctorId}`);
  };

  const onChat = () => {
    router.push(`/patient/chat?doctorId=${doctorId}`);
  };

  return (
    <DoctorProfile
      doctorId={doctorId}
      viewMode="patient"
      onBook={onBook}
      onChat={onChat}
      backLink="/patient/doctors"
      highlightReviewId={highlightReview}
      appointmentId={appointmentId}
    />
  );
}

export default function DoctorDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      }
    >
      <DoctorDetailsContent />
    </Suspense>
  );
}
