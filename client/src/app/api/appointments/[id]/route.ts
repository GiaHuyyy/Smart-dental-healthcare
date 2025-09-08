import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081';
    const headers: Record<string,string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${apiUrl}/api/v1/appointments/${id}`, {
      headers,
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('Backend API error:', response.status, responseText);
      return NextResponse.json({ 
        error: 'Backend API Error', 
        status: response.status,
        details: responseText 
      }, { status: response.status });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Response is not valid JSON:', responseText);
      return NextResponse.json({ 
        error: 'Invalid JSON response',
        details: responseText
      }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081';
    const headers: Record<string,string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    console.log('Updating appointment status:', id, body);

    const response = await fetch(`${apiUrl}/api/v1/appointments/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('Backend API error:', response.status, responseText);
      return NextResponse.json({ 
        error: 'Backend API Error', 
        status: response.status,
        details: responseText 
      }, { status: response.status });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Response is not valid JSON:', responseText);
      return NextResponse.json({ 
        error: 'Invalid JSON response',
        details: responseText
      }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
