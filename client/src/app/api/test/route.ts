import { NextResponse } from 'next/server';

export async function GET() {
  try {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081';
    
    // Test kết nối đến server
    const response = await fetch(`${apiUrl}/users/patients`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        message: `Server connection failed: ${response.status}`,
        apiUrl,
        status: response.status
      });
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      message: 'Server connection successful',
      apiUrl,
      data
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Connection error',
  apiUrl: process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081'
    });
  }
}
