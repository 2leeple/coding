'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import { removeBackground } from '@imgly/background-removal';

// 타입 정의
export interface CGroupFormData {
  name: string;
  link: string;
  flavor: string;
  amount: string;
  category: string;
  sub_category: string;
  protein: string;
  scoops: string;
  sugar: string;
  fat: string;
  calorie: string;
  gram: string;
  total_carb: string;
  reviewCount?: string;
}

export interface NutritionHighlight {
  field: string;
  coords: Array<{ x: number; y: number }>;
  imageIndex?: number; // 이미지 인덱스 (선택적)
}

interface AnalysisContextType {
  // 상태
  productImages: string[];
  nutritionImages: string[];
  linkInput: string;
  imageUrlInput: string;
  nutritionUrlInput: string;
  formData: CGroupFormData;
  isAnalyzing: boolean;
  isSaving: boolean;
  saved: boolean;
  removingBg: Set<number>; // 상품 이미지 배경 제거 중인 인덱스들 (하위 호환성)
  productLoading: boolean; // 상품 이미지 처리 중 (왼쪽 전용)
  nutritionLoading: boolean; // 성분표 이미지 처리 중 (오른쪽 전용)
  focusedArea: 'product' | 'nutrition' | null;
  nutritionHighlights: NutritionHighlight[];
  nutritionImageMeta: { width: number; height: number } | null;
  focusedField: string | null;
  currentNutritionImageIndex: number;
  
  // 함수
  addProductImage: (imageDataUrl: string, index?: number) => Promise<void>;
  removeProductImage: (index: number) => void;
  addNutritionImage: (imageDataUrl: string) => void;
  removeNutritionImage: (index: number) => void;
  setLinkInput: (value: string) => void;
  setImageUrlInput: (value: string) => void;
  setNutritionUrlInput: (value: string) => void;
  setFormData: (data: Partial<CGroupFormData> | ((prev: CGroupFormData) => CGroupFormData)) => void;
  setFocusedArea: (area: 'product' | 'nutrition' | null) => void;
  setFocusedField: (field: string | null) => void;
  setCurrentNutritionImageIndex: (index: number) => void;
  runAnalysis: (apiKey: string) => Promise<void>;
  saveToInventory: (imageUrl: string) => Promise<void>;
  resetAll: () => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

const initialFormData: CGroupFormData = {
  name: '',
  link: '',
  flavor: '',
  amount: '',
  category: '',
  sub_category: '',
  protein: '',
  scoops: '',
  sugar: '',
  fat: '',
  calorie: '',
  gram: '',
  total_carb: '',
  reviewCount: '',
};

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [productImages, setProductImages] = useState<string[]>([]);
  const [nutritionImages, setNutritionImages] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [nutritionUrlInput, setNutritionUrlInput] = useState('');
  const [formData, setFormData] = useState<CGroupFormData>(initialFormData);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [removingBg, setRemovingBg] = useState<Set<number>>(new Set());
  const [productLoading, setProductLoading] = useState(false);
  const [nutritionLoading, setNutritionLoading] = useState(false);
  const [focusedArea, setFocusedArea] = useState<'product' | 'nutrition' | null>(null);
  const [nutritionHighlights, setNutritionHighlights] = useState<NutritionHighlight[]>([]);
  const [nutritionImageMeta, setNutritionImageMeta] = useState<{ width: number; height: number } | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [currentNutritionImageIndex, setCurrentNutritionImageIndex] = useState(0);

