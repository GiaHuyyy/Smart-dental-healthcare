"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { RealtimeChatManager } from "@/components/realtime-chat";

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "patient" | "doctor";
  specialization?: string;
}

interface ChatIntegrationProps {
  doctorsList?: User[];
  patientsList?: User[];
}

export const ChatIntegration: React.FC<ChatIntegrationProps> = ({ doctorsList = [], patientsList = [] }) => {
  const { data: session } = useSession();

  // Check if user is authenticated and has required data
  if (!session?.user) {
    return null;
  }

  // Convert session user to our User interface
  const currentUser: User = {
    _id: (session.user as any).id || (session.user as any)._id,
    firstName: (session.user as any).firstName || session.user.name?.split(" ")[0] || "",
    lastName: (session.user as any).lastName || session.user.name?.split(" ").slice(1).join(" ") || "",
    email: session.user.email || "",
    role: (session.user as any).role || "patient",
    specialization: (session.user as any).specialization,
  };

  // Get auth token (you might need to adjust this based on your auth implementation)
  const authToken = (session as any).accessToken || (session as any).token;

  if (!authToken) {
    return null;
  }

  return (
    <RealtimeChatManager
      currentUser={currentUser}
      authToken={authToken}
      doctorsList={doctorsList}
      patientsList={patientsList}
    />
  );
};
