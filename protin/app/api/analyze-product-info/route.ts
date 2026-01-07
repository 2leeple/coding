import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_MODEL = 'gemini-2.5-flash';

export async function POST(request: NextRequest) {
  try {
    const { imageDataUrl, apiKey } = await request.json();

    if (!imageDataUrl) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // Base64 데이터에서 실제 이미지 데이터 추출
    const base64Data = imageDataUrl.includes(',') 
      ? imageDataUrl.split(',')[1] 
      : imageDataUrl;

    // Google Cloud Vision API로 먼저 시도 (리뷰수 추출에 유리)
    try {
      const visionResponse = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  content: base64Data,
                },
                features: [
                  {
                    type: 'TEXT_DETECTION',
                    maxResults: 50,
                  },
                ],
              },
            ],
          }),
        },
      );

      if (visionResponse.ok) {
        const visionData = await visionResponse.json();
        
        if (visionData.responses && visionData.responses[0]?.textAnnotations) {
          const textAnnotations = visionData.responses[0].textAnnotations;
          const fullText = textAnnotations[0]?.description || '';

          // 리뷰수 추출
          const reviewKeywords = ['리뷰', 'review', 'reviews', '리뷰수', '리뷰 개', '개 리뷰'];
          let reviewCount = '';
          
          for (const keyword of reviewKeywords) {
            const patterns = [
              new RegExp(`${keyword}[\\s:]*([\\d,]+)\\s*개`, 'i'),
              new RegExp(`${keyword}[\\s:]*([\\d,]+)`, 'i'),
              new RegExp(`([\\d,]+)\\s*${keyword}`, 'i'),
            ];

            for (const pattern of patterns) {
              const match = fullText.match(pattern);
              if (match) {
                reviewCount = match[1].replace(/,/g, '');
                break;
              }
            }
            if (reviewCount) break;
          }

          // 상품제목 추출 (Vision API로는 제한적이므로 Gemini로 전달)
          // 일단 Vision API 텍스트를 Gemini에 전달
        }
      }
    } catch (visionError) {
      console.log('Vision API failed, using Gemini only:', visionError);
    }

    // Gemini API로 상품제목과 리뷰수 추출
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `이 이미지에서 다음 정보만 추출하라:

1. **상품제목 (name)**: 이미지에 보이는 제품명을 정확히 추출하라. 브랜드명이 포함되어 있으면 함께 포함하라.
2. **리뷰수 (reviewCount)**: "리뷰 1,234개", "Review 1,234", "리뷰수 1234" 등의 형식에서 숫자만 추출하라 (쉼표 제거). 리뷰수가 없으면 빈 문자열("")로 반환하라.

다음 JSON 형식으로 응답하라:
{
  "name": "상품제목 (한국어로 번역, 없으면 영어 그대로)",
  "reviewCount": "리뷰수 (숫자만, 쉼표 제거, 없으면 빈 문자열)"
}`;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: 'image/jpeg',
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    try {
      const jsonData = JSON.parse(text);
      return NextResponse.json(jsonData);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse response', raw: text },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Product info analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze product info' },
      { status: 500 }
    );
  }
}



