/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";
import { signIn } from "@/auth";

export async function authenticate(email: string, password: string, userType: string) {
  try {
    const r = await signIn("credentials", {
      email: email,
      password: password,
      role: userType,
      // callbackUrl: "/",
      redirect: false,
    });
    return r;
  } catch (error) {
    if ((error as any).name === "InvalidEmailPasswordError") {
      return {
        error: (error as any).type,
        code: 1,
      };
    } else if ((error as any).name === "InactiveAccountError") {
      return {
        error: (error as any).type,
        code: 2,
      };
    } else {
      return { error: "Đã có lỗi xảy ra", code: 0 };
    }
  }
}
