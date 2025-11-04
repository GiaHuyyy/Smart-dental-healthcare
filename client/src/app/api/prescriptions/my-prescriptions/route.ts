import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";
    const queryString = searchParams.toString();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(
      `${apiUrl}/api/v1/prescriptions/my-prescriptions${queryString ? `?${queryString}` : ""}`,
      { headers }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Backend prescriptions error:", response.status, err);
      return NextResponse.json({ error: "Backend error", details: err }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching my prescriptions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
