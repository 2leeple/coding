const fs = require('fs').promises;
const path = require('path');

const dbPath = path.join(__dirname, '../data', 'db.json');

async function migrateMushroomComplex() {
  try {
    const fileContents = await fs.readFile(dbPath, 'utf8');
    const db = JSON.parse(fileContents);

    let updatedCount = 0;
    const updatedProducts = db.products.map(product => {
      // '머쉬룸 콤플렉스'를 '머쉬룸'으로 변경
      if (product.category_small === '머쉬룸 콤플렉스') {
        updatedCount++;
        return { 
          ...product, 
          category_small: '머쉬룸'
        };
      }
      
      return product;
    });

    db.products = updatedProducts;
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2), 'utf8');

    console.log(`✅ 마이그레이션 완료! ${updatedCount}개의 제품이 업데이트되었습니다.`);
    console.log(`   - '머쉬룸 콤플렉스' -> '머쉬룸'으로 변경`);

  } catch (error) {
    console.error('❌ 마이그레이션 중 오류 발생:', error);
  }
}

migrateMushroomComplex();


