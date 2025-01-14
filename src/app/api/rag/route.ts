import { NextResponse } from 'next/server';
import RAGService from '@/lib/rag/ragService';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Invalid query' },
        { status: 400 }
      );
    }

    const ragService = RAGService.getInstance();
    const response = await ragService.processQuery(query);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 