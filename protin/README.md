# Protein Manager

단백질 보충제 관리 앱 - Next.js (App Router) 기반

## 기능

### 1. 데이터 관리
- `data/db.json` 파일에 데이터 저장 (새로고침해도 유지)
- `/api/products` API로 읽기/쓰기/삭제 구현

### 2. 탭별 기능

#### A: 내 보관함
- 이미지 붙여넣기(Ctrl+V)로 상품 정보 자동 등록
- 카드 리스트 형태로 표시
- 상품 삭제 기능

#### B: 시장조사
- 대량 상품 이미지 붙여넣기 (쿠팡 그리드 등)
- A그룹에 이미 있는 상품(브랜드+이름+맛 일치) 자동 제외
- CSV로 복사 버튼: 상품명들을 클립보드에 복사 (엑셀 붙여넣기 용)

#### C: 상세분석
- 여러 장의 이미지 동시 업로드 (Drag & Drop 또는 파일 선택)
- 영양성분 정밀 분석 (칼로리, 탄수화물, 단백질, 지방, 당류, 제공량)
- 추출된 정보를 폼으로 표시하고 수정 가능
- A그룹으로 저장 기능

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### 3. Gemini API Key 설정

1. 상단에 Gemini API Key 입력
2. "저장" 버튼 클릭 (로컬스토리지에 저장됨)

## 기술 스택

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Google Gemini Vision API (gemini-2.5-flash)
- 로컬 JSON 파일 기반 데이터베이스

## 디자인

- 다크 모드
- 형광 그린 포인트 색상 (#ccff00)
- 반응형 레이아웃