  // 상품 이미지 추가 (백그라운드 제거)
  const addProductImage = useCallback(async (imageDataUrl: string, index?: number) => {
    const insertIndex = index !== undefined ? index : productImages.length;
    
    // 먼저 원본 이미지 추가
    setProductImages((prev) => {
      const newImages = [...prev];
      newImages.splice(insertIndex, 0, imageDataUrl);
      return newImages;
    });

    // 백그라운드 제거 시작
    setRemovingBg((prev) => new Set(prev).add(insertIndex));
    setProductLoading(true);

    try {
      // Base64 데이터 URL을 Blob으로 변환
      let imageBlob: Blob;
      
      if (imageDataUrl.startsWith('data:')) {
        // Base64 데이터 URL을 Blob으로 변환
        const response = await fetch(imageDataUrl);
        imageBlob = await response.blob();
      } else if (imageDataUrl.startsWith('blob:')) {
        // Blob URL을 Blob으로 변환
        const response = await fetch(imageDataUrl);
        imageBlob = await response.blob();
      } else {
        // URL 문자열인 경우 직접 fetch
        const response = await fetch(imageDataUrl);
        imageBlob = await response.blob();
      }

      // Blob을 removeBackground에 전달
      const blob = await removeBackground(imageBlob);
      const processedUrl = URL.createObjectURL(blob);

      // 처리된 이미지로 교체
      setProductImages((prev) => {
        const newImages = [...prev];
        newImages[insertIndex] = processedUrl;
        return newImages;
      });
    } catch (error) {
      console.error('Background removal failed:', error);
      toast.error('배경 제거에 실패했습니다.');
    } finally {
      setRemovingBg((prev) => {
        const newSet = new Set(prev);
        newSet.delete(insertIndex);
        // 모든 처리가 완료되었는지 확인
        if (newSet.size === 0) {
          setProductLoading(false);
        }
        return newSet;
      });
    }
  }, [productImages.length]);

  // 상품 이미지 제거
  const removeProductImage = useCallback((index: number) => {
    setProductImages((prev) => prev.filter((_, i) => i !== index));
      setRemovingBg((prev) => {
        const newSet = new Set(prev);
        newSet.delete(index);
        // 모든 처리가 완료되었는지 확인
        if (newSet.size === 0) {
          setProductLoading(false);
        }
        return newSet;
      });
  }, []);

  // 성분표 이미지 추가
  const addNutritionImage = useCallback((imageDataUrl: string) => {
    setNutritionImages((prev) => [...prev, imageDataUrl]);
  }, []);

  // 성분표 이미지 제거
  const removeNutritionImage = useCallback((index: number) => {
    setNutritionImages((prev) => prev.filter((_, i) => i !== index));
    if (currentNutritionImageIndex >= nutritionImages.length - 1 && currentNutritionImageIndex > 0) {
      setCurrentNutritionImageIndex(currentNutritionImageIndex - 1);
    }
  }, [currentNutritionImageIndex, nutritionImages.length]);

