import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081';
    const fullUrl = `${apiUrl}/api/v1/medical-records/statistics/patient?${searchParams}`;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(fullUrl, { headers });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('Backend returned non-ok for medical-records/patient stats:', response.status, text);
      return NextResponse.json({ success: false, message: `Backend error: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data: data?.data ?? data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
