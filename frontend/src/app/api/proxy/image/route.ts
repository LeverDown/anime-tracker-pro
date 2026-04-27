import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  const ALLOWED_DOMAINS = [
    's4.anilist.co',
    'cdn.myanimelist.net',
    'media.kitsu.io',
    'images.weserv.nl'
  ];

  if (!imageUrl) {
    return new NextResponse('Missing URL parameter', { status: 400 });
  }

  try {
    const parsedUrl = new URL(imageUrl);
    if (!ALLOWED_DOMAINS.includes(parsedUrl.hostname)) {
      return new NextResponse('Domain not authorized', { status: 403 });
    }

    // Fetch the image from the remote source
    // We don't pass the browser's Referer to avoid hotlinking blocks
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return new NextResponse(`Failed to fetch image: ${response.statusText}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type');
    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType || 'image/jpeg',
        'Cache-Control': 'public, s-maxage=31536000, stale-while-revalidate=59, immutable',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
