const fs = require('fs').promises;
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'db.json');

// 에볼루션 뉴트리션 브랜드의 모든 변형들
const evlBrandVariants = [
  '에볼루션 뉴트리션',
  '에볼루션뉴트리션',
  'EVL 에볼루션 뉴트리션',
  'EVL 뉴트리션',
  '이볼루션 뉴트리션',
  '이블 뉴트리션',
  '이볼 뉴트리션',
  '이블루션 뉴트리션',
  '이브이엘 뉴트리션',
  '엘리트랩스 뉴트리션',
  'EVL 이볼루션 뉴트리션',
];

async function migrateEVLBrand() {
  try {
    // db.json 읽기
    const data = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(data);

    let updatedCount = 0;

    // 모든 제품 순회
    db.products.forEach((product) => {
      if (product.brand && evlBrandVariants.includes(product.brand)) {
        product.brand = 'EVL';
        updatedCount++;
      }
    });

    // db.json 저장
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2), 'utf-8');

    console.log(`✅ 마이그레이션 완료! ${updatedCount}개의 제품 브랜드가 "EVL"로 업데이트되었습니다.`);
    console.log(`\n변경된 브랜드 변형들:`);
    evlBrandVariants.forEach((variant) => {
      console.log(`  - "${variant}" → "EVL"`);
    });
  } catch (error) {
    console.error('❌ 마이그레이션 중 오류 발생:', error);
    process.exit(1);
  }
}

migrateEVLBrand();

