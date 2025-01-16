import { NextRequest, NextResponse } from 'next/server';
const pdfParse = require('pdf-parse');
import type { Document } from '@/lib/types/slack';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import { db } from '@/lib/firebase/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { Index } from '@pinecone-database/pinecone';

console.log('Document processing route loaded');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

// Initialize Pinecone index
async function initializePineconeIndex(): Promise<Index> {
  console.log('Connecting to Pinecone index...');
  const indexName = 'tg-rag-project-index';
  
  try {
    const index = pinecone.index(indexName);
    // Test the connection
    await index.describeIndexStats();
    console.log('Successfully connected to Pinecone index');
    return index;
  } catch (error) {
    console.error('Failed to connect to Pinecone index:', error);
    throw error;
  }
}

// Initialize the index when the module loads
let pineconeIndex: Index | null = null;
initializePineconeIndex().then(index => {
  pineconeIndex = index;
  console.log('Pinecone index initialized');
}).catch(error => {
  console.error('Failed to initialize Pinecone index:', error);
});

// Function to split text into chunks of roughly equal size
function splitIntoChunks(text: string, maxChunkLength: number = 4000): string[] {
  // Handle very small texts - return as single chunk if under maxChunkLength
  if (text.length <= maxChunkLength) {
    console.log('Text is small enough to process as a single chunk');
    return [text];
  }

  const chunks: string[] = [];
  let currentChunk = '';
  
  // Split by paragraphs first
  const paragraphs = text.split(/\n\s*\n/);
  
  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed chunk size, save current chunk and start new one
    if ((currentChunk + paragraph).length > maxChunkLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    
    // If a single paragraph is too long, split it into sentences
    if (paragraph.length > maxChunkLength) {
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
      for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxChunkLength && currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        currentChunk += sentence + ' ';
      }
    } else {
      currentChunk += paragraph + '\n\n';
    }
  }
  
  // Add the last chunk if it's not empty
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

async function extractTextFromPDF(url: string): Promise<string> {
  console.log('Fetching PDF from URL:', url);
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  console.log('PDF fetched, extracting text...');
  const data = await pdfParse(buffer);
  const extractedText = data.text.trim();
  console.log(`Extracted ${extractedText.length} characters of text`);
  
  // Log a preview of the text to help debug extraction issues
  console.log('Text preview:', extractedText.substring(0, 200));
  
  if (extractedText.length < 100) {
    console.warn('Warning: Very little text extracted. PDF might be scanned or image-based.');
  }
  
  return extractedText;
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
  if (!pineconeIndex) {
    console.log('Pinecone index not initialized, attempting to initialize...');
    pineconeIndex = await initializePineconeIndex();
  }
  
  console.log('Storing embedding in Pinecone...');
  try {
    await pineconeIndex.upsert([{
      id: metadata.id,
      values: embedding,
      metadata
    }]);
    console.log('Embedding stored in Pinecone');
  } catch (error: any) {
    if (error.message?.includes('404')) {
      console.log('Index not found, attempting to recreate...');
      pineconeIndex = await initializePineconeIndex();
      // Retry the upsert
      await pineconeIndex.upsert([{
        id: metadata.id,
        values: embedding,
        metadata
      }]);
      console.log('Embedding stored in Pinecone after index recreation');
    } else {
      throw error;
    }
  }
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

    if (!textContent || textContent.length < 10) {
      console.error('Insufficient text content extracted');
      throw new Error('Could not extract sufficient text from the document. The PDF might be scanned or image-based.');
    }

    // Split text into chunks
    console.log('Splitting text into chunks...');
    const chunks = splitIntoChunks(textContent);
    console.log(`Split into ${chunks.length} chunks`);

    if (chunks.length === 0) {
      throw new Error('Failed to create any valid chunks from the document text');
    }

    // Generate and store embeddings for each chunk
    console.log('Starting embedding generation for chunks...');
    const processedChunks = [];
    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} characters)`);
        
        if (chunk.length < 10) {
          console.warn(`Skipping chunk ${i + 1} - too short (${chunk.length} characters)`);
          continue;
        }

        const embedding = await generateEmbedding(chunk);
        
        try {
          await storeEmbedding(embedding, {
            id: `${document.id}-chunk-${i}`,
            parentId: document.id,
            workspaceId: document.workspaceId,
            channelId: document.channelId,
            fileName: document.fileName,
            type: 'document',
            chunkIndex: i,
            totalChunks: chunks.length,
            chunkLength: chunk.length
          });
          processedChunks.push(i);
        } catch (error: any) {
          console.error(`Pinecone storage error for chunk ${i}:`, error);
          throw new Error(`Failed to store chunk ${i} in Pinecone: ${error.message}`);
        }
      }
      console.log(`Successfully processed ${processedChunks.length} chunks`);
    } catch (error: any) {
      console.error('OpenAI embedding error:', error);
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }

    // Update document status in Firestore
    console.log('Updating document status in Firestore...');
    try {
      const docRef = doc(db, 'documents', document.id);
      await updateDoc(docRef, {
        textContent,
        vectorized: processedChunks.length > 0,
        vectorizedAt: new Date().toISOString(),
        totalChunks: chunks.length,
        processedChunks: processedChunks.length,
        textLength: textContent.length
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
      totalChunks: chunks.length,
      processedChunks: processedChunks.length,
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