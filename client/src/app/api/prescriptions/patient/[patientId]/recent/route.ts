import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ patientId: string }> }) {
  try {
    const { patientId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") || "5";

    const apiParams = new URLSearchParams();
    apiParams.append("limit", limit);

    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";
    const fullUrl = `${apiUrl}/api/v1/prescriptions/patient/${patientId}/recent?${apiParams}`;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(fullUrl, { method: "GET", headers });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("Backend returned non-ok for patient recent prescriptions:", response.status, text);
      return NextResponse.json(
        { success: false, message: `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const payload = data?.data ?? data;
    return NextResponse.json({ success: true, data: payload });
  } catch (error) {
    console.error("Error in patient recent prescriptions API:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
