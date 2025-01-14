import OpenAI from 'openai';
import { queryEmbeddings } from './embeddings';
import type { Message } from '../types/slack';
import type { PineconeRecord, RecordMetadata } from '@pinecone-database/pinecone';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

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

const db = getFirestore();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface RAGResponse {
  response: string;
  sourceMessages?: Array<{
    content: string;
    timestamp: number;
    sender: string;
  }>;
}

interface MessageMetadata extends RecordMetadata {
  messageId: string;
  timestamp: number;
  userId: string;
}

class RAGService {
  private static instance: RAGService;
  
  // Singleton to avoid recreating service
  static getInstance(): RAGService {
    if (!RAGService.instance) {
      RAGService.instance = new RAGService();
    }
    return RAGService.instance;
  }

  private async getMessageContents(messageIds: string[]): Promise<Map<string, Message>> {
    const messages = new Map<string, Message>();
    
    const promises = messageIds.map(async (messageId) => {
      const messageDoc = await db.collection('messages').doc(messageId).get();
      if (messageDoc.exists) {
        messages.set(messageId, { id: messageDoc.id, ...messageDoc.data() } as Message);
      }
    });
    
    await Promise.all(promises);
    return messages;
  }

  private async formatMessagesForContext(matches: PineconeRecord[]): Promise<string> {
    // Get all message IDs
    const messageIds = matches
      .filter(match => match.metadata)
      .map(match => (match.metadata as MessageMetadata).messageId);
    
    // Fetch actual messages from Firestore
    const messages = await this.getMessageContents(messageIds);
    
    return matches
      .filter(match => {
        const metadata = match.metadata as MessageMetadata;
        return metadata && messages.has(metadata.messageId);
      })
      .sort((a, b) => {
        const metadataA = a.metadata as MessageMetadata;
        const metadataB = b.metadata as MessageMetadata;
        return metadataA.timestamp - metadataB.timestamp;
      })
      .map(match => {
        const metadata = match.metadata as MessageMetadata;
        const message = messages.get(metadata.messageId)!;
        const date = new Date(metadata.timestamp).toLocaleString();
        return `[${date}] User ${message.userName || metadata.userId}: ${message.content}`;
      })
      .join('\n');
  }

  async processQuery(query: string): Promise<RAGResponse> {
    try {
      // 1. Get relevant messages using queryEmbeddings
      // Get more initial matches since we'll filter some out
      const matches = await queryEmbeddings(query, 15);
      
      if (!matches.length) {
        return {
          response: "I couldn't find any relevant messages in the history.",
          sourceMessages: []
        };
      }

      // Filter matches by similarity score
      // Cosine similarity ranges from -1 to 1, with 1 being most similar
      // 0.3 is a more lenient threshold to catch more related content
      const relevantMatches = matches.filter(match => match.score && match.score > 0.3);

      if (!relevantMatches.length) {
        return {
          response: "I couldn't find any messages that were relevant enough to your query.",
          sourceMessages: []
        };
      }

      // 2. Get message contents and format context
      const messageIds = relevantMatches
        .filter(match => match.metadata)
        .map(match => (match.metadata as MessageMetadata).messageId);
      
      const messages = await this.getMessageContents(messageIds);
      const context = await this.formatMessagesForContext(relevantMatches);
      
      // 3. Get OpenAI completion
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `You are a helpful AI assistant that answers questions about chat history.
            Use the provided message history to answer the user's question.
            If you're not sure about something, say so.
            Always maintain a friendly and professional tone.
            Format your responses in a clear and readable way.
            If you reference specific messages, include their timestamps.
            Focus on the most relevant information from the context.`
          },
          {
            role: "user",
            content: `Here is the relevant message history:
            ${context}
            
            User's question: ${query}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      // 4. Return response with sources
      return {
        response: completion.choices[0].message.content || "Sorry, I couldn't generate a response.",
        sourceMessages: relevantMatches
          .filter(match => {
            const metadata = match.metadata as MessageMetadata;
            return metadata && messages.has(metadata.messageId);
          })
          .map(match => {
            const metadata = match.metadata as MessageMetadata;
            const message = messages.get(metadata.messageId)!;
            return {
              content: message.content,
              timestamp: metadata.timestamp,
              sender: message.userName || metadata.userId
            };
          })
      };
    } catch (error) {
      console.error('RAG processing error:', error);
      throw new Error('Failed to process query');
    }
  }
}

export default RAGService; 