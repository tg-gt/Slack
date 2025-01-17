import { NextResponse } from 'next/server';
import DMListener from '@/lib/rag/dmListener';

export const runtime = 'edge';

export async function POST(req: Request) {
  const start = Date.now();
  try {
    const body = await req.json();
    const { action } = body;
    
    // Log with timestamp for better tracing
    const log = (msg: string) => {
      const time = Date.now() - start;
      console.log(`[${time}ms] ${msg}`);
    };

    log(`RAG Listener API called with action: ${action}`);
    
    if (action === 'start') {
      log('Attempting to start listener...');
      try {
        const instance = DMListener.getInstance();
        log('DMListener instance created');
        await instance.startListening();
        log('Listener started successfully');
        return NextResponse.json({ status: 'Listener started', timestamp: Date.now() });
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        log(`Failed to initialize/start listener: ${errorMsg}`);
        return NextResponse.json(
          { error: 'Failed to start listener', details: errorMsg, timestamp: Date.now() },
          { status: 500 }
        );
      }
    } else if (action === 'stop') {
      log('Attempting to stop listener...');
      try {
        DMListener.getInstance().stopListening();
        log('Listener stopped successfully');
        return NextResponse.json({ status: 'Listener stopped', timestamp: Date.now() });
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        log(`Failed to stop listener: ${errorMsg}`);
        return NextResponse.json(
          { error: 'Failed to stop listener', details: errorMsg, timestamp: Date.now() },
          { status: 500 }
        );
      }
    } else {
      log(`Invalid action received: ${action}`);
      return NextResponse.json(
        { error: 'Invalid action. Use "start" or "stop".' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.error(`[${Date.now() - start}ms] Listener API error:`, errorMsg);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMsg, timestamp: Date.now() },
      { status: 500 }
    );
  }
} 