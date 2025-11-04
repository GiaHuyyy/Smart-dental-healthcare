import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctorId");

    // Kiểm tra biến môi trường
    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";
    console.log("API URL for stats:", apiUrl);

    const params = new URLSearchParams();
    if (doctorId) params.append("doctorId", doctorId);

    const fullUrl = `${apiUrl}/api/v1/users/patients/stats?${params}`;
    console.log("Full stats URL:", fullUrl);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(fullUrl, { method: "GET", headers });

    if (!response.ok) {
      console.error("Stats API response not ok:", response.status, response.statusText);
      const errorText = await response.text();
      console.error("Stats error response:", errorText);
      return NextResponse.json(
        { success: false, message: `Server error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    try {
      const payload = data?.data ?? data;
      return NextResponse.json({ success: true, data: payload });
    } catch (err) {
      console.error("Error normalizing stats response:", err);
      return NextResponse.json({ success: false, message: "Invalid response from backend" }, { status: 502 });
    }
  } catch (error) {
    console.error("Error in patients stats API:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
