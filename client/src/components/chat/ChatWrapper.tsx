"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { sendRequest } from "@/utils/api";
import ChatInterface from "./ChatInterface";
import { RealtimeChatProvider } from "@/contexts/RealtimeChatContext";

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "patient" | "doctor";
  specialization?: string;
}

interface ChatWrapperProps {
  type: "ai" | "doctor";
  doctorName?: string;
}

export default function ChatWrapper({ type, doctorName }: ChatWrapperProps) {
  const { data: session } = useSession();
  const [doctorsList, setDoctorsList] = useState<User[]>([]);
  const [patientsList, setPatientsList] = useState<User[]>([]);
  const [authToken, setAuthToken] = useState<string>("");

  // Load users based on current user role
  useEffect(() => {
    const loadUsers = async () => {
      if (!session?.user) return;

      try {
        // Load doctors for patients, or patients for doctors
        if (session.user.role === "patient") {
          const res = await sendRequest<any>({
            method: "GET",
            url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/users/doctors`,
          });
          const list = res?.data || res?.users || res || [];
          setDoctorsList(Array.isArray(list) ? list : []);
        } else if (session.user.role === "doctor") {
          const res = await sendRequest<any>({
            method: "GET",
            url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/users/patients`,
          });
          const list = res?.data || res?.users || res || [];
          setPatientsList(Array.isArray(list) ? list : []);
        }

        // Set auth token
        setAuthToken((session as any)?.access_token || (session as any)?.accessToken || "");
      } catch (error) {
        console.error("Error loading users:", error);
      }
    };

    loadUsers();
  }, [session]);

  if (!session?.user) {
    return <div>Loading...</div>;
  }

  return (
    <RealtimeChatProvider>
      <ChatInterface
        type={type}
        doctorName={doctorName}
        currentUserId={(session.user as any)?._id || (session.user as any)?.id || ""}
        currentUserRole={session.user.role as "patient" | "doctor"}
        authToken={authToken}
        doctorsList={doctorsList}
        patientsList={patientsList}
      />
    </RealtimeChatProvider>
  );
}
