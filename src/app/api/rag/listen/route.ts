import { NextResponse } from 'next/server';
import DMListener from '@/lib/rag/dmListener';

export async function POST(req: Request) {
  try {
    console.log('RAG Listener API called');
    const { action } = await req.json();
    console.log('Action received:', action);
    
    if (action === 'start') {
      console.log('Attempting to start listener...');
      try {
        const instance = DMListener.getInstance();
        console.log('DMListener instance created');
        await instance.startListening();
        console.log('Listener started successfully');
        return NextResponse.json({ status: 'Listener started' });
      } catch (error: any) {
        console.error('Failed to initialize/start listener:', error);
        return NextResponse.json(
          { error: 'Failed to start listener', details: error?.message || String(error) },
          { status: 500 }
        );
      }
    } else if (action === 'stop') {
      console.log('Attempting to stop listener...');
      try {
        DMListener.getInstance().stopListening();
        console.log('Listener stopped successfully');
        return NextResponse.json({ status: 'Listener stopped' });
      } catch (error: any) {
        console.error('Failed to stop listener:', error);
        return NextResponse.json(
          { error: 'Failed to stop listener', details: error?.message || String(error) },
          { status: 500 }
        );
      }
    } else {
      console.log('Invalid action received:', action);
      return NextResponse.json(
        { error: 'Invalid action. Use "start" or "stop".' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Listener API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || String(error) },
      { status: 500 }
    );
  }
} 