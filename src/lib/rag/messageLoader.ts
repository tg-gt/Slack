import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import type { MessageMetadata } from './embeddings';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: "slack-6698d",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      // The private key comes from .env.local and needs the newlines replaced
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n')
    })
  });
}

const adminDb = getFirestore();

export interface Message {
  id: string;
  content: string;
  userId: string;
  channelId: string;
  timestamp: number;
  threadId?: string;
}

export async function getAllMessages(): Promise<Message[]> {
  const messages: Message[] = [];
  
  // Get all messages directly
  console.log('Fetching messages...');
  const messagesSnap = await adminDb
    .collection('messages')
    .get();
  
  console.log(`Found ${messagesSnap.docs.length} messages`);
  
  // Process messages
  for (const messageDoc of messagesSnap.docs) {
    const messageData = messageDoc.data();
    console.log(`Processing message: ${messageDoc.id}, content: ${messageData.content?.substring(0, 50)}...`);
    
    const timestamp = messageData.timestamp?.toMillis?.() || messageData.timestamp || Date.now();
    
    messages.push({
      id: messageDoc.id,
      content: messageData.content || '',
      userId: messageData.userId,
      channelId: messageData.channelId,
      timestamp,
      threadId: messageData.threadId
    });
    
    // If message has a thread, get thread messages
    if (messageData.threadId) {
      console.log(`Fetching thread messages for message: ${messageDoc.id}`);
      const threadSnap = await adminDb
        .collection('messages')
        .doc(messageDoc.id)
        .collection('thread')
        .orderBy('timestamp', 'asc')
        .get();
      
      console.log(`Found ${threadSnap.docs.length} thread messages`);
      
      for (const threadDoc of threadSnap.docs) {
        const threadData = threadDoc.data();
        messages.push({
          id: threadDoc.id,
          content: threadData.content,
          userId: threadData.userId,
          channelId: messageData.channelId,
          timestamp: threadData.timestamp,
          threadId: messageDoc.id
        });
      }
    }
  }
  
  console.log(`Total messages found: ${messages.length}`);
  return messages;
}

export function messageToMetadata(message: Message): MessageMetadata {
  return {
    messageId: message.id,
    userId: message.userId,
    channelId: message.channelId,
    timestamp: message.timestamp,
    threadId: message.threadId
  };
} 