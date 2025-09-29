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
  const rawUser: any = session.user;

  const currentUser: User = {
    _id: rawUser.id || rawUser._id,
    firstName: rawUser.firstName || (rawUser.name ? String(rawUser.name).split(" ")[0] : "") || "",
    lastName: rawUser.lastName || (rawUser.name ? String(rawUser.name).split(" ").slice(1).join(" ") : "") || "",
    email: rawUser.email || "",
    role: rawUser.role || "patient",
    specialization: rawUser.specialization,
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
