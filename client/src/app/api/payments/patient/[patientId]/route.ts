import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;
    
    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081';
    const fullUrl = `${apiUrl}/api/v1/payments/patient/${patientId}`;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(fullUrl, { method: 'GET', headers });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('Backend returned non-ok for patient payments:', response.status, text);
      return NextResponse.json({ success: false, message: `Backend error: ${response.status}` }, { status: response.status });
    }

    const responseData = await response.json();
    
    // Backend returns: { success: true, data: payments[], message: '...' }
    // We need to extract the data array
    const payments = responseData.data || (responseData.success ? [] : []);
    
    console.log('Backend response:', { success: responseData.success, paymentCount: payments.length });
    
    // Return the data array wrapped properly
    return NextResponse.json({ success: true, data: payments });
  } catch (error) {
    console.error('Error in patient payments API:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

