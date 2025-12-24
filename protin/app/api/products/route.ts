import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const dbPath = path.join(process.cwd(), 'data', 'db.json');

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

async function readDb(): Promise<{ products: Product[] }> {
  try {
    const fileContents = await fs.readFile(dbPath, 'utf8');
    return JSON.parse(fileContents);
  } catch (error) {
    return { products: [] };
  }
}

async function writeDb(data: { products: Product[] }): Promise<void> {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

export async function GET() {
  try {
    const db = await readDb();
    return NextResponse.json(db.products);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const product: Omit<Product, 'id' | 'createdAt'> = await request.json();
    const db = await readDb();
    
    const newProduct: Product = {
      ...product,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    
    db.products.push(newProduct);
    await writeDb(db);
    
    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, ...updateData } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }
    
    const db = await readDb();
    const productIndex = db.products.findIndex((p) => p.id === id);
    
    if (productIndex === -1) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    // 기존 데이터 유지하면서 업데이트
    db.products[productIndex] = {
      ...db.products[productIndex],
      ...updateData,
      id, // id는 변경 불가
      createdAt: db.products[productIndex].createdAt, // 생성일은 유지
    };
    
    await writeDb(db);
    
    return NextResponse.json(db.products[productIndex]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }
    
    const db = await readDb();
    db.products = db.products.filter((p) => p.id !== id);
    await writeDb(db);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}

