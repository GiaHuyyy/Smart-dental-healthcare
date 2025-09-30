import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081';
    const queryString = searchParams.toString();

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const target = `${apiUrl}/api/v1/prescriptions/patient-prescriptions${queryString ? `?${queryString}` : ''}`;
    console.debug('Proxying /api/prescriptions/patient ->', target);
    const response = await fetch(target, { headers });

    if (!response.ok) {
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

      console.error('Backend prescriptions/patient error:', response.status, details);
      return NextResponse.json({ error: 'Backend error', details }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying patient prescriptions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
