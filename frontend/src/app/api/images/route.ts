import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dirPath = path.join(process.cwd(), 'public', 'alpha');
    
    if (!fs.existsSync(dirPath)) {
      return NextResponse.json({ images: [] });
    }

    const files = fs.readdirSync(dirPath);
    
    // Scan and filter image files, sorting naturally (ezgif-frame-001 -> ezgif-frame-002, etc.)
    const images = files
      .filter(file => /\.(png|jpe?g|webp|gif|svg)$/i.test(file))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      .map(file => `/alpha/${file}`);

    return NextResponse.json({ images });
  } catch (error) {
    console.error('Error reading alpha images:', error);
    return NextResponse.json({ error: 'Failed to read images' }, { status: 500 });
  }
}
