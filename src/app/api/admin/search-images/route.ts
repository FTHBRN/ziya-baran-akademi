import { NextResponse } from 'next/server';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ images: [] });
  }

  try {
    const cleanQuery = query
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, '')
      .split(' ')
      .slice(0, 3)
      .join(' ')
      .trim();

    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&generator=search&gsrsearch=${encodeURIComponent(
      cleanQuery
    )}&gsrlimit=6&piprop=thumbnail&pithumbsize=600&origin=*`;

    const res = await fetch(wikiUrl);
    const data = await res.json();

    const images: { url: string; title: string }[] = [];

    if (data?.query?.pages) {
      for (const key of Object.keys(data.query.pages)) {
        const page = data.query.pages[key];
        if (page.thumbnail?.source) {
          images.push({
            url: page.thumbnail.source,
            title: page.title,
          });
        }
      }
    }

    // High quality Unsplash fallback
    if (images.length === 0) {
      images.push({
        url: `https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=80`,
        title: cleanQuery,
      });
      images.push({
        url: `https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80`,
        title: cleanQuery,
      });
    }

    return NextResponse.json({ images, query: cleanQuery });
  } catch (error: any) {
    console.error('Image search fallback error:', error.message);
    // Even if Wikipedia fails, return friendly image fallback without throwing
    return NextResponse.json({
      images: [
        {
          url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=80',
          title: query,
        },
      ],
      query,
    });
  }
}
