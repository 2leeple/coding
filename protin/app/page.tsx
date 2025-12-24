'use client';

import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';

type Tab = 'A' | 'B' | 'C';

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

export default function Home() {
  const [apiKey, setApiKey] = useState<string>('');
  const [activeTab, setActiveTab] = useState<Tab>('A');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [bGroupResults, setBGroupResults] = useState<Product[]>([]);
  const [cGroupData, setCGroupData] = useState<Partial<Product>>({});
  const [cGroupImages, setCGroupImages] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [showToast, setShowToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
    loadProducts();
  }, []);

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
    if (activeTab !== 'A' && activeTab !== 'B') return;

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
      } else if (activeTab === 'B') {
        await processBulkProducts(imageDataUrls);
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

3. Category_large (대분류):
   - 이미지 상단이나 카드 내부에 있는 경로(Breadcrumb) 텍스트를 찾으세요
   - 예: "단백질 보충제 > WPC" → "단백질 보충제"
   - 예: "보충제 > 프로틴" → "보충제"
   - 경로 텍스트가 없으면 문맥상 대분류를 추론하세요

4. Category_small (소분류):
   - 경로 텍스트의 끝부분을 찾으세요
   - 예: "단백질 보충제 > WPC" → "WPC"
   - 예: "케이스인", "WPI", "식물성", "유청" 등
   - 상품 특징에서 소분류를 추출하세요

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

다음 형식의 JSON 배열로 응답하세요 (반드시 배열 형태):
[
  {
    "name": "상품 전체 이름",
    "category_large": "대분류",
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

  const processBulkProducts = async (imageDataUrls: string[]) => {
    if (!apiKey) {
      alert('Gemini API Key를 먼저 입력해주세요.');
      return;
    }

    const prompt = `이미지 내 모든 상품의 브랜드, 이름, 맛, 무게를 추출해주세요. 가격이나 배송일은 제외해주세요. 다음 형식의 JSON 배열로 응답해주세요:
[
  {
    "brand": "브랜드명",
    "name": "상품명",
    "flavor": "맛",
    "weight": "무게"
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

      const filteredProducts = extractedProducts.filter((extracted) => {
        return !products.some(
          (existing) =>
            existing.brand === extracted.brand &&
            existing.name === extracted.name &&
            existing.flavor === extracted.flavor
        );
      });

      setBGroupResults(filteredProducts.map((p) => ({ ...p, id: uuidv4() } as Product)));
    } catch (error) {
      console.error('Failed to process bulk products:', error);
      alert('대량 상품 처리 중 오류가 발생했습니다.');
    }
  };

  const copyToCSV = () => {
    const productNames = bGroupResults.map((p) => p.name).join('\n');
    navigator.clipboard.writeText(productNames).then(() => {
      alert('상품명이 클립보드에 복사되었습니다.');
    });
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
            <h1 className="text-2xl font-bold text-[#ccff00]">Protin Manager</h1>
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

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {products.map((product, index) => (
                  <motion.div
                    key={product.id}
                    variants={itemVariants}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:border-[#ccff00] hover:shadow-[0_0_20px_rgba(204,255,0,0.3)] transition-all cursor-pointer"
                  >
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-48 object-cover rounded-lg mb-3"
                      />
                    )}
                    <div className="space-y-2">
                      {/* Category Badges */}
                      {(product.category_large || product.category_small) && (
                        <div className="flex flex-wrap gap-1">
                          {product.category_large && (
                            <span className="px-2 py-0.5 bg-[#ccff00]/20 text-[#ccff00] text-xs rounded-full border border-[#ccff00]/30">
                              {product.category_large}
                            </span>
                          )}
                          {product.category_small && (
                            <span className="px-2 py-0.5 bg-[#ccff00]/10 text-[#ccff00]/80 text-xs rounded-full border border-[#ccff00]/20">
                              {product.category_small}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="space-y-1">
                        {product.brand && (
                          <div className="text-xs text-gray-400">{product.brand}</div>
                        )}
                        <div className="font-semibold text-[#ccff00]">{product.name}</div>
                        {product.flavor && <div className="text-sm text-gray-300">{product.flavor}</div>}
                        {product.weight && <div className="text-xs text-gray-400">{product.weight}</div>}
                        {product.protein !== undefined && (
                          <div className="text-xs text-gray-400">단백질: {product.protein}g</div>
                        )}
                      </div>
                    </div>
                    <RippleButton
                      onClick={() => deleteProduct(product.id)}
                      className="mt-3 w-full px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 rounded-lg text-sm transition-all flex items-center justify-center gap-2 text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                      삭제
                    </RippleButton>
                  </motion.div>
                ))}
              </motion.div>

              {products.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 text-gray-400"
                >
                  등록된 상품이 없습니다. 이미지를 붙여넣어 추가하세요.
                </motion.div>
              )}
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
              onPaste={handlePaste}
              className="space-y-4"
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-xl"
              >
                <p className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  쿠팡 그리드 같은 대량 상품 이미지를 붙여넣으세요 (Ctrl+V). A그룹에 이미 있는 상품은
                  자동으로 제외됩니다.
                </p>
                {bGroupResults.length > 0 && (
                  <RippleButton
                    onClick={copyToCSV}
                    className="px-4 py-2 bg-[#ccff00] text-black font-semibold rounded-lg hover:bg-[#b3e600] transition-all shadow-[0_0_20px_rgba(204,255,0,0.5)] hover:shadow-[0_0_30px_rgba(204,255,0,0.7)] flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    CSV로 복사
                  </RippleButton>
                )}
              </motion.div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
              >
                {bGroupResults.map((product, idx) => (
                  <motion.div
                    key={idx}
                    variants={itemVariants}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:border-[#ccff00] hover:shadow-[0_0_20px_rgba(204,255,0,0.3)] transition-all"
                  >
                    <div className="space-y-1">
                      {product.brand && (
                        <div className="text-xs text-gray-400">{product.brand}</div>
                      )}
                      <div className="font-semibold text-[#ccff00]">{product.name}</div>
                      {product.flavor && <div className="text-sm text-gray-300">{product.flavor}</div>}
                      {product.weight && <div className="text-xs text-gray-400">{product.weight}</div>}
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {bGroupResults.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 text-gray-400"
                >
                  이미지를 붙여넣어 상품을 추출하세요.
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Tab C: 상세분석 */}
          {activeTab === 'C' && (
            <motion.div
              key="C"
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-4"
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-xl"
              >
                <p className="text-gray-400 text-sm mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  여러 장의 이미지를 동시에 업로드하세요 (상품 앞면, 뒷면, 성분표 등).
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleCGroupFileSelect}
                  className="hidden"
                  id="c-group-file-input"
                />
                <label
                  htmlFor="c-group-file-input"
                  className="inline-block cursor-pointer"
                >
                  <RippleButton
                    type="button"
                    className="px-4 py-2 bg-[#ccff00] text-black font-semibold rounded-lg hover:bg-[#b3e600] transition-all shadow-[0_0_20px_rgba(204,255,0,0.5)] hover:shadow-[0_0_30px_rgba(204,255,0,0.7)] flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    이미지 선택
                  </RippleButton>
                </label>
              </motion.div>

              {cGroupImages.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
                >
                  {cGroupImages.map((img, idx) => (
                    <motion.img
                      key={idx}
                      src={img}
                      alt={`Upload ${idx + 1}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full h-48 object-cover rounded-xl border border-white/10"
                    />
                  ))}
                </motion.div>
              )}

              {Object.keys(cGroupData).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-xl"
                >
                  <h3 className="text-xl font-semibold text-[#ccff00] mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    추출된 정보
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">상품명</label>
                      <input
                        type="text"
                        value={cGroupData.name || ''}
                        onChange={(e) => setCGroupData({ ...cGroupData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">맛</label>
                      <input
                        type="text"
                        value={cGroupData.flavor || ''}
                        onChange={(e) => setCGroupData({ ...cGroupData, flavor: e.target.value })}
                        className="w-full px-3 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">1회 제공량</label>
                      <input
                        type="text"
                        value={cGroupData.serving || ''}
                        onChange={(e) => setCGroupData({ ...cGroupData, serving: e.target.value })}
                        className="w-full px-3 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">칼로리</label>
                        <input
                          type="number"
                          value={cGroupData.calories || ''}
                          onChange={(e) =>
                            setCGroupData({ ...cGroupData, calories: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">탄수화물 (g)</label>
                        <input
                          type="number"
                          value={cGroupData.carbs || ''}
                          onChange={(e) =>
                            setCGroupData({ ...cGroupData, carbs: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">단백질 (g)</label>
                        <input
                          type="number"
                          value={cGroupData.protein || ''}
                          onChange={(e) =>
                            setCGroupData({ ...cGroupData, protein: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">지방 (g)</label>
                        <input
                          type="number"
                          value={cGroupData.fat || ''}
                          onChange={(e) =>
                            setCGroupData({ ...cGroupData, fat: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">당류 (g)</label>
                        <input
                          type="number"
                          value={cGroupData.sugar || ''}
                          onChange={(e) =>
                            setCGroupData({ ...cGroupData, sugar: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#ccff00] focus:ring-2 focus:ring-[#ccff00]/20 transition"
                        />
                      </div>
                    </div>
                    <RippleButton
                      onClick={saveCGroupProduct}
                      className="w-full px-4 py-3 bg-[#ccff00] text-black font-semibold rounded-lg hover:bg-[#b3e600] transition-all shadow-[0_0_20px_rgba(204,255,0,0.5)] hover:shadow-[0_0_30px_rgba(204,255,0,0.7)] flex items-center justify-center gap-2"
                    >
                      <Save className="w-5 h-5" />
                      A그룹으로 저장
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
    </div>
  );
}
