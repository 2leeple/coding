const fs = require('fs').promises;
const path = require('path');

const dbPath = path.join(__dirname, '../data', 'db.json');

async function fixProteinBarCategory() {
  try {
    const fileContents = await fs.readFile(dbPath, 'utf8');
    const db = JSON.parse(fileContents);

    let updatedCount = 0;
    const updatedProducts = db.products.map(product => {
      // 프로틴바 관련 키워드 확인
      const name = (product.name || '').toLowerCase();
      const categorySmall = (product.category_small || '').toLowerCase();
      
      // 프로틴바인데 대카테고리가 잘못된 경우 수정
      const isProteinBar = 
        name.includes('프로틴바') || 
        name.includes('프로틴 바') ||
        name.includes('protein bar') ||
        categorySmall.includes('프로틴바') ||
        product.category_small === '프로틴바';

      if (isProteinBar && product.category_large !== '단백질 간식') {
        updatedCount++;
        return { 
          ...product, 
          category_large: '단백질 간식',
          category_small: '프로틴바'
        };
      }
      
      return product;
    });

    db.products = updatedProducts;
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2), 'utf8');

    console.log(`✅ 마이그레이션 완료! ${updatedCount}개의 프로틴바 제품이 업데이트되었습니다.`);
    console.log(`   - 대카테고리: "단백질 간식"으로 변경`);
    console.log(`   - 소카테고리: "프로틴바"로 설정`);

  } catch (error) {
    console.error('❌ 마이그레이션 중 오류 발생:', error);
  }
}

fixProteinBarCategory();



