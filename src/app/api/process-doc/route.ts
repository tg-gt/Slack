import { NextRequest, NextResponse } from 'next/server';
const pdfParse = require('pdf-parse');
import type { Document } from '@/lib/types/slack';

console.log('API Route module loaded (process-doc)');

async function extractTextFromPDF(url: string): Promise<string> {
  console.log('Fetching PDF from URL:', url);
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  console.log('PDF fetched, extracting text...');
  const data = await pdfParse(buffer);
  console.log(`Extracted ${data.text.length} characters of text`);
  return data.text;
}

export async function GET() {
  console.log('GET request received');
  return NextResponse.json({ message: 'Hello from the API' });
}

export async function POST(req: NextRequest) {
  console.log('POST request received');
  try {
    const document = await req.json() as Document;
    console.log('Received document for processing:', {
      id: document.id,
      fileName: document.fileName,
      fileType: document.fileType
    });

    if (document.fileType === 'application/pdf') {
      console.log('Processing PDF document...');
      const textContent = await extractTextFromPDF(document.storageUrl);
      return NextResponse.json({ 
        message: 'PDF processed successfully', 
        textLength: textContent.length,
        preview: textContent.substring(0, 200) // First 200 chars for verification
      });
    } else {
      return NextResponse.json({ 
        error: 'Unsupported file type', 
        fileType: document.fileType 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing document:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to process document' 
    }, { status: 500 });
  }
} 