import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { appointmentId: string } }
) {
  try {
    const { appointmentId } = params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081';
    
    console.log('Fetching medical records for appointment:', appointmentId);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${apiUrl}/api/v1/medical-records/appointment/${appointmentId}`, {
      headers,
    });

    console.log('Backend response status:', response.status);

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
    console.log('Medical records found:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
