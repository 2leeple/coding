'use client';

// Main application page component
import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import { VirtuosoGrid } from 'react-virtuoso';
import { Toaster, toast } from 'react-hot-toast';
import { useAnalysis } from '../contexts/AnalysisContext';
import {
  Save,
  Key,
  Package,
  Search,
  FileText,
  Copy,
  Trash2,
  Upload,
  Sparkles,
  Loader2,
  X,
  Edit,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Download,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';

type Tab = 'A' | 'B' | 'C';

// 7대 카테고리 필터링 상수
const FILTER_CATEGORIES = {
  '🥩 단백질 보충제': ['전체', 'WPC', 'WPI', '식물성', '카제인', '게이너', '선식(탄수)', '마이프로틴', '국내(비추)'],
  '💪 운동보조제': ['전체', '크레아틴', '부스터', '아르기닌', '비트즙', '베타알라닌', '아미노산', 'EAA', '전해질', 'HMB', '카르니틴'],
  '🧃 단백질 드링크': ['전체', '단백질몰빵', '고단백두유', '탄수↑,당↓'],
  '🍫 단백질 간식': ['전체', '프로틴바', '칩', '프로틴쿠키', '씨리얼'],
  '💊 영양제': ['전체', '비타민D', '비타민 D', '아연', '홍삼', '유산균', '종합비타민', '오메가3', 'CLA', '집중·인지', 'ZMA', '커큐민', '그린스', 'L-테아닌', '마그네슘', '머쉬룸', '마카', '아피제닌', '알파GPC', '초유(콜로스트럼)', '글루코사민', '히알루론산', '레스베라트롤'],
  '🐔 닭가슴살': ['전체', '스테이크', '소시지', '볼', '훈제', '소스'],
} as const;

type CategoryLarge = keyof typeof FILTER_CATEGORIES;
type CategorySmall = typeof FILTER_CATEGORIES[CategoryLarge][number];

// C그룹 대분류-소분류 매핑 (이모지 제외)
const CATEGORY_OPTIONS: Record<string, string[]> = {
  '단백질 보충제': ['WPC', 'WPI', '식물성', '카제인', '게이너', '선식(탄수)', '마이프로틴', '국내(비추)'],
  '운동보조제': ['BCAA', '아르기닌', '크레아틴', '글루타민', '부스터', 'EAA', '아미노산', '전해질', 'HMB', '카르니틴', '기타'],
  '단백질 드링크': ['RTD(음료)', '팩', '스파클링', '기타'],
  '단백질 간식': ['프로틴바', '쿠키', '칩', '젤리/양갱', '기타'],
  '닭가슴살': ['스테이크', '볼', '소세지', '훈제/수비드', '소스포함'],
  '영양제': ['종합비타민', '오메가3', '유산균', 'CLA', '집중·인지', '비타민 D', 'ZMA', '커큐민', '그린스', 'L-테아닌', '마그네슘', '머쉬룸', '마카', '아피제닌', '알파GPC', '초유(콜로스트럼)', '글루코사민', '히알루론산', '레스베라트롤', '기타'],
  '기타': ['기타'],
};

interface Product {
  id: string;
  brand?: string;
  name: string;
  flavor?: string;
  weight?: string;
  category_large?: string;
  category_small?: string;
  serving?: string;
  calories?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  sugar?: number;
  imageUrl?: string;
  createdAt: string;
}

// Safe JSON parsing helper
const safeParseJSON = (text: string): any => {
  if (!text) return null;

  try {
    // First, try to parse the entire text as JSON
    return JSON.parse(text);
  } catch {
    // If that fails, try to extract JSON from the text
  }

  // Remove markdown code blocks
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // Try to find JSON object (non-greedy match to get the first complete object)
  const objectMatch = cleaned.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0]);
      return parsed;
    } catch (e) {
      // Try to find the JSON object more carefully
      let jsonStr = objectMatch[0];
      // Remove trailing commas before closing braces/brackets
      jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
      try {
        return JSON.parse(jsonStr);
      } catch (e2) {
        // Try to extract just the content between first { and last }
        const firstBrace = jsonStr.indexOf('{');
        const lastBrace = jsonStr.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          try {
            return JSON.parse(jsonStr.substring(firstBrace, lastBrace + 1));
          } catch (e3) {
            console.error('JSON parse error:', e3, 'Text:', jsonStr.substring(0, 100));
            return null;
          }
        }
        console.error('JSON parse error:', e2);
        return null;
      }
    }
  }

  // Try to find JSON array
  const arrayMatch = cleaned.match(/\[[^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*\]/);
  if (arrayMatch) {
    try {
      let jsonStr = arrayMatch[0];
      // Remove trailing commas
      jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
      return JSON.parse(jsonStr);
    } catch (e) {
      // Try to extract just the content between first [ and last ]
      let jsonStr = arrayMatch[0];
      const firstBracket = jsonStr.indexOf('[');
      const lastBracket = jsonStr.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        try {
          return JSON.parse(jsonStr.substring(firstBracket, lastBracket + 1));
        } catch (e2) {
          console.error('JSON array parse error:', e2);
          return null;
        }
      }
      console.error('JSON array parse error:', e);
      return null;
    }
  }

  return null;
};

// Image resize utility (최소 해상도 보장)
const ensureImageResolution = (dataUrl: string, minWidth: number = 1000): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // 이미지가 최소 해상도보다 크면 그대로 사용
      if (img.width >= minWidth) {
        resolve(dataUrl);
        return;
      }
      
      // 작은 이미지는 리사이즈 (최소 해상도로 확대)
      const canvas = document.createElement('canvas');
      const scale = minWidth / img.width;
      canvas.width = minWidth;
      canvas.height = img.height * scale;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

// Ripple Effect Component
const RippleButton = ({
  children,
  onClick,
  className,
  ...props
}: {
  children: React.ReactNode;
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  [key: string]: any;
}) => {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple = {
      x,
      y,
      id: Date.now(),
    };

    setRipples((prev) => [...prev, newRipple]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);

    onClick?.(e);
  };

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      className={`relative overflow-hidden ${className}`}
      {...props}
    >
      {children}
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full bg-white/30"
          initial={{ width: 0, height: 0, x: ripple.x, y: ripple.y }}
          animate={{ width: 200, height: 200, x: ripple.x - 100, y: ripple.y - 100, opacity: 0 }}
          transition={{ duration: 0.6 }}
        />
      ))}
    </button>
  );
};

// Skeleton Loader Component
const SkeletonLoader = () => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="w-8 h-8 text-[#ccff00]" />
          </motion.div>
          <div className="space-y-2">
            <motion.div
              className="h-2 bg-[#ccff00]/20 rounded-full w-32"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div
              className="h-2 bg-[#ccff00]/20 rounded-full w-24 ml-4"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            />
          </div>
          <p className="text-[#ccff00] text-sm font-medium">처리 중...</p>
        </div>
      </div>
    </div>
  );
};

