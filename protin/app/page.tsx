'use client';

import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import { VirtuosoGrid } from 'react-virtuoso';
import { Toaster, toast } from 'react-hot-toast';
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
  LayoutGrid,
  List,
  Download,
  ArrowRight,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

type Tab = 'A' | 'B' | 'C';

// 7대 카테고리 필터링 상수
const FILTER_CATEGORIES = {
  '🥩 단백질 보충제': ['전체', 'WPC', 'WPI', '식물성', '카제인', '게이너', '선식(탄수)', '마이프로틴', '국내(비추)'],
  '💪 운동보조제': ['전체', '크레아틴', '부스터', '아르기닌', '비트즙', '베타알라닌'],
  '🧃 단백질 드링크': ['전체', '단백질몰빵', '고단백두유', '탄수↑,당↓'],
  '🍫 단백질 간식': ['전체', '프로틴바', '칩', '프로틴쿠키', '씨리얼'],
  '🍬 기타 간식': ['전체', '유제품', '오징어', '과일', '빵', '초콜릿', '기타'],
  '💊 영양제': ['전체', '비타민D', '아연', '홍삼', '유산균', '종합비타민', '오메가3'],
  '🐔 닭가슴살': ['전체', '스테이크', '소시지', '볼', '훈제', '소스'],
} as const;

type CategoryLarge = keyof typeof FILTER_CATEGORIES;
type CategorySmall = typeof FILTER_CATEGORIES[CategoryLarge][number];

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
  onClick?: () => void;
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

    onClick?.();
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
    '운동보조제': ['크레아틴', '부스터', '아르기닌', '비트즙', '베타알라닌'],
    '단백질 드링크': ['단백질몰빵', '고단백두유', '탄수↑,당↓'],
    '단백질 간식': ['프로틴바', '쿠키', '칩', '베이커리'],
    '기타 간식': ['젤리', '초콜릿', '저당소스', '유제품', '오징어', '과일', '빵'],
    '영양제': ['종합비타민', '오메가3', '유산균', '밀크씨슬', '비타민D', '아연', '홍삼'],
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
  // C그룹 검수 폼 데이터
  const [cGroupFormData, setCGroupFormData] = useState<{
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
  }>({
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
  });
  // C그룹 (상세분석) - 단일 상품 분석 상태
  const [cGroupProductImages, setCGroupProductImages] = useState<string[]>([]);
  const [cGroupNutritionImages, setCGroupNutritionImages] = useState<string[]>([]);
  const [cGroupLinkInput, setCGroupLinkInput] = useState('');
  const [cGroupImageUrlInput, setCGroupImageUrlInput] = useState('');
  const [cGroupNutritionUrlInput, setCGroupNutritionUrlInput] = useState('');
  const [isCAnalyzing, setIsCAnalyzing] = useState(false);
  const [isCSaving, setIsCSaving] = useState(false);
  const [cGroupSaved, setCGroupSaved] = useState(false);
  const [cGroupRemovingBg, setCGroupRemovingBg] = useState<Set<number>>(new Set());
  const [cGroupFocusedArea, setCGroupFocusedArea] = useState<'product' | 'nutrition' | null>(null);
  const [cGroupNutritionHighlights, setCGroupNutritionHighlights] = useState<Array<{
    field: string;
    coords: Array<{ x: number; y: number }>;
  }>>([]);
  const [cGroupNutritionImageMeta, setCGroupNutritionImageMeta] = useState<{ width: number; height: number } | null>(null);
  const [cGroupFocusedField, setCGroupFocusedField] = useState<string | null>(null);
  const [nutritionImageLoaded, setNutritionImageLoaded] = useState(false);
  const [isNutritionImageZoomed, setIsNutritionImageZoomed] = useState(false);
  const [nutritionImageZoom, setNutritionImageZoom] = useState(1);
  const [nutritionImageMagnifier, setNutritionImageMagnifier] = useState({ x: 50, y: 50, isHovering: false });
  const cGroupProductFileInputRef = useRef<HTMLInputElement>(null);
  const cGroupNutritionFileInputRef = useRef<HTMLInputElement>(null);
  const nutritionImageRef = useRef<HTMLImageElement>(null);
  
  // B그룹 (시장조사) - 리스트 스캔 모드 상태
  const [bGroupListImages, setBGroupListImages] = useState<string[]>([]);
  const [bGroupBrandFilter, setBGroupBrandFilter] = useState<string>('');
  const [bGroupBundleExclude, setBGroupBundleExclude] = useState<number>(2);
  const [bGroupListResults, setBGroupListResults] = useState<Array<{
    brand: string;
    name: string;
    flavor?: string;
    weight_g?: number;
    is_snack: boolean;
    bundle_count: number;
    status: 'new' | 'duplicate' | 'bundle' | 'brand' | 'snack';
    excludeReason?: string;
  }>>([]);
  const [bGroupListExcluded, setBGroupListExcluded] = useState<Array<{
    brand: string;
    name: string;
    flavor?: string;
    weight_g?: number;
    reason: string;
    type: 'BRAND' | 'BUNDLE' | 'DUPLICATE';
  }>>([]);
  const [bGroupExcludedFilter, setBGroupExcludedFilter] = useState<'ALL' | 'BRAND' | 'BUNDLE' | 'DUPLICATE'>('ALL');
  const [isBGroupListAnalyzing, setIsBGroupListAnalyzing] = useState(false);
  const [cGroupData, setCGroupData] = useState<Partial<Product>>({});
  const [cGroupImages, setCGroupImages] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [showToast, setShowToast] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryLarge | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<CategorySmall | null>(null);
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
   다음 7가지 카테고리 중 상품명과 특징을 보고 정확히 하나를 선택하세요:
   
   🥩 "단백질 보충제": 프로틴 파우더, WPC, WPI, 식물성 단백질, 카제인, 게이너 등
   💪 "운동보조제": 크레아틴, 부스터, 아르기닌, 비트즙, 베타알라닌 등
   🧃 "단백질 드링크": 단백질 음료, 고단백 두유, 단백질몰빵 등
   🍫 "단백질 간식": 프로틴바, 프로틴 칩, 프로틴 쿠키, 씨리얼 등
   🍬 "기타 간식": 유제품, 오징어, 과일, 빵, 초콜릿 등 (단백질이 아닌 일반 간식)
   💊 "영양제": 비타민D, 아연, 홍삼, 유산균, 종합비타민, 오메가3 등
   🐔 "닭가슴살": 닭가슴살 스테이크, 소시지, 볼, 훈제, 소스 등
   
   - 이미지 상단의 경로 텍스트가 있으면 그것을 우선 사용하세요
   - 없으면 상품명과 특징을 보고 위 7가지 중 가장 적합한 것을 선택하세요
   - 이모지는 제외하고 텍스트만 반환하세요 (예: "단백질 보충제")

