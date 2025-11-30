"use client";

import { cn } from "@/lib/utils";
import { chatStorage } from "@/utils/chatStorage";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

interface LogoutButtonProps {
  className?: string;
}

export default function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Clear client-side stored tokens or cached data
      try {
        localStorage.removeItem("access_token");
        localStorage.removeItem("accessToken");
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("accessToken");
        localStorage.removeItem("newConversation");
        chatStorage.clearChat();
      } catch {}

      // Use NextAuth's redirect-based signOut to ensure cookies/session are cleared server-side
      await signOut({ redirect: true, callbackUrl: "/auth/login" });
      // Fallback navigation in case redirect is blocked
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className={cn(
        "w-full text-left text-sm text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors",
        className
      )}
    >
      Đăng xuất
    </button>
  );
}
