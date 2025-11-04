import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const resolved = await params;

    const target = `${apiUrl}/api/v1/prescriptions/${resolved.id}`;
    console.debug("Proxying GET ->", target);
    const response = await fetch(target, { headers });

    if (!response.ok) {
      // try to surface backend error body (json or text)
      let details: any;
      try {
        const text = await response.text();
        try {
          details = JSON.parse(text);
        } catch (_) {
          details = text;
        }
      } catch (e) {
        details = `Failed to read backend response body: ${String(e)}`;
      }

      console.error("Backend prescriptions/:id error:", response.status, details);
      return NextResponse.json({ error: "Backend error", details }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching prescription:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json();

    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const resolved = await params;
    const response = await fetch(`${apiUrl}/api/v1/prescriptions/${resolved.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating prescription:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const resolved = await params;
    const response = await fetch(`${apiUrl}/api/v1/prescriptions/${resolved.id}`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error deleting prescription:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
