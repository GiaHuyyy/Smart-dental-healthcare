import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctorId');

    const apiParams = new URLSearchParams();
    if (doctorId) apiParams.append('doctorId', doctorId);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081';
    const fullUrl = `${apiUrl}/api/v1/users/patients/${id}/details?${apiParams}`;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    console.log('Fetching patient details from backend:', fullUrl);
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers,
    });

    const textBody = await response.text().catch(() => '');
    // attempt to parse JSON body
    let data: any = null;
    try {
      data = textBody ? JSON.parse(textBody) : null;
    } catch (err) {
      // not JSON
      data = null;
    }

    if (!response.ok) {
      console.error('Backend returned non-ok for patient details:', response.status, textBody);
      // if backend provided JSON error with message, expose it
      const backendMessage = data?.message ?? textBody ?? `Status ${response.status}`;
      return NextResponse.json({ success: false, message: `Backend error: ${backendMessage}` }, { status: response.status });
    }

    // If backend returned a success:false payload, propagate its message
    if (data && data.success === false) {
      console.error('Backend returned success:false for patient details:', data);
      return NextResponse.json({ success: false, message: data.message ?? 'Backend reported failure' }, { status: 200 });
    }

    const payload = data?.data ?? data ?? textBody;
    return NextResponse.json({ success: true, data: payload });
  } catch (error) {
    console.error('Error in patient details API:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
