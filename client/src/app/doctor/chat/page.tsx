// File: src/app/doctor/chat/page.tsx
"use client";

import SharedChatView from "@/components/chat/SharedChatView";

export default function DoctorChatPage() {
  return <SharedChatView userRole="doctor" />;
}