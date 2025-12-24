import { NextRequest, NextResponse } from 'next/server';

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

    // Google Cloud Vision API 호출 (REST API 사용)
    // 참고: 실제 프로덕션에서는 서비스 계정 키를 사용하는 것이 좋습니다
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
      }
    );

    if (!visionResponse.ok) {
      const errorData = await visionResponse.json();
      console.error('Vision API error:', errorData);
      
      // Vision API가 실패하면 Gemini로 폴백
      return await fallbackToGemini(imageDataUrl, apiKey);
    }

    const visionData = await visionResponse.json();
    
    if (!visionData.responses || !visionData.responses[0]?.textAnnotations) {
      return await fallbackToGemini(imageDataUrl, apiKey);
    }

    const textAnnotations = visionData.responses[0].textAnnotations;
    const fullText = textAnnotations[0]?.description || '';
    const words = textAnnotations.slice(1); // 첫 번째는 전체 텍스트

    // 이미지 크기 추출 (Vision API 응답에서 가져오거나, Base64에서 추출)
    // Vision API는 이미지 크기를 직접 반환하지 않으므로, fullTextAnnotation의 bounding box 범위를 사용
    let originalWidth = 0;
    let originalHeight = 0;
    
    if (visionData.responses[0].fullTextAnnotation?.pages?.[0]) {
      const page = visionData.responses[0].fullTextAnnotation.pages[0];
      if (page.width && page.height) {
        originalWidth = page.width;
        originalHeight = page.height;
      }
    }
    
    // fullTextAnnotation이 없으면 words의 최대 좌표로 추정
    if (originalWidth === 0 || originalHeight === 0) {
      let maxX = 0;
      let maxY = 0;
      words.forEach((word: any) => {
        if (word.boundingPoly?.vertices) {
          word.boundingPoly.vertices.forEach((v: any) => {
            if (v.x > maxX) maxX = v.x;
            if (v.y > maxY) maxY = v.y;
          });
        }
      });
      // 여유 공간을 고려하여 약간 크게 설정
      originalWidth = maxX > 0 ? maxX * 1.1 : 1000;
      originalHeight = maxY > 0 ? maxY * 1.1 : 1000;
    }

    // 영양성분 키워드 매핑
    const nutritionKeywords = {
      protein: ['protein', '단백질', 'proteína'],
      sugar: ['sugar', '당류', 'sugars', 'azúcar'],
      fat: ['fat', '지방', 'grasa'],
      carb: ['carb', 'carbohydrate', '탄수화물', 'carbohidrato', 'total carbohydrate'],
      calorie: ['calorie', 'calories', '칼로리', 'kcal', 'energía'],
      gram: ['gram', 'g', '그램'],
    };

    const extractedData: Record<string, string> = {};
    const highlights: Array<{
      field: string;
      coords: Array<{ x: number; y: number }>;
    }> = [];

    // 각 키워드에 대해 텍스트에서 찾기
    for (const [field, keywords] of Object.entries(nutritionKeywords)) {
      for (const keyword of keywords) {
        const regex = new RegExp(`${keyword}[\\s:]*([\\d.]+)\\s*g`, 'i');
        const match = fullText.match(regex);
        
        if (match) {
          extractedData[field] = `${match[1]}g`;
          
          // 해당 키워드와 숫자가 포함된 단어 찾기
          const matchedWords = words.filter((word: any) => {
            const wordText = word.description?.toLowerCase() || '';
            return wordText.includes(keyword.toLowerCase()) || 
                   (wordText.includes(match[1]) && Math.abs(wordText.indexOf(keyword.toLowerCase()) - wordText.indexOf(match[1])) < 20);
          });

          if (matchedWords.length > 0) {
            const word = matchedWords[0];
            if (word.boundingPoly?.vertices) {
              highlights.push({
                field,
                coords: word.boundingPoly.vertices.map((v: any) => ({
                  x: v.x || 0,
                  y: v.y || 0,
                })),
              });
            }
          }
          break;
        }
      }
    }

    return NextResponse.json({
      extractedData,
      highlights,
      meta: {
        width: originalWidth,
        height: originalHeight,
      },
    });
  } catch (error) {
    console.error('Error analyzing nutrition with coords:', error);
    return NextResponse.json(
      { error: 'Failed to analyze nutrition facts' },
      { status: 500 }
    );
  }
}

// Gemini로 폴백하는 함수
async function fallbackToGemini(imageDataUrl: string, apiKey: string) {
  try {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey,
        images: [imageDataUrl],
        prompt: `이 영양성분표에서 다음 정보를 JSON 형식으로 추출하라:
{
  "protein": "단백질 수치 (g)",
  "sugar": "당류 수치 (g)",
  "fat": "지방 수치 (g)",
  "carb": "탄수화물 수치 (g)",
  "calorie": "칼로리 수치 (kcal)",
  "gram": "1회 제공량 (g)"
}`,
        mode: 'detailed',
      }),
    });

    const data = await res.json();
    let extractedData: Record<string, string> = {};

    if (data.raw) {
      const parsed = JSON.parse(data.text || '{}');
      extractedData = parsed;
    } else {
      extractedData = data;
    }

    return NextResponse.json({
      extractedData,
      highlights: [], // Gemini는 좌표 정보를 제공하지 않음
      meta: {
        width: 1000, // 기본값
        height: 1000,
      },
    });
  } catch (error) {
    console.error('Gemini fallback error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze nutrition facts' },
      { status: 500 }
    );
  }
}


