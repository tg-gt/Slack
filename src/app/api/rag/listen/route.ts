import { NextResponse } from 'next/server';
import DMListener from '@/lib/rag/dmListener';

export async function POST(req: Request) {
  try {
    const { action } = await req.json();
    
    if (action === 'start') {
      await DMListener.getInstance().startListening();
      return NextResponse.json({ status: 'Listener started' });
    } else if (action === 'stop') {
      DMListener.getInstance().stopListening();
      return NextResponse.json({ status: 'Listener stopped' });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "start" or "stop".' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Listener API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 