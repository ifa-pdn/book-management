import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';
import { requireAdmin } from '../../../lib/auth';

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. DEDUPLICATION: Create a SHA-256 Hash of the file content
    const hashSum = crypto.createHash('sha256');
    hashSum.update(buffer);
    const hexHash = hashSum.digest('hex'); // e.g. a2c9...

    // 2. Define the new file name using the hash + webp extension (since we will enforce webp from client)
    const finalName = `${hexHash}.webp`;
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    const filepath = join(uploadDir, finalName);
    
    // Ensure directory exists
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch {
      // ignore
    }

    // 3. Check if file with exact hash already exists!
    if (existsSync(filepath)) {
      console.log(`[Deduplication] File ${finalName} already exists. Skipping write!`);
      // Return the URL immediately
      return NextResponse.json({ 
        success: true, 
        url: `/uploads/${finalName}`,
        deduplicated: true
      });
    }

    // 4. File does not exist, write the new buffer to disk
    await writeFile(filepath, buffer);
    console.log(`[Upload] Wrote new file ${finalName}`);

    return NextResponse.json({ 
      success: true, 
      url: `/uploads/${finalName}`,
      deduplicated: false
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Error uploading file' }, { status: 500 });
  }
}
