import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081';

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Try backend medicines search endpoint if exists
    const target = `${apiUrl}/api/v1/medicines/search${query ? `?query=${encodeURIComponent(query)}` : ''}`;
    try {
      const resp = await fetch(target, { headers });
      if (resp.ok) {
        const data = await resp.json();
        // normalize to array
        if (Array.isArray(data)) return NextResponse.json(data);
        if (Array.isArray(data?.data)) return NextResponse.json(data.data);
        return NextResponse.json([]);
      }
    } catch (err) {
      // backend may not implement this endpoint; fall through to fallback list
      console.warn('Medicines backend search failed, using fallback', err);
    }

    // Fallback static suggestions (small helpful list)
    const fallback = [
      { name: 'Paracetamol', dosage: '500mg' },
      { name: 'Amoxicillin', dosage: '500mg' },
      { name: 'Ibuprofen', dosage: '200mg' },
      { name: 'Metronidazole', dosage: '400mg' },
      { name: 'Aspirin', dosage: '81mg' }
    ];

    // simple filter
    const filtered = fallback.filter(m => m.name.toLowerCase().includes(query.toLowerCase()));
    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Error in medicines search proxy:', error);
    return NextResponse.json([], { status: 200 });
  }
}
