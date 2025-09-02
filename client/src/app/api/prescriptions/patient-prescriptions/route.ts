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
    const response = await fetch(target, { headers });

    if (!response.ok) {
      const err = await response.text();
      console.error('Backend prescriptions error:', response.status, err);
      return NextResponse.json({ error: 'Backend error', details: err }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching patient prescriptions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
