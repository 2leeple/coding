import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_MODEL = 'gemini-2.5-flash';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, images, prompt, mode } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is required' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    // 이미지가 있으면 이미지와 함께, 없으면 텍스트만으로 처리
    let result;
    if (images && images.length > 0) {
      // Convert base64 images to parts (이미지 해상도 유지)
      const imageParts = images.map((image: string) => {
        const base64Data = image.split(',')[1] || image;
        return {
          inlineData: {
            data: base64Data,
            mimeType: 'image/jpeg',
          },
        };
      });
      result = await model.generateContent([prompt, ...imageParts]);
    } else {
      // 텍스트만으로 처리 (B그룹 텍스트 분석용)
      result = await model.generateContent(prompt);
    }
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    try {
      const jsonData = JSON.parse(text);
      return NextResponse.json(jsonData);
    } catch {
      // If not JSON, return as text
      return NextResponse.json({ text, raw: true });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to process with Gemini' },
      { status: 500 }
    );
  }
}

