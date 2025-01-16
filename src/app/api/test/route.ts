import { NextRequest, NextResponse } from 'next/server';
const pdfParse = require('pdf-parse');
import type { Document } from '@/lib/types/slack';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import { db } from '@/lib/firebase/firebase';
import { doc, updateDoc } from 'firebase/firestore';

console.log('Document processing route loaded');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

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

async function generateEmbedding(text: string) {
  console.log('Generating embedding...');
  const response = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: text,
  });
  console.log('Embedding generated');
  return response.data[0].embedding;
}

async function storeEmbedding(embedding: number[], metadata: any) {
  console.log('Storing embedding in Pinecone...');
  const index = pinecone.index('slack-documents');
  await index.upsert([{
    id: metadata.id,
    values: embedding,
    metadata
  }]);
  console.log('Embedding stored in Pinecone');
}

export async function GET() {
  return NextResponse.json({ message: 'Document processing API is active' });
}

export async function POST(req: NextRequest) {
  console.log('POST request received');
  let document;
  try {
    document = await req.json() as Document;
    console.log('Processing document:', {
      id: document.id,
      fileName: document.fileName,
      fileType: document.fileType,
      url: document.storageUrl
    });

    // Extract text based on file type
    let textContent = '';
    if (document.fileType === 'application/pdf') {
      console.log('Processing PDF document...');
      textContent = await extractTextFromPDF(document.storageUrl);
    } else if (document.fileType === 'text/plain') {
      console.log('Processing text document...');
      const response = await fetch(document.storageUrl);
      textContent = await response.text();
    } else {
      console.log('Unsupported file type:', document.fileType);
      return NextResponse.json({ 
        error: 'Unsupported file type', 
        fileType: document.fileType 
      }, { status: 400 });
    }

    if (!textContent) {
      console.error('No text content extracted');
      throw new Error('No text content could be extracted');
    }

    console.log('Starting embedding generation...');
    // Generate and store embedding
    try {
      const embedding = await generateEmbedding(textContent);
      console.log('Embedding generated successfully, storing in Pinecone...');
      
      try {
        await storeEmbedding(embedding, {
          id: document.id,
          workspaceId: document.workspaceId,
          channelId: document.channelId,
          fileName: document.fileName,
          type: 'document'
        });
      } catch (error: any) {
        console.error('Pinecone storage error:', error);
        throw new Error(`Failed to store in Pinecone: ${error.message}`);
      }
    } catch (error: any) {
      console.error('OpenAI embedding error:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }

    // Update document status in Firestore
    console.log('Updating document status in Firestore...');
    try {
      const docRef = doc(db, 'documents', document.id);
      await updateDoc(docRef, {
        textContent,
        vectorized: true,
        vectorizedAt: new Date().toISOString(),
      });
      console.log('Document processing completed successfully');
    } catch (error: any) {
      console.error('Firestore update error:', error);
      throw new Error(`Failed to update Firestore: ${error.message}`);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Document processed successfully',
      textLength: textContent.length,
      documentId: document.id
    });
  } catch (error) {
    console.error('Error processing document:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to process document',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 