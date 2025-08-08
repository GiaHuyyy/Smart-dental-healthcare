"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false });

    // Redirect to home
    toast.success("Đăng xuất thành công");
    router.push("/");
  };

  return (
    <button onClick={handleLogout} className="text-sm cursor-pointer text-red-600 hover:text-red-800">
      Đăng xuất
    </button>
  );
}
