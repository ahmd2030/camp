import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { query, location, limit = 20 } = await req.json();

    if (!query || !location) {
      return NextResponse.json({ success: false, error: 'المجال والموقع مطلوبان' }, { status: 400 });
    }

    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'مفتاح SerpApi غير موجود في النظام' }, { status: 500 });
    }

    const searchQuery = `${query} in ${location}`;
    const url = `https://serpapi.com/search.json?engine=google_local&q=${encodeURIComponent(searchQuery)}&api_key=${apiKey}&num=${limit}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ success: false, error: data.error }, { status: 500 });
    }

    const results = data.local_results || [];
    if (results.length === 0) {
      return NextResponse.json({ success: true, leads: [], message: 'لم يتم العثور على نتائج' });
    }

    const leads = results.map((place: any) => ({
      id: place.place_id || Math.random().toString(36).substring(7),
      name: place.title || 'بدون اسم',
      type: place.type || 'غير محدد',
      phone: place.phone || 'غير متوفر',
      address: place.address || 'غير متوفر',
      website: place.website || 'غير متوفر',
      rating: place.rating || 0,
      reviews: place.reviews || 0
    }));

    return NextResponse.json({ success: true, leads });

  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json({ success: false, error: 'انتهى وقت الاتصال (Timeout)' }, { status: 504 });
    }
    console.error('Scout API Error:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