  // Blob URL을 Base64로 변환하는 유틸리티 함수
  const urlToBase64 = async (url: string): Promise<string> => {
    // 이미 Base64 데이터 URL인 경우
    if (url.startsWith('data:')) {
      const base64Data = url.split(',')[1];
      return base64Data || url;
    }
    
    // Blob URL인 경우
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          // "data:image/png;base64," 같은 접두사(Prefix)를 제거하고 순수 데이터만 추출
          const base64Data = base64String.split(',')[1] || base64String;
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Failed to convert URL to base64:', error);
      throw error;
    }
  };

  // 분석 실행
  const runAnalysis = useCallback(async (apiKey: string) => {
    if (!apiKey) {
      toast.error('Gemini API Key를 먼저 입력해주세요.');
      return;
    }

    if (productImages.length === 0 && nutritionImages.length === 0) {
      toast.error('이미지를 업로드해주세요.');
      return;
    }

    setIsAnalyzing(true);
    setNutritionHighlights([]);

    // 성분표 이미지가 있으면 좌표 추출 API 호출
    let nutritionHighlights: NutritionHighlight[] = [];
    
    if (nutritionImages.length > 0) {
      try {
        // Blob URL을 Base64로 변환
        const nutritionImageUrl = nutritionImages[currentNutritionImageIndex] || nutritionImages[0];
        const nutritionImageBase64 = await urlToBase64(nutritionImageUrl);
        
        const nutritionRes = await fetch('/api/analyze-nutrition-with-coords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageDataUrl: nutritionImageBase64,
            apiKey,
          }),
        });

        if (!nutritionRes.ok) {
          // 서버 에러 메시지 읽기
          let errorMessage = '영양성분 분석에 실패했습니다';
          try {
            const errorData = await nutritionRes.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            try {
              const errorText = await nutritionRes.text();
              errorMessage = errorText || errorMessage;
            } catch {
              // 읽기 실패 시 기본 메시지 사용
            }
          }
          toast.error(errorMessage);
          setIsAnalyzing(false);
          return; // 에러 발생 시 여기서 종료 (setAnalysisResult 실행하지 않음)
        }

        const nutritionData = await nutritionRes.json();
        nutritionHighlights = nutritionData.highlights || [];
        setNutritionHighlights(nutritionHighlights);
        
        if (nutritionData.meta) {
          setNutritionImageMeta(nutritionData.meta);
        }
        
        if (nutritionData.extractedData) {
          const extracted = nutritionData.extractedData;
          
          // 숫자 또는 문자열을 처리하는 헬퍼 함수
          const cleanValue = (value: any, unit: string): string => {
            if (value === null || value === undefined) return '';
            if (typeof value === 'number') return value.toString();
            if (typeof value === 'string') {
              return value.replace(unit, '').trim();
            }
            return '';
          };
          
          setFormData((prev) => ({
            ...prev,
            protein: cleanValue(extracted.protein, 'g') || prev.protein,
            sugar: cleanValue(extracted.sugar, 'g') || prev.sugar,
            fat: cleanValue(extracted.fat, 'g') || prev.fat,
            total_carb: cleanValue(extracted.carb, 'g') || prev.total_carb,
            calorie: cleanValue(extracted.calorie, 'kcal') || prev.calorie,
            gram: cleanValue(extracted.gram, 'g') || prev.gram,
          }));
        }
      } catch (error: any) {
        console.error('Failed to analyze nutrition with coords:', error);
        toast.error(error.message || '영양성분 분석 중 오류가 발생했습니다');
        setIsAnalyzing(false);
        return; // 에러 발생 시 여기서 종료 (setAnalysisResult 실행하지 않음)
      }
    }

    // Blob URL을 Base64로 변환
    let allImages: string[] = [];
    try {
      const productBase64 = await Promise.all(
        productImages.map(img => urlToBase64(img))
      );
      const nutritionBase64 = await Promise.all(
        nutritionImages.map(img => urlToBase64(img))
      );
      allImages = [...productBase64, ...nutritionBase64];
    } catch (error: any) {
      console.error('Failed to convert images to base64:', error);
      toast.error('이미지 변환 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
      setIsAnalyzing(false);
      return;
    }

    // AI 프롬프트 (기존과 동일)
    const prompt = `⚠️ 중요: 모든 텍스트 출력은 반드시 한국어로 해야 합니다.

🚫 엄격한 환각 방지 규칙 (STRICT HALLUCINATION PREVENTION):
1. **제공된 이미지에 있는 정보만 엄격하게 추출하라** (Strictly extract information ONLY present in the provided images)
2. **없는 값을 지어내거나 추론하지 마라** (Do NOT fabricate or infer missing values)
   - 영양성분표에 명시되지 않은 영양소는 '0' 또는 null로 반환하라
   - 예: 단백질(Protein)이 표에 없으면 protein: 0
   - 예: 당류(Sugar)가 표에 없으면 sugar: 0
3. **개별 아미노산 수치를 총 단백질로 합산하지 마라** (Do NOT sum up individual amino acids as Total Protein)
   - BCAA(Leucine, Valine, Isoleucine) 같은 개별 아미노산 수치는 단백질이 아니다
   - "Total Protein" 또는 "Protein"으로 명시된 값만 사용하라
   - 아미노산 프로필 표에 있는 개별 수치들을 합산하지 마라

제공된 이미지들을 두 그룹으로 구분하여 분석하라:

**첫 번째 그룹 (Product Appearance):**
- 상품의 앞면, 뒷면, 포장 이미지
- 제품명, 브랜드, 맛, 용량 등의 정보를 추출하라
- 이미지에 보이는 텍스트만 추출하라 (추측하지 마라)
- **브랜드명**: 포장에서 브랜드명을 추출하고, 이를 한국어로 번역하라 (예: 'MusclePharm' -> '머슬팜', 'MyProtein' -> '마이프로틴', 'Optimum Nutrition' -> '옵티멈 뉴트리션')

**두 번째 그룹 (Nutrition Facts Label):**
- 영양성분표, 함량표
- 특히 영양성분표(Nutrition Facts)를 꼼꼼히 읽어서 protein, sugar, fat, calorie, total_carb 수치를 숫자만 추출하라
- **중요**: 표에 명시되지 않은 영양소는 반드시 0으로 반환하라
- gram은 '1 scoop (30g)' 같은 표기에서 괄호 안의 숫자를 의미한다
- scoops는 'Total Servings' 또는 전체 용량 나누기 1회 용량을 계산해서 넣어라
- **경고**: 아미노산 프로필(Amino Acid Profile) 섹션의 개별 아미노산 수치를 단백질로 합산하지 마라

📌 한국어 출력 규칙 (Korean Output - 강제 적용):
1. **제품명 (name)**: 
   - 영어 제품명이 있어도 반드시 자연스러운 한국어로 번역하라
   - 브랜드명 + 제품명을 모두 한글로 표기하라
   - 예: "MusclePharm Combat Ultra Whey" -> "머슬팜 컴뱃 울트라 웨이"
   - 예: "Optimum Nutrition Gold Standard" -> "옵티멈 뉴트리션 골드 스탠다드"
   - 예: "Dymatize ISO100" -> "다이마타이즈 아이에스오 100"
   - 통용되는 한글 명칭이 있으면 그것을 우선 사용하라

2. **맛 (flavor)**:
   - 영어 맛 이름을 반드시 자연스러운 한국어로 번역하라
   - 예: "Chocolate" -> "초콜릿"
   - 예: "Strawberry Cream" -> "딸기 크림"
   - 예: "Vanilla" -> "바닐라"
   - 예: "Cookies and Cream" -> "쿠키앤크림"
   - 예: "Chocolate Peanut Butter" -> "초콜릿 피넛 버터"

3. **대분류 (category) - 엄격한 분류 규칙 (STRICT CLASSIFICATION RULES)**:
   ⚠️ **CRITICAL**: 다음 규칙을 엄격하게 따르라. 잘못된 분류는 심각한 오류다.
   
   **운동보조제 (Workout Supplement)**: 
   - 제품명이나 성분에 'BCAA', 'Amino', 'Creatine', 'Glutamine', 'Pre-workout', 'Arginine', 'Carnitine', 'Beta-Alanine', 'Taurine'이 포함된 경우
   - **절대 '단백질 보충제'로 분류 금지**
   - 예: "BCAA 5000" -> "운동보조제"
   - 예: "Amino Energy" -> "운동보조제"
   - 예: "Creatine Monohydrate" -> "운동보조제"
   - ⚠️ **If the product is BCAA, incorrectly classifying it as Protein is a CRITICAL ERROR.**
   
   **단백질 보충제 (Protein Supplement)**:
   - 'Whey', 'Isolate', 'Casein', 'Protein Powder', 'Protein'이 메인 제품인 경우
   - 예: "Whey Protein" -> "단백질 보충제"
   - 예: "Casein Protein" -> "단백질 보충제"
   - 예: "Plant Protein" -> "단백질 보충제"
   
   **영양제 (Supplement/Vitamin)**:
   - 'Vitamin', 'Omega', 'Probiotics', 'Multivitamin', '비타민', '오메가'가 포함된 경우
   - 예: "Omega-3" -> "영양제"
   - 예: "Multivitamin" -> "영양제"
   
   **우선순위**: 운동보조제 키워드가 있으면 먼저 확인하고, 없으면 단백질 보충제인지 확인하라.

4. **소분류 (sub_category)**:
   - 성분표의 원재료를 분석하여 다음 중 하나를 선택하라:
   - **WPC 우선 법칙**: 원재료에 "Whey Protein Concentrate" 또는 "Concentrate"가 포함되면, WPI가 섞여 있어도 무조건 "WPC" 선택
   - **WPI 조건**: 오직 "Whey Protein Isolate" 또는 "Isolate"만 있고 "Concentrate"가 없으면 "WPI" 선택
   - **식물성**: "Soy", "Pea", "식물성", "Plant" 포함 시 "식물성" 선택
   - **카제인**: "Casein" 포함 시 "카제인" 선택
   - **게이너**: "Gainer", "Mass", "게이너" 포함 시 "게이너" 선택
   - **기타**: 위에 해당하지 않으면 다음 중 적절한 것을 선택: "선식(탄수)", "마이프로틴", "국내(비추)"

다음 형식의 JSON으로 응답하라:
{
  "name": "제품명 (한국어, 브랜드명 포함)",
  "brand_kr": "브랜드 한글명 (예: '머슬팜', '마이프로틴', '옵티멈 뉴트리션')",
  "flavor": "맛 (한국어)",
  "amount": "용량 (예: 2.27kg)",
  "category": "대분류 (운동보조제, 단백질 보충제, 영양제 중 하나 - 위 규칙을 엄격하게 따를 것)",
  "sub_category": "소분류 (WPC, WPI, 식물성, 카제인, 게이너, 선식(탄수), 마이프로틴, 국내(비추) 중 하나, category가 '단백질 보충제'인 경우만)",
  "protein": 숫자 (단백질 g),
  "scoops": 숫자 (총 서빙 횟수),
  "sugar": 숫자 (당류 g),
  "fat": 숫자 (지방 g),
  "calorie": 숫자 (칼로리 kcal),
  "gram": 숫자 (1회 섭취량 g),
  "total_carb": 숫자 (총 탄수화물 g)
}`;

    try {
      toast.success('분석이 시작되었습니다. 다른 업무를 보셔도 됩니다.');
      
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          images: allImages,
          prompt,
          mode: 'detailed',
        }),
      });

      if (!res.ok) {
        // 서버 에러 메시지 읽기
        let errorMessage = 'AI 분석에 실패했습니다';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          try {
            const errorText = await res.text();
            errorMessage = errorText || errorMessage;
          } catch {
            // 읽기 실패 시 기본 메시지 사용
          }
        }
        toast.error(errorMessage);
        setIsAnalyzing(false);
        return; // 에러 발생 시 종료
      }

      const data = await res.json();
      let extractedData: any = {};

      if (data.raw) {
        const parsed = JSON.parse(data.text || '{}');
        if (parsed) {
          extractedData = parsed;
        }
      } else {
        extractedData = data;
      }

      // 소분류 분류 로직
      const mapSubCategoryToKorean = (subCategory: string, fullText?: string): string => {
        if (!subCategory) return '';
        
        const subCategoryLower = subCategory.toLowerCase();
        const fullTextLower = (fullText || '').toLowerCase();
        const combinedText = `${subCategoryLower} ${fullTextLower}`;
        
        if (combinedText.includes('concentrate') || combinedText.includes('wpc')) {
          return 'WPC';
        }
        
        if ((combinedText.includes('isolate') || combinedText.includes('wpi')) && !combinedText.includes('concentrate')) {
          return 'WPI';
        }
        
        if (combinedText.includes('soy') || combinedText.includes('pea') || combinedText.includes('식물성') || combinedText.includes('plant')) {
          return '식물성';
        }
        
        if (combinedText.includes('casein') || combinedText.includes('카제인')) {
          return '카제인';
        }
        
        if (combinedText.includes('gainer') || combinedText.includes('mass') || combinedText.includes('게이너')) {
          return '게이너';
        }
        
        const koreanOptions = ['WPC', 'WPI', '식물성', '카제인', '게이너', '선식(탄수)', '마이프로틴', '국내(비추)'];
        if (koreanOptions.includes(subCategory)) {
          return subCategory;
        }
        
        return '';
      };

      // 폼 데이터 업데이트
      const formatNumericValue = (value: any): string => {
        if (value === null || value === undefined || value === '') return '';
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(numValue)) return '';
        return numValue === 0 ? '0' : numValue.toString();
      };

      // cleanCoupangUrl 함수 (Context 내부에 정의)
      const cleanCoupangUrl = (url: string): string => {
        if (!url) return '';
        const trimmed = url.trim();
        const match = trimmed.match(/(.*vendorItemId=\d+)/);
        return match ? match[1] : trimmed;
      };

      // 브랜드 한글명 추출
      const brandKr = extractedData.brand_kr || '';
      
      setFormData({
        name: extractedData.name || '',
        link: cleanCoupangUrl(linkInput),
        flavor: extractedData.flavor || '',
        amount: extractedData.amount || '',
        category: extractedData.category || '',
        sub_category: extractedData.category === '단백질 보충제' 
          ? mapSubCategoryToKorean(extractedData.sub_category || '', extractedData.name || '')
          : '',
        protein: formatNumericValue(extractedData.protein),
        scoops: formatNumericValue(extractedData.scoops),
        sugar: formatNumericValue(extractedData.sugar),
        fat: formatNumericValue(extractedData.fat),
        calorie: formatNumericValue(extractedData.calorie),
        gram: formatNumericValue(extractedData.gram),
        total_carb: formatNumericValue(extractedData.total_carb),
        ...(brandKr && { brand_kr: brandKr } as any), // 브랜드 한글명을 formData에 추가 (타입 캐스팅)
      });

      setSaved(false);
      toast.success('✅ 상세 분석이 완료되었습니다!');
    } catch (error: any) {
      console.error('Failed to analyze:', error);
      toast.error(error.message || '분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [productImages, nutritionImages, linkInput, currentNutritionImageIndex]);

  // 보관함에 저장
  const saveToInventory = useCallback(async (imageUrl: string) => {
    if (!formData.name) {
      toast.error('제품명을 입력해주세요.');
      return;
    }

    setIsSaving(true);

    try {
      // 브랜드 한글명 추출 (formData에서 가져오거나 빈 문자열)
      const brandKr = (formData as any).brand_kr || '';
      
      const newProduct = {
        name: formData.name,
        brand: brandKr,
        flavor: formData.flavor,
        weight: formData.amount,
        category_large: formData.category,
        category_small: formData.sub_category,
        serving: formData.gram ? `${formData.gram}g` : undefined,
        calories: formData.calorie ? Number(formData.calorie) : undefined,
        carbs: formData.total_carb ? Number(formData.total_carb) : undefined,
        protein: formData.protein ? Number(formData.protein) : undefined,
        fat: formData.fat ? Number(formData.fat) : undefined,
        sugar: formData.sugar ? Number(formData.sugar) : undefined,
        imageUrl: imageUrl,
      };

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      });

      if (res.ok) {
        setSaved(true);
        toast.success('보관함에 등록되었습니다!');
      } else {
        throw new Error('Failed to save product');
      }
    } catch (error) {
      console.error('Failed to save to inventory:', error);
      toast.error('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [formData]);

  // 전체 초기화
  const resetAll = useCallback(() => {
    const hasData = 
      productImages.length > 0 ||
      nutritionImages.length > 0 ||
      formData.name ||
      formData.link ||
      formData.flavor ||
      formData.amount ||
      formData.sub_category ||
      formData.protein ||
      formData.scoops ||
      formData.sugar ||
      formData.fat ||
      formData.calorie ||
      formData.gram ||
      formData.total_carb ||
      linkInput ||
      imageUrlInput ||
      nutritionUrlInput;

    if (hasData) {
      const confirmed = window.confirm('입력된 내용이 모두 사라집니다. 초기화하시겠습니까?');
      if (!confirmed) return;
    }

    setProductImages([]);
    setNutritionImages([]);
    setLinkInput('');
    setImageUrlInput('');
    setNutritionUrlInput('');
    setFormData(initialFormData);
    setIsAnalyzing(false);
    setIsSaving(false);
    setSaved(false);
    setRemovingBg(new Set());
    setProductLoading(false);
    setNutritionLoading(false);
    setFocusedArea(null);
    setNutritionHighlights([]);
    setNutritionImageMeta(null);
    setFocusedField(null);
    setCurrentNutritionImageIndex(0);

    toast.success('초기화되었습니다.');
  }, [productImages.length, nutritionImages.length, formData, linkInput, imageUrlInput, nutritionUrlInput]);

  const value: AnalysisContextType = {
    productImages,
    nutritionImages,
    linkInput,
    imageUrlInput,
    nutritionUrlInput,
    formData,
    isAnalyzing,
    isSaving,
    saved,
    removingBg,
    productLoading,
    nutritionLoading,
    focusedArea,
    nutritionHighlights,
    nutritionImageMeta,
    focusedField,
    currentNutritionImageIndex,
    addProductImage,
    removeProductImage,
    addNutritionImage,
    removeNutritionImage,
    setLinkInput,
    setImageUrlInput,
    setNutritionUrlInput,
    setFormData,
    setFocusedArea,
    setFocusedField,
    setCurrentNutritionImageIndex,
    runAnalysis,
    saveToInventory,
    resetAll,
  };

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (context === undefined) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
}

