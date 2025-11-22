import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const current = searchParams.get("current") || "1";
    const pageSize = searchParams.get("pageSize") || "10";

    // Kiểm tra biến môi trường (ưu tiên NEXT_PUBLIC_BACKEND_URL, sau đó NEXT_PUBLIC_BACKEND_URL)
    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";
    console.log("API URL:", apiUrl);

    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (status) params.append("status", status);
    params.append("current", current);
    params.append("pageSize", pageSize);

    const fullUrl = `${apiUrl}/api/v1/users/patients/search?${params}`;
    console.log("Full URL:", fullUrl);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(fullUrl, { method: "GET", headers });

    if (!response.ok) {
      console.error("Server response not ok:", response.status, response.statusText);
      const errorText = await response.text();
      console.error("Error response:", errorText);
      return NextResponse.json(
        { success: false, message: `Server error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    // Normalize and return consistent shape
    try {
      const patients = data?.data?.patients ?? data?.patients ?? (Array.isArray(data) ? data : []);
      const pagination = data?.data?.pagination ?? data?.pagination ?? { totalPages: 1 };
      return NextResponse.json({ success: true, data: { patients, pagination } });
    } catch (err) {
      console.error("Error normalizing patients response:", err);
      return NextResponse.json({ success: false, message: "Invalid response from backend" }, { status: 502 });
    }
  } catch (error) {
    console.error("Error in patients search API:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
