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

// Register function
// export async function register(
//   fullName: string,
//   email: string,
//   password: string,
//   userType: string,
//   phone?: string,
//   dateOfBirth?: Date
// ) {
//   try {
//     const response = await fetch("/api/auth/register", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         fullName,
//         email,
//         password,
//         role: userType,
//         phone,
//         dateOfBirth,
//       }),
//     });

//     if (!response.ok) {
//       throw new Error("Failed to register");
//     }

//     const data = await response.json();
//     return data;
//   } catch (error) {
//     console.error("Error registering:", error);
//     return { error: "Đã có lỗi xảy ra", code: 0 };
//   }
// }
