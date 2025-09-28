// File: src/app/patient/chat/page.tsx
"use client";

import SharedChatView from "@/components/chat/SharedChatView";

export default function PatientChatPage() {
  return <SharedChatView userRole="patient" />;
}