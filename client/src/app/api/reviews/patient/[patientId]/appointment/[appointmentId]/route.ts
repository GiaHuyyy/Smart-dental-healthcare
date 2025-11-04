import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; appointmentId: string }> }
) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { patientId, appointmentId } = await params;

    // Query backend for review by this patient for this appointment
    const response = await fetch(`${API_URL}/api/v1/reviews/patient/${patientId}/appointment/${appointmentId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ message: data.message || "Failed to fetch review" }, { status: response.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error fetching review:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
