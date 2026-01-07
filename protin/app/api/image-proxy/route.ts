import { NextRequest, NextResponse } from 'next/server';

/**
 * 이미지 프록시 API
 * 외부 이미지 URL을 서버에서 대신 가져와서 클라이언트에 전달합니다.
 * 서버 간 통신은 CORS 제약이 없으므로 모든 외부 이미지를 가져올 수 있습니다.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // URL 유효성 검사 및 프로토콜 처리
    let url: URL;
    try {
      // 상대 URL인 경우 절대 URL로 변환
      const urlString = imageUrl.startsWith('//') 
        ? `https:${imageUrl}` 
        : imageUrl.startsWith('http://') || imageUrl.startsWith('https://')
        ? imageUrl
        : `https://${imageUrl}`;
      
      url = new URL(urlString);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // 허용된 프로토콜만 허용 (http, https)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return NextResponse.json(
        { error: 'Only HTTP and HTTPS URLs are allowed' },
        { status: 400 }
      );
    }

    // 이미지 가져오기
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/*',
        'Referer': url.origin,
      },
      // 타임아웃 설정 (10초)
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    // Content-Type 확인
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // 이미지 데이터를 ArrayBuffer로 가져오기
    const arrayBuffer = await response.arrayBuffer();

    // 원본 Content-Type과 함께 응답 반환
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // 1시간 캐시
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    });
  } catch (error: any) {
    console.error('Image proxy error:', error);
    
    // 타임아웃 에러 처리
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'Request timeout. Please check the URL and try again.' },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch image' },
      { status: 500 }
    );
  }
}




