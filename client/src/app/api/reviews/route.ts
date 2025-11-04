import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = req.headers.get("authorization")?.replace("Bearer ", "");

    const response = await fetch(`${API_BASE_URL}/api/v1/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.message || "Failed to create review" }, { status: response.status });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Review creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
