import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ patientId: string }> }) {
  try {
    const { patientId } = await params;
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    // Sử dụng endpoint hiện có: /medical-records/patient/records với query param
    const response = await fetch(`${apiUrl}/api/v1/medical-records/patient/records?patientId=${patientId}`, {
      headers,
    });

    // Lấy response text trước để kiểm tra
    const responseText = await response.text();

    if (!response.ok) {
      console.error("Backend API error:", response.status, responseText);
      return NextResponse.json(
        {
          error: "Backend API Error",
          status: response.status,
          details: responseText,
        },
        { status: response.status }
      );
    }

    // Kiểm tra xem response có phải JSON không
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Response is not valid JSON:", responseText);
      // Nếu response không phải JSON, có thể là HTML error page
      if (responseText.includes("<!DOCTYPE") || responseText.includes("<html>")) {
        return NextResponse.json({
          error: "Server returned HTML instead of JSON",
          details: "Backend endpoint may not exist or returned an error page",
          data: [],
        });
      }
      return NextResponse.json({
        error: "Invalid JSON response",
        details: responseText,
        data: [],
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