// Toast Notification Component
const Toast = ({
  message,
  isVisible,
  onClose,
}: {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          className="fixed top-4 right-4 z-50"
        >
          <div className="bg-white/10 backdrop-blur-xl border border-[#ccff00]/30 rounded-xl px-6 py-4 shadow-[0_0_20px_rgba(204,255,0,0.3)]">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[#ccff00]" />
              <p className="text-white font-medium">{message}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Edit Product Modal Component
const EditProductModal = ({
  product,
  isOpen,
  onClose,
  onSave,
}: {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProduct: Partial<Product>) => Promise<void>;
}) => {
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isHoveringImage, setIsHoveringImage] = useState(false);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('배경 제거 중... ✂️');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // 카테고리 맵핑 (이모지 제거 버전)
  const CATEGORY_MAP: Record<string, string[]> = {
    '단백질 보충제': ['WPC', 'WPI', '식물성', '카제인', '게이너', '선식(탄수)', '마이프로틴', '국내(비추)'],
    '운동보조제': ['크레아틴', '부스터', '아르기닌', '비트즙', '베타알라닌', 'EAA', '아미노산', '전해질', 'HMB', '카르니틴'],
    '단백질 드링크': ['단백질몰빵', '고단백두유', '탄수↑,당↓'],
    '단백질 간식': ['프로틴바', '쿠키', '칩', '베이커리'],
    '영양제': ['종합비타민', '오메가3', '유산균', '밀크씨슬', '비타민D', '비타민 D', '아연', '홍삼', 'CLA', '집중·인지', 'ZMA', '커큐민', '그린스', 'L-테아닌', '마그네슘', '머쉬룸', '마카', '아피제닌', '알파GPC', '초유(콜로스트럼)', '글루코사민', '히알루론산', '레스베라트롤'],
    '닭가슴살': ['스테이크', '소시지', '볼', '훈제', '소스'],
  };

  const categoryKeys = Object.keys(CATEGORY_MAP);

  useEffect(() => {
    if (product) {
      setFormData({
        brand: product.brand || '',
        name: product.name || '',
        category_large: product.category_large || '',
        category_small: product.category_small || '',
        flavor: product.flavor || '',
        weight: product.weight || '',
        imageUrl: product.imageUrl || '',
      });
      setImageUrlInput(''); // URL 입력 필드 초기화
    }
  }, [product]);

  // 대분류 변경 시 소분류 초기화
  const handleCategoryLargeChange = (value: string) => {
    const subCategories = CATEGORY_MAP[value] || [];
    setFormData({
      ...formData,
      category_large: value,
      category_small: subCategories.length > 0 ? subCategories[0] : '',
    });
  };


  const handleImagePaste = async (e: React.ClipboardEvent) => {
    e.preventDefault();
    const items = e.clipboardData.items;
    const imageItems = Array.from(items).filter((item) => item.type.startsWith('image/'));

    if (imageItems.length === 0) return;

      const file = imageItems[0].getAsFile();
      if (!file) return;

    // 공통 이미지 처리 함수 사용
    await processImage(file);
  };

  // 공통 이미지 처리 함수 (File 또는 Blob을 처리)
  const processImage = async (fileOrBlob: File | Blob, message: string = '배경 제거 중... ✂️') => {
    setIsRemovingBackground(true);
    setLoadingMessage(message);

    try {
      // File 객체로 변환 (Blob인 경우)
      const file = fileOrBlob instanceof File 
        ? fileOrBlob 
        : new File([fileOrBlob], 'image.png', { type: fileOrBlob.type || 'image/png' });

      // 배경 제거 단계로 메시지 변경
      setLoadingMessage('배경 제거 중... ✂️');

      // 배경 제거 유틸리티 함수 import
      const { removeBackground, blobToDataURL } = await import('../utils/imageProcessor');
      
      // 배경 제거 실행
      const processedBlob = await removeBackground(file);
      
      // Blob을 Base64로 변환
      const processedDataUrl = await blobToDataURL(processedBlob);
      
      // 이미지 해상도 보장 (최소 가로 1000px)
      const resizedDataUrl = await ensureImageResolution(processedDataUrl, 1000);
      
      setFormData((prev) => ({ ...prev, imageUrl: resizedDataUrl }));
      setIsRemovingBackground(false);
      // URL 입력 필드 초기화
      if (imageUrlInput) {
        setImageUrlInput('');
      }
    } catch (error) {
      console.error('Failed to process image:', error);
      setIsRemovingBackground(false);
      
      // 에러 발생 시 원본 이미지로 폴백
      try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        const resizedDataUrl = await ensureImageResolution(dataUrl, 1000);
        setFormData((prev) => ({ ...prev, imageUrl: resizedDataUrl }));
      };
        reader.readAsDataURL(fileOrBlob);
      } catch (fallbackError) {
        console.error('Failed to load original image:', fallbackError);
      }
    }
  };

  // URL 정규화 함수 (프로토콜 자동 완성)
  const normalizeImageUrl = (url: string): string => {
    const trimmed = url.trim();
    
    // //로 시작하면 https: 추가
    if (trimmed.startsWith('//')) {
      return `https:${trimmed}`;
    }
    
    // 프로토콜이 없으면 https:// 추가
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return `https://${trimmed}`;
    }
    
    return trimmed;
  };

  // URL에서 이미지 가져오기
  const handleImageUrlSubmit = async () => {
    if (!imageUrlInput.trim()) return;

    setIsRemovingBackground(true);
    setLoadingMessage('이미지 불러오는 중...');

    try {
      // URL 정규화 (프로토콜 자동 완성)
      const normalizedUrl = normalizeImageUrl(imageUrlInput.trim());
      
      // 프록시 API를 통해 이미지 가져오기 (CORS 우회)
      const encodedUrl = encodeURIComponent(normalizedUrl);
      const response = await fetch(`/api/image-proxy?url=${encodedUrl}`);

      if (!response.ok) {
        // 에러 응답이 JSON인 경우
        if (response.headers.get('content-type')?.includes('application/json')) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || '이미지 주소를 확인해주세요');
        }
        throw new Error(`이미지를 불러올 수 없습니다 (${response.status})`);
      }

      // Blob 데이터로 변환
      const blob = await response.blob();
      
      // 공통 이미지 처리 함수 사용 (배경 제거 -> 압축)
      await processImage(blob, '이미지 불러오는 중...');
    } catch (error: any) {
      console.error('Failed to load image from URL:', error);
      setIsRemovingBackground(false);
      
      // 토스트 메시지 표시
      const errorMessage = error.message || '이미지 주소를 확인해주세요';
      alert(`${errorMessage}\n\n다운로드 후 붙여넣기 해주세요.`);
    }
  };

  const handleSave = async () => {
    if (!product) return;
    
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save product:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !product) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 w-full max-w-2xl shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Edit className="w-6 h-6 text-[#ccff00]" />
                  <h2 className="text-2xl font-bold text-[#ccff00]">상품 수정</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                {/* 이미지 영역 */}
                <div
                  ref={imageContainerRef}
                  onMouseEnter={() => setIsHoveringImage(true)}
                  onMouseLeave={() => setIsHoveringImage(false)}
                  onPaste={handleImagePaste}
                  className="relative w-full h-64 rounded-lg border-2 border-dashed border-white/20 bg-white/5 overflow-hidden cursor-pointer transition-all hover:border-[#ccff00]/50"
                  tabIndex={0}
                >
                  {formData.imageUrl ? (
                    <>
                      <div className="w-full h-full bg-black/20 flex items-center justify-center p-2">
                        <img
                          src={formData.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      {isHoveringImage && !isRemovingBackground && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center"
                        >
                          <p className="text-white font-medium text-center px-4">
                            클릭 후 Ctrl+V로 이미지 변경
                          </p>
                        </motion.div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">이미지 없음</p>
                        <p className="text-gray-500 text-xs mt-1">Ctrl+V로 이미지 붙여넣기</p>
                      </div>
                    </div>
                  )}
                  
                  {/* 배경 제거 로딩 오버레이 */}
                  {isRemovingBackground && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-10"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Loader2 className="w-8 h-8 text-[#ccff00] mb-3" />
                      </motion.div>
                      <p className="text-[#ccff00] font-medium text-sm">{loadingMessage}</p>
                      <p className="text-gray-400 text-xs mt-1">잠시만 기다려주세요</p>
                    </motion.div>
                  )}
                </div>

                {/* URL 입력 섹션 */}
                <div className="space-y-2">
                  <p className="text-xs text-gray-400">또는 이미지 주소로 변경</p>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleImageUrlSubmit();
                        }
                      }}
                      placeholder="https://..."
                      className="flex-1 px-3 py-2 bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition placeholder:text-gray-500"
                    />
                    <RippleButton
                      onClick={handleImageUrlSubmit}
                      disabled={!imageUrlInput.trim() || isRemovingBackground}
                      className="px-4 py-2 bg-[#ccff00] text-black font-semibold rounded-lg hover:bg-[#b3e600] transition-all shadow-[0_0_10px_rgba(204,255,0,0.3)] hover:shadow-[0_0_15px_rgba(204,255,0,0.5)] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowRight className="w-4 h-4" />
                      적용
                    </RippleButton>
                  </div>
                </div>

                {/* 상품명 - 가장 눈에 띄게 */}
                <div>
                  <label className="block text-sm font-semibold text-[#ccff00] mb-2">
                    상품명 *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white text-lg font-medium focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition"
                    placeholder="상품명을 입력하세요"
                  />
                </div>

                {/* 브랜드 */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">브랜드</label>
                  <input
                    type="text"
                    value={formData.brand || ''}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition"
                    placeholder="브랜드명"
                  />
                </div>

                {/* 대분류 / 소분류 - 한 줄에 나란히 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">대분류</label>
                    <div className="relative">
                      <select
                        value={formData.category_large || ''}
                        onChange={(e) => handleCategoryLargeChange(e.target.value)}
                        className="w-full px-4 py-3 pr-10 bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg text-white appearance-none focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition cursor-pointer"
                      >
                        <option value="" className="bg-gray-900 text-white">선택하세요</option>
                        {categoryKeys.map((key) => (
                          <option key={key} value={key} className="bg-gray-900 text-white">
                            {key}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">소분류</label>
                    <div className="relative">
                      <select
                        value={formData.category_small || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, category_small: e.target.value })
                        }
                        disabled={!formData.category_large}
                        className="w-full px-4 py-3 pr-10 bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg text-white appearance-none focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="" className="bg-gray-900 text-white">
                          {formData.category_large ? '선택하세요' : '대분류를 먼저 선택하세요'}
                        </option>
                        {formData.category_large &&
                          CATEGORY_MAP[formData.category_large]?.map((subCategory) => (
                            <option key={subCategory} value={subCategory} className="bg-gray-900 text-white">
                              {subCategory}
                            </option>
                          ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* 맛 */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">맛</label>
                  <input
                    type="text"
                    value={formData.flavor || ''}
                    onChange={(e) => setFormData({ ...formData, flavor: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition"
                    placeholder="맛 (예: 쿠키앤크림)"
                  />
                </div>

                {/* 용량 */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">용량</label>
                  <input
                    type="text"
                    value={formData.weight || ''}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition"
                    placeholder="용량 (예: 1.81kg)"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-6">
                <RippleButton
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white font-semibold transition-all"
                >
                  취소
                </RippleButton>
                <RippleButton
                  onClick={handleSave}
                  disabled={isSaving || !formData.name}
                  className="flex-1 px-4 py-3 bg-[#ccff00] text-black font-semibold rounded-lg hover:bg-[#b3e600] transition-all shadow-[0_0_20px_rgba(204,255,0,0.5)] hover:shadow-[0_0_30px_rgba(204,255,0,0.7)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      저장
                    </>
                  )}
                </RippleButton>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// VirtuosoGrid용 List 컴포넌트 (ref 전달 보장)
const GridList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, ...props }, ref) => (
    <div
      ref={ref}
      {...props}
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-20 w-full"
    >
      {children}
    </div>
  )
);
GridList.displayName = 'GridList';

export default function Home() {
  const [apiKey, setApiKey] = useState<string>('');
  const [activeTab, setActiveTab] = useState<Tab>('A');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [bGroupResults, setBGroupResults] = useState<Product[]>([]);
  
  // C그룹 전역 상태 (Context)
  const {
    productImages: cGroupProductImages,
    nutritionImages: cGroupNutritionImages,
    linkInput: cGroupLinkInput,
    imageUrlInput: cGroupImageUrlInput,
    nutritionUrlInput: cGroupNutritionUrlInput,
    formData: cGroupFormData,
    isAnalyzing: isCAnalyzing,
    isSaving: isCSaving,
    saved: cGroupSaved,
    removingBg: cGroupRemovingBg,
    productLoading,
    nutritionLoading,
    focusedArea: cGroupFocusedArea,
    nutritionHighlights: cGroupNutritionHighlights,
    nutritionImageMeta: cGroupNutritionImageMeta,
    focusedField: cGroupFocusedField,
    currentNutritionImageIndex,
    addProductImage,
    removeProductImage,
    addNutritionImage,
    removeNutritionImage,
    setLinkInput: setCGroupLinkInput,
    setImageUrlInput: setCGroupImageUrlInput,
    setNutritionUrlInput: setCGroupNutritionUrlInput,
    setFormData: setCGroupFormData,
    setFocusedArea: setCGroupFocusedArea,
    setFocusedField: setCGroupFocusedField,
    setCurrentNutritionImageIndex,
    setNutritionHighlights: setCGroupNutritionHighlights,
    setNutritionImageMeta: setCGroupNutritionImageMeta,
    setSaved: setCGroupSaved,
    runAnalysis: runCAnalysis,
    saveToInventory: handleCSaveToA,
    resetAll: resetAllFromContext,
  } = useAnalysis();
  
  // C그룹 전체 초기화 래퍼 (로컬 상태도 함께 초기화)
  const handleCReset = () => {
    resetAllFromContext();
    // 상품 정보 분석 관련 로컬 상태 초기화
    setProductInfoImage('');
    setProductInfoUrlInput('');
    if (productInfoFileInputRef.current) {
      productInfoFileInputRef.current.value = '';
    }
  };
  
  // 로컬 UI 상태 (Context에 포함되지 않는 것들)
  const [nutritionImageLoaded, setNutritionImageLoaded] = useState(false);
  const [isNutritionImageZoomed, setIsNutritionImageZoomed] = useState(false);
  const [nutritionImageZoom, setNutritionImageZoom] = useState(1);
  const [nutritionImageMagnifier, setNutritionImageMagnifier] = useState({ x: 50, y: 50, isHovering: false });
  const [isCAnalyzingLocal, setIsCAnalyzingLocal] = useState(false);
  const cGroupProductFileInputRef = useRef<HTMLInputElement>(null);
  const cGroupNutritionFileInputRef = useRef<HTMLInputElement>(null);
  
  // 상품 정보 분석 탭 상태
  const [productInfoImage, setProductInfoImage] = useState<string>('');
  const [productInfoUrlInput, setProductInfoUrlInput] = useState<string>('');
  const [productInfoLoading, setProductInfoLoading] = useState(false);
  const productInfoFileInputRef = useRef<HTMLInputElement>(null);
  const nutritionImageRef = useRef<HTMLImageElement>(null);
  
  // B그룹 (시장조사) - 전면 리뉴얼: 쿠팡 텍스트 세탁 & 1:1 비교 시스템
  const [bGroupActiveSubTab, setBGroupActiveSubTab] = useState<'PARSER' | 'COMPARE'>('PARSER');
  const [extractedProducts, setExtractedProducts] = useState<Array<{
    brand: string;
    title: string;
    flavor?: string;
    weight?: string;
  }>>([]);
  const [finalProducts, setFinalProducts] = useState<Array<{
    brand: string;
    title: string;
    flavor?: string;
    weight?: string;
  }>>([]);
  const [activeFilter, setActiveFilter] = useState<{ type: 'BRAND' | 'FLAVOR' | 'WEIGHT'; value: string } | null>(null);
  const [bGroupParserText, setBGroupParserText] = useState<string>('');
  const [isBGroupParsing, setIsBGroupParsing] = useState(false);
  const [draggedProduct, setDraggedProduct] = useState<{ brand: string; title: string; flavor?: string; weight?: string } | null>(null);
  const [isBSaving, setIsBSaving] = useState(false);
  const [bGroupListImages, setBGroupListImages] = useState<string[]>([]);
  const [bGroupListResults, setBGroupListResults] = useState<Array<{
    brand: string;
    name: string;
    flavor?: string;
    weight_g?: number;
    weight_kg?: number;
    is_snack: boolean;
    bundle_count: number;
    status: 'NEW' | 'VARIATION' | 'DUPLICATE';
    variationMessage?: string;
    link?: string;
    isLoadingLink?: boolean;
  }>>([]);
  const [bGroupListExcluded, setBGroupListExcluded] = useState<Array<{
    brand: string;
    name: string;
    flavor?: string;
    weight_g?: number;
    reason: string;
    type: 'BRAND' | 'BUNDLE' | 'DUPLICATE';
  }>>([]);

  // 공백 무시 비교 함수 (스마트 필터)
  const normalizeForMatch = (str: string): string => {
    return str.replace(/\s+/g, '').toLowerCase();
  };

  // 필터 매칭 확인 함수
  const isMatch = (value1: string, value2: string): boolean => {
    return normalizeForMatch(value1) === normalizeForMatch(value2);
  };

  // 필터 조건 체크 함수 (정렬용)
  const checkMatch = (product: { brand: string; title: string; flavor?: string; weight?: string }, filter: { type: 'BRAND' | 'FLAVOR' | 'WEIGHT'; value: string }): boolean => {
    if (filter.type === 'BRAND') {
      return isMatch(product.brand || '', filter.value);
    } else if (filter.type === 'FLAVOR') {
      return isMatch(product.flavor || '', filter.value);
    } else if (filter.type === 'WEIGHT') {
      return isMatch(product.weight || '', filter.value);
    }
    return false;
  };

  // 스마트 정렬된 분석 결과 (useMemo)
  const sortedProducts = useMemo(() => {
    if (!activeFilter) return extractedProducts;
    
    return [...extractedProducts].sort((a, b) => {
      const matchA = checkMatch(a, activeFilter);
      const matchB = checkMatch(b, activeFilter);
      // 일치하는 항목을 앞으로 (-1), 일치하지 않는 항목을 뒤로 (1)
      return matchA === matchB ? 0 : matchA ? -1 : 1;
    });
  }, [extractedProducts, activeFilter]);
  const [cGroupData, setCGroupData] = useState<Partial<Product>>({});
  const [cGroupImages, setCGroupImages] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [showToast, setShowToast] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryLarge | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<CategorySmall | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [selectedFlavor, setSelectedFlavor] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
    const savedViewMode = localStorage.getItem('view_mode') as 'grid' | 'list' | null;
    if (savedViewMode) {
      setViewMode(savedViewMode);
    }
    loadProducts();
  }, []);

  useEffect(() => {
    localStorage.setItem('view_mode', viewMode);
  }, [viewMode]);

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const saveApiKey = () => {
    localStorage.setItem('gemini_api_key', apiKey);
    alert('API Key가 저장되었습니다.');
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    if (activeTab !== 'A') return;

    const items = e.clipboardData.items;
    const imageItems = Array.from(items).filter((item) => item.type.startsWith('image/'));

    if (imageItems.length === 0) return;

    e.preventDefault();
    setLoading(true);

    try {
      const imagePromises = imageItems.map((item) => {
        return new Promise<string>(async (resolve) => {
          const file = item.getAsFile();
          if (!file) {
            resolve('');
            return;
          }
          const reader = new FileReader();
          reader.onload = async (e) => {
            const dataUrl = e.target?.result as string;
            // 이미지 해상도 보장 (최소 가로 1000px)
            const resizedDataUrl = await ensureImageResolution(dataUrl, 1000);
            resolve(resizedDataUrl);
          };
          reader.readAsDataURL(file);
        });
      });

      const imageDataUrls = (await Promise.all(imagePromises)).filter(Boolean);

      if (activeTab === 'A') {
        // A그룹: 대량 등록 모드
        await processBulkProductsToA(imageDataUrls);
      }
    } catch (error) {
      console.error('Failed to process images:', error);
      alert('이미지 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const processBulkProductsToA = async (imageDataUrls: string[]) => {
    if (!apiKey) {
      alert('Gemini API Key를 먼저 입력해주세요.');
      return;
    }

    // 토스트 알림 표시
    setToastMessage(`🚀 ${imageDataUrls.length}개 이미지를 분석 중입니다...`);
    setShowToast(true);

    const prompt = `⚠️ 중요: 이 이미지는 이커머스 쇼핑몰의 상품 리스트 화면입니다. 이미지 내에 보이는 '모든' 상품 카드를 하나도 빠짐없이 각각 추출하세요.

📋 구조 인식:
- 각 상품 카드는 [이미지] - [이름] - [가격] - [옵션] 형태로 반복되는 패턴을 가지고 있습니다.
- 이미지 위에서부터 아래까지 스크롤하며 모든 상품을 찾아야 합니다.
- 긴 스크롤 캡처 이미지라도 위에서 아래까지 전부 읽어서 모든 상품을 추출하세요.
- 상품이 하나만 보여도, 여러 개 보여도 모두 추출하세요.

🔍 데이터 추출 규칙:

1. Brand (브랜드명):
   - 상품명 앞에 있는 브랜드명을 찾으세요 (예: '머슬팜', 'MP', '옵티멈' 등)
   - 없으면 상품명에서 첫 단어를 브랜드로 유추하세요

2. Name (상품명):
   - 가장 크고 굵은 글씨가 상품명입니다
   - 예: "컴뱃 프로틴 파우더", "웨이 프로틴 아이솔레이트"

3. Category_large (대분류) - 7대 카테고리 중 하나로 반드시 분류:
   다음 6가지 카테고리 중 상품명과 특징을 보고 정확히 하나를 선택하세요:
   
   🥩 "단백질 보충제": 프로틴 파우더, WPC, WPI, 식물성 단백질, 카제인, 게이너 등
   💪 "운동보조제": 크레아틴, 부스터, 아르기닌, 비트즙, 베타알라닌, EAA, 아미노산 등
   🧃 "단백질 드링크": 단백질 음료, 고단백 두유, 단백질몰빵 등
   🍫 "단백질 간식": 프로틴바, 프로틴 칩, 프로틴 쿠키, 씨리얼 등
   💊 "영양제": 비타민D, 아연, 홍삼, 유산균, 종합비타민, 오메가3 등
   🐔 "닭가슴살": 닭가슴살 스테이크, 소시지, 볼, 훈제, 소스 등
   
   - 이미지 상단의 경로 텍스트가 있으면 그것을 우선 사용하세요
   - 없으면 상품명과 특징을 보고 위 6가지 중 가장 적합한 것을 선택하세요
   - 이모지는 제외하고 텍스트만 반환하세요 (예: "단백질 보충제")

4. Category_small (소분류):
   선택한 대분류에 따라 다음 소분류 중 하나를 선택하세요:
   
   단백질 보충제: "WPC", "WPI", "식물성", "카제인", "게이너", "선식(탄수)", "마이프로틴", "국내(비추)"
   운동보조제: "크레아틴", "부스터", "아르기닌", "비트즙", "베타알라닌", "EAA", "아미노산", "전해질", "HMB", "카르니틴"
   단백질 드링크: "단백질몰빵", "고단백두유", "탄수↑,당↓"
   단백질 간식: "프로틴바", "칩", "프로틴쿠키", "씨리얼"
   영양제: "비타민D", "비타민 D", "아연", "홍삼", "유산균", "종합비타민", "오메가3", "CLA", "집중·인지", "ZMA", "커큐민", "그린스", "L-테아닌", "마그네슘", "머쉬룸", "마카", "아피제닌", "알파GPC", "초유(콜로스트럼)", "글루코사민", "히알루론산", "레스베라트롤"
   닭가슴살: "스테이크", "소시지", "볼", "훈제", "소스"
   
   - 경로 텍스트나 상품 특징에서 소분류를 추출하세요
   - 명확하지 않으면 가장 유사한 것을 선택하세요

5. Flavor (맛):
   - 상품명 근처나 아래에 있는 작은 글씨를 찾으세요
   - 예: "쿠키앤크림", "초콜릿밀크", "바닐라", "딸기" 등
   - '맛'이라는 글자가 없어도 문맥상 맛이면 추출하세요

6. Weight (용량):
   - kg, g, lb 단위로 끝나는 숫자를 찾으세요
   - 예: "1.81kg", "2.27kg", "4lb", "907g" 등

❌ 무시할 것:
- 가격 정보는 완전히 무시하세요
- 배송일, 리뷰 수, 별점 등은 추출하지 마세요

✅ 반드시 지킬 것:
- 이미지가 잘려서 일부만 보여도 최대한 텍스트를 복원해서 입력하세요
- 위에서 아래까지 모든 상품을 추출하세요 (하나도 빠뜨리지 마세요)
- category_large는 반드시 위 6가지 중 하나로 분류하세요 (이모지 제외)

다음 형식의 JSON 배열로 응답하세요 (반드시 배열 형태):
[
  {
    "name": "상품 전체 이름",
    "category_large": "대분류 (7대 카테고리 중 하나, 이모지 제외)",
    "category_small": "소분류",
    "flavor": "맛",
    "weight": "용량"
  }
]`;

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          images: imageDataUrls,
          prompt,
          mode: 'bulk',
        }),
      });

      const data = await res.json();
      let extractedProducts: Partial<Product>[] = [];

      if (data.raw) {
        const parsed = safeParseJSON(data.text);
        if (Array.isArray(parsed)) {
          extractedProducts = parsed;
        }
      } else if (Array.isArray(data)) {
        extractedProducts = data;
      } else if (data.products) {
        extractedProducts = data.products;
      }

      if (extractedProducts.length === 0) {
        setToastMessage('❌ 상품을 찾을 수 없습니다.');
        setShowToast(true);
        return;
      }

      // 브랜드명 추출 (name에서 첫 단어 추출)
      const productsWithBrand = extractedProducts.map((p) => {
        const nameParts = p.name?.split(' ') || [];
        const brand = nameParts.length > 0 ? nameParts[0] : undefined;
        return {
          ...p,
          brand,
        };
      });

      // 모든 상품을 A그룹에 저장
      let successCount = 0;
      for (const product of productsWithBrand) {
        try {
          const newProduct: Omit<Product, 'id' | 'createdAt'> = {
            name: product.name || '알 수 없음',
            brand: product.brand,
            flavor: product.flavor,
            weight: product.weight,
            category_large: product.category_large,
            category_small: product.category_small,
            imageUrl: imageDataUrls[0], // 첫 번째 이미지 사용
          };

          const createRes = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newProduct),
          });

          if (createRes.ok) {
            successCount++;
          }
        } catch (error) {
          console.error('Failed to save product:', error);
        }
      }

      await loadProducts();
      setToastMessage(`✅ ${successCount}개 상품이 등록되었습니다!`);
      setShowToast(true);
    } catch (error) {
      console.error('Failed to process bulk products:', error);
      setToastMessage('❌ 상품 처리 중 오류가 발생했습니다.');
      setShowToast(true);
    }
  };

  // URL 정제 함수 (vendorItemId=숫자까지만 남기기)
  const cleanCoupangUrl = (url: string): string => {
    if (!url) return '';
    
    const trimmed = url.trim();
    const match = trimmed.match(/(.*vendorItemId=\d+)/);
    
    if (match) {
      return match[1];
    }
    
    return trimmed;
  };


  // C그룹 상품 이미지 URL 추가 (자동 배경 제거)
  const handleCGroupImageUrlAdd = async () => {
    if (!cGroupImageUrlInput.trim()) return;

    try {
      // 1. 이미지 가져오기
      const encodedUrl = encodeURIComponent(cGroupImageUrlInput.trim());
      const response = await fetch(`/api/image-proxy?url=${encodedUrl}`);

      if (!response.ok) {
        toast.error('이미지를 불러올 수 없습니다.');
        return;
      }

      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = async (e) => {
        const originalDataUrl = e.target?.result as string;
        
        setCGroupImageUrlInput('');
        // Context의 addProductImage 사용 (백그라운드에서 배경 제거)
        await addProductImage(originalDataUrl);
        toast.success('이미지가 추가되었습니다. 배경 제거 중...');
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Failed to load image from URL:', error);
      toast.error('이미지 URL을 확인해주세요.');
    }
  };

  // C그룹 상품 이미지 파일 선택 (배경 제거) - Context 사용
  const handleCGroupProductFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const originalDataUrl = e.target?.result as string;
        // Context의 addProductImage 사용 (백그라운드에서 배경 제거)
        await addProductImage(originalDataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  // C그룹 성분표 이미지 URL 추가 (배경 제거 안 함)
  const handleCGroupNutritionUrlAdd = async () => {
    if (!cGroupNutritionUrlInput.trim()) return;

    try {
      // 1. 이미지 가져오기
      const encodedUrl = encodeURIComponent(cGroupNutritionUrlInput.trim());
      const response = await fetch(`/api/image-proxy?url=${encodedUrl}`);

      if (!response.ok) {
        toast.error('이미지를 불러올 수 없습니다.');
        return;
      }

      const blob = await response.blob();
      
      // 2. Blob을 Base64로 변환 (배경 제거 없이 원본 그대로)
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        // Context의 addNutritionImage 사용
        addNutritionImage(dataUrl);
        setCGroupNutritionUrlInput('');
        toast.success('성분표 이미지가 추가되었습니다!');
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Failed to load image from URL:', error);
      toast.error('이미지 URL을 확인해주세요.');
    }
  };

  // C그룹 성분표 이미지 파일 선택 (배경 제거 안 함)
  const handleCGroupNutritionFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const readers = files.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then((imageDataUrls) => {
      imageDataUrls.forEach((url) => addNutritionImage(url));
    });
  };

  // C그룹 상품 이미지 Ctrl+V 붙여넣기 (배경 제거)
  const handleCGroupProductPaste = async (e: React.ClipboardEvent) => {
    if (activeTab !== 'C' || cGroupFocusedArea !== 'product') return;

    const items = e.clipboardData.items;
    const imageItems = Array.from(items).filter((item) => item.type.startsWith('image/'));

    if (imageItems.length === 0) return;

    e.preventDefault();

    for (const item of imageItems) {
      const file = item.getAsFile();
      if (!file) continue;

      const reader = new FileReader();
      reader.onload = async (e) => {
        const originalDataUrl = e.target?.result as string;
        // Context의 addProductImage 사용 (백그라운드에서 배경 제거)
        await addProductImage(originalDataUrl);
      };
      reader.readAsDataURL(file);
    }

    toast.success(`${imageItems.length}개 상품 이미지가 추가되었습니다.`);
  };

  // C그룹 성분표 Ctrl+V 붙여넣기 (배경 제거 안 함)
  const handleCGroupNutritionPaste = async (e: React.ClipboardEvent) => {
    if (activeTab !== 'C' || cGroupFocusedArea !== 'nutrition') return;

    const items = e.clipboardData.items;
    const imageItems = Array.from(items).filter((item) => item.type.startsWith('image/'));

    if (imageItems.length === 0) return;

    e.preventDefault();

    const readers = imageItems.map((item) => {
      return new Promise<string>((resolve) => {
        const file = item.getAsFile();
        if (!file) {
          resolve('');
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then((imageDataUrls) => {
      const validUrls = imageDataUrls.filter(Boolean);
      if (validUrls.length > 0) {
        validUrls.forEach((url) => addNutritionImage(url));
        toast.success(`${validUrls.length}개 성분표가 추가되었습니다.`);
      }
    });
  };

  // C그룹 분석 시작
  const handleCAnalyze = async () => {
    if (!apiKey) {
      toast.error('Gemini API Key를 먼저 입력해주세요.');
      return;
    }

    if (cGroupProductImages.length === 0 && cGroupNutritionImages.length === 0) {
      toast.error('이미지를 업로드해주세요.');
      return;
    }

    setIsCAnalyzingLocal(true);
    setCGroupNutritionHighlights([]);

    // 성분표 이미지가 있으면 좌표 추출 API 호출
    let nutritionHighlights: Array<{ field: string; coords: Array<{ x: number; y: number }> }> = [];
    
    if (cGroupNutritionImages.length > 0) {
      try {
        const nutritionRes = await fetch('/api/analyze-nutrition-with-coords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageDataUrl: cGroupNutritionImages[0],
            apiKey,
          }),
        });

        if (nutritionRes.ok) {
          const nutritionData = await nutritionRes.json();
          nutritionHighlights = nutritionData.highlights || [];
          setCGroupNutritionHighlights(nutritionHighlights);
          
          // 이미지 메타데이터 저장 (원본 크기)
          if (nutritionData.meta) {
            setCGroupNutritionImageMeta(nutritionData.meta);
          }
          
          // 좌표 추출 API에서 받은 데이터로 폼 일부 업데이트
          if (nutritionData.extractedData) {
            const extracted = nutritionData.extractedData;
            setCGroupFormData((prev) => ({
              ...prev,
              protein: extracted.protein?.replace('g', '') || prev.protein,
              sugar: extracted.sugar?.replace('g', '') || prev.sugar,
              fat: extracted.fat?.replace('g', '') || prev.fat,
              total_carb: extracted.carb?.replace('g', '') || prev.total_carb,
              calorie: extracted.calorie?.replace('kcal', '') || prev.calorie,
              gram: extracted.gram?.replace('g', '') || prev.gram,
            }));
          }
        }
      } catch (error) {
        console.error('Failed to analyze nutrition with coords:', error);
      }
    }

    // 두 그룹의 이미지를 합치기 (상품 이미지 먼저, 성분표 나중)
    const allImages = [...cGroupProductImages, ...cGroupNutritionImages];

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

3. **대분류 (category)**: 
   - 항상 "단백질 보충제"로 고정하라 (변경하지 마라)

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
  "flavor": "맛 (한국어)",
  "amount": "용량 (예: 2.27kg)",
  "category": "단백질 보충제",
  "sub_category": "소분류 (WPC, WPI, 식물성, 카제인, 게이너, 선식(탄수), 마이프로틴, 국내(비추) 중 하나)",
  "protein": 숫자 (단백질 g),
  "scoops": 숫자 (총 서빙 횟수),
  "sugar": 숫자 (당류 g),
  "fat": 숫자 (지방 g),
  "calorie": 숫자 (칼로리 kcal),
  "gram": 숫자 (1회 섭취량 g),
  "total_carb": 숫자 (총 탄수화물 g)
}`;

    try {
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

      const data = await res.json();
      let extractedData: any = {};

      if (data.raw) {
        const parsed = safeParseJSON(data.text);
        if (parsed) {
          extractedData = parsed;
        }
      } else {
        extractedData = data;
      }

      // 소분류 분류 로직: AI가 추출한 sub_category를 한글 옵션으로 매핑 (WPC 우선 법칙 적용)
      const mapSubCategoryToKorean = (subCategory: string, fullText?: string): string => {
        if (!subCategory) return '';
        
        const subCategoryLower = subCategory.toLowerCase();
        const fullTextLower = (fullText || '').toLowerCase();
        const combinedText = `${subCategoryLower} ${fullTextLower}`;
        
        // WPC 우선 법칙: Concentrate가 포함되면 WPI가 섞여 있어도 무조건 WPC
        if (combinedText.includes('concentrate') || combinedText.includes('wpc')) {
          return 'WPC';
        }
        
        // WPI 조건: Isolate만 있고 Concentrate가 없으면 WPI
        if ((combinedText.includes('isolate') || combinedText.includes('wpi')) && !combinedText.includes('concentrate')) {
          return 'WPI';
        }
        
        // 식물성
        if (combinedText.includes('soy') || combinedText.includes('pea') || combinedText.includes('식물성') || combinedText.includes('plant')) {
          return '식물성';
        }
        
        // 카제인
        if (combinedText.includes('casein') || combinedText.includes('카제인')) {
          return '카제인';
        }
        
        // 게이너
        if (combinedText.includes('gainer') || combinedText.includes('mass') || combinedText.includes('게이너')) {
          return '게이너';
        }
        
        // 이미 한글 옵션인 경우 그대로 반환
        const koreanOptions = ['WPC', 'WPI', '식물성', '카제인', '게이너', '선식(탄수)', '마이프로틴', '국내(비추)'];
        if (koreanOptions.includes(subCategory)) {
          return subCategory;
        }
        
        // 기본값: 빈 문자열 (사용자가 수동으로 선택하도록)
        return '';
      };

      // 폼 데이터 업데이트 (0이나 null 값 처리)
      const formatNumericValue = (value: any): string => {
        if (value === null || value === undefined || value === '') return '';
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(numValue)) return '';
        // 0인 경우도 표시 (사용자가 인지할 수 있도록)
        return numValue === 0 ? '0' : numValue.toString();
      };

      setCGroupFormData({
        name: extractedData.name || '',
        link: cleanCoupangUrl(cGroupLinkInput), // 정제된 URL
        flavor: extractedData.flavor || '',
        amount: extractedData.amount || '',
        category: '단백질 보충제', // 대분류는 항상 "단백질 보충제"로 고정
        sub_category: mapSubCategoryToKorean(extractedData.sub_category || '', extractedData.name || ''),
        protein: formatNumericValue(extractedData.protein),
        scoops: formatNumericValue(extractedData.scoops),
        sugar: formatNumericValue(extractedData.sugar),
        fat: formatNumericValue(extractedData.fat),
        calorie: formatNumericValue(extractedData.calorie),
        gram: formatNumericValue(extractedData.gram),
        total_carb: formatNumericValue(extractedData.total_carb),
      });

      setCGroupSaved(false); // 분석 완료 시 저장 상태 초기화
      toast.success('분석이 완료되었습니다!');
    } catch (error) {
      console.error('Failed to analyze:', error);
      toast.error('분석 중 오류가 발생했습니다.');
    } finally {
      setIsCAnalyzingLocal(false);
    }
  };

  // C그룹 데이터를 A그룹(보관함)에 저장 - Context의 saveToInventory 래퍼
  const handleCSaveToAWrapper = async () => {
    if (!cGroupFormData.name) {
      toast.error('제품명을 입력해주세요.');
      return;
    }

    try {
      // 메인 이미지 가져오기 (첫 번째 상품 이미지 우선, 없으면 성분표)
      let imageUrl = '';
      if (cGroupProductImages.length > 0) {
        imageUrl = await ensureImageResolution(cGroupProductImages[0], 1000);
      } else if (cGroupNutritionImages.length > 0) {
        imageUrl = await ensureImageResolution(cGroupNutritionImages[0], 1000);
      }

      // Context의 saveToInventory 사용 (Context에서 가져온 함수)
      await handleCSaveToA(imageUrl);
      await loadProducts();
    } catch (error) {
      console.error('Failed to save to A group:', error);
      toast.error('저장 중 오류가 발생했습니다.');
    }
  };

  // C그룹 엑셀용 복사 (탭으로 구분) - 엑셀 컬럼 순서와 일치
  const copyCGroupToExcel = async () => {
    // 대분류 변환 함수
    const convertCategory = (category: string): string => {
      if (category === '단백질 보충제') return '보충제';
      if (category === '운동보조제') return '보조제';
      if (category === '단백질 드링크') return '드링크';
      if (category === '단백질 간식') return '간식';
      return category || '보충제';
    };

    const fields = [
      cGroupFormData.name,           // 제품명
      cGroupFormData.link,           // 쿠팡링크 (vendorId 까지)
      cGroupFormData.flavor,         // 맛
      cGroupFormData.amount,         // 용량 (예: 1000mg, 200정)
      convertCategory(cGroupFormData.category || '단백질 보충제'), // 대카테고리 (변환된 값)
      cGroupFormData.sub_category,   // 소카테고리
      cGroupFormData.protein,        // 단백질
      cGroupFormData.scoops,         // 총 서빙
      cGroupFormData.sugar,          // 당류
      cGroupFormData.fat,            // 지방
      cGroupFormData.calorie,        // 칼로리
      cGroupFormData.gram,           // 1회당 용량
      cGroupFormData.total_carb,     // 총 탄수
      cGroupFormData.reviewCount || '', // 총 리뷰수
    ];

    const tabSeparated = fields.join('\t');

    try {
      // Modern Clipboard API 사용 (HTTPS 또는 localhost에서만 작동)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(tabSeparated);
        toast.success('복사 완료! 엑셀에 붙여넣으세요.');
      } else {
        // Fallback: 예전 방식 (deprecated이지만 더 넓은 호환성)
        const textArea = document.createElement('textarea');
        textArea.value = tabSeparated;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          toast.success('복사 완료! 엑셀에 붙여넣으세요.');
        } else {
          toast.error('클립보드 복사에 실패했습니다. 텍스트를 수동으로 복사해주세요.');
        }
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('클립보드 복사에 실패했습니다. 텍스트를 수동으로 복사해주세요.');
    }
  };

  // 리스트 스캔 모드: 이미지 붙여넣기 (배열에 추가)
  const handleBGroupListPaste = async (e: React.ClipboardEvent) => {
    if (activeTab !== 'B') return;

    const items = e.clipboardData.items;
    const imageItems = Array.from(items).filter((item) => item.type.startsWith('image/'));

    if (imageItems.length === 0) return;

    e.preventDefault();

    // 최대 5장까지만 허용
    if (bGroupListImages.length >= 5) {
      toast.error('최대 5장까지만 추가할 수 있습니다.');
      return;
    }

    const file = imageItems[0].getAsFile();
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setBGroupListImages((prev) => [...prev, dataUrl]);
      toast.success(`리스트 이미지가 추가되었습니다. (${bGroupListImages.length + 1}/5)`);
    };
    reader.readAsDataURL(file);
  };

  // 리스트 스캔 모드: 이미지 개별 삭제
  const handleBGroupListImageRemove = (index: number) => {
    setBGroupListImages((prev) => prev.filter((_, i) => i !== index));
    toast.success('이미지가 제거되었습니다.');
  };

  // 리스트 스캔 모드: 모든 이미지 지우기
  const handleBGroupListImagesClear = () => {
    setBGroupListImages([]);
    setBGroupListResults([]);
    setBGroupListExcluded([]);
    toast.success('모든 이미지가 제거되었습니다.');
  };

  // 중량을 그램 단위로 변환하는 유틸리티 함수
  const parseWeightToGrams = (weightStr: string | number | undefined): number | undefined => {
    if (!weightStr) return undefined;
    
    const str = String(weightStr).toLowerCase().trim();
    // kg 단위 추출
    const kgMatch = str.match(/([\d.]+)\s*kg/);
    if (kgMatch) {
      return Math.round(parseFloat(kgMatch[1]) * 1000);
    }
    // g 단위 추출
    const gMatch = str.match(/([\d.]+)\s*g(?!\w)/);
    if (gMatch) {
      return Math.round(parseFloat(gMatch[1]));
    }
    // 숫자만 있는 경우 (기본적으로 g로 가정)
    const numMatch = str.match(/([\d.]+)/);
    if (numMatch) {
      const num = parseFloat(numMatch[1]);
      // 1000 이상이면 kg로 가정
      return num >= 1000 ? Math.round(num) : Math.round(num);
    }
    return undefined;
  };

  // 텍스트 정규화 및 동의어 처리
  const normalizeForComparison = (text: string): string => {
    if (!text) return '';
    
    // 소문자 변환
    let normalized = text.toLowerCase();
    
    // 동의어 사전 적용
    const synonymMap: Record<string, string> = {
      'strawberry': '딸기',
      '스트로베리': '딸기',
      '딸기': '딸기',
      'choco': '초콜릿',
      'chocolate': '초콜릿',
      '초코': '초콜릿',
      '초콜렛': '초콜릿',
      '초콜릿': '초콜릿',
      'vanilla': '바닐라',
      '바닐라': '바닐라',
      'banana': '바나나',
      '바나나': '바나나',
      'cookie': '쿠키',
      '쿠키': '쿠키',
    };
    
    // 동의어 치환
    for (const [key, value] of Object.entries(synonymMap)) {
      const regex = new RegExp(key, 'gi');
      normalized = normalized.replace(regex, value);
    }
    
    // 불필요한 수식어 제거
    const removeWords = ['맛', 'flavor', 'flavour', '프로틴', '단백질', '보충제', '쉐이크', 'shake', 'protein', 'supplement'];
    for (const word of removeWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      normalized = normalized.replace(regex, '');
    }
    
    // 공백과 특수문자 제거
    normalized = normalized.replace(/[\s\W_]/g, '');
    
    return normalized;
  };

  // 쿠팡 URL에서 ID 추출 (productId 또는 vendorItemId)
  const extractCoupangId = (url: string): string | null => {
    if (!url) return null;
    
    // vendorItemId 추출
    const vendorMatch = url.match(/vendorItemId=(\d+)/);
    if (vendorMatch) {
      return vendorMatch[1];
    }
    
    // productId 추출
    const productMatch = url.match(/products\/(\d+)/);
    if (productMatch) {
      return productMatch[1];
    }
    
    return null;
  };

  // 텍스트 토큰화 (한글: 2음절, 영어: 단어)
  const tokenizeText = (text: string): string[] => {
    if (!text) return [];
    
    const tokens: string[] = [];
    
    // 한글 2음절 단위 추출
    const koreanRegex = /[\uAC00-\uD7A3]{2,}/g;
    const koreanMatches = text.match(koreanRegex);
    if (koreanMatches) {
      for (const match of koreanMatches) {
        // 2음절씩 슬라이싱
        for (let i = 0; i < match.length - 1; i++) {
          tokens.push(match.substring(i, i + 2));
        }
      }
    }
    
    // 영어 단어 추출
    const englishWords = text.match(/[a-z]+/gi);
    if (englishWords) {
      tokens.push(...englishWords);
    }
    
    // 숫자 추출
    const numbers = text.match(/\d+/g);
    if (numbers) {
      tokens.push(...numbers);
    }
    
    return tokens.filter(token => token.length > 0);
  };

  // 브랜드 정규화 (한글/영어 매핑)
  const normalizeBrand = (brand: string): string => {
    if (!brand) return '';
    
    const brandMap: Record<string, string> = {
      'musclepharm': '머슬팜',
      '머슬팜': '머슬팜',
      'optimum': '옵티멈',
      '옵티멈': '옵티멈',
      'optimum nutrition': '옵티멈',
      'dymatize': '다이마타이즈',
      '다이마타이즈': '다이마타이즈',
      'myprotein': '마이프로틴',
      '마이프로틴': '마이프로틴',
      'bsn': '비에스엔',
      '비에스엔': '비에스엔',
      'cellucor': '셀루코어',
      '셀루코어': '셀루코어',
      'quest': '퀘스트',
      '퀘스트': '퀘스트',
      'isopure': '아이소퓨어',
      '아이소퓨어': '아이소퓨어',
    };
    
    const normalized = brand.toLowerCase().trim();
    return brandMap[normalized] || normalized;
  };

  // 머슬팜 라인업 매핑 (한국어 발음 변형 및 수식어 포함)
  const MP_LINEUP_MAP: Record<string, string[]> = {
    "COMBAT_WHEY": [
      "Combat 100% Whey", "Combat Ultra Whey", "Ultra Whey", "Sport Series",
      "컴뱃 100% 웨이", "컴뱃 울트라 웨이", "울트라 웨이", "컴뱃 프로틴",
      "컴배트", "컴배트 울트라", "울트라 프리미엄", "Ultra Premium",
      "컴뱃", "컴배트 100%", "컴배트 울트라 웨이"
    ],
    "COMBAT_POWDER": [
      "Combat Protein", "Combat Protein Powder", "Combat", "컴뱃", "컴배트", "컴뱃 프로틴", "컴배트 프로틴"
    ],
  };

  // 라인업 정규화 (머슬팜 매핑 적용)
  const normalizeLineupWithMap = (lineup: string): string => {
    if (!lineup) return '';
    
    const normalized = lineup.toLowerCase().trim();
    
    // 머슬팜 라인업 매핑 확인
    for (const [key, variants] of Object.entries(MP_LINEUP_MAP)) {
      for (const variant of variants) {
        if (normalized.includes(variant.toLowerCase()) || variant.toLowerCase().includes(normalized)) {
          return key.toLowerCase();
        }
      }
    }
    
    return normalized;
  };

  // 맛 정규화 강화 (띄어쓰기 제거, 불용어 제거, 동의어 처리)
  const normalizeFlavor = (flavor: string): string => {
    if (!flavor) return '';
    
    let normalized = flavor.toLowerCase().trim();
    
    // 동의어 사전
    const synonymMap: Record<string, string> = {
      'strawberry': '딸기',
      '스트로베리': '딸기',
      '딸기': '딸기',
      'choco': '초콜릿',
      'chocolate': '초콜릿',
      '초코': '초콜릿',
      '초콜렛': '초콜릿',
      '초콜릿': '초콜릿',
      'vanilla': '바닐라',
      '바닐라': '바닐라',
      'banana': '바나나',
      '바나나': '바나나',
      'cookie': '쿠키',
      '쿠키': '쿠키',
      'milk': '우유',
      '밀크': '우유',
      '우유': '우유',
      'cream': '크림',
      '크림': '크림',
    };
    
    // 동의어 치환
    for (const [key, value] of Object.entries(synonymMap)) {
      const regex = new RegExp(key, 'gi');
      normalized = normalized.replace(regex, value);
    }
    
    // 띄어쓰기 제거
    normalized = normalized.replace(/\s+/g, '');
    
    // 끝에 붙은 불용어 제거 ('맛', '향')
    normalized = normalized.replace(/[맛향]$/g, '');
    
    // 특수 매핑: "바나나우유"와 "바나나" 통일
    if (normalized.includes('바나나우유') || normalized === '바나나우유') {
      normalized = '바나나';
    }
    
    // "초콜릿"과 "초코" 통일
    if (normalized.includes('초콜릿') || normalized === '초코') {
      normalized = '초콜릿';
    }
    
    return normalized;
  };

  // 맛 부분 일치 확인 (포함 관계 허용)
  const compareFlavorPartial = (flavor1: string, flavor2: string): boolean => {
    if (!flavor1 || !flavor2) return false;
    
    const norm1 = normalizeFlavor(flavor1);
    const norm2 = normalizeFlavor(flavor2);
    
    // 정확히 일치
    if (norm1 === norm2) return true;
    
    // 부분 일치 (포함 관계)
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
      return true;
    }
    
    return false;
  };

  // 용량 정규화 (숫자만 추출하여 오차 범위 ±5% 내 허용)
  const normalizeCapacity = (weight: string | number | undefined, weight_g?: number): number | null => {
    // weight_g가 있으면 우선 사용
    if (weight_g !== undefined) {
      return weight_g;
    }
    
    if (!weight) return null;
    
    const weightGrams = parseWeightToGrams(weight);
    return weightGrams !== undefined ? weightGrams : null;
  };

  // 용량 비교 (오차 범위 ±5% 내 허용)
  const compareCapacity = (capacity1: number | null, capacity2: number | null): boolean => {
    if (capacity1 === null || capacity2 === null) {
      // 둘 다 없으면 일치로 간주
      return capacity1 === null && capacity2 === null;
    }
    
    const diff = Math.abs(capacity1 - capacity2);
    const avg = (capacity1 + capacity2) / 2;
    const tolerance = avg * 0.05; // ±5%
    
    return diff <= tolerance;
  };

  // 라인업 추출 (제목에서 핵심 키워드만 추출, 브랜드명 제거 강화)
  const extractLineup = (title: string, brand: string): string => {
    if (!title) return '';
    
    let lineup = title.toLowerCase().trim();
    
    // 브랜드명 제거 (한글/영어 모두)
    if (brand) {
      const brandNormalized = normalizeBrand(brand).toLowerCase();
      const brandOriginal = brand.toLowerCase();
      
      // 정규화된 브랜드명 제거
      lineup = lineup.replace(new RegExp(brandNormalized, 'gi'), '');
      // 원본 브랜드명 제거
      lineup = lineup.replace(new RegExp(brandOriginal, 'gi'), '');
      
      // 브랜드명 변형 제거 (예: "머슬팜", "MusclePharm", "MP")
      const brandVariants = [
        '머슬팜', 'musclepharm', 'mp', 'muscle', 'pharm',
        '옵티멈', 'optimum', 'on', 'optimum nutrition',
        '다이마타이즈', 'dymatize', 'dymatize nutrition',
      ];
      
      for (const variant of brandVariants) {
        const regex = new RegExp(`\\b${variant}\\b`, 'gi');
        lineup = lineup.replace(regex, '');
      }
    }
    
    // 일반 명사 제거
    const removeWords = [
      'protein', 'whey', 'powder', '보충제', '맛', 'flavor', 'flavour',
      'supplement', 'isolate', 'concentrate', 'wpc', 'wpi', 'casein',
      'gainer', 'mass', 'bar', '바', '쿠키', 'cookie', '칩', 'chip',
      'kg', 'g', 'lb', 'lbs', 'oz', 'ml', 'l', '개', '팩', '입',
      '100%', '%', 'ultra', '울트라', 'premium', '프리미엄',
    ];
    
    for (const word of removeWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      lineup = lineup.replace(regex, '');
    }
    
    // 숫자 제거 (용량 정보)
    lineup = lineup.replace(/[\d.]+/g, '');
    
    // 맛 정보 제거 (동의어 처리된 맛)
    const flavorWords = ['딸기', '초콜릿', '바닐라', '바나나', '쿠키', '우유', '밀크', '크림'];
    for (const flavor of flavorWords) {
      lineup = lineup.replace(new RegExp(flavor, 'gi'), '');
    }
    
    // 공백과 특수문자 제거
    lineup = lineup.replace(/[\s\W_]+/g, '').trim();
    
    // 머슬팜 라인업 매핑 적용
    lineup = normalizeLineupWithMap(lineup);
    
    return lineup;
  };

  // 대분류(Category Class) 감지 함수
  const detectCategoryClass = (title: string): 'BAR' | 'AMINO' | 'RTD' | 'POWDER' => {
    if (!title) return 'POWDER';
    
    const lower = title.toLowerCase();
    
    // BAR (간식류) 키워드
    const barKeywords = ['bar', 'crunch', 'cookie', 'wafer', 'brownie', '바', '크런치', '쿠키', '브라우니'];
    for (const keyword of barKeywords) {
      if (lower.includes(keyword)) {
        return 'BAR';
      }
    }
    
    // AMINO (아미노산) 키워드
    const aminoKeywords = ['bcaa', 'eaa', 'glutamine', 'amino', '글루타민', '아미노'];
    for (const keyword of aminoKeywords) {
      if (lower.includes(keyword)) {
        return 'AMINO';
      }
    }
    
    // RTD (음료) 키워드
    const rtdKeywords = ['drink', 'ready to', 'shake', 'beverage', '드링크', '음료'];
    for (const keyword of rtdKeywords) {
      if (lower.includes(keyword)) {
        return 'RTD';
      }
    }
    
    // POWDER (파우더 - 기본값)
    // 'Whey', 'Powder', 'Protein', 'Gainer', '웨이', '프로틴' 등이 있거나 키워드가 없으면 POWDER
    return 'POWDER';
  };

  // 브랜드 정규화 (Strict Mode)
  const getNormalizedBrand = (brand: string): string => {
    if (!brand) return '';
    
    const normalized = brand.trim();
    const lower = normalized.toLowerCase();
    
    // 머슬팜 계열
    if (lower.includes('musclepharm') || lower.includes('머슬팜') || lower === 'mp') {
      return 'MP';
    }
    
    // 옵티멈 계열
    if (lower.includes('optimum') || lower.includes('옵티멈') || lower === 'on') {
      return 'ON';
    }
    
    // 다이마타이즈
    if (lower.includes('dymatize') || lower.includes('다이마타이즈')) {
      return 'DYMATIZE';
    }
    
    // 마이프로틴
    if (lower.includes('myprotein') || lower.includes('마이프로틴')) {
      return 'MYPROTEIN';
    }
    
    // 공백 제거 및 대문자 변환
    return normalized.replace(/\s+/g, '').toUpperCase();
  };

  // 맛 정규화 (Strict Mode)
  const getNormalizedFlavor = (flavor: string): string => {
    if (!flavor) return '';
    
    let normalized = flavor.trim();
    
    // 동의어 처리 (먼저 처리)
    const synonymMap: Record<string, string> = {
      'strawberry': '딸기',
      '스트로베리': '딸기',
      '딸기': '딸기',
      'choco': '초코',
      'chocolate': '초코',
      '초코': '초코',
      '초콜렛': '초코',
      '초콜릿': '초코',
      'vanilla': '바닐라',
      '바닐라': '바닐라',
      'banana': '바나나',
      '바나나': '바나나',
      'milk': '우유',
      '밀크': '우유',
      '우유': '우유',
      'cream': '크림',
      '크림': '크림',
    };
    
    // 동의어 치환
    for (const [key, value] of Object.entries(synonymMap)) {
      const regex = new RegExp(key, 'gi');
      normalized = normalized.replace(regex, value);
    }
    
    // 접미사 제거 ('맛', '향', 'Flavor', 'Taste')
    normalized = normalized.replace(/[맛향]$/gi, '');
    normalized = normalized.replace(/\s*(flavor|flavour|taste)\s*$/gi, '');
    
    // 특수문자 및 공백 전체 제거
    normalized = normalized.replace(/[\s\W_]+/g, '');
    
    // '우유', '밀크'가 포함되어 있으면 제거하지 말고 표준화 (예: '초콜릿밀크' -> '초코우유')
    // 이미 동의어 치환에서 'milk'와 '밀크'가 '우유'로 변환되었으므로, '우유'가 포함된 경우 그대로 유지
    
    return normalized.toLowerCase();
  };

  // 용량 정규화 (Strict Mode - kg 단위로 환산)
  const getNormalizedCapacity = (amount: string | number | undefined, weight_g?: number): number | null => {
    // weight_g가 있으면 우선 사용 (이미 그램 단위)
    if (weight_g !== undefined) {
      return weight_g / 1000; // kg로 변환
    }
    
    if (!amount) return null;
    
    const str = String(amount).toLowerCase().trim();
    
    // 숫자 추출
    const numMatch = str.match(/([\d.]+)/);
    if (!numMatch) return null;
    
    const num = parseFloat(numMatch[1]);
    if (isNaN(num)) return null;
    
    // 단위 파악 및 kg로 환산
    if (str.includes('lb') || str.includes('lbs')) {
      // 파운드 -> kg (1 lb = 0.453592 kg)
      return num * 0.453592;
    } else if (str.includes('oz')) {
      // 온스 -> kg (1 oz = 0.0283495 kg)
      return num * 0.0283495;
    } else if (str.includes('kg')) {
      // 이미 kg
      return num;
    } else if (str.includes('g')) {
      // 그램 -> kg
      return num / 1000;
    } else {
      // 단위 없으면 기본적으로 kg로 가정 (1000 이상이면 g로 가정)
      return num >= 1000 ? num / 1000 : num;
    }
  };

  // 용량 비교 (100g 오차 허용)
  const compareCapacityStrict = (capacity1: number | null, capacity2: number | null): boolean => {
    if (capacity1 === null || capacity2 === null) {
      // 둘 다 없으면 일치로 간주
      return capacity1 === null && capacity2 === null;
    }
    
    // 100g = 0.1kg 오차 허용
    return Math.abs(capacity1 - capacity2) < 0.1;
  };

  // 라인업 시그니처 추출 (MP_LINEUP_MAP 활용)
  const getLineupSignature = (title: string, brand: string): string => {
    if (!title) return '';
    
    let lineup = title.toLowerCase().trim();
    
    // 브랜드명 제거
    if (brand) {
      const brandNormalized = getNormalizedBrand(brand).toLowerCase();
      const brandVariants = [
        'musclepharm', '머슬팜', 'mp',
        'optimum', '옵티멈', 'on',
        'dymatize', '다이마타이즈',
      ];
      
      for (const variant of brandVariants) {
        const regex = new RegExp(`\\b${variant}\\b`, 'gi');
        lineup = lineup.replace(regex, '');
      }
    }
    
    // 일반 명사 제거
    const removeWords = [
      'protein', 'whey', 'powder', '보충제', '맛', 'flavor', 'flavour',
      'supplement', 'isolate', 'concentrate', 'wpc', 'wpi', 'casein',
      'gainer', 'mass', 'bar', '바', '쿠키', 'cookie', '칩', 'chip',
      'kg', 'g', 'lb', 'lbs', 'oz', 'ml', 'l', '개', '팩', '입',
      '100%', '%', 'ultra', '울트라', 'premium', '프리미엄',
    ];
    
    for (const word of removeWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      lineup = lineup.replace(regex, '');
    }
    
    // 숫자 제거
    lineup = lineup.replace(/[\d.]+/g, '');
    
    // 맛 정보 제거
    const flavorWords = ['딸기', '초코', '초콜릿', '바닐라', '바나나', '쿠키', '우유', '밀크', '크림'];
    for (const flavor of flavorWords) {
      lineup = lineup.replace(new RegExp(flavor, 'gi'), '');
    }
    
    // 공백과 특수문자 제거
    lineup = lineup.replace(/[\s\W_]+/g, '').trim();
    
    // MP_LINEUP_MAP 활용하여 시그니처 생성
    for (const [key, variants] of Object.entries(MP_LINEUP_MAP)) {
      for (const variant of variants) {
        const variantLower = variant.toLowerCase();
        if (lineup.includes(variantLower) || variantLower.includes(lineup)) {
          // 키가 이미 시그니처 형식이면 그대로 반환
          return key;
        }
      }
    }
    
    // 매핑되지 않으면 남은 텍스트를 대문자로 변환
    return lineup.toUpperCase().replace(/[^A-Z0-9]/g, '');
  };

  // 중복 판별 함수 (Strict Mode - 4단계 속성 비교)
  const isStrictDuplicate = (
    newItem: { brand?: string; name: string; flavor?: string; weight_g?: number },
    savedProduct: Product
  ): { isDuplicate: boolean; reason?: string } => {
    // STEP 1: 브랜드 비교
    const newBrand = getNormalizedBrand(newItem.brand || '');
    const savedBrand = getNormalizedBrand(savedProduct.brand || '');
    
    if (newBrand !== savedBrand) {
      console.log(`[중복제거] ${newItem.name} - 브랜드 불일치: [A] '${savedBrand}' vs [B] '${newBrand}'`);
      return { isDuplicate: false };
    }
    
    // STEP 2: 라인업 비교 (핵심!)
    const newLineup = getLineupSignature(newItem.name, newItem.brand || '');
    const savedLineup = getLineupSignature(savedProduct.name, savedProduct.brand || '');
    
    if (newLineup !== savedLineup) {
      console.log(`[중복제거] ${newItem.name} - 라인업 불일치: [A] '${savedLineup}' vs [B] '${newLineup}'`);
      return { isDuplicate: false };
    }
    
    // STEP 3: 맛 비교 (둘 다 있을 때만)
    const newFlavor = getNormalizedFlavor(newItem.flavor || '');
    const savedFlavor = getNormalizedFlavor(savedProduct.flavor || '');
    
    if (newFlavor && savedFlavor) {
      if (newFlavor !== savedFlavor) {
        console.log(`[중복제거] ${newItem.name} - 맛 불일치: [A] '${savedFlavor}' vs [B] '${newFlavor}'`);
        return { isDuplicate: false };
      }
    }
    
    // STEP 4: 용량 비교 (둘 다 있을 때만)
    const newCapacity = getNormalizedCapacity(undefined, newItem.weight_g);
    const savedCapacity = getNormalizedCapacity(savedProduct.weight);
    
    if (newCapacity !== null && savedCapacity !== null) {
      if (!compareCapacityStrict(newCapacity, savedCapacity)) {
        console.log(`[중복제거] ${newItem.name} - 용량 불일치: [A] ${savedCapacity}kg vs [B] ${newCapacity}kg`);
        return { isDuplicate: false };
      }
    }
    
    // 모든 조건 충족 시 중복
    const reasons: string[] = [];
    if (newBrand) reasons.push(`브랜드:${newBrand}`);
    if (newLineup) reasons.push(`라인업:${newLineup}`);
    if (newFlavor && savedFlavor) reasons.push(`맛:${newFlavor}`);
    if (newCapacity !== null && savedCapacity !== null) reasons.push(`용량:${newCapacity}kg`);
    
    const reason = reasons.join('/');
    console.log(`[중복제거] ${newItem.name} (사유: ${reason} 일치)`);
    return { isDuplicate: true, reason };
  };

  // 리스트 스캔 모드: 분석 및 필터링
  const handleBGroupListAnalyze = async () => {
    if (!apiKey) {
      toast.error('Gemini API Key를 먼저 입력해주세요.');
      return;
    }

    if (bGroupListImages.length === 0) {
      toast.error('리스트 이미지를 업로드해주세요.');
      return;
    }

    setIsBGroupListAnalyzing(true);
    setBGroupListResults([]);
    setBGroupListExcluded([]);

    const prompt = `Analyze the image and identify ALL visible supplement products.

⚠️ CRITICAL RULES:
1. **Do NOT search for this product online.** (온라인 검색 절대 금지)
2. **Do NOT infer popular flavors.** (인기 맛 추론 금지)
3. **Extract the product names listed in the image EXACTLY as they appear textually.** (이미지에 있는 텍스트 그대로 추출)

중요:
- 이미지 속에 상품이 몇 개가 있든 전부 리스트로 뽑아내라.
- 중복되어 찍힌 상품이 있다면 하나로 합치고, 전체 리스트에서 유니크한 상품 정보만 추출하라.
- 같은 상품이 여러 이미지에 나타나면 가장 명확한 정보를 사용하라.
- 이미지에 'Strawberry'라고 적혀있으면 'Strawberry'로 추출하고, 'Double Chocolate'로 추론하지 마라.
- 이미지에 '초콜릿'이라고 적혀있으면 '초콜릿'으로 추출하고, 다른 맛으로 추론하지 마라.
- If the weight is in lbs, convert to kg. If flavor is implied (e.g., banana image), extract it.

Return a JSON array where each item contains: brand, lineup, flavor, weight_text, weight_kg (converted numeric value).

[
  {
    "brand": "브랜드명 (이미지에 적혀있는 그대로, 한글/영어)",
    "lineup": "라인업/제품명 핵심 키워드 (예: 'Combat 100% Whey', '컴뱃 울트라 웨이')",
    "name": "상품 전체 이름 (이미지에 적혀있는 그대로)",
    "flavor": "맛 정보 (이미지에 명시적으로 적혀있으면 추출, 없으면 빈 문자열)",
    "weight_text": "중량 텍스트 (예: '2.27kg', '5lbs', '2270g')",
    "weight_kg": 숫자 (중량을 kg 단위로 변환한 값, 예: 2.27kg -> 2.27, 5lbs -> 2.27, 2270g -> 2.27),
    "weight_g": 숫자 (중량을 그램 단위로 추출, 예: 2.27kg -> 2270, 400g -> 400),
    "is_snack": true/false (단백질 간식류: 바, 쿠키, 칩 등이면 true),
    "bundle_count": 숫자 (상품명에 '2개', '3팩', 'x2', '2입' 등이 있으면 숫자 추출, 없으면 1)
  },
  ...
]

중요:
- weight_kg는 중량을 kg 단위로 숫자만 추출 (lbs면 0.453592를 곱해서 변환, g면 1000으로 나눔)
- weight_g는 중량을 그램(g) 단위로 숫자만 추출 (kg 단위면 1000을 곱해서 변환)
- flavor는 이미지에 명시적으로 적혀있는 맛 정보만 추출 (추론 금지)
- lineup은 제품명에서 핵심 라인업 키워드를 추출 (예: "Combat", "컴뱃", "Gold Standard")
- bundle_count는 상품명에서 묶음 정보를 추출 (예: "신타6 2.27kg x 2개" -> 2)
- is_snack은 단백질 간식류인지 판단 (바, 쿠키, 칩 등)
- 모든 상품을 빠짐없이 추출하라`;

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          images: bGroupListImages,
          prompt,
          mode: 'detailed',
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to analyze');
      }

      const data = await res.json();
      let listProducts: Array<{
        brand: string;
        lineup?: string;
        name: string;
        flavor?: string;
        weight_text?: string;
        weight_kg?: number;
        weight_g?: number;
        is_snack: boolean;
        bundle_count: number;
      }> = [];

      // JSON 파싱
      if (data.raw) {
        const parsed = safeParseJSON(data.text);
        if (parsed && Array.isArray(parsed)) {
          listProducts = parsed;
        }
      } else if (Array.isArray(data)) {
        listProducts = data;
      }

      // weight_kg가 없으면 weight_g로부터 계산
      listProducts = listProducts.map(item => ({
        ...item,
        weight_kg: item.weight_kg !== undefined ? item.weight_kg : (item.weight_g ? item.weight_g / 1000 : undefined),
        weight_g: item.weight_g !== undefined ? item.weight_g : (item.weight_kg ? item.weight_kg * 1000 : undefined),
      }));

      // 사용자 지정 순서 비교 함수 (브랜드->대분류->맛->라인업->중량)
      const analyzeProductStatus = (
        scanned: typeof listProducts[0],
        inventoryItems: Product[]
      ): { status: 'NEW' | 'DUPLICATE' | 'VARIATION'; variationMessage?: string } => {
        const scannedBrand = getNormalizedBrand(scanned.brand || '');
        const scannedCategory = detectCategoryClass(scanned.name);
        const scannedFlavor = getNormalizedFlavor(scanned.flavor || '');
        const scannedLineup = scanned.lineup || getLineupSignature(scanned.name, scanned.brand || '');
        const scannedWeightKg = scanned.weight_kg;

        for (const inventory of inventoryItems) {
          const inventoryBrand = getNormalizedBrand(inventory.brand || '');
          const inventoryCategory = detectCategoryClass(inventory.name);
          const inventoryFlavor = getNormalizedFlavor(inventory.flavor || '');
          const inventoryLineup = getLineupSignature(inventory.name, inventory.brand || '');
          const inventoryWeightKg = getNormalizedCapacity(inventory.weight);

          // STEP 1: 브랜드 비교 (다르면 즉시 NEW)
          if (scannedBrand !== inventoryBrand) {
            continue; // 다른 브랜드이므로 다음 상품 확인
          }

          // STEP 2: 대분류(Category) 비교 (다르면 즉시 NEW)
          if (scannedCategory !== inventoryCategory) {
            continue; // 대분류가 다르면 완전 신규 (예: 파우더 vs 바)
          }

          // STEP 3: 맛 비교 (둘 다 있을 때만 수행, 다르면 즉시 NEW)
          if (scannedFlavor && inventoryFlavor && scannedFlavor !== inventoryFlavor) {
            continue; // 다른 맛이므로 완전 신규
          }

          // STEP 4: 라인업 비교 (여기까지 왔으면 브랜드/대분류/맛은 똑같음)
          if (scannedLineup !== inventoryLineup) {
            // 브랜드, 대분류, 맛이 모두 같은데 라인업만 다름 -> VARIATION
            const existingProductName = inventory.name;
            return {
              status: 'VARIATION',
              variationMessage: `브랜드, 맛, 종류는 같지만 라인업이 다릅니다. (보유: ${existingProductName})`,
            };
          }

          // STEP 5: 중량 비교 (라인업까지 똑같으면 중량 확인)
          if (scannedWeightKg !== undefined && inventoryWeightKg !== null) {
            const weightDiff = Math.abs(scannedWeightKg - inventoryWeightKg);
            if (weightDiff > 0.4) {
              // 400g = 0.4kg 초과 차이면 신규 상품 (용량만 다른 옵션)
              continue;
            }
          }

          // 모든 조건 충족 (브랜드, 대분류, 맛, 라인업, 중량 모두 일치) -> 중복
          return { status: 'DUPLICATE' };
        }

        // 보관함에 일치하는 상품이 없음 -> 신규
        return { status: 'NEW' };
      };

      // 필터링 함수 (브랜드 필터, 묶음 필터, 중복 체크)
      const filterNewItems = (
        scannedItems: typeof listProducts,
        inventoryItems: Product[]
      ): {
        newItems: typeof bGroupListResults;
        excludedItems: typeof bGroupListExcluded;
      } => {
        const newItems: typeof bGroupListResults = [];
        const excludedItems: typeof bGroupListExcluded = [];

        for (const scanned of scannedItems) {
          // 1. 브랜드 필터
          if (bGroupBrandFilter.trim()) {
            const brandKeywords = bGroupBrandFilter.split(',').map(b => b.trim().toLowerCase());
            const productBrand = (scanned.brand || '').toLowerCase();
            const matches = brandKeywords.some(keyword => productBrand.includes(keyword));
            
            if (!matches) {
              excludedItems.push({
                brand: scanned.brand,
                name: scanned.name,
                flavor: scanned.flavor,
                weight_g: scanned.weight_g,
                reason: `설정된 브랜드 아님`,
                type: 'BRAND',
              });
              continue;
            }
          }

          // 2. 묶음 필터 (간식은 묶음 허용)
          if (scanned.bundle_count >= bGroupBundleExclude && !scanned.is_snack) {
            excludedItems.push({
              brand: scanned.brand,
              name: scanned.name,
              flavor: scanned.flavor,
              weight_g: scanned.weight_g,
              reason: `${scanned.bundle_count}개 묶음 - 묶음 기준 초과`,
              type: 'BUNDLE',
            });
            continue;
          }

          // 3. 4단계 속성 분석 & 400g 룰 적용
          const analysisResult = analyzeProductStatus(scanned, inventoryItems);

          if (analysisResult.status === 'DUPLICATE') {
            excludedItems.push({
              brand: scanned.brand,
              name: scanned.name,
              flavor: scanned.flavor,
              weight_g: scanned.weight_g,
              reason: '보관함에 이미 존재 (브랜드/맛/용량/라인업 일치)',
              type: 'DUPLICATE',
            });
            continue;
          }

          // NEW 또는 VARIATION 상품 추가
          newItems.push({
            brand: scanned.brand,
            name: scanned.name,
            flavor: scanned.flavor,
            weight_g: scanned.weight_g,
            weight_kg: scanned.weight_kg,
            is_snack: scanned.is_snack,
            bundle_count: scanned.bundle_count,
            status: analysisResult.status,
            variationMessage: analysisResult.variationMessage,
          });
        }

        return { newItems, excludedItems };
      };

      // 필터링 실행
      const { newItems, excludedItems } = filterNewItems(listProducts, products);

      setBGroupListResults(newItems);
      setBGroupListExcluded(excludedItems);
      
      // 중복 제거 알림
      const duplicateCount = excludedItems.filter(item => item.type === 'DUPLICATE').length;
      if (duplicateCount > 0) {
        toast(`중복된 상품 ${duplicateCount}개를 자동으로 제외했습니다.`, {
          icon: 'ℹ️',
          duration: 3000,
        });
      }
      
      toast.success(`분석 완료! ${newItems.length}개 신규 상품 발견, ${excludedItems.length}개 제외`);
    } catch (error) {
      console.error('Failed to analyze list:', error);
      toast.error('분석 중 오류가 발생했습니다.');
    } finally {
      setIsBGroupListAnalyzing(false);
    }
  };

  // 쿠팡 검색 (지연 로딩)
  const handleBGroupListSearchCoupang = async (index: number) => {
    const product = bGroupListResults[index];
    if (!product || product.isLoadingLink || product.link) return;

    // 로딩 상태 설정
    setBGroupListResults(prev => prev.map((p, i) => 
      i === index ? { ...p, isLoadingLink: true } : p
    ));

    try {
      // 쿠팡 검색 쿼리 생성 (브랜드 + 상품명 + 맛)
      const searchQuery = [product.brand, product.name, product.flavor]
        .filter(Boolean)
        .join(' ');
      
      // 쿠팡 검색 URL 생성 (실제 API가 있다면 여기서 호출)
      // 현재는 쿠팡 검색 페이지로 리다이렉트
      const coupangSearchUrl = `https://www.coupang.com/np/search?q=${encodeURIComponent(searchQuery)}`;
      
      // 링크 저장
      setBGroupListResults(prev => prev.map((p, i) => 
        i === index ? { ...p, link: coupangSearchUrl, isLoadingLink: false } : p
      ));
      
      toast.success('쿠팡 검색 링크가 생성되었습니다.');
    } catch (error) {
      console.error('Failed to search Coupang:', error);
      toast.error('쿠팡 검색 중 오류가 발생했습니다.');
      
      // 로딩 상태 해제
      setBGroupListResults(prev => prev.map((p, i) => 
        i === index ? { ...p, isLoadingLink: false } : p
      ));
    }
  };

  // 리스트 스캔 결과: 엑셀 복사 (엑셀 컬럼 순서 준수)
  const handleBGroupListCopyToExcel = async () => {
    // DUPLICATE 상태는 제외하고 NEW와 VARIATION만 복사
    const displayResults = bGroupListResults.filter(p => p.status !== 'DUPLICATE');
    
    if (displayResults.length === 0) {
      toast.error('복사할 상품이 없습니다.');
      return;
    }

    // weight_kg 또는 weight_g를 amount 포맷으로 변환 (예: 2.27 -> "2.27kg", 400 -> "400g")
    const formatAmount = (weight_kg?: number, weight_g?: number): string => {
      if (weight_kg !== undefined) {
        return `${weight_kg.toFixed(2)}kg`;
      }
      if (weight_g !== undefined) {
        if (weight_g >= 1000) {
          return `${(weight_g / 1000).toFixed(2)}kg`;
        }
        return `${weight_g}g`;
      }
      return '';
    };

    // category 결정: is_snack이면 '간식', 아니면 빈 값
    const getCategory = (is_snack: boolean): string => {
      return is_snack ? '간식' : '';
    };

    const rows = displayResults.map((product) => {
      const fields = [
        product.name || '',                    // A열: 제품명
        '',                                    // B열: 쿠팡 링크 (없음)
        product.flavor || '',                  // C열: 맛
        formatAmount(product.weight_kg, product.weight_g),        // D열: 용량
        '',                                    // E열: source_url (빈 값)
        getCategory(product.is_snack),        // F열: 대분류 (간식 또는 빈 값)
        '',                                    // G열: 소분류 (빈 값)
        '',                                    // H열: 단백질 (빈 값)
        '',                                    // I열: 총 서빙 횟수 (빈 값)
        '',                                    // J열: 당류 (빈 값)
        '',                                    // K열: 지방 (빈 값)
        '',                                    // L열: 칼로리 (빈 값)
        '',                                    // M열: 1회량 (빈 값)
        '',                                    // N열: 탄수화물 (빈 값)
      ];
      return fields.join('\t');
    });

    const tabSeparated = rows.join('\n');
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(tabSeparated);
        toast.success(`총 ${displayResults.length}개 상품이 복사되었습니다! 엑셀에 붙여넣기 하세요.`);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = tabSeparated;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          toast.success(`총 ${displayResults.length}개 상품이 복사되었습니다! 엑셀에 붙여넣기 하세요.`);
        } catch (err) {
          toast.error('복사에 실패했습니다.');
        }
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('복사에 실패했습니다.');
    }
  };

  // B그룹: 쿠팡 텍스트 분석
  const handleBGroupParseText = async () => {
    if (!apiKey) {
      toast.error('Gemini API Key를 먼저 입력해주세요.');
      return;
    }

    if (!bGroupParserText.trim()) {
      toast.error('분석할 텍스트를 입력해주세요.');
      return;
    }

    setIsBGroupParsing(true);

    try {
      const prompt = `Extract valid supplement products from this messy text. Ignore prices, shipping info, advertisements, and other irrelevant information.

Return ONLY a JSON array of products with the following structure:
[
  {
    "brand": "브랜드명",
    "title": "상품명",
    "flavor": "맛 (없으면 빈 문자열)",
    "weight": "용량 (예: 2.27kg, 400g)"
  },
  ...
]

Important:
- Extract ONLY brand, title, flavor, and weight
- Ignore all other information (prices, shipping, ads, etc.)
- Return valid JSON array only

Text to analyze:
${bGroupParserText}`;

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          prompt,
          images: [], // 텍스트만 분석하므로 빈 배열
          mode: 'detailed',
        }),
      });

      if (!res.ok) {
        // 서버의 실제 에러 메시지 읽기
        let errorMessage = '텍스트 분석에 실패했습니다.';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          try {
            const errorText = await res.text();
            if (errorText) errorMessage = errorText;
          } catch {
            // 기본 메시지 사용
          }
        }
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      const data = await res.json();
      let parsed: Array<{ brand: string; title: string; flavor?: string; weight?: string }> = [];

      if (data.raw) {
        const jsonParsed = safeParseJSON(data.text);
        if (jsonParsed && Array.isArray(jsonParsed)) {
          parsed = jsonParsed;
        }
      } else if (Array.isArray(data)) {
        parsed = data;
      }

      setExtractedProducts(parsed);
      setBGroupActiveSubTab('COMPARE');
      toast.success(`✅ ${parsed.length}개 상품이 추출되었습니다!`);
    } catch (error) {
      console.error('Failed to parse text:', error);
      toast.error('텍스트 분석에 실패했습니다.');
    } finally {
      setIsBGroupParsing(false);
    }
  };

  // B그룹: 필터 토글 (공백 무시 비교)
  const handleBGroupFilterToggle = (type: 'BRAND' | 'FLAVOR' | 'WEIGHT', value: string) => {
    if (activeFilter?.type === type && isMatch(activeFilter.value, value)) {
      // 같은 필터를 다시 클릭하면 해제
      setActiveFilter(null);
    } else {
      setActiveFilter({ type, value });
    }
  };

  // B그룹: 필터 초기화
  const handleBGroupFilterReset = () => {
    setActiveFilter(null);
  };

  // B그룹: 개별 삭제
  const handleBGroupRemoveProduct = (index: number) => {
    setExtractedProducts((prev) => prev.filter((_, idx) => idx !== index));
    toast.success('상품이 삭제되었습니다.');
  };

  // B그룹: 개별 엑셀 복사
  const handleBGroupCopyOne = async (product: { brand: string; title: string; flavor?: string; weight?: string }) => {
    const tabSeparated = `${product.brand || ''}\t${product.title || ''}\t${product.flavor || ''}\t${product.weight || ''}`;
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(tabSeparated);
        toast.success('엑셀 형식으로 복사되었습니다');
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = tabSeparated;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          toast.success('엑셀 형식으로 복사되었습니다');
        } catch (err) {
          toast.error('복사에 실패했습니다.');
        }
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('복사에 실패했습니다.');
    }
  };

  // B그룹: 전체 엑셀 복사
  const handleBGroupCopyAll = async () => {
    if (extractedProducts.length === 0) {
      toast.error('복사할 상품이 없습니다.');
      return;
    }

    const rows = extractedProducts.map((product) => 
      `${product.brand || ''}\t${product.title || ''}\t${product.flavor || ''}\t${product.weight || ''}`
    );
    const tabSeparated = rows.join('\n');
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(tabSeparated);
        toast.success(`총 ${extractedProducts.length}개 상품이 엑셀 형식으로 복사되었습니다`);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = tabSeparated;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          toast.success(`총 ${extractedProducts.length}개 상품이 엑셀 형식으로 복사되었습니다`);
        } catch (err) {
          toast.error('복사에 실패했습니다.');
        }
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('복사에 실패했습니다.');
    }
  };

  // B그룹: 보관함 저장
  const handleBGroupSaveToInventory = async (product: { brand: string; title: string; flavor?: string; weight?: string }) => {
    setIsBSaving(true);

    try {
      const newProduct: Omit<Product, 'id' | 'createdAt'> = {
        name: product.title,
        brand: product.brand,
        flavor: product.flavor || '',
        weight: product.weight || '',
        category_large: '',
        category_small: '',
        imageUrl: '',
      };

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      });

      if (res.ok) {
        await loadProducts();
        toast.success('보관함에 등록되었습니다!');
      } else {
        throw new Error('Failed to save product');
      }
    } catch (error) {
      console.error('Failed to save to inventory:', error);
      toast.error('보관함 저장에 실패했습니다.');
    } finally {
      setIsBSaving(false);
    }
  };

  // B그룹: 최종 완료로 이동
  const handleMoveToFinal = (product: { brand: string; title: string; flavor?: string; weight?: string }) => {
    setExtractedProducts((prev) => prev.filter((p) => 
      !(p.brand === product.brand && 
        p.title === product.title && 
        p.flavor === product.flavor && 
        p.weight === product.weight)
    ));
    setFinalProducts((prev) => [...prev, product]);
    toast.success('최종 완료 리스트로 이동했습니다.');
  };

  // B그룹: 최종 완료에서 복구
  const handleRestore = (product: { brand: string; title: string; flavor?: string; weight?: string }) => {
    setFinalProducts((prev) => prev.filter((p) => 
      !(p.brand === product.brand && 
        p.title === product.title && 
        p.flavor === product.flavor && 
        p.weight === product.weight)
    ));
    setExtractedProducts((prev) => [...prev, product]);
    toast.success('분석 결과로 복구했습니다.');
  };

  // B그룹: 최종 완료 개별 삭제
  const handleFinalRemove = (index: number) => {
    setFinalProducts((prev) => prev.filter((_, idx) => idx !== index));
    toast.success('상품이 삭제되었습니다.');
  };

  // B그룹: 최종 완료 개별 엑셀 복사
  const handleFinalCopyOne = async (product: { brand: string; title: string; flavor?: string; weight?: string }) => {
    const tabSeparated = `${product.brand || ''}\t${product.title || ''}\t${product.flavor || ''}\t${product.weight || ''}`;
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(tabSeparated);
        toast.success('엑셀 형식으로 복사되었습니다');
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = tabSeparated;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('엑셀 형식으로 복사되었습니다');
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('복사에 실패했습니다.');
    }
  };

  // B그룹: 최종 완료 전체 엑셀 복사
  const handleFinalCopyAll = async () => {
    if (finalProducts.length === 0) {
      toast.error('복사할 상품이 없습니다.');
      return;
    }

    const rows = finalProducts.map(product => 
      `${product.brand || ''}\t${product.title || ''}\t${product.flavor || ''}\t${product.weight || ''}`
    );
    const tsvString = rows.join('\n');

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(tsvString);
        toast.success(`총 ${finalProducts.length}개 상품이 엑셀 형식으로 복사되었습니다!`);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = tsvString;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success(`총 ${finalProducts.length}개 상품이 엑셀 형식으로 복사되었습니다!`);
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('복사에 실패했습니다.');
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (product: { brand: string; title: string; flavor?: string; weight?: string }) => {
    setDraggedProduct(product);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedProduct) {
      handleMoveToFinal(draggedProduct);
      setDraggedProduct(null);
    }
  };

  // 리스트 스캔 결과: 보관함에 저장
  const handleBGroupListSaveToA = async (product: typeof bGroupListResults[0]) => {
    setIsBSaving(true);

    try {
      // weight_kg 또는 weight_g를 문자열로 변환
      const formatWeight = (weight_kg?: number, weight_g?: number): string => {
        if (weight_kg !== undefined) {
          return `${weight_kg.toFixed(2)}kg`;
        }
        if (weight_g !== undefined) {
          if (weight_g >= 1000) {
            return `${(weight_g / 1000).toFixed(2)}kg`;
          }
          return `${weight_g}g`;
        }
        return '';
      };

      const newProduct: Omit<Product, 'id' | 'createdAt'> = {
        name: product.name,
        brand: product.brand,
        flavor: product.flavor || '',
        weight: formatWeight(product.weight_kg, product.weight_g),
        category_large: product.is_snack ? '간식' : '',
        category_small: '',
        imageUrl: '',
      };

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      });

      if (res.ok) {
        await loadProducts();
        setBGroupListResults((prev) => prev.filter((p) => p.name !== product.name));
        toast.success('보관함에 등록되었습니다!');
      } else {
        throw new Error('Failed to save product');
      }
    } catch (error) {
      console.error('Failed to save to A group:', error);
      toast.error('저장 중 오류가 발생했습니다.');
    } finally {
      setIsBSaving(false);
    }
  };

  // B그룹 데이터를 A그룹(보관함)에 저장
  const handleBSaveToA = async () => {
    if (!bGroupFormData.name) {
      toast.error('제품명을 입력해주세요.');
      return;
    }

    setIsBSaving(true);

    try {
      // 메인 이미지 가져오기 (첫 번째 이미지)
      let imageUrl = '';
      if (bGroupImages.length > 0) {
        // Base64 이미지를 압축하여 저장
        imageUrl = await ensureImageResolution(bGroupImages[0], 1000);
      }

      // B그룹 데이터를 A그룹 Product 스키마로 변환
      const newProduct: Omit<Product, 'id' | 'createdAt'> = {
        name: bGroupFormData.name,
        brand: '', // B그룹에는 브랜드 필드가 없으므로 빈 문자열
        flavor: bGroupFormData.flavor,
        weight: bGroupFormData.amount,
        category_large: bGroupFormData.category,
        category_small: bGroupFormData.sub_category,
        serving: bGroupFormData.gram ? `${bGroupFormData.gram}g` : undefined,
        calories: bGroupFormData.calorie ? Number(bGroupFormData.calorie) : undefined,
        carbs: bGroupFormData.total_carb ? Number(bGroupFormData.total_carb) : undefined,
        protein: bGroupFormData.protein ? Number(bGroupFormData.protein) : undefined,
        fat: bGroupFormData.fat ? Number(bGroupFormData.fat) : undefined,
        sugar: bGroupFormData.sugar ? Number(bGroupFormData.sugar) : undefined,
        imageUrl: imageUrl,
      };

      // API를 통해 저장
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      });

      if (res.ok) {
        await loadProducts();
        setBGroupSaved(true);
        toast.success('보관함에 등록되었습니다!');
      } else {
        throw new Error('Failed to save product');
      }
    } catch (error) {
      console.error('Failed to save to A group:', error);
      toast.error('저장 중 오류가 발생했습니다.');
    } finally {
      setIsBSaving(false);
    }
  };


  const handleCGroupFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const readers = files.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then((imageDataUrls) => {
      setCGroupImages(imageDataUrls);
      processCGroupImages(imageDataUrls);
    });
  };

  const processCGroupImages = async (imageDataUrls: string[]) => {
    if (!apiKey) {
      alert('Gemini API Key를 먼저 입력해주세요.');
      return;
    }

    const prompt = `여러 이미지를 종합하여 단 하나의 상품 정보를 추출해주세요. 영양성분표를 찾아서 탄수화물, 단백질, 지방, 당류, 칼로리, 제공량을 정확히 파악해주세요. 다음 형식의 JSON으로 응답해주세요:
{
  "name": "상품명",
  "flavor": "맛",
  "serving": "1회 제공량 (예: 1스쿱, 30g)",
  "calories": 칼로리 숫자,
  "carbs": 탄수화물 숫자,
  "protein": 단백질 숫자,
  "fat": 지방 숫자,
  "sugar": 당류 숫자
}`;

    setLoading(true);
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          images: imageDataUrls,
          prompt,
          mode: 'detailed',
        }),
      });

      const data = await res.json();
      let productData: Partial<Product> = {};

      if (data.raw) {
        const parsed = safeParseJSON(data.text);
        if (parsed) {
          productData = parsed;
        }
      } else {
        productData = data;
      }

      setCGroupData({
        ...productData,
        imageUrl: imageDataUrls[0],
      });
    } catch (error) {
      console.error('Failed to process detailed product:', error);
      alert('상세 분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const saveCGroupProduct = async () => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cGroupData),
      });

      if (res.ok) {
        await loadProducts();
        setCGroupData({});
        setCGroupImages([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        alert('상품이 A그룹에 저장되었습니다.');
      }
    } catch (error) {
      console.error('Failed to save product:', error);
      alert('상품 저장 중 오류가 발생했습니다.');
    }
  };

  const updateProduct = async (updatedData: Partial<Product>) => {
    if (!editingProduct) return;

    try {
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProduct.id,
          ...updatedData,
        }),
      });

      if (res.ok) {
        await loadProducts();
        setToastMessage('✅ 상품이 수정되었습니다!');
        setShowToast(true);
      } else {
        throw new Error('Failed to update product');
      }
    } catch (error) {
      console.error('Failed to update product:', error);
      setToastMessage('❌ 상품 수정 중 오류가 발생했습니다.');
      setShowToast(true);
      throw error;
    }
  };

  const handleProductDoubleClick = (product: Product) => {
    setEditingProduct(product);
    setIsEditModalOpen(true);
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/products?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await loadProducts();
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('상품 삭제 중 오류가 발생했습니다.');
    }
  };

  // 이모지 제거 및 텍스트 정규화 헬퍼 함수
  const normalizeCategoryName = (categoryName: string): string => {
    if (!categoryName) return '';
    // 이모지 제거 (🥩💪🧃🍫🍬💊🐔 등)
    return categoryName.replace(/[🥩💪🧃🍫🍬💊🐔]\s*/g, '').trim();
  };

  // ProductCard 컴포넌트 (React.memo로 최적화)
  const ProductCard = memo(({ product, onDoubleClick, onDelete }: {
    product: Product;
    onDoubleClick: (product: Product) => void;
    onDelete: (id: string) => void;
  }) => {
    return (
      <motion.div
        initial={false}
        animate={{ opacity: 1 }}
        whileHover={{ scale: 1.05, y: -5 }}
        onDoubleClick={() => onDoubleClick(product)}
        className="group bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-xl p-3 min-h-[280px] h-full hover:border-[#ccff00] hover:shadow-[0_0_20px_rgba(204,255,0,0.3)] transition-all cursor-pointer"
        title="더블 클릭하여 수정"
      >
        {product.imageUrl && (
          <div className="relative w-full aspect-square bg-black/20 rounded-lg mb-2 p-1.5 flex items-center justify-center overflow-hidden">
            <img
              src={product.imageUrl}
              alt={product.name}
              decoding="async"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
        )}
        <div className="space-y-1.5">
          {/* Category Badges */}
          {(product.category_large || product.category_small) && (
            <div className="flex flex-wrap gap-1">
              {product.category_large && (
                <span className="px-1.5 py-0.5 bg-[#ccff00]/20 text-[#ccff00] text-[10px] rounded-full border border-[#ccff00]/30">
                  {product.category_large}
                </span>
              )}
              {product.category_small && (
                <span className="px-1.5 py-0.5 bg-[#ccff00]/10 text-[#ccff00]/80 text-[10px] rounded-full border border-[#ccff00]/20">
                  {product.category_small}
                </span>
              )}
            </div>
          )}
          <div className="space-y-0.5">
            {product.brand && (
              <div className="text-[10px] text-gray-500">{product.brand}</div>
            )}
            <div className="font-semibold text-sm text-[#ccff00] line-clamp-2">{product.name}</div>
            {product.flavor && <div className="text-xs text-gray-300">{product.flavor}</div>}
            {product.weight && <div className="text-xs text-gray-400">{product.weight}</div>}
            
            {/* 영양성분 요약 라인 */}
            {(() => {
              const nutritionItems: React.ReactNode[] = [];
              
              if (product.calories !== undefined && product.calories > 0) {
                nutritionItems.push(<span key="cal" className="text-zinc-400">🔥 {product.calories} kcal</span>);
              }
              
              if (product.protein !== undefined) {
                nutritionItems.push(
                  <span key="protein" className={product.protein > 0 ? 'text-yellow-400 font-bold' : 'text-zinc-400'}>
                    P {product.protein}g
                  </span>
                );
              }
              
              if (product.carbs !== undefined && product.carbs > 0) {
                nutritionItems.push(<span key="carbs" className="text-zinc-400">C {product.carbs}g</span>);
              }
              
              if (product.sugar !== undefined && product.sugar > 0) {
                nutritionItems.push(<span key="sugar" className="text-zinc-400">S {product.sugar}g</span>);
              }
              
              if (product.fat !== undefined && product.fat > 0) {
                nutritionItems.push(<span key="fat" className="text-zinc-400">F {product.fat}g</span>);
              }
              
              if (nutritionItems.length === 0) return null;
              
              return (
                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                  {nutritionItems.map((item, index) => (
                    <React.Fragment key={index}>
                      {item}
                      {index < nutritionItems.length - 1 && (
                        <span className="text-zinc-600">|</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
        <RippleButton
          onClick={() => onDelete(product.id)}
          className="mt-2 w-full h-8 px-2 py-1 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 text-red-400"
        >
          <Trash2 className="w-3 h-3" />
          삭제
        </RippleButton>
      </motion.div>
    );
  });

  ProductCard.displayName = 'ProductCard';

  // 카테고리별 상품 개수 계산 (useMemo)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const totalCount = products.length;

    // 각 카테고리별 개수 계산
    Object.keys(FILTER_CATEGORIES).forEach((categoryKey) => {
      const normalizedCategoryName = normalizeCategoryName(categoryKey);
      counts[categoryKey] = products.filter((p) => {
        const productCategory = (p.category_large || '').trim();
        return productCategory === normalizedCategoryName;
      }).length;
    });

    return { ...counts, total: totalCount };
  }, [products]);

  // 브랜드 목록 추출 (useMemo)
  const brandList = useMemo(() => {
    const brands = new Set<string>();
    products.forEach((product) => {
      if (product.brand && product.brand.trim() && product.brand.trim() !== 'N/A') {
        brands.add(product.brand.trim());
      }
    });
    return Array.from(brands).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [products]);

  // 맛 목록 추출 (useMemo)
  const flavorList = useMemo(() => {
    const flavors = new Set<string>();
    products.forEach((product) => {
      if (product.flavor && product.flavor.trim() && product.flavor.trim() !== 'N/A') {
        flavors.add(product.flavor.trim());
      }
    });
    return Array.from(flavors).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [products]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  };

  const tabVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  };

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            border: '1px solid rgba(204, 255, 0, 0.3)',
          },
          success: {
            iconTheme: {
              primary: '#ccff00',
              secondary: '#000',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    <div className="min-h-screen bg-zinc-950 text-white relative overflow-hidden">
      {/* Aurora Background Effect */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#ccff00] opacity-20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#ccff00] opacity-15 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-[#ccff00] opacity-10 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>

      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative border-b border-white/10 p-4 backdrop-blur-xl bg-white/5"
      >
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#ccff00]" />
            <h1 className="text-2xl font-bold text-[#ccff00]">Protein Manager</h1>
          </div>
          <div className="flex-1"></div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                placeholder="Gemini API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pl-10 pr-3 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-sm focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition"
              />
            </div>
            <RippleButton
              onClick={saveApiKey}
              className="px-4 py-2 bg-[#ccff00] text-black font-semibold rounded-lg hover:bg-[#b3e600] transition-all shadow-[0_0_20px_rgba(204,255,0,0.5)] hover:shadow-[0_0_30px_rgba(204,255,0,0.7)] flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              저장
            </RippleButton>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="relative border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="max-w-7xl mx-auto flex">
          {(['A', 'B', 'C'] as Tab[]).map((tab) => {
            const labels = { A: '내 보관함', B: '시장조사', C: '상세분석' };
            const icons = { A: Package, B: Search, C: FileText };
            const Icon = icons[tab];

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-6 py-4 font-semibold transition-all flex items-center gap-2 ${
                  activeTab === tab
                    ? 'text-[#ccff00]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab}: {labels[tab]}
                {activeTab === tab && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ccff00] shadow-[0_0_10px_rgba(204,255,0,0.5)]"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto p-6">
        {loading && <SkeletonLoader />}

        <AnimatePresence mode="wait">
          {/* Tab A: 내 보관함 */}
          {activeTab === 'A' && (
            <motion.div
              key="A"
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onPaste={handlePaste}
              className="space-y-4"
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-xl"
              >
                <p className="text-gray-400 text-sm flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  스크린샷을 붙여넣으세요 (Ctrl+V). 이미지 내 모든 상품이 자동으로 분석되어 등록됩니다.
                </p>
              </motion.div>

              {/* 1단: 대분류 필터 (그리드 레이아웃) */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-xl"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* 전체 탭 */}
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setSelectedSubCategory(null);
                    }}
                    className={`relative px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-between gap-2 ${
                      !selectedCategory
                        ? 'border-[#ccff00] bg-[#ccff00]/10 text-[#ccff00]'
                        : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20'
                    }`}
                  >
                    <span className="text-sm font-medium">전체</span>
                    <span className="px-2 py-0.5 bg-white/20 text-white text-[10px] font-medium rounded-full">
                      {categoryCounts.total}
                    </span>
                  </button>

                  {/* 카테고리 탭들 */}
                  {(Object.keys(FILTER_CATEGORIES) as CategoryLarge[]).map((category) => {
                    const categoryName = category.replace(/[🥩💪🧃🍫🍬💊🐔]\s*/, '');
                    const count = categoryCounts[category] || 0;
                    const isSelected = selectedCategory === category;

                    return (
                      <button
                        key={category}
                        onClick={() => {
                          if (selectedCategory === category) {
                            setSelectedCategory(null);
                            setSelectedSubCategory(null);
                          } else {
                            setSelectedCategory(category);
                            setSelectedSubCategory('전체');
                          }
                        }}
                        className={`relative px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'border-[#ccff00] bg-[#ccff00]/10 text-[#ccff00]'
                            : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20'
                        }`}
                      >
                        <span className="text-sm font-medium">{category}</span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                            isSelected
                              ? 'bg-[#ccff00]/30 text-[#ccff00]'
                              : 'bg-white/20 text-white'
                          }`}
                        >
                          {count}
                        </span>
                        {category === '🐔 닭가슴살' && (
                          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded border border-orange-400">
                            New
                          </span>
                        )}
                      </button>
                    );
                  })}
        </div>

                {/* 2단: 소분류 칩 필터 */}
                <AnimatePresence>
                  {selectedCategory && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-white/10"
                    >
                      <div className="flex flex-wrap gap-2">
                        {FILTER_CATEGORIES[selectedCategory].map((subCategory) => (
                          <button
                            key={subCategory}
                            onClick={() => setSelectedSubCategory(subCategory)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                              selectedSubCategory === subCategory
                                ? 'bg-[#ccff00] text-black'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                          >
                            {subCategory}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* 뷰 모드 토글 버튼 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-end gap-2"
              >
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-1 flex gap-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded transition-all ${
                      viewMode === 'grid'
                        ? 'bg-[#ccff00] text-black'
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <LayoutGrid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded transition-all ${
                      viewMode === 'list'
                        ? 'bg-[#ccff00] text-black'
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>

              {/* 브랜드 & 맛 필터 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-xl"
              >
                <div className="flex items-center gap-4">
                  {/* 브랜드 선택 */}
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-400 mb-2">브랜드</label>
                    <select
                      value={selectedBrand}
                      onChange={(e) => setSelectedBrand(e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition"
                    >
                      <option value="All">전체 브랜드</option>
                      {brandList.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 맛 선택 */}
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-400 mb-2">맛</label>
                    <select
                      value={selectedFlavor}
                      onChange={(e) => setSelectedFlavor(e.target.value)}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition"
                    >
                      <option value="All">전체 맛</option>
                      {flavorList.map((flavor) => (
                        <option key={flavor} value={flavor}>
                          {flavor}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 초기화 버튼 */}
                  <div className="flex items-end">
                    <RippleButton
                      onClick={() => {
                        setSelectedBrand('All');
                        setSelectedFlavor('All');
                      }}
                      className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 rounded-md text-white text-sm transition-all flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      초기화
                    </RippleButton>
                  </div>
                </div>
              </motion.div>

              {/* 필터링된 상품 리스트 */}
              {(() => {
                const filteredProducts = products.filter((product) => {
                  // 대분류 필터
                  if (selectedCategory) {
                    const normalizedCategoryName = normalizeCategoryName(selectedCategory);
                    const productCategory = (product.category_large || '').trim();
                    if (productCategory !== normalizedCategoryName) {
                      return false;
                    }
                  }

                  // 소분류 필터
                  if (selectedSubCategory && selectedSubCategory !== '전체') {
                    const productSubCategory = (product.category_small || '').trim();
                    if (productSubCategory !== selectedSubCategory.trim()) {
                      return false;
                    }
                  }

                  // 브랜드 필터
                  if (selectedBrand !== 'All') {
                    const productBrand = (product.brand || '').trim();
                    if (productBrand !== selectedBrand) {
                      return false;
                    }
                  }

                  // 맛 필터
                  if (selectedFlavor !== 'All') {
                    const productFlavor = (product.flavor || '').trim();
                    if (productFlavor !== selectedFlavor) {
                      return false;
                    }
                  }

                  return true;
                });

                return (
                  <>
                    {viewMode === 'grid' ? (
                      <div className="min-h-screen">
                      <VirtuosoGrid
                        totalCount={filteredProducts.length}
                        data={filteredProducts}
                        useWindowScroll
                          overscan={2000}
                        itemContent={(index, product) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            onDoubleClick={handleProductDoubleClick}
                            onDelete={deleteProduct}
                          />
                        )}
                          components={{
                            List: GridList,
                          }}
                        style={{ height: 'auto', minHeight: '400px' }}
                      />
                      </div>
                    ) : (
                      // List 뷰
                      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-white/10">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">이미지</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">브랜드</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">상품명</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">맛</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">용량</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">카테고리</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">작업</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredProducts.map((product) => (
                                <motion.tr
                                  key={product.id}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  onDoubleClick={() => handleProductDoubleClick(product)}
                                  className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                                  title="더블 클릭하여 수정"
                                >
                                  <td className="px-4 py-3">
                                    {product.imageUrl ? (
                                      <div className="w-10 h-10 bg-black/20 rounded-lg overflow-hidden flex items-center justify-center group/thumb">
                                        <img
                                          src={product.imageUrl}
                                          alt={product.name}
                                          className="w-full h-full object-contain group-hover/thumb:scale-110 transition-transform"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-10 h-10 bg-black/20 rounded-lg flex items-center justify-center">
                                        <Package className="w-5 h-5 text-gray-500" />
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-300">{product.brand || '-'}</td>
                                  <td className="px-4 py-3">
                                    <div className="font-semibold text-[#ccff00]">{product.name}</div>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-300">{product.flavor || '-'}</td>
                                  <td className="px-4 py-3 text-sm text-gray-300">{product.weight || '-'}</td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1">
                                      {product.category_large && (
                                        <span className="px-2 py-0.5 bg-[#ccff00]/20 text-[#ccff00] text-xs rounded-full">
                                          {product.category_large}
                                        </span>
                                      )}
                                      {product.category_small && (
                                        <span className="px-2 py-0.5 bg-[#ccff00]/10 text-[#ccff00]/80 text-xs rounded-full">
                                          {product.category_small}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <RippleButton
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteProduct(product.id);
                                      }}
                                      className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 rounded-lg text-sm transition-all flex items-center gap-2 text-red-400"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </RippleButton>
                                  </td>
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {filteredProducts.length === 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12 text-gray-400"
                      >
                        등록된 상품이 없습니다. 이미지를 붙여넣어 추가하세요.
                      </motion.div>
                    )}
                  </>
                );
              })()}
            </motion.div>
          )}

          {/* Tab B: 시장조사 - 전면 리뉴얼 */}
          {activeTab === 'B' && (
            <motion.div
              key="B"
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-6"
            >
              {/* 서브 탭 전환 */}
              <div className="flex gap-2 border-b border-white/10">
                <button
                  onClick={() => setBGroupActiveSubTab('PARSER')}
                  className={`px-4 py-2 font-semibold transition-all ${
                    bGroupActiveSubTab === 'PARSER'
                      ? 'text-[#ccff00] border-b-2 border-[#ccff00]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  쿠팡 분석
                </button>
                <button
                  onClick={() => setBGroupActiveSubTab('COMPARE')}
                  className={`px-4 py-2 font-semibold transition-all ${
                    bGroupActiveSubTab === 'COMPARE'
                      ? 'text-[#ccff00] border-b-2 border-[#ccff00]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  상품 비교
                </button>
              </div>

              {/* Tab 1: 쿠팡 분석 (Text Parser) */}
              {bGroupActiveSubTab === 'PARSER' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl space-y-4"
                >
                  <h3 className="text-lg font-semibold text-[#ccff00] flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    쿠팡 텍스트 분석
                  </h3>
                  <p className="text-sm text-gray-400">
                    쿠팡 웹페이지에서 상품 정보를 드래그해서 복사한 텍스트를 붙여넣으세요.
                  </p>
                  <textarea
                    value={bGroupParserText}
                    onChange={(e) => setBGroupParserText(e.target.value)}
                    placeholder="여기에 쿠팡에서 복사한 텍스트를 붙여넣으세요..."
                    className="w-full h-64 px-4 py-3 bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition resize-none"
                  />
                  <RippleButton
                    onClick={handleBGroupParseText}
                    disabled={!bGroupParserText.trim() || isBGroupParsing}
                    className="w-full px-6 py-4 bg-[#ccff00] text-black font-bold text-lg rounded-lg hover:bg-[#b3e600] transition-all shadow-[0_0_30px_rgba(204,255,0,0.7)] hover:shadow-[0_0_40px_rgba(204,255,0,0.9)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isBGroupParsing ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        분석 중...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-6 h-6" />
                        분석 시작
                      </>
                    )}
                  </RippleButton>
                </motion.div>
              )}

              {/* Tab 2: 상품 비교 (Split View + Final Dock) */}
              {bGroupActiveSubTab === 'COMPARE' && (
                <div className="flex flex-col h-full gap-4">
                  {/* 상단 영역: 좌우 5:5 스플릿 (70%) */}
                  <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
                  {/* Left Panel: 내 보관함 */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-[#ccff00] flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        내 보관함
                      </h3>
                      {activeFilter && (
                        <RippleButton
                          onClick={handleBGroupFilterReset}
                          className="px-3 py-1.5 bg-transparent border border-white/20 text-gray-400 hover:text-white hover:border-white/40 rounded-lg transition-all text-xs flex items-center gap-2"
                        >
                          <RotateCcw className="w-3 h-3" />
                          필터 초기화
                        </RippleButton>
                      )}
                    </div>

                    {/* 필터링된 보관함 리스트 */}
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {(() => {
                        let filtered = products;

                        if (activeFilter) {
                          if (activeFilter.type === 'BRAND') {
                            filtered = filtered.filter(p => 
                              isMatch(p.brand || '', activeFilter.value)
                            );
                          } else if (activeFilter.type === 'FLAVOR') {
                            filtered = filtered.filter(p => 
                              isMatch(p.flavor || '', activeFilter.value)
                            );
                          } else if (activeFilter.type === 'WEIGHT') {
                            filtered = filtered.filter(p => 
                              isMatch(p.weight || '', activeFilter.value)
                            );
                          }
                        }

                        if (filtered.length === 0) {
                          return (
                            <div className="text-center py-8 text-gray-400 text-sm">
                              {activeFilter ? '필터 조건에 맞는 상품이 없습니다.' : '보관함이 비어있습니다.'}
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-1">
                            {filtered.map((product) => (
                              <div
                                key={product.id}
                                className="px-3 py-2 bg-black/30 rounded-lg border border-white/5 hover:border-white/20 transition-all"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs text-gray-400 mb-0.5">
                                      [{product.brand || '브랜드 없음'}]
                                    </div>
                                    <div className="text-sm font-semibold text-[#ccff00] truncate">
                                      {product.name}
                                    </div>
                                    <div className="flex gap-2 mt-1 text-xs text-gray-300">
                                      {product.flavor && <span>| {product.flavor}</span>}
                                      {product.weight && <span>| {product.weight}</span>}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </motion.div>

                  {/* Right Panel: 분석 결과 */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-[#ccff00] flex items-center gap-2">
                        <Search className="w-5 h-5" />
                        분석 결과 ({extractedProducts.length}개)
                      </h3>
                      {extractedProducts.length > 0 && (
                        <RippleButton
                          onClick={handleBGroupCopyAll}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-all text-xs flex items-center gap-2"
                        >
                          <Copy className="w-4 h-4" />
                          전체 복사
                        </RippleButton>
                      )}
                    </div>

                    {extractedProducts.length === 0 ? (
                      <div className="text-center py-12 space-y-4">
                        <p className="text-gray-400 text-sm">
                          먼저 텍스트 분석을 진행해주세요.
                        </p>
                        <RippleButton
                          onClick={() => setBGroupActiveSubTab('PARSER')}
                          className="px-4 py-2 bg-[#ccff00] text-black font-semibold rounded-lg hover:bg-[#b3e600] transition-all flex items-center justify-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          텍스트 분석으로 이동
                        </RippleButton>
                      </div>
                    ) : (
                      <div className="space-y-3 overflow-y-auto">
                        {sortedProducts.map((product, idx) => {
                          // sortedProducts의 인덱스를 extractedProducts의 실제 인덱스로 변환
                          const actualIndex = extractedProducts.findIndex(p => 
                            p.brand === product.brand &&
                            p.title === product.title &&
                            p.flavor === product.flavor &&
                            p.weight === product.weight
                          );
                          
                          return (
                            <div
                              key={idx}
                              draggable={true}
                              onDragStart={() => handleDragStart(product)}
                              className="relative bg-black/30 rounded-lg p-4 border border-white/10 hover:border-[#ccff00]/50 transition-all cursor-move"
                            >
                              {/* 삭제 버튼 (우측 상단) */}
                              <button
                                onClick={() => handleBGroupRemoveProduct(actualIndex >= 0 ? actualIndex : idx)}
                                className="absolute top-2 right-2 p-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/20 rounded transition-all z-10"
                                title="삭제"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>

                              <div className="space-y-3 pr-8">
                                <div className="text-sm font-semibold text-[#ccff00] line-clamp-2">
                                  {product.title}
                                </div>

                                {/* 클릭 가능한 뱃지들 */}
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => handleBGroupFilterToggle('BRAND', product.brand)}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-all border ${
                                      activeFilter?.type === 'BRAND' && isMatch(activeFilter.value, product.brand)
                                        ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400'
                                        : 'border-white/10 bg-white/10 text-gray-300 hover:bg-white/20 hover:border-white/20'
                                    }`}
                                  >
                                    {product.brand || '브랜드 없음'}
                                  </button>
                                  {product.flavor && (
                                    <button
                                      onClick={() => handleBGroupFilterToggle('FLAVOR', product.flavor!)}
                                      className={`px-2 py-1 rounded text-xs font-medium transition-all border ${
                                        activeFilter?.type === 'FLAVOR' && isMatch(activeFilter.value, product.flavor!)
                                          ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400'
                                          : 'border-white/10 bg-white/10 text-gray-300 hover:bg-white/20 hover:border-white/20'
                                      }`}
                                    >
                                      {product.flavor}
                                    </button>
                                  )}
                                  {product.weight && (
                                    <button
                                      onClick={() => handleBGroupFilterToggle('WEIGHT', product.weight!)}
                                      className={`px-2 py-1 rounded text-xs font-medium transition-all border ${
                                        activeFilter?.type === 'WEIGHT' && isMatch(activeFilter.value, product.weight!)
                                          ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400'
                                          : 'border-white/10 bg-white/10 text-gray-300 hover:bg-white/20 hover:border-white/20'
                                      }`}
                                    >
                                      {product.weight}
                                    </button>
                                  )}
                                </div>

                                {/* 버튼 그룹 */}
                                <div className="flex gap-2">
                                  <RippleButton
                                    onClick={() => handleBGroupCopyOne(product)}
                                    className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-all text-sm flex items-center justify-center gap-2"
                                  >
                                    <Copy className="w-4 h-4" />
                                    복사
                                  </RippleButton>
                                  <RippleButton
                                    onClick={() => handleMoveToFinal(product)}
                                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all text-sm flex items-center justify-center gap-2"
                                    title="최종 완료로 이동"
                                  >
                                    <ArrowDown className="w-4 h-4" />
                                  </RippleButton>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                  </div>

                  {/* 하단 영역: 최종 완료 도크 (30% 또는 고정 높이) */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-xl h-[300px] flex flex-col"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-[#ccff00] flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        최종 완료 ({finalProducts.length}개)
                      </h3>
                      {finalProducts.length > 0 && (
                        <RippleButton
                          onClick={handleFinalCopyAll}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-all text-xs flex items-center gap-2"
                        >
                          <Copy className="w-4 h-4" />
                          전체 복사
                        </RippleButton>
                      )}
                    </div>

                    {finalProducts.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center text-center">
                        <p className="text-gray-400 text-sm">
                          여기로 상품을 드래그하거나 [⬇️ 최종 선택] 버튼을 누르세요
                        </p>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-x-auto overflow-y-hidden">
                        <div className="flex gap-3 pb-2 min-w-max">
                          {finalProducts.map((product, idx) => (
                            <div
                              key={idx}
                              className="relative bg-black/40 rounded-lg p-3 border border-white/10 hover:border-[#ccff00]/50 transition-all min-w-[280px] flex-shrink-0"
                            >
                              {/* 삭제 버튼 (우측 상단) */}
                              <button
                                onClick={() => handleFinalRemove(idx)}
                                className="absolute top-2 right-2 p-1 text-red-500 hover:text-red-400 hover:bg-red-500/20 rounded transition-all z-10"
                                title="삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              <div className="space-y-2 pr-6">
                                <div className="text-sm font-semibold text-[#ccff00] line-clamp-2">
                                  {product.title}
                                </div>

                                <div className="flex flex-wrap gap-1.5 text-xs">
                                  <span className="px-1.5 py-0.5 bg-white/10 rounded text-gray-300">
                                    {product.brand || '브랜드 없음'}
                                  </span>
                                  {product.flavor && (
                                    <span className="px-1.5 py-0.5 bg-white/10 rounded text-gray-300">
                                      {product.flavor}
                                    </span>
                                  )}
                                  {product.weight && (
                                    <span className="px-1.5 py-0.5 bg-white/10 rounded text-gray-300">
                                      {product.weight}
                                    </span>
                                  )}
                                </div>

                                <div className="flex gap-2">
                                  <RippleButton
                                    onClick={() => handleFinalCopyOne(product)}
                                    className="flex-1 px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-xs flex items-center justify-center gap-1"
                                  >
                                    <Copy className="w-3 h-3" />
                                    복사
                                  </RippleButton>
                                  <RippleButton
                                    onClick={() => handleRestore(product)}
                                    className="flex-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-xs flex items-center justify-center gap-1"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                    복구
                                  </RippleButton>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}

          {/* Tab C: 상세분석 (단일 상품 분석) */}
          {activeTab === 'C' && (
            <motion.div
              key="C"
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-6"
            >
              {/* C그룹 헤더: 제목 + 초기화 버튼 */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-[#ccff00] flex items-center gap-2">
                  <FileText className="w-6 h-6" />
                  상세분석
                </h2>
                <button
                  onClick={handleCReset}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-red-400 border border-zinc-700 hover:border-red-500/50 rounded-lg bg-transparent hover:bg-red-500/10 transition-all flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  전체 초기화
                </button>
              </div>

              {/* 1단계: 입력 (3개 구역) */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl"
              >
                <h3 className="text-lg font-semibold text-[#ccff00] flex items-center gap-2 mb-4">
                  <Upload className="w-5 h-5" />
                  상품 이미지 & 성분표 업로드
                </h3>

                <div className="grid grid-cols-3 gap-4">
                  {/* 구역 A: 상품 이미지 (왼쪽) */}
                  <div
                    onClick={(e) => {
                      // input, button, label 등 인터랙티브 요소 클릭은 무시
                      const target = e.target as HTMLElement;
                      if (target.closest('input, button, label, [role="button"]')) {
                        return;
                      }
                      if (!productLoading) {
                        setCGroupFocusedArea('product');
                      }
                    }}
                    onPaste={productLoading ? undefined : handleCGroupProductPaste}
                    className={`space-y-3 p-4 rounded-lg border-2 transition-all relative ${
                      cGroupFocusedArea === 'product'
                        ? 'border-[#ccff00] bg-[#ccff00]/10'
                        : 'border-white/20 bg-black/20'
                    } ${productLoading ? 'opacity-50' : ''}`}
                    style={{ 
                      position: 'relative',
                      zIndex: 10
                    }}
                  >
                    <h4 className="text-sm font-semibold text-[#ccff00] flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      상품 이미지
                    </h4>

                    {/* 상품 이미지 URL 입력 */}
                    <div className="space-y-2" style={{ pointerEvents: 'auto', position: 'relative', zIndex: 100 }}>
                      <label className="block text-xs text-gray-400">상품 이미지 URL 입력</label>
                      <div className="flex gap-2" style={{ pointerEvents: 'auto' }}>
                <input
                          type="url"
                          value={cGroupImageUrlInput}
                          onChange={(e) => {
                            e.stopPropagation();
                            setCGroupImageUrlInput(e.target.value);
                          }}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') {
                              handleCGroupImageUrlAdd();
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onFocus={(e) => {
                            e.stopPropagation();
                            setCGroupFocusedArea('product');
                          }}
                          placeholder="https://..."
                          disabled={productLoading}
                          className="flex-1 px-3 py-2 bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition disabled:opacity-50 cursor-text"
                          style={{ pointerEvents: 'auto', position: 'relative', zIndex: 100 }}
                        />
                        <RippleButton
                          type="button"
                          onClick={(e) => {
                            e?.preventDefault();
                            e?.stopPropagation();
                            if (!productLoading && cGroupImageUrlInput.trim()) {
                              handleCGroupImageUrlAdd();
                            }
                          }}
                          disabled={!cGroupImageUrlInput.trim() || productLoading}
                          className="px-3 py-2 bg-[#ccff00] text-black font-semibold rounded-lg hover:bg-[#b3e600] transition-all text-xs flex items-center gap-1 disabled:opacity-50"
                          style={{ pointerEvents: 'auto', position: 'relative', zIndex: 100 }}
                        >
                          <ArrowRight className="w-3 h-3" />
                          추가
                        </RippleButton>
                      </div>
                    </div>

                    {/* 상품 이미지 붙여넣기 영역 */}
                    <div className="space-y-2" style={{ pointerEvents: 'auto', position: 'relative', zIndex: 100 }}>
                      <input
                        ref={cGroupProductFileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                        onChange={handleCGroupProductFileSelect}
                          disabled={productLoading}
                  className="hidden"
                        id="c-group-product-input"
                />
                <label
                        htmlFor="c-group-product-input"
                        className={`block ${productLoading ? 'opacity-50' : 'cursor-pointer'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!productLoading) {
                            setCGroupFocusedArea('product');
                          }
                        }}
                        style={{ pointerEvents: productLoading ? 'none' : 'auto' }}
                      >
                        <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-[#ccff00]/50 transition-all bg-black/20">
                          <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-400 text-xs">또는 여기를 클릭 후</p>
                          <p className="text-[#ccff00] text-xs font-semibold mt-1">Ctrl+V (상품컷)</p>
                        </div>
                </label>

                      {/* 상품 이미지 썸네일 */}
                      {cGroupProductImages.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-2 relative z-10">
                          {cGroupProductImages.map((img, idx) => (
                            <div key={idx} className="relative w-full h-20 bg-black/20 rounded-lg overflow-hidden group">
                              <img
                                src={img}
                                alt={`Product ${idx + 1}`}
                                className={`w-full h-full object-contain transition-opacity duration-300 ${
                                  cGroupRemovingBg.has(idx) ? 'opacity-50' : 'opacity-100'
                                }`}
                              />
                              {/* 로딩 스피너는 조건부 렌더링으로만 표시 (DOM에서 완전히 제거) */}
                              {cGroupRemovingBg.has(idx) && (
                                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-20 pointer-events-none">
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                  >
                                    <Loader2 className="w-4 h-4 text-[#ccff00] mb-1" />
                                  </motion.div>
                                  <p className="text-[#ccff00] font-medium text-[10px]">배경 제거 중...</p>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!cGroupRemovingBg.has(idx)) {
                                    removeProductImage(idx);
                                  }
                                }}
                                disabled={cGroupRemovingBg.has(idx)}
                                className="absolute top-1 right-1 p-1 bg-red-600/80 hover:bg-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity z-30 disabled:opacity-0"
                              >
                                <X className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 구역 B: 성분표/영양정보 (오른쪽) */}
                  <div
                    onClick={(e) => {
                      // input, button, label 등 인터랙티브 요소 클릭은 무시
                      const target = e.target as HTMLElement;
                      if (target.closest('input, button, label, [role="button"]')) {
                        return;
                      }
                      if (!nutritionLoading) {
                        setCGroupFocusedArea('nutrition');
                      }
                    }}
                    onPaste={nutritionLoading ? undefined : handleCGroupNutritionPaste}
                    className={`space-y-3 p-4 rounded-lg border-2 transition-all relative ${
                      cGroupFocusedArea === 'nutrition'
                        ? 'border-[#ccff00] bg-[#ccff00]/10'
                        : 'border-white/20 bg-black/20'
                    } ${nutritionLoading ? 'opacity-50' : ''}`}
                    style={{ pointerEvents: 'auto', zIndex: 20 }}
                  >
                    <h4 className="text-sm font-semibold text-[#ccff00] flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      성분표/영양정보
                    </h4>

                    {/* 성분표 이미지 URL 입력 */}
                    <div className="space-y-2" style={{ pointerEvents: 'auto', position: 'relative', zIndex: 50 }}>
                      <label className="block text-xs text-gray-400">성분표 이미지 URL 입력</label>
                      <div className="flex gap-2" style={{ pointerEvents: 'auto' }}>
                        <input
                          type="url"
                          value={cGroupNutritionUrlInput}
                          onChange={(e) => {
                            e.stopPropagation();
                            setCGroupNutritionUrlInput(e.target.value);
                          }}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') {
                              handleCGroupNutritionUrlAdd();
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onFocus={(e) => {
                            e.stopPropagation();
                            setCGroupFocusedArea('nutrition');
                          }}
                          placeholder="https://..."
                          disabled={nutritionLoading}
                          className="flex-1 px-3 py-2 bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ pointerEvents: 'auto', position: 'relative', zIndex: 50 }}
                        />
                        <RippleButton
                          type="button"
                          onClick={(e) => {
                            e?.preventDefault();
                            e?.stopPropagation();
                            if (!nutritionLoading && cGroupNutritionUrlInput.trim()) {
                              handleCGroupNutritionUrlAdd();
                            }
                          }}
                          disabled={!cGroupNutritionUrlInput.trim() || nutritionLoading}
                          className="px-3 py-2 bg-[#ccff00] text-black font-semibold rounded-lg hover:bg-[#b3e600] transition-all text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ pointerEvents: 'auto', position: 'relative', zIndex: 50 }}
                        >
                          <ArrowRight className="w-3 h-3" />
                          추가
                        </RippleButton>
                      </div>
                    </div>

                    {/* 성분표 붙여넣기 영역 */}
                    <div className="space-y-2">
                      <input
                        ref={cGroupNutritionFileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleCGroupNutritionFileSelect}
                        disabled={nutritionLoading}
                        className="hidden"
                        id="c-group-nutrition-input"
                      />
                      <label
                        htmlFor="c-group-nutrition-input"
                        className={`block ${nutritionLoading ? 'opacity-50' : 'cursor-pointer'}`}
                        onClick={() => !nutritionLoading && setCGroupFocusedArea('nutrition')}
                      >
                        <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-[#ccff00]/50 transition-all bg-black/20">
                          <FileText className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-400 text-xs">여기를 클릭 후</p>
                          <p className="text-[#ccff00] text-xs font-semibold mt-1">Ctrl+V (성분표/함량표)</p>
                        </div>
                      </label>

                      {/* 성분표 썸네일 */}
                      {cGroupNutritionImages.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-2 relative z-10">
                          {cGroupNutritionImages.map((img, idx) => (
                            <div key={idx} className="relative w-full h-20 bg-black/20 rounded-lg overflow-hidden group">
                      <img
                        src={img}
                                alt={`Nutrition ${idx + 1}`}
                                className="w-full h-full object-contain"
                              />
                              <button
                                onClick={() => removeNutritionImage(idx)}
                                className="absolute top-1 right-1 p-1 bg-red-600/80 hover:bg-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 구역 C: 상품 정보 분석 (오른쪽) */}
                  <div
                    className={`space-y-3 p-4 rounded-lg border-2 transition-all relative ${
                      'border-white/20 bg-black/20'
                    }`}
                    style={{ pointerEvents: 'auto', zIndex: 20 }}
                  >
                    <h4 className="text-sm font-semibold text-[#ccff00] flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      상품 정보 분석
                    </h4>

                    {/* 상품 정보 이미지 붙여넣기 영역 */}
                    <div className="space-y-2" style={{ pointerEvents: 'auto', position: 'relative', zIndex: 100 }}>
                      <input
                        ref={productInfoFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const dataUrl = event.target?.result as string;
                            setProductInfoImage(dataUrl);
                          };
                          reader.readAsDataURL(file);
                        }}
                        disabled={productInfoLoading}
                        className="hidden"
                        id="product-info-input"
                      />
                      <label
                        htmlFor="product-info-input"
                        className={`block ${productInfoLoading ? 'opacity-50' : 'cursor-pointer'}`}
                        style={{ pointerEvents: productInfoLoading ? 'none' : 'auto' }}
                      >
                        <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-[#ccff00]/50 transition-all bg-black/20">
                          <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-400 text-xs">또는 여기를 클릭 후</p>
                          <p className="text-[#ccff00] text-xs font-semibold mt-1">Ctrl+V (상품정보)</p>
                        </div>
                      </label>

                      {/* 붙여넣기 핸들러 */}
                      <div
                        onPaste={async (e) => {
                          if (productInfoLoading) return;
                          const items = e.clipboardData.items;
                          for (let i = 0; i < items.length; i++) {
                            if (items[i].type.indexOf('image') !== -1) {
                              const blob = items[i].getAsFile();
                              if (blob) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const dataUrl = event.target?.result as string;
                                  setProductInfoImage(dataUrl);
                                };
                                reader.readAsDataURL(blob);
                              }
                              break;
                            }
                          }
                        }}
                        className="min-h-[100px]"
                      />

                      {/* 업로드된 이미지 미리보기 */}
                      {productInfoImage && (
                        <div className="grid grid-cols-1 gap-2 mt-2 relative z-10">
                          <div className="relative w-full h-20 bg-black/20 rounded-lg overflow-hidden group">
                            <img
                              src={productInfoImage}
                              alt="Product info"
                              className="w-full h-full object-contain"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setProductInfoImage('');
                                if (productInfoFileInputRef.current) {
                                  productInfoFileInputRef.current.value = '';
                                }
                              }}
                              className="absolute top-1 right-1 p-1 bg-red-600/80 hover:bg-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity z-30"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 쿠팡 링크 입력 */}
                <div className="space-y-2 mt-4">
                  <label className="block text-sm font-medium text-gray-300">쿠팡 링크 (URL)</label>
                  <input
                    type="url"
                    value={cGroupLinkInput}
                    onChange={(e) => setCGroupLinkInput(e.target.value)}
                    onBlur={(e) => {
                      const cleaned = cleanCoupangUrl(e.target.value);
                      setCGroupLinkInput(cleaned);
                    }}
                    onPaste={(e) => {
                      setTimeout(() => {
                        const target = e.target as HTMLInputElement;
                        if (target && target.value) {
                          const cleaned = cleanCoupangUrl(target.value);
                          setCGroupLinkInput(cleaned);
                        }
                      }, 0);
                    }}
                    placeholder="https://www.coupang.com/vp/products/..."
                    className="w-full px-4 py-3 bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition"
                    style={{ pointerEvents: 'auto', position: 'relative', zIndex: 100 }}
                  />
                </div>

                {/* 분석 시작 버튼 */}
                <RippleButton
                  onClick={async () => {
                    // 상품 정보 분석 이미지가 있으면 먼저 분석
                    let extractedReviewCount = '';
                    let extractedName = '';
                    
                    if (productInfoImage && apiKey) {
                      try {
                        const res = await fetch('/api/analyze-product-info', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            imageDataUrl: productInfoImage,
                            apiKey,
                          }),
                        });

                        if (res.ok) {
                          const data = await res.json();
                          extractedName = data.name || '';
                          extractedReviewCount = data.reviewCount || '';
                        }
                      } catch (error) {
                        console.error('Failed to analyze product info:', error);
                      }
                    }

                    // 메인 분석 실행
                    await runCAnalysis(apiKey);
                    
                    // 상품 정보 분석 결과를 formData에 반영
                    if (extractedName || extractedReviewCount) {
                      setCGroupFormData((prev) => ({
                        ...prev,
                        name: extractedName || prev.name,
                        reviewCount: extractedReviewCount || prev.reviewCount,
                      }));
                    }
                  }}
                  disabled={(cGroupProductImages.length === 0 && cGroupNutritionImages.length === 0) || isCAnalyzing || isCAnalyzingLocal || productLoading || nutritionLoading}
                  className="w-full mt-4 px-6 py-3 bg-[#ccff00] text-black font-semibold rounded-lg hover:bg-[#b3e600] transition-all shadow-[0_0_20px_rgba(204,255,0,0.5)] hover:shadow-[0_0_30px_rgba(204,255,0,0.7)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {(isCAnalyzing || isCAnalyzingLocal) ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      분석 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      분석 시작
                    </>
                  )}
                </RippleButton>
              </motion.div>

              {/* 2단계: 검수 폼 (좌우 2분할) */}
              {cGroupFormData.name && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl"
                >
                  <h3 className="text-lg font-semibold text-[#ccff00] mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    데이터 검수 폼
                  </h3>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 왼쪽: 폼 영역 */}
                    <div className="space-y-6">
                      {/* Group 1: 제품 스펙 */}
                  <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-300 border-b border-white/10 pb-2">제품 스펙</h4>
                        {/* 제품명 (Full Width) */}
                    <div>
                          <label className="block text-xs text-gray-400 mb-1">제품명</label>
                      <input
                        type="text"
                            value={cGroupFormData.name}
                            onChange={(e) => setCGroupFormData({ ...cGroupFormData, name: e.target.value })}
                            className="w-full px-3 py-2 bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition"
                      />
                    </div>

                        {/* 쿠팡링크 (Full Width) */}
                    <div>
                          <label className="block text-xs text-gray-400 mb-1">쿠팡링크</label>
                          <input
                            type="url"
                            value={cGroupFormData.link}
                            onChange={(e) => setCGroupFormData({ ...cGroupFormData, link: e.target.value })}
                            className="w-full px-3 py-2 bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition"
                          />
                        </div>

                        {/* 리뷰수 (Full Width) */}
                    <div>
                          <label className="block text-xs text-gray-400 mb-1">리뷰수</label>
                          <input
                            type="text"
                            value={cGroupFormData.reviewCount || ''}
                            onChange={(e) => setCGroupFormData({ ...cGroupFormData, reviewCount: e.target.value })}
                            placeholder="예: 1234"
                            className="w-full px-3 py-2 bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition"
                          />
                        </div>

                        {/* 맛 | 용량 | 대분류 | 소분류 */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">맛</label>
                      <input
                        type="text"
                              value={cGroupFormData.flavor}
                              onChange={(e) => setCGroupFormData({ ...cGroupFormData, flavor: e.target.value })}
                              className="w-full px-3 py-2 bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition"
                      />
                    </div>
                    <div>
                            <label className="block text-xs text-gray-400 mb-1">용량</label>
                      <input
                        type="text"
                              value={cGroupFormData.amount}
                              onChange={(e) => setCGroupFormData({ ...cGroupFormData, amount: e.target.value })}
                              placeholder="예: 2kg"
                              className="w-full px-3 py-2 bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition"
                      />
                    </div>
                      <div>
                            <label className="block text-xs text-gray-400 mb-1">대분류</label>
                            <div className="relative">
                              <select
                                value={cGroupFormData.category || '단백질 보충제'}
                                onChange={(e) => {
                                  const newCategory = e.target.value;
                                  // 대분류 변경 시 소분류 초기화
                                  setCGroupFormData({ 
                                    ...cGroupFormData, 
                                    category: newCategory,
                                    sub_category: '' // 소분류 초기화
                                  });
                                }}
                                className="w-full px-3 py-2 pr-10 bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg text-white text-sm appearance-none focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition cursor-pointer"
                              >
                                <option value="단백질 보충제" className="bg-gray-900 text-white">단백질 보충제</option>
                                <option value="운동보조제" className="bg-gray-900 text-white">운동보조제</option>
                                <option value="단백질 드링크" className="bg-gray-900 text-white">단백질 드링크</option>
                                <option value="단백질 간식" className="bg-gray-900 text-white">단백질 간식</option>
                                <option value="영양제" className="bg-gray-900 text-white">영양제</option>
                                <option value="닭가슴살" className="bg-gray-900 text-white">닭가슴살</option>
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">소분류</label>
                            <div className="relative">
                              <select
                                value={cGroupFormData.sub_category}
                                onChange={(e) => setCGroupFormData({ ...cGroupFormData, sub_category: e.target.value })}
                                disabled={!cGroupFormData.category}
                                className="w-full px-3 py-2 pr-10 bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg text-white text-sm appearance-none focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="" className="bg-gray-900 text-white">
                                  {cGroupFormData.category ? '선택하세요' : '대분류를 먼저 선택하세요'}
                                </option>
                                {cGroupFormData.category && CATEGORY_OPTIONS[cGroupFormData.category]?.map((subCategory) => (
                                  <option key={subCategory} value={subCategory} className="bg-gray-900 text-white">
                                    {subCategory}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Group 2: 영양 정보 (성분표 순서) */}
                      <div className="space-y-4 p-4 border border-white/10 rounded-lg bg-zinc-900/30">
                        <h4 className="text-sm font-semibold text-gray-300 border-b border-white/10 pb-2">영양 정보</h4>
                        {/* 1회 섭취량 (gram) | 총 서빙 횟수 (scoops) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">1회 섭취량 (g)</label>
                        <input
                          type="number"
                              value={cGroupFormData.gram}
                              onChange={(e) => setCGroupFormData({ ...cGroupFormData, gram: e.target.value })}
                              onFocus={() => setCGroupFocusedField('gram')}
                              onBlur={() => setCGroupFocusedField(null)}
                              className={`w-full px-3 py-2 bg-black/50 backdrop-blur-xl border rounded-lg text-white text-sm focus:outline-none focus:ring-2 transition ${
                                cGroupFocusedField === 'gram'
                                  ? 'border-green-400 focus:border-green-400 focus:ring-green-400/20'
                                  : 'border-white/10 focus:border-[#ccff00] focus:ring-[#ccff00]/20'
                              }`}
                        />
                      </div>
                      <div>
                            <label className="block text-xs text-gray-400 mb-1">총 서빙 횟수</label>
                        <input
                          type="number"
                              value={cGroupFormData.scoops}
                              onChange={(e) => setCGroupFormData({ ...cGroupFormData, scoops: e.target.value })}
                              className="w-full px-3 py-2 bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition"
                        />
                      </div>
                        </div>

                        {/* 칼로리 (kcal) */}
                      <div>
                          <label className="block text-xs text-gray-400 mb-1">칼로리 (kcal)</label>
                        <input
                          type="number"
                            value={cGroupFormData.calorie}
                            onChange={(e) => setCGroupFormData({ ...cGroupFormData, calorie: e.target.value })}
                            onFocus={() => setCGroupFocusedField('calorie')}
                            onBlur={() => setCGroupFocusedField(null)}
                            className={`w-full px-3 py-2 bg-black/50 backdrop-blur-xl border rounded-lg text-white text-sm focus:outline-none focus:ring-2 transition ${
                              cGroupFocusedField === 'calorie'
                                ? 'border-purple-400 focus:border-purple-400 focus:ring-purple-400/20'
                                : 'border-white/10 focus:border-[#ccff00] focus:ring-[#ccff00]/20'
                            }`}
                        />
                      </div>

                        {/* 지방 (fat) */}
                      <div>
                          <label className="block text-xs text-gray-400 mb-1">지방 (g)</label>
                        <input
                          type="number"
                            value={cGroupFormData.fat}
                            onChange={(e) => setCGroupFormData({ ...cGroupFormData, fat: e.target.value })}
                            onFocus={() => setCGroupFocusedField('fat')}
                            onBlur={() => setCGroupFocusedField(null)}
                            className={`w-full px-3 py-2 bg-black/50 backdrop-blur-xl border rounded-lg text-white text-sm focus:outline-none focus:ring-2 transition ${
                              cGroupFocusedField === 'fat'
                                ? 'border-blue-400 focus:border-blue-400 focus:ring-blue-400/20'
                                : 'border-white/10 focus:border-[#ccff00] focus:ring-[#ccff00]/20'
                            }`}
                        />
                      </div>

                        {/* 총 탄수화물 (total_carb) | 당류 (sugar) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                            <label className="block text-xs text-gray-400 mb-1">총 탄수화물 (g)</label>
                        <input
                          type="number"
                              value={cGroupFormData.total_carb}
                              onChange={(e) => setCGroupFormData({ ...cGroupFormData, total_carb: e.target.value })}
                              onFocus={() => setCGroupFocusedField('carb')}
                              onBlur={() => setCGroupFocusedField(null)}
                              className={`w-full px-3 py-2 bg-black/50 backdrop-blur-xl border rounded-lg text-white text-sm focus:outline-none focus:ring-2 transition ${
                                cGroupFocusedField === 'carb'
                                  ? 'border-orange-400 focus:border-orange-400 focus:ring-orange-400/20'
                                  : 'border-white/10 focus:border-[#ccff00] focus:ring-[#ccff00]/20'
                              }`}
                        />
                      </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">당류 (g)</label>
                            <input
                              type="number"
                              value={cGroupFormData.sugar}
                              onChange={(e) => setCGroupFormData({ ...cGroupFormData, sugar: e.target.value })}
                              onFocus={() => setCGroupFocusedField('sugar')}
                              onBlur={() => setCGroupFocusedField(null)}
                              className={`w-full px-3 py-2 bg-black/50 backdrop-blur-xl border rounded-lg text-white text-sm focus:outline-none focus:ring-2 transition ${
                                cGroupFocusedField === 'sugar'
                                  ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                                  : 'border-white/10 focus:border-[#ccff00] focus:ring-[#ccff00]/20'
                              }`}
                            />
                    </div>
                        </div>

                        {/* 단백질 (protein) - 강조 */}
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            단백질 (g) <span className="text-[#ccff00]">*</span>
                          </label>
                          <input
                            type="number"
                            value={cGroupFormData.protein}
                            onChange={(e) => setCGroupFormData({ ...cGroupFormData, protein: e.target.value })}
                            onFocus={() => setCGroupFocusedField('protein')}
                            onBlur={() => setCGroupFocusedField(null)}
                            className={`w-full px-4 py-3 bg-black/50 backdrop-blur-xl border rounded-lg text-lg font-bold text-[#ccff00] focus:outline-none focus:ring-2 transition ${
                              cGroupFocusedField === 'protein'
                                ? 'border-yellow-400 focus:border-yellow-400 focus:ring-yellow-400/20'
                                : 'border-white/10 focus:border-[#ccff00] focus:ring-[#ccff00]/20'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 오른쪽: 성분표 하이라이트 뷰어 */}
                    {cGroupNutritionImages.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-[#ccff00] flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          성분표 뷰어 (호버 시 확대)
                        </h4>
                        <div 
                          className="relative w-full bg-black/20 rounded-lg overflow-hidden cursor-crosshair"
                          onMouseMove={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = ((e.clientX - rect.left) / rect.width) * 100;
                            const y = ((e.clientY - rect.top) / rect.height) * 100;
                            setNutritionImageMagnifier({ x, y, isHovering: true });
                          }}
                          onMouseLeave={() => {
                            setNutritionImageMagnifier(prev => ({ ...prev, isHovering: false }));
                          }}
                          onClick={() => setIsNutritionImageZoomed(true)}
                          onKeyDown={(e) => {
                            // 키보드 네비게이션 지원 (좌우 방향키)
                            if (e.key === 'ArrowLeft' && cGroupNutritionImages.length > 1) {
                              e.preventDefault();
                              const newIndex = currentNutritionImageIndex > 0 
                                ? currentNutritionImageIndex - 1 
                                : cGroupNutritionImages.length - 1;
                              setCurrentNutritionImageIndex(newIndex);
                            } else if (e.key === 'ArrowRight' && cGroupNutritionImages.length > 1) {
                              e.preventDefault();
                              const newIndex = currentNutritionImageIndex < cGroupNutritionImages.length - 1 
                                ? currentNutritionImageIndex + 1 
                                : 0;
                              setCurrentNutritionImageIndex(newIndex);
                            }
                          }}
                          tabIndex={0}
                        >
                          {/* 이전 버튼 */}
                          {cGroupNutritionImages.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const newIndex = currentNutritionImageIndex > 0 
                                  ? currentNutritionImageIndex - 1 
                                  : cGroupNutritionImages.length - 1;
                                setCurrentNutritionImageIndex(newIndex);
                              }}
                              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all backdrop-blur-sm"
                              aria-label="이전 이미지"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                          )}

                          {/* 다음 버튼 */}
                          {cGroupNutritionImages.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const newIndex = currentNutritionImageIndex < cGroupNutritionImages.length - 1 
                                  ? currentNutritionImageIndex + 1 
                                  : 0;
                                setCurrentNutritionImageIndex(newIndex);
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all backdrop-blur-sm"
                              aria-label="다음 이미지"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          )}

                          {/* 페이지 표시 */}
                          {cGroupNutritionImages.length > 1 && (
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full text-white text-xs font-medium">
                              {currentNutritionImageIndex + 1} / {cGroupNutritionImages.length}
                            </div>
                          )}

                          <img
                            ref={nutritionImageRef}
                            src={cGroupNutritionImages[currentNutritionImageIndex] || cGroupNutritionImages[0]}
                            alt={`Nutrition facts ${currentNutritionImageIndex + 1}`}
                            className="w-full h-auto transition-transform duration-100 ease-out"
                            style={{
                              transform: nutritionImageMagnifier.isHovering 
                                ? `scale(2.5)` 
                                : 'scale(1)',
                              transformOrigin: `${nutritionImageMagnifier.x}% ${nutritionImageMagnifier.y}%`,
                            }}
                            onLoad={() => {
                              setNutritionImageLoaded(true);
                            }}
                          />
                          {/* 하이라이트 오버레이 (주석 처리) */}
                          {/* <div className="absolute inset-0 pointer-events-none">
                            디버깅용: 하이라이트가 없을 때 포커스된 필드에 테스트 박스 표시
                            {cGroupNutritionHighlights.length === 0 && cGroupFocusedField && (
                              <div
                                className="absolute z-10 border-2 border-yellow-400 bg-yellow-400/20 rounded animate-pulse"
                                style={{
                                  left: '30%',
                                  top: '30%',
                                  width: '40%',
                                  height: '10%',
                                }}
                              >
                                <div className="absolute -top-6 left-0 text-xs text-yellow-400 font-semibold">
                                  [디버그] {cGroupFocusedField} 필드 포커스됨
                                </div>
                              </div>
                            )}
                            
                            {cGroupNutritionHighlights.map((highlight, idx) => {
                              if (!highlight.coords || highlight.coords.length === 0) return null;
                              
                              // 원본 이미지 크기 (백엔드에서 받은 meta 정보)
                              const originalWidth = cGroupNutritionImageMeta?.width || 1000;
                              const originalHeight = cGroupNutritionImageMeta?.height || 1000;
                              
                              // 좌표에서 박스 영역 계산 (원본 이미지 기준)
                              const minX = Math.min(...highlight.coords.map(c => c.x));
                              const maxX = Math.max(...highlight.coords.map(c => c.x));
                              const minY = Math.min(...highlight.coords.map(c => c.y));
                              const maxY = Math.max(...highlight.coords.map(c => c.y));
                              
                              // % 단위로 변환 (정규화)
                              const leftPercent = (minX / originalWidth) * 100;
                              const topPercent = (minY / originalHeight) * 100;
                              const widthPercent = ((maxX - minX) / originalWidth) * 100;
                              const heightPercent = ((maxY - minY) / originalHeight) * 100;

                              // 색상 매핑
                              const colorMap: Record<string, { border: string; bg: string; shadow: string }> = {
                                protein: { border: 'border-yellow-400', bg: 'bg-yellow-400/30', shadow: 'shadow-[0_0_10px_rgba(250,204,21,0.5)]' },
                                sugar: { border: 'border-red-400', bg: 'bg-red-400/30', shadow: 'shadow-[0_0_10px_rgba(248,113,113,0.5)]' },
                                fat: { border: 'border-blue-400', bg: 'bg-blue-400/30', shadow: 'shadow-[0_0_10px_rgba(96,165,250,0.5)]' },
                                carb: { border: 'border-orange-400', bg: 'bg-orange-400/30', shadow: 'shadow-[0_0_10px_rgba(251,146,60,0.5)]' },
                                calorie: { border: 'border-purple-400', bg: 'bg-purple-400/30', shadow: 'shadow-[0_0_10px_rgba(196,181,253,0.5)]' },
                                gram: { border: 'border-green-400', bg: 'bg-green-400/30', shadow: 'shadow-[0_0_10px_rgba(74,222,128,0.5)]' },
                              };

                              const colors = colorMap[highlight.field] || { border: 'border-gray-400', bg: 'bg-gray-400/30', shadow: 'shadow-[0_0_10px_rgba(156,163,175,0.5)]' };
                              const isFocused = cGroupFocusedField === highlight.field;

                              return (
                                <div
                                  key={idx}
                                  onMouseEnter={() => setCGroupFocusedField(highlight.field)}
                                  onMouseLeave={() => setCGroupFocusedField(null)}
                                  className="absolute pointer-events-auto cursor-pointer z-10"
                                  style={{
                                    left: `${leftPercent}%`,
                                    top: `${topPercent}%`,
                                    width: `${widthPercent}%`,
                                    height: `${heightPercent}%`,
                                  }}
                                >
                                  <div
                                    className={`absolute inset-0 border-2 rounded transition-all ${
                                      isFocused
                                        ? `${colors.border} ${colors.bg} ${colors.shadow} animate-pulse`
                                        : `${colors.border} ${colors.bg}`
                                    }`}
                                    style={{
                                      backgroundColor: isFocused 
                                        ? undefined 
                                        : colors.bg.includes('yellow') ? 'rgba(250, 204, 21, 0.2)'
                                        : colors.bg.includes('red') ? 'rgba(248, 113, 113, 0.2)'
                                        : colors.bg.includes('blue') ? 'rgba(96, 165, 250, 0.2)'
                                        : colors.bg.includes('orange') ? 'rgba(251, 146, 60, 0.2)'
                                        : colors.bg.includes('purple') ? 'rgba(196, 181, 253, 0.2)'
                                        : colors.bg.includes('green') ? 'rgba(74, 222, 128, 0.2)'
                                        : 'rgba(156, 163, 175, 0.2)',
                                    }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 space-y-1">
                          <p>• 마우스를 올리면 해당 위치가 2.5배 확대됩니다 (호버 돋보기)</p>
                          <p>• 이미지를 클릭하면 전체 화면 확대 모드로 전환됩니다</p>
                          <p>• 확대 모드에서 마우스 휠로 줌인/줌아웃이 가능합니다</p>
                          {/* 하이라이트 기능은 일시적으로 비활성화됨 */}
                          {/* {cGroupNutritionHighlights.length === 0 && (
                            <p className="text-yellow-400">⚠️ 하이라이트 데이터가 없습니다. API 응답을 확인하세요.</p>
                          )}
                          {cGroupNutritionImageMeta && (
                            <p className="text-gray-500">📐 원본 이미지 크기: {cGroupNutritionImageMeta.width} × {cGroupNutritionImageMeta.height}px</p>
                          )} */}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 이미지 확대 모달 (라이트박스) */}
                  <AnimatePresence>
                    {isNutritionImageZoomed && cGroupNutritionImages.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => {
                          setIsNutritionImageZoomed(false);
                          setNutritionImageZoom(1);
                        }}
                      >
                        <motion.div
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0.9 }}
                          className="relative max-w-[95vw] max-h-[95vh] overflow-auto bg-black/50 rounded-lg p-4"
                          onClick={(e) => e.stopPropagation()}
                          onWheel={(e) => {
                            e.preventDefault();
                            const delta = e.deltaY > 0 ? -0.1 : 0.1;
                            setNutritionImageZoom((prev) => Math.max(0.5, Math.min(3, prev + delta)));
                          }}
                        >
                          {/* 닫기 버튼 */}
                          <button
                            onClick={() => {
                              setIsNutritionImageZoomed(false);
                              setNutritionImageZoom(1);
                            }}
                            className="absolute top-2 right-2 z-10 p-2 bg-black/70 hover:bg-black rounded-full text-white transition-all"
                          >
                            <X className="w-5 h-5" />
                          </button>

                          {/* 줌 컨트롤 */}
                          <div className="absolute top-2 left-2 z-10 flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setNutritionImageZoom((prev) => Math.max(0.5, prev - 0.2));
                              }}
                              className="p-2 bg-black/70 hover:bg-black rounded-full text-white transition-all"
                            >
                              <ZoomOut className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setNutritionImageZoom((prev) => Math.min(3, prev + 0.2));
                              }}
                              className="p-2 bg-black/70 hover:bg-black rounded-full text-white transition-all"
                            >
                              <ZoomIn className="w-4 h-4" />
                            </button>
                            <div className="px-3 py-2 bg-black/70 rounded-full text-white text-xs flex items-center">
                              {Math.round(nutritionImageZoom * 100)}%
                            </div>
                          </div>

                          {/* 확대된 이미지 */}
                          <img
                            src={cGroupNutritionImages[0]}
                            alt="Nutrition facts (zoomed)"
                            className="transition-transform duration-200"
                            style={{
                              transform: `scale(${nutritionImageZoom})`,
                              transformOrigin: 'center',
                            }}
                          />
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* 3단계: 액션 버튼 */}
                  <div className="mt-6 flex gap-4">
                    {/* 좌측: 엑셀 복사 버튼 (투명/테두리 스타일) */}
                    <RippleButton
                      onClick={copyCGroupToExcel}
                      className="flex-1 px-6 py-4 bg-transparent border-2 border-[#ccff00] text-[#ccff00] font-semibold text-lg rounded-lg hover:bg-[#ccff00]/10 transition-all flex items-center justify-center gap-3"
                    >
                      <Copy className="w-5 h-5" />
                      엑셀용 복사 (Copy)
                    </RippleButton>

                    {/* 우측: 보관함 저장 버튼 (형광 그린 강조) */}
                    <RippleButton
                      onClick={handleCSaveToAWrapper}
                      disabled={cGroupSaved || isCSaving}
                      className="flex-1 px-6 py-4 bg-[#ccff00] text-black font-bold text-lg rounded-lg hover:bg-[#b3e600] transition-all shadow-[0_0_30px_rgba(204,255,0,0.7)] hover:shadow-[0_0_40px_rgba(204,255,0,0.9)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCSaving ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          저장 중...
                        </>
                      ) : cGroupSaved ? (
                        <>
                          <Package className="w-5 h-5" />
                          저장됨
                        </>
                      ) : (
                        <>
                      <Save className="w-5 h-5" />
                          내 보관함에 저장 (Save to A)
                        </>
                      )}
                    </RippleButton>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        </div>

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />

      {/* Edit Product Modal */}
      <EditProductModal
        product={editingProduct}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={updateProduct}
      />
    </div>
    </>
  );
}
