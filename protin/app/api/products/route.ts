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