4. Category_small (소분류):
   선택한 대분류에 따라 다음 소분류 중 하나를 선택하세요:
   
   단백질 보충제: "WPC", "WPI", "식물성", "카제인", "게이너", "선식(탄수)", "마이프로틴", "국내(비추)"
   운동보조제: "크레아틴", "부스터", "아르기닌", "비트즙", "베타알라닌"
   단백질 드링크: "단백질몰빵", "고단백두유", "탄수↑,당↓"
   단백질 간식: "프로틴바", "칩", "프로틴쿠키", "씨리얼"
   기타 간식: "유제품", "오징어", "과일", "빵", "초콜릿", "기타"
   영양제: "비타민D", "아연", "홍삼", "유산균", "종합비타민", "오메가3"
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
- category_large는 반드시 위 7가지 중 하나로 분류하세요 (이모지 제외)

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
      const tempIndex = cGroupProductImages.length;
      
      // 2. 먼저 원본 이미지를 미리보기에 추가 (임시)
      const reader = new FileReader();
      reader.onload = async (e) => {
        const originalDataUrl = e.target?.result as string;
        
        // 원본 이미지 추가
        setCGroupProductImages((prev) => [...prev, originalDataUrl]);
        setCGroupImageUrlInput('');
        
        // 배경 제거 시작 (로딩 상태 표시)
        setCGroupRemovingBg((prev) => new Set(prev).add(tempIndex));
        
        try {
          // 3. Blob을 File로 변환
          const file = new File([blob], 'image.png', { type: blob.type || 'image/png' });
          
          // 4. 배경 제거 유틸리티 함수 실행
          const { removeBackground, blobToDataURL } = await import('../utils/imageProcessor');
          const processedBlob = await removeBackground(file);
          
          // 5. 배경 제거된 이미지를 Base64로 변환
          const processedDataUrl = await blobToDataURL(processedBlob);
          
          // 6. 원본 이미지를 배경 제거된 이미지로 교체
          setCGroupProductImages((prev) => {
            const newImages = [...prev];
            newImages[tempIndex] = processedDataUrl;
            return newImages;
          });
          
          toast.success('배경이 제거된 이미지가 추가되었습니다!');
        } catch (error) {
          console.error('Failed to remove background:', error);
          toast.error('배경 제거에 실패했습니다. 원본 이미지를 사용합니다.');
        } finally {
          // 로딩 상태 해제
          setCGroupRemovingBg((prev) => {
            const newSet = new Set(prev);
            newSet.delete(tempIndex);
            return newSet;
          });
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Failed to load image from URL:', error);
      toast.error('이미지 URL을 확인해주세요.');
    }
  };

  // C그룹 상품 이미지 파일 선택 (배경 제거)
  const handleCGroupProductFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      const currentIndex = cGroupProductImages.length + idx;
      
      // 먼저 원본 이미지 추가
      const reader = new FileReader();
      reader.onload = async (e) => {
        const originalDataUrl = e.target?.result as string;
        setCGroupProductImages((prev) => [...prev, originalDataUrl]);
        
        // 배경 제거 시작
        setCGroupRemovingBg((prev) => new Set(prev).add(currentIndex));
        
        try {
          const { removeBackground, blobToDataURL } = await import('../utils/imageProcessor');
          const processedBlob = await removeBackground(file);
          const processedDataUrl = await blobToDataURL(processedBlob);
          
          // 원본을 배경 제거된 이미지로 교체
          setCGroupProductImages((prev) => {
            const newImages = [...prev];
            newImages[currentIndex] = processedDataUrl;
            return newImages;
          });
        } catch (error) {
          console.error('Failed to remove background:', error);
        } finally {
          setCGroupRemovingBg((prev) => {
            const newSet = new Set(prev);
            newSet.delete(currentIndex);
            return newSet;
          });
        }
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
        setCGroupNutritionImages((prev) => [...prev, dataUrl]);
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
      setCGroupNutritionImages((prev) => [...prev, ...imageDataUrls]);
    });
  };

  // C그룹 상품 이미지 Ctrl+V 붙여넣기 (배경 제거)
  const handleCGroupProductPaste = async (e: React.ClipboardEvent) => {
    if (activeTab !== 'C' || cGroupFocusedArea !== 'product') return;

    const items = e.clipboardData.items;
    const imageItems = Array.from(items).filter((item) => item.type.startsWith('image/'));

    if (imageItems.length === 0) return;

    e.preventDefault();

    for (let idx = 0; idx < imageItems.length; idx++) {
      const item = imageItems[idx];
      const file = item.getAsFile();
      if (!file) continue;

      const currentIndex = cGroupProductImages.length + idx;
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        const originalDataUrl = e.target?.result as string;
        setCGroupProductImages((prev) => [...prev, originalDataUrl]);
        
        // 배경 제거 시작
        setCGroupRemovingBg((prev) => new Set(prev).add(currentIndex));
        
        try {
          const { removeBackground, blobToDataURL } = await import('../utils/imageProcessor');
          const processedBlob = await removeBackground(file);
          const processedDataUrl = await blobToDataURL(processedBlob);
          
          setCGroupProductImages((prev) => {
            const newImages = [...prev];
            newImages[currentIndex] = processedDataUrl;
            return newImages;
          });
        } catch (error) {
          console.error('Failed to remove background:', error);
        } finally {
          setCGroupRemovingBg((prev) => {
            const newSet = new Set(prev);
            newSet.delete(currentIndex);
            return newSet;
          });
        }
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
        setCGroupNutritionImages((prev) => [...prev, ...validUrls]);
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

    setIsCAnalyzing(true);
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

    const prompt = `제공된 이미지들을 두 그룹으로 구분하여 분석하라:

**첫 번째 그룹 (Product Appearance):**
- 상품의 앞면, 뒷면, 포장 이미지
- 제품명, 브랜드, 맛, 용량 등의 정보를 추출하라

**두 번째 그룹 (Nutrition Facts Label):**
- 영양성분표, 함량표
- 특히 영양성분표(Nutrition Facts)를 꼼꼼히 읽어서 protein, sugar, fat, calorie, total_carb 수치를 숫자만 추출하라
- gram은 '1 scoop (30g)' 같은 표기에서 괄호 안의 숫자를 의미한다
- scoops는 'Total Servings' 또는 전체 용량 나누기 1회 용량을 계산해서 넣어라

다음 형식의 JSON으로 응답하라:
{
  "name": "제품명",
    "flavor": "맛",
  "amount": "용량 (예: 2kg)",
  "category": "대분류",
  "sub_category": "소분류",
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

      // 폼 데이터 업데이트
      setCGroupFormData({
        name: extractedData.name || '',
        link: cleanCoupangUrl(cGroupLinkInput), // 정제된 URL
        flavor: extractedData.flavor || '',
        amount: extractedData.amount || '',
        category: extractedData.category || '',
        sub_category: extractedData.sub_category || '',
        protein: extractedData.protein?.toString() || '',
        scoops: extractedData.scoops?.toString() || '',
        sugar: extractedData.sugar?.toString() || '',
        fat: extractedData.fat?.toString() || '',
        calorie: extractedData.calorie?.toString() || '',
        gram: extractedData.gram?.toString() || '',
        total_carb: extractedData.total_carb?.toString() || '',
      });

      setCGroupSaved(false); // 분석 완료 시 저장 상태 초기화
      toast.success('분석이 완료되었습니다!');
    } catch (error) {
      console.error('Failed to analyze:', error);
      toast.error('분석 중 오류가 발생했습니다.');
    } finally {
      setIsCAnalyzing(false);
    }
  };

  // C그룹 데이터를 A그룹(보관함)에 저장
  const handleCSaveToA = async () => {
    if (!cGroupFormData.name) {
      toast.error('제품명을 입력해주세요.');
      return;
    }

    setIsCSaving(true);

    try {
      // 메인 이미지 가져오기 (첫 번째 상품 이미지 우선, 없으면 성분표)
      let imageUrl = '';
      if (cGroupProductImages.length > 0) {
        imageUrl = await ensureImageResolution(cGroupProductImages[0], 1000);
      } else if (cGroupNutritionImages.length > 0) {
        imageUrl = await ensureImageResolution(cGroupNutritionImages[0], 1000);
      }

      // C그룹 데이터를 A그룹 Product 스키마로 변환
      const newProduct: Omit<Product, 'id' | 'createdAt'> = {
        name: cGroupFormData.name,
        brand: '', // C그룹에는 브랜드 필드가 없으므로 빈 문자열
        flavor: cGroupFormData.flavor,
        weight: cGroupFormData.amount,
        category_large: cGroupFormData.category,
        category_small: cGroupFormData.sub_category,
        serving: cGroupFormData.gram ? `${cGroupFormData.gram}g` : undefined,
        calories: cGroupFormData.calorie ? Number(cGroupFormData.calorie) : undefined,
        carbs: cGroupFormData.total_carb ? Number(cGroupFormData.total_carb) : undefined,
        protein: cGroupFormData.protein ? Number(cGroupFormData.protein) : undefined,
        fat: cGroupFormData.fat ? Number(cGroupFormData.fat) : undefined,
        sugar: cGroupFormData.sugar ? Number(cGroupFormData.sugar) : undefined,
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
        setCGroupSaved(true);
        toast.success('보관함에 등록되었습니다!');
      } else {
        throw new Error('Failed to save product');
      }
    } catch (error) {
      console.error('Failed to save to A group:', error);
      toast.error('저장 중 오류가 발생했습니다.');
    } finally {
      setIsCSaving(false);
    }
  };

  // C그룹 엑셀용 복사 (탭으로 구분)
  const copyCGroupToExcel = () => {
    const fields = [
      cGroupFormData.name,
      cGroupFormData.link,
      cGroupFormData.flavor,
      cGroupFormData.amount,
      cGroupFormData.category,
      cGroupFormData.sub_category,
      cGroupFormData.protein,
      cGroupFormData.scoops,
      cGroupFormData.sugar,
      cGroupFormData.fat,
      cGroupFormData.calorie,
      cGroupFormData.gram,
      cGroupFormData.total_carb,
    ];

    const tabSeparated = fields.join('\t');
    navigator.clipboard.writeText(tabSeparated).then(() => {
      toast.success('복사 완료! 엑셀에 붙여넣으세요.');
    });
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

    const prompt = `제공된 여러 장의 이미지는 하나의 긴 상품 리스트를 캡처한 쿠팡 상품 목록 스크린샷입니다. 

중요:
- 중복되어 찍힌 상품이 있다면 하나로 합치고, 전체 리스트에서 유니크한 상품 정보만 추출하라.
- 같은 상품이 여러 이미지에 나타나면 가장 명확한 정보를 사용하라.

각 상품의 정보를 추출하여 다음 JSON 배열 형식으로 응답하라:

[
  {
    "brand": "브랜드명 (한글/영어)",
    "name": "상품 전체 이름",
    "flavor": "맛 정보 (있으면 추출, 없으면 빈 문자열)",
    "weight_g": 숫자 (중량을 그램 단위로 추출, 예: 2.27kg -> 2270, 400g -> 400),
    "is_snack": true/false (단백질 간식류: 바, 쿠키, 칩 등이면 true),
    "bundle_count": 숫자 (상품명에 '2개', '3팩', 'x2', '2입' 등이 있으면 숫자 추출, 없으면 1)
  },
  ...
]

중요:
- weight_g는 중량을 그램(g) 단위로 숫자만 추출 (kg 단위면 1000을 곱해서 변환)
- flavor는 상품명이나 설명에서 맛 정보를 추출 (예: "초콜릿", "바닐라", "딸기" 등)
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
        name: string;
        flavor?: string;
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

      // 정밀 중복 체크 함수 (400g 룰)
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

          // 3. 정밀 중복 체크 (400g 룰)
          const scannedWeightG = scanned.weight_g;
          const scannedBrand = (scanned.brand || '').toLowerCase();
          const scannedName = scanned.name.toLowerCase();
          const scannedFlavor = (scanned.flavor || '').toLowerCase();

          let isDuplicate = false;
          let duplicateReason = '';

          for (const inventory of inventoryItems) {
            const inventoryBrand = (inventory.brand || '').toLowerCase();
            const inventoryName = (inventory.name || '').toLowerCase();
            const inventoryFlavor = (inventory.flavor || '').toLowerCase();
            
            // 브랜드가 같은지 확인
            if (scannedBrand && inventoryBrand && scannedBrand !== inventoryBrand) {
              continue;
            }

            // 상품명 유사도 체크 (핵심 키워드 겹침)
            const scannedKeywords = scannedName.split(/\s+/).filter(k => k.length > 2);
            const inventoryKeywords = inventoryName.split(/\s+/).filter(k => k.length > 2);
            const commonKeywords = scannedKeywords.filter(k => inventoryKeywords.includes(k));
            
            if (commonKeywords.length === 0) {
              continue;
            }

            // 맛 정보 비교 (있으면)
            if (scannedFlavor && inventoryFlavor && scannedFlavor !== inventoryFlavor) {
              continue;
            }

            // 중량 비교 (400g 룰)
            if (scannedWeightG !== undefined) {
              const inventoryWeightG = parseWeightToGrams(inventory.weight);
              
              if (inventoryWeightG !== undefined) {
                const weightDiff = Math.abs(scannedWeightG - inventoryWeightG);
                
                if (weightDiff < 400) {
                  // 400g 미만 차이면 중복으로 간주
                  isDuplicate = true;
                  duplicateReason = `보관함 제품과 용량 ${weightDiff}g 차이로 제외됨`;
                  break;
                }
              }
            } else {
              // 중량 정보가 없으면 상품명 유사도만으로 판단
              if (commonKeywords.length >= 2) {
                isDuplicate = true;
                duplicateReason = '보관함 제품과 유사한 상품명';
                break;
              }
            }
          }

          if (isDuplicate) {
            excludedItems.push({
              brand: scanned.brand,
              name: scanned.name,
              flavor: scanned.flavor,
              weight_g: scanned.weight_g,
              reason: duplicateReason,
              type: 'DUPLICATE',
            });
            continue;
          }

          // 통과한 상품
          newItems.push({
            ...scanned,
            status: 'new',
          });
        }

        return { newItems, excludedItems };
      };

      // 필터링 실행
      const { newItems, excludedItems } = filterNewItems(listProducts, products);

      setBGroupListResults(newItems);
      setBGroupListExcluded(excludedItems);
      
      toast.success(`분석 완료! ${newItems.length}개 신규 상품 발견, ${excludedItems.length}개 제외`);
    } catch (error) {
      console.error('Failed to analyze list:', error);
      toast.error('분석 중 오류가 발생했습니다.');
    } finally {
      setIsBGroupListAnalyzing(false);
    }
  };

  // 리스트 스캔 결과: 엑셀 복사
  const handleBGroupListCopyToExcel = () => {
    if (bGroupListResults.length === 0) {
      toast.error('복사할 상품이 없습니다.');
      return;
    }

    const rows = bGroupListResults.map((product) => {
      const fields = [
        product.name || '',
        product.brand || '',
        product.flavor || '',
        product.weight_g ? `${product.weight_g}g` : '',
        product.bundle_count > 1 ? `${product.bundle_count}개` : '',
        '', // 링크 (없음)
        '', // 영양성분 등 (없음)
      ];
      return fields.join('\t');
    });

    const tabSeparated = rows.join('\n');
    navigator.clipboard.writeText(tabSeparated).then(() => {
      toast.success(`복사 완료! ${bGroupListResults.length}개 상품 정보가 클립보드에 복사되었습니다.`);
    });
  };

  // 리스트 스캔 결과: 보관함에 저장
  const handleBGroupListSaveToA = async (product: typeof bGroupListResults[0]) => {
    setIsBSaving(true);

    try {
      const newProduct: Omit<Product, 'id' | 'createdAt'> = {
        name: product.name,
        brand: product.brand,
        flavor: '',
        weight: '',
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
            {product.protein !== undefined && (
              <div className="text-xs text-gray-400">단백질: {product.protein}g</div>
            )}
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

          {/* Tab B: 시장조사 */}
          {activeTab === 'B' && (
            <motion.div
              key="B"
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-6"
            >
              {/* 리스트 스캔 모드 */}
                  {/* 설정 UI */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl space-y-4"
                  >
                    <h3 className="text-lg font-semibold text-[#ccff00] flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      리스트 스캔 설정
                    </h3>

                    {/* 브랜드 필터 */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">브랜드 필터</label>
                      <input
                        type="text"
                        value={bGroupBrandFilter}
                        onChange={(e) => setBGroupBrandFilter(e.target.value)}
                        placeholder="머슬팜, 마이프로틴 (비어있으면 전체 허용)"
                        className="w-full px-4 py-3 bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition"
                      />
                    </div>

                    {/* 묶음 제외 기준 */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">묶음 제외 기준</label>
                      <input
                        type="number"
                        value={bGroupBundleExclude}
                        onChange={(e) => setBGroupBundleExclude(Number(e.target.value) || 2)}
                        min="1"
                        className="w-full px-4 py-3 bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition"
                      />
                      <p className="text-xs text-gray-400">N개 이상 묶음 상품 제외 (간식은 묶음 허용)</p>
                    </div>

                    {/* 이미지 입력 (Ctrl+V 전용) */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">리스트 스크린샷</label>
                      <div
                        onPaste={handleBGroupListPaste}
                        className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-[#ccff00]/50 transition-all bg-black/20"
                      >
                        <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">여기를 클릭하고 스크린샷을 계속 붙여넣으세요</p>
                        <p className="text-[#ccff00] text-xs font-semibold mt-1">Ctrl+V (최대 5장)</p>
                        {bGroupListImages.length > 0 && (
                          <p className="text-xs text-gray-500 mt-2">현재 {bGroupListImages.length}장 대기 중</p>
                        )}
                      </div>

                      {/* 대기열 미리보기 */}
                      {bGroupListImages.length > 0 && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {bGroupListImages.map((img, idx) => (
                              <div key={idx} className="relative w-full h-24 bg-black/20 rounded-lg overflow-hidden group">
                                <img
                                  src={img}
                                  alt={`Screenshot ${idx + 1}`}
                                  className="w-full h-full object-contain"
                                />
                                <button
                                  onClick={() => handleBGroupListImageRemove(idx)}
                                  className="absolute top-1 right-1 p-1 bg-red-600/80 hover:bg-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                >
                                  <X className="w-3 h-3 text-white" />
                                </button>
                                <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 rounded text-xs text-white">
                                  {idx + 1}
                                </div>
                              </div>
                            ))}
                          </div>
                  <RippleButton
                            onClick={handleBGroupListImagesClear}
                            className="w-full px-4 py-2 bg-transparent border border-white/20 text-gray-400 hover:text-white hover:border-white/40 rounded-lg transition-all text-sm flex items-center justify-center gap-2"
                  >
                            <X className="w-4 h-4" />
                            모두 지우기
                  </RippleButton>
                        </div>
                      )}
                    </div>

                    {/* 일괄 분석 버튼 */}
                    <RippleButton
                      onClick={handleBGroupListAnalyze}
                      disabled={bGroupListImages.length === 0 || isBGroupListAnalyzing}
                      className="w-full px-6 py-4 bg-[#ccff00] text-black font-bold text-lg rounded-lg hover:bg-[#b3e600] transition-all shadow-[0_0_30px_rgba(204,255,0,0.7)] hover:shadow-[0_0_40px_rgba(204,255,0,0.9)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isBGroupListAnalyzing ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          분석 중...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-6 h-6" />
                          {bGroupListImages.length}장의 스크린샷 일괄 분석
                        </>
                      )}
                    </RippleButton>
              </motion.div>

                  {/* 결과 화면 */}
                  {bGroupListResults.length > 0 && (
              <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-[#ccff00] flex items-center gap-2">
                          <Package className="w-5 h-5" />
                          신규 발견된 상품 (New) ({bGroupListResults.length}개)
                        </h3>
                        {bGroupListResults.length > 0 && (
                          <RippleButton
                            onClick={handleBGroupListCopyToExcel}
                            className="px-4 py-2 bg-transparent border-2 border-[#ccff00] text-[#ccff00] font-semibold rounded-lg hover:bg-[#ccff00]/10 transition-all flex items-center gap-2 text-sm"
                          >
                            <Copy className="w-4 h-4" />
                            엑셀로 모두 복사
                          </RippleButton>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {bGroupListResults.map((product, idx) => (
                          <div
                    key={idx}
                            className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-lg p-4 space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="text-xs text-gray-400 mb-1">{product.brand || '브랜드 없음'}</p>
                                <p className="text-sm font-semibold text-[#ccff00] line-clamp-2">{product.name}</p>
                                {product.flavor && (
                                  <p className="text-xs text-gray-300 mt-1">맛: {product.flavor}</p>
                                )}
                                {product.weight_g && (
                                  <p className="text-xs text-gray-300">용량: {product.weight_g >= 1000 ? `${(product.weight_g / 1000).toFixed(2)}kg` : `${product.weight_g}g`}</p>
                                )}
                                <div className="flex gap-2 mt-2">
                                  {product.is_snack && (
                                    <span className="px-2 py-0.5 bg-[#ccff00]/20 text-[#ccff00] text-xs rounded-full">
                                      간식
                                    </span>
                                  )}
                                  {product.bundle_count > 1 && (
                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                                      {product.bundle_count}개 묶음
                                    </span>
                                  )}
        </div>
                              </div>
                            </div>
                            <RippleButton
                              onClick={() => handleBGroupListSaveToA(product)}
                              disabled={isBSaving}
                              className="w-full px-4 py-2 bg-[#ccff00] text-black font-semibold rounded-lg hover:bg-[#b3e600] transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              <Save className="w-4 h-4" />
                              보관함 저장
                            </RippleButton>
                          </div>
                        ))}
                      </div>
              </motion.div>
                  )}

                  {/* 제외된 상품 (Duplicates) */}
                  {bGroupListExcluded.length > 0 && (
                <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl"
                    >
                      <details className="space-y-2" open>
                        <summary className="text-sm font-semibold text-[#ccff00] cursor-pointer flex items-center gap-2 mb-4">
                          <FileText className="w-4 h-4" />
                          제외된 상품 (Duplicates) ({bGroupListExcluded.length}개)
                        </summary>

                        {/* 필터 칩 */}
                        <div className="mb-4 overflow-x-auto">
                          <div className="flex gap-2 pb-2">
                            {(['ALL', 'BRAND', 'BUNDLE', 'DUPLICATE'] as const).map((filterType) => {
                              const count = filterType === 'ALL' 
                                ? bGroupListExcluded.length
                                : bGroupListExcluded.filter(item => item.type === filterType).length;
                              
                              const labels = {
                                ALL: '전체',
                                BRAND: '⛔ 브랜드 제외',
                                BUNDLE: '📦 묶음/수량',
                                DUPLICATE: '♻️ 보관함 중복',
                              };

                              const isSelected = bGroupExcludedFilter === filterType;

                              return (
                                <button
                                  key={filterType}
                                  onClick={() => setBGroupExcludedFilter(filterType)}
                                  className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
                                    isSelected
                                      ? 'bg-[#ccff00] text-black shadow-[0_0_10px_rgba(204,255,0,0.5)]'
                                      : 'bg-transparent border border-white/20 text-white hover:border-white/40'
                                  }`}
                                >
                                  {labels[filterType]} ({count})
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 필터링된 리스트 */}
                        <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                          {bGroupListExcluded
                            .filter(item => 
                              bGroupExcludedFilter === 'ALL' || item.type === bGroupExcludedFilter
                            )
                            .map((item, idx) => {
                              const typeLabels = {
                                BRAND: '브랜드',
                                BUNDLE: '묶음',
                                DUPLICATE: '중복',
                              };

                              const typeColors = {
                                BRAND: 'bg-red-500/20 text-red-400 border-red-500/50',
                                BUNDLE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
                                DUPLICATE: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
                              };

                              return (
                                <div key={idx} className="text-xs text-gray-400 py-2 border-b border-white/5 flex items-start gap-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${typeColors[item.type]}`}>
                                    [{typeLabels[item.type]}]
                                  </span>
                                  <div className="flex-1">
                                    <p className="font-semibold text-gray-300">{item.name}</p>
                                    <p className="text-gray-500 mt-1">
                                      {item.brand && `${item.brand} | `}
                                      {item.reason}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </details>
                </motion.div>
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
              {/* 1단계: 입력 (2개 구역) */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl"
              >
                <h3 className="text-lg font-semibold text-[#ccff00] flex items-center gap-2 mb-4">
                  <Upload className="w-5 h-5" />
                  상품 이미지 & 성분표 업로드
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* 구역 A: 상품 이미지 (왼쪽) */}
                  <div
                    onClick={() => setCGroupFocusedArea('product')}
                    onPaste={handleCGroupProductPaste}
                    className={`space-y-3 p-4 rounded-lg border-2 transition-all ${
                      cGroupFocusedArea === 'product'
                        ? 'border-[#ccff00] bg-[#ccff00]/10'
                        : 'border-white/20 bg-black/20'
                    }`}
                  >
                    <h4 className="text-sm font-semibold text-[#ccff00] flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      상품 이미지
                    </h4>

                    {/* 상품 이미지 URL 입력 */}
                    <div className="space-y-2">
                      <label className="block text-xs text-gray-400">상품 이미지 URL 입력</label>
                      <div className="flex gap-2">
                <input
                          type="url"
                          value={cGroupImageUrlInput}
                          onChange={(e) => setCGroupImageUrlInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleCGroupImageUrlAdd();
                            }
                          }}
                          onFocus={() => setCGroupFocusedArea('product')}
                          placeholder="https://..."
                          className="flex-1 px-3 py-2 bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition"
                        />
                        <RippleButton
                          onClick={handleCGroupImageUrlAdd}
                          disabled={!cGroupImageUrlInput.trim()}
                          className="px-3 py-2 bg-[#ccff00] text-black font-semibold rounded-lg hover:bg-[#b3e600] transition-all text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ArrowRight className="w-3 h-3" />
                          추가
                        </RippleButton>
                      </div>
                    </div>

                    {/* 상품 이미지 붙여넣기 영역 */}
                    <div className="space-y-2">
                      <input
                        ref={cGroupProductFileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                        onChange={handleCGroupProductFileSelect}
                  className="hidden"
                        id="c-group-product-input"
                />
                <label
                        htmlFor="c-group-product-input"
                        className="block cursor-pointer"
                        onClick={() => setCGroupFocusedArea('product')}
                      >
                        <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-[#ccff00]/50 transition-all bg-black/20">
                          <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-400 text-xs">또는 여기를 클릭 후</p>
                          <p className="text-[#ccff00] text-xs font-semibold mt-1">Ctrl+V (상품컷)</p>
                        </div>
                </label>

                      {/* 상품 이미지 썸네일 */}
                      {cGroupProductImages.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {cGroupProductImages.map((img, idx) => (
                            <div key={idx} className="relative w-full h-20 bg-black/20 rounded-lg overflow-hidden group">
                              <img
                                src={img}
                                alt={`Product ${idx + 1}`}
                                className={`w-full h-full object-contain transition-opacity duration-300 ${
                                  cGroupRemovingBg.has(idx) ? 'opacity-50' : 'opacity-100'
                                }`}
                              />
                              {cGroupRemovingBg.has(idx) && (
                                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-10">
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
                                onClick={() => {
                                  setCGroupProductImages((prev) => prev.filter((_, i) => i !== idx));
                                  setCGroupRemovingBg((prev) => {
                                    const newSet = new Set(prev);
                                    newSet.delete(idx);
                                    return newSet;
                                  });
                                }}
                                className="absolute top-1 right-1 p-1 bg-red-600/80 hover:bg-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity z-20"
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
                    onClick={() => setCGroupFocusedArea('nutrition')}
                    onPaste={handleCGroupNutritionPaste}
                    className={`space-y-3 p-4 rounded-lg border-2 transition-all ${
                      cGroupFocusedArea === 'nutrition'
                        ? 'border-[#ccff00] bg-[#ccff00]/10'
                        : 'border-white/20 bg-black/20'
                    }`}
                  >
                    <h4 className="text-sm font-semibold text-[#ccff00] flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      성분표/영양정보
                    </h4>

                    {/* 성분표 이미지 URL 입력 */}
                    <div className="space-y-2">
                      <label className="block text-xs text-gray-400">성분표 이미지 URL 입력</label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={cGroupNutritionUrlInput}
                          onChange={(e) => setCGroupNutritionUrlInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleCGroupNutritionUrlAdd();
                            }
                          }}
                          onFocus={() => setCGroupFocusedArea('nutrition')}
                          placeholder="https://..."
                          className="flex-1 px-3 py-2 bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition"
                        />
                        <RippleButton
                          onClick={handleCGroupNutritionUrlAdd}
                          disabled={!cGroupNutritionUrlInput.trim()}
                          className="px-3 py-2 bg-[#ccff00] text-black font-semibold rounded-lg hover:bg-[#b3e600] transition-all text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className="hidden"
                        id="c-group-nutrition-input"
                      />
                      <label
                        htmlFor="c-group-nutrition-input"
                        className="block cursor-pointer"
                        onClick={() => setCGroupFocusedArea('nutrition')}
                      >
                        <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-[#ccff00]/50 transition-all bg-black/20">
                          <FileText className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-400 text-xs">여기를 클릭 후</p>
                          <p className="text-[#ccff00] text-xs font-semibold mt-1">Ctrl+V (성분표/함량표)</p>
                        </div>
                      </label>

                      {/* 성분표 썸네일 */}
                      {cGroupNutritionImages.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {cGroupNutritionImages.map((img, idx) => (
                            <div key={idx} className="relative w-full h-20 bg-black/20 rounded-lg overflow-hidden group">
                      <img
                        src={img}
                                alt={`Nutrition ${idx + 1}`}
                                className="w-full h-full object-contain"
                              />
                              <button
                                onClick={() => {
                                  setCGroupNutritionImages((prev) => prev.filter((_, i) => i !== idx));
                                }}
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
                  />
                </div>

                {/* 분석 시작 버튼 */}
                <RippleButton
                  onClick={handleCAnalyze}
                  disabled={(cGroupProductImages.length === 0 && cGroupNutritionImages.length === 0) || isCAnalyzing}
                  className="w-full mt-4 px-6 py-3 bg-[#ccff00] text-black font-semibold rounded-lg hover:bg-[#b3e600] transition-all shadow-[0_0_20px_rgba(204,255,0,0.5)] hover:shadow-[0_0_30px_rgba(204,255,0,0.7)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCAnalyzing ? (
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
                            <input
                              type="text"
                              value={cGroupFormData.category}
                              onChange={(e) => setCGroupFormData({ ...cGroupFormData, category: e.target.value })}
                              className="w-full px-3 py-2 bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">소분류</label>
                            <input
                              type="text"
                              value={cGroupFormData.sub_category}
                              onChange={(e) => setCGroupFormData({ ...cGroupFormData, sub_category: e.target.value })}
                              className="w-full px-3 py-2 bg-black/50 backdrop-blur-xl border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition"
                            />
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
                        >
                          <img
                            ref={nutritionImageRef}
                            src={cGroupNutritionImages[0]}
                            alt="Nutrition facts"
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
                      onClick={handleCSaveToA}
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
