import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${apiUrl}/api/v1/users/${id}`, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: "Backend API Error", details: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
