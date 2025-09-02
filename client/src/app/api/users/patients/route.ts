import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const target = `${apiUrl}/api/v1/users/patients${queryString ? `?${queryString}` : ''}`;
  const response = await fetch(target, { headers });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend API error:', response.status, errorData);
      return NextResponse.json({ 
        error: 'Backend API Error', 
        status: response.status,
        details: errorData 
      }, { status: response.status });
    }

  const data = await response.json();
  // normalize payload: backend may return array or { data: [...] }
  if (Array.isArray(data)) return NextResponse.json(data);
  if (Array.isArray(data?.data)) return NextResponse.json(data.data);
  // if backend returned an object with patients under other key, return empty array instead of unexpected shapes
  return NextResponse.json([]);
  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

